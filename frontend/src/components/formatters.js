export function fmt(n, unit = "", decimals = null) {
  if (n == null || n === "") return "—";
  const opts = decimals == null ? {} : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return n.toLocaleString(undefined, opts) + (unit ? " " + unit : "");
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Formats a "YYYY-MM" build_date string as "Month YYYY". Returns null for
// missing/malformed input so callers can conditionally render.
export function formatBuildDate(buildDate) {
  if (!buildDate) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(buildDate);
  if (!match) return null;
  const [, year, month] = match;
  const monthName = MONTH_NAMES[Number(month) - 1];
  if (!monthName) return null;
  return `${monthName} ${year}`;
}
