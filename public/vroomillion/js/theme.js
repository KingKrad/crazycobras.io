// The CHRISTMAS LOOK: the whole game dressed for Christmas (xmas-theme.css on html[data-season="xmas"],
// style.css on body.xmas, place signs in places.js, snow on the road in chase.js). Players can switch it
// off or on from the ACCOUNT screen; "auto" follows the season. js/season-boot.js runs the same check
// before the first paint, so keep the two in step.
const SEASON_KEY = "vroom.season";
// this year's CHRISTMAS event started before December; the look runs with it until the event ends
const EVENT_END = Date.parse("2027-01-02T10:00:00Z"); // main.js THEMED.xmas.ends

export function xmasSeason(now = new Date()) {
  const m = now.getMonth(), d = now.getDate();
  return m === 11 || (m === 0 && d <= 1) || now.getTime() < EVENT_END;
}

export function seasonPref() {
  try { return localStorage.getItem(SEASON_KEY) || "auto"; } catch { return "auto"; }
}

export function xmasLookOn() {
  const p = seasonPref();
  return p === "on" || (p === "auto" && xmasSeason());
}

export function applySeason() {
  const root = document.documentElement;
  const on = xmasLookOn();
  if (on) root.dataset.season = "xmas";
  else delete root.dataset.season;
  document.body?.classList.toggle("xmas", on); // the look that shipped first (style.css body.xmas, places.js)
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", on ? "#06160d" : "#12082e");
}

export function toggleXmasLook() {
  try { localStorage.setItem(SEASON_KEY, xmasLookOn() ? "off" : "on"); } catch {}
  applySeason();
  window.dispatchEvent(new CustomEvent("seasonchange"));
}

export function xmasLookLabel() {
  return xmasLookOn() ? "CHRISTMAS LOOK: ON" : "CHRISTMAS LOOK: OFF";
}
