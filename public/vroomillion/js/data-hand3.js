// Broad CLASSIC prompts: geography twists, word-in-title twists, sports, screen and music.
// Same format as data.js: five tiers from most obvious to most niche, "a|b" = alias.

export const HAND3_QUESTIONS = [
  {
    q: "Name a country that borders Germany",
    a: [
      ["france","poland","austria"],
      ["switzerland","netherlands|holland|the netherlands"],
      ["belgium","denmark"],
      ["czech republic|czechia"],
      ["luxembourg"],
    ],
  },
  {
    q: "Name a country that borders France",
    a: [
      ["spain","italy","germany"],
      ["belgium","switzerland"],
      ["luxembourg","monaco"],
      ["andorra"],
      ["brazil","suriname","netherlands|the netherlands"],
    ],
  },
  {
    q: "Name a country that borders China",
    a: [
      ["india","russia","north korea"],
      ["mongolia","vietnam","pakistan","nepal"],
      ["kazakhstan","afghanistan","myanmar|burma","laos"],
      ["kyrgyzstan","bhutan"],
      ["tajikistan"],
    ],
  },
  {
    q: "Name a country that borders Russia",
    a: [
      ["china","ukraine","finland"],
      ["poland","norway","belarus","kazakhstan","mongolia"],
      ["georgia","estonia","latvia","lithuania"],
      ["azerbaijan"],
      ["north korea"],
    ],
  },
  {
    q: "Name a country that borders Brazil",
    a: [
      ["argentina","colombia","peru"],
      ["venezuela","bolivia","uruguay"],
      ["paraguay"],
      ["guyana","suriname"],
      ["france|french guiana"],
    ],
  },
  {
    q: "Name a US state that borders Canada",
    a: [
      ["alaska","washington","new york"],
      ["montana","michigan","maine","minnesota"],
      ["north dakota","vermont","idaho"],
      ["new hampshire"],
      ["ohio","pennsylvania"],
    ],
  },
  {
    q: "Name a US state on the Mississippi River",
    a: [
      ["louisiana","mississippi","missouri"],
      ["tennessee","illinois","minnesota"],
      ["iowa","arkansas"],
      ["wisconsin"],
      ["kentucky"],
    ],
  },
  {
    q: "Name a landlocked country",
    a: [
      ["switzerland","austria","afghanistan","mongolia","nepal","bolivia"],
      ["hungary","czech republic|czechia","paraguay","kazakhstan","ethiopia","uganda","zimbabwe","zambia","vatican city|the vatican|vatican|holy see"],
      ["luxembourg","liechtenstein","san marino","andorra","serbia","slovakia","belarus","armenia","bhutan","laos","uzbekistan","mali","niger","chad","botswana","rwanda","malawi","south sudan"],
      ["moldova","north macedonia|macedonia","kosovo","azerbaijan","kyrgyzstan","tajikistan","turkmenistan","burkina faso","burundi","central african republic","lesotho"],
      ["eswatini|swaziland"],
    ],
  },
  {
    q: "Name a country that uses the euro",
    a: [
      ["france","germany","italy","spain","ireland","netherlands|holland|the netherlands"],
      ["portugal","greece","belgium","austria","finland"],
      ["luxembourg","malta","cyprus","croatia","slovenia","slovakia","estonia","latvia","lithuania","bulgaria"],
      ["monaco","san marino","vatican city|the vatican|vatican","andorra"],
      ["montenegro","kosovo"],
    ],
  },
  {
    q: "Name a country where Spanish is an official language",
    a: [
      ["spain","mexico","argentina","colombia","peru","chile"],
      ["cuba","venezuela","ecuador","bolivia","uruguay","paraguay"],
      ["guatemala","honduras","el salvador","nicaragua","costa rica","panama","dominican republic"],
      ["puerto rico"],
      ["equatorial guinea"],
    ],
  },
  {
    q: "Name a country where French is an official language",
    a: [
      ["france","canada","belgium","switzerland"],
      ["haiti","senegal","monaco","luxembourg","madagascar","ivory coast|côte d'ivoire|cote d'ivoire"],
      ["cameroon","democratic republic of the congo|dr congo|drc","mali","niger","chad","rwanda"],
      ["republic of the congo|congo","gabon","benin","togo","burkina faso","guinea","burundi","djibouti","central african republic"],
      ["comoros","seychelles","vanuatu","equatorial guinea"],
    ],
  },
  {
    q: "Name an island country",
    a: [
      ["japan","australia","new zealand","iceland","madagascar","cuba"],
      ["united kingdom|uk|great britain|britain","ireland","jamaica","philippines","indonesia","sri lanka","taiwan","fiji","bahamas|the bahamas"],
      ["malta","cyprus","singapore","maldives","mauritius","haiti","dominican republic","barbados","trinidad and tobago","bahrain","papua new guinea","east timor|timor-leste","brunei","seychelles"],
      ["samoa","tonga","vanuatu","solomon islands","kiribati","tuvalu","nauru","palau","marshall islands","micronesia","cape verde|cabo verde","comoros","são tomé and príncipe|sao tome and principe","grenada","saint lucia|st lucia","dominica","antigua and barbuda"],
      ["saint kitts and nevis|st kitts and nevis","saint vincent and the grenadines|st vincent"],
    ],
  },
  {
    q: "Name a Caribbean island or country",
    a: [
      ["jamaica","cuba","bahamas|the bahamas","barbados","puerto rico"],
      ["haiti","dominican republic","trinidad and tobago|trinidad|tobago","aruba","st lucia|saint lucia","cayman islands"],
      ["grenada","antigua and barbuda|antigua","curaçao|curacao","bermuda","turks and caicos","dominica","british virgin islands","us virgin islands|virgin islands","martinique","guadeloupe"],
      ["st kitts and nevis|saint kitts|nevis","st vincent and the grenadines|saint vincent","anguilla","montserrat","sint maarten|st maarten|saint martin|st martin","bonaire","st barts|saint barthélemy|st barthelemy","hispaniola","isla margarita|margarita island"],
      ["sint eustatius|statia","saba","tortola","barbuda","the grenadines","mustique","bequia","isla de la juventud"],
    ],
  },
  {
    q: "Name a country with a king, queen or emperor",
    a: [
      ["united kingdom|uk|britain|england","spain","saudi arabia","japan","thailand"],
      ["netherlands|holland|the netherlands","belgium","denmark","norway","sweden","monaco","morocco","jordan"],
      ["luxembourg","liechtenstein","bhutan","brunei","cambodia","malaysia","kuwait","qatar","bahrain","oman","united arab emirates|uae","canada","australia","new zealand"],
      ["eswatini|swaziland","lesotho","tonga","andorra","vatican city|the vatican","jamaica","papua new guinea","the bahamas|bahamas","belize"],
      ["tuvalu","solomon islands","antigua and barbuda","grenada","saint lucia","saint kitts and nevis","saint vincent and the grenadines"],
    ],
  },
  {
    q: "Name a country that has hosted the FIFA World Cup",
    a: [
      ["brazil","germany|west germany","england","france","italy","usa|united states|america"],
      ["spain","argentina","mexico","russia","qatar","south africa"],
      ["japan","south korea|korea","uruguay","sweden","chile","switzerland"],
      ["canada","morocco","portugal"],
      ["saudi arabia","paraguay"],
    ],
  },
  {
    q: "Name a city on the Danube",
    a: [
      ["vienna","budapest","belgrade"],
      ["bratislava","linz","regensburg"],
      ["ulm","passau","novi sad","ingolstadt"],
      ["ruse","vidin","galați|galati","brăila|braila","esztergom","krems","vukovar","tulcea","giurgiu","komárno|komarno","mohács|mohacs","smederevo","izmail"],
      ["donaueschingen","sigmaringen","straubing","deggendorf","melk","tulln","győr|gyor","szentendre","vác|vac","kalocsa","drobeta-turnu severin","silistra","svishtov","orsova"],
    ],
  },
  {
    q: "Name a city on the Nile",
    a: [
      ["cairo","khartoum","luxor"],
      ["aswan","giza","omdurman"],
      ["juba","jinja","asyut","minya"],
      ["sohag","qena","edfu","kom ombo","wadi halfa","dongola","atbara","malakal","rosetta|rashid","damietta","beni suef"],
      ["kosti","shendi","karima","bor","esna","nag hammadi","mallawi","faiyum","kafr el-zayat","mansoura","gondokoro","nimule"],
    ],
  },
  {
    q: "Name a capital city in Africa",
    a: [
      ["cairo","nairobi","pretoria|cape town|bloemfontein","abuja","addis ababa","rabat"],
      ["accra","dakar","algiers","tunis","kinshasa","khartoum","luanda","kampala","harare"],
      ["dar es salaam|dodoma","tripoli","kigali","lusaka","maputo","antananarivo","yaoundé|yaounde","bamako","abidjan|yamoussoukro","mogadishu","windhoek","gaborone","freetown","monrovia","conakry","lomé|lome","cotonou|porto-novo"],
      ["n'djamena|ndjamena","niamey","ouagadougou","nouakchott","bangui","brazzaville","libreville","malabo","asmara","djibouti","juba","lilongwe","maseru","mbabane|lobamba","port louis","victoria","moroni","praia","bissau","banjul","gitega|bujumbura"],
      ["são tomé|sao tome","laayoune","el aaiún"],
    ],
  },
  {
    q: "Name a capital city in Asia",
    a: [
      ["tokyo","beijing","new delhi|delhi","seoul","bangkok","singapore"],
      ["jakarta","manila","hanoi","kuala lumpur","taipei","islamabad","dhaka","kathmandu","tehran","riyadh","doha","abu dhabi","baghdad","jerusalem","ankara"],
      ["kabul","colombo|sri jayawardenepura kotte","phnom penh","vientiane","naypyidaw|yangon","ulaanbaatar|ulan bator","pyongyang","damascus","beirut","amman","kuwait city","muscat","manama","sana'a|sanaa","astana|nur-sultan","tashkent","baku","tbilisi","yerevan","nicosia"],
      ["bishkek","dushanbe","ashgabat","thimphu","malé|male","bandar seri begawan","dili","putrajaya"],
      ["naypyitaw"],
    ],
  },
  {
    q: "Name a capital city in South America",
    a: [
      ["buenos aires","lima","santiago"],
      ["bogotá|bogota","caracas","brasília|brasilia"],
      ["quito","montevideo","la paz|sucre"],
      ["asunción|asuncion","georgetown"],
      ["paramaribo","cayenne"],
    ],
  },
  {
    q: "Name a movie with a number in the title",
    a: [
      ["101 dalmatians","toy story 2|toy story 3|toy story 4","ocean's eleven|oceans eleven|ocean's 11","the sixth sense","seven|se7en","300"],
      ["2001: a space odyssey|2001 a space odyssey|2001","12 angry men","1917","21 jump street","50 first dates","apollo 13","8 mile","the fifth element","fantastic four","the hateful eight","seven samurai","10 things i hate about you","28 days later","district 9","2012","the 40-year-old virgin|40 year old virgin","13 going on 30","four weddings and a funeral","fast five","2 fast 2 furious","home alone 2","shrek 2","rocky ii|rocky 2","jaws 2","frozen 2|frozen ii","inside out 2","the three musketeers","12 years a slave","the magnificent seven"],
      ["22 jump street","ocean's twelve","ocean's thirteen","ocean's 8","127 hours","(500) days of summer|500 days of summer","twelve monkeys|12 monkeys","seven pounds","3:10 to yuma","three billboards outside ebbing, missouri|three billboards","super 8","9 to 5|nine to five","10 cloverfield lane","6 underground","1984","zero dark thirty","the one","one flew over the cuckoo's nest","friday the 13th","sixteen candles","48 hrs.|48 hrs","the 39 steps","2 guns","3 idiots","13 hours","the 6th day","first blood","the first purge","ten commandments|the ten commandments","1408","30 days of night","the hundred-foot journey","a thousand words","7 days in entebbe","8mm","the number 23","16 blocks","21","the 13th warrior","the 300 spartans","around the world in 80 days","20,000 leagues under the sea","three men and a baby","two weeks notice","two brothers","four christmases","five feet apart","the four feathers","the 5th wave","9","the nines","district b13","the last of the mohicans"],
      ["8 heads in a duffel bag","the 400 blows","8½|8 1/2","the third man","the seventh seal","seven brides for seven brothers","the dirty dozen","the seven year itch","it happened one night","one hundred and one dalmatians","the 7th voyage of sinbad","fahrenheit 451","thx 1138","the taking of pelham 123|the taking of pelham one two three","assault on precinct 13","escape from new york","the 47 ronin|47 ronin","the 2nd","five easy pieces","two for the road","two mules for sister sara","three days of the condor","three kings","four rooms","seven psychopaths","the 13th floor","11:14","23","21 grams","25th hour","27 dresses","30 minutes or less","the 33","57 seconds","88 minutes","99 homes","the 100","1000 times good night","10,000 bc","2046","3 women","the 3 worlds of gulliver","6 souls"],
      ["4 months, 3 weeks and 2 days","9 songs","the 7 faces of dr. lao","1941","1776","1900","1492: conquest of paradise","1971","2:22","the 11th hour","12:01","15 minutes","17 again","18 again!","24 hour party people","31","54","61*","711 ocean drive"],
    ],
  },
  {
    q: "Name a song with a colour in the title",
    a: [
      ["yellow","purple rain","yellow submarine","paint it black","back in black","blue (da ba dee)|blue da ba dee|i'm blue"],
      ["black hole sun","red red wine","lady in red|the lady in red","brown eyed girl","black or white","blue suede shoes","golden","white christmas","a whiter shade of pale","purple haze","back to black","mr. blue sky|mr blue sky","goodbye yellow brick road","little red corvette","fade to black","golden hour","pink pony club","green light","red light","big yellow taxi","black magic woman","blue monday","nights in white satin","white wedding","brown sugar","golden brown","blackbird","black dog","red (taylor swift)|red"],
      ["blue bayou","blue velvet","black velvet","red solo cup","blue jeans","pink","green onions","black beatles","the green manalishi","orange crush","silver springs","blue moon","black betty","red rain","white rabbit","white room","white riot","white lines","purple people eater","yellow ledbetter","black night","black sabbath","blue eyes","blue jean","red house","blue on black","red hot","black widow","silver lining","goldfinger","golden slumbers","green eyes","green, green grass of home","deep purple","black parade|welcome to the black parade","the man in black|man in black","ruby red","violet","white flag","black and yellow","yellow brick road","orange","gold","silver","redbone","blue world","black skinhead"],
      ["red eyes","black coffee","blue hotel","blue sky","green river","yellow river","gold dust woman","pink houses","silver machine","red barchetta","black diamond","blue savannah","red rubber ball","white horse","black widow spider","purple","lavender haze","maroon","champagne problems","blue ain't your color","golden years","black star","blue jean baby","red light special","black hole","back to blue","pinky blue","white dress","black water","red dirt road","blue ridge mountains","green grass and high tides","orange blossom special","yellow rose of texas","brown girl in the ring","black or blue","red flag","blue lips","white noise"],
      ["red eye","blue in green","blue train","black and tan fantasy","mood indigo","rhapsody in blue","pink panther theme","the green leaves of summer","greensleeves","bluebird","black water side","silver dagger","golden earring","gold on the ceiling","silver lining (crazy 'bout you)","lilac wine","crimson and clover","cherry red","indigo"],
    ],
  },
  {
    q: "Name a movie with an animal in the title",
    a: [
      ["the lion king","spider-man|spiderman","batman","the silence of the lambs","kung fu panda","the wolf of wall street"],
      ["black swan","fantastic mr. fox|fantastic mr fox","planet of the apes","reservoir dogs","snakes on a plane","the cat in the hat","chicken run","ant-man|ant man","catwoman","bee movie","the birds","shark tale","teenage mutant ninja turtles","101 dalmatians","the pink panther","isle of dogs","chicken little","dances with wolves","the fox and the hound","the lion, the witch and the wardrobe","raging bull","who framed roger rabbit","jojo rabbit","the mighty ducks","brother bear","cats & dogs|cats and dogs","cats"],
      ["dog day afternoon","gorillas in the mist","the maltese falcon","black hawk down","the eagle has landed","where eagles dare","eagle eye","eddie the eagle","the fly","monkey business","twelve monkeys|12 monkeys","white chicks","war horse","the horse whisperer","wild hogs","rat race","mousehunt","the pelican brief","anaconda","piranha","teen wolf","the wolfman","wolfwalkers","snow dogs","hotel for dogs","red dog","beverly hills chihuahua","howard the duck","duck soup","march of the penguins","ladyhawke","the mothman prophecies","mothra","kung fu panda 2","the bad guys","puss in boots","the secret of nimh","the jungle book","stuart little","the ugly duckling","the cat returns","orca","the goat","the whale","shark night","sharknado","deep blue sea"],
      ["the deer hunter","the bear","elephant man|the elephant man","the lobster","the hunt for red october","to kill a mockingbird","one flew over the cuckoo's nest","the falcon and the snowman","the crow","raven","where the crawdads sing","the squid and the whale","fish tank","big fish","a fish called wanda","the life aquatic with steve zissou","lone wolf mcquade","wolf","the grey wolf","frogs","rabbit hole","hop","the tortoise and the hare","the rabbit-proof fence|rabbit-proof fence","the hound of the baskervilles","the shaggy dog","white fang","my dog skip","marley & me","a dog's purpose","a dog's journey","lady and the tramp","the aristocats","oliver & company","the great mouse detective","an american tail","the land before time","chicken run: dawn of the nugget","the kangaroo jack|kangaroo jack","racing stripes","cool runnings"],
      ["the rocking horse winner","cat ballou","cat people","the cat from outer space","that darn cat!","the incredible mr. limpet","the swan princess","the owl and the pussycat","the yearling","the ox-bow incident","the snake pit","the scorpion king","the spider woman","kiss of the spider woman","the scorpion","the wasp woman","beetlejuice","the beetle","the tick","the ant bully","antz","a bug's life","them!","tarantula","the deadly mantis","the giant claw","the crawling eye","the lion in winter","the leopard","the tiger's tail","crouching tiger, hidden dragon","the bengal tiger","jaguar","the panther","black panther","the cheetah","zebra","the giraffe"],
    ],
  },
  {
    q: "Name a sport played with a ball",
    a: [
      ["football|soccer","basketball","tennis","baseball","american football|gridiron","golf"],
      ["cricket","rugby","volleyball","bowling|ten-pin bowling","table tennis|ping pong","handball","water polo","squash","softball","dodgeball","netball"],
      ["badminton","pickleball","lacrosse","hockey|field hockey","polo","racquetball","snooker","pool|billiards","kickball","beach volleyball","futsal","gaelic football","hurling","australian rules football|aussie rules|afl","rounders","croquet","bocce","petanque|pétanque|boules"],
      ["sepak takraw","korfball","jai alai|pelota","bandy","kabaddi","goalball","footvolley","teqball","padel","paddleball","wallyball","fistball","bossaball","kin-ball","underwater rugby","camogie","shinty","lawn bowls|bowls","skee-ball","foursquare|four square","stickball","cuju","tchoukball"],
      ["calcio storico","buzkashi","chinlone","pato","harpastum","episkyros","pok-ta-pok|mesoamerican ballgame","knattleikr","la soule","royal tennis|real tennis","rackets","fives","eton wall game"],
    ],
  },
  {
    q: "Name a winter sport",
    a: [
      ["skiing","snowboarding","ice hockey|hockey","ice skating|figure skating"],
      ["curling","bobsleigh|bobsled","luge","speed skating","ski jumping","biathlon","sledding|sledging|tobogganing"],
      ["skeleton","cross-country skiing","alpine skiing","freestyle skiing","nordic combined","short track speed skating","snowmobiling","ice climbing","ice fishing","dog sledding|mushing"],
      ["moguls","slalom","giant slalom","downhill","super-g","halfpipe","slopestyle","big air","ski mountaineering","snowkiting","ski touring","bandy","ringette","broomball","synchronized skating"],
      ["skijoring","snowshoeing","ice yachting","ice stock sport","ice speedway","telemark skiing","skibobbing","snow volleyball","military patrol","winter pentathlon"],
    ],
  },
  {
    q: "Name a water sport",
    a: [
      ["swimming","surfing","diving","water polo","rowing","sailing"],
      ["water skiing","kayaking","canoeing","scuba diving","snorkelling|snorkeling","synchronized swimming|artistic swimming","kitesurfing","windsurfing","wakeboarding","jet skiing","paddleboarding|stand-up paddleboarding|sup","white water rafting|rafting"],
      ["bodyboarding","fishing","spearfishing","free diving|freediving","cliff diving","open water swimming","triathlon","dragon boat racing","parasailing","canoe polo","underwater hockey","powerboat racing","yachting","kneeboarding","wakesurfing"],
      ["underwater rugby","flyboarding","bodysurfing","skimboarding","coasteering","hydrofoiling|foiling","kite foiling","outrigger canoeing","sea kayaking","tubing","barefoot skiing","aquathlon","fin swimming","lifesaving"],
      ["underwater orienteering","aquabike","cable wakeboarding","river surfing","tow-in surfing","swimrun","monofin swimming","apnea"],
    ],
  },
  {
    q: "Name an NFL player (past or present)",
    a: [
      ["tom brady","patrick mahomes","peyton manning","jerry rice","travis kelce","aaron rodgers"],
      ["joe montana","lawrence taylor","jim brown","walter payton","emmitt smith","barry sanders","dan marino","brett favre","john elway","deion sanders","jj watt|j.j. watt","rob gronkowski|gronk","josh allen","lamar jackson","joe burrow","jalen hurts","drew brees","russell wilson","odell beckham jr.|odell beckham","randy moss","terrell owens","marshawn lynch","eli manning","ray lewis","jerome bettis","michael vick","cam newton","saquon barkley","justin jefferson","tyreek hill","aaron donald","christian mccaffrey"],
      ["joe namath","johnny unitas","terry bradshaw","troy aikman","steve young","dick butkus","reggie white","michael strahan","ladainian tomlinson","adrian peterson","calvin johnson|megatron","larry fitzgerald","julio jones","davante adams","cooper kupp","ja'marr chase","ceedee lamb","derrick henry","nick bosa","myles garrett","tj watt|t.j. watt","von miller","troy polamalu","ed reed","champ bailey","darrelle revis","richard sherman","ben roethlisberger","philip rivers","matthew stafford","kirk cousins","dak prescott","justin herbert","trevor lawrence","cj stroud|c.j. stroud","caleb williams","jayden daniels","brock purdy","tua tagovailoa","kyler murray","baker mayfield","jared goff","deshaun watson","tim tebow","colin kaepernick","johnny manziel","le'veon bell","alvin kamara","jonathan taylor","nick chubb","derrick brooks","warren sapp","brian urlacher","junior seau","o.j. simpson|oj simpson","bo jackson","gale sayers","eric dickerson","marcus allen","thurman thomas","jim kelly","warren moon","kurt warner","marshall faulk","isaac bruce","michael irvin","deion branch","julian edelman","wes welker","antonio brown","chad johnson|chad ochocinco","hines ward","tony gonzalez","jason witten","george kittle","mark andrews","adam vinatieri","justin tucker"],
      ["bart starr","otto graham","sammy baugh","sid luckman","red grange","jim thorpe","bronko nagurski","don hutson","chuck bednarik","night train lane","deacon jones","bob lilly","mean joe greene|joe greene","jack lambert","mike singletary","william perry|the fridge","howie long","bruce smith","derrick thomas","rod woodson","ronnie lott","mel blount","franco harris","lynn swann","john riggins","earl campbell","tony dorsett","roger staubach","fran tarkenton","ken stabler","jim plunkett","doug flutie","boomer esiason","randall cunningham","steve mcnair","donovan mcnabb","daunte culpepper","carson palmer","matt ryan","andrew luck","joe flacco","alex smith","ryan fitzpatrick","mark sanchez","jay cutler","tony romo","sam darnold","zach wilson","kenny pickett","bryce young","anthony richardson","drake maye","bo nix","j.j. mccarthy","malik nabers","puka nacua","amon-ra st. brown","garrett wilson","a.j. brown","devonta smith","stefon diggs","deebo samuel","mike evans","chris godwin","keenan allen","jaylen waddle","dk metcalf","tee higgins","bijan robinson","jahmyr gibbs","breece hall","josh jacobs","kyren williams","micah parsons","sauce gardner","patrick surtain ii","fred warner","roquan smith","bobby wagner","luke kuechly","patrick willis","ndamukong suh","khalil mack","chandler jones","maxx crosby","trent williams","jason kelce","quenton nelson","jalen ramsey"],
      ["fritz pollard","paddy driscoll","ernie nevers","cliff battles","mel hein","dutch clark","ace parker","bulldog turner","steve van buren","elroy hirsch","norm van brocklin","bobby layne","y.a. tittle","lenny moore","raymond berry","paul hornung","jim taylor","ray nitschke","forrest gregg","willie davis","herb adderley","larry csonka","mercury morris","bob griese","paul warfield","nick buoniconti","alan page","carl eller","jim marshall","ted hendricks","jack tatum","lester hayes","fred biletnikoff","cliff branch","art shell","gene upshaw","dave casper","ozzie newsome","kellen winslow","dan fouts","charlie joiner","john hannah","anthony muñoz","jackie slater","dwight clark","jerry kramer","hugh mcelhenny","joe perry","leo nomellini","dick lane","emlen tunnell","pete pihos","tom fears","frank gifford","sam huff","andy robustelli","rosey grier","tex schramm"],
    ],
  },
  {
    q: "Name an NHL player (past or present)",
    a: [
      ["wayne gretzky","sidney crosby","connor mcdavid","alex ovechkin|alexander ovechkin|ovechkin","mario lemieux","bobby orr"],
      ["gordie howe","mark messier","jaromír jágr|jaromir jagr","patrick kane","auston matthews","nathan mackinnon","steve yzerman","patrick roy","martin brodeur","dominik hašek|dominik hasek","maurice richard|rocket richard","jean béliveau|jean beliveau","brett hull","bobby hull","joe sakic","nicklas lidström|nicklas lidstrom","leon draisaitl","cale makar","jonathan toews","henrik lundqvist","carey price","pk subban|p.k. subban","teemu selänne|teemu selanne","paul kariya","eric lindros","brendan shanahan","chris chelios","ray bourque","mike modano","pavel bure","sergei fedorov","evgeni malkin","steven stamkos","nikita kucherov","connor bedard"],
      ["guy lafleur","mike bossy","bryan trottier","denis potvin","phil esposito","stan mikita","terry sawchuk","glenn hall","jacques plante","ken dryden","larry robinson","paul coffey","grant fuhr","jari kurri","luc robitaille","marcel dionne","dale hawerchuk","peter forsberg","peter šťastný|peter stastny","pat lafontaine","jeremy roenick","scott stevens","scott niedermayer","chris pronger","al macinnis","joe thornton","jarome iginla","martin st. louis","vincent lecavalier","zdeno chára|zdeno chara","patrice bergeron","brad marchand","david pastrňák|david pastrnak","erik karlsson","drew doughty","anze kopitar","jonathan quick","marc-andré fleury|marc-andre fleury","andrei vasilevskiy","igor shesterkin","connor hellebuyck","jack hughes","quinn hughes","matthew tkachuk","brady tkachuk","mitch marner","william nylander","john tavares","kirill kaprizov","jack eichel","mark stone","aleksander barkov","sam reinhart","victor hedman","roman josi","mikko rantanen","elias pettersson","macklin celebrini","kyle connor","tim stützle","jason robertson","artemi panarin","chris kreider","adam fox","tyler seguin","jamie benn","claude giroux","phil kessel","henrik zetterberg","pavel datsyuk","marián hossa|marian hossa","duncan keith","brent seabrook","corey perry","ryan getzlaf","joe pavelski","logan couture","daniel sedin","henrik sedin","roberto luongo","ryan miller","tuukka rask","pekka rinne","shea weber"],
      ["howie morenz","eddie shore","georges vézina|georges vezina","king clancy","syl apps","milt schmidt","ted lindsay","red kelly","doug harvey","bernie geoffrion|boom boom geoffrion","henri richard","dickie moore","tim horton","johnny bower","frank mahovlich","dave keon","bobby clarke","bernie parent","gilbert perreault","darryl sittler","lanny mcdonald","borje salming","tony esposito","billy smith","clark gillies","doug gilmour","wendel clark","mats sundin","cam neely","joe nieuwendyk","doug weight","keith tkachuk","rod brind'amour","eric staal","ilya kovalchuk","alexander mogilny","igor larionov","vladislav tretiak","slava fetisov|viacheslav fetisov","sergei makarov","valeri kharlamov","saku koivu","mikko koivu","markus näslund","todd bertuzzi","ed belfour","curtis joseph","mike richter","brian leetch","adam graves","theo fleury","gary roberts","rick nash","zach parise","ryan suter","ryan o'reilly","nazem kadri","gabriel landeskog","jordan binnington","sergei bobrovsky","juuse saros","jake oettinger","jordan kyrou","robert thomas","trevor zegras","cole caufield","nick suzuki","lane hutson","ivan demidov","matvei michkov","lucas raymond","moritz seider","dylan larkin","owen power","rasmus dahlin","tage thompson","alex debrincat"],
      ["joe malone","cyclone taylor","newsy lalonde","frank nighbor","aurèle joliat","charlie conacher","busher jackson","dit clapper","frank brimsek","turk broda","bill durnan","max bentley","elmer lach","toe blake","sid abel","harry howell","allan stanley","pierre pilote","rod gilbert","jean ratelle","brad park","norm ullman","yvan cournoyer","serge savard","guy lapointe","steve shutt","jacques lemaire","bob gainey","rick middleton","mike gartner","michel goulet","anton šťastný","dino ciccarelli","joe mullen","dave andreychuk","larry murphy","phil housley","sergei zubov","rob blake","kevin lowe","glenn anderson","andy moog","tom barrasso","kirk mclean","trevor linden","alexander selivanov","petr nedvěd","brett lindros","patrik eliáš","pavel bure (the russian rocket)"],
    ],
  },
  {
    q: "Name a famous athlete",
    a: [
      ["michael jordan","lionel messi|messi","cristiano ronaldo|ronaldo","usain bolt","serena williams","lebron james","tiger woods","muhammad ali"],
      ["roger federer","rafael nadal","novak djokovic","michael phelps","simone biles","tom brady","wayne gretzky","babe ruth","pelé|pele","diego maradona|maradona","lewis hamilton","kobe bryant","stephen curry|steph curry","mike tyson","david beckham","kylian mbappé|kylian mbappe|mbappe","shaquille o'neal|shaq","magic johnson","jackie robinson","jesse owens","carl lewis","mohamed salah|mo salah","neymar","zinedine zidane|zidane","michael schumacher","ayrton senna","max verstappen","shohei ohtani","patrick mahomes","conor mcgregor","floyd mayweather","venus williams","naomi osaka"],
      ["nadia comăneci|nadia comaneci","mark spitz","florence griffith joyner|flo-jo","jackie joyner-kersee","eliud kipchoge","mo farah","haile gebrselassie","sebastian coe","edwin moses","michael johnson","katie ledecky","ian thorpe","caeleb dressel","shaun white","lindsey vonn","mikaela shiffrin","tony hawk","kelly slater","lance armstrong","eddy merckx","tadej pogačar|tadej pogacar","sachin tendulkar","virat kohli","don bradman","brian lara","shane warne","jonah lomu","richie mccaw","dan carter","johan cruyff","franz beckenbauer","ronaldinho","ronaldo nazário|r9","thierry henry","erling haaland|haaland","jude bellingham","harry kane","wayne rooney","steven gerrard","lamine yamal","kevin de bruyne","luka modrić|luka modric","manny pacquiao","sugar ray leonard","joe louis","rocky marciano","george foreman","anthony joshua","tyson fury","canelo álvarez|canelo","ronda rousey","jon jones","khabib nurmagomedov","hulk hogan","the rock|dwayne johnson","john cena","kareem abdul-jabbar","larry bird","bill russell","wilt chamberlain","tim duncan","kevin durant","giannis antetokounmpo","nikola jokić|nikola jokic","luka dončić|luka doncic","caitlin clark","derek jeter","hank aaron","willie mays","barry bonds","mike trout","aaron judge","sidney crosby","connor mcdavid","alex ovechkin","mario lemieux","bobby orr","jack nicklaus","arnold palmer","rory mcilroy","scottie scheffler","annika sörenstam|annika sorenstam","billie jean king","martina navratilova","steffi graf","andre agassi","pete sampras","björn borg|bjorn borg","john mcenroe","andy murray","carlos alcaraz","jannik sinner","coco gauff","maria sharapova"],
      ["paavo nurmi","emil zátopek|emil zatopek","abebe bikila","bob beamon","dick fosbury","sergey bubka","armand duplantis|mondo duplantis","faith kipyegon","sifan hassan","shelly-ann fraser-pryce","allyson felix","wilma rudolph","babe didrikson zaharias","jim thorpe","larisa latynina","greg louganis","dara torres","missy franklin","adam peaty","léon marchand|leon marchand","ole einar bjørndalen","marit bjørgen","bjørn dæhlie","ingemar stenmark","hermann maier","alberto tomba","sonja henie","katarina witt","yuzuru hanyu","kim yuna|yuna kim","michelle kwan","scott hamilton","torvill and dean","apolo ohno","eric heiden","bonnie blair","chris hoy","jason kenny","laura kenny","bradley wiggins","chris froome","miguel induráin|miguel indurain","fausto coppi","jacques anquetil","bernard hinault","greg lemond","marco pantani","jonas vingegaard","valentino rossi","marc márquez|marc marquez","giacomo agostini","sebastien loeb","colin mcrae","dale earnhardt","jeff gordon","richard petty","jimmie johnson","mario andretti","a.j. foyt","juan manuel fangio","jackie stewart","niki lauda","alain prost","fernando alonso","sebastian vettel"],
      ["jahangir khan","jansher khan","ronnie o'sullivan","stephen hendry","steve davis","phil taylor","luke littler","michael van gerwen","garry kasparov","magnus carlsen","bobby fischer","lee chong wei","lin dan","ma long","jan-ove waldner","kelly holmes","paula radcliffe","jessica ennis-hill","denise lewis","daley thompson","steve redgrave","matthew pinsent","ben ainslie","ellen macarthur","tom daley","rebecca adlington","frankie dettori","lester piggott","a.p. mccoy|tony mccoy","willie shoemaker","secretariat","red rum","duncan edwards","bobby charlton","george best","stanley matthews","alfredo di stéfano","ferenc puskás","eusébio","lev yashin","gerd müller","garrincha","zico","socrates","romário","marta","mia hamm","abby wambach","megan rapinoe","alex morgan","sam kerr","aitana bonmatí","alexia putellas"],
    ],
  },
  {
    q: "Name an animated movie",
    a: [
      ["the lion king","toy story","frozen","shrek","finding nemo","aladdin"],
      ["the little mermaid","beauty and the beast","moana","up","coco","inside out","the incredibles","monsters, inc.|monsters inc","despicable me","minions","zootopia|zootropolis","kung fu panda","how to train your dragon","ice age","madagascar","cars","ratatouille","wall-e|wall e","tangled","encanto","spirited away","spider-man: into the spider-verse|into the spider-verse","the super mario bros. movie|super mario bros movie","snow white and the seven dwarfs|snow white","cinderella","bambi","dumbo","pinocchio","the jungle book","mulan","pocahontas","hercules","tarzan","lilo & stitch|lilo and stitch","bolt","big hero 6","wreck-it ralph","the lego movie","sing","the secret life of pets","trolls","hotel transylvania","cloudy with a chance of meatballs","megamind","puss in boots","the bad guys","kpop demon hunters","elemental","turning red","soul","luca","wish","raya and the last dragon","brave"],
      ["sleeping beauty","peter pan","lady and the tramp","101 dalmatians|one hundred and one dalmatians","the aristocats","robin hood","the fox and the hound","the rescuers","the black cauldron","oliver & company","the great mouse detective","the hunchback of notre dame","the emperor's new groove","atlantis: the lost empire","treasure planet","brother bear","home on the range","chicken little","meet the robinsons","the princess and the frog","winnie the pooh","strange world","a bug's life","onward","lightyear","the good dinosaur","chicken run","wallace & gromit: the curse of the were-rabbit","shaun the sheep movie","coraline","kubo and the two strings","paranorman","the nightmare before christmas","corpse bride","fantastic mr. fox","isle of dogs","the iron giant","anastasia","the prince of egypt","the road to el dorado","antz","shark tale","over the hedge","flushed away","bee movie","monsters vs. aliens","rise of the guardians","the croods","turbo","penguins of madagascar","home","boss baby|the boss baby","captain underpants","abominable","the wild robot","flow","my neighbor totoro","princess mononoke","howl's moving castle","kiki's delivery service","ponyo","the boy and the heron","akira","your name","the land before time","an american tail","all dogs go to heaven","the secret of nimh","fern gully","the swan princess","rio","ferdinand","epic","storks","smallfoot","the angry birds movie","the emoji movie","the addams family","klaus","the mitchells vs. the machines","nimona","wolfwalkers","song of the sea","the book of life","space jam","who framed roger rabbit","the simpsons movie","the spongebob squarepants movie","south park: bigger, longer & uncut","the lego batman movie","teenage mutant ninja turtles: mutant mayhem","spider-man: across the spider-verse","puss in boots: the last wish","inside out 2","moana 2","zootopia 2","toy story 2","toy story 3","toy story 4","frozen ii|frozen 2","shrek 2","shrek the third","incredibles 2","finding dory","monsters university","cars 2","cars 3","despicable me 2","despicable me 3","despicable me 4","minions: the rise of gru","kung fu panda 2","kung fu panda 3","kung fu panda 4","how to train your dragon 2","how to train your dragon: the hidden world","ice age: the meltdown","madagascar: escape 2 africa","madagascar 3","sing 2","trolls world tour","the super mario galaxy movie"],
      ["fantasia","saludos amigos","the three caballeros","make mine music","fun and fancy free","melody time","the adventures of ichabod and mr. toad","alice in wonderland","the sword in the stone","the many adventures of winnie the pooh","the rescuers down under","fantasia 2000","dinosaur","lilo & stitch 2","the tigger movie","piglet's big movie","pooh's heffalump movie","bambi ii","the lion king ii: simba's pride","aladdin and the king of thieves","the return of jafar","planes","planes: fire & rescue","tinker bell","the pirates! band of misfits","arthur christmas","early man","missing link","the tale of the princess kaguya","grave of the fireflies","porco rosso","nausicaä of the valley of the wind","castle in the sky","whisper of the heart","the cat returns","arrietty","when marnie was there","the wind rises","a silent voice","weathering with you","suzume","perfect blue","paprika","ghost in the shell","the girl who leapt through time","wolf children","mirai","belle","persepolis","the triplets of belleville","the illusionist","waltz with bashir","the secret of kells","sita sings the blues","mary and max","anomalisa","loving vincent","i lost my body","my life as a zucchini","ernest & celestine","the red turtle","chico & rita","the breadwinner","titan a.e.","the pagemaster","quest for camelot","cats don't dance","the thief and the cobbler","rock-a-doodle","a troll in central park","thumbelina","the pebble and the penguin","balto","we're back! a dinosaur's story","once upon a forest","the brave little toaster","the last unicorn","watership down","the plague dogs","heavy metal","fritz the cat","wizards","the lord of the rings (1978)","fire and ice","yellow submarine","the point!","gay purr-ee","the phantom tollbooth","charlotte's web","a boy named charlie brown","snoopy, come home","the peanuts movie","garfield","the garfield movie","open season","surf's up","happy feet","horton hears a who!","the lorax","the grinch","rango","hoodwinked!","barnyard","the ant bully","monster house","valiant","robots","the polar express","beowulf","a christmas carol","mars needs moms","the adventures of tintin"],
      ["the adventures of prince achmed","gulliver's travels (1939)","mr. bug goes to town","the snow queen (1957)","the king and the mockingbird","the little prince and the eight-headed dragon","hakujaden","belladonna of sadness","fantastic planet","allegro non troppo","the mysterious stranger","twice upon a time","starchaser: the legend of orin","the chipmunk adventure","pinocchio and the emperor of the night","the jetsons movie","jetsons: the movie","happily ever after","the princess and the goblin","freddie as f.r.o.7","felix the cat: the movie","tom and jerry: the movie","the land before time ii","an american tail: fievel goes west","the rugrats movie","rugrats in paris","the wild thornberrys movie","jimmy neutron: boy genius","hey arnold!: the movie","doug's 1st movie","recess: school's out","return to never land","stitch! the movie","cinderella ii","mulan ii","brother bear 2","the fox and the hound 2","tarzan ii","the jungle book 2","pocahontas ii","the hunchback of notre dame ii","kronk's new groove","atlantis: milo's return","lady and the tramp ii","101 dalmatians ii","the little mermaid ii","the little mermaid: ariel's beginning","belle's magical world","beauty and the beast: the enchanted christmas","the lion king 1½","leroy & stitch","cars toons","the incredible mr. limpet"],
    ],
  },
  {
    q: "Name a famous movie villain",
    a: [
      ["darth vader","the joker|joker","voldemort|lord voldemort","thanos","hannibal lecter","scar"],
      ["freddy krueger","jason voorhees","michael myers","chucky","pennywise","the terminator|t-800","loki","emperor palpatine|palpatine|darth sidious","agent smith","hans gruber","norman bates","jaws|the shark","cruella de vil|cruella","ursula","jafar","maleficent","captain hook","the wicked witch of the west|wicked witch of the west","gollum","sauron","saruman","bane","green goblin","doctor octopus|doc ock","magneto","ultron","kylo ren","darth maul","general zod","lex luthor","dr. evil|doctor evil","gaston","hades","the grinch","lord farquaad","syndrome","megatron","the predator","the alien|xenomorph","jigsaw","ghostface","leatherface","annie wilkes","nurse ratched","jack torrance","hal 9000","dracula","frankenstein's monster|frankenstein"],
      ["anton chigurh","amon göth|amon goth","hans landa","alonzo harris","gordon gekko","keyser söze|keyser soze","patrick bateman","the wicked queen|evil queen","mother gothel","shere khan","frollo|judge frollo","dr. facilier","captain barbossa|barbossa","davy jones","goldfinger","blofeld|ernst stavro blofeld","jaws (bond)","oddjob","le chiffre","raoul silva","khan|khan noonien singh","the borg queen","biff tannen","the wet bandits|harry and marv","dolores umbridge|umbridge","bellatrix lestrange","lucius malfoy","draco malfoy","president snow","the white witch|jadis","the other mother|beldam","oogie boogie","sid phillips","lotso|lots-o'-huggin' bear","stinky pete","randall boggs","charles muntz","chef skinner","hopper","te kā","king candy|turbo","prince hans|hans","bowser","gru","vector","professor ratigan","tai lung","lord shen","kai","drago bludvist","captain gantu","kaa","ernst blofeld","red skull","zemo","killmonger|erik killmonger","hela","dormammu","mysterio","vulture","electro","venom","the riddler","penguin|the penguin","two-face","catwoman","scarecrow","ra's al ghul","poison ivy","mr. freeze","zod","doomsday","steppenwolf","darkseid","ego","ronan the accuser|ronan","kang","the mandarin","obadiah stane","whiplash","aldrich killian"],
      ["harry powell","nurse mildred ratched","max cady","frank booth","tommy devito","bill the butcher","daniel plainview","lord humungus","immortan joe","colonel stans landa","calvin candie","mr. blonde","bill sikes","fagin","long john silver","captain hook (hook)","rufio","the queen of hearts","the cheshire cat","monstro","stromboli","honest john","chernabog","madame medusa","edgar","prince john","sir hiss","ratcliffe","shan yu","clayton","kronk","yzma","rourke","dr. calico","alameda slim","dr. hamsterviel","the horned king","sykes","mor'du","ernesto de la cruz","callaghan|yokai","bellwether","king magnifico","namaari","evelyn deavor","mrs. tweedy","victor quartermaine","norman stansfield","the mummy|imhotep","the invisible man","pinhead","candyman","samara|sadako","the babadook","pazuzu|the demon","regan","damien thorn","carrie","count olaf","miss trunchbull","the grand high witch","the wicked witch","the nothing","the gmork","jareth|the goblin king","skeletor","the shredder","krang","zurg|emperor zurg","commander cobra","dr. claw"],
      ["harry lime","mrs. danvers","cody jarrett","noah cross","baron von ryker","the man with no name","angel eyes","frank (once upon a time in the west)","hans gruber's brother simon|simon gruber","colonel quaritch","carter burke","the t-1000|t-1000","the t-x","the t-1000 (liquid metal)","cyrus the virus","castor troy","the bride of chucky","pumpkinhead","the creeper","the tall man","mrs. voorhees","the fisherman","charles lee ray","esther","the nun","annabelle","valak","bathsheba","the grabber","art the clown","m3gan","pearl","the entity","dr. moreau","dr. jekyll|mr. hyde","the phantom of the opera","the creature from the black lagoon","the wolf man","king kong","godzilla","mothra","ghidorah","the blob","the thing","the brain","the borg","sil","the queen alien","the engineer","david 8","the replicants|roy batty","colonel kurtz","sergeant hartman"],
    ],
  },
  {
    q: "Name a superhero movie",
    a: [
      ["the avengers|avengers","avengers: endgame|endgame","the dark knight","spider-man","iron man","black panther"],
      ["avengers: infinity war|infinity war","guardians of the galaxy","captain america: the winter soldier|the winter soldier","thor: ragnarok|ragnarok","spider-man: no way home|no way home","deadpool","logan","wonder woman","man of steel","superman","batman begins","the dark knight rises","joker","the batman","x-men","doctor strange","captain marvel","ant-man","the incredibles","spider-man: into the spider-verse|into the spider-verse","aquaman","shazam!|shazam","justice league","batman v superman","suicide squad","deadpool & wolverine|deadpool and wolverine","captain america: civil war|civil war","thor","iron man 2","iron man 3","spider-man 2","spider-man: homecoming|homecoming","the amazing spider-man","venom","big hero 6","the fantastic four: first steps|fantastic four","thunderbolts*|thunderbolts","superman (2025)"],
      ["batman returns","batman forever","batman & robin","superman ii","superman returns","x2","x-men: the last stand","x-men origins: wolverine","x-men: first class","x-men: days of future past","x-men: apocalypse","dark phoenix","the wolverine","deadpool 2","the new mutants","fantastic four (2005)","fantastic four: rise of the silver surfer","daredevil","elektra","ghost rider","blade","blade ii","hellboy","the punisher","hulk","the incredible hulk","green lantern","catwoman","watchmen","kick-ass","the crow","spawn","sky high","megamind","hancock","unbreakable","split","glass","chronicle","the rocketeer","dick tracy","the shadow","the phantom","the mask","mystery men","steel","thor: the dark world","thor: love and thunder","captain america: the first avenger","avengers: age of ultron|age of ultron","guardians of the galaxy vol. 2","guardians of the galaxy vol. 3","ant-man and the wasp","ant-man and the wasp: quantumania","black widow","shang-chi and the legend of the ten rings|shang-chi","eternals","doctor strange in the multiverse of madness","black panther: wakanda forever","the marvels","captain america: brave new world","spider-man 3","the amazing spider-man 2","spider-man: far from home","spider-man: across the spider-verse","venom: let there be carnage","venom: the last dance","morbius","madame web","kraven the hunter","wonder woman 1984","zack snyder's justice league","birds of prey","the flash","black adam","blue beetle","aquaman and the lost kingdom","shazam! fury of the gods","joker: folie à deux","incredibles 2","the lego batman movie","batman: mask of the phantasm","teen titans go! to the movies","hellboy ii: the golden army","hellboy (2019)","constantine","v for vendetta","superman iii","superman iv: the quest for peace","supergirl"],
      ["the amazing spider-man (1977)","captain america (1990)","the punisher (1989)","the punisher (2004)","punisher: war zone","man-thing","ghost rider: spirit of vengeance","blade: trinity","howard the duck","the fantastic four (1994)","batman (1966)","batman: the movie","superman and the mole men","supergirl (1984)","steel (1997)","swamp thing","the return of swamp thing","jonah hex","catwoman (2004)","the spirit","the green hornet","the meteor man","blankman","darkman","the toxic avenger","condorman","zoom","my super ex-girlfriend","special","super","defendor","kick-ass 2","brightburn","the old guard","project power","fast color","thunder force","the tomorrow war","sonic the hedgehog","bloodshot","upgrade","dredd","judge dredd","the phantom (1996)","the shadow (1994)","flash gordon","barbarella","mighty morphin power rangers: the movie","power rangers","teenage mutant ninja turtles","tmnt","the heroic trio","the incredible shrinking woman"],
      ["captain marvel (1941 serial)","batman (1943 serial)","superman (1948 serial)","the adventures of captain marvel","spy smasher","the phantom (1943)","captain america (1944 serial)","batman and robin (1949)","atom man vs. superman","the green hornet (1940)","the shadow (1940)","dick tracy (1945)","mr. superinvisible","supersonic man","the super inframan","darna","krrish","ra.one","minnal murali","the guardians","black lightning","sky captain and the world of tomorrow","the punisher: dirty laundry","spider-man (1978 japanese)","dr. strange (1978)","generation x","nick fury: agent of s.h.i.e.l.d.","the death of the incredible hulk","the incredible hulk returns","trial of the incredible hulk","justice league of america (1997)","wonder woman (1974)","legends of the superheroes"],
    ],
  },
  {
    q: "Name a kids' TV show",
    a: [
      ["spongebob squarepants|spongebob","peppa pig","bluey","sesame street","paw patrol","dora the explorer"],
      ["the simpsons","teletubbies","barney & friends|barney","thomas & friends|thomas the tank engine","pokémon|pokemon","phineas and ferb","adventure time","the powerpuff girls","scooby-doo|scooby doo","tom and jerry","looney tunes","arthur","rugrats","hey arnold!|hey arnold","the fairly oddparents|fairly odd parents","dexter's laboratory","avatar: the last airbender|avatar","gravity falls","steven universe","teen titans go!|teen titans","mickey mouse clubhouse","blue's clues","hannah montana","icarly","the magic school bus","bob the builder","fireman sam","postman pat","in the night garden","hey duggee","cocomelon","doc mcstuffins","daniel tiger's neighborhood","mister rogers' neighborhood","winnie the pooh","pj masks","ben 10","the amazing world of gumball","regular show","kim possible","lizzie mcguire","that's so raven","wizards of waverly place","the suite life of zack & cody","good luck charlie","sofia the first","ducktales","chip 'n dale: rescue rangers","gargoyles","animaniacs","pinky and the brain","power rangers","teenage mutant ninja turtles","fraggle rock","the muppet show","hi-5","the wiggles","boohbah","the tweenies|tweenies","balamory","blue peter","horrible histories","tracy beaker|the story of tracy beaker","byker grove","grange hill","art attack","zig and zag"],
      ["courage the cowardly dog","ed, edd n eddy","johnny bravo","cow and chicken","i am weasel","codename: kids next door","samurai jack","the grim adventures of billy & mandy","foster's home for imaginary friends","chowder","flapjack","the marvelous misadventures of flapjack","camp lazlo","the powerpuff girls (2016)","we bare bears","craig of the creek","over the garden wall","infinity train","summer camp island","clarence","uncle grandpa","steven universe future","the owl house","amphibia","big city greens","kiff","star vs. the forces of evil","wander over yonder","fish hooks","pickle and peanut","milo murphy's law","the ghost and molly mcgee","hilda","she-ra and the princesses of power","voltron: legendary defender","kipo","the dragon prince","the legend of korra","invader zim","danny phantom","jimmy neutron|the adventures of jimmy neutron","my life as a teenage robot","catdog","rocko's modern life","aaahh!!! real monsters","the angry beavers","the wild thornberrys","rocket power","as told by ginger","doug","the ren & stimpy show|ren and stimpy","kenan & kel","all that","the amanda show","drake & josh","zoey 101","victorious","sam & cat","henry danger","the thundermans","game shakers","the loud house","the casagrandes","harvey street kids","sanjay and craig","breadwinners","pig goat banana cricket","rise of the teenage mutant ninja turtles","the penguins of madagascar","kung fu panda: legends of awesomeness","the backyardigans","wonder pets!","little bill","oswald","max & ruby","franklin","caillou","little bear","the berenstain bears","clifford the big red dog","curious george","wild kratts","super why!","word world","martha speaks","cyberchase","zoboomafoo","zoom","reading rainbow","between the lions","dragon tales","sagwa","liberty's kids","maya & miguel","the electric company","3-2-1 contact","bill nye the science guy","beakman's world","ghostwriter","wishbone","are you afraid of the dark?","goosebumps","so weird","even stevens","phil of the future","boy meets world","sabrina the teenage witch","saved by the bell","full house","fuller house"],
      ["the raccoons","the care bears","my little pony","my little pony: friendship is magic","strawberry shortcake","rainbow brite","he-man and the masters of the universe|he-man","she-ra: princess of power","thundercats","silverhawks","bravestarr","visionaries","jem","the transformers","g.i. joe","m.a.s.k.","inspector gadget","heathcliff","the smurfs","the snorks","the get along gang","the wuzzles","adventures of the gummi bears","talespin","darkwing duck","goof troop","bonkers","quack pack","recess","pepper ann","doug (disney)","the weekenders","teamo supremo","the proud family","lloyd in space","dave the barbarian","brandy & mr. whiskers","the buzz on maggie","american dragon: jake long","the emperor's new school","the replacements","jake and the never land pirates","handy manny","little einsteins","special agent oso","jungle junction","the octonauts|octonauts","bing","ben and holly's little kingdom","noddy","the magic roundabout","camberwick green","trumpton","ivor the engine","bagpuss","the clangers","the wombles","danger mouse","count duckula","bananaman","superted","dogtanian","willo the wisp","henry's cat","button moon","rainbow","playdays","play school","teletubbies (2015)","the herbs","pingu","tots tv","brum","fimbles","the koala brothers","charlie and lola","timmy time","shaun the sheep","mr. men","the mr. men show","andy pandy","bill and ben|flowerpot men","come outside","rosie and jim","tikkabilla","big cook little cook","me too!","the story makers","nina and the neurons","my world kitchen","sarah & duck","twirlywoos","clangers (2015)","go jetters","kit and pup"],
      ["the magic garden","romper room","captain kangaroo","howdy doody","kukla, fran and ollie","the mickey mouse club","lamb chop's play-along","shari lewis","pee-wee's playhouse","eureeka's castle","allegra's window","gullah gullah island","the big comfy couch","shining time station","lamb chop","barney and the backyard gang","the elephant show","fred penner's place","mr. dressup","the friendly giant","polka dot door","today's special","under the umbrella tree","the forest rangers","the edison twins","degrassi junior high","ready or not","the odyssey","street cents","you can't do that on television","the tomorrow people","worzel gummidge","the box of delights","the demon headmaster","round the twist","the girl from tomorrow","lift off","johnson and friends","bananas in pyjamas","play school (australia)","hey hey it's saturday","mr squiggle","here's humphrey","the ferals","blinky bill","dot and the kangaroo"],
    ],
  },
  {
    q: "Name a reality TV show",
    a: [
      ["survivor","big brother","the bachelor","love island","keeping up with the kardashians|the kardashians","american idol"],
      ["the voice","the apprentice","jersey shore","the real housewives|real housewives","dancing with the stars|strictly come dancing|strictly","the great british bake off|great british bake off|bake off","rupaul's drag race|drag race","the amazing race","america's got talent|britain's got talent|got talent","the x factor|x factor","shark tank|dragons' den|dragons den","hell's kitchen","masterchef","the bachelorette","too hot to handle","love is blind","selling sunset","queer eye","kitchen nightmares","the osbournes","the simple life","duck dynasty","naked and afraid","deadliest catch","pawn stars","storage wars","cake boss","say yes to the dress","the only way is essex|towie","geordie shore","made in chelsea","i'm a celebrity... get me out of here!|i'm a celebrity","gogglebox","the traitors","squid game: the challenge","beast games","married at first sight","ninja warrior|american ninja warrior","top chef","project runway","america's next top model","the circle","vanderpump rules","below deck","the hills","laguna beach","16 and pregnant","teen mom","catfish","jackass","fear factor","wipeout","extreme makeover: home edition","pimp my ride","cribs|mtv cribs"],
      ["the real world","road rules","the challenge","are you the one?","ex on the beach","temptation island","paradise hotel","the bachelor in paradise|bachelor in paradise","flavor of love","rock of love","i love new york","the surreal life","celebrity big brother","dancing on ice","the masked singer","lego masters","nailed it!","blown away","is it cake?","the great pottery throw down","the great british sewing bee","interior design masters","grand designs","location, location, location","a place in the sun","come dine with me","first dates","naked attraction","love island usa","love island australia","the ultimatum","perfect match","physical: 100","singles inferno","terrace house","the block","my kitchen rules","house rules","the biggest loser","supernanny","wife swap","trading spaces","queer eye for the straight guy","what not to wear","10 years younger","how to look good naked","the swan","extreme makeover","the real housewives of beverly hills","the real housewives of atlanta","the real housewives of new jersey","the real housewives of new york city","the real housewives of orange county","southern charm","summer house","the family chantel","90 day fiancé|90 day fiance","sister wives","my 600-lb life","hoarders","intervention","cops","dog the bounty hunter","ghost adventures","ice road truckers","swamp people","gold rush","alaska: the last frontier","bering sea gold","american pickers","counting cars","overhaulin'","wheeler dealers","top gear","the grand tour","shipwrecked","castaway 2000","the farm","the salon","the colony","alone","dual survival","man vs. wild","running wild with bear grylls","kitchen nightmares usa","ramsay's kitchen nightmares","hotel hell","bar rescue","restaurant impossible","diners, drive-ins and dives","chopped","cutthroat kitchen","worst cooks in america","the great food truck race","ink master","face off","forged in fire","making the cut","glow up","the great interior design challenge"],
      ["an american family","the family (1974)","the real world: new york","survivor: borneo","big brother uk","fame academy","pop idol","popstars","pop stars: the rivals","hear'say","the voice uk","the voice kids","stars in their eyes","opportunity knocks","new faces","star search","the gong show","the dating game","blind date","the newlywed game","love connection","elimidate","next","parental control","room raiders","date my mom","the fabulous life of","my super sweet 16","made","true life","laguna beach: the real orange county","the city","newlyweds: nick and jessica","hogan knows best","gene simmons family jewels","the anna nicole show","breaking amish","my big fat american gypsy wedding","here comes honey boo boo","toddlers & tiaras","dance moms","little women: la","the little couple","little people, big world","jon & kate plus 8","19 kids and counting","long island medium","the real l word","shahs of sunset","married to medicine","basketball wives","love & hip hop","black ink crew","the bad girls club","hell's kitchen uk","the restaurant","the apprentice uk","young apprentice","secret millionaire","undercover boss","the island with bear grylls","eden","the mole","the joe schmo show","joe millionaire","average joe","the bachelor pad","boy meets boy","there's something about miriam","playing it straight","the cougar","momma's boys","who wants to marry a multi-millionaire?","kept","beauty and the geek","the littlest groom","my big fat obnoxious fiancé","the will","the benefactor","the casino","the contender","the ultimate fighter","the club","the restaurant (usa)","the real gilligan's island","kid nation","the lottery","the moment of truth"],
      ["candid camera","queen for a day","this is your life","you asked for it","people are funny","the newlywed game (1966)","the family (uk 1974)","sylvania waters","the living soap","airport","driving school","the cruise","vets in practice","jailbirds","lakesiders","hotel babylon","the house of tiny tearaways","brat camp","faking it","wife swap uk","holiday showdown","the hotel inspector","the restaurant man","the apprentice: you're fired!","big brother's little brother","big brother's bit on the side","love island: aftersun","i'm a celebrity... extra camp","the x factor: battle of the stars","soapstar superstar","celebrity fit club","the games","the salon (uk)","celebrity love island","love on the farm","the colony (uk)","castaway (2007)","the edwardian country house","the 1900 house","the 1940s house","frontier house","colonial house","texas ranch house","the trench","the ship","the regency house party","that'll teach 'em","chef school","the tube","hidden camera"],
    ],
  },
  {
    q: "Name a boy band or girl group",
    a: [
      ["one direction","backstreet boys","nsync|*nsync|n sync","spice girls","bts","blackpink"],
      ["destiny's child","little mix","take that","westlife","boyz ii men","new kids on the block","the jackson 5|jackson 5","the supremes","tlc","girls aloud","the pussycat dolls|pussycat dolls","jonas brothers","the wanted","5 seconds of summer","fifth harmony","all saints","sugababes","en vogue","salt-n-pepa","twice","exo","stray kids","big bang","new edition","new kids","boyzone","blue","five|5ive","s club 7","steps","atomic kitten","bananarama","the bangles","the go-go's","the ronettes","the shirelles","wham!|wham","the beach boys","the four tops","the temptations","jls","union j","busted","mcfly","why don't we","big time rush","o-town","98 degrees","lfo","dream","danity kane","the saturdays","b*witched","eternal","mis-teeq","the pipettes","haim","the chicks|dixie chicks","wilson phillips","xscape","swv","702","3lw"],
      ["newjeans","aespa","le sserafim","ive","red velvet","itzy","seventeen","nct","nct 127","enhypen","txt|tomorrow x together","ateez","got7","shinee","super junior","girls' generation","2ne1","wonder girls","kara","mamamoo","(g)i-dle","babymetal","morning musume","akb48","arashi","smap","menudo","cnco","prettymuch","now united","cimorelli","the vamps","the overtones","collabro","il divo","hey violet","the cheetah girls","the jets","the osmonds","the partridge family","the monkees","bay city rollers","the bee gees","the hollies","the four seasons","frankie valli and the four seasons","the drifters","the platters","the coasters","the miracles","smokey robinson and the miracles","the marvelettes","martha and the vandellas","the crystals","the chiffons","the shangri-las","the andrews sisters","the pointer sisters","sister sledge","the three degrees","labelle","the emotions","the nolans","the weather girls","exposé","the cover girls","sweet sensation","seduction","brownstone","total","allure","jade","hi-five","color me badd","jodeci","dru hill","112","b2k","immature","imx","boyz n da hood","mindless behavior"],
      ["bros","east 17","a1","a-ha","brother beyond","upside down","911","point break","damage","another level","ultimate kaos","north and south","phixx","v","triple 8","same difference","the mcclymonts","liberty x","hear'say","bardot","girlfriend","scandal'us","precious","honeyz","cleopatra","solid harmonie","thunderbugs","girl thing","fe-m@il","21st century girls","hepburn","wildside","vanilla","clea","parade","stooshe","m.o","neon jungle","four of diamonds","rak-su","stereo kicks","only the young","the risk","loveable rogues","kingsland road","new hope club","pretty much","in real life","midnight red","emblem3","iconiq","flo","4th impact","mutya keisha siobhan","say lou lou","the pierces","first aid kit","the staves","the unthanks","the puppini sisters"],
      ["the boswell sisters","the mcguire sisters","the chordettes","the fontane sisters","the dinning sisters","the lennon sisters","the beverley sisters","the king sisters","the dixie cups","the cookies","the angels","the jaynetts","the toys","the velvelettes","the elgins","the ikettes","the blossoms","the orlons","the essex","the exciters","the honey cone","the sweet inspirations","the delfonics","the stylistics","the chi-lites","the dramatics","the manhattans","the moments","the intruders","the o'jays","the spinners","the dells","the impressions","the flamingos","the moonglows","the penguins","the chords","the crows","the orioles","the ink spots","the mills brothers","the ames brothers","the four aces","the four lads","the four freshmen","the crew cuts","the diamonds","the hilltoppers","the fleetwoods","the skyliners","the tokens","the duprees","the elegants","the earls","the capris","the mystics"],
    ],
  },
  {
    q: "Name a Christmas song",
    a: [
      ["all i want for christmas is you","jingle bells","last christmas","white christmas","silent night","rudolph the red-nosed reindeer|rudolph the red nosed reindeer"],
      ["feliz navidad","santa claus is comin' to town|santa claus is coming to town","frosty the snowman","jingle bell rock","rockin' around the christmas tree|rocking around the christmas tree","let it snow!|let it snow","deck the halls","we wish you a merry christmas","o holy night","joy to the world","the twelve days of christmas|12 days of christmas","have yourself a merry little christmas","it's beginning to look a lot like christmas","do they know it's christmas?|do they know it's christmas","fairytale of new york","merry christmas everyone","wonderful christmastime","happy xmas (war is over)|happy xmas war is over","mistletoe","santa tell me","underneath the tree","it's the most wonderful time of the year","sleigh ride","winter wonderland","little drummer boy|the little drummer boy","away in a manger","hark! the herald angels sing|hark the herald angels sing","o come, all ye faithful|o come all ye faithful","the christmas song|chestnuts roasting on an open fire","blue christmas","baby, it's cold outside|baby its cold outside","santa baby","step into christmas","merry xmas everybody","i wish it could be christmas everyday","driving home for christmas","mary's boy child","mistletoe and wine","run rudolph run","here comes santa claus","silver bells","o christmas tree|o tannenbaum","we three kings","the first noel|the first noël","god rest ye merry gentlemen","good king wenceslas","o little town of bethlehem","carol of the bells","you're a mean one, mr. grinch|mr grinch","i saw mommy kissing santa claus","grown-up christmas list","christmas (baby please come home)","one more sleep","stay another day","a holly jolly christmas|holly jolly christmas","it's christmas time|christmas time","christmas lights","happy christmas","8 days of christmas","snowman"],
      ["little saint nick","christmas wrapping","2000 miles","lonely this christmas","i believe in father christmas","a spaceman came travelling","a winter's tale","walking in the air","do you hear what i hear?","i'll be home for christmas","it came upon the midnight clear","angels we have heard on high","ding dong merrily on high","in the bleak midwinter","once in royal david's city","silent night, holy night","the holly and the ivy","while shepherds watched their flocks","o come, o come, emmanuel","what child is this?","joy to the world (three dog night)","pretty paper","christmas canon","christmas eve/sarajevo 12/24","wizards in winter","father christmas","christmas time is here","linus and lucy","the man with the bag","nuttin' for christmas","all i want for christmas is my two front teeth","i want a hippopotamus for christmas","grandma got run over by a reindeer","the chipmunk song|christmas don't be late","dominick the donkey","jingle bell rock (hall & oates)","christmas in hollis","christmas in killarney","the christmas waltz","let it snow (boyz ii men)","this christmas","someday at christmas","what christmas means to me","back door santa","merry christmas baby","please come home for christmas","christmas (i don't wanna fight)","merry christmas (i don't want to fight tonight)","the christmas shoes","where are you christmas?","believe","when christmas comes to town","spirit of the season","hallelujah","a marshmallow world","it's cold outside","christmas tree farm","cozy little christmas","under the mistletoe","santa's coming for us","candy cane lane","everyday is christmas","christmas every day","a hazy shade of winter","all i want for christmas is new year's day","one more sleep (leona lewis)","everything you want for christmas","glittery","christmas list","christmas tree","kiss you this christmas","my only wish (this year)","under the tree","merry christmas","that's christmas to me"],
      ["the wassail song","here we come a-wassailing","the boar's head carol","coventry carol","gaudete","personent hodie","sussex carol","the cherry tree carol","i saw three ships","tomorrow shall be my dancing day","a virgin unspotted","in dulci jubilo","lo, how a rose e'er blooming","of the father's love begotten","o holy night (cantique de noël)","pat-a-pan","il est né, le divin enfant","un flambeau, jeannette, isabella","bring a torch, jeannette, isabella","the friendly beasts","go tell it on the mountain","mary had a baby","children, go where i send thee","rise up, shepherd, and follow","jesus christ the apple tree","the angel gabriel from heaven came","infant holy, infant lowly","see amid the winter's snow","the shepherds' farewell","jingle bells (original one horse open sleigh)","up on the housetop","jolly old saint nicholas","the night before christmas","toyland","march of the toy soldiers","the nutcracker suite","dance of the sugar plum fairy","troika","christmas alphabet","mistletoe and holly","the christmas blues","christmas island","mele kalikimaka","jingle bell boogie","zat you, santa claus?","santa claus got stuck in my chimney","rudolph the red-nosed reggae","jingle bells (barking dogs)","the twelve pains of christmas","christmas at ground zero","it must have been the mistletoe"],
      ["boar's head","quem pastores laudavere","verbum caro factum est","hodie christus natus est","riu riu chiu","ríu chíu","ya viene la vieja","los peces en el río","campana sobre campana","noche de paz","adeste fideles","stille nacht","o du fröhliche","leise rieselt der schnee","kling, glöckchen","tochter zion","es ist ein ros entsprungen","süßer die glocken nie klingen","nu är det jul igen","jul, jul, strålande jul","santa lucia","tu scendi dalle stelle","astro del ciel","minuit, chrétiens","petit papa noël","vive le vent","les anges dans nos campagnes","shchedryk","jingle bells (jazz)","ave maria","panis angelicus","the holly bears the crown","wexford carol","the darkest midnight","the miraculous harvest","the bitter withy","joseph was an old man","down in yon forest","king jesus hath a garden","masters in this hall","on christmas night all christians sing","past three o'clock","unto us is born a son","good christian men, rejoice","the seven joys of mary","the twelve days (scottish)","the gower wassail","the gloucestershire wassail","the somerset wassail","apple tree wassail"],
    ],
  },
];
