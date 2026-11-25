// BOX OFFICE: hand-written film lists for the big franchises ("Name a Star Wars movie"). Wikidata doesn't
// link most of these films to their franchise, so its lists came back thin or empty. make-catalog.mjs
// writes each one as a hand family and its answer file.
// Tiers: TRAFFIC (everyone knows), CRUISING, FAST LANE, DEEP CUT. "a|b": b is another way to say a.
// Franchises not here keep their Wikidata list; SMALL ones (under five films) are dropped as too narrow.
export const SMALL = ["Back to the Future", "Frozen", "The Incredibles", "Finding Nemo", "Cars", "Minions", "The Lion King",
  "The Godfather", "Rush Hour", "Men in Black", "The Chronicles of Narnia", "Dune", "Avatar", "Sonic the Hedgehog",
  "Kung Fu Panda", "Madagascar", "How to Train Your Dragon", "Lethal Weapon", "Paddington", "Top Gun", "Jaws",
  "The Twilight Saga", "Monsters, Inc."];

export const MOVIES = {
  "Star Wars": [
    ["star wars|a new hope|episode iv|star wars episode iv|star wars a new hope", "the empire strikes back|empire strikes back|episode v|star wars episode v",
      "return of the jedi|episode vi|star wars episode vi", "the phantom menace|episode i|star wars episode i", "attack of the clones|episode ii|star wars episode ii",
      "revenge of the sith|episode iii|star wars episode iii", "the force awakens|episode vii|star wars episode vii", "the last jedi|episode viii|star wars episode viii",
      "the rise of skywalker|episode ix|star wars episode ix"],
    ["rogue one|rogue one a star wars story", "solo|solo a star wars story"],
    ["the clone wars|star wars the clone wars", "the mandalorian and grogu"],
    ["the star wars holiday special|holiday special", "caravan of courage|the ewok adventure", "ewoks the battle for endor|battle for endor"],
  ],
  "Harry Potter": [
    ["harry potter and the philosopher's stone|philosopher's stone|sorcerer's stone|harry potter and the sorcerer's stone",
      "harry potter and the chamber of secrets|chamber of secrets", "harry potter and the prisoner of azkaban|prisoner of azkaban",
      "harry potter and the goblet of fire|goblet of fire", "harry potter and the order of the phoenix|order of the phoenix",
      "harry potter and the half-blood prince|half-blood prince|half blood prince",
      "harry potter and the deathly hallows|deathly hallows|deathly hallows part 1|deathly hallows part 2|harry potter and the deathly hallows part 1|harry potter and the deathly hallows part 2"],
    ["fantastic beasts and where to find them|fantastic beasts", "fantastic beasts the crimes of grindelwald|the crimes of grindelwald|crimes of grindelwald",
      "fantastic beasts the secrets of dumbledore|the secrets of dumbledore|secrets of dumbledore"],
    [],
    ["harry potter 20th anniversary return to hogwarts|return to hogwarts"],
  ],
  "The Lord of the Rings": [
    ["the fellowship of the ring|fellowship of the ring|the lord of the rings the fellowship of the ring", "the two towers|the lord of the rings the two towers",
      "the return of the king|return of the king|the lord of the rings the return of the king", "the hobbit|an unexpected journey|the hobbit an unexpected journey",
      "the desolation of smaug|the hobbit the desolation of smaug"],
    ["the battle of the five armies|the hobbit the battle of the five armies", "the war of the rohirrim|the lord of the rings the war of the rohirrim"],
    ["the lord of the rings|lord of the rings 1978"],
    [],
  ],
  "Pirates of the Caribbean": [
    ["the curse of the black pearl|curse of the black pearl|pirates of the caribbean", "dead man's chest|dead mans chest", "at world's end|at worlds end",
      "on stranger tides", "dead men tell no tales|salazar's revenge"],
    [], [], [],
  ],
  "The Hunger Games": [
    ["the hunger games|hunger games", "catching fire|the hunger games catching fire", "mockingjay|mockingjay part 1|the hunger games mockingjay part 1",
      "mockingjay part 2|the hunger games mockingjay part 2", "the ballad of songbirds and snakes|ballad of songbirds and snakes|the ballad of songbirds & snakes"],
    ["sunrise on the reaping|the hunger games sunrise on the reaping"], [], [],
  ],
  "Twilight": [
    ["twilight", "new moon|the twilight saga new moon", "eclipse|the twilight saga eclipse", "breaking dawn|breaking dawn part 1|the twilight saga breaking dawn part 1",
      "breaking dawn part 2|the twilight saga breaking dawn part 2"],
    [], [], [],
  ],
  "Fast & Furious": [
    ["the fast and the furious|fast and the furious", "2 fast 2 furious|too fast too furious", "fast & furious|fast and furious|fast and furious 4", "fast five|fast 5",
      "furious 7|furious seven|fast 7"],
    ["tokyo drift|the fast and the furious tokyo drift", "fast & furious 6|furious 6|fast 6", "the fate of the furious|fate of the furious|f8|fast 8",
      "f9|fast 9|f9 the fast saga", "fast x|fast 10", "hobbs & shaw|hobbs and shaw|fast & furious presents hobbs & shaw"],
    [], [],
  ],
  "Mission: Impossible": [
    ["mission impossible", "mission impossible 2|mi2|m i 2", "ghost protocol|mission impossible ghost protocol", "fallout|mission impossible fallout",
      "the final reckoning|mission impossible the final reckoning|final reckoning"],
    ["mission impossible iii|mission impossible 3|mi3", "rogue nation|mission impossible rogue nation",
      "dead reckoning|dead reckoning part one|mission impossible dead reckoning"],
    [], [],
  ],
  "Indiana Jones": [
    ["raiders of the lost ark|indiana jones and the raiders of the lost ark", "temple of doom|indiana jones and the temple of doom",
      "the last crusade|last crusade|indiana jones and the last crusade", "kingdom of the crystal skull|indiana jones and the kingdom of the crystal skull|crystal skull",
      "dial of destiny|indiana jones and the dial of destiny"],
    [], [], [],
  ],
  "Transformers": [
    ["transformers", "revenge of the fallen|transformers revenge of the fallen", "dark of the moon|transformers dark of the moon",
      "age of extinction|transformers age of extinction", "bumblebee"],
    ["the last knight|transformers the last knight", "rise of the beasts|transformers rise of the beasts", "transformers one"],
    ["the transformers the movie|transformers the movie"], [],
  ],
  "Spider-Man": [
    ["spider-man|spiderman", "spider-man 2|spiderman 2", "spider-man 3|spiderman 3", "the amazing spider-man|amazing spider-man",
      "spider-man homecoming|homecoming", "spider-man far from home|far from home", "spider-man no way home|no way home",
      "spider-man into the spider-verse|into the spider-verse|into the spiderverse", "spider-man across the spider-verse|across the spider-verse|across the spiderverse"],
    ["the amazing spider-man 2|amazing spider-man 2", "spider-man brand new day|brand new day"],
    ["venom", "venom let there be carnage", "venom the last dance", "morbius", "madame web", "kraven the hunter"],
    [],
  ],
  "Batman": [
    ["batman", "batman returns", "batman begins", "the dark knight|dark knight", "the dark knight rises|dark knight rises", "the batman"],
    ["batman forever", "batman & robin|batman and robin", "batman v superman|batman v superman dawn of justice|batman vs superman", "the lego batman movie|lego batman"],
    ["batman mask of the phantasm|mask of the phantasm", "joker", "justice league|zack snyder's justice league"],
    ["batman the movie", "batman under the red hood|under the red hood", "the dark knight returns|batman the dark knight returns"],
  ],
  "Superman": [
    ["superman|superman the movie", "superman ii|superman 2", "superman returns", "man of steel", "batman v superman|batman v superman dawn of justice|batman vs superman"],
    ["superman iii|superman 3", "superman iv|superman iv the quest for peace|superman 4", "justice league|zack snyder's justice league"],
    ["supergirl", "superman and the mole men"], [],
  ],
  "Terminator": [
    ["the terminator|terminator", "terminator 2|terminator 2 judgment day|t2|judgment day", "terminator 3|rise of the machines|terminator 3 rise of the machines",
      "terminator salvation", "terminator genisys"],
    ["terminator dark fate|dark fate"], [], [],
  ],
  "Ice Age": [
    ["ice age", "the meltdown|ice age the meltdown|ice age 2", "dawn of the dinosaurs|ice age dawn of the dinosaurs|ice age 3",
      "continental drift|ice age continental drift|ice age 4", "collision course|ice age collision course|ice age 5"],
    ["the ice age adventures of buck wild|buck wild"], [], [],
  ],
  "Godzilla": [
    ["godzilla", "godzilla king of the monsters|king of the monsters", "godzilla vs kong|godzilla vs. kong", "godzilla minus one|minus one",
      "godzilla x kong|godzilla x kong the new empire|the new empire"],
    ["shin godzilla", "king kong vs godzilla|king kong vs. godzilla", "godzilla 2000", "mothra vs godzilla|godzilla vs the thing"],
    ["destroy all monsters", "godzilla raids again", "godzilla vs mechagodzilla|godzilla vs. mechagodzilla", "godzilla final wars", "terror of mechagodzilla"],
    ["godzilla vs hedorah|godzilla vs the smog monster", "ghidorah the three-headed monster", "godzilla vs destoroyah", "godzilla tokyo sos"],
  ],
  "King Kong": [
    ["king kong", "kong skull island|skull island", "godzilla vs kong|godzilla vs. kong", "godzilla x kong|godzilla x kong the new empire", "king kong vs godzilla|king kong vs. godzilla"],
    ["son of kong", "king kong lives"], ["king kong escapes"], [],
  ],
  "Planet of the Apes": [
    ["planet of the apes", "rise of the planet of the apes", "dawn of the planet of the apes", "war for the planet of the apes", "kingdom of the planet of the apes"],
    ["beneath the planet of the apes", "escape from the planet of the apes"], ["conquest of the planet of the apes", "battle for the planet of the apes"], [],
  ],
  "Halloween": [
    ["halloween", "halloween ii|halloween 2", "halloween h20|halloween h20 20 years later", "halloween kills", "halloween ends"],
    ["halloween 4|halloween 4 the return of michael myers|the return of michael myers", "halloween iii|halloween 3|season of the witch|halloween iii season of the witch",
      "halloween resurrection"],
    ["halloween 5|halloween 5 the revenge of michael myers|the revenge of michael myers", "halloween the curse of michael myers|the curse of michael myers|halloween 6"],
    [],
  ],
  "Friday the 13th": [
    ["friday the 13th", "friday the 13th part 2|part 2", "friday the 13th part iii|part 3|friday the 13th part 3", "friday the 13th the final chapter|the final chapter",
      "freddy vs jason|freddy vs. jason"],
    ["jason x", "jason lives|friday the 13th part vi jason lives", "jason goes to hell|jason goes to hell the final friday"],
    ["a new beginning|friday the 13th a new beginning", "the new blood|friday the 13th part vii the new blood", "jason takes manhattan|friday the 13th part viii jason takes manhattan"],
    [],
  ],
  "A Nightmare on Elm Street": [
    ["a nightmare on elm street|nightmare on elm street", "freddy's revenge|a nightmare on elm street 2|nightmare on elm street 2",
      "dream warriors|a nightmare on elm street 3|nightmare on elm street 3", "the dream master|a nightmare on elm street 4", "freddy vs jason|freddy vs. jason"],
    ["the dream child|a nightmare on elm street 5", "freddy's dead|freddy's dead the final nightmare", "new nightmare|wes craven's new nightmare"],
    [], [],
  ],
  "Scream": [
    ["scream", "scream 2", "scream 3", "scream 4", "scream vi|scream 6"],
    ["scream 5", "scream 7"], [], [],
  ],
  "Saw": [
    ["saw", "saw ii|saw 2", "saw iii|saw 3", "saw iv|saw 4", "saw x|saw 10"],
    ["saw v|saw 5", "saw vi|saw 6", "jigsaw", "saw 3d|saw the final chapter"], ["spiral|spiral from the book of saw"], [],
  ],
  "The Conjuring Universe": [
    ["the conjuring|conjuring", "the conjuring 2|conjuring 2", "annabelle", "the nun", "the conjuring last rites|last rites"],
    ["annabelle creation", "annabelle comes home", "the conjuring the devil made me do it|the devil made me do it", "the nun ii|the nun 2"],
    ["the curse of la llorona|the curse of the weeping woman"], [],
  ],
  "John Wick": [
    ["john wick", "john wick chapter 2|john wick 2", "john wick chapter 3|john wick 3|parabellum|john wick chapter 3 parabellum",
      "john wick chapter 4|john wick 4", "ballerina|from the world of john wick ballerina"],
    [], [], [],
  ],
  "Teenage Mutant Ninja Turtles": [
    ["teenage mutant ninja turtles|ninja turtles", "the secret of the ooze|teenage mutant ninja turtles ii|tmnt 2", "out of the shadows|teenage mutant ninja turtles out of the shadows",
      "mutant mayhem|teenage mutant ninja turtles mutant mayhem", "tmnt"],
    ["teenage mutant ninja turtles iii|tmnt 3|turtles in time"], [], [],
  ],
  "The Muppets": [
    ["the muppet movie", "the muppets", "the muppet christmas carol|muppet christmas carol", "muppet treasure island", "muppets most wanted"],
    ["the great muppet caper", "the muppets take manhattan", "muppets from space"], ["the muppets' wizard of oz|muppets wizard of oz", "it's a very merry muppet christmas movie"], [],
  ],
  "Rambo": [
    ["first blood", "rambo first blood part ii|rambo 2|first blood part ii", "rambo iii|rambo 3", "rambo", "rambo last blood|last blood"],
    [], [], [],
  ],
  "Police Academy": [
    ["police academy", "police academy 2|police academy 2 their first assignment", "police academy 3|police academy 3 back in training",
      "police academy 4|police academy 4 citizens on patrol", "police academy 5|police academy 5 assignment miami beach"],
    ["police academy 6|police academy 6 city under siege", "police academy mission to moscow|mission to moscow|police academy 7"], [], [],
  ],
  "American Pie": [
    ["american pie", "american pie 2", "american wedding", "american reunion", "band camp|american pie presents band camp"],
    ["the naked mile|american pie presents the naked mile", "beta house|american pie presents beta house"],
    ["the book of love|american pie presents the book of love", "girls' rules|american pie presents girls' rules"], [],
  ],
  "Ghostbusters": [
    ["ghostbusters", "ghostbusters ii|ghostbusters 2", "ghostbusters afterlife|afterlife", "ghostbusters frozen empire|frozen empire",
      "ghostbusters answer the call|ghostbusters 2016"],
    [], [], [],
  ],
  "Mad Max": [
    ["mad max", "the road warrior|mad max 2|mad max 2 the road warrior", "beyond thunderdome|mad max beyond thunderdome", "fury road|mad max fury road",
      "furiosa|furiosa a mad max saga"],
    [], [], [],
  ],
  "Home Alone": [
    ["home alone", "home alone 2|lost in new york|home alone 2 lost in new york", "home alone 3", "home alone 4|home alone 4 taking back the house",
      "home sweet home alone"],
    ["home alone the holiday heist|home alone 5|the holiday heist"], [], [],
  ],
  "Winnie-the-Pooh": [
    ["the many adventures of winnie the pooh|many adventures of winnie the pooh", "winnie the pooh", "christopher robin", "the tigger movie|tigger movie",
      "piglet's big movie"],
    ["pooh's grand adventure|pooh's grand adventure the search for christopher robin", "pooh's heffalump movie|heffalump movie"],
    ["springtime with roo", "seasons of giving|winnie the pooh seasons of giving"], [],
  ],
  "Disney Princess": [
    ["snow white|snow white and the seven dwarfs", "cinderella", "the little mermaid|little mermaid", "beauty and the beast", "aladdin", "mulan", "tangled", "moana",
      "sleeping beauty"],
    ["pocahontas", "the princess and the frog|princess and the frog", "brave", "raya and the last dragon|raya"], [], [],
  ],
  "Barbie": [
    ["barbie", "barbie in the nutcracker", "barbie as rapunzel", "barbie of swan lake", "barbie as the princess and the pauper|the princess and the pauper",
      "barbie in the 12 dancing princesses|12 dancing princesses|the 12 dancing princesses"],
    ["barbie and the three musketeers", "barbie in a mermaid tale", "barbie as the island princess", "barbie fairytopia|fairytopia",
      "barbie a fashion fairytale", "barbie and the diamond castle", "barbie princess charm school", "barbie and the magic of pegasus"],
    ["barbie in a christmas carol", "barbie mariposa", "barbie and the secret door", "barbie a perfect christmas", "barbie thumbelina"], [],
  ],
  "Jurassic Park": [
    ["jurassic park", "the lost world|the lost world jurassic park|jurassic park 2", "jurassic park iii|jurassic park 3", "jurassic world",
      "fallen kingdom|jurassic world fallen kingdom"],
    ["dominion|jurassic world dominion", "jurassic world rebirth|rebirth"], [], [],
  ],
  "Star Trek": [
    ["star trek", "the wrath of khan|star trek ii|star trek ii the wrath of khan|wrath of khan", "first contact|star trek first contact",
      "star trek into darkness|into darkness", "star trek beyond", "star trek the motion picture|the motion picture"],
    ["the search for spock|star trek iii", "the voyage home|star trek iv", "the undiscovered country|star trek vi", "star trek generations|generations"],
    ["the final frontier|star trek v", "star trek insurrection|insurrection", "star trek nemesis|nemesis"], [],
  ],
};
