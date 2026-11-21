// The prompt catalog, wave 2. Format: w01.js. (DISH:Qx = dishes from that country, filled in below.)
const DISH = (q) => `nocheck w:?i wdt:P495 wd:${q}. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 }`;
const DISHES = (qs) => `nocheck w:VALUES ?c { ${qs.map((q) => "wd:" + q).join(" ")} } ?i wdt:P495 ?c. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 }`;
export const W02 = `
# food
cuisine/filipino | 2 | daily | | Name a Filipino dish | ${DISH("Q928")} | adobo, lumpia, pancit, sinigang, lechon, halo-halo, sisig, kare-kare, bibingka, ube
cuisine/polish | 2 | daily | | Name a Polish dish | ${DISH("Q36")} | pierogi, kielbasa, golabki, bigos, paczki, zurek, barszcz, placki, kotlet schabowy, obwarzanek
cuisine/peruvian | 2 | daily | | Name a Peruvian dish | ${DISH("Q419")} | ceviche, lomo saltado, aji de gallina, anticuchos, causa, pollo a la brasa, papa a la huancaina, picarones, rocoto relleno, chicha morada
cuisine/moroccan | 2 | daily | | Name a North African dish | ${DISHES(["Q1028", "Q262", "Q948", "Q1016", "Q79"])} | couscous, tagine, harira, pastilla, shakshuka, merguez, msemen, zaalouk, chebakia, kefta
cuisine/swedish | 2 | daily | | Name a Scandinavian dish | ${DISHES(["Q34", "Q20", "Q35", "Q33"])} | swedish meatballs, gravlax, smorrebrod, lutefisk, surstromming, lingonberry jam, cinnamon bun, aebleskiver, lefse, pickled herring
cuisine/portuguese | 2 | daily | | Name a Portuguese dish | ${DISH("Q45")} | pastel de nata, bacalhau, francesinha, caldo verde, piri piri chicken, chourico, bifana, cataplana, arroz de marisco, feijoada
cuisine/argentine | 2 | daily | | Name an Argentine dish | ${DISH("Q414")} | empanada, asado, chimichurri, dulce de leche, milanesa, alfajor, choripan, provoleta, locro, matambre
cuisine/hungarian | 2 | daily | | Name a Central European dish | ${DISHES(["Q28", "Q40", "Q213", "Q39"])} | goulash, wiener schnitzel, sachertorte, apfelstrudel, langos, chicken paprikash, kolache, dumplings, fondue, raclette
cuisine/irish | 2 | daily | | Name an Irish dish | ${DISH("Q27")} | irish stew, soda bread, colcannon, boxty, shepherd's pie, corned beef and cabbage, black pudding, coddle, champ, barmbrack
cuisine/indonesian | 2 | daily | | Name a Southeast Asian dish | ${DISHES(["Q252", "Q833", "Q334", "Q836", "Q424"])} | nasi goreng, satay, rendang, laksa, gado-gado, nasi lemak, mee goreng, char kway teow, hainanese chicken rice, roti canai
cuisine/persian | 2 | daily | | Name a Persian dish | ${DISH("Q794")} | kebab, tahdig, ghormeh sabzi, fesenjan, ash reshteh, kashk-e bademjan, zereshk polo, joojeh kabab, sholeh zard, faloodeh
cuisine/canadian | 2 | daily | | Name a Canadian food | ${DISH("Q16")} | poutine, maple syrup, butter tart, nanaimo bar, bannock, tourtiere, beaver tail, ketchup chips, caesar, montreal-style bagel
cuisine/australian | 2 | daily | | Name an Australian food | ${DISH("Q408")} | vegemite, lamington, pavlova, meat pie, tim tam, anzac biscuit, fairy bread, sausage sizzle, chiko roll, damper
cuisine/belgian | 2 | daily | | Name a Belgian or Dutch food | ${DISHES(["Q31", "Q55"])} | belgian waffle, french fries, stroopwafel, moules-frites, speculoos, bitterballen, poffertjes, stamppot, hagelslag, gouda
cuisine/african | 2 | daily | | Name an African dish | nocheck w:?c wdt:P30 wd:Q15. ?i wdt:P495 ?c. { ?i wdt:P31 ?fk. } UNION { ?i wdt:P279 ?fk. } VALUES ?fk { wd:Q746549 wd:Q2095 wd:Q19861951 wd:Q41415 wd:Q182940 wd:Q7802 wd:Q477248 wd:Q9266 wd:Q20022 wd:Q178359 wd:Q2920963 wd:Q13276 wd:Q8495 wd:Q192874 wd:Q1196152 wd:Q131419 wd:Q28803 wd:Q27849 } | injera, jollof rice, fufu, bobotie, biltong, couscous, doro wat, suya, bunny chow, egusi soup
food/oil | 2 | daily | | Name a cooking oil or fat | l:cooking oil | olive oil, vegetable oil, canola oil, coconut oil, butter, lard, sesame oil, sunflower oil, avocado oil, peanut oil, ghee, corn oil
food/restaurant | 1 | main | =fastfood/fastfood | Name a sit-down restaurant chain | | olive garden, applebee's, chili's, red lobster, outback steakhouse, tgi fridays, cheesecake factory, texas roadhouse, ihop, denny's, cracker barrel, buffalo wild wings
food/frozen | 1 | daily | | Name a frozen food | | pizza, ice cream, french fries, peas, waffles, fish sticks, chicken nuggets, tv dinner, popsicle, hot pockets, burritos, tater tots
food/lunchbox | 1 | daily | | Name something in a lunch box | | sandwich, apple, chips, juice box, cookies, banana, yogurt, string cheese, carrot sticks, grapes, granola bar, pb&j, water bottle
food/topping | 1 | daily | | Name a burger topping | | cheese, lettuce, tomato, onion, pickles, ketchup, mustard, mayo, bacon, jalapenos, avocado, mushrooms, fried egg
food/sweet | 1 | daily | | Name something sweet | | candy, cake, chocolate, honey, sugar, ice cream, cookies, donuts, cotton candy, soda, syrup, fruit, pie, lollipop
food/spicy | 1 | daily | | Name something spicy | | hot sauce, jalapeno, chili, salsa, wasabi, curry, buffalo wings, sriracha, hot cheetos, ginger, horseradish, kimchi, pepper
food/thanksgiving | 1 | daily | | Name a Thanksgiving food | | turkey, stuffing, mashed potatoes, gravy, cranberry sauce, pumpkin pie, green bean casserole, sweet potatoes, corn, rolls, mac and cheese, pecan pie
food/movie | 1 | daily | | Name a snack you'd eat at the movies | | popcorn, nachos, candy, soda, hot dog, m&m's, twizzlers, sour patch kids, milk duds, raisinets, pretzels, skittles
food/kids | 1 | daily | | Name a food kids hate | | broccoli, brussels sprouts, spinach, peas, liver, mushrooms, cauliflower, asparagus, onions, beets, olives, kale, tomatoes
# drink
drink/milk | 1 | daily | | Name a kind of milk | | whole milk, skim milk, chocolate milk, almond milk, oat milk, soy milk, goat milk, coconut milk, 2%, lactose-free, buttermilk, strawberry milk
drink/sports | 1 | daily | | Name a sports drink | | gatorade, powerade, bodyarmor, prime, vitaminwater, propel, pedialyte, liquid i.v., electrolit, nuun, all sport, g2
drink/coffeebrand | 2 | daily | | Name a coffee brand | | folgers, maxwell house, starbucks, dunkin, nescafe, lavazza, illy, peet's, eight o'clock, death wish, cafe bustelo, community coffee
drink/party | 1 | daily | | Name a drink you'd find at a party | | soda, beer, punch, wine, juice, water, lemonade, margarita, sangria, champagne, cocktail, iced tea
drink/kids | 1 | daily | | Name a drink kids love | | juice box, capri sun, chocolate milk, lemonade, apple juice, soda, kool-aid, hi-c, orange juice, hot chocolate, slushie, milkshake
# animals
animal/african | 1 | daily | | Name an African animal | | lion, elephant, giraffe, zebra, hippo, rhino, cheetah, gorilla, hyena, leopard, meerkat, warthog, crocodile, wildebeest
animal/australian | 1 | daily | | Name an Australian animal | | kangaroo, koala, wombat, platypus, emu, dingo, tasmanian devil, wallaby, kookaburra, echidna, cassowary, quokka, crocodile
animal/arctic | 1 | daily | | Name an Arctic or Antarctic animal | | polar bear, penguin, seal, walrus, arctic fox, narwhal, beluga, orca, snowy owl, reindeer, caribou, arctic hare, puffin
animal/forest | 1 | daily | | Name an animal that lives in the forest | | deer, bear, fox, wolf, owl, squirrel, rabbit, raccoon, moose, chipmunk, woodpecker, skunk, porcupine, elk
animal/desert | 2 | daily | | Name a desert animal | | camel, scorpion, rattlesnake, lizard, coyote, roadrunner, fennec fox, gila monster, tortoise, vulture, armadillo, jackrabbit
animal/pond | 1 | daily | | Name something that lives in a pond | | frog, fish, duck, turtle, tadpole, goldfish, dragonfly, snail, swan, koi, toad, newt, heron
animal/sound | 1 | daily | | Name an animal sound | | moo, woof, meow, oink, quack, baa, neigh, roar, hiss, tweet, cluck, buzz, howl, ribbit
animal/jungle | 1 | daily | | Name an animal that lives in the jungle | | monkey, tiger, jaguar, parrot, toucan, gorilla, snake, sloth, orangutan, chimpanzee, leopard, frog, anaconda
animal/screen | 2 | daily | | Name a famous animal from a movie or TV show | | lassie, nemo, dory, simba, babe, free willy, hachiko, beethoven, marley, flipper, mr. ed, scooby-doo, garfield, king kong
animal/crustacean | 2 | daily | | Name a shellfish or crustacean | taxa min=6 w:{ ?t wdt:P225 "Decapoda". } UNION { ?t wdt:P225 "Bivalvia". } ?i wdt:P171+ ?t; wdt:P105 wd:Q7432. | crab, lobster, shrimp, crayfish, prawn, oyster, clam, mussel, scallop, krill, hermit crab, king crab
animal/waterbird | 2 | main | =bird/bird | Name a waterbird | taxa min=10 w:{ ?t wdt:P225 "Anatidae". } UNION { ?t wdt:P225 "Ardeidae". } UNION { ?t wdt:P225 "Laridae". } ?i wdt:P171+ ?t; wdt:P105 wd:Q7432. | duck, swan, goose, heron, pelican, flamingo, seagull, mallard, crane, stork, egret, loon, canada goose
animal/hoofed | 2 | daily | | Name a hoofed animal | taxa min=12 w:{ ?t wdt:P225 "Bovidae". } UNION { ?t wdt:P225 "Cervidae". } UNION { ?t wdt:P225 "Equidae". } ?i wdt:P171+ ?t; wdt:P105 wd:Q7432. | cow, horse, deer, goat, sheep, zebra, moose, elk, bison, antelope, gazelle, reindeer, donkey, yak
# places
place/paris | 1 | daily | | Name a famous place in Paris | | eiffel tower, louvre, notre-dame, arc de triomphe, champs-elysees, sacre-coeur, montmartre, musee d'orsay, moulin rouge, seine, versailles, pompidou centre
place/london | 2 | daily | | Name a famous place in London | | big ben, buckingham palace, tower of london, london eye, tower bridge, westminster abbey, trafalgar square, piccadilly circus, hyde park, st paul's cathedral, british museum, the shard
place/nyc | 1 | daily | | Name a famous place in New York City | | statue of liberty, times square, central park, empire state building, brooklyn bridge, rockefeller center, wall street, broadway, 9/11 memorial, grand central, metropolitan museum of art, madison square garden
place/vegas | 2 | daily | | Name a Las Vegas casino or hotel | | bellagio, caesars palace, mgm grand, the venetian, mandalay bay, luxor, wynn, aria, the mirage, paris las vegas, cosmopolitan, excalibur
place/disney | 1 | daily | | Name a Disney park ride or attraction | | space mountain, splash mountain, pirates of the caribbean, haunted mansion, it's a small world, tower of terror, big thunder mountain, dumbo, teacups, jungle cruise, peter pan's flight, expedition everest
place/schoolroom | 1 | main | | Name a room or place in a school | | classroom, cafeteria, gym, library, office, hallway, bathroom, auditorium, playground, nurse's office, principal's office, locker room, science lab
place/hospital | 1 | daily | | Name something you'd find in a hospital | | doctor, nurse, bed, wheelchair, stethoscope, x-ray, needle, patient, ambulance, iv, scalpel, bandage, surgeon, gown
place/airport | 1 | daily | | Name something you'd see at an airport | | plane, luggage, security, pilot, gate, runway, passport, ticket, flight attendant, baggage claim, control tower, duty free, boarding pass
place/park | 1 | daily | | Name something you'd find in a park | | trees, bench, grass, swing, slide, pond, ducks, playground, picnic table, squirrels, fountain, flowers, path, trash can
place/zoo | 1 | daily | | Name a famous zoo or aquarium | l:zoo | san diego zoo, bronx zoo, georgia aquarium, monterey bay aquarium, smithsonian national zoo, london zoo, shedd aquarium, columbus zoo, seaworld, berlin zoo, toronto zoo, singapore zoo
place/statenick | 2 | daily | | Name a US state nickname | | sunshine state, lone star state, golden state, empire state, garden state, aloha state, big sky country, show me state, peach state, bluegrass state, last frontier, grand canyon state
place/sea | 2 | main | =nature/ocean | Name a sea | i:Q165 | mediterranean sea, caribbean sea, red sea, black sea, north sea, dead sea, caspian sea, baltic sea, south china sea, arabian sea, coral sea, adriatic sea
place/peninsula | 3 | hard | | Name a peninsula | min=20 i:Q34763 | florida, iberian peninsula, italian peninsula, korean peninsula, scandinavian peninsula, arabian peninsula, balkan peninsula, baja california, crimea, yucatan, cape cod, sinai
place/canal | 3 | hard | | Name a strait or canal | min=15 k:Q37901,Q12284 | panama canal, suez canal, strait of gibraltar, bering strait, english channel, strait of hormuz, bosphorus, erie canal, strait of magellan, dardanelles, malacca strait, kiel canal
place/region | 2 | daily | | Name a region of the US | | midwest, new england, the south, west coast, east coast, pacific northwest, southwest, deep south, great plains, rust belt, bible belt, appalachia, tri-state area
# people
people/founders | 2 | daily | | Name a famous company founder | | steve jobs, bill gates, mark zuckerberg, jeff bezos, elon musk, henry ford, walt disney, larry page, sergey brin, steve wozniak, phil knight, sam walton, howard schultz
people/women | 1 | daily | | Name a famous woman in history | | cleopatra, marie curie, joan of arc, rosa parks, amelia earhart, queen elizabeth, harriet tubman, florence nightingale, susan b. anthony, frida kahlo, anne frank, helen keller, mother teresa
people/royal | 1 | daily | | Name a member of the British royal family | | queen elizabeth, king charles, prince william, prince harry, kate middleton, meghan markle, princess diana, prince george, princess charlotte, prince philip, camilla, prince andrew
people/vp | 2 | daily | | Name a US vice president | w:?i wdt:P39 wd:Q11699. | kamala harris, mike pence, joe biden, dick cheney, al gore, dan quayle, george h.w. bush, walter mondale, nelson rockefeller, spiro agnew, lyndon johnson, richard nixon
people/military | 2 | daily | | Name a famous military leader | | napoleon, julius caesar, alexander the great, genghis khan, george washington, hannibal, patton, eisenhower, douglas macarthur, robert e. lee, ulysses s. grant, attila the hun, sun tzu
people/influencer | 1 | main | =youtuber/youtuber | Name a famous influencer | | mrbeast, kim kardashian, kylie jenner, charli d'amelio, logan paul, jake paul, addison rae, khaby lame, pewdiepie, kai cenat, ishowspeed, emma chamberlain, dixie d'amelio
people/chef | 1 | daily | | Name a famous chef | surnames min=15 w:?i wdt:P106 wd:Q3499072. | gordon ramsay, julia child, emeril lagasse, bobby flay, rachael ray, anthony bourdain, guy fieri, jamie oliver, wolfgang puck, ina garten, martha stewart, paula deen
people/artist | 1 | main | =painter/painter | Name a famous artist | | picasso, leonardo da vinci, van gogh, michelangelo, monet, rembrandt, andy warhol, salvador dali, frida kahlo, banksy, jackson pollock, georgia o'keeffe, raphael
people/anchor | 2 | daily | | Name a news anchor or journalist | | walter cronkite, anderson cooper, barbara walters, katie couric, diane sawyer, tom brokaw, dan rather, lester holt, david muir, wolf blitzer, rachel maddow, tucker carlson, peter jennings
people/astronaut | 2 | daily | | Name an astronaut | surnames min=20 w:?i wdt:P106 wd:Q11631. | neil armstrong, buzz aldrin, yuri gagarin, sally ride, john glenn, alan shepard, chris hadfield, mae jemison, michael collins, scott kelly, jim lovell, valentina tereshkova
people/justice | 2 | daily | | Name a US Supreme Court justice | | ruth bader ginsburg, clarence thomas, sonia sotomayor, john roberts, antonin scalia, thurgood marshall, brett kavanaugh, amy coney barrett, elena kagan, samuel alito, neil gorsuch, ketanji brown jackson
# music
music/nineties | 2 | daily | | Name a '90s band or artist | | nirvana, backstreet boys, spice girls, nsync, tlc, oasis, pearl jam, no doubt, green day, destiny's child, boyz ii men, smashing pumpkins, radiohead
music/eighties | 2 | daily | | Name an '80s pop star | | madonna, michael jackson, prince, cyndi lauper, whitney houston, george michael, bon jovi, duran duran, tina turner, janet jackson, phil collins, lionel richie, cher
music/jazz | 2 | daily | | Name a jazz musician | surnames min=25 w:?i wdt:P106 wd:Q639669; wdt:P136 wd:Q8341. | louis armstrong, miles davis, duke ellington, john coltrane, ella fitzgerald, billie holiday, charlie parker, dizzy gillespie, thelonious monk, count basie, nina simone, herbie hancock
music/rockstar | 1 | main | | Name a rock star | | mick jagger, freddie mercury, elvis presley, david bowie, kurt cobain, jimi hendrix, ozzy osbourne, bruce springsteen, steven tyler, axl rose, jim morrison, bon jovi, paul mccartney
music/showtune | 2 | daily | | Name a song from a musical | | memory, defying gravity, my shot, the sound of music, do-re-mi, tomorrow, one day more, seasons of love, don't cry for me argentina, the phantom of the opera, think of me, let it go
music/kidsong | 1 | daily | | Name a song you'd sing to a child | | twinkle twinkle little star, the itsy bitsy spider, old macdonald had a farm, wheels on the bus, baa baa black sheep, rock-a-bye baby, mary had a little lamb, happy birthday, abc song, row row row your boat, you are my sunshine, if you're happy and you know it
music/stadium | 2 | daily | | Name a song played at sports games | | we will rock you, sweet caroline, take me out to the ball game, seven nation army, we are the champions, eye of the tiger, jump around, thunderstruck, zombie nation, crazy train, rock and roll part 2, cotton eye joe
music/onehit | 2 | daily | | Name a one-hit wonder | | macarena, ice ice baby, gangnam style, mambo no. 5, blue (da ba dee), come on eileen, tainted love, take on me, who let the dogs out, the ketchup song, what's up, mmmbop, achy breaky heart
music/lovesong | 1 | daily | | Name a love song | | my heart will go on, i will always love you, endless love, perfect, all of me, thinking out loud, unchained melody, can't help falling in love, at last, love story, crazy in love, wonderful tonight
music/dancesong | 1 | main | =dance/dance | Name a song with a dance | | macarena, cha cha slide, cupid shuffle, the electric slide, ymca, the twist, gangnam style, thriller, the hustle, crank that, the chicken dance, the hokey pokey, the wobble
music/punk | 2 | daily | | Name a punk or emo band | | green day, blink-182, my chemical romance, fall out boy, paramore, the ramones, sex pistols, the clash, sum 41, good charlotte, panic! at the disco, simple plan, the offspring
music/metal | 2 | daily | | Name a heavy metal band | min=25 w:?i wdt:P31/wdt:P279* wd:Q215380; wdt:P136/wdt:P279* wd:Q38848. | metallica, iron maiden, black sabbath, slayer, megadeth, judas priest, slipknot, pantera, motorhead, def leppard, system of a down, tool, ozzy osbourne
music/latin | 2 | daily | | Name a Latin music star | | shakira, bad bunny, jennifer lopez, ricky martin, enrique iglesias, daddy yankee, j balvin, karol g, marc anthony, selena, gloria estefan, pitbull, ozuna
# screen
tv/cartoon90s | 1 | daily | | Name a '90s cartoon | | rugrats, hey arnold, doug, the simpsons, animaniacs, dexter's laboratory, powerpuff girls, pokemon, recess, rocko's modern life, ren and stimpy, batman: the animated series, x-men, johnny bravo
tv/anime | 2 | main | | Name an anime | min=15 w:?i wdt:P31/wdt:P279* wd:Q63952888. | naruto, one piece, dragon ball z, pokemon, attack on titan, death note, sailor moon, demon slayer, my hero academia, bleach, jujutsu kaisen, spirited away, fullmetal alchemist
tv/crime | 2 | daily | | Name a crime or cop show | | law & order, csi, ncis, criminal minds, the wire, brooklyn nine-nine, cops, blue bloods, chicago p.d., the mentalist, castle, true detective, mindhunter
tv/medical | 2 | daily | | Name a doctor or hospital show | | grey's anatomy, house, er, scrubs, the good doctor, chicago med, the resident, doogie howser, m*a*s*h, private practice, new amsterdam, the pitt
tv/talent | 1 | daily | | Name a talent or singing show | | american idol, the voice, america's got talent, x factor, dancing with the stars, the masked singer, so you think you can dance, star search, britain's got talent, rupaul's drag race
tv/cartoondog | 1 | daily | | Name a cartoon dog | | scooby-doo, snoopy, pluto, goofy, odie, brian griffin, clifford, bluey, droopy, scrappy-doo, courage, santa's little helper, jake the dog, blue
tv/cartooncat | 1 | daily | | Name a cartoon cat | | garfield, tom, sylvester, the cat in the hat, felix the cat, hello kitty, cheshire cat, scratchy, puss in boots, top cat, heathcliff, marie, figaro, pete
tv/teen | 2 | daily | | Name a teen TV show | | euphoria, gossip girl, riverdale, the o.c., one tree hill, glee, saved by the bell, degrassi, 13 reasons why, pretty little liars, the vampire diaries, outer banks, never have i ever
tv/disneychannel | 1 | daily | | Name a Disney Channel show | | hannah montana, wizards of waverly place, the suite life of zack & cody, lizzie mcguire, that's so raven, phineas and ferb, good luck charlie, kim possible, jessie, liv and maddie, sonny with a chance, austin & ally
tv/nick | 1 | daily | | Name a Nickelodeon show | | spongebob squarepants, icarly, drake & josh, all that, rugrats, the fairly oddparents, avatar: the last airbender, victorious, zoey 101, kenan & kel, hey arnold, jimmy neutron, dora the explorer
movie/eighties | 2 | daily | | Name an '80s movie | min=40 w:?i wdt:P31 wd:Q11424; wdt:P577 ?d. FILTER(YEAR(?d) >= 1980 && YEAR(?d) <= 1989) | back to the future, the breakfast club, e.t., ghostbusters, top gun, die hard, ferris bueller's day off, the goonies, raiders of the lost ark, the karate kid, dirty dancing, beetlejuice
movie/nineties | 2 | daily | | Name a '90s movie | min=50 w:?i wdt:P31 wd:Q11424; wdt:P577 ?d. FILTER(YEAR(?d) >= 1990 && YEAR(?d) <= 1999) | titanic, jurassic park, the lion king, forrest gump, home alone, pulp fiction, the matrix, toy story, fight club, the shawshank redemption, clueless, independence day
movie/comedy | 1 | main | | Name a comedy movie | min=40 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q157443. | the hangover, superbad, step brothers, anchorman, bridesmaids, dumb and dumber, mean girls, elf, home alone, ghostbusters, groundhog day, the mask, airplane!
movie/sports | 2 | daily | | Name a sports movie | | rocky, remember the titans, the blind side, space jam, the sandlot, moneyball, creed, rudy, miracle, cool runnings, the mighty ducks, hoosiers, raging bull
movie/book | 2 | daily | | Name a movie based on a book | | harry potter, the hunger games, the lord of the rings, the godfather, jurassic park, gone girl, twilight, the shining, to kill a mockingbird, the notebook, forrest gump, jaws, the great gatsby
movie/fantasy | 2 | daily | | Name a fantasy movie | min=40 w:?i wdt:P31 wd:Q11424; wdt:P136 wd:Q157394. | the lord of the rings, harry potter, the wizard of oz, the princess bride, labyrinth, the hobbit, narnia, pan's labyrinth, stardust, willow, the neverending story, wicked
game/mobile | 2 | daily | | Name a mobile game | | candy crush, angry birds, pokemon go, clash of clans, fruit ninja, temple run, subway surfers, among us, roblox, minecraft, words with friends, flappy bird, wordle
game/shooter | 2 | daily | | Name a shooter video game | | call of duty, fortnite, halo, overwatch, valorant, counter-strike, apex legends, doom, battlefield, destiny, team fortress 2, gears of war, borderlands
game/hero | 1 | daily | | Name a video game hero | | mario, link, sonic, master chief, lara croft, kratos, pikachu, pac-man, donkey kong, kirby, samus, crash bandicoot, steve
# sports
sportterm/baseball | 2 | daily | | Name a baseball term | | home run, strike, ball, out, inning, pitcher, catcher, bunt, double play, grand slam, walk, shortstop, foul ball, steal
sportterm/football | 2 | daily | | Name an American football term | | touchdown, field goal, quarterback, interception, sack, fumble, first down, punt, kickoff, safety, end zone, blitz, hail mary
sportterm/golf | 2 | daily | | Name a golf term | | birdie, eagle, par, bogey, hole in one, putt, tee, fairway, green, caddie, driver, albatross, mulligan, bunker
sportterm/tennis | 2 | daily | | Name a tennis term | | ace, love, deuce, serve, volley, set, match point, backhand, forehand, lob, smash, tiebreak, advantage, double fault
sport/trophy | 2 | daily | | Name a sports trophy or championship | | super bowl, world series, stanley cup, nba finals, world cup, wimbledon, the masters, march madness, olympics, larry o'brien trophy, lombardi trophy, champions league, ryder cup
athlete/baseballlegend | 2 | daily | | Name a baseball legend | | babe ruth, jackie robinson, lou gehrig, hank aaron, willie mays, mickey mantle, derek jeter, ted williams, ty cobb, barry bonds, nolan ryan, roberto clemente, shohei ohtani
athlete/quarterback | 1 | daily | | Name an NFL quarterback | | tom brady, patrick mahomes, peyton manning, aaron rodgers, joe montana, dan marino, john elway, drew brees, brett favre, josh allen, lamar jackson, eli manning, joe burrow
athlete/goat | 1 | daily | | Name a sports GOAT | | michael jordan, tom brady, lebron james, serena williams, messi, ronaldo, wayne gretzky, muhammad ali, usain bolt, michael phelps, tiger woods, pele, babe ruth
sport/extreme | 2 | daily | | Name an extreme sport | | skydiving, bungee jumping, skateboarding, snowboarding, surfing, rock climbing, bmx, motocross, base jumping, white water rafting, parkour, wakeboarding, paragliding
sport/playground | 1 | daily | | Name a playground game | | tag, hide and seek, hopscotch, red rover, four square, dodgeball, kickball, jump rope, tetherball, freeze tag, duck duck goose, simon says, red light green light
sport/wrestlemove | 2 | daily | | Name a wrestling move | | body slam, suplex, piledriver, dropkick, clothesline, rko, stunner, chokeslam, people's elbow, tombstone, figure four, sharpshooter, powerbomb
# brands
brand/shoes | 1 | daily | | Name a shoe brand | | nike, adidas, converse, vans, puma, new balance, reebok, skechers, crocs, ugg, timberland, dr. martens, jordan, under armour
brand/soda | 1 | main | =softdrink/softdrink | Name a soda brand | | coca-cola, pepsi, sprite, dr pepper, mountain dew, fanta, 7up, root beer, a&w, canada dry, sunkist, mug, crush, barq's
brand/chips | 1 | daily | | Name a brand of chips or crisps | | lay's, doritos, pringles, cheetos, ruffles, fritos, tostitos, sun chips, kettle, takis, walkers, funyuns, utz
brand/mascot | 1 | daily | | Name a cereal mascot | | tony the tiger, toucan sam, cap'n crunch, the trix rabbit, lucky the leprechaun, snap crackle and pop, count chocula, buzz bee, sonny the cuckoo bird, chip the cookie hound, dig'em frog, the cinnamon toast crunch chefs
brand/logo | 1 | daily | | Name a brand with a famous logo | | apple, nike, mcdonald's, starbucks, coca-cola, target, twitter, amazon, google, pepsi, shell, mercedes, adidas, disney
brand/makeup | 2 | daily | | Name a makeup or skincare brand | | maybelline, l'oreal, mac, revlon, covergirl, clinique, sephora, fenty beauty, nyx, estee lauder, neutrogena, cerave, olay, rare beauty
brand/luxury | 2 | daily | | Name a luxury fashion brand | | gucci, louis vuitton, prada, chanel, versace, hermes, dior, armani, balenciaga, burberry, fendi, saint laurent, givenchy
brand/watch | 2 | daily | | Name a watch brand | | rolex, omega, casio, timex, apple watch, cartier, tag heuer, seiko, fossil, patek philippe, swatch, citizen, breitling, audemars piguet
brand/gamecompany | 2 | daily | | Name a video game company | | nintendo, sony, microsoft, sega, ea, activision, ubisoft, epic games, rockstar, valve, blizzard, capcom, square enix, bethesda
brand/cleaning | 2 | daily | | Name a cleaning product brand | | tide, clorox, lysol, windex, mr. clean, dawn, febreze, pledge, swiffer, oxiclean, palmolive, comet, gain, cascade
brand/slogan | 2 | daily | | Name a famous ad slogan | | just do it, i'm lovin' it, think different, have it your way, the best a man can get, because you're worth it, finger lickin' good, melts in your mouth, they're grrreat, taste the rainbow, got milk, eat fresh
brand/gas | 2 | daily | | Name a gas station brand | | shell, exxon, chevron, bp, mobil, texaco, sunoco, 76, speedway, wawa, sheetz, circle k, marathon, citgo, valero, buc-ee's
# science
body/muscle | 2 | main | =body/body | Name a muscle | | biceps, triceps, quadriceps, hamstring, glutes, abs, deltoid, pectorals, calf, latissimus dorsi, trapezius, obliques
space/solar | 1 | daily | | Name something in the solar system | | sun, earth, mars, jupiter, saturn, moon, venus, mercury, neptune, uranus, pluto, asteroid belt, comet, ceres
science/lab | 1 | daily | | Name something in a science lab | | microscope, test tube, beaker, bunsen burner, goggles, flask, petri dish, lab coat, pipette, scale, thermometer, gloves, funnel
science/smell | 1 | daily | | Name something you can smell | | flowers, coffee, perfume, bacon, smoke, rain, cookies, garbage, gasoline, popcorn, candles, roses, fresh bread, skunk
science/math | 2 | daily | | Name a math term | | addition, subtraction, multiplication, division, fraction, equation, algebra, geometry, calculus, pi, triangle, square root, percent, integer
science/computer | 1 | daily | | Name a part of a computer | | keyboard, mouse, monitor, cpu, hard drive, ram, motherboard, power supply, graphics card, fan, usb port, speakers, webcam
science/vitamin | 2 | daily | | Name a vitamin or mineral | | vitamin c, vitamin d, vitamin a, vitamin b12, calcium, iron, zinc, potassium, magnesium, vitamin e, vitamin k, folic acid, sodium
science/study | 2 | daily | | Name something scientists study | | stars, cells, rocks, animals, plants, weather, atoms, the ocean, dinosaurs, space, germs, volcanoes, the brain, fossils
science/shape3d | 2 | daily | | Name a 3D shape | | cube, sphere, pyramid, cylinder, cone, prism, cuboid, tetrahedron, octahedron, dodecahedron, torus, hemisphere, icosahedron
# objects
object/garden | 1 | daily | | Name something in a garden | | flowers, plants, hose, shovel, rake, gnome, seeds, soil, watering can, wheelbarrow, bench, vegetables, fence, birdbath
object/toolbox | 1 | daily | | Name something you'd find in a toolbox | | hammer, screwdriver, wrench, pliers, nails, screws, tape measure, level, utility knife, drill, allen key, flashlight, duct tape
object/purse | 1 | daily | | Name something in a purse | | wallet, phone, keys, lipstick, gum, sunglasses, tissues, hand sanitizer, makeup, pen, receipts, mirror, hair tie, mints
object/wallet | 1 | daily | | Name something you keep in your wallet | | money, credit card, driver's license, id, cash, debit card, photos, receipts, gift card, insurance card, coins, business card
object/glovebox | 1 | daily | | Name something you'd find in a glove box | | registration, insurance card, owner's manual, napkins, sunglasses, flashlight, tissues, pen, gum, charger, tire gauge, receipts, maps
object/christmas | 1 | daily | | Name a Christmas decoration | | tree, lights, ornaments, tinsel, star, wreath, stockings, garland, angel, mistletoe, candy cane, nativity scene, snow globe, bows
object/costume | 1 | daily | | Name a Halloween costume | | witch, ghost, vampire, zombie, pirate, princess, superhero, skeleton, cat, devil, mummy, werewolf, spider-man, frankenstein
object/supply | 1 | daily | | Name a school supply | | pencil, pen, notebook, eraser, ruler, backpack, glue, scissors, crayons, markers, calculator, binder, highlighter, folder
object/baby | 1 | daily | | Name something a baby needs | | diapers, bottle, pacifier, crib, stroller, car seat, wipes, formula, blanket, onesie, bib, high chair, toys, milk
object/winter | 1 | daily | | Name something you wear in winter | | coat, gloves, scarf, hat, boots, mittens, sweater, jacket, beanie, earmuffs, thermal, parka, wool socks, hoodie
object/battery | 1 | daily | | Name something that uses batteries | | remote control, flashlight, phone, toys, clock, smoke detector, laptop, watch, camera, car, game controller, hearing aid, calculator, electric toothbrush
object/keys | 1 | daily | | Name something that has keys | | piano, keyboard, computer, car, door, lock, map, typewriter, house, calculator, accordion, organ, phone
# wild
wild/scared | 1 | daily | | Name something people are afraid of | | spiders, snakes, heights, the dark, clowns, death, public speaking, needles, flying, sharks, ghosts, failure, the dentist, bugs
wild/late | 1 | main | | Name a reason to be late | | traffic, overslept, car trouble, alarm didn't go off, bad weather, missed the bus, kids, lost keys, train delay, flat tire, sick, construction, accident
wild/hot | 1 | daily | | Name something hot | | sun, fire, oven, stove, coffee, lava, desert, soup, hot sauce, summer, tea, sauna, volcano, jalapeno
wild/green | 1 | daily | | Name something green | | grass, frog, broccoli, lime, leaf, tree, cucumber, money, kermit, shrek, avocado, lettuce, peas, the hulk, apple
wild/blue | 1 | daily | | Name something blue | | sky, ocean, water, blueberry, jeans, smurf, blue jay, sapphire, cookie monster, sonic, bluebird, police car, whale, ice
wild/pink | 1 | daily | | Name something pink | | flamingo, pig, cotton candy, bubble gum, barbie, flowers, roses, pink panther, peppa pig, piglet, lipstick, strawberry milk, salmon, pepto-bismol
wild/orange | 1 | daily | | Name something orange | | orange, carrot, pumpkin, basketball, goldfish, tiger, traffic cone, cheetos, fox, sunset, nemo, garfield, fanta, cheese
wild/purple | 1 | daily | | Name something purple | | grapes, eggplant, barney, violets, lavender, plum, amethyst, grimace, prince, purple heart, lilac, beets, cabbage, thanos
wild/white | 1 | daily | | Name something white | | snow, milk, paper, clouds, teeth, sugar, rice, polar bear, salt, cotton, eggs, ghost, swan, marshmallow
wild/black | 1 | daily | | Name something black | | night, coal, crow, tire, panther, ink, licorice, oil, black cat, darth vader, tuxedo, piano keys, raven, coffee
wild/soft | 1 | daily | | Name something soft | | pillow, blanket, cotton, teddy bear, feather, kitten, cloud, marshmallow, bed, fur, silk, bunny, slippers, towel
wild/loud | 1 | daily | | Name something loud | | thunder, fireworks, siren, jet, baby crying, alarm, concert, train, lion, rooster, drum, horn, motorcycle, jackhammer
wild/smelly | 1 | daily | | Name something smelly | | skunk, garbage, feet, socks, fart, onions, garlic, cheese, gym bag, dirty diaper, fish, sewer, rotten eggs, durian
wild/wings | 1 | daily | | Name something with wings | | bird, plane, butterfly, bee, bat, angel, fly, dragon, dragonfly, eagle, mosquito, pegasus, fairy, chicken
wild/legs | 1 | daily | | Name something with four legs | | dog, cat, table, chair, horse, cow, elephant, bed, lion, pig, sheep, giraffe, couch, frog
wild/holes | 1 | daily | | Name something with holes | | swiss cheese, sponge, donut, button, net, golf course, colander, strainer, bagel, shoes, belt, socks, cheerios, salt shaker
wild/sharp | 1 | daily | | Name something sharp | | knife, needle, scissors, sword, razor, axe, teeth, nails, thorn, pencil, glass, claws, saw, shark tooth
wild/fast | 1 | daily | | Name something fast | | cheetah, race car, jet, rocket, lightning, bullet, train, horse, usain bolt, the flash, sonic, falcon, motorcycle, sports car
wild/heavy | 1 | daily | | Name something heavy | | elephant, car, truck, rock, piano, whale, anvil, boulder, house, bowling ball, dumbbell, refrigerator, tank, building
wild/tiny | 1 | daily | | Name something tiny | | ant, mouse, atom, grain of sand, bug, flea, seed, cell, crumb, pebble, button, ladybug, germ, dust
wild/shiny | 1 | daily | | Name something shiny | | gold, diamond, mirror, silver, jewelry, glitter, coin, chrome, crystal, disco ball, trophy, foil, pearl, car
wild/wedding | 1 | daily | | Name something at a wedding | | bride, groom, cake, rings, flowers, dress, veil, priest, bouquet, dance, toast, champagne, photographer, bridesmaids
wild/rich | 1 | daily | | Name something rich people buy | | yacht, mansion, private jet, sports car, diamonds, rolex, island, lamborghini, art, ferrari, designer clothes, champagne, caviar, horse
wild/morning | 1 | daily | | Name something people do in the morning | | brush teeth, shower, eat breakfast, drink coffee, get dressed, wake up, exercise, check phone, make bed, read the news, walk the dog, commute
wild/excuse | 1 | daily | | Name an excuse for not doing homework | | the dog ate it, forgot, i was sick, left it at home, didn't understand it, power went out, too busy, computer crashed, lost it, my little brother ruined it, had practice, didn't know it was due
`;
