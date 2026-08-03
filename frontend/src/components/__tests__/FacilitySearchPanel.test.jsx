import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FacilitySearchPanel from "../FacilitySearchPanel";

const DATACENTERS = [
  { id: "dc-a", name: "Facility A", operator: "Amazon", country: "United States", power_mw: 100 },
  { id: "dc-b", name: "Facility B", operator: "Google", country: "Ireland", power_mw: 300 },
];

function resultOrder() {
  return screen
    .getAllByRole("button")
    .map((btn) => btn.querySelector(".facility-search-result-name")?.textContent)
    .filter(Boolean);
}

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

  it("sorts alphabetically by name by default", () => {
    render(
      <FacilitySearchPanel
        datacenters={[DATACENTERS[1], DATACENTERS[0]]}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(resultOrder()).toEqual(["Facility A", "Facility B"]);
  });

  it("sorts by power, highest first, when Power is selected", () => {
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Power" }));
    expect(resultOrder()).toEqual(["Facility B", "Facility A"]);
  });

  it("sorts facilities with unknown power last", () => {
    const withUnknown = [...DATACENTERS, { id: "dc-c", name: "Facility C", operator: "Meta", country: "France", power_mw: null }];
    render(<FacilitySearchPanel datacenters={withUnknown} onSelect={() => {}} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Power" }));
    expect(resultOrder()).toEqual(["Facility B", "Facility A", "Facility C"]);
  });

  it("filters by country", () => {
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/filter by country/i), { target: { value: "Ireland" } });

    expect(screen.getByText("Facility B")).toBeInTheDocument();
    expect(screen.queryByText("Facility A")).not.toBeInTheDocument();
  });

  it("combines the country filter with the text search", () => {
    render(<FacilitySearchPanel datacenters={DATACENTERS} onSelect={() => {}} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/filter by country/i), { target: { value: "United States" } });
    fireEvent.change(screen.getByPlaceholderText(/search by name or operator/i), {
      target: { value: "google" },
    });

    expect(screen.getByText(/no matching facilities/i)).toBeInTheDocument();
  });

  it("lists each country once as a filter option", () => {
    const dupCountry = [...DATACENTERS, { id: "dc-c", name: "Facility C", operator: "Meta", country: "United States", power_mw: 50 }];
    render(<FacilitySearchPanel datacenters={dupCountry} onSelect={() => {}} onClose={() => {}} />);
    const select = screen.getByLabelText(/filter by country/i);
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toEqual(["All countries", "Ireland", "United States"]);
  });
});
