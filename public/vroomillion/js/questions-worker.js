// Loads the built-in answer lists (about 2 MB) off the main thread, so the menus stay smooth on phones
// while they load. main.js falls back to loading them itself where module workers aren't supported.
import { QUESTIONS } from "./data.js";

postMessage(QUESTIONS);
