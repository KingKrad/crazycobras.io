// The prompt catalog: GEARHEAD (cars and how they work). Same format as existing.js; the topics here
// are car sub-topics, so a GEARHEAD race still gets seven different kinds of prompt.
export const CAR = `
# makers
maker/german | 1 | car | | Name a German car brand; Name a British car brand; Name an Italian car brand; Name a Japanese car brand; Name an American car brand
maker/luxury | 1 | car | | Name a luxury car brand
maker/animal | 2 | car | | Name a car brand with an animal on its logo
maker/truck | 2 | car | | Name a truck or lorry maker
maker/motorbike | 2 | car | | Name a motorbike brand; Name a motorcycle
maker/founder | 3 | car | | Name a car company founder; Name a car designer or engineer
# models
model/model | 1 | car | | Name a car model; Name a car with an animal name
model/ford | 1 | car | 1 | Name a Ford model; Name a Chevrolet model; Name a Toyota model; Name a Honda model; Name a BMW model
model/exotic | 2 | car | 1 | Name a Ferrari model; Name a Lamborghini model; Name a Porsche model
model/sports | 1 | car | | Name a sports car; Name a supercar; Name a muscle car; Name a JDM car
model/suv | 1 | car | | Name an SUV; Name a pickup truck; Name a minivan or people carrier
model/electric | 1 | car | | Name an electric car; Name an electric car brand or model; Name a hybrid car
model/classic | 2 | car | | Name a classic car
model/body | 2 | car | | Name a car body style
# engine
engine/part | 2 | car | | Name a part of an engine
engine/layout | 3 | car | | Name an engine type or layout; Name a drivetrain or drive layout
engine/transmission | 2 | car | | Name a type of transmission
engine/fuel | 1 | car | | Name a type of fuel; Name a car fluid
engine/exhaust | 3 | car | | Name a part of a car's exhaust
# parts
parts/part | 1 | car | | Name a part of a car
parts/body | 1 | car | | Name a part of a car's body
parts/brakes | 2 | car | | Name a part of a car's brakes; Name a part of a car's suspension
parts/electrical | 2 | car | | Name an electrical part of a car; Name a sensor in a car
parts/inside | 1 | car | | Name something you'd find inside a car; Name a car feature or option
parts/safety | 1 | car | | Name a car safety feature
parts/tire | 2 | car | | Name a type of tire
# care
care/maintenance | 1 | car | | Name a car maintenance job; Name something you check before a road trip
care/wontstart | 2 | car | | Name a reason a car won't start; Name a sound a broken car makes
care/warning | 2 | car | | Name a dashboard warning light
care/tools | 1 | car | | Name a tool you'd find in a garage
care/mods | 2 | car | | Name a performance car mod
# racing
racing/f1driver | 1 | car | | Name a Formula 1 driver; Name a Formula 1 world champion
racing/driver | 2 | car | | Name a famous racing driver (any series); Name a rally driver; Name a motorcycle racer
racing/f1team | 2 | car | | Name a Formula 1 team (past or present)
racing/track | 2 | car | | Name a famous race track
racing/series | 2 | car | | Name a motorsport series or famous race
racing/term | 2 | car | | Name a racing term
racing/racecar | 2 | car | | Name a race car
# culture
culture/movie | 1 | car | | Name a famous movie or TV car
culture/game | 1 | car | | Name a racing video game
culture/show | 2 | car | | Name a car TV show or channel
culture/road | 2 | car | | Name a famous road or driving route
`;
