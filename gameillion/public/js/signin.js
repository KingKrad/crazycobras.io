import { initPage, el } from './common.js';
import { api, getMe, syncNow } from './store.js';
import { sfx, celebrate } from './fx.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  const me = await initPage();
  const token = new URLSearchParams(location.search).get('token');
  if (token) {
    $('form').hidden = true;
    $('confirm').hidden = false;
    $('confirmBtn').addEventListener('click', async () => {
      $('confirmBtn').disabled = true;
      const r = await api('/api/auth/verify', { method: 'POST', body: { token } });
      if (r.ok) {
        history.replaceState(null, '', '/signin.html');
        await getMe(true);
        await syncNow();
        sfx.win(1); celebrate(1);
        $('confirm').replaceChildren(el('h2', { text: 'You’re in! \u{1F389}' }), el('p', { text: `Signed in as ${r.data.email}. Your progress is synced.` }), el('a', { class: 'btn big', href: '/path.html', text: 'Go to the course' }));
      } else {
        $('confirmBtn').disabled = false;
        $('confirmMsg').textContent = r.data.error || 'That didn’t work.';
      }
    });
    return;
  }
  if (me.signedIn) {
    $('form').hidden = true;
    $('already').hidden = false;
    $('who').textContent = me.email;
    $('logout').addEventListener('click', async () => { await api('/api/auth/logout', { method: 'POST' }); location.reload(); });
    return;
  }
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('email').value.trim();
    $('send').disabled = true;
    const r = await api('/api/auth/request', { method: 'POST', body: { email } });
    $('send').disabled = false;
    if (!r.ok) { $('msg').textContent = r.data.error || 'Something went wrong.'; return; }
    $('msg').textContent = `Check ${email} for your sign-in link. It works once and expires in 20 minutes.`;
    if (r.data.devLink) $('msg').append(' ', el('a', { href: r.data.devLink, text: '(local dev link)' }));
  });
}
boot();
