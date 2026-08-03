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

describe("App combined scenario + facility share link", () => {
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

  const SCENARIO_RESPONSE = {
    data_centers: [SCENARIO_RECORD],
    baseline_totals: { facility_count: 1, annual_co2_tonnes: 300_000 },
    scenario_totals: { facility_count: 1, annual_co2_tonnes: 30_000 },
    presetLabel: "Grid Decarbonization",
  };

  function mockFetchByUrl() {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (typeof url === "string" && url.includes("/api/scenario")) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(SCENARIO_RESPONSE) });
        }
        return Promise.resolve({
          json: () => Promise.resolve({ data_centers: DATACENTERS, generated_at: "2026-01-01" }),
        });
      })
    );
  }

  it("resolves both params together and lands on the facility detail with scenario deltas, not the scenario panel", async () => {
    window.history.pushState(null, "", "/?scenario=grid-decarbonization&facility=dc-a");
    mockFetchByUrl();

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

    await waitFor(() => expect(screen.getByText("Facility A")).toBeInTheDocument());
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-selected", "dc-a");
    // Scenario deltas render directly on first paint (no baseline-only flash).
    expect(screen.getByText("300,000 t")).toBeInTheDocument();
    expect(screen.getByText("30,000 t")).toBeInTheDocument();
  });

  it("only ?scenario= present still opens the aggregate scenario panel (unchanged behavior)", async () => {
    window.history.pushState(null, "", "/?scenario=grid-decarbonization");
    mockFetchByUrl();

    render(<App />);

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/scenario"),
        expect.anything()
      )
    );
    expect(screen.queryByText("Facility A")).not.toBeInTheDocument();
  });

  it("only ?facility= present still opens the facility detail without a scenario call (unchanged behavior)", async () => {
    window.history.pushState(null, "", "/?facility=dc-a");
    mockFetchByUrl();

    render(<App />);

    await waitFor(() => expect(screen.getByText("Facility A")).toBeInTheDocument());
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/scenario"),
      expect.anything()
    );
  });
});

describe("App CSV export", () => {
  const DATACENTERS = [
    {
      id: "dc-a",
      name: "Facility A",
      operator: "Amazon",
      country: "United States",
      address: "123 Main St",
      power_mw: 100,
      cost_usd_billions: 1.2,
      impact: {
        electricity: { homes_powered: 86_766, annual_kwh: 900_000_000, price_lift_pct: 5.5 },
        water: { daily_withdrawal_mgd: 1.52, severity: "moderate" },
        carbon: { annual_co2_tonnes: 300_000, cars_equivalent: 65_217, renewable_pct: 22 },
      },
    },
    {
      id: "dc-b",
      name: "Facility B",
      operator: "Google",
      country: "Ireland",
      address: "1 Dublin Rd",
      power_mw: 50,
      cost_usd_billions: 0.6,
      impact: {
        electricity: { homes_powered: 40_000, annual_kwh: 400_000_000, price_lift_pct: 3.1 },
        water: { daily_withdrawal_mgd: 0.8, severity: "low" },
        carbon: { annual_co2_tonnes: 120_000, cars_equivalent: 26_087, renewable_pct: 40 },
      },
    },
  ];

  let createObjectURLMock;
  let clickMock;
  let realCreateElement;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ data_centers: DATACENTERS, generated_at: "2026-01-01" }),
        })
      )
    );
    createObjectURLMock = vi.fn(() => "blob:mock-url");
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = vi.fn();
    clickMock = vi.fn();
    realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = realCreateElement(tag);
      if (tag === "a") el.click = clickMock;
      return el;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  function lastCSV() {
    const blob = createObjectURLMock.mock.calls.at(-1)[0];
    return blob.text();
  }

  it("exports all facilities with their impact figures when no region is focused", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/2 data centers/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Export CSV/));

    const csv = await lastCSV();
    expect(csv).toContain("Facility A");
    expect(csv).toContain("Facility B");
    expect(csv).toContain("United States");
    expect(csv).toContain("Ireland");
    expect(csv.split("\n")).toHaveLength(3); // header + 2 rows
  });

  it("scopes the export to the scenario-adjusted figures when a scenario is active", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/2 data centers/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Policy scenarios/));
    window.__mockScenarioPayload = {
      data_centers: [
        { ...DATACENTERS[0], impact: { ...DATACENTERS[0].impact, carbon: { ...DATACENTERS[0].impact.carbon, annual_co2_tonnes: 30_000 } } },
        { ...DATACENTERS[1], impact: { ...DATACENTERS[1].impact, carbon: { ...DATACENTERS[1].impact.carbon, annual_co2_tonnes: 12_000 } } },
      ],
      presetLabel: "Grid Decarbonization",
    };
    fireEvent.click(screen.getByText("apply mock scenario"));

    fireEvent.click(screen.getByText(/Export CSV/));

    const csv = await lastCSV();
    expect(csv).toContain("30000");
    expect(csv).toContain("12000");
    expect(csv).not.toContain("300000");
  });
});

describe("App facility search", () => {
  const DATACENTERS = [
    { id: "dc-a", name: "Colossus 2", operator: "SpaceXAI", country: "US", impact: {}, category: "frontier-ai" },
    { id: "dc-b", name: "Equinix Ashburn", operator: "Equinix", country: "US", impact: {}, category: "general-purpose" },
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

  it("opens the search panel, filters results, and flies to the selected facility on click", async () => {
    mockFetchDatacenters();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/2 data centers/)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/search for a facility/i));
    expect(screen.getByText("Colossus 2")).toBeInTheDocument();
    expect(screen.getByText("Equinix Ashburn")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search by name or operator/i), {
      target: { value: "equinix" },
    });
    expect(screen.getByText("Equinix Ashburn")).toBeInTheDocument();
    expect(screen.queryByText("Colossus 2")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Equinix Ashburn"));

    // Selecting a result closes the search panel and opens the detail card
    // (same handleSelect path NearMePanel's onFlyTo uses).
    expect(screen.queryByPlaceholderText(/search by name or operator/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-selected", "dc-b");
  });

  it("scopes search results to the active category filter", async () => {
    mockFetchDatacenters();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/2 data centers/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Frontier-AI/));
    fireEvent.click(screen.getByLabelText(/search for a facility/i));

    expect(screen.getByText("Colossus 2")).toBeInTheDocument();
    expect(screen.queryByText("Equinix Ashburn")).not.toBeInTheDocument();
  });

  it("closes the search panel via its close button without selecting anything", async () => {
    mockFetchDatacenters();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/2 data centers/)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText(/search for a facility/i));
    fireEvent.click(screen.getByLabelText("Close"));

    expect(screen.queryByPlaceholderText(/search by name or operator/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-map")).toHaveAttribute("data-selected", "");
  });
});
