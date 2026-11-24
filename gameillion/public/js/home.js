import { initPage } from './common.js';
import { loadProgress } from './store.js';

initPage();
const p = loadProgress();
const done = Object.keys(p.completed).length;
const cta = document.getElementById('cta');
if (done > 0 && cta) cta.textContent = `Continue (${done}/12 done)`;
