// BOX OFFICE: the hand-picked, household-name lists the prompts are built from. Players know these;
// tools/film/fetch-lists.mjs looks each one up on Wikidata (exact English label, best-known match).
export const DIRECTORS = [
  "Steven Spielberg", "Christopher Nolan", "Quentin Tarantino", "Martin Scorsese", "James Cameron", "Tim Burton",
  "Alfred Hitchcock", "Stanley Kubrick", "Ridley Scott", "George Lucas", "Peter Jackson", "Wes Anderson",
  "Clint Eastwood", "Francis Ford Coppola", "David Fincher", "Michael Bay", "Guillermo del Toro", "Denis Villeneuve",
  "Hayao Miyazaki", "Sofia Coppola", "Spike Lee", "Ron Howard", "Robert Zemeckis", "Woody Allen",
  "Joel Coen", "Tony Scott", "Steven Soderbergh", "Oliver Stone", "Brian De Palma", "John Carpenter", "Sam Raimi",
  "Zack Snyder", "J. J. Abrams", "Jordan Peele", "Greta Gerwig", "Taika Waititi", "Guy Ritchie", "Danny Boyle",
  "Paul Thomas Anderson", "Darren Aronofsky", "M. Night Shyamalan", "Wes Craven", "John Hughes", "Rob Reiner",
  "Mel Brooks", "John Woo", "Ang Lee", "Akira Kurosawa", "Federico Fellini", "Ingmar Bergman", "Pedro Almodóvar",
  "Bong Joon-ho", "Park Chan-wook", "Luc Besson", "Roman Polanski", "David Lynch", "Terry Gilliam", "Richard Linklater",
  "Ivan Reitman", "Chris Columbus", "Joe Russo", "James Wan", "Jon Favreau", "Shawn Levy", "Edgar Wright",
  "Kathryn Bigelow", "Sergio Leone", "Billy Wilder", "Frank Capra", "John Ford", "Orson Welles", "Charlie Chaplin",
  "David Cronenberg", "Rob Zombie", "Adam McKay", "Judd Apatow", "Todd Phillips", "Jon Watts", "Sam Mendes",
  "Baz Luhrmann", "Barry Jenkins", "Ryan Coogler", "Damien Chazelle", "Alejandro González Iñárritu", "Alfonso Cuarón",
  "Paul Verhoeven", "Roland Emmerich", "Gore Verbinski", "Brad Bird", "John Lasseter", "Pete Docter", "Andrew Stanton",
  "Lee Unkrich", "Tyler Perry", "Kevin Smith", "Mike Nichols", "Sydney Pollack", "Penny Marshall", "Nora Ephron",
];
export const ACTORS = [
  "Tom Hanks", "Leonardo DiCaprio", "Brad Pitt", "Tom Cruise", "Will Smith", "Denzel Washington", "Johnny Depp",
  "Robert De Niro", "Al Pacino", "Morgan Freeman", "Meryl Streep", "Julia Roberts", "Scarlett Johansson",
  "Robert Downey Jr.", "Chris Hemsworth", "Chris Evans", "Chris Pratt", "Dwayne Johnson", "Keanu Reeves",
  "Harrison Ford", "Samuel L. Jackson", "Jennifer Lawrence", "Emma Stone", "Ryan Gosling", "Ryan Reynolds",
  "Matt Damon", "Ben Affleck", "George Clooney", "Nicole Kidman", "Angelina Jolie", "Sandra Bullock",
  "Cameron Diaz", "Jim Carrey", "Adam Sandler", "Ben Stiller", "Eddie Murphy", "Robin Williams", "Owen Wilson",
  "Will Ferrell", "Jack Black", "Steve Carell", "Vin Diesel", "Jason Statham", "Sylvester Stallone",
  "Arnold Schwarzenegger", "Bruce Willis", "Mel Gibson", "Nicolas Cage", "Jackie Chan", "Liam Neeson",
  "Christian Bale", "Hugh Jackman", "Anne Hathaway", "Natalie Portman", "Emma Watson", "Daniel Radcliffe",
  "Kate Winslet", "Cate Blanchett", "Margot Robbie", "Zendaya", "Tom Holland", "Timothée Chalamet",
  "Florence Pugh", "Jake Gyllenhaal", "Mark Wahlberg", "Kevin Hart", "Jamie Foxx", "Michael B. Jordan",
  "Chadwick Boseman", "Idris Elba", "Benedict Cumberbatch", "Tom Hiddleston", "Ian McKellen", "Gary Oldman",
  "Anthony Hopkins", "Jack Nicholson", "Dustin Hoffman", "Clint Eastwood", "Marlon Brando", "Paul Newman",
  "Audrey Hepburn", "Marilyn Monroe", "Humphrey Bogart", "James Stewart", "Cary Grant", "Judy Garland",
  "Elizabeth Taylor", "John Wayne", "Gene Wilder", "Bill Murray", "Steve Martin", "Michael Keaton",
  "Jeff Bridges", "Kevin Costner", "Russell Crowe", "Joaquin Phoenix", "Heath Ledger", "Jared Leto",
  "Margot Kidder", "Sigourney Weaver", "Jodie Foster", "Michelle Pfeiffer", "Halle Berry", "Charlize Theron",
  "Reese Witherspoon", "Jennifer Aniston", "Drew Barrymore", "Whoopi Goldberg", "Octavia Spencer", "Viola Davis",
  "Lupita Nyong'o", "Gal Gadot", "Jason Momoa", "Henry Cavill", "Paul Rudd", "Mark Ruffalo", "Jeremy Renner",
  "Elizabeth Olsen", "Chris Pine", "Zoe Saldaña", "Dave Bautista", "Karen Gillan", "Pedro Pascal",
  "Oscar Isaac", "Daisy Ridley", "Adam Driver", "Mark Hamill", "Carrie Fisher", "Ewan McGregor",
  "Orlando Bloom", "Keira Knightley", "Rupert Grint", "Alan Rickman", "Maggie Smith", "Helena Bonham Carter",
  "Emma Thompson", "Hugh Grant", "Colin Firth", "Jude Law", "Daniel Craig", "Pierce Brosnan", "Sean Connery",
  "Michael Caine", "Tom Hardy", "Cillian Murphy", "Matthew McConaughey", "Woody Harrelson", "Jonah Hill",
  "Seth Rogen", "Michael Cera", "Emma Roberts", "Lindsay Lohan", "Amanda Seyfried", "Anna Kendrick",
  "Rebel Wilson", "Melissa McCarthy", "Tiffany Haddish", "Queen Latifah", "Ice Cube", "Martin Lawrence",
  "Wesley Snipes", "Laurence Fishburne", "Forest Whitaker", "Shah Rukh Khan", "Amitabh Bachchan", "Aamir Khan",
  "Salman Khan", "Priyanka Chopra", "Deepika Padukone", "Jet Li", "Bruce Lee", "Michelle Yeoh", "Ken Watanabe",
  "Penélope Cruz", "Antonio Banderas", "Javier Bardem", "Salma Hayek", "Gérard Depardieu", "Marion Cotillard",
  "Audrey Tautou", "Jean Reno", "Mads Mikkelsen", "Sophia Loren",
];
// TV shows (characters prompts)
export const SHOWS = [
  "Friends", "The Simpsons", "Game of Thrones", "Breaking Bad", "The Office", "Stranger Things", "SpongeBob SquarePants",
  "Family Guy", "South Park", "Seinfeld", "The Big Bang Theory", "How I Met Your Mother", "Grey's Anatomy",
  "The Walking Dead", "Doctor Who", "Lost", "Prison Break", "Dexter", "House", "Sherlock", "Downton Abbey",
  "The Sopranos", "The Wire", "Mad Men", "Better Call Saul", "Squid Game", "The Crown", "Wednesday",
  "The Mandalorian", "The Boys", "Peaky Blinders", "Money Heist", "Dark", "Futurama", "Rick and Morty",
  "Bob's Burgers", "BoJack Horseman", "Avatar: The Last Airbender", "Adventure Time", "Gravity Falls",
  "Phineas and Ferb", "Scooby-Doo", "Pokémon", "Naruto", "One Piece", "Dragon Ball Z", "Attack on Titan",
  "Death Note", "Sailor Moon", "Teenage Mutant Ninja Turtles", "The Fresh Prince of Bel-Air", "Full House",
  "Glee", "Gossip Girl", "Gilmore Girls", "Buffy the Vampire Slayer", "The X-Files", "Twin Peaks", "Supernatural",
  "Desperate Housewives", "Sex and the City", "Modern Family", "Parks and Recreation", "Brooklyn Nine-Nine",
  "Arrested Development", "That '70s Show", "Malcolm in the Middle", "Scrubs", "ER", "Cheers", "Frasier",
  "Star Trek: The Next Generation", "Battlestar Galactica", "Westworld", "Euphoria", "Ted Lasso", "Succession",
  "The Last of Us", "House of the Dragon", "Yellowstone", "Hannah Montana", "iCarly", "Victorious",
  "Wizards of Waverly Place", "The Fairly OddParents", "Hey Arnold!", "Rugrats", "Dexter's Laboratory",
  "The Powerpuff Girls", "Courage the Cowardly Dog", "Ed, Edd n Eddy", "Bluey", "Peppa Pig", "Paw Patrol",
  "Thomas & Friends", "Sesame Street", "The Muppet Show", "Power Rangers", "Bridgerton", "Cobra Kai",
  "Only Fools and Horses", "Fawlty Towers", "Mr. Bean", "Neighbours", "EastEnders", "Coronation Street",
];
// franchises and film series (characters and "name a ___ movie")
export const FRANCHISES = [
  "Star Wars", "Harry Potter", "Marvel Cinematic Universe", "The Lord of the Rings", "James Bond", "Jurassic Park",
  "Toy Story", "Shrek", "Pirates of the Caribbean", "The Hunger Games", "Twilight", "Fast & Furious",
  "Mission: Impossible", "Indiana Jones", "Back to the Future", "The Matrix", "Transformers", "X-Men",
  "Spider-Man", "Batman", "Superman", "DC Extended Universe", "Star Trek", "Alien", "Terminator", "Rocky",
  "Ghostbusters", "Despicable Me", "Ice Age", "Madagascar", "Kung Fu Panda", "How to Train Your Dragon",
  "Cars", "Frozen", "The Incredibles", "Finding Nemo", "Monsters, Inc.", "Godzilla", "King Kong", "Planet of the Apes",
  "Halloween", "Friday the 13th", "A Nightmare on Elm Street", "Scream", "Saw", "The Conjuring Universe",
  "John Wick", "The Godfather", "Die Hard", "Home Alone", "Men in Black", "Rush Hour", "Shrek", "Minions",
  "The Lion King", "Pokémon", "Teenage Mutant Ninja Turtles", "The Chronicles of Narnia", "Dune",
  "Avatar", "Wizarding World", "Middle-earth", "Disney Princess", "Winnie-the-Pooh", "Looney Tunes",
  "Tom and Jerry", "Scooby-Doo", "The Muppets", "Barbie", "Sonic the Hedgehog", "Rambo", "Lethal Weapon",
  "Police Academy", "American Pie", "The Twilight Saga", "Paddington", "Mad Max", "Top Gun", "Jaws",
];
// TV networks / streaming (name a show on ...)
export const NETWORKS = ["Netflix", "HBO", "Disney+", "Prime Video", "Hulu", "Apple TV+", "NBC", "CBS", "American Broadcasting Company", "Fox Broadcasting Company",
  "The CW", "AMC", "FX", "Showtime", "Nickelodeon", "Cartoon Network", "Disney Channel", "BBC One", "BBC Two", "ITV",
  "Channel 4", "Comedy Central", "MTV", "Adult Swim", "PBS", "Paramount+", "Peacock", "Starz", "TLC", "Bravo"];
