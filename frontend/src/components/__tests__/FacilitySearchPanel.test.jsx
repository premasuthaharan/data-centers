import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FacilitySearchPanel from "../FacilitySearchPanel";

const DATACENTERS = [
  { id: "dc-a", name: "Facility A", operator: "Amazon" },
  { id: "dc-b", name: "Facility B", operator: "Google" },
];

describe("FacilitySearchPanel", () => {
  it("shows every facility with an empty query", () => {
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Facility A")).toBeInTheDocument();
    expect(screen.getByText("Facility B")).toBeInTheDocument();
  });

  it("filters results as the user types, by name or operator", () => {
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/search by name or operator/i);

    fireEvent.change(input, { target: { value: "facility a" } });
    expect(screen.getByText("Facility A")).toBeInTheDocument();
    expect(screen.queryByText("Facility B")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "google" } });
    expect(screen.getByText("Facility B")).toBeInTheDocument();
    expect(screen.queryByText("Facility A")).not.toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/search by name or operator/i), {
      target: { value: "nonexistent" },
    });
    expect(screen.getByText(/no matching facilities/i)).toBeInTheDocument();
  });

  it("calls onSelect with the facility id when a result is clicked", () => {
    const onSelect = vi.fn();
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={onSelect} onClose={() => {}} />);

    fireEvent.click(screen.getByText("Facility A"));
    expect(onSelect).toHaveBeenCalledWith("dc-a");
  });

  it("calls onClose when the close button or the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(
      <FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={onClose} />
    );

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(container.querySelector(".facility-search-overlay"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("does not close when clicking inside the panel card", () => {
    const onClose = vi.fn();
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={onClose} />);

    fireEvent.click(screen.getByText("Find a facility"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
