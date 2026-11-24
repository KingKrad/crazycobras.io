// D1-backed repository. The app only talks to this interface, so tests can swap in a fake.

export function d1Repo(db) {
  return {
    async createLoginToken(hash, email, expiresAt) {
      await db.prepare('INSERT INTO login_tokens (hash, email, expires_at) VALUES (?, ?, ?)').bind(hash, email, expiresAt).run();
    },
    async consumeLoginToken(hash, now) {
      const row = await db.prepare('DELETE FROM login_tokens WHERE hash = ? RETURNING email, expires_at').bind(hash).first();
      if (!row || row.expires_at < now) return null;
      return row.email;
    },
    async upsertUser(email, now) {
      await db.prepare('INSERT INTO users (email, created_at) VALUES (?, ?) ON CONFLICT(email) DO NOTHING').bind(email, now).run();
      return db.prepare('SELECT id, email FROM users WHERE email = ?').bind(email).first();
    },
    async createSession(hash, userId, expiresAt) {
      await db.prepare('INSERT INTO sessions (hash, user_id, expires_at) VALUES (?, ?, ?)').bind(hash, userId, expiresAt).run();
    },
    async getSessionUser(hash, now) {
      const row = await db
        .prepare(
          `SELECT u.id, u.email,
             EXISTS(SELECT 1 FROM purchases p WHERE p.email = u.email) AS paid
           FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.hash = ? AND s.expires_at > ?`
        )
        .bind(hash, now)
        .first();
      return row ? { id: row.id, email: row.email, paid: !!row.paid } : null;
    },
    async deleteSession(hash) {
      await db.prepare('DELETE FROM sessions WHERE hash = ?').bind(hash).run();
    },
    async getProgress(userId) {
      const row = await db.prepare('SELECT data FROM progress WHERE user_id = ?').bind(userId).first();
      if (!row) return null;
      try { return JSON.parse(row.data); } catch { return null; }
    },
    async saveProgress(userId, data, now) {
      await db
        .prepare('INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at')
        .bind(userId, JSON.stringify(data), now)
        .run();
    },
    async recordPurchase({ stripeSessionId, email, amount, currency, now }) {
      await db
        .prepare('INSERT INTO purchases (stripe_session_id, email, amount, currency, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(stripe_session_id) DO NOTHING')
        .bind(stripeSessionId, email, amount, currency, now)
        .run();
    },
    /** Marks a purchase as used for auto sign-in. Returns true only the first time. */
    async claimPurchase(stripeSessionId) {
      const r = await db.prepare('UPDATE purchases SET claimed = 1 WHERE stripe_session_id = ? AND claimed = 0').bind(stripeSessionId).run();
      return (r.meta?.changes || 0) > 0;
    },
    async listShowcase(status, limit = 60) {
      const r = await db
        .prepare('SELECT s.id, s.title, s.blurb, s.url, s.status, s.created_at, u.email FROM showcase s JOIN users u ON u.id = s.user_id WHERE s.status = ? ORDER BY s.created_at DESC LIMIT ?')
        .bind(status, limit)
        .all();
      return r.results || [];
    },
    async countPending(userId) {
      const row = await db.prepare("SELECT COUNT(*) AS n FROM showcase WHERE user_id = ? AND status = 'pending'").bind(userId).first();
      return row ? row.n : 0;
    },
    async addShowcase(userId, { title, blurb, url }, now) {
      await db.prepare('INSERT INTO showcase (user_id, title, blurb, url, created_at) VALUES (?, ?, ?, ?, ?)').bind(userId, title, blurb, url, now).run();
    },
    async setShowcaseStatus(id, status) {
      const r = await db.prepare('UPDATE showcase SET status = ? WHERE id = ?').bind(status, id).run();
      return (r.meta?.changes || 0) > 0;
    },
  };
}
