import { initPage, el, toast } from './common.js';
import { api } from './store.js';

const $ = (id) => document.getElementById(id);

async function load(status) {
  const r = await api('/api/admin/showcase?status=' + status);
  if (r.status === 403) { $('list').replaceChildren(el('p', { text: 'Admins only. Sign in with an admin email.' })); return; }
  const rows = r.ok ? r.data.games : [];
  if (!rows.length) { $('list').replaceChildren(el('p', { class: 'muted', text: `No ${status} games.` })); return; }
  const actions = (g) => ['approved', 'rejected', 'pending'].filter((s) => s !== status).map((s) =>
    el('button', { class: `btn small ${s === 'approved' ? 'teal' : 'ghost'}`, type: 'button', text: s === 'approved' ? 'Approve' : s === 'rejected' ? 'Reject' : 'Back to pending',
      onclick: async () => { const x = await api(`/api/admin/showcase/${g.id}`, { method: 'POST', body: { status: s } }); toast(x.ok ? 'Updated' : x.data.error); load(status); } }));
  $('list').replaceChildren(el('table', { class: 'admin' },
    el('thead', {}, el('tr', {}, el('th', { text: 'Game' }), el('th', { text: 'Link' }), el('th', { text: 'By' }), el('th', { text: 'Actions' }))),
    el('tbody', {}, rows.map((g) => el('tr', {},
      el('td', {}, el('b', { text: g.title }), el('br'), el('span', { class: 'muted', text: g.blurb })),
      el('td', {}, el('a', { href: g.url, target: '_blank', rel: 'noopener noreferrer', text: g.url })),
      el('td', { text: g.email }),
      el('td', {}, el('div', { class: 'row' }, actions(g))))))));
}

initPage().then(() => {
  const sel = $('status');
  sel.addEventListener('change', () => load(sel.value));
  load(sel.value);
});
