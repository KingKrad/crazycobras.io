// Sets the CHRISTMAS LOOK before the first paint, so there's no flash of the normal colours.
// A file rather than an inline <script>: the site's Content-Security-Policy only runs scripts from files.
// The same check as theme.js xmasLookOn(); keep the two in step.
(() => {
  let p = "auto";
  try { p = localStorage.getItem("vroom.season") || "auto"; } catch {}
  const n = new Date(), m = n.getMonth(), d = n.getDate();
  const season = m === 11 || (m === 0 && d <= 1) || n.getTime() < Date.parse("2027-01-02T10:00:00Z");
  if (p === "on" || (p === "auto" && season)) document.documentElement.dataset.season = "xmas";
})();
