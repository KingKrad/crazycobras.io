# Re-tiers the word games' middle tiers by how common each word really is (no AI): in every answer file
# built from the dictionary ("dict": 1, see build-words.py), TRAFFIC and ONE IN A VROOMILLION stay hand-
# picked, and every other word is CRUISING if Zipf >= 3.8, FAST LANE if >= 2.6, DEEP CUT otherwise (the
# same rule build-words.py uses for words it adds). So "wok" is no longer as rare as "whippersnapper".
#
# Needs: pip install wordfreq
#   python3 tools/retier-words.py            dry run: counts per tier, before -> after
#   python3 tools/retier-words.py --write    save
import json, sys
from pathlib import Path
from wordfreq import zipf_frequency

ANSWERS = Path(__file__).resolve().parent.parent / "public/vroomillion/answers"
COMMON, RARE = 3.8, 2.6

def tier_of(word):
    z = zipf_frequency(word, "en")
    return 2 if z >= COMMON else 3 if z >= RARE else 4

def retier(path, write):
    d = json.loads(path.read_text())
    if not d.get("dict") or not isinstance(d.get("a"), list) or len(d["a"]) < 5:
        return None
    t1, t5 = d["a"][0], d["a"][4]
    keep = set(t1) | set(t5)
    seen, tiers = set(), {2: [], 3: [], 4: []}
    for w in (w for t in d["a"][1:4] for w in t):
        if w in keep or w in seen:
            continue
        seen.add(w)
        tiers[tier_of(w)].append(w)
    before = [len(t) for t in d["a"]]
    d["a"] = [t1, tiers[2], tiers[3], tiers[4], t5]
    if write:
        path.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    return before, [len(t) for t in d["a"]]

if __name__ == "__main__":
    write = "--write" in sys.argv
    n = 0
    for p in sorted(ANSWERS.glob("*.json")):
        r = retier(p, write)
        if r:
            n += 1
            print(f"{p.name}: {r[0]} -> {r[1]}")
    print(f"{n} word-game files {'rewritten' if write else 'checked (dry run, add --write to save)'}")
