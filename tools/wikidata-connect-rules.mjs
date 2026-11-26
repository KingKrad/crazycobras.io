// Wikidata rules that were switched off because Wikidata disagreed with the hand-written answers, switched
// back on by tools/connect-wikidata.mjs (which merges their answers in and lists the disagreements).
// from: why it had been switched off.
export const CONNECT = {
 "bakery/pastry": {
  "rule": "l:pastry",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "egg/egg": {
  "rule": "l:egg dish",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "cuisine/lebanese": {
  "rule": "nocheck w:VALUES ?c { wd:Q822 wd:Q858 wd:Q810 wd:Q801 wd:Q794 } ?i wdt:P495 ?c. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 }",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "drink/hot": {
  "rule": "l:hot beverage",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "drink/energy": {
  "rule": "l:energy drink",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "people/supermodel": {
  "rule": "surnames min=20 w:?i wdt:P106 wd:Q4610556.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "people/talkshow": {
  "rule": "surnames min=8 w:?i wdt:P106 wd:Q947873; wdt:P27 wd:Q30.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "music/dj": {
  "rule": "surnames min=15 w:?i wdt:P106 wd:Q130857.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "tv/gameshow": {
  "rule": "l:game show",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "movie/scifi": {
  "rule": "min=40 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q471839.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "movie/war": {
  "rule": "min=25 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q369747.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "movie/musical": {
  "rule": "min=20 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q842256.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "movie/heist": {
  "rule": "min=30 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q959790.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "object/appliance": {
  "rule": "l:home appliance",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "object/tool": {
  "rule": "l:hand tool",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "object/container": {
  "rule": "l:container",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "object/makeup": {
  "rule": "l:cosmetics",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "cuisine/moroccan": {
  "rule": "nocheck w:VALUES ?c { wd:Q1028 wd:Q262 wd:Q948 wd:Q1016 wd:Q79 } ?i wdt:P495 ?c. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 }",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "cuisine/persian": {
  "rule": "nocheck w:?i wdt:P495 wd:Q794. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 }",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "cuisine/african": {
  "rule": "nocheck w:?c wdt:P30 wd:Q15. ?i wdt:P495 ?c. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 }",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "food/oil": {
  "rule": "l:cooking oil",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "people/chef": {
  "rule": "surnames min=15 w:?i wdt:P106 wd:Q3499072.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "people/astronaut": {
  "rule": "min=3 w:?i wdt:P106 wd:Q11631.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "music/jazz": {
  "rule": "min=10 w:?i wdt:P136 wd:Q8341.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "music/metal": {
  "rule": "min=3 w:?i wdt:P136 wd:Q38848.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "movie/comedy": {
  "rule": "min=40 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q157443.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "movie/fantasy": {
  "rule": "min=40 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q157394.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "hard/mathematician": {
  "rule": "surnames min=40 w:?i wdt:P106 wd:Q170790.",
  "from": "hand-written rule dropped when its list did not match the obvious answers"
 },
 "sport/college": {
  "rule": "min=3 w:?i wdt:P17 wd:Q30. { ?i wdt:P31/wdt:P279* wd:Q1685451. }",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "place/statenick": {
  "rule": "min=3 w:{ ?i wdt:P31/wdt:P279* wd:Q35657. }",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "tv/disneychannel": {
  "rule": "min=3 w:?i wdt:P449 wd:Q178837.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "tv/nick": {
  "rule": "min=3 w:?i wdt:P449 wd:Q154958. ?i wdt:P495 wd:Q30.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "game/shooter": {
  "rule": "min=3 w:?i wdt:P136 wd:Q185029.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "athlete/quarterback": {
  "rule": "min=3 w:?i wdt:P413 wd:Q622747.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "brand/gamecompany": {
  "rule": "min=3 w:?i wdt:P1056 wd:Q7397.",
  "from": "learned rule taken back for letting in wrong answers"
 },
 "movie/romcom": {
  "rule": "min=3 w:{ ?i wdt:P31/wdt:P279* wd:Q11424. } ?i wdt:P136 wd:Q118612349.",
  "from": "learned rule rejected as too broad"
 },
 "sport/mascot": {
  "rule": "min=3 w:{ ?i wdt:P31/wdt:P279* wd:Q386208. }",
  "from": "learned rule rejected as too broad"
 },
 "music/kidsong": {
  "rule": "min=3 w:{ ?i wdt:P31/wdt:P279* wd:Q105543609. }",
  "from": "learned rule rejected as too broad"
 },
 "athlete/baseballlegend": {
  "rule": "min=3 w:?i wdt:P641 wd:Q5369.",
  "from": "learned rule rejected as too broad"
 },
 "brand/mascot": {
  "rule": "min=3 w:{ ?i wdt:P31/wdt:P279* wd:Q18670161. }",
  "from": "learned rule rejected as too broad"
 }
};
