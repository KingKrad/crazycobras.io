import { handleCheckout, handleVerify, handleMe } from "./vroomillion.js";
import { handleCheck } from "./check.js";
import { handleAdmin, handleRaceStart } from "./admin.js";
import { handleSeen } from "./seen.js";
import { handleDailyScore, handleDailyBoard, handleNickname } from "./daily.js";
import { handleDeviceSave } from "./device.js";
import { handleProgress } from "./progress.js";
import { handleRoundStats, handleReport } from "./stats.js";
import { handleOnline } from "./online.js";
import { handleSignup, handleLogin, handleLogout, handleDeleteAccount, handleResetPassword, handleNewRecoveryCode, handleConfig, json } from "./accounts.js";

// API routes for VROOMILLION. Everything else is a static file from public/.
const ROUTES = {
  "/api/vroomillion/check": handleCheck,
  "/api/vroomillion/config": handleConfig,
  "/api/vroomillion/race-start": handleRaceStart,
  "/api/vroomillion/admin": handleAdmin,
  "/api/vroomillion/checkout": handleCheckout,
  "/api/vroomillion/verify": handleVerify,
  "/api/vroomillion/me": handleMe,
  "/api/vroomillion/seen": handleSeen,
  "/api/vroomillion/daily": handleDailyScore,
  "/api/vroomillion/daily-board": handleDailyBoard,
  "/api/vroomillion/nickname": handleNickname,
  "/api/vroomillion/device-save": handleDeviceSave,
  "/api/vroomillion/progress": handleProgress,
  "/api/vroomillion/round-stats": handleRoundStats,
  "/api/vroomillion/report": handleReport,
  "/api/vroomillion/online": handleOnline,
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
