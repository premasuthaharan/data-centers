// Case-insensitive substring match against a facility's name or operator.
// Shared by CompareModal's facility picker and FacilitySearchPanel so the
// two "find a facility by typing" affordances behave identically.
export function searchFacilities(datacenters, query) {
  const q = query.trim().toLowerCase();
  if (!q) return datacenters;
  return datacenters.filter(
    (dc) => dc.name.toLowerCase().includes(q) || (dc.operator ?? "").toLowerCase().includes(q)
  );
}
