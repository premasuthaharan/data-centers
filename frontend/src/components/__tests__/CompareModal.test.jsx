import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareModal from "../CompareModal";

function makeDc(id, name, overrides = {}) {
  return {
    id,
    name,
    operator: "Amazon",
    power_mw: 100,
    data_status: "confirmed",
    impact: {
      electricity: { annual_kwh: 900_000_000, price_lift_pct: 5.5 },
      carbon: { annual_co2_tonnes: 300_000, renewable_pct: 22 },
      water: { daily_withdrawal_mgd: 1.5, severity: "moderate" },
      land: { waste_heat_mw: 30 },
      ...overrides.impact,
    },
    ...overrides,
  };
}

const DATACENTERS = [
  makeDc("dc-a", "Facility A"),
  makeDc("dc-b", "Facility B", { operator: "Google" }),
  makeDc("announced-dc", "Announced Facility", {
    data_status: "announced",
    impact: {
      electricity: { annual_kwh: 0, price_lift_pct: 0 },
      carbon: { annual_co2_tonnes: 0, renewable_pct: 25 },
      water: { daily_withdrawal_mgd: 0, severity: "low" },
      land: { waste_heat_mw: 0 },
    },
  }),
];

function search(text) {
  fireEvent.change(screen.getByPlaceholderText(/search facilities/i), {
    target: { value: text },
  });
}

describe("CompareModal", () => {
  it("lists only non-announced facilities as search results", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);
    expect(screen.getByText("Facility A")).toBeInTheDocument();
    expect(screen.getByText("Facility B")).toBeInTheDocument();
    expect(screen.queryByText("Announced Facility")).not.toBeInTheDocument();
  });

  it("filters search results by name and by operator, case-insensitively", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);

    search("facility a");
    expect(screen.getByText("Facility A")).toBeInTheDocument();
    expect(screen.queryByText("Facility B")).not.toBeInTheDocument();

    search("google");
    expect(screen.getByText("Facility B")).toBeInTheDocument();
    expect(screen.queryByText("Facility A")).not.toBeInTheDocument();

    search("nonexistent");
    expect(screen.getByText(/no matching facilities/i)).toBeInTheDocument();
  });

  it("shows a hint instead of a table when fewer than 2 facilities are selected", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);
    expect(screen.getByText(/select at least 2 facilities/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Facility A"));
    expect(screen.getByText(/select at least 2 facilities/i)).toBeInTheDocument();
  });

  it("adds a chip and clears the search input when a result is clicked", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);

    search("Facility A");
    fireEvent.click(screen.getByText("Facility A"));

    expect(screen.getByPlaceholderText(/search facilities/i)).toHaveValue("");
    // Facility A is now a chip, and no longer in the search results.
    expect(screen.queryByRole("button", { name: /^Facility A/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Remove Facility A")).toBeInTheDocument();
  });

  it("removes a chip when its × button is clicked", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);

    fireEvent.click(screen.getByText("Facility A"));
    fireEvent.click(screen.getByText("Facility B"));
    expect(screen.getByRole("table")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove Facility A"));

    expect(screen.queryByLabelText("Remove Facility A")).not.toBeInTheDocument();
    expect(screen.getByText(/select at least 2 facilities/i)).toBeInTheDocument();
    // Facility A is searchable/selectable again.
    expect(screen.getByRole("button", { name: /Facility A/ })).toBeInTheDocument();
  });

  it("renders a comparison table once 2 facilities are selected", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);

    fireEvent.click(screen.getByText("Facility A"));
    fireEvent.click(screen.getByText("Facility B"));

    expect(screen.queryByText(/select at least 2 facilities/i)).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    expect(screen.getAllByText("Facility A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Facility B").length).toBeGreaterThan(0);
    expect(screen.getByText("Grid renewables")).toBeInTheDocument();
  });

  it("calls onClose when the close button or backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<CompareModal datacenters={DATACENTERS} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector(".compare-modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not close when clicking inside the modal content", () => {
    const onClose = vi.fn();
    render(<CompareModal datacenters={DATACENTERS} onClose={onClose} />);

    fireEvent.click(screen.getByText("Compare Facilities"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
