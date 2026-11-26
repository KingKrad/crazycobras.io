# Fills the word-game prompts' answer files from a dictionary (no AI): rhymes, starts with, ends in,
# contains / "with X in it", and "a word that means ...". Every real English word that fits is accepted.
#
#   A word is real if WordNet (Princeton's English dictionary) knows it, as itself or as a plural / verb
#   form of a word it knows, and it isn't only a name. How common it is comes from wordfreq (a word-
#   frequency list built from books, subtitles, news, the web...), on its Zipf scale: 6 is about once in a
#   thousand words, 3 about once in a million.
#   Rhymes come from the CMU Pronouncing Dictionary; "means" prompts from WordNet's synonyms.
#
#   tiers: the hand-written answers keep theirs (TRAFFIC is always the hand-picked obvious answers, and
#   ONE IN A VROOMILLION stays hand-picked). A dictionary word is CRUISING if it's common (Zipf >= 4),
#   FAST LANE if it's everyday (>= 3), DEEP CUT otherwise.
#
# Needs: pip install wordfreq pronouncing nltk, and the WordNet data (nltk's corpora/wordnet) in NLTK_DATA.
#   NLTK_DATA=/path/to/nltk_data python3 tools/build-words.py            every word prompt
#   NLTK_DATA=... python3 tools/build-words.py --check                   counts only, write nothing
import json, os, re, sys
from pathlib import Path

import pronouncing
import wordfreq
from nltk.corpus import wordnet as wn

ROOT = Path(__file__).resolve().parent.parent
ANSWERS = ROOT / "public/vroomillion/answers"
CHECK = "--check" in sys.argv
MIN_ZIPF = 1.5        # rarer than this is mostly typos, names and junk in the frequency list
MAX_ANSWERS = 40000   # per prompt (the biggest letters have about this many real words)

# never in a family game, whatever the dictionary says: anywhere in the word, at its start, or the word itself
BLOCK_IN = ("fuck", "shit", "cunt", "nigg", "whore", "wank", "jizz", "porn", "dildo", "masturb", "nazi", "hitler")
BLOCK_START = ("bitch", "slut", "fag", "dyke", "tranny", "retard", "pussy", "twat", "penis", "vagin", "vulva",
               "clitor", "scrot", "testic", "semen", "sperm", "orgasm", "erotic", "fetish", "horny", "boob",
               "nipple", "rapist", "genocid", "suicid", "cocaine", "hooker", "prostitut", "bastard", "bollock",
               "asshole", "arsehole", "piss", "damn", "bugger", "skank", "douche", "negro", "darkie", "honky",
               "redskin", "squaw", "lesbo", "pervert", "molest", "incest", "pedoph", "paedoph", "sexual", "sexy")
BLOCK_WORD = {"cock", "cocks", "dick", "dicks", "cum", "anus", "anal", "tit", "tits", "titty", "titties",
              "rape", "raped", "rapes", "raping", "heroin", "meth", "arse", "arses", "crap", "crappy", "hell",
              "hells", "sex", "sexes", "coon", "coons", "paki", "gyp", "gypped", "homo", "homos", "spic",
              "kike", "chink", "gook", "wetback", "slave", "slaves", "slavery", "drug", "drugs", "kill",
              "killed", "killer", "killers", "killing", "kills", "murder", "murdered", "murderer", "booze",
              "wop", "wops", "dago", "dagos", "jap", "japs", "kraut", "krauts", "polack", "hymie", "yid", "yids",
              "raghead", "towelhead", "beaner", "beaners", "spook", "spooks", "chav", "pikey", "gimp", "spaz", "tard"}

def blocked(w):
    return w in BLOCK_WORD or w.startswith(BLOCK_START) or any(x in w for x in BLOCK_IN)

ADJ_SAT = "s"

def lemmas_of(w):
    """The dictionary words w is a form of (w itself, or its singular / verb base), lower-case only:
    a word WordNet has only with a capital letter is a name, not a word."""
    out = set()
    for pos in ("n", "v", "a", "r"):
        for base in {w, *(wn._morphy(w, pos) or [])}:
            for s in wn.synsets(base, pos):
                for l in s.lemmas():
                    if l.name() == base:
                        out.add(base)
    return out

