export function fmt(n, unit = "", decimals = null) {
  if (n == null || n === "") return "—";
  const opts = decimals == null ? {} : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  return n.toLocaleString(undefined, opts) + (unit ? " " + unit : "");
}
