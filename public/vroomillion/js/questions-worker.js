// Builds the full prompt list (about 2 MB of answers plus the "starting with" twists) off the main
// thread, so the menus stay smooth on phones while it loads. main.js falls back to doing this itself
// where module workers aren't supported.
import { QUESTIONS } from "./data.js";
import { makeVariants } from "./logic.js";

postMessage([...QUESTIONS, ...makeVariants(QUESTIONS)]);
