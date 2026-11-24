// Worker entry: wires real services (D1, Stripe, Resend email) into the API.
import { handleApi } from './app.js';
import { d1Repo } from './db.js';

function stripeClient(secretKey) {
  if (!secretKey) return null;
  return async (method, path, params) => {
    const init = {
      method,
      headers: { authorization: `Bearer ${secretKey}` },
    };
    if (params) {
      init.headers['content-type'] = 'application/x-www-form-urlencoded';
      init.body = new URLSearchParams(params).toString();
    }
    const res = await fetch('https://api.stripe.com' + path, init);
    if (!res.ok) {
      console.error('stripe error', res.status);
      return null;
    }
    return res.json();
  };
}

function emailSender(env) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return null;
  return async ({ to, subject, text }) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok) console.error('email error', res.status);
    return res.ok;
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await handleApi(request, env, {
        repo: d1Repo(env.DB),
        now: () => Date.now(),
        stripe: stripeClient(env.STRIPE_SECRET_KEY),
        sendEmail: emailSender(env),
      });
    } catch (e) {
      console.error('api error', e && e.message);
      return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  },
};
