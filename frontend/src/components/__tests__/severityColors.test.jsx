import { describe, it, expect } from "vitest";
import { severityColor } from "../severityColors";

describe("severityColor", () => {
  it("maps each severity tier to its color", () => {
    expect(severityColor("low")).toBe("#22c55e");
    expect(severityColor("moderate")).toBe("#f59e0b");
    expect(severityColor("high")).toBe("#f97316");
    expect(severityColor("critical")).toBe("#ef4444");
  });

  it("falls back to a neutral color for unknown or missing severities", () => {
    expect(severityColor("unknown")).toBe("#64748b");
    expect(severityColor(undefined)).toBe("#64748b");
    expect(severityColor(null)).toBe("#64748b");
  });
});
