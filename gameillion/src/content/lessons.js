// Course content. Plain data only: the lesson player renders it with textContent.
// Step types: read, case, tweak, quiz, prompt, code, publish.
// Lessons 1-3 are free (see FREE_LESSON_COUNT in rules.js); the rest are served only to buyers.

export const UNITS = [
  { id: 1, title: 'Idea & hook', color: 'teal' },
  { id: 2, title: 'Build your daily puzzle', color: 'gold' },
  { id: 3, title: 'Habit & sharing', color: 'pink' },
  { id: 4, title: 'Polish & launch', color: 'violet' },
];

export const LESSONS = [
  {
    n: 1, unit: 1, minutes: 6, title: 'It’s alive!',
    summary: 'Change a real game and watch it react instantly.',
    steps: [
      { type: 'read', title: 'Meet your game', body: [
        'On the right (or below, on a phone) is a real, working daily puzzle: everyone gets the same secret number each day and tries to find it in as few guesses as possible.',
        'Right now it’s called Mysterillion. By the end of this course it will be YOUR game, with your own name, theme and link you can send to anyone.',
        'Try a guess or two in the preview. Then come back here.',
      ] },
      { type: 'tweak', title: 'Rename it', body: ['Give the game a new name. Anything you like — you can change it later.'],
        control: { key: 'name', kind: 'text', label: 'Game name', max: 30 },
        goal: { key: 'name', op: 'changed' }, bigMoment: true },
      { type: 'tweak', title: 'Make it harder or easier', body: ['Drag the slider. The secret number will be somewhere between 1 and this number. Bigger = harder.'],
        control: { key: 'max', kind: 'range', label: 'Highest number', min: 10, max: 500, step: 10 },
        goal: { key: 'max', op: 'changed' } },
      { type: 'quiz', question: 'What did you just do?', options: [
        'Changed a game’s settings and saw it update live',
        'Wrote 500 lines of code',
        'Downloaded a game engine',
      ], answer: 0, explain: 'Exactly. Most of making a game is changing things and seeing what feels best. You’ll do a lot of that here.' },
    ],
  },
  {
    n: 2, unit: 1, minutes: 9, title: 'Why daily games spread',
    summary: 'The three hooks behind one-in-a-million daily hits.',
    steps: [
      { type: 'read', title: 'The daily formula', body: [
        'The daily games that blow up usually share three things:',
      ], list: [
        'One puzzle per day, the same for everyone. So everyone can compare and nobody can binge.',
        'A tiny session. Two minutes, then you’re done until tomorrow.',
        'A spoiler-free result you can paste into a group chat, which brings in new players.',
      ] },
      { type: 'case', title: 'Case study: Krillion', site: 'krillion.io', url: 'https://krillion.io', body: [
        'Krillion calls itself “the daily dive”. Go and play today’s puzzle, then look for the hooks:',
      ], list: [
        'A daily mode front and centre, plus extra modes (unlimited, themed packs) for players who want more.',
        'A strong theme — diving deeper — that runs through the name, the words and the art.',
        'Tiers and friends, so you always have something to beat.',
      ], note: 'We study it, we don’t copy it. Your game will have its own name, theme and art.' },
      { type: 'quiz', question: 'Why is ONE puzzle per day a good idea?', options: [
        'Everyone gets the same challenge, so they compare and come back tomorrow',
        'It’s less work for the developer',
        'Players prefer having fewer choices in general',
      ], answer: 0, explain: 'Shared puzzle + scarcity = conversation + a reason to return. That’s the whole engine.' },
      { type: 'quiz', question: 'Which result is spoiler-free?', options: [
        '\u{1F7E6}\u{1F7E8}\u{1F7E7}\u{1F7E9} 4/7',
        'The answer was 42! Got it in 4.',
        'A screenshot of my winning guess',
      ], answer: 0, explain: 'Coloured squares show HOW you did without giving away the answer, so friends can still play.' },
    ],
  },
  {
    n: 3, unit: 1, minutes: 8, title: 'Name & theme your game',
    summary: 'Pick a name, an emoji and colours that people remember.',
    steps: [
      { type: 'read', title: 'What makes a good name', list: [
        'Short and easy to say out loud: you want people to tell friends.',
        'Hints at the theme. A “-illion” ending is fun, but any catchy word works.',
        'Check nobody else uses it: search the name + “game” before you commit.',
      ] },
      { type: 'tweak', title: 'Pick a theme emoji', body: ['This appears in your share card. Choose one that matches your name.'],
        control: { key: 'emoji', kind: 'text', label: 'Emoji', max: 8 }, goal: { key: 'emoji', op: 'changed' } },
      { type: 'tweak', title: 'Write a one-line hook', body: ['One sentence that tells a new player what to do. Keep it under 80 characters.'],
        control: { key: 'tagline', kind: 'text', label: 'Tagline', max: 80 }, goal: { key: 'tagline', op: 'changed' } },
      { type: 'tweak', title: 'Choose your colours', body: ['Pick a background and an accent colour. High contrast is easier to read on phones.'],
        control: { key: 'accent', kind: 'color', label: 'Accent colour' }, goal: { key: 'accent', op: 'changed' } },
      { type: 'tweak', title: 'Background', body: ['Dark backgrounds make bright accents pop.'],
        control: { key: 'bg', kind: 'color', label: 'Background colour' }, goal: { key: 'bg', op: 'changed' } },
      { type: 'prompt', title: 'Get name ideas from an AI', body: ['Paste this into any AI chat assistant (Claude, for example) to brainstorm names.'],
        prompt: 'I’m making a daily puzzle web game where players guess a secret number with hot/cold hints. Suggest 15 short, catchy, original game names (ideally ending in "-illion" or similar) for the theme: [YOUR THEME]. For each, give a matching emoji and a one-line tagline under 80 characters. Avoid names of existing games or brands.' },
    ],
  },
  {
    n: 4, unit: 2, minutes: 10, title: 'One puzzle for everyone',
    summary: 'How a game picks the same answer for every player, every day.',
    steps: [
      { type: 'read', title: 'The trick: a seed', body: [
        'Your game has no server picking answers. Instead it turns today’s date (plus your game’s name) into a number using a hash — a recipe that always gives the same output for the same input.',
        'Same date + same name → same answer on every phone in the world. Tomorrow the date changes, so the answer changes.',
      ] },
      { type: 'quiz', question: 'Two players open your game on the same day. What happens?', options: [
        'They get the same secret number',
        'They each get a random number',
        'The second player gets the next number',
      ], answer: 0, explain: 'Same seed, same answer. That’s what makes comparing results fair.' },
      { type: 'quiz', question: 'You rename your game. What happens to today’s answer?', options: [
        'It changes, because the name is part of the seed',
        'Nothing',
        'The game breaks',
      ], answer: 0, explain: 'The name is mixed into the seed, so different games built from this template never share answers.' },
      { type: 'tweak', title: 'Set your range', body: ['Choose the highest number. 100 is a classic; 50 is friendly; 500 is brutal.'],
        control: { key: 'max', kind: 'range', label: 'Highest number', min: 10, max: 500, step: 10 }, goal: { key: 'max', op: 'between', min: 20, max: 500 } },
    ],
  },
  {
    n: 5, unit: 2, minutes: 9, title: 'Tuning difficulty',
    summary: 'Find the sweet spot between too easy and rage-quit.',
    steps: [
      { type: 'read', title: 'The magic number of tries', body: [
        'With higher/lower hints, a perfect player can always find a number between 1 and N in about log₂(N) guesses: 7 for 100, 9 for 500.',
        'Give players about that many tries and a smart player always wins, but a careless one sometimes loses. That tension is what makes the result worth sharing.',
      ] },
      { type: 'quiz', question: 'Your range is 1–100. How many tries feels fair but exciting?', options: ['7', '2', '50'], answer: 0,
        explain: '7 tries is just enough for careful halving. 2 is unfair; 50 is boring.' },
      { type: 'tweak', title: 'Set the tries', body: ['Match your tries to your range. Play the preview a few times to feel it.'],
        control: { key: 'tries', kind: 'range', label: 'Tries allowed', min: 3, max: 15, step: 1 }, goal: { key: 'tries', op: 'between', min: 4, max: 12 } },
      { type: 'prompt', title: 'Ask AI to playtest the maths', prompt: 'My daily game hides a number between 1 and [MAX]. Players get [TRIES] guesses with "higher/lower" hints. Explain in simple terms whether a smart player can always win, how often a random guesser would win, and suggest a fair number of tries.' },
    ],
  },
  {
    n: 6, unit: 2, minutes: 12, title: 'Make AI your teammate',
    summary: 'Use an AI helper to write real game code — then run it.',
    steps: [
      { type: 'read', title: 'How to ask for code', list: [
        'Say what the game is and what you want changed, in plain words.',
        'Give an example of the result you want.',
        'Ask for ONLY the code that changes, and paste it in.',
        'If it breaks, paste the error message back to the AI. That’s normal!',
      ] },
      { type: 'prompt', title: 'The prompt', prompt: 'Write a JavaScript function body (no function declaration line) for a guessing game. Inputs: guess, answer, max (numbers). Return a short, fun hint string based on how close the guess is, with at least 3 levels like "On fire!", "Warm", "Freezing". Return "" if guess equals answer. Only return code.' },
      { type: 'code', title: 'Paste and run it', body: [
        'Replace the code below with what the AI gave you (or edit ours). It runs every time a player guesses. It gets guess, answer and max, and returns the hint text.',
      ], key: 'hintCode', starter:
        'const gap = Math.abs(guess - answer);\nif (gap === 0) return "";\nif (gap <= max * 0.05) return "On fire!";\nif (gap <= max * 0.2) return "Warm";\nreturn "Freezing";' },
      { type: 'quiz', question: 'The AI’s code shows an error. Best next step?', options: [
        'Paste the exact error back to the AI and ask it to fix it',
        'Give up on AI',
        'Delete the game',
      ], answer: 0, explain: 'Errors are just information. Feeding them back is the fastest fix.' },
    ],
  },
  {
    n: 7, unit: 3, minutes: 8, title: 'The share card',
    summary: 'Design the result that brings in new players.',
    steps: [
      { type: 'read', title: 'Your free advertising', body: [
        'Every time someone shares a result, their friends see your game’s name and want to try. A great share card is short, visual, and spoiler-free.',
        'Your game already makes one: emoji, name, puzzle number, score, and a row of coloured squares that show how close each guess was.',
      ] },
      { type: 'quiz', question: 'What should a share card NEVER include?', options: ['The answer', 'The game’s name', 'The puzzle number'], answer: 0,
        explain: 'Spoilers ruin it for friends who haven’t played yet.' },
      { type: 'quiz', question: 'Why include the puzzle number (#42)?', options: [
        'So friends know they played the same puzzle', 'It looks techy', 'Search engines need it'], answer: 0,
        explain: 'It turns separate players into a shared moment.' },
      { type: 'read', title: 'Try it', body: ['Win or lose a round in the preview, then press Share to see your card. On phones it opens the share sheet; on desktop it copies the text.'] },
    ],
  },
  {
    n: 8, unit: 3, minutes: 8, title: 'Streaks that feel good',
    summary: 'Bring players back tomorrow without being annoying.',
    steps: [
      { type: 'read', title: 'Habit, not guilt', list: [
        'Show the streak proudly after a win.',
        'Never punish harshly: a missed day just starts a new streak.',
        'Celebrate milestones (3, 7, 30 days) with something special.',
        'Never use guilt-trip notifications. Players should come back because it’s fun.',
      ] },
      { type: 'quiz', question: 'A player misses a day. Best response?', options: [
        'Start a fresh streak and show their best streak too', 'Delete all their stats', 'Send 5 reminder notifications'], answer: 0,
        explain: 'Keeping the best streak visible rewards them without punishing a life event.' },
      { type: 'prompt', title: 'Add a milestone celebration', prompt: 'In my daily browser game, I save the streak in localStorage as {count, last}. Write a small JavaScript function that, after a win, shows a special message and a confetti burst when the streak hits 3, 7 or 30 days. Keep it dependency-free.' },
    ],
  },
  {
    n: 9, unit: 3, minutes: 7, title: 'Give your game a voice',
    summary: 'Write words that make players smile.',
    steps: [
      { type: 'read', title: 'Words are game feel', body: ['“Go higher” works. “Swim up! \u{1F420}” has personality. Match every message to your theme.'] },
      { type: 'tweak', title: 'Higher hint', control: { key: 'higher', kind: 'text', label: 'When the answer is higher', max: 40 }, goal: { key: 'higher', op: 'changed' } },
      { type: 'tweak', title: 'Lower hint', control: { key: 'lower', kind: 'text', label: 'When the answer is lower', max: 40 }, goal: { key: 'lower', op: 'changed' } },
      { type: 'tweak', title: 'Victory line', control: { key: 'win', kind: 'text', label: 'When they win', max: 60 }, goal: { key: 'win', op: 'changed' } },
    ],
  },
  {
    n: 10, unit: 4, minutes: 9, title: 'Juice: make it feel amazing',
    summary: 'Feedback, motion and sound that scale with the moment.',
    steps: [
      { type: 'read', title: 'Every action answers back', list: [
        'Small actions get small feedback: a tap pop, a wiggle.',
        'Good moves get more: a glow, a chime.',
        'The win gets the biggest payoff: build-up, burst, sound.',
        'Respect players who turn off motion: check prefers-reduced-motion.',
      ] },
      { type: 'quiz', question: 'A player gets very close but not right. Best feedback?', options: [
        'A warm glow and an excited hint — smaller than the win', 'The same big fireworks as winning', 'Nothing'], answer: 0,
        explain: 'Feedback should scale with how good the move was, saving the biggest moment for the win.' },
      { type: 'prompt', title: 'Ask AI for a win effect', prompt: 'Write dependency-free JavaScript for a celebratory confetti burst on an HTML canvas overlay, triggered by a function celebrate(intensity) where intensity is 1-3. Skip the animation if window.matchMedia("(prefers-reduced-motion: reduce)").matches. Keep it under 60 lines.' },
    ],
  },
  {
    n: 11, unit: 4, minutes: 8, title: 'Test on real phones',
    summary: 'Catch the problems players will hit.',
    steps: [
      { type: 'read', title: 'The 5-minute phone check', list: [
        'Open it on a small phone. Can you reach every button with a thumb?',
        'Is all text readable without zooming?',
        'Rotate the phone. Does anything break?',
        'Turn the sound off. Is the game still clear?',
        'Ask a friend to play without explaining anything. Watch, don’t help.',
      ] },
      { type: 'quiz', question: 'Your friend can’t find the guess button. Whose problem is it?', options: ['The game’s — make it more obvious', 'Your friend’s', 'Nobody’s'], answer: 0,
        explain: 'If a player gets stuck, the design needs fixing. That’s the best feedback you can get.' },
      { type: 'prompt', title: 'Ask AI to review your game', prompt: 'Here is the HTML of my small daily browser game: [PASTE]. Review it for mobile usability, accessibility (keyboard, labels, contrast) and bugs. List the top 5 fixes in priority order with code.' },
    ],
  },
  {
    n: 12, unit: 4, minutes: 12, title: 'Launch day',
    summary: 'Publish your game, get your first players, and keep it honest.',
    steps: [
      { type: 'read', title: 'Get it online for free', list: [
        'Download your game below: it’s a single HTML file.',
        'Upload it to a free static host such as Cloudflare Pages, Netlify or GitHub Pages (each has a drag-and-drop or simple upload option).',
        'You’ll get a public https:// link. That’s your game, live.',
      ] },
      { type: 'publish', title: 'Launch it!' },
      { type: 'read', title: 'Your first 100 players', list: [
        'Share your own result in group chats every day for the first week.',
        'Post a short clip of a nail-biting round.',
        'Ask players what they’d change. Ship one improvement a week.',
      ] },
      { type: 'read', title: 'About money, honestly', body: [
        'Most games earn little or nothing, and that’s fine — you made a real thing people play. If yours takes off, common options are a tip jar, merch, sponsors or non-intrusive ads. Follow each platform’s rules, and if you’re under 18, involve a parent or guardian in anything to do with payments.',
      ] },
      { type: 'quiz', question: 'What’s the best way to grow a new daily game?', options: [
        'Play and share it daily, listen to players, improve weekly', 'Buy fake followers', 'Copy a famous game’s look'], answer: 0,
        explain: 'Real players and steady improvements beat shortcuts. And your game is your own — that’s what makes it worth sharing.' },
    ],
  },
];

export function outline() {
  return LESSONS.map(({ n, unit, title, minutes, summary }) => ({ n, unit, title, minutes, summary }));
}
