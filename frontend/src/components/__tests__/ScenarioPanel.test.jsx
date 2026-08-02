import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ScenarioPanel from "../ScenarioPanel";

const SCENARIO_RESPONSE = {
  data_centers: [],
  baseline_totals: {
    facility_count: 3,
    annual_kwh: 1_000_000_000,
    annual_co2_tonnes: 500_000,
    daily_withdrawal_mgd: 10,
    annual_cost_millions_usd: 80,
  },
  scenario_totals: {
    facility_count: 3,
    annual_kwh: 900_000_000,
    annual_co2_tonnes: 50_000,
    daily_withdrawal_mgd: 4,
    annual_cost_millions_usd: 80,
  },
};

function mockFetchOnce(body) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  );
}

describe("ScenarioPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders all presets and no totals initially", () => {
    render(<ScenarioPanel onClose={() => {}} onScenarioChange={() => {}} />);
    expect(screen.getByText("100% Renewable Mandate")).toBeInTheDocument();
    expect(screen.getByText("Grid Decarbonization")).toBeInTheDocument();
    expect(screen.getByText("PUE Efficiency Standard")).toBeInTheDocument();
    expect(screen.getByText("Water Recycling Requirement")).toBeInTheDocument();
    expect(screen.getByText("Aggressive Policy")).toBeInTheDocument();
    expect(screen.queryByText(/baseline → scenario/)).not.toBeInTheDocument();
  });

  it("calls the scenario API with the preset payload and renders totals", async () => {
    mockFetchOnce(SCENARIO_RESPONSE);
    const onScenarioChange = vi.fn();

    render(<ScenarioPanel onClose={() => {}} onScenarioChange={onScenarioChange} />);
    fireEvent.click(screen.getByText("Grid Decarbonization"));

    await waitFor(() => expect(screen.getByText(/baseline → scenario/)).toBeInTheDocument());

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/scenario"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ scenario: { carbon_intensity_gco2_per_kwh: 50 } }),
      })
    );
    expect(onScenarioChange).toHaveBeenCalledWith({
      ...SCENARIO_RESPONSE,
      presetId: "grid-decarbonization",
      presetLabel: "Grid Decarbonization",
      scenario: { carbon_intensity_gco2_per_kwh: 50 },
    });
  });

  it("copy link writes the preset's shareable URL to the clipboard", async () => {
    mockFetchOnce(SCENARIO_RESPONSE);
    window.history.pushState(null, "", "/");
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<ScenarioPanel onClose={() => {}} onScenarioChange={() => {}} />);
    fireEvent.click(screen.getByText("Grid Decarbonization"));
    await waitFor(() => expect(screen.getByText(/baseline → scenario/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/copy link/i));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("scenario=grid-decarbonization"));
    await waitFor(() => expect(screen.getByText(/link copied/i)).toBeInTheDocument());

    vi.unstubAllGlobals();
  });

  it("copy link includes the selected facility id when one is provided", async () => {
    mockFetchOnce(SCENARIO_RESPONSE);
    window.history.pushState(null, "", "/");
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(
      <ScenarioPanel onClose={() => {}} onScenarioChange={() => {}} selectedFacilityId="dc-a" />
    );
    fireEvent.click(screen.getByText("Grid Decarbonization"));
    await waitFor(() => expect(screen.getByText(/baseline → scenario/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/copy link/i));

    const copiedUrl = writeText.mock.calls[0][0];
    expect(copiedUrl).toContain("scenario=grid-decarbonization");
    expect(copiedUrl).toContain("facility=dc-a");

    vi.unstubAllGlobals();
  });

  it("copy link omits the facility param when no facility is selected", async () => {
    mockFetchOnce(SCENARIO_RESPONSE);
    window.history.pushState(null, "", "/");
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

    render(<ScenarioPanel onClose={() => {}} onScenarioChange={() => {}} />);
    fireEvent.click(screen.getByText("Grid Decarbonization"));
    await waitFor(() => expect(screen.getByText(/baseline → scenario/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/copy link/i));

    expect(writeText.mock.calls[0][0]).not.toContain("facility=");

    vi.unstubAllGlobals();
  });

  it("reset clears the applied scenario and notifies the parent with null", async () => {
    mockFetchOnce(SCENARIO_RESPONSE);
    const onScenarioChange = vi.fn();

    render(<ScenarioPanel onClose={() => {}} onScenarioChange={onScenarioChange} />);
    fireEvent.click(screen.getByText("100% Renewable Mandate"));
    await waitFor(() => expect(screen.getByText(/baseline → scenario/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Reset to baseline"));

    expect(screen.queryByText(/baseline → scenario/)).not.toBeInTheDocument();
    expect(onScenarioChange).toHaveBeenLastCalledWith(null);
  });

  it("shows an error state when the request fails", async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false }));

    render(<ScenarioPanel onClose={() => {}} onScenarioChange={() => {}} />);
    fireEvent.click(screen.getByText("PUE Efficiency Standard"));

    await waitFor(() => expect(screen.getByText(/could not apply scenario/i)).toBeInTheDocument());
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<ScenarioPanel onClose={onClose} onScenarioChange={() => {}} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ScenarioPanel hydration from a shared link", () => {
  it("shows the applied preset highlighted and totals when initialScenarioData is provided", () => {
    render(
      <ScenarioPanel
        onClose={() => {}}
        onScenarioChange={() => {}}
        initialScenarioData={{
          ...SCENARIO_RESPONSE,
          presetId: "grid-decarbonization",
          scenario: { carbon_intensity_gco2_per_kwh: 50 },
        }}
      />
    );

    expect(screen.getByText(/baseline → scenario/)).toBeInTheDocument();
    expect(screen.getByText("Grid Decarbonization").closest("button")).toHaveClass(
      "scenario-preset-btn--active"
    );
  });

  it("renders with no applied scenario when initialScenarioData is absent (no regression)", () => {
    render(<ScenarioPanel onClose={() => {}} onScenarioChange={() => {}} />);
    expect(screen.queryByText(/baseline → scenario/)).not.toBeInTheDocument();
  });
});
