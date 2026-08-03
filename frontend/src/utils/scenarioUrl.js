// Encodes/decodes the active policy scenario into URL query params so a
// scenario can be shared via link, independent of React state. Two shapes:
//   - preset:  ?scenario=<presetId>
//   - custom:  ?scenario=custom&renewable_pct=80&pue=1.1&...
// Only the override keys POST /api/scenario accepts are ever read/written.
const NUMERIC_OVERRIDE_KEYS = [
  "renewable_pct",
  "carbon_intensity_gco2_per_kwh",
  "water_liters_per_kwh",
  "pue",
];
const BOOLEAN_OVERRIDE_KEYS = ["cost_allocation_reform", "tax_incentive_rollback"];
const OVERRIDE_KEYS = [...NUMERIC_OVERRIDE_KEYS, ...BOOLEAN_OVERRIDE_KEYS];

export function encodeScenarioParams(presetId, scenario) {
  const params = new URLSearchParams();
  if (presetId) {
    params.set("scenario", presetId);
    return params;
  }

  const entries = OVERRIDE_KEYS.filter((key) => scenario?.[key] != null);
  if (entries.length === 0) return params;

  params.set("scenario", "custom");
  for (const key of entries) {
    params.set(key, String(scenario[key]));
  }
  return params;
}

// Returns null when no valid scenario is encoded (missing/malformed params),
// so callers can fall back to the baseline view rather than throwing on a
// hand-edited or stale URL.
export function decodeScenarioParams(searchParams) {
  const scenarioParam = searchParams.get("scenario");
  if (!scenarioParam) return null;

  if (scenarioParam === "custom") {
    const scenario = {};
    for (const key of NUMERIC_OVERRIDE_KEYS) {
      const raw = searchParams.get(key);
      if (raw == null) continue;
      const value = Number(raw);
      if (Number.isNaN(value)) continue;
      scenario[key] = value;
    }
    for (const key of BOOLEAN_OVERRIDE_KEYS) {
      const raw = searchParams.get(key);
      if (raw == null) continue;
      scenario[key] = raw === "true";
    }
    if (Object.keys(scenario).length === 0) return null;
    return { presetId: null, scenario };
  }

  return { presetId: scenarioParam, scenario: null };
}
