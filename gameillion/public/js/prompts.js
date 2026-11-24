import { initPage, el, toast } from './common.js';
import { sfx } from './fx.js';

const PROMPTS = [
  ['Ideas', 'Brainstorm a theme', 'Suggest 10 original themes for a daily guessing game for teenagers. For each: a catchy name, an emoji, and a one-line hook. Avoid names of existing games or brands.'],
  ['Ideas', 'Name check', 'I want to call my daily web game "[NAME]". List reasons this might be confusing or already taken, and suggest 5 safer alternatives with the same vibe.'],
  ['Build', 'Explain the code', 'Explain this JavaScript to me like I’m new to coding, line by line, in plain English: [PASTE CODE]'],
  ['Build', 'Change one thing', 'Here is my game’s HTML: [PASTE]. Change ONLY [WHAT YOU WANT]. Show me the exact lines to replace and where.'],
  ['Build', 'Fix an error', 'My game shows this error in the browser console: [PASTE ERROR]. Here is the code around it: [PASTE]. What’s wrong and how do I fix it? Keep the fix small.'],
  ['Build', 'Hint messages', 'Write a JavaScript function body taking guess, answer and max that returns a themed hint for a [THEME] game, with 4 levels from freezing to on fire. Return "" when guess equals answer.'],
  ['Share', 'Share card', 'Design a spoiler-free share text for my daily game "[NAME]" that uses emoji squares to show how close each guess was. Give 3 style options under 3 lines each.'],
  ['Share', 'Streak milestones', 'Suggest fun, non-guilt-trippy messages for a daily game streak at 3, 7, 14, 30 and 100 days, themed around [THEME].'],
  ['Polish', 'Juice it up', 'Suggest 8 small feedback effects (sound, motion, colour) for a number-guessing web game, ranked from subtle to huge, and say which moment each fits. Respect prefers-reduced-motion.'],
  ['Polish', 'Accessibility check', 'Review this HTML for accessibility: keyboard use, focus styles, labels, colour contrast and screen readers. List fixes in priority order: [PASTE]'],
  ['Launch', 'Launch post', 'Write 3 short, honest posts announcing my free daily web game "[NAME]" ([ONE-LINE HOOK]) for a group chat, a school club and a gaming forum. No hype words.'],
  ['Launch', 'Player feedback', 'Write 5 friendly questions to ask the first players of my daily game to find out what confuses them and what they’d change.'],
];

initPage();
const grid = document.getElementById('grid');
grid.replaceChildren(...PROMPTS.map(([cat, title, text]) => el('article', { class: 'card' },
  el('span', { class: 'chip', text: cat }),
  el('h2', { text: title }),
  el('div', { class: 'prompt-box', text }),
  el('p', {}, el('button', { class: 'btn teal small', type: 'button', text: 'Copy', 'aria-label': `Copy prompt: ${title}`, onclick: async () => {
    try { await navigator.clipboard.writeText(text); toast('Copied!'); sfx.coin(); } catch { toast('Select the text and copy it manually.'); }
  } })))));
