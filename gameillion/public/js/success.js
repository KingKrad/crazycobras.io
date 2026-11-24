import { initPage, el } from './common.js';
import { api, getMe, syncNow } from './store.js';
import { celebrate, sfx } from './fx.js';

async function boot() {
  await initPage();
  const sid = new URLSearchParams(location.search).get('session_id') || '';
  const box = document.getElementById('result');
  const r = await api('/api/checkout/claim', { method: 'POST', body: { sessionId: sid } });
  if (r.ok && r.data.paid) {
    await getMe(true);
    if (r.data.signedIn) await syncNow();
    document.getElementById('title').textContent = 'The whole galaxy is yours! \u{1F31F}';
    box.replaceChildren(
      el('p', { text: r.data.signedIn ? `You’re signed in as ${r.data.email}. All 12 lessons are unlocked on any device you sign in to.` : `Payment confirmed for ${r.data.email}. Sign in with that email to unlock everything.` }),
      el('div', { class: 'row', style: 'justify-content:center' },
        el('a', { class: 'btn big', href: r.data.signedIn ? '/path.html' : '/signin.html', text: r.data.signedIn ? 'Start Unit 2 →' : 'Sign in' })));
    setTimeout(() => { sfx.win(3); celebrate(3); }, 250);
  } else {
    document.getElementById('title').textContent = 'Almost there…';
    box.replaceChildren(el('p', { text: r.data?.error || 'We couldn’t confirm the payment yet. If you were charged, sign in with the email you used at checkout — it may take a minute.' }), el('a', { class: 'btn', href: '/signin.html', text: 'Sign in' }));
  }
}
boot();
