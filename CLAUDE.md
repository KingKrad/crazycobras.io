# Working on VROOMILLION

## Daily race order
The daily races are fixed in `public/vroomillion/js/catalog/daily-order.js`. After adding daily prompts
(and `node tools/build-catalog.mjs`), run `node tools/daily-order.mjs`: it appends new races at the end and
never changes existing ones, so a day that's been played keeps its prompts.
