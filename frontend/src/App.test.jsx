import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";

vi.mock("./components/Map", () => ({
  default: () => <div data-testid="mock-map" />,
}));

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ generated_at: null, data_centers: [] }),
    })
  );
  vi.stubGlobal("fetch", fetchMock);
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
