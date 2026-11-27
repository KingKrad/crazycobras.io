# Working on VROOMILLION

## Major updates get a changelog entry
Only MAJOR player-facing updates (a new mode, a big event, a big new feature) get an entry in
`public/vroomillion/js/changelog.js`, added at the TOP in the same commit. Small fixes and tweaks don't.
The ME screen's WHAT'S NEW line (with a dot on the ME tab) shows the newest entry, with a NEW tag until
the player opens ALL UPDATES.
- `id`: unique and newest first, e.g. "2026-11-22a" (bump the letter for a second update the same day).
- `date`: like "Nov 22, 2026". `title`: a few words. `items`: 1–5 short lines written for players,
  not developers.

## Daily race order
The daily races are fixed in `public/vroomillion/js/catalog/daily-order.js`. After adding daily prompts
(and `node tools/build-catalog.mjs`), run `node tools/daily-order.mjs`: it appends new races at the end and
never changes a day that's been played. Only on days nobody has played yet, it swaps out a prompt whose twin
(same question, other words) came up on an earlier day, so the daily never asks the same thing twice.
