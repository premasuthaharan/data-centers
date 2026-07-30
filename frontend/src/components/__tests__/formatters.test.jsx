import { describe, it, expect } from "vitest";
import { fmt } from "../formatters";

describe("fmt", () => {
  it("returns an em dash for null", () => {
    expect(fmt(null)).toBe("—");
  });

  it("returns an em dash for undefined", () => {
    expect(fmt(undefined)).toBe("—");
  });

  it("returns an em dash for empty string", () => {
    expect(fmt("")).toBe("—");
  });

  it("formats a number with locale separators", () => {
    expect(fmt(1234567)).toBe("1,234,567");
  });

  it("appends a unit suffix when provided", () => {
    // fmt() joins with a non-breaking space (\u00A0), not a regular space.
    expect(fmt(50, "km")).toBe(`50\u00A0km`);
  });

  it("does not append a trailing space when unit is omitted", () => {
    expect(fmt(50)).toBe((50).toLocaleString());
  });

  it("formats zero as 0, not as the em-dash fallback", () => {
    expect(fmt(0)).toBe("0");
  });
});
