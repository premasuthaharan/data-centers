import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import NearMePanel from "../NearMePanel";
import { severityColor } from "../severityColors";

const LOCATE_RESPONSE = { lat: 39.78, lng: -89.65, city: "Springfield", country: "United States" };

const NEAREST_RESPONSE = [
  {
    id: "confirmed-dc",
    name: "Confirmed DC",
    distance_km: 12.3,
    impact: {
      electricity: { price_lift_pct: 4.2, price_lift_severity: "moderate" },
      water: { severity: "moderate", daily_withdrawal_mgd: 2.1, households_equivalent: 7000 },
      carbon: { cars_equivalent: 1234, renewable_pct: 22, renewable_severity: "moderate" },
    },
  },
  {
    id: "far-dc",
    name: "Far DC",
    distance_km: 340.9,
    impact: {
      electricity: { price_lift_pct: 1.0, price_lift_severity: "low" },
      water: { severity: "low", daily_withdrawal_mgd: 0.4, households_equivalent: 1333 },
      carbon: { cars_equivalent: 210, renewable_pct: 61, renewable_severity: "low" },
    },
  },
];

function mockGeolocationSuccess(lat, lng) {
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: {
      getCurrentPosition: (success) => success({ coords: { latitude: lat, longitude: lng } }),
    },
  });
}

function mockGeolocationFailure() {
  vi.stubGlobal("navigator", {
    ...navigator,
    geolocation: {
      getCurrentPosition: (_success, error) => error(new Error("User denied permission")),
    },
  });
}

function mockGeolocationUnsupported() {
  vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
}

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
    vi.unstubAllGlobals();
  });

  it("shows a trigger button initially and no list", () => {
    render(<NearMePanel onFlyTo={() => {}} />);
    expect(screen.getByText(/show data centers near me/i)).toBeInTheDocument();
    expect(screen.queryByText("Confirmed DC")).not.toBeInTheDocument();
  });

  it("uses the browser's geolocation (prompting for permission) when available", async () => {
    mockGeolocationSuccess(39.78, -89.65);
    mockFetchSequence([NEAREST_RESPONSE]);

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());
    expect(screen.getByText("Far DC")).toBeInTheDocument();
    // Only the nearest-facilities call should hit our backend — no
    // /api/locate call should happen since browser geolocation succeeded.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/datacenters/nearest?lat=39.78&lng=-89.65&n=5")
    );
  });

  it("shows cars and household water equivalents for each result", async () => {
    mockGeolocationSuccess(39.78, -89.65);
    mockFetchSequence([NEAREST_RESPONSE]);

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("7,000")).toBeInTheDocument();
    expect(screen.getByText("210")).toBeInTheDocument();
    expect(screen.getByText("1,333")).toBeInTheDocument();
  });

  it("shows grid renewables % and color-codes it and price lift by severity", async () => {
    mockGeolocationSuccess(39.78, -89.65);
    mockFetchSequence([NEAREST_RESPONSE]);

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());

    expect(screen.getByText("22%")).toBeInTheDocument();
    expect(screen.getByText("22%").closest("span")).toHaveStyle({
      color: severityColor("moderate"),
    });

    expect(screen.getByText("61%")).toBeInTheDocument();
    expect(screen.getByText("61%").closest("span")).toHaveStyle({
      color: severityColor("low"),
    });

    expect(screen.getByText("+4.2%").closest("span")).toHaveStyle({
      color: severityColor("moderate"),
    });
  });

  it("falls back to IP-based /api/locate when geolocation permission is denied", async () => {
    mockGeolocationFailure();
    mockFetchSequence([LOCATE_RESPONSE, NEAREST_RESPONSE]);

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, expect.stringContaining("/api/locate"));
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/datacenters/nearest?lat=39.78&lng=-89.65&n=5")
    );
  });

  it("falls back to /api/locate when the browser has no geolocation support", async () => {
    mockGeolocationUnsupported();
    mockFetchSequence([LOCATE_RESPONSE, NEAREST_RESPONSE]);

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, expect.stringContaining("/api/locate"));
  });

  it("calls onFlyTo with the facility id when a result is clicked", async () => {
    mockGeolocationSuccess(39.78, -89.65);
    mockFetchSequence([NEAREST_RESPONSE]);
    const onFlyTo = vi.fn();

    render(<NearMePanel onFlyTo={onFlyTo} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText("Confirmed DC")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Confirmed DC"));

    expect(onFlyTo).toHaveBeenCalledWith("confirmed-dc");
  });

  it("shows an error state and allows retrying when both geolocation and locate fail", async () => {
    mockGeolocationFailure();
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false }));

    render(<NearMePanel onFlyTo={() => {}} />);
    fireEvent.click(screen.getByText(/show data centers near me/i));

    await waitFor(() => expect(screen.getByText(/could not determine your location/i)).toBeInTheDocument());
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });
});
