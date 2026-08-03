import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Embed from "../Embed";

afterEach(() => {
  vi.unstubAllGlobals();
});

const DC = {
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
  },
};

describe("Embed", () => {
  it("fetches the single-facility endpoint and renders the stat card without chrome", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        expect(url).toContain("/api/datacenters/dc-a");
        return Promise.resolve({ status: 200, json: () => Promise.resolve(DC) });
      })
    );

    render(<Embed facilityId="dc-a" />);

    await waitFor(() => expect(screen.getByText("Facility A")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy link/i })).not.toBeInTheDocument();
  });

  it("shows a not-found message for an unknown facility id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ status: 404, json: () => Promise.resolve(null) }))
    );

    render(<Embed facilityId="does-not-exist" />);

    await waitFor(() => expect(screen.getByText(/facility not found/i)).toBeInTheDocument());
  });
});
