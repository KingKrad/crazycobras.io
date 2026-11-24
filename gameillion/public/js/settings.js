import { initPage, toast } from './common.js';
import { loadSettings, saveSettings, resetProgress } from './store.js';
import { sfx } from './fx.js';

initPage();
const s = loadSettings();
const sound = document.getElementById('sound');
const motion = document.getElementById('motion');
const effects = document.getElementById('effects');
sound.checked = s.sound;
motion.value = s.motion;
effects.value = s.effects;
const save = () => { saveSettings({ sound: sound.checked, motion: motion.value, effects: effects.value }); toast('Saved'); };
sound.addEventListener('change', () => { save(); sfx.good(); });
motion.addEventListener('change', save);
effects.addEventListener('change', save);
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Reset progress on this device? Lessons synced to your account will come back when you sign in.')) { resetProgress(); toast('Progress on this device was reset.'); }
});
