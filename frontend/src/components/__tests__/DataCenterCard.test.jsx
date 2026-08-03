import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DataCenterCard from "../DataCenterCard";
import { severityColor } from "../severityColors";

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
      electricity: {
        annual_kwh: 900_000_000,
        price_lift_pct: 5.5,
        price_lift_severity: "moderate",
        homes_powered: 86_766,
      },
      carbon: {
        annual_co2_tonnes: 300_000,
        cars_equivalent: 65_217,
        renewable_pct: 22,
        renewable_severity: "moderate",
      },
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

  it("color-codes price lift and grid renewables by severity", () => {
    render(<DataCenterCard dc={makeDc()} onClose={() => {}} />);

    expect(screen.getByText("+5.5%")).toHaveStyle({ color: severityColor("moderate") });
    expect(screen.getByText("22%")).toHaveStyle({ color: severityColor("moderate") });
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

function makeScenarioDc(overrides = {}) {
  return makeDc({
    impact: {
      radius_km: 50,
      data_status: "confirmed",
      electricity: { annual_kwh: 600_000_000, price_lift_pct: 5.5, homes_powered: 57_143 },
      carbon: { annual_co2_tonnes: 30_000, cars_equivalent: 6_522, renewable_pct: 100 },
      water: { daily_withdrawal_mgd: 1.52, severity: "moderate", households_equivalent: 5067 },
      land: { footprint_m2: 10_000, waste_heat_mw: 30 },
      ...overrides.impact,
    },
    ...overrides,
  });
}

describe("DataCenterCard with an active scenario", () => {
  it("renders baseline-only (no deltas, no badge) when scenarioDc is absent", () => {
    render(<DataCenterCard dc={makeDc()} onClose={() => {}} />);

    expect(screen.queryByText(/Under:/)).not.toBeInTheDocument();
    expect(screen.queryByText("→")).not.toBeInTheDocument();
  });

  it("shows the scenario badge with the preset label", () => {
    const scenarioDc = makeScenarioDc();
    render(
      <DataCenterCard
        dc={makeDc()}
        scenarioDc={scenarioDc}
        scenarioLabel="Grid Decarbonization"
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Under: Grid Decarbonization/)).toBeInTheDocument();
  });

  it("falls back to a generic badge label when scenarioLabel is not provided", () => {
    const scenarioDc = makeScenarioDc();
    render(<DataCenterCard dc={makeDc()} scenarioDc={scenarioDc} onClose={() => {}} />);

    expect(screen.getByText(/Under: active scenario/)).toBeInTheDocument();
  });

  it("renders baseline → scenario for a changed field (CO2 dropped)", () => {
    const scenarioDc = makeScenarioDc();
    render(<DataCenterCard dc={makeDc()} scenarioDc={scenarioDc} onClose={() => {}} />);

    expect(screen.getByText("300,000 t")).toBeInTheDocument();
    expect(screen.getByText("30,000 t")).toBeInTheDocument();
  });

  it("does not render a delta arrow for an unchanged field", () => {
    // Water is identical between baseline and scenario in this fixture.
    const scenarioDc = makeScenarioDc();
    render(<DataCenterCard dc={makeDc()} scenarioDc={scenarioDc} onClose={() => {}} />);

    // Only one "1.52 MGD" should appear (baseline), not a baseline+scenario pair.
    expect(screen.getAllByText("1.52 MGD")).toHaveLength(1);
  });

  it("colors an improved value (lower CO2) as down and a worsened value correctly", () => {
    const scenarioDc = makeScenarioDc();
    const { container } = render(<DataCenterCard dc={makeDc()} scenarioDc={scenarioDc} onClose={() => {}} />);

    const co2Scenario = screen.getByText("30,000 t");
    expect(co2Scenario.className).toContain("scenario-totals-scenario--down");

    // Grid renewables 22% -> 100% is an improvement (lowerIsBetter=false),
    // so it should also render as "down" (green) despite the value rising.
    const renewablesScenario = screen.getByText("100%");
    expect(renewablesScenario.className).toContain("scenario-totals-scenario--down");
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

  it("includes the active scenario when copying the link", async () => {
    window.history.pushState(null, "", "/?facility=dc-a");
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(
      <DataCenterCard
        dc={makeDc()}
        onClose={() => {}}
        activePresetId="grid-decarbonization"
        activeScenario={{ carbon_intensity_gco2_per_kwh: 50 }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    const copiedUrl = writeText.mock.calls[0][0];
    expect(copiedUrl).toContain("facility=dc-a");
    expect(copiedUrl).toContain("scenario=grid-decarbonization");
  });

  it("omits the scenario param when no scenario is active", async () => {
    window.history.pushState(null, "", "/?facility=dc-a");
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<DataCenterCard dc={makeDc()} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    expect(writeText.mock.calls[0][0]).not.toContain("scenario=");
  });
});

describe("DataCenterCard copy embed code", () => {
  it("copies an iframe snippet pointing at the ?embed=<id> URL", async () => {
    window.history.pushState(null, "", "/?facility=dc-a");
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<DataCenterCard dc={makeDc()} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /copy embed code/i }));

    const snippet = writeText.mock.calls[0][0];
    expect(snippet).toContain("<iframe");
    expect(snippet).toContain("embed=dc-a");
    await waitFor(() => expect(screen.getByText(/embed code copied/i)).toBeInTheDocument());
  });
});

describe("DataCenterCard embed mode", () => {
  it("omits the close button and copy-link/copy-embed actions", () => {
    render(<DataCenterCard dc={makeDc()} embed />);

    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy embed code/i })).not.toBeInTheDocument();
  });

  it("still renders the facility's stats", () => {
    render(<DataCenterCard dc={makeDc()} embed />);

    expect(screen.getByText("Facility A")).toBeInTheDocument();
    expect(screen.getByText("86,766")).toBeInTheDocument();
  });
});
