// The prompt catalog: every prompt family in the game, and the rules for picking a race from it.
//   family  once you've had any prompt in a family, none of them ever comes back (any mode, any race)
//   group   a race never has two families from the same group (e.g. two city prompts)
//   topic   a race has seven different topics
//   single  one-artist / one-show / one-team style prompts: at most one per race
// See existing.js for the line format.
import { EXISTING } from "./existing.js";
import { CAR } from "./car.js";

export const TOPICS = ["food", "drink", "animals", "places", "people", "music", "screen", "sports", "brands", "science", "objects", "wild"];
export const SOURCES = [EXISTING, CAR];

export function parseCatalog(texts) {
  const fams = [];
  for (const text of texts) {
    let topic = null;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("#")) { topic = line.slice(1).trim(); continue; }
      const [id, level, pools, flags, prompts] = line.split("|").map((s) => s.trim());
      const fl = flags ? flags.split(/\s+/) : [];
      const carTopic = (fl.find((f) => f.startsWith("c:")) || "").slice(2) || null;
      fams.push({
        id, group: id.split("/")[0], topic, level: Number(level), pools: pools.split(/\s+/),
        single: fl.includes("1"), carTopic, prompts: prompts.split(";").map((s) => s.trim()).filter(Boolean),
      });
    }
  }
  return fams;
}

export const FAMILIES = parseCatalog(SOURCES);
