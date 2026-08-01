import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MethodologyPanel from "../MethodologyPanel";

describe("MethodologyPanel", () => {
  it("renders data sources and methodology sections", () => {
    render(<MethodologyPanel onClose={() => {}} />);
    expect(screen.getByText("Data Sources & Methodology")).toBeInTheDocument();
    expect(screen.getByText("Data sources")).toBeInTheDocument();
    expect(screen.getByText("Impact methodology")).toBeInTheDocument();
    expect(screen.getByText("About this project")).toBeInTheDocument();
  });

  it("renders the author link with correct href and safe target attributes", () => {
    render(<MethodologyPanel onClose={() => {}} />);
    const link = screen.getByRole("link", { name: "Prema Suthaharan" });
    expect(link).toHaveAttribute("href", "https://premasuthaharan.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<MethodologyPanel onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
