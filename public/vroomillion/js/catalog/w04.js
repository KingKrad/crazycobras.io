// The prompt catalog, wave 4 (daily pool: angles that can't be twins of the broad lists). Format: w01.js.
// Hand-written families carry only their obvious answers; the AI judge covers the rest.
export const W04 = `
# food
food/hands | 1 | daily | | Name a food you eat with your hands | | pizza, burger, sandwich, tacos, chicken wings, french fries, hot dog, ribs, sushi, apple, corn on the cob, chips
food/chopsticks | 2 | daily | | Name a food you eat with chopsticks | | sushi, noodles, ramen, rice, dumplings, lo mein, sashimi, stir fry, pho, udon, edamame, bao
food/spoon | 1 | daily | | Name a food you eat with a spoon | | soup, cereal, ice cream, yogurt, pudding, oatmeal, jello, chili, rice, mashed potatoes, applesauce, cottage cheese
food/crunchy | 1 | daily | | Name a crunchy food | | chips, carrots, apple, celery, popcorn, pretzels, crackers, nuts, cereal, croutons, granola, pickles
food/sour | 1 | daily | | Name a sour food | | lemon, lime, sour candy, pickles, grapefruit, vinegar, sour cream, warheads, sauerkraut, yogurt, kimchi, green apple
food/eggs | 1 | daily | | Name something made with eggs | | omelette, cake, quiche, mayonnaise, custard, french toast, pancakes, meringue, egg salad, deviled eggs, eggnog, carbonara
food/flour | 1 | daily | | Name something made with flour | | bread, cake, cookies, pasta, pizza dough, pancakes, muffins, tortillas, biscuits, pie crust, bagels, noodles
food/corn | 2 | daily | | Name a food made from corn | | popcorn, tortillas, corn chips, cornbread, grits, polenta, corn flakes, corn dogs, tamales, nachos, corn syrup, cornstarch
food/milk | 1 | daily | | Name a food made from milk | | cheese, butter, yogurt, ice cream, cream, sour cream, cottage cheese, whipped cream, custard, pudding, kefir, ghee
food/grill | 1 | daily | | Name something you'd cook on a grill | | burgers, hot dogs, steak, chicken, corn, ribs, sausages, shrimp, kebabs, salmon, vegetables, pineapple
food/cookout | 1 | daily | | Name a food at a summer cookout | | burgers, hot dogs, potato salad, coleslaw, watermelon, corn on the cob, baked beans, chips, ribs, pasta salad, deviled eggs, s'mores
food/ballgame | 1 | daily | | Name a food you'd eat at a baseball game | | hot dog, peanuts, popcorn, nachos, cracker jack, pretzel, beer, cotton candy, sunflower seeds, hamburger, ice cream, pizza
food/dip | 1 | daily | | Name something you dip | | chips, fries, chicken nuggets, carrots, cookies, bread, veggies, pretzels, strawberries, crackers, mozzarella sticks, tortilla chips
food/dipping | 1 | main | =sauce/sauce | Name a dip | | salsa, guacamole, ranch, queso, hummus, french onion dip, spinach dip, cheese dip, bean dip, tzatziki, artichoke dip, honey mustard
food/toast2 | 1 | daily | | Name a sandwich filling | | ham, turkey, cheese, peanut butter, jelly, tuna, chicken salad, egg salad, bacon, lettuce, tomato, roast beef
food/salty | 1 | main | =snack/snack | Name a salty snack | | chips, pretzels, popcorn, peanuts, crackers, beef jerky, pork rinds, olives, goldfish, cheez-its, cashews, trail mix
food/canned | 1 | daily | | Name a food that comes in a can | | soup, tuna, beans, corn, spam, peas, tomatoes, peaches, chili, green beans, cranberry sauce, coconut milk
food/fried | 1 | daily | | Name a food that's usually deep fried | | french fries, fried chicken, donuts, onion rings, mozzarella sticks, fish and chips, tempura, churros, corn dogs, egg rolls, funnel cake, hush puppies
food/leftover | 1 | daily | | Name a food that tastes better the next day | | pizza, chili, lasagna, soup, curry, stew, spaghetti, fried rice, meatloaf, mac and cheese, casserole, cake
food/dessertnight | 2 | daily | | Name a food you'd find at a buffet | | mashed potatoes, mac and cheese, fried chicken, salad, rolls, pasta, roast beef, shrimp, fried rice, pizza, ice cream, crab legs
food/wrapped | 2 | daily | | Name a food wrapped in something | | burrito, egg roll, sushi, taco, spring roll, dumpling, pigs in a blanket, wrap, tamale, samosa, crepe, gyro
food/stuffed | 2 | daily | | Name a food that's stuffed | | turkey, stuffed peppers, ravioli, calzone, jalapeno poppers, stuffed mushrooms, cannoli, empanada, twinkie, pierogi, dumplings, stuffed crust pizza
food/sticks | 2 | daily | | Name a food on a stick | | corn dog, kebab, popsicle, lollipop, cake pop, candy apple, satay, cotton candy, fudgesicle, chocolate-covered banana, skewers, s'mores
food/bread-spread | 1 | main | =breakfast/breakfast | Name something you spread on bread | | butter, peanut butter, jam, jelly, nutella, cream cheese, mayo, honey, mustard, avocado, margarine, hummus
# drink
drink/cold | 1 | daily | | Name a drink you'd have on a hot day | | lemonade, iced tea, water, soda, smoothie, slushie, iced coffee, gatorade, milkshake, coconut water, popsicle, frozen margarita
drink/sick | 1 | daily | | Name something you drink when you're sick | | tea, water, soup, ginger ale, orange juice, gatorade, honey and lemon, chicken broth, sprite, pedialyte, hot toddy, medicine
drink/mug | 1 | daily | | Name a drink you'd drink from a mug | | coffee, tea, hot chocolate, cocoa, latte, cider, beer, chai, soup, hot toddy, eggnog, mulled wine
drink/straw | 1 | daily | | Name a drink you'd drink through a straw | | smoothie, milkshake, soda, juice box, boba, slushie, iced coffee, capri sun, lemonade, frappuccino, margarita, iced tea
drink/can | 1 | daily | | Name a drink that comes in a can | | soda, beer, energy drink, coke, red bull, sparkling water, la croix, iced tea, juice, coffee, ginger ale, seltzer
drink/fizzy | 1 | main | =softdrink/softdrink | Name a fizzy drink | | soda, sparkling water, champagne, ginger ale, root beer, seltzer, kombucha, tonic water, beer, club soda, sprite, coke
drink/caffeine | 1 | daily | | Name something with caffeine | | coffee, tea, energy drink, soda, chocolate, red bull, monster, espresso, matcha, coke, mountain dew, pre-workout
# animals
animal/stripes3 | 1 | daily | | Name an animal with a long tail | | monkey, cat, lizard, mouse, kangaroo, crocodile, horse, squirrel, lion, peacock, rat, cheetah
animal/neck | 1 | daily | | Name an animal with a long neck | | giraffe, swan, flamingo, ostrich, llama, camel, brachiosaurus, goose, heron, alpaca, emu, crane
animal/fur | 1 | daily | | Name a fluffy animal | | bunny, cat, puppy, sheep, panda, chinchilla, alpaca, hamster, koala, llama, persian cat, samoyed
animal/wild-pet | 2 | daily | | Name an animal that would be a bad pet | | lion, tiger, bear, shark, crocodile, skunk, elephant, gorilla, wolf, snake, hippo, porcupine
animal/swim | 1 | daily | | Name an animal that can swim | | fish, dolphin, duck, dog, penguin, otter, seal, whale, frog, polar bear, turtle, beaver
animal/climb | 2 | daily | | Name an animal that climbs trees | | monkey, squirrel, cat, koala, sloth, leopard, raccoon, bear, gecko, orangutan, possum, lemur
animal/jump | 1 | daily | | Name an animal that jumps | | kangaroo, frog, rabbit, grasshopper, flea, cricket, deer, dolphin, goat, cat, horse, wallaby
animal/pack | 2 | daily | | Name an animal that lives in a group | | wolf, lion, ant, bee, elephant, penguin, fish, sheep, dolphin, meerkat, gorilla, zebra
animal/eat | 2 | daily | | Name an animal that eats insects | | frog, lizard, bat, anteater, bird, spider, chameleon, gecko, aardvark, pangolin, armadillo, toad
animal/colours | 1 | daily | | Name a colourful animal | | parrot, peacock, flamingo, toucan, butterfly, chameleon, clownfish, macaw, mandrill, poison dart frog, ladybug, hummingbird
animal/scary | 1 | daily | | Name an animal people are scared of | | shark, snake, spider, bear, crocodile, wolf, bat, rat, scorpion, lion, alligator, tiger
animal/small | 1 | daily | | Name a small animal | | mouse, hamster, ant, rabbit, squirrel, chipmunk, hummingbird, frog, gerbil, ladybug, guinea pig, kitten
animal/huge | 1 | daily | | Name a huge animal | | elephant, blue whale, giraffe, hippo, rhino, whale shark, moose, polar bear, gorilla, giant squid, dinosaur, walrus
# places
place/kitchen | 1 | daily | | Name a room in a hotel or resort | | lobby, pool, gym, spa, restaurant, bar, suite, ballroom, conference room, laundry room, business center, kitchen
place/mall | 1 | main | =brand/store | Name a store you'd find at the mall | | gap, h&m, foot locker, apple store, victoria's secret, american eagle, zara, macy's, sephora, gamestop, old navy, bath & body works
place/store | 1 | daily | | Name something you'd buy at a gas station | | gas, snacks, drinks, lottery tickets, candy, coffee, ice, cigarettes, chips, gum, beef jerky, hot dog
place/pharmacy | 1 | daily | | Name something you'd buy at a pharmacy | | medicine, vitamins, band-aids, toothpaste, shampoo, tylenol, cough drops, prescriptions, makeup, deodorant, sunscreen, greeting cards
place/office-place | 1 | daily | | Name a place people go on a first date | | restaurant, movies, coffee shop, park, bar, bowling, mini golf, beach, museum, ice skating, zoo, concert
place/cheap | 1 | daily | | Name a place you'd go on a field trip | | museum, zoo, aquarium, farm, science center, planetarium, factory, fire station, theater, capitol, historic site, park
place/scary | 1 | daily | | Name a scary place | | haunted house, cemetery, graveyard, basement, attic, dark alley, forest at night, abandoned building, hospital, dentist, prison, cave
place/quiet | 1 | daily | | Name a quiet place | | library, church, museum, hospital, bedroom, forest, cemetery, classroom during a test, spa, monastery, morgue, desert
place/wait | 1 | daily | | Name a place where you wait in line | | dmv, bank, airport, grocery store, amusement park, post office, restaurant, theme park, concert, coffee shop, bathroom, doctor's office
place/build | 2 | main | =landmark/landmark | Name a famous ancient ruin | | colosseum, pyramids of giza, machu picchu, parthenon, stonehenge, pompeii, petra, angkor wat, chichen itza, acropolis, great wall of china, roman forum
place/state-thing | 2 | main | =state/state | Name a state famous for its food | | maine, texas, louisiana, wisconsin, georgia, vermont, idaho, maryland, california, new york, hawaii, kansas city
place/states-letter | 2 | main | =state/state | Name a US state with two words in its name | | new york, new jersey, new mexico, new hampshire, north carolina, south carolina, north dakota, south dakota, west virginia, rhode island
place/canada | 2 | main | =city/canada | Name a place in Canada | | toronto, vancouver, montreal, ottawa, calgary, quebec, niagara falls, banff, edmonton, winnipeg, halifax, ontario
place/mexico2 | 2 | main | =city/mexico | Name a place in Mexico | | cancun, mexico city, cabo, tijuana, guadalajara, puerto vallarta, acapulco, tulum, oaxaca, monterrey, cozumel, playa del carmen
place/island2 | 2 | main | =country/country | Name a Caribbean vacation spot | | jamaica, bahamas, aruba, puerto rico, cancun, turks and caicos, barbados, st. lucia, cayman islands, dominican republic, punta cana, virgin islands
place/japan | 2 | daily | | Name something you'd see in Japan | | mount fuji, cherry blossoms, temples, sushi, bullet train, tokyo tower, geisha, anime, kimono, shrines, vending machines, sumo
# people
people/sitcomdad | 2 | daily | | Name a famous TV dad | | homer simpson, peter griffin, phil dunphy, al bundy, cliff huxtable, tim taylor, danny tanner, red forman, ray barone, george lopez, hank hill, jay pritchett
people/tvmom | 2 | daily | | Name a famous TV mom | | marge simpson, lois griffin, claire dunphy, carol brady, june cleaver, lorelai gilmore, peg bundy, debra barone, kitty forman, roseanne, clair huxtable, lucy ricardo
people/villain | 1 | main | =movie/villain | Name a famous villain | | darth vader, the joker, voldemort, thanos, scar, maleficent, ursula, hannibal lecter, cruella de vil, jafar, lex luthor, the grinch
people/hero | 1 | main | =character/superhero | Name a famous hero | | superman, batman, spider-man, wonder woman, harry potter, luke skywalker, captain america, iron man, robin hood, hercules, mulan, the flash
people/santa | 1 | daily | | Name a holiday character | | santa claus, easter bunny, tooth fairy, frosty the snowman, rudolph, jack frost, the grinch, cupid, leprechaun, elf on the shelf, mrs. claus, the great pumpkin
people/kingqueen | 2 | daily | | Name a famous king | | king arthur, king henry viii, king tut, king charles, king louis xiv, king david, king solomon, king george, king richard, elvis, lebron, king kong
people/magic | 2 | daily | | Name a famous wizard or witch | | gandalf, harry potter, merlin, dumbledore, hermione, the wicked witch of the west, glinda, sabrina, elphaba, voldemort, doctor strange, the sanderson sisters
people/princess | 1 | main | =character/disney | Name a famous princess | | princess diana, cinderella, snow white, ariel, belle, jasmine, princess leia, princess peach, princess zelda, rapunzel, aurora, mulan
people/comedianmovie | 2 | main | =comedian/comedian | Name a famous comedy actor | | adam sandler, jim carrey, will ferrell, steve martin, eddie murphy, robin williams, ben stiller, kevin hart, melissa mccarthy, chris farley, owen wilson, seth rogen
people/actor-action | 2 | daily | | Name an action movie star | | arnold schwarzenegger, sylvester stallone, bruce willis, tom cruise, dwayne johnson, jason statham, keanu reeves, jackie chan, vin diesel, liam neeson, bruce lee, harrison ford
people/actress | 1 | daily | | Name a famous actress | | meryl streep, julia roberts, jennifer aniston, angelina jolie, scarlett johansson, sandra bullock, jennifer lawrence, nicole kidman, emma stone, marilyn monroe, audrey hepburn, zendaya
people/actor | 1 | daily | | Name a famous actor | | tom hanks, leonardo dicaprio, brad pitt, denzel washington, will smith, morgan freeman, tom cruise, johnny depp, robert downey jr, keanu reeves, al pacino, robert de niro
people/host | 2 | daily | | Name a famous game show host | | alex trebek, pat sajak, bob barker, drew carey, steve harvey, ken jennings, regis philbin, howie mandel, richard dawson, wayne brady, vanna white, jimmy kimmel
people/kardashian | 2 | daily | | Name a famous celebrity family | | the kardashians, the jacksons, the osbournes, the royal family, the kennedys, the jonas brothers, the bushes, the smiths, the hiltons, the baldwins, the beckhams, the obamas
# music
music/instrument2 | 1 | main | =instrument/instrument | Name an instrument in an orchestra | | violin, cello, flute, trumpet, clarinet, oboe, tuba, harp, drums, viola, trombone, french horn
music/band-inst | 1 | main | =instrument/instrument | Name an instrument in a rock band | | guitar, drums, bass, keyboard, piano, electric guitar, vocals, microphone, synthesizer, tambourine, harmonica, saxophone
music/blow | 2 | main | =instrument/instrument | Name an instrument you blow into | | trumpet, flute, saxophone, clarinet, harmonica, tuba, trombone, recorder, kazoo, bagpipes, oboe, didgeridoo
music/word | 1 | daily | | Name a song with a girl's name in the title | | billie jean, roxanne, jolene, layla, sweet caroline, hey jude, delilah, rosanna, gloria, angie, mandy, beth
music/weather | 2 | daily | | Name a song about the weather | | here comes the sun, singin' in the rain, purple rain, umbrella, let it snow, it's raining men, walking on sunshine, set fire to the rain, november rain, blowin' in the wind, cold as ice, heat wave
music/city | 2 | daily | | Name a song with a place in the title | | new york new york, sweet home alabama, hotel california, empire state of mind, california gurls, african, viva las vegas, georgia on my mind, london calling, take me home country roads, party in the usa, old town road
music/numbers | 2 | daily | | Name a song with a number in the title | | 99 problems, 22, 7 rings, 9 to 5, 1999, 99 luftballons, 2 become 1, one, 3am, 7 years, 500 miles, 867-5309
music/summer | 1 | daily | | Name a summer song | | summertime, cruel summer, summer of '69, hot in herre, california gurls, despacito, watermelon sugar, girls just want to have fun, kokomo, wipe out, surfin' usa, levitating
music/sad | 1 | daily | | Name a sad song | | someone like you, hurt, tears in heaven, the scientist, hallelujah, all too well, drivers license, everybody hurts, yesterday, nothing compares 2 u, mad world, fix you
music/party | 1 | daily | | Name a party song | | i gotta feeling, party rock anthem, uptown funk, shout, celebration, don't stop believin', mr. brightside, yeah!, hey ya!, september, dancing queen, sweet caroline
music/movie | 2 | daily | | Name a song from a movie | | my heart will go on, let it go, eye of the tiger, i will always love you, ghostbusters, footloose, shallow, happy, stayin' alive, don't you forget about me, circle of life, see you again
music/rapper2 | 2 | daily | | Name a rap song | | lose yourself, gin and juice, hotline bling, sicko mode, juicy, california love, hypnotize, in da club, gold digger, humble, rapper's delight, the real slim shady
music/country2 | 2 | daily | | Name a country song | | friends in low places, jolene, ring of fire, take me home country roads, before he cheats, old town road, tennessee whiskey, wagon wheel, achy breaky heart, ring of fire, man i feel like a woman, the gambler
# screen
tv/reality2 | 2 | daily | | Name a cooking show | | hell's kitchen, masterchef, chopped, top chef, the great british bake off, kitchen nightmares, cupcake wars, diners drive-ins and dives, nailed it!, iron chef, cake boss, guy's grocery games
tv/sitcom-ending | 2 | daily | | Name a TV show set in a school | | saved by the bell, abbott elementary, glee, boy meets world, community, euphoria, sex education, never have i ever, degrassi, freaks and geeks, zoey 101, gossip girl
tv/sitcom2 | 2 | daily | | Name a TV show set in New York | | friends, seinfeld, how i met your mother, sex and the city, gossip girl, brooklyn nine-nine, law & order, 30 rock, girls, the marvelous mrs. maisel, will & grace, broad city
tv/fantasy | 2 | daily | | Name a fantasy or sci-fi TV show | | game of thrones, stranger things, the witcher, doctor who, star trek, the mandalorian, house of the dragon, lost, westworld, the x-files, the rings of power, black mirror
tv/superhero | 2 | daily | | Name a superhero TV show | | the boys, daredevil, the flash, arrow, wandavision, loki, smallville, invincible, the umbrella academy, jessica jones, gotham, agents of shield
tv/morning | 2 | daily | | Name a late night or morning show | | the tonight show, saturday night live, good morning america, today, the late show, jimmy kimmel live, the daily show, late night with seth meyers, the view, conan, the talk, live with kelly and mark
movie/horror2 | 1 | daily | | Name a scary movie villain | | freddy krueger, jason voorhees, michael myers, chucky, ghostface, pennywise, leatherface, annabelle, the babadook, hannibal lecter, pinhead, jigsaw
movie/kidmovie | 1 | daily | | Name a movie kids love | | frozen, toy story, the lion king, finding nemo, shrek, moana, encanto, minions, despicable me, cars, zootopia, coco
movie/quote | 2 | daily | | Name a famous movie line | | may the force be with you, i'll be back, here's johnny, you can't handle the truth, i'm the king of the world, to infinity and beyond, houston we have a problem, show me the money, life is like a box of chocolates, why so serious, i see dead people, e.t. phone home
movie/sequel | 2 | daily | | Name a movie with a sequel | | toy story, frozen, shrek, the godfather, jaws, home alone, rocky, star wars, the hangover, back to the future, finding nemo, terminator
movie/oscarstar | 2 | daily | | Name a movie set in space | | star wars, interstellar, gravity, the martian, alien, apollo 13, 2001: a space odyssey, armageddon, guardians of the galaxy, wall-e, avatar, star trek
movie/animals | 1 | daily | | Name a movie with a talking animal | | the lion king, babe, finding nemo, madagascar, zootopia, charlotte's web, stuart little, dr. dolittle, kung fu panda, ice age, the jungle book, bee movie
movie/christmas2 | 1 | daily | | Name a Christmas movie character | | the grinch, buddy the elf, kevin mccallister, rudolph, frosty, scrooge, clark griswold, jack skellington, ralphie, cindy lou who, santa, tiny tim
movie/disneyvillain | 1 | main | =character/disney | Name a Disney villain | | ursula, scar, maleficent, jafar, cruella de vil, captain hook, gaston, hades, the evil queen, mother gothel, yzma, shere khan
game/board2 | 1 | daily | | Name a family game night game | | monopoly, uno, scrabble, clue, sorry, jenga, connect four, candy land, trivial pursuit, pictionary, apples to apples, charades
game/arcade | 2 | daily | | Name an arcade game | | pac-man, space invaders, galaga, donkey kong, street fighter, mortal kombat, tetris, skee-ball, asteroids, frogger, dance dance revolution, whac-a-mole
game/nintendochar | 2 | daily | | Name a character in Mario Kart | | mario, luigi, peach, yoshi, bowser, toad, donkey kong, wario, waluigi, koopa troopa, daisy, rosalina
# sports
sport/hall | 2 | daily | | Name something that happens at a sports game | | national anthem, halftime show, wave, kiss cam, seventh inning stretch, cheerleaders, tailgating, the coin toss, timeout, overtime, t-shirt cannon, mascot
sport/injury | 2 | daily | | Name a common sports injury | | sprained ankle, torn acl, concussion, broken bone, pulled hamstring, tennis elbow, dislocated shoulder, shin splints, torn meniscus, groin pull, whiplash, black eye
sport/ball2 | 1 | daily | | Name a kind of ball used in sports | | basketball, football, soccer ball, baseball, tennis ball, golf ball, volleyball, bowling ball, softball, ping pong ball, rugby ball, beach ball
sport/uniform | 2 | daily | | Name something a football player wears | | helmet, shoulder pads, jersey, cleats, mouthguard, gloves, eye black, knee pads, chin strap, pants, socks, visor
sport/couch | 1 | daily | | Name a sport you can watch on TV | | football, basketball, baseball, soccer, hockey, golf, tennis, boxing, nascar, wrestling, ufc, formula 1
sport/water2 | 1 | daily | | Name something you do at a lake | | swim, fish, boat, kayak, canoe, water ski, paddleboard, tube, sunbathe, skip rocks, jet ski, camp
sport/fan | 2 | daily | | Name something sports fans do | | cheer, boo, do the wave, paint their faces, wear jerseys, tailgate, chant, wave foam fingers, sing, buy hot dogs, scream, cry
# brands
brand/delivery | 1 | daily | | Name a food delivery app or service | | doordash, uber eats, grubhub, postmates, instacart, seamless, domino's, gopuff, caviar, deliveroo, just eat, shipt
brand/rideshare | 2 | daily | | Name a website people shop on | | amazon, ebay, walmart, target, etsy, shein, temu, best buy, wayfair, etsy, costco, zappos
brand/cookie | 1 | main | =cookie/cookie | Name a famous cookie brand | | oreo, chips ahoy, nutter butter, keebler, pepperidge farm, girl scout cookies, nilla wafers, fig newtons, milano, famous amos, mother's, lorna doone
brand/cereal-brand | 1 | daily | | Name a brand of toothpaste or soap | | colgate, crest, dove, irish spring, dial, aquafresh, sensodyne, ivory, lever 2000, old spice, olay, zest
brand/outdoor | 2 | daily | | Name a sporting goods brand | | nike, adidas, under armour, puma, wilson, spalding, rawlings, callaway, the north face, columbia, patagonia, yeti
brand/car-part | 2 | daily | | Name a kitchen brand | | kitchenaid, cuisinart, le creuset, ninja, vitamix, instant pot, keurig, oxo, pyrex, tupperware, calphalon, all-clad
brand/furniture | 2 | daily | | Name a furniture or home store | | ikea, wayfair, home depot, lowe's, pottery barn, crate & barrel, ashley, bed bath & beyond, west elm, rooms to go, la-z-boy, pier 1
brand/bank2 | 2 | daily | | Name a credit card company | | visa, mastercard, american express, discover, capital one, chase, citi, apple card, diners club, synchrony, barclays, wells fargo
brand/phone | 2 | daily | | Name a phone company or carrier | | verizon, at&t, t-mobile, sprint, apple, samsung, google, cricket, boost mobile, metro, mint mobile, us cellular
# science
science/sky | 1 | daily | | Name something that falls from the sky | | rain, snow, hail, leaves, meteors, birds, sleet, lightning, raindrops, snowflakes, frogs, parachutes
science/ocean2 | 1 | daily | | Name something you'd find on the ocean floor | | sand, shells, coral, starfish, crabs, shipwreck, treasure, seaweed, rocks, octopus, sea urchin, clams
science/space3 | 2 | daily | | Name something an astronaut needs | | spacesuit, helmet, oxygen, rocket, food, water, gloves, boots, radio, space station, training, courage
science/micro | 2 | daily | | Name something you'd look at under a microscope | | cells, bacteria, blood, hair, germs, pond water, skin, leaf, onion skin, sand, dust, insects
science/body4 | 2 | daily | | Name something your body produces | | sweat, tears, saliva, blood, hair, nails, mucus, urine, earwax, skin cells, gas, heat
science/human | 1 | daily | | Name one of the five senses | | sight, hearing, smell, taste, touch, seeing, sixth sense, balance, vision, feel, hear, smelling
science/brain | 2 | daily | | Name a feeling or emotion | | happy, sad, angry, scared, excited, nervous, jealous, love, surprised, bored, lonely, proud
science/sleep | 2 | daily | | Name something that helps you sleep | | pillow, blanket, melatonin, warm milk, white noise, darkness, reading, tea, eye mask, music, meditation, counting sheep
science/germs | 2 | daily | | Name something with lots of germs | | phone, doorknob, toilet, money, keyboard, shopping cart, kitchen sponge, remote, hands, subway pole, gym equipment, trash can
science/math2 | 2 | main | =colour/colour | Name a shape with straight sides | | square, triangle, rectangle, hexagon, pentagon, octagon, rhombus, trapezoid, parallelogram, diamond, heptagon, decagon
# objects
object/pocket | 1 | daily | | Name something you'd find in a pocket | | keys, phone, wallet, money, lint, gum, receipts, coins, tissue, chapstick, earbuds, candy wrapper
object/desk | 1 | daily | | Name something on a teacher's desk | | apple, computer, papers, pens, stapler, grade book, coffee mug, books, tape, scissors, plant, calendar
object/junk | 1 | daily | | Name something in a junk drawer | | batteries, rubber bands, keys, tape, scissors, pens, takeout menus, coupons, twist ties, birthday candles, screwdriver, phone chargers
object/tools3 | 1 | daily | | Name something with buttons | | phone, remote, keyboard, shirt, elevator, calculator, microwave, game controller, coat, doorbell, jacket, mouse
object/plug | 1 | main | =object/appliance | Name something you plug in | | phone charger, lamp, tv, toaster, computer, hair dryer, vacuum, microwave, fan, electric car, christmas lights, refrigerator
object/fire2 | 2 | daily | | Name something that makes light | | sun, light bulb, candle, flashlight, fire, lamp, firefly, lightning, phone screen, lighthouse, star, glow stick
object/hot | 1 | daily | | Name something with a lid | | pot, jar, box, toilet, trash can, cup, piano, laptop, coffin, cooler, tupperware, eye
object/wheels | 1 | daily | | Name something with a handle | | door, cup, mug, bag, suitcase, pan, umbrella, bucket, drawer, knife, toilet, shopping cart
object/strings | 2 | daily | | Name something with strings | | guitar, violin, puppet, kite, yo-yo, harp, tennis racket, shoes, hoodie, balloon, piano, tea bag
object/ring | 1 | daily | | Name something that rings | | phone, doorbell, alarm clock, bell, church bell, school bell, ears, wedding ring, timer, bicycle bell, cash register, boxing ring
object/inflate | 2 | daily | | Name something you inflate | | balloon, tire, air mattress, pool float, beach ball, basketball, bouncy castle, life jacket, football, raft, bike tire, inner tube
object/stack | 2 | daily | | Name something people stack | | plates, books, pancakes, cups, blocks, chairs, boxes, papers, coins, firewood, legos, chips
object/hang | 1 | daily | | Name something you hang on a wall | | pictures, clock, mirror, painting, calendar, tv, poster, shelf, diploma, wreath, flag, coat hooks
# wild
wild/sayno | 1 | daily | | Name something people say no to | | drugs, vegetables, homework, strangers, salespeople, dessert, a second date, overtime, telemarketers, peer pressure, extra work, smoking
wild/excuse2 | 1 | daily | | Name an excuse for being late to work | | traffic, overslept, car trouble, sick kid, alarm didn't go off, bad weather, train delay, flat tire, doctor's appointment, couldn't find keys, accident, construction
wild/bucket | 1 | daily | | Name something on a bucket list | | skydiving, travel the world, see the northern lights, write a book, run a marathon, swim with dolphins, visit paris, climb a mountain, learn a language, go on a safari, bungee jumping, fall in love
wild/regret | 2 | daily | | Name something people do on New Year's Eve | | kiss at midnight, watch the ball drop, make resolutions, party, drink champagne, fireworks, countdown, sing auld lang syne, stay up late, go to a party, toast, make noise
wild/resolution | 1 | daily | | Name a New Year's resolution | | lose weight, exercise more, eat healthy, save money, quit smoking, read more, travel, learn something new, drink less, get organized, spend more time with family, sleep more
wild/gift | 1 | daily | | Name a gift people give for Mother's Day | | flowers, chocolate, card, jewelry, breakfast in bed, perfume, spa day, candle, mug, brunch, photo frame, roses
wild/teacher | 1 | daily | | Name something a teacher says | | quiet, sit down, open your books, raise your hand, pay attention, homework, line up, no talking, good job, pencils down, any questions, eyes on me
wild/mom | 1 | daily | | Name something a mom always says | | clean your room, be careful, i love you, because i said so, eat your vegetables, wear a jacket, don't talk to strangers, did you brush your teeth, go to bed, say thank you, i'm not asking again, wait until your father gets home
wild/pirate | 1 | daily | | Name something a pirate has | | eye patch, parrot, ship, sword, hook, treasure, peg leg, hat, map, flag, cannon, rum
wild/cowboy | 1 | daily | | Name something a cowboy has | | hat, boots, horse, lasso, spurs, gun, saddle, belt buckle, bandana, chaps, vest, rope
wild/knight | 2 | daily | | Name something a superhero has | | cape, mask, superpowers, costume, secret identity, sidekick, gadgets, utility belt, logo, nemesis, lair, shield
wild/magic | 2 | daily | | Name something a magician uses | | wand, hat, rabbit, cards, cape, coins, scarves, doves, box, saw, rope, assistant
wild/alien | 2 | daily | | Name something people say aliens look like | | green, big eyes, antennae, grey, big head, tentacles, slimy, tall, skinny, three eyes, glowing, little
wild/haunted | 1 | daily | | Name something in a haunted house | | ghosts, cobwebs, skeletons, bats, spiders, creaky doors, coffins, zombies, vampires, witches, chains, cold spots
wild/noise | 1 | daily | | Name something that makes you jump | | loud noise, scary movie, thunder, spider, surprise party, fireworks, alarm, jump scare, balloon popping, doorbell, mouse, phone ringing
wild/smile | 1 | daily | | Name something that makes people smile | | puppies, babies, jokes, sunshine, compliments, ice cream, friends, kittens, presents, music, flowers, money
wild/annoying | 1 | daily | | Name something annoying | | mosquitoes, traffic, alarm clock, slow wifi, spam calls, flies, loud chewing, little brothers, commercials, waiting in line, buffering, ads
wild/childhood | 1 | daily | | Name something people did as kids | | play outside, ride bikes, play tag, watch cartoons, build forts, climb trees, play video games, collect cards, go to school, sleepovers, trick or treat, jump rope
`;
