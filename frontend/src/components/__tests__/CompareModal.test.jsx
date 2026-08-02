import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

function focusSearch() {
  fireEvent.focus(screen.getByPlaceholderText(/search facilities/i));
}

function search(text) {
  const input = screen.getByPlaceholderText(/search facilities/i);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
}

describe("CompareModal", () => {
  it("hides the search results dropdown until the search input is focused", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);
    expect(screen.queryByText("Facility A")).not.toBeInTheDocument();
    expect(screen.queryByText("Facility B")).not.toBeInTheDocument();

    focusSearch();
    expect(screen.getByText("Facility A")).toBeInTheDocument();
    expect(screen.getByText("Facility B")).toBeInTheDocument();
    expect(screen.queryByText("Announced Facility")).not.toBeInTheDocument();
  });

  it("hides the results dropdown again on blur", async () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/search facilities/i);

    fireEvent.focus(input);
    expect(screen.getByText("Facility A")).toBeInTheDocument();

    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.queryByText("Facility A")).not.toBeInTheDocument();
    });
  });

  it("keeps results visible while a non-empty query is present, even without focus", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);
    search("Facility A");
    fireEvent.blur(screen.getByPlaceholderText(/search facilities/i));
    expect(screen.getByText("Facility A")).toBeInTheDocument();
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

    focusSearch();
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

    focusSearch();
    fireEvent.click(screen.getByText("Facility A"));
    focusSearch();
    fireEvent.click(screen.getByText("Facility B"));
    expect(screen.getByRole("table")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove Facility A"));

    expect(screen.queryByLabelText("Remove Facility A")).not.toBeInTheDocument();
    expect(screen.getByText(/select at least 2 facilities/i)).toBeInTheDocument();
    // Facility A is searchable/selectable again.
    focusSearch();
    expect(screen.getByRole("button", { name: /Facility A/ })).toBeInTheDocument();
  });

  it("renders a comparison table once 2 facilities are selected", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);

    focusSearch();
    fireEvent.click(screen.getByText("Facility A"));
    focusSearch();
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

  it("marks the better and worse cell in a row where values differ", () => {
    const datacenters = [
      makeDc("dc-a", "Facility A", {
        impact: {
          electricity: { annual_kwh: 900_000_000, price_lift_pct: 5.5 },
          carbon: { annual_co2_tonnes: 100_000, renewable_pct: 22 },
          water: { daily_withdrawal_mgd: 1.5, severity: "moderate" },
          land: { waste_heat_mw: 30 },
        },
      }),
      makeDc("dc-b", "Facility B", {
        impact: {
          electricity: { annual_kwh: 900_000_000, price_lift_pct: 5.5 },
          carbon: { annual_co2_tonnes: 500_000, renewable_pct: 22 },
          water: { daily_withdrawal_mgd: 1.5, severity: "moderate" },
          land: { waste_heat_mw: 30 },
        },
      }),
    ];
    render(<CompareModal datacenters={datacenters} onClose={() => {}} />);

    focusSearch();
    fireEvent.click(screen.getByText("Facility A"));
    focusSearch();
    fireEvent.click(screen.getByText("Facility B"));

    const co2Row = screen.getByText("Annual CO₂").closest("tr");
    const cells = co2Row.querySelectorAll("td");
    expect(cells[0]).toHaveClass("compare-cell--best");
    expect(cells[1]).toHaveClass("compare-cell--worst");
  });

  it("does not mark a row where every selected facility has the same value", () => {
    render(<CompareModal datacenters={DATACENTERS} onClose={() => {}} />);

    focusSearch();
    fireEvent.click(screen.getByText("Facility A"));
    focusSearch();
    fireEvent.click(screen.getByText("Facility B"));

    // Both DATACENTERS entries share renewable_pct: 22 — no winner to mark.
    const renewablesRow = screen.getByText("Grid renewables").closest("tr");
    for (const cell of renewablesRow.querySelectorAll("td")) {
      expect(cell).not.toHaveClass("compare-cell--best");
      expect(cell).not.toHaveClass("compare-cell--worst");
    }
  });
});
