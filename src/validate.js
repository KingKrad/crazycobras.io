import { ROOM_TYPES, STYLES, MAX_STYLES } from "./options.js";

const BLOCKLIST = /\b(nude|naked|nsfw|sex|porn|gore|blood|weapon|gun|swastika)\b/;

const round1 = (n) => Math.round(n * 10) / 10;
const isNum = (n) => typeof n === "number" && Number.isFinite(n);
const inRange = (n, lo, hi) => isNum(n) && n >= lo && n <= hi;

export function validatePayload(obj, hasInspo = false) {
  if (!obj || typeof obj !== "object") return { ok: false, error: "Invalid request." };

  if (typeof obj.roomType !== "string" || !ROOM_TYPES.includes(obj.roomType)) {
    return { ok: false, error: "Pick a room type." };
  }
  if (!inRange(obj.lengthFt, 3, 100)) return { ok: false, error: "Length must be between 3 and 100 ft." };
  if (!inRange(obj.widthFt, 3, 100)) return { ok: false, error: "Width must be between 3 and 100 ft." };
  if (!inRange(obj.heightFt, 6, 30)) return { ok: false, error: "Ceiling height must be between 6 and 30 ft." };
  if (!Number.isInteger(obj.budgetUSD) || obj.budgetUSD < 100 || obj.budgetUSD > 200000) {
    return { ok: false, error: "Budget must be a whole number between $100 and $200,000." };
  }

  if (!Array.isArray(obj.styles) || obj.styles.length > MAX_STYLES) {
    return { ok: false, error: `Pick up to ${MAX_STYLES} styles.` };
  }
  const ids = new Set(STYLES.map((s) => s.id));
  if (!obj.styles.every((s) => typeof s === "string" && ids.has(s)) || new Set(obj.styles).size !== obj.styles.length) {
    return { ok: false, error: "Unknown style." };
  }
  if (obj.styles.length === 0 && !hasInspo) {
    return { ok: false, error: "Pick at least one style or upload an inspiration photo." };
  }

  if (typeof obj.prompt !== "string") return { ok: false, error: "Description must be text." };
  const prompt = obj.prompt.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
  if (prompt.length > 500) return { ok: false, error: "Description must be 500 characters or fewer." };
  if (BLOCKLIST.test(prompt.toLowerCase())) return { ok: false, error: "Please keep descriptions about the room." };

  return {
    ok: true,
    value: {
      roomType: obj.roomType,
      lengthFt: round1(obj.lengthFt),
      widthFt: round1(obj.widthFt),
      heightFt: round1(obj.heightFt),
      budgetUSD: obj.budgetUSD,
      styles: [...obj.styles],
      prompt,
    },
  };
}

export async function checkJpeg(file) {
  if (!file || typeof file.slice !== "function" || typeof file.size !== "number") return false;
  if (file.size <= 0 || file.size > 200_000) return false;
  const b = new Uint8Array(await file.slice(0, 3).arrayBuffer());
  return b.length === 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}
