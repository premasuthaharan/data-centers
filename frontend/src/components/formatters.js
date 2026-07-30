export function fmt(n, unit = "") {
  if (n == null || n === "") return "—";
  return n.toLocaleString() + (unit ? " " + unit : "");
}
