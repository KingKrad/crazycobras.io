import { handleCheckout, handleVerify, handleMe } from "./vroomillion.js";
import { handleSignup, handleLogin, handleLogout, handleDeleteAccount, handleResetPassword, handleNewRecoveryCode, json } from "./accounts.js";

// API routes for VROOMILLION. Everything else is a static file from public/.
const ROUTES = {
  "/api/vroomillion/checkout": handleCheckout,
  "/api/vroomillion/verify": handleVerify,
  "/api/vroomillion/me": handleMe,
  "/api/vroomillion/signup": handleSignup,
  "/api/vroomillion/login": handleLogin,
  "/api/vroomillion/logout": handleLogout,
  "/api/vroomillion/delete-account": handleDeleteAccount,
  "/api/vroomillion/reset-password": handleResetPassword,
  "/api/vroomillion/recovery-code": handleNewRecoveryCode,
};

export default {
  async fetch(request, env) {
    try {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith("/api/")) {
        return env.ASSETS ? env.ASSETS.fetch(request) : json({ error: "Not found" }, 404);
      }
      const handler = ROUTES[pathname];
      return handler ? await handler(request, env) : json({ error: "Not found" }, 404);
    } catch (e) {
      console.error("unhandled:", String(e?.message ?? e));
      return json({ error: "Something went wrong." }, 500);
    }
  },
};