// studios (name a film made by ...)
export const STUDIOS = ["Pixar", "Walt Disney Animation Studios", "DreamWorks Animation", "Studio Ghibli", "Marvel Studios",
  "Lucasfilm", "Warner Bros.", "Universal Pictures", "Paramount Pictures", "20th Century Studios", "Columbia Pictures",
  "Metro-Goldwyn-Mayer", "Lionsgate Films", "A24", "Blumhouse Productions", "Legendary Entertainment", "Illumination",
  "Sony Pictures Animation", "Blue Sky Studios", "Aardman Animations", "Walt Disney Pictures", "New Line Cinema",
  "Miramax", "Amblin Entertainment", "DC Studios", "Laika", "Touchstone Pictures", "Focus Features", "Netflix", "Hammer Film Productions"];
// names the query service can't find by label (their items are missing from its index, though films
// still point at them): their ids, checked by hand
export const FIXED = {
  directors: { "Christopher Nolan": "Q25191" },
  actors: { "Denzel Washington": "Q42101", "Meryl Streep": "Q873", "Bruce Willis": "Q2680", "Mads Mikkelsen": "Q294647", "Ben Affleck": "Q483118", "Angelina Jolie": "Q13909", "Dustin Hoffman": "Q42930", "Emma Stone": "Q147077", "Maggie Smith": "Q172653", "Emma Roberts": "Q228787" },
  networks: { "Prime Video": "Q4740856", "Apple TV+": "Q62446736" },
  studios: { "Legendary Entertainment": "Q621364" },
};
