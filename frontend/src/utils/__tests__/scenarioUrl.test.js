import { describe, it, expect } from "vitest";
import { encodeScenarioParams, decodeScenarioParams } from "../scenarioUrl";

describe("encodeScenarioParams / decodeScenarioParams round-trip", () => {
  it("round-trips a preset id", () => {
    const params = encodeScenarioParams("grid-decarbonization", null);
    expect(params.toString()).toBe("scenario=grid-decarbonization");

    const decoded = decodeScenarioParams(params);
    expect(decoded).toEqual({ presetId: "grid-decarbonization", scenario: null });
  });

  it("round-trips custom overrides", () => {
    const scenario = { renewable_pct: 80, pue: 1.1 };
    const params = encodeScenarioParams(null, scenario);
    expect(params.get("scenario")).toBe("custom");
    expect(params.get("renewable_pct")).toBe("80");
    expect(params.get("pue")).toBe("1.1");

    const decoded = decodeScenarioParams(params);
    expect(decoded).toEqual({ presetId: null, scenario: { renewable_pct: 80, pue: 1.1 } });
  });

  it("round-trips all four override keys", () => {
    const scenario = {
      renewable_pct: 100,
      carbon_intensity_gco2_per_kwh: 50,
      water_liters_per_kwh: 1.0,
      pue: 1.1,
    };
    const params = encodeScenarioParams(null, scenario);
    const decoded = decodeScenarioParams(params);
    expect(decoded).toEqual({ presetId: null, scenario });
  });

  it("omits null/undefined override keys when encoding custom scenarios", () => {
    const params = encodeScenarioParams(null, { renewable_pct: 50, pue: null });
    expect(params.has("pue")).toBe(false);
    expect(params.get("renewable_pct")).toBe("50");
  });

  it("round-trips boolean overrides (cost allocation reform, tax incentive rollback)", () => {
    const scenario = { cost_allocation_reform: true, tax_incentive_rollback: true };
    const params = encodeScenarioParams(null, scenario);
    expect(params.get("cost_allocation_reform")).toBe("true");
    expect(params.get("tax_incentive_rollback")).toBe("true");

    const decoded = decodeScenarioParams(params);
    expect(decoded).toEqual({ presetId: null, scenario });
  });
});

describe("decodeScenarioParams malformed input", () => {
  it("returns null when no scenario param is present", () => {
    expect(decodeScenarioParams(new URLSearchParams(""))).toBeNull();
  });

  it("returns null for custom with no valid override keys", () => {
    expect(decodeScenarioParams(new URLSearchParams("scenario=custom"))).toBeNull();
  });

  it("returns null for custom with only non-numeric override values", () => {
    expect(
      decodeScenarioParams(new URLSearchParams("scenario=custom&renewable_pct=not-a-number"))
    ).toBeNull();
  });

  it("ignores unknown query params outside the override key set", () => {
    const decoded = decodeScenarioParams(
      new URLSearchParams("scenario=custom&renewable_pct=50&unrelated=xyz")
    );
    expect(decoded).toEqual({ presetId: null, scenario: { renewable_pct: 50 } });
  });

  it("treats an arbitrary non-custom value as a preset id (validity is App.jsx's job)", () => {
    const decoded = decodeScenarioParams(new URLSearchParams("scenario=not-a-real-preset"));
    expect(decoded).toEqual({ presetId: "not-a-real-preset", scenario: null });
  });
});

describe("encodeScenarioParams empty state", () => {
  it("returns empty params when no preset id and no scenario overrides", () => {
    const params = encodeScenarioParams(null, null);
    expect(params.toString()).toBe("");
  });

  it("returns empty params when scenario is an empty object", () => {
    const params = encodeScenarioParams(null, {});
    expect(params.toString()).toBe("");
  });
});
