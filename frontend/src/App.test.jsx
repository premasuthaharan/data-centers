import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import { resolveInitialTheme } from "./theme";

vi.mock("./components/Map", () => ({
  default: ({ selectedId }) => <div data-testid="mock-map" data-selected={selectedId ?? ""} />,
}));
vi.mock("./components/NearMePanel", () => ({ default: () => <div /> }));
vi.mock("./components/ScenarioPanel", () => ({
  // A minimal stand-in that lets tests trigger onScenarioChange with a
  // controlled payload, mirroring what the real POST /api/scenario
  // response + presetLabel/presetId/scenario (added in ScenarioPanel)
  // looks like.
  default: ({ onScenarioChange }) => (
    <button onClick={() => onScenarioChange(window.__mockScenarioPayload)}>
      apply mock scenario
    </button>
  ),
  PRESETS: [
    {
      id: "grid-decarbonization",
      label: "Grid Decarbonization",
      scenario: { carbon_intensity_gco2_per_kwh: 50 },
    },
  ],
}));
vi.mock("./components/CompareModal", () => ({ default: () => <div /> }));

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ generated_at: null, data_centers: [] }),
    })
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.pushState(null, "", "/");
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

function mockMatchMedia(prefersLight) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query) => ({
      matches: query === "(prefers-color-scheme: light)" ? prefersLight : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  );
}

describe("App methodology panel", () => {
  it("opens the methodology panel when the info button is clicked", async () => {
    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText("Data sources & methodology"));

    expect(screen.getByText("Data Sources & Methodology")).toBeInTheDocument();
  });

  it("closes the methodology panel and returns to the default view", async () => {
    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText("Data sources & methodology"));
    expect(screen.getByText("Data Sources & Methodology")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("Data Sources & Methodology")).not.toBeInTheDocument();
  });
});

describe("App URL sync", () => {
  const DATACENTERS = [
    { id: "dc-a", name: "Facility A", operator: "Amazon", country: "US", impact: {} },
    { id: "dc-b", name: "Facility B", operator: "Google", country: "US", impact: {} },
  ];

  function mockFetchDatacenters() {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data_centers: DATACENTERS, generated_at: "2026-01-01" }),
        })
      )
    );
  }

  it("opens the matching facility card when ?facility=<id> is present on load", async () => {
    window.history.pushState(null, "", "/?facility=dc-b");
    mockFetchDatacenters();

    render(<App />);

    await waitFor(() => expect(screen.getByText("Facility B")).toBeInTheDocument());
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-selected", "dc-b");
  });

  it("ignores an unknown facility id and falls back to the default unselected view", async () => {
    window.history.pushState(null, "", "/?facility=does-not-exist");
    mockFetchDatacenters();

    render(<App />);

    await waitFor(() => expect(screen.getByTestId("mock-map")).toBeInTheDocument());
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-selected", "");
    expect(screen.queryByText("Facility A")).not.toBeInTheDocument();
    expect(screen.queryByText("Facility B")).not.toBeInTheDocument();
  });
});

describe("resolveInitialTheme", () => {
  it("prefers an explicit data-theme attribute already set on <html>", () => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "dark");
    mockMatchMedia(false);

    expect(resolveInitialTheme()).toBe("light");
  });

  it("falls back to a stored localStorage preference when data-theme is unset", () => {
    localStorage.setItem("theme", "light");
    mockMatchMedia(false);

    expect(resolveInitialTheme()).toBe("light");
  });

  it("falls back to prefers-color-scheme when nothing is stored", () => {
    mockMatchMedia(true);

    expect(resolveInitialTheme()).toBe("light");
  });

  it("defaults to dark when nothing is stored and the OS prefers dark", () => {
    mockMatchMedia(false);

    expect(resolveInitialTheme()).toBe("dark");
  });
});

