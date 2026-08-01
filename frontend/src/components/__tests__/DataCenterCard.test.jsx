import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DataCenterCard from "../DataCenterCard";

function makeDc(overrides = {}) {
  return {
    id: "dc-a",
    name: "Facility A",
    operator: "Amazon",
    country: "United States",
    power_mw: 100,
    cost_usd_billions: 2.5,
    data_status: "confirmed",
    impact: {
      radius_km: 50,
      data_status: "confirmed",
      electricity: { annual_kwh: 900_000_000, price_lift_pct: 5.5, homes_powered: 86_766 },
      carbon: { annual_co2_tonnes: 300_000, cars_equivalent: 65_217, renewable_pct: 22 },
      water: { daily_withdrawal_mgd: 1.52, severity: "moderate", households_equivalent: 5067 },
      land: { footprint_m2: 10_000, waste_heat_mw: 30 },
      ...overrides.impact,
    },
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState(null, "", "/");
});

describe("DataCenterCard", () => {
  it("renders the water households equivalent alongside severity and MGD", () => {
    render(<DataCenterCard dc={makeDc()} onClose={() => {}} />);

    expect(screen.getByText("Households equivalent")).toBeInTheDocument();
    expect(screen.getByText("5,067")).toBeInTheDocument();
    expect(screen.getByText("1.52 MGD")).toBeInTheDocument();
    expect(screen.getByText("Moderate stress")).toBeInTheDocument();
  });

  it("renders cars and homes equivalents alongside the new water equivalent", () => {
    render(<DataCenterCard dc={makeDc()} onClose={() => {}} />);

    expect(screen.getByText("65,217")).toBeInTheDocument();
    expect(screen.getByText("86,766")).toBeInTheDocument();
  });

  it("does not render impact blocks for announced (unbuilt) facilities", () => {
    const dc = makeDc({
      data_status: "announced",
      impact: {
        radius_km: 20,
        data_status: "announced",
        electricity: { annual_kwh: 0, price_lift_pct: 0, homes_powered: 0 },
        carbon: { annual_co2_tonnes: 0, cars_equivalent: 0, renewable_pct: 25 },
        water: { daily_withdrawal_mgd: 0, severity: "low", households_equivalent: 0 },
        land: { footprint_m2: 0, waste_heat_mw: 0 },
      },
    });
    render(<DataCenterCard dc={dc} onClose={() => {}} />);

    expect(screen.queryByText("Households equivalent")).not.toBeInTheDocument();
  });
});

describe("DataCenterCard copy link", () => {
  it("copies the current facility's shareable URL to the clipboard", async () => {
    window.history.pushState(null, "", "/?facility=dc-a");
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<DataCenterCard dc={makeDc()} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("facility=dc-a"));
    await waitFor(() => expect(screen.getByText(/link copied/i)).toBeInTheDocument());
  });
});
