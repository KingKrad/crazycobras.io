// The prompt catalog, wave 3 (mostly the daily pool; thin topics first). Format: w01.js. Answer tiers for
// the hand-written ones are in hand6.js; the AI judge covers anything else real.
export const W03 = `
# drink
drink/tea2 | 1 | daily | | Name something people put in their tea | | sugar, milk, honey, lemon, cream, ice, mint, ginger, cinnamon, sweetener, splenda, boba
drink/coffeeadd | 1 | daily | | Name something people put in their coffee | | milk, cream, sugar, creamer, oat milk, caramel, vanilla, whipped cream, cinnamon, hazelnut, ice, honey
drink/starbucks | 1 | daily | | Name a Starbucks drink | | frappuccino, latte, pumpkin spice latte, caramel macchiato, cappuccino, americano, cold brew, pink drink, chai latte, mocha, refresher, flat white
drink/breakfast | 1 | daily | | Name a drink you have with breakfast | | coffee, orange juice, milk, tea, apple juice, water, chocolate milk, smoothie, hot chocolate, grapefruit juice, latte, mimosa
drink/mocktail | 2 | daily | | Name a non-alcoholic party drink | | punch, lemonade, shirley temple, virgin mojito, virgin pina colada, sparkling cider, arnold palmer, iced tea, root beer float, mocktail, roy rogers, kombucha
drink/brand-juice | 2 | daily | | Name a juice brand | | tropicana, minute maid, simply, ocean spray, mott's, welch's, v8, capri sun, hawaiian punch, sunny d, naked, juicy juice
drink/hotcocoa | 1 | daily | | Name a topping for hot chocolate | | marshmallows, whipped cream, chocolate shavings, sprinkles, cinnamon, peppermint, caramel, candy cane, cocoa powder, mini marshmallows, chocolate chips, nutmeg
# animals
animal/group | 2 | daily | | Name a group of animals word | | herd, flock, pack, school, pride, swarm, colony, gaggle, pod, litter, murder, troop
animal/stripes2 | 1 | daily | | Name an animal with spots | | leopard, cheetah, dalmatian, giraffe, ladybug, jaguar, cow, hyena, deer fawn, appaloosa, frog, whale shark
animal/fast | 1 | daily | | Name a fast animal | | cheetah, falcon, horse, greyhound, ostrich, sailfish, gazelle, antelope, rabbit, hare, lion, peregrine falcon
animal/slow | 1 | daily | | Name a slow animal | | sloth, snail, turtle, tortoise, slug, koala, starfish, manatee, slow loris, seahorse, caterpillar, worm
animal/venom | 2 | daily | | Name a venomous animal | | rattlesnake, cobra, black widow, scorpion, box jellyfish, king cobra, black mamba, brown recluse, stonefish, blue-ringed octopus, bee, wasp
animal/horns | 2 | daily | | Name an animal with horns or antlers | | rhino, deer, moose, goat, ram, bull, elk, antelope, bison, reindeer, yak, ibex
animal/hibernate | 2 | daily | | Name an animal that hibernates | | bear, groundhog, bat, hedgehog, chipmunk, squirrel, snake, frog, turtle, skunk, dormouse, ladybug
animal/eggs | 1 | daily | | Name an animal that lays eggs | | chicken, duck, snake, turtle, platypus, fish, frog, lizard, crocodile, ostrich, penguin, echidna
animal/mascot | 2 | daily | | Name an animal on a sports team logo | | eagle, bear, lion, tiger, panther, bull, falcon, dolphin, jaguar, ram, colt, bronco
animal/pokemonish | 2 | daily | | Name an animal that lives in a cave | | bat, cave salamander, spider, cave fish, bear, cricket, olm, scorpion, millipede, snake, centipede, rat
# people
people/firstname | 1 | daily | | Name a person known by one name | | madonna, cher, adele, beyonce, rihanna, prince, drake, oprah, pele, bono, shakira, zendaya
people/twins | 2 | daily | | Name a famous duo | | batman and robin, salt and pepper, peanut butter and jelly, simon and garfunkel, tom and jerry, mario and luigi, bert and ernie, sonny and cher, laurel and hardy, hall and oates, thelma and louise, romeo and juliet
people/villain-real | 2 | daily | | Name a famous outlaw or gangster | | al capone, billy the kid, jesse james, bonnie and clyde, john dillinger, butch cassidy, ned kelly, pablo escobar, john gotti, baby face nelson, pretty boy floyd, dick turpin
people/philosopher2 | 2 | daily | | Name an ancient Greek or Roman | | socrates, plato, aristotle, julius caesar, alexander the great, homer, archimedes, pythagoras, augustus, nero, cicero, hippocrates
people/legend | 2 | daily | | Name a legendary hero | | hercules, king arthur, robin hood, achilles, odysseus, perseus, beowulf, paul bunyan, john henry, davy crockett, merlin, joan of arc
people/singer-icon | 1 | daily | | Name a famous singer who died young | | elvis presley, michael jackson, whitney houston, amy winehouse, kurt cobain, tupac, biggie, prince, janis joplin, jimi hendrix, selena, buddy holly
# sports
sport/ball | 1 | daily | | Name a sport played with a racket | | tennis, badminton, squash, racquetball, pickleball, table tennis, ping pong, padel, paddle tennis, platform tennis, lacrosse, jai alai
sport/position-bb | 2 | daily | | Name a position in sports | | quarterback, pitcher, goalie, point guard, catcher, striker, shortstop, center, linebacker, wide receiver, defender, midfielder
sport/equipment2 | 1 | daily | | Name something you need to play baseball | | bat, ball, glove, mitt, helmet, bases, cleats, catcher's mask, uniform, pitcher's mound, chest protector, batting gloves
sport/team-city | 2 | daily | | Name a Chicago or Boston sports team | | chicago bulls, chicago cubs, chicago bears, white sox, blackhawks, boston celtics, red sox, new england patriots, bruins, chicago fire, new england revolution, chicago sky
sport/hockey | 2 | daily | | Name a hockey term | | puck, goal, hat trick, slap shot, power play, penalty box, icing, offside, face-off, zamboni, assist, overtime
sport/soccer-term | 2 | daily | | Name a soccer term | | goal, penalty kick, offside, red card, yellow card, header, corner kick, free kick, goalkeeper, hat trick, bicycle kick, extra time
sport/basketball2 | 2 | main | =sportterm/basketball | Name a basketball move | | dunk, layup, crossover, free throw, three-pointer, alley-oop, jump shot, fadeaway, bounce pass, block, rebound, hook shot
sport/gym | 1 | daily | | Name a gym exercise | | push-up, squat, sit-up, plank, lunge, burpee, pull-up, bench press, deadlift, jumping jacks, crunches, bicep curl
sport/olympian2 | 2 | daily | | Name an Olympic track and field event | | 100 meters, marathon, long jump, high jump, pole vault, javelin, shot put, discus, hurdles, relay, triple jump, decathlon
sport/pro-skater | 2 | daily | | Name a famous skateboarder, surfer or snowboarder | | tony hawk, shaun white, kelly slater, nyjah huston, rodney mullen, bethany hamilton, chloe kim, rob dyrdek, bam margera, duke kahanamoku, laird hamilton, ryan sheckler
# brands
brand/fastfood-item | 1 | daily | | Name a famous fast food menu item | | big mac, whopper, frosty, crunchwrap supreme, chicken mcnuggets, happy meal, mcflurry, baconator, quarter pounder, chalupa, filet-o-fish, blizzard
brand/icecreambrand | 2 | daily | | Name an ice cream brand | | ben & jerry's, haagen-dazs, baskin-robbins, breyers, blue bell, dairy queen, cold stone, talenti, tillamook, turkey hill, dreyer's, magnum
brand/tech-gadget | 1 | daily | | Name an Apple product | | iphone, ipad, macbook, apple watch, airpods, imac, ipod, apple tv, homepod, mac mini, vision pro, magic mouse
brand/console-game | 2 | main | =object/toy | Name a toy from the '80s or '90s | | rubik's cube, cabbage patch kids, furby, tamagotchi, tickle me elmo, beanie babies, teddy ruxpin, game boy, polly pocket, my little pony, transformers, pogs
# science
science/rock2 | 2 | daily | | Name something found underground | | dirt, rocks, worms, roots, water, oil, gold, coal, fossils, diamonds, bones, pipes
science/plant | 1 | daily | | Name a part of a plant | | leaf, stem, root, flower, seed, petal, fruit, branch, thorn, bud, pollen, bark
science/doctor | 2 | main | =job/job | Name a kind of doctor | | dentist, surgeon, pediatrician, dermatologist, cardiologist, veterinarian, optometrist, psychiatrist, neurologist, orthodontist, chiropractor, oncologist
science/energy2 | 2 | main | =object/appliance | Name something that runs on electricity | | lights, tv, computer, refrigerator, phone charger, microwave, electric car, oven, fan, air conditioner, washing machine, toaster
science/simple | 2 | daily | | Name a simple machine or tool for moving things | | lever, pulley, wheel and axle, ramp, inclined plane, wedge, screw, wheelbarrow, seesaw, crane, dolly, forklift
science/dinosaur2 | 2 | daily | | Name a prehistoric animal that isn't a dinosaur | | woolly mammoth, saber-toothed tiger, pterodactyl, megalodon, dodo, mastodon, plesiosaur, woolly rhino, giant sloth, mosasaur, dire wolf, trilobite
# objects
object/bathroom2 | 1 | daily | | Name something you use in the shower | | soap, shampoo, conditioner, body wash, loofah, towel, razor, washcloth, shower cap, sponge, face wash, shower gel
object/livingroom | 1 | daily | | Name something in a living room | | couch, tv, coffee table, lamp, rug, remote, armchair, bookshelf, pillows, fireplace, curtains, plants
object/camping2 | 1 | daily | | Name something you need for a picnic | | blanket, basket, sandwiches, plates, napkins, cooler, drinks, fruit, chips, cups, sunscreen, bug spray
object/beachbag | 1 | main | =wild/pack | Name something you'd pack for a sleepover | | pajamas, toothbrush, pillow, sleeping bag, toothpaste, clothes, phone charger, snacks, slippers, blanket, stuffed animal, movies
object/tools2 | 2 | daily | | Name something with a blade | | knife, scissors, razor, sword, lawn mower, blender, axe, saw, fan, ice skate, scythe, propeller
object/paper | 1 | daily | | Name something made of paper | | book, newspaper, money, napkin, paper towel, tissue, envelope, cardboard box, notebook, cup, paper plane, poster
object/wood | 1 | daily | | Name something made of wood | | table, chair, pencil, door, house, baseball bat, floor, desk, fence, boat, guitar, toothpick
object/glass | 1 | daily | | Name something made of glass | | window, mirror, cup, bottle, light bulb, glasses, jar, vase, phone screen, windshield, fish tank, marbles
object/plastic | 1 | daily | | Name something made of plastic | | bottle, bag, straw, toys, lego, cup, credit card, phone case, container, fork, chair, bucket
object/metal | 1 | daily | | Name something made of metal | | car, spoon, fork, knife, coin, key, nail, can, door handle, bike, pan, jewelry
object/rubber | 2 | daily | | Name something made of rubber | | tire, ball, eraser, rubber band, rubber duck, boots, gloves, balloon, band, hose, flip flops, bouncy ball
# wild
wild/clean | 1 | daily | | Name something people clean every week | | dishes, bathroom, floors, car, clothes, kitchen, toilet, windows, bedroom, sheets, house, fridge
wild/lost | 1 | daily | | Name something people often lose | | keys, phone, wallet, glasses, socks, remote, sunglasses, umbrella, earrings, airpods, gloves, temper
wild/forget | 1 | daily | | Name something people forget to bring on vacation | | toothbrush, charger, sunscreen, passport, toothpaste, pajamas, underwear, socks, swimsuit, medicine, glasses, deodorant
wild/fridge-door | 1 | daily | | Name something on a refrigerator door | | magnets, photos, drawings, calendar, notes, grocery list, menus, coupons, report card, invitations, shopping list, kids' art
wild/countup | 1 | daily | | Name something people count | | money, sheep, calories, days, steps, votes, change, cards, stars, birthdays, sheep to fall asleep, the days until christmas
wild/break | 1 | daily | | Name something that can break | | glass, mirror, heart, bone, phone, window, egg, record, promise, plate, bank, a habit
wild/open | 1 | daily | | Name something you open | | door, window, box, book, jar, present, mouth, eyes, bottle, laptop, envelope, gift
wild/fold | 1 | daily | | Name something you fold | | laundry, clothes, paper, napkin, towels, map, letter, origami, arms, chair, table, sheets
wild/blow | 1 | daily | | Name something you blow | | bubbles, candles, nose, balloon, kiss, whistle, horn, dandelion, bubble gum, trumpet, wind, glass
wild/pull | 1 | daily | | Name something you pull | | rope, door, wagon, tooth, leg, a muscle, hair, string, trigger, weeds, a prank, an all-nighter
wild/kids | 1 | daily | | Name something kids collect | | pokemon cards, stickers, rocks, shells, coins, stamps, toys, baseball cards, legos, stuffed animals, marbles, beanie babies
wild/birthday | 1 | daily | | Name a birthday party activity | | games, cake, presents, singing, pinata, balloons, bounce house, musical chairs, pin the tail on the donkey, face painting, magic show, opening presents
wild/summer | 1 | daily | | Name something you do in summer | | swim, go to the beach, barbecue, camping, vacation, eat ice cream, fireworks, fishing, go to the pool, hiking, sunbathe, water balloon fight
wild/winter2 | 1 | daily | | Name something you do in winter | | build a snowman, go sledding, ski, ice skate, snowball fight, drink hot chocolate, shovel snow, snowboard, sit by the fire, wear a coat, celebrate christmas, make snow angels
wild/rainyday | 1 | daily | | Name something to do on a rainy day | | watch a movie, read a book, play board games, sleep, bake cookies, play video games, puzzle, take a nap, watch tv, draw, cook, build a fort
wild/saynight | 1 | daily | | Name something people do before bed | | brush teeth, read, shower, put on pajamas, set an alarm, pray, watch tv, check phone, wash face, drink water, turn off lights, say goodnight
wild/jobsuniform | 2 | main | =job/job | Name a job where you wear a uniform | | police officer, firefighter, nurse, doctor, soldier, pilot, chef, mail carrier, flight attendant, security guard, waiter, athlete
wild/jobskids | 1 | main | =job/job | Name a job kids dream of having | | astronaut, firefighter, doctor, teacher, police officer, veterinarian, athlete, youtuber, actor, singer, pilot, president
wild/sounds | 1 | daily | | Name a sound in the city | | car horn, siren, traffic, sirens, people talking, music, construction, sirens wailing, buses, trains, dogs barking, honking
wild/circus | 1 | daily | | Name something you'd see at a circus | | clown, elephant, lion, tightrope walker, acrobat, ringmaster, trapeze, juggler, tent, popcorn, cotton candy, unicycle
wild/fair | 1 | daily | | Name something at a county fair | | ferris wheel, funnel cake, corn dog, cotton candy, rides, games, pigs, cows, prizes, carousel, livestock, petting zoo
wild/dream | 2 | daily | | Name something people dream about | | falling, flying, teeth falling out, being chased, school, ex, money, celebrities, being naked, food, monsters, the future
`;
