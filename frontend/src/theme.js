// A stored preference always wins; otherwise fall back to the OS setting.
// Mirrors the inline blocking script in index.html (which sets data-theme
// on <html> before paint to avoid a flash) — read that back first since
// it's already resolved this exact logic, and only recompute it here if
// it's missing (e.g. in tests, which don't execute index.html).
export function resolveInitialTheme() {
  const fromDom = document.documentElement.getAttribute("data-theme");
  if (fromDom === "dark" || fromDom === "light") return fromDom;

  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
