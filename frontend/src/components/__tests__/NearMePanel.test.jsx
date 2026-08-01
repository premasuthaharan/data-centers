import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import NearMePanel from "../NearMePanel";

const LOCATE_RESPONSE = { lat: 39.78, lng: -89.65, city: "Springfield", country: "United States" };

const NEAREST_RESPONSE = [
  {
    id: "confirmed-dc",
    name: "Confirmed DC",
    distance_km: 12.3,
    impact: {
      electricity: { price_lift_pct: 4.2 },
      water: { severity: "moderate", daily_withdrawal_mgd: 2.1 },
    },
  },
  {
    id: "far-dc",
    name: "Far DC",
    distance_km: 340.9,
    impact: {
      electricity: { price_lift_pct: 1.0 },
      water: { severity: "low", daily_withdrawal_mgd: 0.4 },
    },
  },
];

function mockFetchSequence(responses) {
  let call = 0;
  globalThis.fetch = vi.fn(() => {
    const body = responses[call];
    call += 1;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(body),
    });
  });
}

describe("NearMePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a trigger button initially and no list", () => {
    render(<NearMePanel onFlyTo={() => {}} />);
    expect(screen.getByText(/show data centers near me/i)).toBeInTheDocument();
    expect(screen.queryByText("Confirmed DC")).not.toBeInTheDocument();
  });

  it("fetches location then nearest facilities and renders the ranked list", async () => {
    mockFetchSequence([LOCATE_RESPONSE, NEAREST_RESPONSE]);

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());
    expect(screen.getByText("Far DC")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, expect.stringContaining("/api/locate"));
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/datacenters/nearest?lat=39.78&lng=-89.65&n=5")
    );
  });

  it("calls onFlyTo with the facility id when a result is clicked", async () => {
    mockFetchSequence([LOCATE_RESPONSE, NEAREST_RESPONSE]);
    const onFlyTo = vi.fn();

    render(<NearMePanel onFlyTo={onFlyTo} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Confirmed DC"));

    expect(onFlyTo).toHaveBeenCalledWith("confirmed-dc");
  });

  it("shows an error state and allows retrying when the locate request fails", async () => {
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false }));

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText(/could not determine your location/i)).toBeInTheDocument());
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });
});
