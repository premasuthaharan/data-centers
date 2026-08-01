import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

vi.mock("./components/Map", () => ({
  default: ({ selectedId }) => <div data-testid="mock-map" data-selected={selectedId ?? ""} />,
}));
vi.mock("./components/NearMePanel", () => ({ default: () => <div /> }));
vi.mock("./components/ScenarioPanel", () => ({ default: () => <div /> }));
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
});

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
