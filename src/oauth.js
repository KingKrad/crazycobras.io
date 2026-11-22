// "Continue with Google" and "Continue with Apple". Standard OpenID Connect code flow:
//   GET  /api/vroomillion/oauth-google      -> to Google's sign-in page
//   GET  /api/vroomillion/oauth-google-cb   <- Google sends the player back with a code
//   GET  /api/vroomillion/oauth-apple       -> to Apple's sign-in page
//   POST /api/vroomillion/oauth-apple-cb    <- Apple posts the code back (form_post)
// The code is swapped for an ID token directly with Google or Apple (server to server, over TLS), so the
// token's email is trusted. The account is found by the provider's user ID, then by email (an existing
// password account with the same verified email is the same player), or made new. Then the normal
// session cookie is set and the player lands back in the game.
// Settings: GOOGLE_CLIENT_ID (variable) + GOOGLE_CLIENT_SECRET (secret); APPLE_CLIENT_ID (the Services ID),
// APPLE_TEAM_ID, APPLE_KEY_ID (variables) + APPLE_PRIVATE_KEY (secret: the .p8 key's text).
// A provider without its settings is switched off and its button doesn't show.
import { ensureSchema, clientIp, underLimit, startSession, normalizeEmail } from "./accounts.js";

const STATE_COOKIE = "vroom_oauth";
const HOME = (env) => String(env.SITE_URL || "https://vroomillion.com").replace(/\/$/, "");
const callbackUrl = (env, p) => `${HOME(env)}/api/vroomillion/oauth-${p}-cb`;

const PROVIDERS = {
  google: {
    on: (env) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    issuers: ["https://accounts.google.com", "accounts.google.com"],
    clientId: (env) => env.GOOGLE_CLIENT_ID,
    secret: async (env) => env.GOOGLE_CLIENT_SECRET,
    params: { scope: "openid email", prompt: "select_account" },
  },
  apple: {
    on: (env) => !!(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY),
    authorize: "https://appleid.apple.com/auth/authorize",
    token: "https://appleid.apple.com/auth/token",
    issuers: ["https://appleid.apple.com"],
    clientId: (env) => env.APPLE_CLIENT_ID,
    secret: appleClientSecret,
    params: { scope: "email", response_mode: "form_post" },
  },
};
export const oauthProviders = (env) => ({ google: PROVIDERS.google.on(env), apple: PROVIDERS.apple.on(env) });

const rand = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlText = (text) => b64url(new TextEncoder().encode(text));
const fromB64url = (s) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
const same = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length && [...a].reduce((d, c, i) => d | (c.charCodeAt(0) ^ b.charCodeAt(i)), 0) === 0;

// back to the game, with a message for the log-in screen when something went wrong
const back = (env, error, cookies = []) => {
  const headers = new Headers({ location: `${HOME(env)}/vroomillion/${error ? "#signin-error=" + encodeURIComponent(error) : "#signed-in"}`, "cache-control": "no-store" });
  for (const c of [`${STATE_COOKIE}=; Path=/api/vroomillion; HttpOnly; Secure; SameSite=None; Max-Age=0`, ...cookies]) headers.append("set-cookie", c);
  return new Response(null, { status: 303, headers });
};

// Apple's client secret is a short-lived JWT signed with the team's private key (ES256)
async function appleClientSecret(env) {
  const pem = String(env.APPLE_PRIVATE_KEY).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlText(JSON.stringify({ alg: "ES256", kid: env.APPLE_KEY_ID }));
  const body = b64urlText(JSON.stringify({ iss: env.APPLE_TEAM_ID, iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: env.APPLE_CLIENT_ID }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64url(sig)}`;
}

export async function handleOAuthStart(request, env, name) {
  const p = PROVIDERS[name];
  if (request.method !== "GET") return new Response("Method not allowed.", { status: 405 });
  if (!p.on(env) || !env.DB) return back(env, "That sign-in isn't set up yet.");
  if (!(await underLimit(env, "oauth-ip", clientIp(request, env), 20, 600))) return back(env, "Too many tries. Wait a few minutes.");
  const state = rand(), nonce = rand();
  const url = new URL(p.authorize);
  for (const [k, v] of Object.entries({ client_id: p.clientId(env), redirect_uri: callbackUrl(env, name), response_type: "code", state, nonce, ...p.params })) url.searchParams.set(k, v);
  // SameSite=None: Apple sends the player back with a cross-site POST, which wouldn't carry a Lax cookie
  return new Response(null, { status: 302, headers: {
    location: url.toString(), "cache-control": "no-store",
    "set-cookie": `${STATE_COOKIE}=${state}.${nonce}; Path=/api/vroomillion; HttpOnly; Secure; SameSite=None; Max-Age=600`,
  } });
}

export async function handleOAuthCallback(request, env, name) {
  const p = PROVIDERS[name];
  if (!p.on(env) || !env.DB) return back(env, "That sign-in isn't set up yet.");
  let params;
  if (request.method === "POST") {
    const text = (await request.text()).slice(0, 20000);
    params = new URLSearchParams(text);
  } else if (request.method === "GET") params = new URL(request.url).searchParams;
  else return new Response("Method not allowed.", { status: 405 });
  if (params.get("error")) return back(env, params.get("error") === "user_cancelled_authorize" || params.get("error") === "access_denied" ? "Sign-in cancelled." : "Sign-in didn't work. Try again.");
  const jar = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([a-f0-9]+)\\.([a-f0-9]+)`));
  const code = params.get("code");
  if (!jar || !code || !same(params.get("state") || "", jar[1])) return back(env, "Sign-in took too long or came from somewhere else. Try again.");
  if (!(await underLimit(env, "oauth-ip", clientIp(request, env), 20, 600))) return back(env, "Too many tries. Wait a few minutes.");

  let claims;
  try {
    const res = await fetch(p.token, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUrl(env, name), client_id: p.clientId(env), client_secret: await p.secret(env) }),
    });
    const tok = await res.json();
    if (!res.ok || typeof tok.id_token !== "string") throw new Error("no token");
    claims = JSON.parse(fromB64url(tok.id_token.split(".")[1]));
  } catch {
    return back(env, "Sign-in didn't work. Try again.");
  }
  const verified = claims.email_verified === true || claims.email_verified === "true";
  const email = normalizeEmail(claims.email);
  if (!p.issuers.includes(claims.iss) || claims.aud !== p.clientId(env) || !(claims.exp * 1000 > Date.now()) || !same(String(claims.nonce || ""), jar[2]) || !claims.sub) {
    return back(env, "Sign-in didn't work. Try again.");
  }
  if (!email || !verified) return back(env, `Your ${name === "google" ? "Google" : "Apple"} account needs a verified email.`);

  await ensureSchema(env.DB);
  const col = name === "google" ? "google_sub" : "apple_sub";
  const sub = String(claims.sub).slice(0, 200);
  let user = await env.DB.prepare(`SELECT id, email FROM users WHERE ${col} = ?`).bind(sub).first();
  if (!user) {
    user = await env.DB.prepare("SELECT id, email FROM users WHERE email = ?").bind(email).first();
    if (user) await env.DB.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).bind(sub, user.id).run();
  }
  if (!user) {
    const id = crypto.randomUUID();
    // no password: this account signs in with Google or Apple (pw_iter 0 marks it)
    await env.DB.prepare(`INSERT INTO users (id, email, pw_hash, pw_salt, pw_iter, ${col}, created_at) VALUES (?, ?, '', '', 0, ?, ?)`)
      .bind(id, email, sub, Date.now()).run();
    user = { id };
  }
  return back(env, null, [await startSession(env, user.id)]);
}
