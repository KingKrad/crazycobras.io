// The prompt catalog, wave 5: one-show / one-franchise prompts (flag 1: at most one per race). Each
// franchise is its own group. Format: w01.js; the AI judge covers answers beyond the obvious ones.
export const W05 = `
# screen
seinfeld/chars | 1 | main | 1 | Name a Seinfeld character | | jerry, george, elaine, kramer, newman, frank costanza, estelle costanza, uncle leo, the soup nazi, david puddy, j. peterman, mr. pitt
bigbang/chars | 1 | main | 1 | Name a Big Bang Theory character | | sheldon, leonard, penny, howard, raj, amy, bernadette, stuart, wil wheaton, leslie winkle, mrs. cooper, barry kripke
modernfamily/chars | 1 | main | 1 | Name a Modern Family character | | phil, claire, jay, gloria, mitchell, cameron, haley, alex, luke, manny, lily, joe
parksrec/chars | 1 | daily | 1 | Name a Parks and Recreation character | | leslie knope, ron swanson, april ludgate, andy dwyer, tom haverford, ben wyatt, ann perkins, chris traeger, donna meagle, jerry gergich, jean-ralphio, tammy
himym/chars | 1 | daily | 1 | Name a How I Met Your Mother character | | ted mosby, barney stinson, marshall eriksen, lily aldrin, robin scherbatsky, tracy, ranjit, victoria, zoey, stella, patrice, the captain
b99/chars | 1 | daily | 1 | Name a Brooklyn Nine-Nine character | | jake peralta, amy santiago, rosa diaz, terry jeffords, captain holt, charles boyle, gina linetti, hitchcock, scully, doug judy, kevin cozner, cheddar
avatar/chars | 1 | main | 1 | Name an Avatar: The Last Airbender character | | aang, katara, sokka, zuko, toph, iroh, azula, appa, momo, suki, ty lee, mai
bobs/chars | 2 | daily | 1 | Name a Bob's Burgers character | | bob, linda, tina, gene, louise, teddy, jimmy pesto, mort, mr. fischoeder, gayle, zeke, andy and ollie
futurama/chars | 2 | daily | 1 | Name a Futurama character | | fry, leela, bender, professor farnsworth, zoidberg, amy, hermes, nibbler, zapp brannigan, kif, mom, scruffy
scooby/chars | 1 | main | 1 | Name a Scooby-Doo character | | scooby-doo, shaggy, fred, daphne, velma, scrappy-doo, the mystery machine, scooby-dum, mr. jenkins, the creeper, the black knight, the ghost clown
peanuts/chars | 1 | daily | 1 | Name a Peanuts character | | charlie brown, snoopy, lucy, linus, woodstock, peppermint patty, sally, schroeder, marcie, pig-pen, franklin, the little red-haired girl
pooh/chars | 1 | daily | 1 | Name a Winnie the Pooh character | | winnie the pooh, piglet, tigger, eeyore, christopher robin, rabbit, owl, kanga, roo, heffalump, woozle, gopher
frozen/chars | 1 | main | 1 =character/disney | Name a Frozen character | | elsa, anna, olaf, kristoff, sven, hans, the duke of weselton, oaken, pabbie, bruni, the nokk, marshmallow
lionking/chars | 1 | main | 1 =character/disney | Name a Lion King character | | simba, mufasa, scar, nala, timon, pumbaa, rafiki, zazu, sarabi, shenzi, banzai, ed
despicable/chars | 1 | daily | 1 | Name a Despicable Me character | | gru, the minions, kevin, stuart, bob, agnes, margo, edith, dr. nefario, vector, lucy, el macho
tmnt/chars | 1 | daily | 1 | Name a Teenage Mutant Ninja Turtles character | | leonardo, donatello, raphael, michelangelo, splinter, shredder, april o'neil, casey jones, krang, bebop, rocksteady, the foot clan
xmen/chars | 2 | main | 1 =character/marvel | Name an X-Men character | | wolverine, professor x, magneto, storm, cyclops, jean grey, rogue, gambit, beast, mystique, nightcrawler, iceman
transformers/chars | 2 | daily | 1 | Name a Transformers character | | optimus prime, bumblebee, megatron, starscream, jazz, ironhide, ratchet, soundwave, shockwave, grimlock, hot rod, devastator
powerrangers/chars | 2 | daily | 1 | Name a Power Rangers character or villain | | red ranger, blue ranger, pink ranger, yellow ranger, black ranger, green ranger, zordon, alpha 5, rita repulsa, lord zedd, goldar, tommy oliver
sonic/chars | 1 | daily | 1 | Name a Sonic the Hedgehog character | | sonic, tails, knuckles, dr. eggman, amy rose, shadow, rouge, silver, cream, big the cat, metal sonic, chaos
minecraft/mobs | 1 | main | 1 | Name a Minecraft mob or creature | | creeper, zombie, skeleton, enderman, spider, villager, pig, cow, sheep, chicken, wither, ender dragon
fortnite/items | 2 | daily | 1 | Name something from Fortnite | | battle bus, victory royale, the storm, peely, jonesy, llama, chug jug, slurp juice, tilted towers, floss, default dance, shield potion
amongus/things | 2 | daily | 1 | Name something from Roblox, Among Us or Minecraft | | impostor, crewmate, emergency meeting, vents, robux, oof, adopt me, brookhaven, diamond, creeper, steve, redstone
gilmore/chars | 2 | daily | 1 | Name a Gilmore Girls character | | lorelai, rory, luke, emily, richard, sookie, paris, lane, dean, jess, logan, kirk
greys/chars | 2 | daily | 1 | Name a Grey's Anatomy character | | meredith grey, derek shepherd, cristina yang, miranda bailey, alex karev, george o'malley, izzie stevens, richard webber, mark sloan, arizona robbins, callie torres, owen hunt
oz/chars | 1 | daily | 1 | Name a Wizard of Oz character | | dorothy, toto, the scarecrow, the tin man, the cowardly lion, the wizard, glinda, the wicked witch of the west, the munchkins, the flying monkeys, auntie em, the wicked witch of the east
alice/chars | 1 | daily | 1 | Name an Alice in Wonderland character | | alice, the mad hatter, the white rabbit, the cheshire cat, the queen of hearts, the caterpillar, the march hare, the dormouse, tweedledee, tweedledum, the king of hearts, the jabberwock
peterpan/chars | 1 | daily | 1 | Name a Peter Pan character | | peter pan, tinker bell, captain hook, wendy, john, michael, the lost boys, smee, tiger lily, nana, the crocodile, tick-tock
hungergames/chars | 2 | daily | 1 | Name a Hunger Games character | | katniss everdeen, peeta mellark, gale hawthorne, haymitch, effie trinket, president snow, primrose, rue, cinna, finnick odair, johanna mason, caesar flickerman
twilight/chars | 2 | daily | 1 | Name a Twilight character | | bella swan, edward cullen, jacob black, alice cullen, carlisle, esme, rosalie, emmett, jasper, charlie swan, renesmee, victoria
percy/chars | 2 | daily | 1 | Name a Percy Jackson character | | percy jackson, annabeth chase, grover, luke castellan, chiron, poseidon, zeus, hades, thalia, nico di angelo, tyson, clarisse
pawpatrol/chars | 1 | daily | 1 | Name a Paw Patrol pup or character | | chase, marshall, skye, rocky, rubble, zuma, everest, tracker, ryder, mayor goodway, mayor humdinger, chickaletta
bluey/chars | 1 | daily | 1 | Name a Bluey character | | bluey, bingo, bandit, chilli, muffin, socks, stripe, trixie, nana, coco, snickers, mackenzie
peppa/chars | 1 | daily | 1 | Name a Peppa Pig character | | peppa, george, mummy pig, daddy pig, suzy sheep, rebecca rabbit, danny dog, pedro pony, grandpa pig, granny pig, madame gazelle, mr. dinosaur
thomas/chars | 2 | daily | 1 | Name a Thomas the Tank Engine character | | thomas, percy, gordon, james, henry, edward, toby, emily, diesel, the fat controller, harold, bertie
naruto/chars | 2 | daily | 1 | Name a Naruto character | | naruto, sasuke, sakura, kakashi, itachi, gaara, hinata, jiraiya, orochimaru, madara, shikamaru, rock lee
dbz/chars | 2 | daily | 1 | Name a Dragon Ball character | | goku, vegeta, gohan, piccolo, frieza, cell, majin buu, trunks, krillin, bulma, goten, beerus
onepiece/chars | 2 | daily | 1 | Name a One Piece character | | luffy, zoro, nami, sanji, usopp, chopper, robin, franky, brook, jinbe, shanks, ace
streetfighter/chars | 2 | daily | 1 | Name a fighting game character | | ryu, ken, chun-li, guile, blanka, m. bison, scorpion, sub-zero, liu kang, raiden, sonya blade, kazuya
smash/chars | 1 | main | 1 =game/nintendo | Name a Mario character | | mario, luigi, princess peach, bowser, yoshi, toad, wario, waluigi, daisy, donkey kong, bowser jr., rosalina
zelda/chars | 2 | main | 1 =game/nintendo | Name a Legend of Zelda character | | link, zelda, ganon, ganondorf, navi, epona, impa, midna, tingle, the great deku tree, sheik, king rhoam
gta/things | 2 | daily | 1 | Name something from Grand Theft Auto | | vice city, san andreas, los santos, liberty city, cj, trevor, michael, franklin, tommy vercetti, niko bellic, big smoke, wasted
office/uk | 2 | daily | 1 | Name a Friends or Office catchphrase | | how you doin', we were on a break, pivot, that's what she said, oh my god, joey doesn't share food, bears beets battlestar galactica, identity theft is not a joke, smelly cat, could i be wearing any more clothes, unagi, i declare bankruptcy
sopranos/chars | 2 | daily | 1 | Name a Sopranos or Godfather character | | tony soprano, carmela, christopher, paulie, silvio, uncle junior, vito corleone, michael corleone, sonny, fredo, tom hagen, kay
mandalorian/chars | 2 | daily | 1 | Name a Star Wars planet or place | | tatooine, hoth, endor, naboo, coruscant, dagobah, alderaan, death star, mustafar, kashyyyk, jakku, bespin
lotr/places | 2 | daily | 1 | Name a place in Middle-earth | | the shire, mordor, rivendell, gondor, rohan, mount doom, minas tirith, isengard, moria, lothlorien, helm's deep, bag end
hp/places | 1 | daily | 1 | Name a place in the Harry Potter world | | hogwarts, diagon alley, hogsmeade, azkaban, gringotts, the burrow, platform 9 3/4, the forbidden forest, the leaky cauldron, the ministry of magic, privet drive, the great hall
hp/spells | 2 | daily | 1 | Name a Harry Potter spell | | expelliarmus, wingardium leviosa, avada kedavra, expecto patronum, lumos, alohomora, accio, stupefy, crucio, imperio, obliviate, sectumsempra
marvel/avengers | 1 | main | 1 =character/marvel | Name an Avenger | | iron man, captain america, thor, hulk, black widow, hawkeye, spider-man, black panther, scarlet witch, vision, ant-man, doctor strange
dc/justice | 2 | main | 1 =character/dc | Name a Batman villain | | the joker, the penguin, catwoman, the riddler, two-face, bane, poison ivy, harley quinn, mr. freeze, scarecrow, ra's al ghul, killer croc
spidey/chars | 2 | main | 1 =character/marvel | Name a Spider-Man character | | peter parker, mary jane, aunt may, green goblin, doctor octopus, venom, j. jonah jameson, miles morales, gwen stacy, the vulture, electro, sandman
starwars/vehicles | 2 | daily | 1 | Name a Star Wars ship or vehicle | | millennium falcon, x-wing, tie fighter, star destroyer, death star, at-at, slave i, speeder bike, y-wing, snowspeeder, at-st, razor crest
pokemon/types | 2 | daily | 1 | Name a Pokémon type | | fire, water, grass, electric, psychic, ghost, dragon, fighting, normal, ice, poison, rock
simpsons/places | 2 | daily | 1 | Name a place in Springfield (The Simpsons) | | moe's tavern, kwik-e-mart, krusty burger, springfield elementary, the nuclear power plant, the simpsons' house, springfield retirement castle, the android's dungeon, lard lad donuts, flanders' house, the leftorium, shelbyville
looney/places | 2 | daily | 1 | Name a SpongeBob place or thing | | the krusty krab, the chum bucket, bikini bottom, pineapple under the sea, krabby patty, jellyfish fields, goo lagoon, the secret formula, mrs. puff's boating school, rock bottom, glove world, squidward's house
disney/films2 | 1 | main | 1 =character/disney | Name a Disney sidekick | | olaf, timon, pumbaa, mushu, abu, iago, sebastian, flounder, genie, pascal, sven, heihei
cars/chars | 1 | main | 1 =character/pixar | Name a character from Pixar's Cars | | lightning mcqueen, mater, sally, doc hudson, luigi, guido, ramone, flo, fillmore, sarge, chick hicks, the king
shrek/films2 | 2 | main | 1 =character/muppet | Name a Muppets or Sesame Street character | | kermit, miss piggy, fozzie bear, gonzo, animal, elmo, big bird, cookie monster, oscar the grouch, bert, ernie, the swedish chef
# music
song/billy | 2 | daily | 1 | Name a Billy Joel song | | piano man, uptown girl, we didn't start the fire, vienna, only the good die young, just the way you are, my life, she's always a woman, movin' out, the longest time, scenes from an italian restaurant, it's still rock and roll to me
song/eagles | 2 | daily | 1 | Name an Eagles song | | hotel california, take it easy, desperado, life in the fast lane, one of these nights, lyin' eyes, witchy woman, peaceful easy feeling, take it to the limit, already gone, new kid in town, heartache tonight
song/backstreet | 1 | daily | 1 | Name a Backstreet Boys or NSYNC song | | i want it that way, everybody, bye bye bye, tearin' up my heart, larger than life, it's gonna be me, quit playing games, as long as you love me, girlfriend, show me the meaning of being lonely, pop, this i promise you
song/postmalone | 1 | daily | 1 | Name a Post Malone song | | circles, sunflower, rockstar, congratulations, better now, psycho, white iverson, i fall apart, wow, goodbyes, i had some help, chemical
song/doja | 2 | daily | 1 | Name a Doja Cat song | | say so, kiss me more, woman, need to know, paint the town red, streets, agora hills, juicy, mooo!, like that, boss b*tch, rules
song/sza | 2 | daily | 1 | Name a SZA song | | kill bill, snooze, good days, the weekend, saturn, love galore, broken clocks, i hate u, nobody gets me, drew barrymore, supermodel, all the stars
song/badbunny | 2 | daily | 1 | Name a Bad Bunny song | | tití me preguntó, dákiti, me porto bonito, mia, callaita, yonaguni, i like it, la canción, safaera, moscow mule, ojitos lindos, monaco
song/imagine | 2 | daily | 1 | Name an Imagine Dragons song | | radioactive, believer, thunder, demons, enemy, bones, natural, it's time, whatever it takes, bad liar, on top of the world, sharks
song/maroon5 | 2 | daily | 1 | Name a Maroon 5 song | | moves like jagger, sugar, this love, she will be loved, girls like you, payphone, memories, animals, one more night, harder to breathe, makes me wonder, maps
song/journey | 2 | daily | 1 | Name a Journey or Bon Jovi song | | don't stop believin', open arms, faithfully, any way you want it, separate ways, wheel in the sky, livin' on a prayer, it's my life, you give love a bad name, wanted dead or alive, bad medicine, always
song/chili | 3 | hard | 1 | Name a Weezer song | | buddy holly, say it ain't so, undone, island in the sun, beverly hills, hash pipe, pork and beans, africa, the good life, el scorcho, my name is jonas, perfect situation
song/swiftalbum | 1 | main | 1 | Name a Taylor Swift album | | fearless, speak now, red, 1989, reputation, lover, folklore, evermore, midnights, the tortured poets department, taylor swift, the life of a showgirl
song/beatlesalbum | 2 | daily | 1 | Name a Beatles album | | abbey road, sgt. pepper's lonely hearts club band, the white album, revolver, rubber soul, let it be, help!, a hard day's night, please please me, magical mystery tour, yellow submarine, with the beatles
song/broadwaymusical | 2 | daily | 1 =music/showtune | Name a song from Hamilton | | my shot, alexander hamilton, satisfied, wait for it, the room where it happens, you'll be back, helpless, non-stop, the schuyler sisters, dear theodosia, burn, yorktown
song/disney2 | 1 | main | 1 =song/disney | Name a song from a Disney movie | | let it go, under the sea, hakuna matata, a whole new world, circle of life, part of your world, how far i'll go, we don't talk about bruno, be our guest, you've got a friend in me, beauty and the beast, colors of the wind
`;