_real = {}
def real(w):
    if w not in _real:
        # (no vowel: an abbreviation such as "km" or "kg", which WordNet lists as words)
        _real[w] = bool(re.fullmatch(r"[a-z]+", w)) and bool(re.search(r"[aeiouy]", w)) and not blocked(w) and bool(lemmas_of(w))
    return _real[w]

def zipf(w):
    return wordfreq.zipf_frequency(w, "en")

print("loading the frequency list...", file=sys.stderr)
VOCAB = [w for w in wordfreq.top_n_list("en", 400000) if re.fullmatch(r"[a-z]+", w) and zipf(w) >= MIN_ZIPF]
print(len(VOCAB), "candidate words", file=sys.stderr)
_words = None
def words():
    global _words
    if _words is None:
        _words = [w for w in VOCAB if real(w)]
        print(len(_words), "real words", file=sys.stderr)
    return _words

def quoted_or_letters(spec):
    """'"air"' -> ['air'];  'K' -> ['k'];  'K or Q' / '"ack" or "ick"' -> both"""
    parts = re.split(r"\s*(?:,|\bor\b|\band\b)\s*", spec.strip().rstrip("?."))
    return [p.strip().strip('"“”').lower() for p in parts if p.strip().strip('"“”')]

def rhymes(target):
    out = set()
    t = target.split()[-1]
    for r in pronouncing.rhymes(t):
        if "'" in r or "-" in r:
            continue
        r = re.sub(r"\(\d+\)$", "", r)
        if r != t:
            out.add(r)
    return [w for w in out if zipf(w) >= MIN_ZIPF and real(w)]

def synonyms(spec):
    """'happy' / 'rich or poor' / 'good or great': WordNet's synonyms (and close adjectives)"""
    out = set()
    for t in quoted_or_letters(spec):
        for s in wn.synsets(t):
            group = [s]
            if s.pos() in ("a", "s"):
                group += s.similar_tos() + s.also_sees()
            for g in group:
                for l in g.lemmas():
                    n = l.name().lower().replace("_", " ")
                    if n != t and re.fullmatch(r"[a-z][a-z ]*", n) and not blocked(n):
                        out.add(n)
    return [w for w in out if " " in w or zipf(w) >= MIN_ZIPF]

PATTERNS = [
    (re.compile(r'^Name a word that rhymes with (.+)$'), lambda m: rhymes(quoted_or_letters(m.group(1))[0])),
    (re.compile(r'^Name a word that starts with (.+)$'), lambda m: [w for w in words() if any(w.startswith(x) and w != x for x in quoted_or_letters(m.group(1)))]),
    (re.compile(r'^Name a word that ends in (.+)$'), lambda m: [w for w in words() if any(w.endswith(x) and w != x for x in quoted_or_letters(m.group(1)))]),
    (re.compile(r'^Name a word (?:that contains|with) (.+?)(?: in it)?$'), lambda m: [w for w in words() if any(x in w and w != x for x in quoted_or_letters(m.group(1)))]),
    (re.compile(r'^Name a word that means (.+)$'), lambda m: synonyms(m.group(1))),
]

def tier_of(w):
    z = zipf(w)
    return 2 if z >= 4 else 3 if z >= 3 else 4

def main():
    from_norm = lambda s: re.sub(r"[^a-z0-9]+", "", s.lower())
    report = []
    for path in sorted(ANSWERS.glob("*.json")):
        d = json.loads(path.read_text())
        q = d.get("q", "")
        hit = next(((rx, fn) for rx, fn in PATTERNS if rx.match(q)), None)
        if not hit:
            continue
        found = hit[1](hit[0].match(q))
        found.sort(key=lambda w: -zipf(w))
        found = found[:MAX_ANSWERS]
        # what's there keeps its tier (the hand-written answers, and the words an earlier run added)
        a = [list(tier) for tier in d["a"]] + [[] for _ in range(5 - len(d["a"]))]
        have = {from_norm(f) for tier in a for e in tier for f in e.split("|")}
        added = []
        for w in found:
            k = from_norm(w)
            if not k or k in have:
                continue
            have.add(k)
            a[tier_of(w) - 1].append(w)
            added.append(k)
        report.append((q, sum(map(len, a)), len(added)))
        if not CHECK:
            d["a"] = a
            d["dict"] = 1
            path.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    for q, n, added in report:
        print(f"{n:6d}  (+{added})  {q}")
    print(len(report), "word prompts", file=sys.stderr)

main()