describe("App theme toggle", () => {
  it("flips data-theme on <html> and persists the choice to localStorage", async () => {
    mockMatchMedia(false);
    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    fireEvent.click(screen.getByLabelText("Switch to light mode"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");

    fireEvent.click(screen.getByLabelText("Switch to dark mode"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("initializes from a stored light preference", async () => {
    localStorage.setItem("theme", "light");
    mockMatchMedia(false);

    render(<App />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });
});

describe("App scenario facility detail", () => {
  const DATACENTERS = [
    {
      id: "dc-a",
      name: "Facility A",
      operator: "Amazon",
      country: "US",
      data_status: "confirmed",
      impact: {
        data_status: "confirmed",
        electricity: { annual_kwh: 900_000_000, price_lift_pct: 5.5, homes_powered: 86_766 },
        carbon: { annual_co2_tonnes: 300_000, cars_equivalent: 65_217, renewable_pct: 22 },
        water: { daily_withdrawal_mgd: 1.52, severity: "moderate", households_equivalent: 5067 },
        land: { footprint_m2: 10_000, waste_heat_mw: 30 },
      },
    },
  ];

  const SCENARIO_RECORD = {
    id: "dc-a",
    impact: {
      data_status: "confirmed",
      electricity: { annual_kwh: 600_000_000, price_lift_pct: 5.5, homes_powered: 57_143 },
      carbon: { annual_co2_tonnes: 30_000, cars_equivalent: 6_522, renewable_pct: 100 },
      water: { daily_withdrawal_mgd: 1.52, severity: "moderate", households_equivalent: 5067 },
      land: { footprint_m2: 10_000, waste_heat_mw: 30 },
    },
  };

  beforeEach(() => {
    window.__mockScenarioPayload = {
      data_centers: [SCENARIO_RECORD],
      presetLabel: "Grid Decarbonization",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data_centers: DATACENTERS, generated_at: "2026-01-01" }),
        })
      )
    );
  });

  it("matches the selected facility's scenario record by id and shows the preset label", async () => {
    window.history.pushState(null, "", "/?facility=dc-a");
    render(<App />);
    await waitFor(() => expect(screen.getByText("Facility A")).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Policy scenarios/));
    fireEvent.click(screen.getByText("apply mock scenario"));

    await waitFor(() => expect(screen.getByText(/Under: Grid Decarbonization/)).toBeInTheDocument());
    expect(screen.getByText("300,000 t")).toBeInTheDocument();
    expect(screen.getByText("30,000 t")).toBeInTheDocument();
  });

  it("reverts to baseline-only rendering after the scenario is reset", async () => {
    window.history.pushState(null, "", "/?facility=dc-a");
    render(<App />);
    await waitFor(() => expect(screen.getByText("Facility A")).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Policy scenarios/));
    fireEvent.click(screen.getByText("apply mock scenario"));
    await waitFor(() => expect(screen.getByText(/Under: Grid Decarbonization/)).toBeInTheDocument());

    // The mocked ScenarioPanel's onScenarioChange(null) simulates "Reset to baseline".
    window.__mockScenarioPayload = null;
    fireEvent.click(screen.getByText("apply mock scenario"));

    await waitFor(() => expect(screen.queryByText(/Under:/)).not.toBeInTheDocument());
    expect(screen.queryByText("30,000 t")).not.toBeInTheDocument();
  });
});

describe("App shared scenario link", () => {
  const SCENARIO_RESPONSE = {
    data_centers: [],
    baseline_totals: { facility_count: 3, annual_co2_tonnes: 500_000 },
    scenario_totals: { facility_count: 3, annual_co2_tonnes: 50_000 },
  };

  function mockFetchSequence(responses) {
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url, opts) => {
        const body = responses[Math.min(call, responses.length - 1)];
        call += 1;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(typeof body === "function" ? body(url, opts) : body),
        });
      })
    );
  }

  it("re-applies a preset from ?scenario=<presetId> and opens the scenario panel", async () => {
    window.history.pushState(null, "", "/?scenario=grid-decarbonization");
    mockFetchSequence([{ data_centers: [], generated_at: null }, SCENARIO_RESPONSE]);

    render(<App />);

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/scenario"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ scenario: { carbon_intensity_gco2_per_kwh: 50 } }),
        })
      )
    );
  });

  it("re-applies custom overrides from ?scenario=custom&... query params", async () => {
    window.history.pushState(null, "", "/?scenario=custom&renewable_pct=80&pue=1.1");
    mockFetchSequence([{ data_centers: [], generated_at: null }, SCENARIO_RESPONSE]);

    render(<App />);

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/scenario"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ scenario: { renewable_pct: 80, pue: 1.1 } }),
        })
      )
    );
  });

  it("ignores an unknown preset id and does not call POST /api/scenario", async () => {
    window.history.pushState(null, "", "/?scenario=not-a-real-preset");
    mockFetchSequence([{ data_centers: [], generated_at: null }]);

    render(<App />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/scenario"),
      expect.anything()
    );
  });

  it("does not call POST /api/scenario when no scenario param is present", async () => {
    mockFetchSequence([{ data_centers: [], generated_at: null }]);

    render(<App />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/scenario"),
      expect.anything()
    );
  });
});
