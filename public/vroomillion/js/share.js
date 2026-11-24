// Passport share card: a 1080x1350 picture (the shape TikTok and Instagram posts use) of a stamped
// destination, with the distance and stamp count, to share or save. Made on the device; nothing is uploaded.
import { ChaseScene } from "./chase.js";

const W = 1080, H = 1350;
const SITE = "vroomillion.com";
const FONT = '"Bungee", "Space Grotesk", sans-serif';

// Long names over two lines, so the big text never runs off the card.
function lines(g, text, max) {
  const words = text.split(" ");
  const out = [""];
  for (const w of words) {
    const tryLine = (out[out.length - 1] + " " + w).trim();
    if (g.measureText(tryLine).width <= max || !out[out.length - 1]) out[out.length - 1] = tryLine;
    else out.push(w);
  }
  return out;
}

function fitFont(g, text, size, max) {
  for (let s = size; s > 18; s -= 4) {
    g.font = `${s}px ${FONT}`;
    if (lines(g, text, max).length <= 2) return s;
  }
  return 18;
}

// dest: a DESTINATIONS entry; best: metres; stamps: [got, total]
export async function drawShareCard(dest, best, stamps) {
  try { await document.fonts.load(`40px ${FONT}`); } catch { /* falls back to monospace */ }
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const gold = dest.exclusive;
  // background
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, gold ? "#3a2600" : "#140a2e");
  bg.addColorStop(1, gold ? "#120900" : "#05030f");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // the destination, drawn by the game's own scene and scaled up crisp
  const art = document.createElement("canvas");
  art.width = 320; art.height = 180;
  try { const sc = new ChaseScene(art); sc.resize(320, 180, 168); sc.preview(dest.id); } catch { /* art is decoration */ }
  const ax = 80, ay = 236, aw = W - 160, ah = Math.round((W - 160) * 9 / 16);
  g.imageSmoothingEnabled = false;
  g.fillStyle = gold ? "#ffd23f" : "#ff2e88";
  g.fillRect(ax - 12, ay - 12, aw + 24, ah + 24);
  g.fillStyle = "#000";
  g.fillRect(ax - 4, ay - 4, aw + 8, ah + 8);
  g.drawImage(art, ax, ay, aw, ah);
  // scanlines over the art, like the game
  g.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = ay; y < ay + ah; y += 6) g.fillRect(ax, y, aw, 2);
  // header
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillStyle = "#ffd23f";
  g.font = `64px ${FONT}`;
  g.fillText("VROOMILLION", W / 2, 130);
  g.fillStyle = "#7df9ff";
  g.font = `26px ${FONT}`;
  g.fillText(gold ? "EXCLUSIVE AREA UNLOCKED" : "NEW PASSPORT STAMP", W / 2, 190);
  // the stamp itself
  let y = ay + ah + 95;
  g.fillStyle = "#ffffff";
  g.font = `28px ${FONT}`;
  g.fillText("I DROVE ALL THE WAY TO", W / 2, y);
  const size = fitFont(g, dest.name, 64, W - 120);
  g.font = `${size}px ${FONT}`;
  g.fillStyle = gold ? "#ffd23f" : "#ff2e88";
  for (const line of lines(g, dest.name, W - 120)) {
    y += size + 30;
    g.fillStyle = "#000"; g.fillText(line, W / 2 + 6, y + 6);
    g.fillStyle = gold ? "#ffd23f" : "#ff2e88"; g.fillText(line, W / 2, y);
  }
  y += 80;
  g.fillStyle = "#ffffff";
  g.font = `40px ${FONT}`;
  g.fillText(`${Math.round(best).toLocaleString("en-US")} M`, W / 2, y);
  y += 56;
  g.fillStyle = "#9aa0c8";
  g.font = `22px ${FONT}`;
  g.fillText(`PASSPORT: ${stamps[0]} OF ${stamps[1]} STAMPS`, W / 2, y);
  // footer
  g.fillStyle = gold ? "#ffd23f" : "#ff2e88";
  g.fillRect(0, H - 120, W, 120);
  g.fillStyle = "#000";
  const foot = `CAN YOU BEAT ME? ${SITE.toUpperCase()}`;
  let fs = 28;
  do { g.font = `${fs}px ${FONT}`; fs -= 2; } while (g.measureText(foot).width > W - 80 && fs > 12);
  g.fillText(foot, W / 2, H - 48);
  return cv;
}

const toBlob = (cv) => new Promise((r) => cv.toBlob(r, "image/png"));

// Opens the phone's share sheet with the picture (TikTok, Instagram, Messages...) or, where a browser
// can't share files, saves the picture. Returns "shared", "saved" or "cancelled".
export async function shareCard(dest, best, stamps) {
  const cv = await drawShareCard(dest, best, stamps);
  const blob = await toBlob(cv);
  const name = `vroomillion-${dest.id}.png`;
  const file = new File([blob], name, { type: "image/png" });
  const text = `I drove ${Math.round(best).toLocaleString("en-US")} m to ${dest.name} in VROOMILLION! Can you beat me? https://${SITE}`;
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return "shared"; } catch (e) { if (e?.name === "AbortError") return "cancelled"; }
  }
  saveCard(blob, name);
  return "saved";
}

export async function saveShareCard(dest, best, stamps) {
  const blob = await toBlob(await drawShareCard(dest, best, stamps));
  saveCard(blob, `vroomillion-${dest.id}.png`);
}

function saveCard(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
