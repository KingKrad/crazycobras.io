// The prompt catalog, wave 1: new families (answers built by tools/build-catalog.mjs). Format: existing.js,
// plus | Wikidata rule | the obvious answers (TRAFFIC).
export const W01 = `
# food
legume/legume | 1 | main | | Name a bean or legume | l:legume | kidney bean, black bean, chickpea, lentil, pinto bean, green bean, soybean, pea, peanut, lima bean, navy bean, baked beans
bakery/pastry | 1 | main | | Name a pastry | l:pastry | croissant, danish, eclair, cream puff, puff pastry, strudel, baklava, turnover, cinnamon roll, profiterole, palmier, churro
pepper/chili | 2 | daily | | Name a type of chili pepper | l:chili pepper | jalapeño, habanero, cayenne, serrano, ghost pepper, poblano, chipotle, scotch bonnet, bell pepper, carolina reaper, anaheim, thai chili
cooking/method | 1 | main | | Name a way to cook food | | frying, baking, boiling, grilling, roasting, steaming, poaching, sautéing, barbecue, broiling, stir frying, microwaving, deep frying, smoking
rice/rice | 2 | daily | | Name a rice dish | l:rice dish | fried rice, risotto, paella, biryani, jambalaya, sushi, pilaf, rice pudding, congee, rice and beans, jollof rice, arroz con pollo
stew/stew | 2 | daily | | Name a stew or curry | l:stew | chili, goulash, beef stew, gumbo, curry, ratatouille, irish stew, tagine, bouillabaisse, cassoulet, chicken tikka masala, pot roast
streetfood/streetfood | 2 | daily | | Name a street food | l:street food | hot dog, taco, pretzel, falafel, kebab, churro, crepe, empanada, samosa, gyro, corn dog, elote
egg/egg | 1 | daily | | Name a way to cook an egg | l:egg dish | scrambled eggs, fried egg, omelette, boiled egg, poached egg, deviled eggs, eggs benedict, quiche, frittata, egg salad, over easy, sunny side up
pudding/pudding | 2 | daily | | Name a pudding | l:pudding | chocolate pudding, rice pudding, bread pudding, tapioca, banana pudding, sticky toffee pudding, christmas pudding, custard, creme brulee, flan, panna cotta, yorkshire pudding
seafood/seafood | 1 | main | | Name a type of seafood | l:seafood | shrimp, lobster, crab, oyster, clam, mussel, scallop, salmon, tuna, squid, octopus, calamari, crawfish
cuisine/vietnamese | 2 | daily | | Name a Vietnamese dish | nocheck w:?i wdt:P495 wd:Q881. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | pho, banh mi, spring roll, bun cha, goi cuon, banh xeo, com tam, bun bo hue, cha gio, ca kho to
cuisine/turkish | 2 | daily | | Name a Turkish dish | nocheck w:?i wdt:P495 wd:Q43. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | doner kebab, baklava, kofta, shish kebab, lahmacun, pide, turkish delight, dolma, borek, menemen, iskender kebab
cuisine/german | 2 | daily | | Name a German dish | nocheck w:?i wdt:P495 wd:Q183. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | bratwurst, sauerkraut, schnitzel, pretzel, black forest cake, currywurst, spätzle, strudel, sauerbraten, kartoffelsalat, apfelstrudel
cuisine/brazilian | 2 | daily | | Name a Brazilian dish | nocheck w:?i wdt:P495 wd:Q155. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | feijoada, pao de queijo, brigadeiro, coxinha, acai bowl, moqueca, churrasco, picanha, farofa, pastel
cuisine/russian | 2 | daily | | Name a Russian dish | nocheck w:?i wdt:P495 wd:Q159. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | borscht, beef stroganoff, blini, pelmeni, pirozhki, caviar, olivier salad, shashlik, kasha, chicken kiev
cuisine/lebanese | 2 | daily | | Name a Middle Eastern dish | nocheck w:VALUES ?c { wd:Q822 wd:Q858 wd:Q810 wd:Q801 wd:Q794 } ?i wdt:P495 ?c. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | hummus, falafel, shawarma, tabbouleh, baba ghanoush, fattoush, kibbeh, shakshuka, pita, manakish, kebab, labneh
cuisine/caribbean | 2 | daily | | Name a Caribbean dish | nocheck w:VALUES ?c { wd:Q766 wd:Q241 wd:Q754 wd:Q790 wd:Q786 wd:Q1183 wd:Q244 } ?i wdt:P495 ?c. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | jerk chicken, rice and peas, ackee and saltfish, mofongo, plantains, roti, cuban sandwich, curry goat, conch fritters, ropa vieja
# drink
drink/hot | 1 | main | | Name a hot drink | l:hot beverage | coffee, tea, hot chocolate, cocoa, latte, cappuccino, chai, mulled wine, cider, espresso, matcha, apple cider
drink/milkshake | 1 | daily | | Name a smoothie or milkshake flavour | | strawberry, chocolate, vanilla, banana, mango, cookies and cream, peanut butter, mixed berry, blueberry, pineapple, oreo, coffee
drink/wine | 2 | daily | | Name a kind of wine | l:wine | red wine, white wine, rose, champagne, prosecco, merlot, chardonnay, cabernet sauvignon, pinot noir, sauvignon blanc, riesling, malbec
drink/energy | 1 | daily | | Name an energy drink | l:energy drink | red bull, monster, rockstar, bang, celsius, prime, 5-hour energy, nos, full throttle, reign, ghost, burn
drink/water | 1 | daily | | Name a brand of bottled water | l:bottled water | evian, fiji, dasani, aquafina, smartwater, poland spring, perrier, san pellegrino, voss, essentia, nestle pure life, la croix
# animals
animal/rodent | 1 | main | | Name a rodent | taxa min=6 w:?t wdt:P225 "Rodentia". ?i wdt:P171+ ?t; wdt:P105 wd:Q7432. | mouse, rat, squirrel, hamster, guinea pig, beaver, chipmunk, gerbil, porcupine, chinchilla, capybara, prairie dog, gopher
animal/bear | 2 | daily | | Name a bird of prey | taxa min=8 w:{ ?t wdt:P225 "Accipitriformes". } UNION { ?t wdt:P225 "Falconiformes". } ?i wdt:P171+ ?t; wdt:P105 wd:Q7432. | eagle, hawk, falcon, vulture, osprey, kite, condor, buzzard, bald eagle, golden eagle, peregrine falcon, kestrel
animal/marsupial | 2 | daily | | Name a marsupial | taxa min=6 w:?t wdt:P225 "Marsupialia". ?i wdt:P171+ ?t; wdt:P105 ?rank. VALUES ?rank { wd:Q7432 wd:Q34740 } | kangaroo, koala, wombat, opossum, wallaby, tasmanian devil, sugar glider, possum, quokka, bandicoot, numbat
animal/beetle | 2 | daily | | Name a bug that crawls | | ladybug, beetle, ant, cockroach, stag beetle, firefly, scarab, weevil, termite, dung beetle
animal/endangered | 2 | daily | | Name an endangered animal | | giant panda, tiger, rhino, elephant, gorilla, orangutan, polar bear, snow leopard, sea turtle, blue whale, red panda, cheetah, koala, bald eagle
animal/nocturnal | 2 | daily | | Name an animal that comes out at night | | owl, bat, raccoon, fox, hedgehog, moth, firefly, opossum, badger, skunk, cat, coyote, wolf, aye-aye
# places
place/beachcity | 1 | daily | | Name a vacation destination | | hawaii, paris, cancun, las vegas, bahamas, orlando, new york, london, rome, bali, miami, maldives, jamaica, tokyo
place/texas | 2 | daily | | Name a city in Texas | w:?i wdt:P131+ wd:Q1439. ?i wdt:P31/wdt:P279* wd:Q515. hint:Query hint:optimizer "None". | houston, dallas, austin, san antonio, fort worth, el paso, arlington, plano, corpus christi, lubbock, laredo, waco
place/california | 2 | daily | | Name a city in California | w:?i wdt:P131+ wd:Q99. ?i wdt:P31/wdt:P279* wd:Q515. hint:Query hint:optimizer "None". | los angeles, san francisco, san diego, sacramento, san jose, oakland, fresno, long beach, santa barbara, anaheim, palo alto, malibu
place/florida | 2 | daily | | Name a city in Florida | w:?i wdt:P131+ wd:Q812. ?i wdt:P31/wdt:P279* wd:Q515. hint:Query hint:optimizer "None". | miami, orlando, tampa, jacksonville, tallahassee, key west, fort lauderdale, st. petersburg, naples, gainesville, sarasota, pensacola
place/newyork | 2 | daily | | Name a city or town in New York State | | new york city, buffalo, albany, rochester, syracuse, yonkers, ithaca, niagara falls, poughkeepsie, utica, binghamton, saratoga springs
place/neighborhood | 2 | daily | | Name a New York City neighborhood | | harlem, soho, brooklyn heights, chelsea, tribeca, williamsburg, greenwich village, chinatown, little italy, upper east side, bushwick, dumbo
place/hawaii | 2 | daily | | Name a Hawaiian island or place | | maui, oahu, kauai, big island, honolulu, waikiki, molokai, lanai, hilo, kona, pearl harbor, diamond head
place/scotland | 2 | daily | | Name a place in Scotland | | edinburgh, glasgow, aberdeen, inverness, dundee, st andrews, loch ness, stirling, perth, isle of skye
# people
people/firstlady | 2 | daily | | Name a US First Lady | | michelle obama, melania trump, jill biden, hillary clinton, laura bush, nancy reagan, jacqueline kennedy, eleanor roosevelt, barbara bush, martha washington, abigail adams, rosalynn carter
people/supermodel | 2 | daily | | Name a supermodel | surnames min=20 w:?i wdt:P106 wd:Q4610556. | tyra banks, kate moss, naomi campbell, gisele bundchen, heidi klum, cindy crawford, claudia schiffer, gigi hadid, bella hadid, kendall jenner, adriana lima, twiggy
people/billionaire | 1 | main | | Name a famous billionaire | | elon musk, jeff bezos, bill gates, warren buffett, mark zuckerberg, oprah winfrey, larry page, bernard arnault, steve ballmer, larry ellison, michael bloomberg, jay-z
people/talkshow | 2 | daily | | Name a talk show host | surnames min=8 w:?i wdt:P106 wd:Q947873; wdt:P27 wd:Q30. | oprah winfrey, ellen degeneres, jimmy fallon, jimmy kimmel, stephen colbert, david letterman, jay leno, conan o'brien, johnny carson, kelly clarkson, james corden, seth meyers
people/civilrights | 2 | daily | | Name a civil rights leader | | martin luther king jr, rosa parks, malcolm x, harriet tubman, frederick douglass, john lewis, nelson mandela, cesar chavez, medgar evers, ruby bridges, sojourner truth, w.e.b. du bois
people/saint | 3 | hard | | Name a saint | | saint peter, saint paul, saint patrick, saint nicholas, saint francis, saint joan of arc, saint mary, saint john, saint christopher, saint valentine, saint george, saint anthony
# music
music/album | 1 | main | | Name a famous album | min=30 w:?i wdt:P31 wd:Q482994; wdt:P166 ?award. | thriller, abbey road, the dark side of the moon, back in black, rumours, nevermind, 1989, 21, purple rain, born in the usa, the wall, sgt. pepper's lonely hearts club band
music/rocksong | 2 | daily | | Name a rock band from the '70s | | led zeppelin, queen, pink floyd, the eagles, aerosmith, kiss, fleetwood mac, the who, black sabbath, ac/dc, lynyrd skynyrd, deep purple
music/dj | 2 | daily | | Name a DJ or producer | surnames min=15 w:?i wdt:P106 wd:Q130857. | calvin harris, david guetta, avicii, marshmello, skrillex, tiesto, diplo, deadmau5, zedd, kygo, steve aoki, martin garrix
music/festival | 2 | daily | | Name a music festival | l:music festival | coachella, lollapalooza, glastonbury, bonnaroo, woodstock, burning man, tomorrowland, rolling loud, ultra, edc, austin city limits, governors ball
music/rnb | 2 | daily | | Name an R&B singer | | beyonce, usher, alicia keys, rihanna, the weeknd, sza, chris brown, mary j. blige, whitney houston, ne-yo, frank ocean, brandy
# screen
tv/gameshow | 1 | main | | Name a TV game show | l:game show | jeopardy, wheel of fortune, the price is right, family feud, who wants to be a millionaire, deal or no deal, wipeout, the chase, survivor, the weakest link, card sharks
tv/drama | 1 | daily | | Name a TV drama series | min=40 w:?i wdt:P31/wdt:P279* wd:Q5398426; wdt:P136 wd:Q1366112. | breaking bad, grey's anatomy, the sopranos, mad men, this is us, lost, the west wing, house, er, suits, euphoria, succession
movie/romcom | 1 | daily | | Name a romantic comedy | | notting hill, the proposal, when harry met sally, 10 things i hate about you, crazy rich asians, pretty woman, love actually, hitch, clueless, 13 going on 30, sleepless in seattle, mean girls
movie/scifi | 1 | main | | Name a sci-fi movie | min=40 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q471839. | star wars, the matrix, avatar, inception, interstellar, blade runner, alien, e.t., jurassic park, back to the future, the terminator, dune
movie/war | 2 | daily | | Name a war movie | min=25 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q369747. | saving private ryan, apocalypse now, platoon, full metal jacket, dunkirk, 1917, black hawk down, hacksaw ridge, top gun, pearl harbor, the hurt locker, schindler's list
movie/musical | 2 | daily | | Name a movie musical | min=20 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q842256. | grease, the sound of music, la la land, mamma mia, the greatest showman, west side story, chicago, hairspray, wizard of oz, moulin rouge, les miserables, mary poppins
character/sesame | 1 | daily | 1 | Name a Sesame Street character | | big bird, elmo, cookie monster, oscar the grouch, bert, ernie, grover, count von count, abby cadabby, snuffleupagus, telly, zoe
movie/heist | 2 | daily | | Name a crime or gangster movie | min=30 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q959790. | the godfather, goodfellas, scarface, pulp fiction, the departed, casino, ocean's eleven, heat, the irishman, reservoir dogs, the usual suspects, gangs of new york
# sports
sport/olympian | 1 | daily | | Name an Olympic gold medalist | | michael phelps, usain bolt, simone biles, carl lewis, jesse owens, mary lou retton, michael johnson, katie ledecky, jackie joyner-kersee, nadia comaneci, mark spitz, shaun white
sport/skill | 2 | daily | | Name a gymnastics event or move | | floor, vault, balance beam, uneven bars, rings, pommel horse, parallel bars, handspring, cartwheel, back flip, round-off, split
sport/college | 2 | daily | | Name a college sports team | | alabama crimson tide, duke blue devils, michigan wolverines, ohio state buckeyes, notre dame fighting irish, kentucky wildcats, unc tar heels, texas longhorns, usc trojans, florida gators, lsu tigers, georgia bulldogs
sport/racetrack | 2 | daily | | Name a horse race or famous racehorse | | kentucky derby, preakness, belmont stakes, secretariat, seabiscuit, triple crown, grand national, american pharoah, man o' war, war admiral, melbourne cup, royal ascot
sport/mascot | 1 | daily | | Name a sports mascot | | phillie phanatic, mr. met, benny the bull, the san diego chicken, gritty, rocky, wally the green monster, bucky badger, the stanford tree, uga, mike the tiger, brutus buckeye
# brands
brand/fastcasual | 1 | daily | | Name a coffee shop chain | | starbucks, dunkin, tim hortons, peet's, costa, caribou coffee, dutch bros, the coffee bean, krispy kreme, tully's, biggby, scooter's
brand/car-rental | 2 | daily | | Name a car rental company | | hertz, enterprise, avis, budget, alamo, national, thrifty, dollar, sixt, europcar, fox, zipcar
brand/streaming | 1 | main | | Name a streaming service | | netflix, hulu, disney+, hbo max, amazon prime video, peacock, paramount+, apple tv+, spotify, youtube tv, crunchyroll, tubi
brand/toycompany | 2 | daily | | Name a toy brand | | lego, mattel, hasbro, barbie, hot wheels, fisher-price, nerf, play-doh, playmobil, mega bloks, little tikes, crayola
brand/hotel | 2 | daily | | Name a hotel chain | l:hotel chain | marriott, hilton, holiday inn, hyatt, best western, sheraton, motel 6, ritz-carlton, four seasons, hampton inn, westin, la quinta
brand/bank | 2 | daily | | Name a bank | min=20 w:?i wdt:P31/wdt:P279* wd:Q22687. | chase, bank of america, wells fargo, citibank, capital one, hsbc, barclays, td bank, us bank, goldman sachs, pnc, santander
brand/candy | 1 | daily | | Name a gum or mint brand | | trident, extra, orbit, wrigley's, juicy fruit, doublemint, big red, hubba bubba, bazooka, tic tac, altoids, mentos
# science
science/organ | 1 | main | | Name an organ of the body | l:organ | heart, lungs, liver, brain, kidney, stomach, skin, intestine, pancreas, bladder, spleen, gallbladder
science/disease | 2 | daily | | Name an illness or disease | min=60 w:?i wdt:P31/wdt:P279* wd:Q112193867. | flu, cold, covid, chickenpox, measles, cancer, diabetes, malaria, pneumonia, mumps, strep throat, asthma
science/phobia | 3 | hard | | Name a phobia | l:phobia | arachnophobia, claustrophobia, acrophobia, agoraphobia, aerophobia, trypophobia, nyctophobia, glossophobia, ophidiophobia, coulrophobia, hydrophobia, xenophobia
science/dinosaur | 2 | daily | | Name a unit of measurement | l:unit of measurement | inch, foot, mile, meter, kilometer, pound, ounce, gallon, liter, gram, yard, celsius, second, hour
science/invention | 1 | daily | | Name an invention that changed the world | | wheel, printing press, light bulb, telephone, internet, computer, airplane, car, steam engine, electricity, penicillin, television, radio, smartphone
science/natural | 2 | daily | | Name a natural disaster | l:natural disaster | earthquake, tornado, hurricane, tsunami, flood, volcanic eruption, wildfire, drought, avalanche, blizzard, landslide, mudslide
science/energy | 2 | daily | | Name a source of energy | | solar, wind, coal, oil, natural gas, nuclear, hydroelectric, geothermal, biomass, gasoline, battery, wood
# objects
object/office | 1 | main | | Name something in an office | | desk, chair, computer, stapler, printer, paper clip, pen, phone, filing cabinet, whiteboard, calendar, coffee machine, scissors, tape
object/appliance | 1 | main | | Name a household appliance | l:home appliance | refrigerator, microwave, oven, dishwasher, washing machine, dryer, toaster, blender, vacuum cleaner, coffee maker, air fryer, stove, iron
object/tool | 1 | daily | | Name a hand tool | l:hand tool | hammer, screwdriver, wrench, pliers, saw, chisel, tape measure, level, axe, file, mallet, hacksaw, crowbar
object/container | 2 | daily | | Name a kind of container | l:container | box, bag, bottle, jar, basket, bucket, can, cup, crate, barrel, envelope, suitcase, backpack, tupperware
object/instrument | 1 | daily | | Name something with a screen | | phone, television, computer, laptop, tablet, smartwatch, ipad, gps, atm, kindle, monitor, camera, microwave
object/bedroom | 1 | daily | | Name something in a bedroom | | bed, pillow, blanket, dresser, lamp, closet, nightstand, alarm clock, mirror, wardrobe, sheets, rug, curtains
object/sewing | 2 | daily | | Name something in a sewing kit | | needle, thread, scissors, pins, thimble, buttons, measuring tape, pin cushion, seam ripper, safety pin, fabric, chalk
object/makeup | 1 | daily | | Name a makeup product | l:cosmetics | lipstick, mascara, foundation, eyeliner, blush, eyeshadow, concealer, lip gloss, bronzer, nail polish, primer, highlighter
# wild
wild/yellow | 1 | main | | Name something yellow | | banana, sun, lemon, school bus, taxi, corn, sunflower, cheese, egg yolk, duck, bee, pineapple, mustard, spongebob
wild/rhymecat | 1 | daily | | Name a word that rhymes with "cat" | | hat, bat, mat, rat, sat, fat, pat, chat, flat, that, splat, vat, brat, spat, gnat, acrobat, format, combat
wild/beach | 1 | main | | Name something you'd find at a beach | | sand, shells, water, towel, umbrella, sunscreen, waves, seagull, crab, lifeguard, sandcastle, beach ball, surfboard, starfish
wild/round | 1 | daily | | Name something round | | ball, wheel, sun, moon, coin, pizza, plate, clock, orange, donut, ring, bubble, cookie, globe
wild/cold | 1 | daily | | Name something cold | | ice, snow, ice cream, freezer, refrigerator, winter, antarctica, popsicle, glacier, iceberg, snowman, ice cube, north pole, penguin
wild/sticky | 1 | daily | | Name something sticky | | glue, tape, honey, gum, syrup, maple syrup, jam, caramel, sap, slime, peanut butter, cotton candy, stickers, velcro
`;
