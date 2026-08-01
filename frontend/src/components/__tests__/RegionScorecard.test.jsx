import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import RegionScorecard from "../RegionScorecard";

const REGIONS_RESPONSE = [
  {
    region: "United States",
    facility_count: 6,
    area_km2: 9_000_000,
    annual_kwh: 5_000_000_000,
    annual_co2_tonnes: 300_000,
    daily_withdrawal_mgd: 8,
    annual_cost_millions_usd: 400,
    water_severity_counts: { low: 0, moderate: 1, high: 1, critical: 0 },
  },
  {
    region: "Ireland",
    facility_count: 1,
    area_km2: 50_000,
    annual_kwh: 9_000_000_000,
    annual_co2_tonnes: 100_000,
    daily_withdrawal_mgd: 20,
    annual_cost_millions_usd: 100,
    water_severity_counts: { low: 0, moderate: 0, high: 0, critical: 1 },
  },
  {
    region: "Unmapped Land",
    facility_count: 1,
    area_km2: null,
    annual_kwh: 1_000_000_000,
    annual_co2_tonnes: 50_000,
    daily_withdrawal_mgd: 2,
    annual_cost_millions_usd: 20,
    water_severity_counts: { low: 1, moderate: 0, high: 0, critical: 0 },
  },
];

function mockFetchOnce(body) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
  );
}

describe("RegionScorecard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches /api/regions and defaults to per-km² basis (excludes regions with no area)", async () => {
    mockFetchOnce(REGIONS_RESPONSE);

    render(<RegionScorecard onClose={() => {}} onFocusRegion={() => {}} />);

    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/regions"));
    await waitFor(() => expect(screen.getByText(/Ireland/)).toBeInTheDocument());

    // Ireland: 100,000t / 50,000km² = 2.0 > US: 300,000t / 9,000,000km² ≈ 0.033
    const names = screen.getAllByText(/#\d/).map((el) => el.textContent);
    expect(names).toEqual(["#1 Ireland", "#2 United States"]);
    expect(screen.getByText(/omitted/)).toBeInTheDocument();
  });

  it("switching basis to Total re-sorts by raw sum and includes all regions", async () => {
    mockFetchOnce(REGIONS_RESPONSE);

    render(<RegionScorecard onClose={() => {}} onFocusRegion={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Ireland/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Total"));

    const names = screen.getAllByText(/#\d/).map((el) => el.textContent);
    expect(names).toEqual(["#1 United States", "#2 Ireland", "#3 Unmapped Land"]);
  });

  it("switching basis to Per facility re-sorts by metric / facility_count", async () => {
    mockFetchOnce(REGIONS_RESPONSE);

    render(<RegionScorecard onClose={() => {}} onFocusRegion={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Ireland/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Per facility"));

    // US: 300,000t / 6 = 50,000/facility; Ireland: 100,000t / 1 = 100,000/facility
    const names = screen.getAllByText(/#\d/).map((el) => el.textContent);
    expect(names[0]).toBe("#1 Ireland");
  });

  it("switching metric re-sorts the list", async () => {
    mockFetchOnce(REGIONS_RESPONSE);

    render(<RegionScorecard onClose={() => {}} onFocusRegion={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Ireland/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Total"));
    fireEvent.click(screen.getByText("Water"));

    const names = screen.getAllByText(/#\d/).map((el) => el.textContent);
    expect(names).toEqual(["#1 Ireland", "#2 United States", "#3 Unmapped Land"]);
  });

  it("only shows the water stress line when the Water metric is selected", async () => {
    mockFetchOnce(REGIONS_RESPONSE);

    render(<RegionScorecard onClose={() => {}} onFocusRegion={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Ireland/)).toBeInTheDocument());

    // Default metric is CO2 — water stress shouldn't be shown alongside it.
    expect(screen.queryByText(/Water stress/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Water"));
    expect(screen.getAllByText(/Water stress/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Power"));
    expect(screen.queryByText(/Water stress/)).not.toBeInTheDocument();
  });

  it("clicking 'focus this region' fires onFocusRegion with the region entry", async () => {
    mockFetchOnce(REGIONS_RESPONSE);
    const onFocusRegion = vi.fn();

    render(<RegionScorecard onClose={() => {}} onFocusRegion={onFocusRegion} />);
    await waitFor(() => expect(screen.getByText(/United States/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/United States/));

    expect(onFocusRegion).toHaveBeenCalledWith(REGIONS_RESPONSE[0]);
  });

  it("shows an error state when the fetch fails", async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error("network down")));

    render(<RegionScorecard onClose={() => {}} onFocusRegion={() => {}} />);

    await waitFor(() => expect(screen.getByText(/network down/)).toBeInTheDocument());
  });

  it("calls onClose when the close button is clicked", async () => {
    mockFetchOnce(REGIONS_RESPONSE);
    const onClose = vi.fn();

    render(<RegionScorecard onClose={onClose} onFocusRegion={() => {}} />);
    await waitFor(() => expect(screen.getByText(/United States/)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
  });
});
