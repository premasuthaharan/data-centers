import { describe, it, expect } from "vitest";
import { searchFacilities } from "../facilitySearch";

const DATACENTERS = [
  { id: "dc-a", name: "Colossus 2", operator: "SpaceXAI" },
  { id: "dc-b", name: "Meta Prometheus", operator: "Meta" },
  { id: "dc-c", name: "AWS Villanueva de Gállego", operator: "Amazon Web Services" },
  { id: "dc-d", name: "No Operator Site", operator: null },
];

describe("searchFacilities", () => {
  it("returns every facility for an empty or whitespace-only query", () => {
    expect(searchFacilities(DATACENTERS, "")).toEqual(DATACENTERS);
    expect(searchFacilities(DATACENTERS, "   ")).toEqual(DATACENTERS);
  });

  it("matches by name substring, case-insensitively", () => {
    expect(searchFacilities(DATACENTERS, "prometheus")).toEqual([DATACENTERS[1]]);
    expect(searchFacilities(DATACENTERS, "PROMETHEUS")).toEqual([DATACENTERS[1]]);
    expect(searchFacilities(DATACENTERS, "colossus")).toEqual([DATACENTERS[0]]);
  });

  it("matches by operator substring, case-insensitively", () => {
    expect(searchFacilities(DATACENTERS, "spacexai")).toEqual([DATACENTERS[0]]);
    expect(searchFacilities(DATACENTERS, "amazon")).toEqual([DATACENTERS[2]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchFacilities(DATACENTERS, "nonexistent")).toEqual([]);
  });

  it("does not throw on a facility with a null/missing operator", () => {
    expect(searchFacilities(DATACENTERS, "no operator")).toEqual([DATACENTERS[3]]);
  });

  it("matches a substring appearing anywhere in the name, not just a prefix", () => {
    expect(searchFacilities(DATACENTERS, "gállego")).toEqual([DATACENTERS[2]]);
  });
});
