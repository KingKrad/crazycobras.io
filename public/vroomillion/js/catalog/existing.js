// The prompt catalog, part 1: the prompts that were already in the game, sorted into families.
// One line per family:  group/family | level | pools | flags | prompt; other wording; ...
//   family   once you've had ANY prompt in a family, none of them ever comes back (any mode, any race)
//   group    the part before "/": a race never has two families from the same group
//   level    1 easy, 2 medium, 3 tricky        pools  main (CLASSIC/Unlimited), daily, car (GEARHEAD), hard
//   flags    1 = one artist / show / team / author style (at most one per race)
// "# topic" lines set the topic for the lines below (12 topics; a race has 7 different ones).
export const EXISTING = `
# food
fruit/fruit | 1 | main | | Name a fruit; Name a berry; Name a citrus fruit
vegetable/vegetable | 1 | main | | Name a vegetable; Name a type of potato dish
cheese/cheese | 2 | main | | Name a cheese
dessert/dessert | 1 | main | | Name a dessert; Name a pie or tart; Name a type of cake
cookie/cookie | 1 | main | | Name a cookie or biscuit
candy/candy | 1 | main | | Name a chocolate bar or sweet
breakfast/breakfast | 1 | main | | Name a breakfast food; Name a type of pancake; Name something you put on toast
cereal/cereal | 2 | main | | Name a breakfast cereal
fastfood/fastfood | 1 | main | | Name a fast food chain
herb/herb | 2 | main | | Name a herb or spice
nut/nut | 2 | main | | Name a nut or seed
pasta/pasta | 2 | main | | Name a pasta shape
pizza/pizza | 1 | main | | Name a pizza topping
sandwich/sandwich | 1 | main | | Name a sandwich
sauce/sauce | 1 | main | | Name a sauce or condiment; Name a hot sauce
soup/soup | 2 | main | | Name a soup
bread/bread | 2 | main | | Name a type of bread
noodle/noodle | 2 | main | | Name a type of noodle; Name a dumpling
salad/salad | 2 | main | | Name a type of salad
sausage/sausage | 2 | main | | Name a type of sausage
icecream/icecream | 1 | main | | Name an ice cream flavour
snack/snack | 1 | main | | Name a snack; Name a crisp or chip flavour
cuisine/italian | 1 | main | | Name an Italian dish
cuisine/mexican | 1 | main | | Name a Mexican dish
cuisine/chinese | 1 | main | | Name a Chinese food
cuisine/japanese | 2 | main | | Name a Japanese dish; Name a type of sushi
cuisine/indian | 2 | main | | Name an Indian dish
cuisine/french | 2 | main | | Name a French dish
cuisine/korean | 2 | main | | Name a Korean dish
cuisine/thai | 2 | main | | Name a Thai dish
cuisine/spanish | 2 | main | | Name a Spanish dish
cuisine/greek | 2 | main | | Name a Greek dish
cuisine/british | 2 | main | | Name a British food
cuisine/american | 1 | main | | Name an American food
grain/grain | 3 | hard | | Name a cereal grain
# drink
softdrink/softdrink | 1 | main | | Name a soft drink; Name a fruit juice
cocktail/cocktail | 2 | main | | Name a cocktail
coffee/coffee | 1 | main | | Name a coffee drink
tea/tea | 2 | main | | Name a type of tea
beer/beer | 2 | main | | Name a beer brand
beerstyle/beerstyle | 3 | hard | | Name a beer style
grape/grape | 3 | hard | | Name a grape variety
spirit/spirit | 3 | hard | | Name a liqueur or spirit; Name a whisky
# animals
bird/bird | 1 | main | | Name a bird; Name an owl; Name a parrot
cat/cat | 2 | main | | Name a breed of cat
dog/dog | 1 | main | | Name a dog breed
dino/dino | 2 | main | | Name a dinosaur
horse/horse | 2 | main | | Name a horse breed; Name a famous horse
farm/farm | 1 | main | | Name a farm animal; Name a baby animal
mammal/mammal | 1 | main | | Name a mammal; Name a wild cat; Name an animal you'd see on safari; Name an animal at the zoo; Name an animal with stripes
primate/primate | 2 | main | | Name a monkey or ape
reptile/reptile | 2 | main | | Name a reptile or amphibian; Name a snake; Name a frog
fish/fish | 2 | main | | Name a type of fish; Name a shark
sea/sea | 1 | main | | Name an animal that lives in the ocean; Name a whale or dolphin
insect/insect | 1 | main | | Name an insect; Name a butterfly; Name a spider
pet/pet | 1 | main | | Name a pet; Name a famous dog
# places
country/country | 1 | main | | Name a country; Name a country in Europe; Name a country in Asia; Name a country in Africa; Name a country in North America; Name a country in South America; Name a country in Central America; Name a country in the Middle East; Name a landlocked country; Name an island country; Name a Caribbean island or country
country/borders | 2 | main | | Name a country that borders China; Name a country that borders Russia; Name a country that borders Brazil; Name a country that borders France; Name a country that borders Germany
country/rule | 2 | main | | Name a country with a king, queen or emperor; Name a country that uses the euro; Name a country where French is an official language; Name a country where Spanish is an official language; Name a country on the Mediterranean Sea; Name a country that has hosted the FIFA World Cup
capital/capital | 1 | main | | Name a capital city; Name a capital city in Europe; Name a capital city in Asia; Name a capital city in Africa; Name a capital city in South America
state/state | 1 | main | | Name a US state; Name a US state that borders Canada; Name a US state on the Mississippi River
state/capital | 2 | main | | Name a US state capital
city/usa | 1 | main | | Name a city in the USA
city/europe | 1 | main | | Name a city in Europe; Name a French city; Name a German city; Name a Spanish city; Name an Italian city; Name a city on the Danube
city/asia | 2 | main | | Name a city in Asia; Name a Chinese city; Name a Japanese city; Name an Indian city
city/africa | 2 | main | | Name a city in Africa; Name a city on the Nile
city/samerica | 2 | main | | Name a city in South America; Name a Brazilian city
city/uk | 2 | main | | Name a city or town in the UK
city/canada | 2 | main | | Name a Canadian city; Name a Canadian province or territory
city/mexico | 2 | main | | Name a Mexican city
city/australia | 2 | main | | Name an Australian city or town
city/olympic | 2 | main | | Name an Olympic host city
landmark/landmark | 1 | main | | Name a famous landmark; Name a world wonder; Name a famous statue; Name a famous tower
building/castle | 2 | main | | Name a castle; Name a cathedral
building/skyscraper | 2 | main | | Name a skyscraper
bridge/bridge | 2 | main | | Name a famous bridge
street/street | 2 | main | | Name a famous street
museum/museum | 2 | main | | Name a museum
themepark/themepark | 1 | main | | Name a theme park; Name a roller coaster
nature/mountain | 1 | main | | Name a mountain; Name a volcano
nature/lake | 2 | main | | Name a lake
nature/river | 1 | main | | Name a river
nature/island | 1 | main | | Name an island
nature/desert | 2 | main | | Name a desert
nature/ocean | 1 | main | | Name an ocean or sea
nature/waterfall | 2 | main | | Name a waterfall
nature/cave | 3 | hard | | Name a cave; Name a glacier
nature/forest | 2 | main | | Name a famous forest; Name a national park
beach/beach | 2 | main | | Name a famous beach
airport/airport | 2 | main | | Name an airport
language/language | 1 | main | | Name a language
# people
president/us | 1 | main | | Name a US president; Name a US founding father
leader/uk | 2 | main | | Name a British prime minister; Name a king or queen of England; Name a famous queen
leader/other | 3 | hard | | Name a Canadian prime minister; Name an Australian prime minister; Name a French president
emperor/roman | 2 | main | | Name a Roman emperor; Name an empire
pope/pope | 3 | hard | | Name a pope
scientist/scientist | 1 | main | | Name a famous scientist; Name an inventor
scientist/nobel | 3 | hard | | Name a Nobel Prize winner in Physics
philosopher/philosopher | 2 | main | | Name a philosopher
writer/author | 1 | main | | Name a famous author; Name a poet
writer/novel | 2 | main | | Name a famous novel
painter/painter | 2 | main | | Name a painter; Name a famous painting
artist/sculptor | 3 | hard | | Name a sculptor; Name an architect
explorer/explorer | 2 | main | | Name a famous explorer; Name a famous pirate
chef/magician | 2 | main | | Name a magician
detective/detective | 2 | main | | Name a famous detective
comedian/comedian | 1 | main | | Name a comedian
youtuber/youtuber | 1 | main | | Name a famous YouTuber
wrestler/wrestler | 2 | main | | Name a pro wrestler
# music
music/band | 1 | main | | Name a band; Name a boy band or girl group
music/kpop | 2 | main | | Name a K-pop group
music/rapper | 1 | main | | Name a rapper
music/popsinger | 1 | main | | Name a pop singer
music/country | 2 | main | | Name a country singer
music/guitarist | 2 | main | | Name a famous guitarist
music/composer | 2 | main | | Name a famous composer
music/genre | 2 | main | | Name a musical genre
instrument/instrument | 1 | main | | Name a musical instrument
musical/musical | 2 | main | | Name a musical
opera/opera | 3 | hard | | Name an opera
song/christmas | 1 | main | | Name a Christmas song
song/disney | 1 | main | | Name a Disney song
song/colour | 2 | main | | Name a song with a colour in the title
song/beatles | 1 | main | 1 | Name a Beatles song
song/taylor | 1 | main | 1 | Name a Taylor Swift song
song/mj | 1 | main | 1 | Name a Michael Jackson song
song/drake | 1 | main | 1 | Name a Drake song
song/queen | 1 | main | 1 | Name a Queen song
song/elvis | 2 | main | 1 | Name an Elvis Presley song
song/abba | 1 | main | 1 | Name an ABBA song
song/stones | 2 | main | 1 | Name a Rolling Stones song
song/edsheeran | 1 | main | 1 | Name an Ed Sheeran song
song/madonna | 2 | main | 1 | Name a Madonna song
song/bts | 2 | main | 1 | Name a BTS song
song/billie | 2 | main | 1 | Name a Billie Eilish song
song/bonjovi | 2 | main | 1 | Name a Bon Jovi song
song/britney | 1 | main | 1 | Name a Britney Spears song
song/brunomars | 1 | main | 1 | Name a Bruno Mars song
song/coldplay | 2 | main | 1 | Name a Coldplay song
song/dualipa | 2 | main | 1 | Name a Dua Lipa song
song/greenday | 2 | main | 1 | Name a Green Day song
song/harry | 2 | main | 1 | Name a Harry Styles song
song/bieber | 1 | main | 1 | Name a Justin Bieber song
song/kanye | 2 | main | 1 | Name a Kanye West song
song/katy | 1 | main | 1 | Name a Katy Perry song
song/kendrick | 2 | main | 1 | Name a Kendrick Lamar song
song/gaga | 1 | main | 1 | Name a Lady Gaga song
song/linkin | 2 | main | 1 | Name a Linkin Park song
song/mariah | 2 | main | 1 | Name a Mariah Carey song
song/metallica | 2 | main | 1 | Name a Metallica song
song/nirvana | 2 | main | 1 | Name a Nirvana song
song/pinkfloyd | 2 | main | 1 | Name a Pink Floyd song
song/rihanna | 1 | main | 1 | Name a Rihanna song
song/sabrina | 2 | main | 1 | Name a Sabrina Carpenter song
song/shakira | 2 | main | 1 | Name a Shakira song
song/spice | 2 | main | 1 | Name a Spice Girls song
song/whitney | 2 | main | 1 | Name a Whitney Houston song
song/weeknd | 2 | main | 1 | Name a song by The Weeknd
song/travis | 2 | main | 1 | Name a Travis Scott song
song/acdc | 2 | main | 1 | Name an AC/DC song
song/adele | 1 | main | 1 | Name an Adele song
song/ariana | 1 | main | 1 | Name an Ariana Grande song
song/elton | 2 | main | 1 | Name an Elton John song
song/eminem | 2 | main | 1 | Name an Eminem song
song/oasis | 2 | main | 1 | Name an Oasis song
song/olivia | 2 | main | 1 | Name an Olivia Rodrigo song
song/1d | 2 | main | 1 | Name an One Direction song
song/beegees | 3 | hard | 1 | Name a Bee Gees song
song/beyonce | 3 | hard | 1 | Name a Beyoncé song
song/dylan | 3 | hard | 1 | Name a Bob Dylan song
song/springsteen | 3 | hard | 1 | Name a Bruce Springsteen song
song/bowie | 3 | hard | 1 | Name a David Bowie song
song/dolly | 3 | hard | 1 | Name a Dolly Parton song
song/fleetwood | 3 | hard | 1 | Name a Fleetwood Mac song
song/sinatra | 3 | hard | 1 | Name a Frank Sinatra song
song/cash | 3 | hard | 1 | Name a Johnny Cash song
song/kylie | 3 | hard | 1 | Name a Kylie Minogue song
song/zeppelin | 3 | hard | 1 | Name a Led Zeppelin song
song/prince | 3 | hard | 1 | Name a Prince song
song/radiohead | 3 | hard | 1 | Name a Radiohead song
song/rhcp | 3 | hard | 1 | Name a Red Hot Chili Peppers song
song/stevie | 3 | hard | 1 | Name a Stevie Wonder song
song/who | 3 | hard | 1 | Name a song by The Who
song/u2 | 3 | hard | 1 | Name an U2 song
# screen
movie/horror | 1 | main | | Name a horror movie
movie/christmas | 1 | main | | Name a Christmas movie
movie/animated | 1 | main | | Name an animated movie; Name a Disney animated movie; Name a Pixar movie
movie/superhero | 1 | main | | Name a superhero movie; Name a Marvel movie
movie/oscar | 2 | main | | Name a Best Picture Oscar winner
movie/number | 2 | main | | Name a movie with a number in the title
movie/animal | 2 | main | | Name a movie with an animal in the title
movie/villain | 1 | main | | Name a famous movie villain
movie/bond | 2 | main | 1 | Name a James Bond film
actor/sandler | 1 | main | 1 | Name a Adam Sandler movie
actor/arnold | 2 | main | 1 | Name a Arnold Schwarzenegger movie
actor/pitt | 2 | main | 1 | Name a Brad Pitt movie
actor/rock | 1 | main | 1 | Name a Dwayne Johnson movie
actor/jackie | 2 | main | 1 | Name a Jackie Chan movie
actor/carrey | 1 | main | 1 | Name a Jim Carrey movie
actor/depp | 2 | main | 1 | Name a Johnny Depp movie
actor/keanu | 2 | main | 1 | Name a Keanu Reeves movie
actor/leo | 2 | main | 1 | Name a Leonardo DiCaprio movie
actor/streep | 2 | main | 1 | Name a Meryl Streep movie
actor/freeman | 2 | main | 1 | Name a Morgan Freeman movie
actor/robin | 2 | main | 1 | Name a Robin Williams movie
actor/cruise | 1 | main | 1 | Name a Tom Cruise movie
actor/hanks | 1 | main | 1 | Name a Tom Hanks movie
actor/willsmith | 1 | main | 1 | Name a Will Smith movie
director/nolan | 2 | main | 1 | Name a Christopher Nolan film
director/cameron | 2 | main | 1 | Name a James Cameron film
director/spielberg | 2 | main | 1 | Name a Steven Spielberg film
director/tarantino | 2 | main | 1 | Name a Quentin Tarantino film
director/burton | 2 | main | 1 | Name a Tim Burton film
director/hitchcock | 3 | hard | 1 | Name a Alfred Hitchcock film
director/scorsese | 3 | hard | 1 | Name a Martin Scorsese film
director/ridley | 3 | hard | 1 | Name a Ridley Scott film
director/kubrick | 3 | hard | 1 | Name a Stanley Kubrick film
director/wes | 3 | hard | 1 | Name a Wes Anderson film
tv/sitcom | 1 | main | | Name a TV sitcom
tv/netflix | 1 | main | | Name a Netflix series
tv/reality | 1 | main | | Name a reality TV show
tv/kids | 1 | main | | Name a kids' TV show; Name an animated TV series
tv/channel | 2 | main | | Name a TV channel
character/cartoon | 1 | main | | Name a cartoon character; Name a Looney Tunes character
character/superhero | 1 | main | | Name a superhero; Name a superpower
character/disney | 1 | main | | Name a Disney character; Name a Disney princess
character/marvel | 1 | main | 1 | Name a Marvel character
character/dc | 2 | main | 1 | Name a DC Comics character; Name a Batman character
character/pixar | 1 | main | 1 | Name a Pixar character; Name a Toy Story character
character/hp | 1 | main | 1 | Name a Harry Potter character
character/starwars | 1 | main | 1 | Name a Star Wars character
character/simpsons | 1 | main | 1 | Name a Simpsons character
character/friends | 1 | main | 1 | Name a Friends character
character/office | 2 | main | 1 | Name an Office (US) character
character/got | 2 | main | 1 | Name a Game of Thrones character
character/lotr | 2 | main | 1 | Name a Lord of the Rings character
character/breakingbad | 2 | main | 1 | Name a Breaking Bad character
character/stranger | 2 | main | 1 | Name a Stranger Things character
character/shrek | 1 | main | 1 | Name a Shrek character
character/spongebob | 1 | main | 1 | Name a SpongeBob character
character/startrek | 2 | main | 1 | Name a Star Trek character
character/muppet | 2 | main | 1 | Name a Muppet
character/doctorwho | 3 | hard | 1 | Name a Doctor Who character
character/familyguy | 3 | hard | 1 | Name a Family Guy character
character/southpark | 3 | hard | 1 | Name a South Park character
game/videogame | 1 | main | | Name a video game; Name a video game character
game/console | 1 | main | | Name a video game console
game/nintendo | 1 | main | 1 | Name a Nintendo game; Name a Nintendo character; Name a Mario game; Name a Legend of Zelda game
game/pokemon | 1 | main | 1 | Name a Pokémon; Name a Pokémon game
game/sega | 2 | main | 1 | Name a Sega game
# sports
sport/sport | 1 | main | | Name a sport; Name a sport played with a ball; Name an Olympic sport
sport/water | 2 | main | | Name a water sport; Name a winter sport
sport/martial | 2 | main | | Name a martial art or combat sport
sport/equipment | 1 | main | | Name a piece of sports equipment
team/nfl | 1 | main | 1 | Name an NFL team
team/nba | 1 | main | 1 | Name an NBA team
team/mlb | 1 | main | 1 | Name an MLB team
team/nhl | 2 | main | 1 | Name an NHL team
team/soccer | 2 | main | | Name a football (soccer) club; Name a Premier League club
team/mls | 3 | hard | 1 | Name an MLS team
team/europe | 3 | hard | 1 | Name a Bundesliga club; Name a La Liga club; Name a Serie A club
athlete/athlete | 1 | main | | Name a famous athlete
athlete/nba | 1 | main | | Name an NBA player; Name a basketball player
athlete/nfl | 1 | main | | Name an NFL player (past or present)
athlete/nhl | 2 | main | | Name an NHL player (past or present)
athlete/baseball | 2 | main | | Name a baseball player
athlete/soccer | 1 | main | | Name a famous footballer
athlete/tennis | 2 | main | | Name a tennis player
athlete/golf | 2 | main | | Name a golfer
athlete/boxer | 2 | main | | Name a boxer
athlete/swimmer | 2 | main | | Name a swimmer
athlete/niche | 3 | hard | | Name a cricketer; Name a rugby player; Name a cyclist; Name a skier; Name a sprinter or runner; Name a figure skater
stadium/stadium | 2 | main | | Name a stadium
sportterm/basketball | 2 | main | | Name a basketball term; Name a football (soccer) position
# brands
brand/clothing | 1 | main | | Name a clothing brand
brand/store | 1 | main | | Name a store or retailer
brand/tech | 1 | main | | Name a tech company
brand/social | 1 | main | | Name a social media app or website; Name a social network; Name a website
brand/airline | 2 | main | | Name an airline
brand/perfume | 2 | main | | Name a perfume
brand/newspaper | 2 | main | | Name a newspaper; Name a magazine
brand/smartphone | 1 | main | | Name a smartphone
brand/carbrand | 1 | main car | c:makers | Name a car brand
# science
space/planet | 1 | main | | Name a planet, moon or dwarf planet
space/star | 2 | main | | Name a star in the night sky; Name a constellation; Name a zodiac sign
space/galaxy | 3 | hard | | Name a galaxy; Name a comet; Name a moon of Jupiter or Saturn
space/spacecraft | 2 | main | | Name a spacecraft
chem/element | 1 | main | | Name a chemical element
chem/compound | 3 | hard | | Name a chemical compound
rock/gem | 2 | main | | Name a gemstone; Name a famous diamond
rock/rock | 3 | hard | | Name a type of rock; Name a mineral
body/body | 1 | main | | Name a body part; Name a bone
medicine/medicine | 2 | main | | Name a medicine
weather/weather | 1 | main | | Name a type of weather; Name a type of cloud
plant/tree | 1 | main | | Name a tree
plant/flower | 1 | main | | Name a flower
plant/mushroom | 3 | hard | | Name a mushroom; Name a cactus or succulent
myth/greek | 2 | main | | Name a figure from Greek mythology
myth/norse | 2 | main | | Name a Norse god
myth/egypt | 2 | main | | Name an Egyptian god
myth/being | 1 | main | | Name a mythical being
myth/hindu | 3 | hard | | Name a Hindu deity
history/war | 2 | main | | Name a war; Name a famous battle
history/ship | 2 | main | | Name a famous ship
religion/religion | 2 | main | | Name a religion
tech/programming | 3 | hard | | Name a programming language; Name a programming framework or library
art/movement | 3 | hard | | Name an art movement
# objects
object/kitchen | 1 | main | | Name something you find in a kitchen; Name a kitchen utensil
object/bathroom | 1 | main | | Name something you find in a bathroom
object/fridge | 1 | main | | Name something you find in a fridge
object/garage | 1 | main | | Name something you find in a garage; Name a tool
object/school | 1 | main | | Name something you find in a school; Name a school subject
object/furniture | 1 | main | | Name a piece of furniture; Name a room in a house
object/toy | 1 | main | | Name a toy
object/clothing | 1 | main | | Name an item of clothing; Name a type of shoe; Name a hat
object/jewellery | 2 | main | | Name a type of jewellery
object/fabric | 2 | main | | Name a fabric
vehicle/vehicle | 1 | main | | Name a type of vehicle; Name something with wheels
vehicle/boat | 2 | main | | Name a type of boat or ship
vehicle/aircraft | 2 | main | | Name an aircraft; Name a helicopter; Name something that flies
vehicle/train | 2 | main | | Name a train
weapon/weapon | 2 | main | | Name a weapon; Name a sword; Name a tank
game/board | 1 | main | | Name a board game; Name a card game
book/childrens | 1 | main | | Name a Dr. Seuss book; Name a Roald Dahl book; Name a fairy tale; Name a nursery rhyme
book/stephenking | 2 | main | 1 | Name a Stephen King book
book/classics | 3 | hard | 1 | Name a Agatha Christie book; Name a Charles Dickens book; Name a Jane Austen book; Name a Mark Twain book; Name a Terry Pratchett book; Name a Shakespeare play
book/comic | 3 | hard | | Name a comic strip
hobby/hobby | 1 | main | | Name a hobby
dance/dance | 1 | main | | Name a dance; Name a dance move
hairstyle/hairstyle | 2 | main | | Name a hairstyle
colour/colour | 1 | main | | Name a colour; Name a shape
currency/currency | 2 | main | | Name a currency
currency/coin | 3 | hard | | Name a currency symbol or coin
job/job | 1 | main | | Name a job
holiday/holiday | 1 | main | | Name a holiday or celebration; Name a festival
university/university | 2 | main | | Name a university
# wild
wild/red | 1 | main | | Name something that's red
wild/party | 1 | main | | Name something at a birthday party
wild/playground | 1 | main | | Name something at a playground
wild/chore | 1 | main | | Name a household chore
wild/pack | 1 | main | | Name something you pack for a holiday; Name something you take camping; Name something you take to the beach
wild/robot | 2 | main | | Name a famous robot
wild/knot | 3 | hard | | Name a knot
wild/yoga | 3 | hard | | Name a yoga pose
wild/font | 3 | hard | | Name a typeface or font
wild/skate | 3 | hard | | Name a skateboarding trick
wild/chess | 3 | hard | | Name a chess opening
`;
