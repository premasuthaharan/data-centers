import { describe, it, expect } from "vitest";
import {
  operatorColor,
  waterSeverityColor,
  markerColor,
  kmToGeoJSONCircle,
  hasCoordinates,
  isAnnounced,
  constructionStatus,
  isPlanned,
  isUnderConstruction,
  isNonOperational,
} from "../mapHelpers";

describe("operatorColor", () => {
  it("maps known operator substrings to their brand color", () => {
    expect(operatorColor("Amazon Web Services")).toBe("#FF9900");
    expect(operatorColor("Microsoft Corp")).toBe("#00A4EF");
    expect(operatorColor("Google Cloud")).toBe("#34A853");
    expect(operatorColor("Meta Platforms")).toBe("#1877F2");
    expect(operatorColor("Apple Inc")).toBe("#888888");
  });

  it("falls back to purple for unknown operators", () => {
    expect(operatorColor("SomeOtherCo")).toBe("#9333ea");
  });

  it("falls back to purple for empty/missing operator", () => {
    expect(operatorColor("")).toBe("#9333ea");
    expect(operatorColor(undefined)).toBe("#9333ea");
  });

  it("uses the general-purpose color regardless of operator when category is general-purpose", () => {
    expect(operatorColor("Amazon Web Services", "general-purpose")).toBe("#0d9488");
    expect(operatorColor("SomeOtherCo", "general-purpose")).toBe("#0d9488");
  });

  it("uses operator/other colors when category is frontier-ai", () => {
    expect(operatorColor("Google Cloud", "frontier-ai")).toBe("#34A853");
    expect(operatorColor("SomeOtherCo", "frontier-ai")).toBe("#9333ea");
  });
});

describe("waterSeverityColor", () => {
  it("maps each known severity to its color", () => {
    expect(waterSeverityColor("low")).toBe("#22c55e");
    expect(waterSeverityColor("moderate")).toBe("#f59e0b");
    expect(waterSeverityColor("high")).toBe("#f97316");
    expect(waterSeverityColor("critical")).toBe("#ef4444");
  });

  it("falls back to gray for unknown/missing severity", () => {
    expect(waterSeverityColor("unknown")).toBe("#64748b");
    expect(waterSeverityColor(undefined)).toBe("#64748b");
  });
});

describe("markerColor", () => {
  const dc = { operator: "Google Cloud", impact: { water: { severity: "high" } } };

  it("uses operator color by default", () => {
    expect(markerColor(dc)).toBe("#34A853");
  });

  it("uses operator color when colorMode is 'operator'", () => {
    expect(markerColor(dc, "operator")).toBe("#34A853");
  });

  it("uses water severity color when colorMode is 'water'", () => {
    expect(markerColor(dc, "water")).toBe("#f97316");
  });

  it("falls back to gray when colorMode is 'water' and severity is missing", () => {
    expect(markerColor({ operator: "Google" }, "water")).toBe("#64748b");
  });

  it("uses the general-purpose color for general-purpose facilities regardless of operator", () => {
    expect(markerColor({ operator: "Amazon Web Services", category: "general-purpose" })).toBe("#0d9488");
  });
});

describe("kmToGeoJSONCircle", () => {
  it("returns steps+1 coordinates forming a closed ring", () => {
    const coords = kmToGeoJSONCircle(-90, 35, 50, 64);
    expect(coords).toHaveLength(65);
    expect(coords[0][0]).toBeCloseTo(coords[64][0], 10);
    expect(coords[0][1]).toBeCloseTo(coords[64][1], 10);
  });

  it("respects a custom steps count", () => {
    const coords = kmToGeoJSONCircle(0, 0, 10, 8);
    expect(coords).toHaveLength(9);
  });

  it("each point is [lng, lat] pair of numbers", () => {
    const coords = kmToGeoJSONCircle(10, 20, 30);
    for (const [lng, lat] of coords) {
      expect(typeof lng).toBe("number");
      expect(typeof lat).toBe("number");
    }
  });
});

describe("hasCoordinates", () => {
  it("true when lat/lng are numbers", () => {
    expect(hasCoordinates({ lat: 1.5, lng: 2.5 })).toBe(true);
  });

  it("false when lat/lng are null (failed geocode)", () => {
    expect(hasCoordinates({ lat: null, lng: null })).toBe(false);
  });

  it("false when lat/lng are missing entirely", () => {
    expect(hasCoordinates({})).toBe(false);
  });

  it("false when lat/lng are strings", () => {
    expect(hasCoordinates({ lat: "1.5", lng: "2.5" })).toBe(false);
  });
});

describe("isAnnounced", () => {
  it("true when top-level data_status is announced", () => {
    expect(isAnnounced({ data_status: "announced" })).toBe(true);
  });

  it("false when top-level data_status is confirmed", () => {
    expect(isAnnounced({ data_status: "confirmed" })).toBe(false);
  });

  it("falls back to impact.data_status when top-level is absent", () => {
    expect(isAnnounced({ impact: { data_status: "announced" } })).toBe(true);
    expect(isAnnounced({ impact: { data_status: "confirmed" } })).toBe(false);
  });

  it("false when neither top-level nor impact status is set", () => {
    expect(isAnnounced({})).toBe(false);
  });
});

describe("constructionStatus", () => {
  it("reads top-level construction_status", () => {
    expect(constructionStatus({ construction_status: "planned" })).toBe("planned");
  });

  it("falls back to impact.construction_status when top-level is absent", () => {
    expect(constructionStatus({ impact: { construction_status: "under_construction" } })).toBe("under_construction");
  });

  it("defaults to operational when neither is set", () => {
    expect(constructionStatus({})).toBe("operational");
  });
});

describe("isPlanned / isUnderConstruction", () => {
  it("isPlanned true only for planned status", () => {
    expect(isPlanned({ construction_status: "planned" })).toBe(true);
    expect(isPlanned({ construction_status: "under_construction" })).toBe(false);
    expect(isPlanned({})).toBe(false);
  });

  it("isUnderConstruction true only for under_construction status", () => {
    expect(isUnderConstruction({ construction_status: "under_construction" })).toBe(true);
    expect(isUnderConstruction({ construction_status: "planned" })).toBe(false);
    expect(isUnderConstruction({})).toBe(false);
  });
});

describe("isNonOperational", () => {
  it("true for planned regardless of power_mw", () => {
    expect(isNonOperational({ construction_status: "planned" })).toBe(true);
    expect(isNonOperational({ construction_status: "planned", power_mw: 100 })).toBe(true);
  });

  it("true for under_construction with no confirmed power_mw", () => {
    expect(isNonOperational({ construction_status: "under_construction" })).toBe(true);
    expect(isNonOperational({ construction_status: "under_construction", power_mw: 0 })).toBe(true);
  });

  it("false for under_construction with a confirmed power_mw", () => {
    expect(isNonOperational({ construction_status: "under_construction", power_mw: 150 })).toBe(false);
  });

  it("false for operational (default) facilities", () => {
    expect(isNonOperational({})).toBe(false);
    expect(isNonOperational({ construction_status: "operational" })).toBe(false);
  });
});
