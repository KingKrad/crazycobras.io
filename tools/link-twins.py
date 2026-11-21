# Link catalog families as twins: python3 tools/link-twins.py fam=key fam=key ...
# Sets the "=key" flag and moves the family into the key family's pools (twins must share pools).
import re, glob, sys
links = dict(a.split("=") for a in sys.argv[1:])
files = glob.glob("public/vroomillion/js/catalog/*.js")
pools = {}
for f in files:
    for line in open(f):
        m = re.match(r"^([a-z0-9-]+/[a-z0-9-]+) \| (\d) \| ([a-z ]+) \|", line)
        if m: pools[m.group(1)] = m.group(3)
done = set()
for f in files:
    s = open(f).read()
    for fam, key in links.items():
        def rep(m):
            done.add(fam)
            flags = " ".join(x for x in m.group(4).split() if not x.startswith("="))
            return f"{m.group(1)} | {m.group(2)} | {pools[key]} | {(flags + ' ') if flags else ''}={key} |"
        s = re.sub(r"^(" + re.escape(fam) + r") \| (\d) \| ([a-z ]+) \|([^|]*)\|", rep, s, flags=re.M)
    open(f, "w").write(s)
print("linked", len(done), "missing", sorted(set(links) - done))
