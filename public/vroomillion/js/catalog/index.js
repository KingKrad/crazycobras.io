// The prompt catalog: every prompt family in the game, and the rules for picking a race from it.
//   family  once you've had any prompt in a family, none of them ever comes back (any mode, any race)
//   group   a race never has two families from the same group (e.g. two city prompts)
//   topic   a race has seven different topics
//   single  one-artist / one-show / one-team style prompts: at most one per race
//   twin    flag "=group/family": the same family as that one in history (e.g. "a city in Texas" = "a city
//           in the USA"), so having either uses up both; a race never has both
// See existing.js for the line format.
import { EXISTING } from "./existing.js";
import { CAR } from "./car.js";
import { W01 } from "./w01.js";
import { W02 } from "./w02.js";
import { W03 } from "./w03.js";
import { W04 } from "./w04.js";
import { W05 } from "./w05.js";
import { W06 } from "./w06.js";
import { W07 } from "./w07.js";
import { W08 } from "./w08.js";
import { W09 } from "./w09.js";
import { W10 } from "./w10.js";
import { W11 } from "./w11.js";
import { W12 } from "./w12.js";
import { W13 } from "./w13.js";
import { W14 } from "./w14.js";
import { W15 } from "./w15.js";
import { W16 } from "./w16.js";
import { W17 } from "./w17.js";
import { W18 } from "./w18.js";
import { W19 } from "./w19.js";
import { W20 } from "./w20.js";
import { W21 } from "./w21.js";
import { W22 } from "./w22.js";
import { W23 } from "./w23.js";

export const TOPICS = ["food", "drink", "animals", "places", "people", "music", "screen", "sports", "brands", "science", "objects", "wild"];
export const SOURCES = [EXISTING, CAR, W01, W02, W03, W04, W05, W06, W07, W08, W09, W10, W11, W12, W13, W14, W15, W16, W17, W18, W19, W20, W21, W22, W23];

export function parseCatalog(texts) {
  const fams = [];
  for (const text of texts) {
    let topic = null;
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("#")) { topic = line.slice(1).trim(); continue; }
      // new families also carry a Wikidata rule and the obvious answers (tools/build-catalog.mjs)
      const cols = line.split("|").map((s) => s.trim());
      if (cols.length !== 5 && cols.length !== 7) throw new Error(`catalog line has ${cols.length} columns (a stray "|"?): ${line.slice(0, 80)}`);
      const [id, level, pools, flags, prompts, src, top] = cols;
      const fl = flags ? flags.split(/\s+/) : [];
      const carTopic = (fl.find((f) => f.startsWith("c:")) || "").slice(2) || null;
      // "=other/family" in flags: a twin of that family (same history key: having either uses up both)
      const twin = (fl.find((f) => f.startsWith("=")) || "").slice(1) || null;
      fams.push({
        id, key: twin || id, group: id.split("/")[0], topic, level: Number(level), pools: pools.split(/\s+/),
        single: fl.includes("1"), carTopic, prompts: prompts.split(";").map((s) => s.trim()).filter(Boolean),
        ...(src ? { src } : {}), ...(top ? { top: top.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
      });
    }
  }
  return fams;
}

export const FAMILIES = parseCatalog(SOURCES);
