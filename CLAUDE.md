# Working on VROOMILLION

## Every update gets a changelog entry
Whenever a change reaches players (anything pushed to main and deployed), add a new entry at the TOP of
`public/vroomillion/js/changelog.js`, in the same commit. The ME screen's WHAT'S NEW line (with a dot on the ME tab) shows the
newest entry, with a NEW tag until the player opens ALL UPDATES.
- `id`: unique and newest first, e.g. "2026-11-22a" (bump the letter for a second update the same day).
- `date`: like "Nov 22, 2026". `title`: a few words. `items`: 1–5 short lines written for players,
  not developers. Skip purely internal changes (tests, tooling) unless players notice them.

## Daily race order
The daily races are fixed in `public/vroomillion/js/catalog/daily-order.js`. After adding daily prompts
(and `node tools/build-catalog.mjs`), run `node tools/daily-order.mjs`: it appends new races at the end and
never changes existing ones, so a day that's been played keeps its prompts.
