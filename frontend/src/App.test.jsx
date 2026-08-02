import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import { resolveInitialTheme } from "./theme";

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
