import { initPage, el, toast } from './common.js';
import { api } from './store.js';
import { formatPrice } from './rules.js';

async function boot() {
  const me = await initPage();
  for (const p of document.querySelectorAll('[data-price]')) p.textContent = formatPrice();
  const btn = document.getElementById('buy');
  const msg = document.getElementById('msg');
  if (new URLSearchParams(location.search).get('cancelled')) msg.textContent = 'No worries — checkout was cancelled and you weren’t charged.';
  if (me.paid) {
    btn.replaceWith(el('a', { class: 'btn big teal', href: '/path.html', text: 'You own it! Go to the course →' }));
    return;
  }
  btn.addEventListener('click', async () => {
    if (!document.getElementById('agree').checked) { msg.textContent = 'Please tick the box to agree to the terms and refund policy.'; document.getElementById('agree').focus(); return; }
    btn.disabled = true;
    btn.textContent = 'Opening secure checkout…';
    const r = await api('/api/checkout', { method: 'POST', body: {} });
    if (r.ok && r.data.url && r.data.url.startsWith('https://')) { location.href = r.data.url; return; }
    btn.disabled = false;
    btn.textContent = `Unlock for ${formatPrice()}`;
    msg.textContent = r.data.error || 'Something went wrong.';
    toast(msg.textContent);
  });
}
boot();
