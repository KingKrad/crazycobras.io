// Every built-in prompt gets a topic, and niche ones are marked for HARD MODE.


// Single-artist song prompts kept in CLASSIC: current superstars, the rap giants and the all-time greats. Everyone else is HARD MODE.
const STAR_ARTISTS = /^(Taylor Swift|Drake|Beyoncé|Ed Sheeran|Billie Eilish|Ariana Grande|Dua Lipa|Olivia Rodrigo|Sabrina Carpenter|Bruno Mars|Harry Styles|song by The Weeknd|Justin Bieber|Rihanna|Lady Gaga|Adele|Coldplay|BTS|Eminem|Kanye West|Kendrick Lamar|Travis Scott|Beatles|Michael Jackson|Queen|ABBA|Elvis Presley|Christmas|Madonna|Katy Perry|Britney Spears|One Direction|Nirvana|AC\/DC|Metallica|Elton John|Whitney Houston|Mariah Carey|Bon Jovi|Linkin Park|Green Day|Shakira|Oasis|Rolling Stones|Pink Floyd|Spice Girls|Disney)\b/;

// Niche prompts: HARD MODE only (matched against the prompt without "Name a/an ").
const HARD = new Set([
  // one show's characters (the mega franchises stay in CLASSIC)
  "South Park character", "Family Guy character", 
  "Doctor Who character", 
  // directors outside the household names, books
  "Alfred Hitchcock film", "Ridley Scott film", "Stanley Kubrick film", "Wes Anderson film", "Martin Scorsese film",
  "Agatha Christie book", "Charles Dickens book", "Terry Pratchett book", "Mark Twain book", "Jane Austen book",
  // sports outside the US big 4, tennis, golf and F1
  "rugby player", "cyclist", "cricketer", "figure skater", "skier", "sprinter or runner", 
  "motorcycle racer", "rally driver", "La Liga club", "Serie A club", "Bundesliga club", "MLS team", 
  
  // specialist food and drink
  "grape variety", "beer style", "whisky", "liqueur or spirit", "dumpling", "type of sushi", "cereal grain", 
  // specialist nature
  "cactus or succulent", "mineral", "type of rock", "comet", "moon of Jupiter or Saturn",
  // specialist everything else
  "typeface or font", "knot", "yoga pose", "chess opening", "programming language", "programming framework or library",
  "comic strip", "skateboarding trick", 
  "currency symbol or coin", 
  "Nobel Prize winner in Physics", "art movement", "sculptor", "architect", 
  "pope", "Canadian prime minister", "Australian prime minister", "French president", "Hindu deity", "opera",
  "glacier", 
]);

const RULES = [
  ["music", /\bsong\b|singer|rapper|band$|boy band|girl group|musical genre|musical instrument|^musical$/],
  ["sports", /team$|club$|player\b|golfer|Formula 1|\bsport\b|martial art|stadium|racing driver|race track|tennis|athlete/],
  ["animals", /^animal that lives/],
  ["screen", /movie|film|character|TV|sitcom|series|Pokémon|superhero|Marvel|DC Comics|Pixar|Disney|cartoon|video game|Nintendo|Mario|Zelda|Sega|game console|Simpsons|Harry Potter|Star Wars|Lord of the Rings|Toy Story|Shrek|Batman|YouTuber|comedian|Oscar|James Bond|musical/],
  ["geo", /country|capital|city|state|river|lake|mountain|volcano|island|desert|ocean|sea$|landmark|bridge|skyscraper|national park|waterfall|cave|forest|castle|cathedral|museum|tower|statue|theme park|province|Olympic host|road/],
  ["food", /food|dish|fruit|vegetable|pizza|cheese|bread|dessert|cake|cookie|sauce|soup|sandwich|cereal|ice cream|chocolate|drink|cocktail|coffee|nut|herb|pasta|noodle|sausage|pancake|salad|pie|berry|citrus|fast food|breakfast|legume/],
  ["animals", /animal|dog|cat\b|bird|fish|mammal|insect|reptile|shark|whale|snake|monkey|horse|dinosaur|wild cat|ocean/],
  ["history", /president|prime minister|king|queen|war|battle|scientist|inventor|element|planet|star in|galaxy|chemical|constellation|mythology|Norse|god|mythical|painter|painting|Shakespeare/],
];

export function classify(q) {
  const name = q.q.replace(/^Name (a|an) /, "").replace(/ starting with .*$/, "");
  const hardSong = / song$|^song by /.test(name) && !STAR_ARTISTS.test(name.replace(/ song$/, ""));
  const hard = HARD.has(name) || hardSong;
  let cat = "everyday";
  for (const [c, re] of RULES) if (re.test(name)) { cat = c; break; }
  // one person's or one franchise's list: fine now and then, but broad prompts should lead
  const minor = / song$|^song by | (film|movie|book|game)$/.test(name) && !/^(movie|song) with /.test(name);
  return { cat, hard, minor };
}
