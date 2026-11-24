import { initPage, el } from './common.js';
import { api } from './store.js';
import { validateShowcaseEntry } from './rules.js';
import { celebrate, sfx } from './fx.js';

const $ = (id) => document.getElementById(id);

async function boot() {
  const me = await initPage();
  const r = await api('/api/showcase');
  const games = r.ok ? r.data.games : [];
  $('grid').replaceChildren(...(games.length ? games.map((g) => el('article', { class: 'card' },
    el('h2', { text: g.title }),
    g.blurb ? el('p', { class: 'muted', text: g.blurb }) : null,
    el('a', { class: 'btn teal small', href: g.url, target: '_blank', rel: 'noopener noreferrer nofollow ugc' }, 'Play ↗', el('span', { class: 'sr-only', text: ' (opens in a new tab)' }))))
    : [el('div', { class: 'card' }, el('h2', { text: 'The first games are on their way \u{1F680}' }), el('p', { class: 'muted', text: 'Finish the course and yours could be the first one here.' }))]));

  const box = $('submitBox');
  if (!me.signedIn) { box.replaceChildren(el('p', { text: 'Finished the course? Sign in to submit your game.' }), el('a', { class: 'btn', href: '/signin.html', text: 'Sign in' })); return; }
  if (!me.paid) { box.replaceChildren(el('p', { text: 'Submitting to the showcase is part of the full course.' }), el('a', { class: 'btn', href: '/unlock.html', text: 'Unlock the course' })); return; }
  $('form').hidden = false;
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const entry = { title: $('title').value, url: $('url').value, blurb: $('blurb').value };
    const v = validateShowcaseEntry(entry);
    if (!v.ok) { $('msg').textContent = v.error; sfx.bad(); return; }
    const res = await api('/api/showcase', { method: 'POST', body: v.value });
    if (!res.ok) { $('msg').textContent = res.data.error || 'Something went wrong.'; sfx.bad(); return; }
    $('form').reset();
    $('msg').textContent = 'Submitted! We’ll review it soon, then it appears here.';
    sfx.win(2); celebrate(2);
  });
}
boot();
