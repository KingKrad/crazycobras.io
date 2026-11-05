import { ROOM_TYPES, STYLES, MAX_STYLES } from "./options.js";
import { validatePayload, checkJpeg } from "./validate.js";
import { buildImagePrompt, generateImage, generateList, shapeList } from "./ai.js";
import { verifyTurnstile } from "./turnstile.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

async function handleGenerate(request, env) {
  if (!env.TURNSTILE_SECRET) return json({ error: "The app isn't set up yet." }, 503);

  const len = Number(request.headers.get("content-length"));
  if (!request.headers.has("content-length") || !Number.isFinite(len) || len > 600000) {
    return json({ error: "Photos are too large." }, 413);
  }
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) {
    return json({ error: "Unsupported request." }, 415);
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const { success } = await env.GEN_LIMITER.limit({ key: ip });
  if (!success) return json({ error: "Too many designs at once — wait a minute and try again." }, 429);

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  const turnstileToken = form.get("turnstile");
  if (!(await verifyTurnstile(env.TURNSTILE_SECRET, typeof turnstileToken === "string" ? turnstileToken : "", ip))) {
    return json({ error: "Verification failed. Refresh the page and try again." }, 403);
  }

  const rawPayload = form.get("payload");
  let payload;
  try {
    if (typeof rawPayload !== "string" || rawPayload.length > 4000) throw new Error("payload");
    payload = JSON.parse(rawPayload);
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  const roomFile = form.get("room_photo");
  const inspoFile = form.get("inspo_photo");
  const room = roomFile instanceof Blob ? roomFile : null;
  const inspo = inspoFile instanceof Blob ? inspoFile : null;
  if ((roomFile !== null && !room) || (inspoFile !== null && !inspo) ||
      (room && !(await checkJpeg(room))) || (inspo && !(await checkJpeg(inspo)))) {
    return json({ error: "Photos must be JPEG under 200 KB." }, 400);
  }

  const v = validatePayload(payload, !!inspo);
  if (!v.ok) return json({ error: v.error }, 400);

  const styleNames = v.value.styles.map((id) => STYLES.find((s) => s.id === id).name);
  const prompt = buildImagePrompt(v.value, { hasRoom: !!room, hasInspo: !!inspo });

  const [img, list] = await Promise.allSettled([
    generateImage(env, prompt, room, inspo),
    generateList(env, v.value, styleNames),
  ]);

  if (img.status === "rejected") {
    const msg = String(img.reason?.message ?? img.reason);
    console.error("image generation failed:", msg);
    if (/4006|allocation|quota/i.test(msg)) {
      return json({ error: "We've hit today's free design limit. It resets at midnight UTC — try again later." }, 429);
    }
    return json({ error: "The AI couldn't make that design. Try again or change your description." }, 502);
  }
  if (list.status === "rejected") {
    console.error("list generation failed:", String(list.reason?.message ?? list.reason));
  }

  return json({ image: img.value, list: list.status === "fulfilled" ? (shapeList(list.value) ?? null) : null });
}

export default {
  async fetch(request, env) {
    try {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith("/api/")) {
        return env.ASSETS ? env.ASSETS.fetch(request) : json({ error: "Not found" }, 404);
      }
      if (pathname === "/api/options") {
        if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
        return json({ roomTypes: ROOM_TYPES, styles: STYLES, maxStyles: MAX_STYLES, turnstileSiteKey: env.TURNSTILE_SITE_KEY });
      }
      if (pathname === "/api/generate") {
        if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
        return await handleGenerate(request, env);
      }
      return json({ error: "Not found" }, 404);
    } catch (e) {
      console.error("unhandled:", String(e?.message ?? e));
      return json({ error: "Something went wrong." }, 500);
    }
  },
};
