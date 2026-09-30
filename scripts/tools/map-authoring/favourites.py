"""Favourite treats: one per friend (people and sitting cats), all in one place.

Each region/room script calls add_favourites(npcs) just before writing its file, so every
friend's entry in the region or room JSON gets its own "favourite":
  treat    an art.json item in the treats group (cooking.json "share")
  say      their special thank-you when you share it
  hint     what they sometimes say in a normal chat until they have had it (then the journal shows it)
  gift     given back the first time only, like a quest prize: {"coins": n} and/or {"items": {id: n}}
  giftSay  said with the gift
Rules: GameRules.shareTreat / hintFavourite. The picnic Bun is the same friend as Baker Bun ("sameFriend").
"""

FAVOURITES = {
    # Sunny Farm
    "mama-hen": {"treat": "food-bread",
                 "say": "BREAD! OH, {name}, MY FAVOURITE! I'LL SAVE THE CRUMBS FOR MY LITTLE ONES. BAWK BAWK!",
                 "hint": "BAWK! NOTHING SMELLS AS COSY AS A WARM LOAF OF BREAD FROM THE OVEN.",
                 "gift": {"items": {"egg": 2}}, "giftSay": "PLEASE TAKE TWO OF MY BEST EGGS. THANK YOU, DEAR!"},
    "gardener": {"treat": "food-cake",
                 "say": "A HONEY CAKE! MADE WITH HONEY FROM MY OWN BEES! THIS IS THE BEST DAY EVER, {name}!",
                 "hint": "IF I COULD EAT ONE THING FOREVER, IT WOULD BE A SOFT, STICKY HONEY CAKE.",
                 "gift": {"items": {"seeds": 3}}, "giftSay": "HERE, SOME SEEDS FOR YOUR GARDEN. PLANT THEM WITH LOVE!"},
    "cat-patch": {"treat": "food-pie",
                  "say": "FRUIT PIE! PURRRR... YOU KNEW! YOU REALLY KNEW!",
                  "hint": "MEW... I DREAM ABOUT FRUIT PIE. WARM, WITH A CRUNCHY TOP.",
                  "gift": {"coins": 3}, "giftSay": "I FOUND THESE SHINY COINS IN THE PUMPKINS. THEY'RE YOURS!"},
    "cat-mittens": {"treat": "food-toast",
                    "say": "HONEY TOAST! IT WARMS MY PAWS AND MY TUMMY. THANK YOU, {name}!",
                    "hint": "ON CHILLY DAYS I LOVE HONEY TOAST MORE THAN MY SCARF. ALMOST.",
                    "gift": {"coins": 3}, "giftSay": "I KEPT THESE COINS IN MY SCARF. FOR YOU!"},
    # North Meadows
    "north-granny": {"treat": "food-jam",
                     "say": "BERRY JAM! JUST LIKE I USED TO MAKE. YOU'VE MADE AN OLD CAT VERY HAPPY, {name}.",
                     "hint": "WHEN I WAS YOUNG, I MADE THE BEST BERRY JAM IN THE MEADOWS. OH, HOW I MISS IT.",
                     "gift": {"items": {"blueberry": 2}}, "giftSay": "TAKE SOME BLUEBERRIES FROM MY GARDEN, DEAR."},
    "cat-nimbus": {"treat": "food-cake",
                   "say": "A HONEY CAKE! SOFT AND FLUFFY, JUST LIKE A CLOUD! MEOW!",
                   "hint": "I LOVE THINGS THAT ARE SOFT AND FLUFFY. CLOUDS... AND HONEY CAKE!",
                   "gift": {"coins": 3}, "giftSay": "THESE COINS FELL FROM THE SKY. WELL, SORT OF. THEY'RE YOURS!"},
    "cat-sprig": {"treat": "food-tart",
                  "say": "A BERRY TART! IT'S LIKE A LITTLE GARDEN ON A PLATE! YUM!",
                  "hint": "THE BERRY BUSHES ARE SO PRETTY. BERRIES ARE EVEN BETTER IN A TART!",
                  "gift": {"items": {"raspberry": 2}}, "giftSay": "HERE, I PICKED THESE RASPBERRIES FOR YOU."},
    # West Woods
    "forest-pudding": {"treat": "food-pudding",
                       "say": "PUDDING! MY VERY OWN NAME! IT'S WOBBLY AND PERFECT. THANK YOU, {name}!",
                       "hint": "DO YOU KNOW WHY I'M CALLED PUDDING? BECAUSE IT'S MY FAVOURITE TREAT IN THE WHOLE WORLD!",
                       "gift": {"coins": 5}, "giftSay": "I'VE BEEN SAVING THESE COINS. YOU SHOULD HAVE THEM!"},
    "cat-luna": {"treat": "food-muffin",
                 "say": "A MUFFIN! ROUND LIKE THE MOON! I'LL EAT IT UNDER THE STARS TONIGHT.",
                 "hint": "THE MOON LOOKS JUST LIKE A BIG ROUND MUFFIN, DON'T YOU THINK? MMM, MUFFINS...",
                 "gift": {"coins": 3}, "giftSay": "MOON COINS FOR YOU! THEY SHINE LIKE STARS."},
    "cat-dozy": {"treat": "food-bun",
                 "say": "*YAWN* ...A BUN? MY FAVOURITE! SOFT LIKE A PILLOW. THANK YOU... ZZZ...",
                 "hint": "ZZZ... I WAS DREAMING OF A SOFT, WARM BUN... ZZZ...",
                 "gift": {"coins": 3}, "giftSay": "I FOUND COINS UNDER MY NAPPING SPOT. HAVE THEM..."},
    # East Isle
    "east-grocer": {"treat": "food-pie",
                    "say": "A FRUIT PIE! I SELL THE FRUIT ALL DAY, BUT A PIE IS SO MUCH BETTER! THANK YOU, {name}!",
                    "hint": "ALL THIS FRUIT ON MY STALL... WHAT I REALLY WANT IS A FRUIT PIE.",
                    "gift": {"items": {"apple": 2}}, "giftSay": "HERE, TWO OF MY BEST APPLES. BAKE ANOTHER PIE!"},
    "east-miner": {"treat": "food-sandwich",
                   "say": "A SANDWICH! THE PERFECT MINER'S LUNCH! NOW I CAN DIG ALL DAY, {name}!",
                   "hint": "DIGGING MAKES ME SO HUNGRY. A BIG SANDWICH IS THE BEST LUNCH FOR A MINER.",
                   "gift": {"coins": 5}, "giftSay": "I DUG UP THESE COINS IN THE MINE. TAKE THEM!"},
    "cat-hazel": {"treat": "food-pudding",
                  "say": "PUDDING! IT WOBBLES LIKE A MAGIC SPELL! MEOW, THANK YOU!",
                  "hint": "MY FAVOURITE SPELL MAKES PUDDING. IT NEVER WORKS, SO I JUST WISH FOR SOME.",
                  "gift": {"coins": 3}, "giftSay": "A LITTLE MAGIC FOR YOU: SOME SHINY COINS!"},
    "cat-flit": {"treat": "food-jam",
                 "say": "BERRY JAM! BATS LOVE BERRIES MOST OF ALL! FLAP FLAP, THANK YOU!",
                 "hint": "I FLAP AROUND LOOKING FOR BERRIES. BERRY JAM WOULD BE A DREAM!",
                 "gift": {"items": {"grapes": 2}}, "giftSay": "I FOUND THESE GRAPES ON MY FLIGHT. FOR YOU!"},
    "cat-sprinkles": {"treat": "food-muffin",
                      "say": "A MUFFIN! IT'S LIKE A DONUT WITHOUT THE HOLE! BEST. DAY. EVER!",
                      "hint": "I LOVE DONUTS, BUT THE BAKERY HAS NO DONUTS. A MUFFIN IS THE NEXT BEST THING!",
                      "gift": {"coins": 3}, "giftSay": "HERE ARE MY SPRINKLE COINS. SPEND THEM ON SOMETHING SWEET!"},
    # Pumpkin Hollow's friendly ghosts (the four Halloween cats moved there keep their treats above)
    "ghost-boo": {"treat": "food-bun",
                  "say": "A BUN! FOR ME? NOBODY EVER GIVES A GHOST A BUN! OOOH, THANK YOU, {name}!",
                  "hint": "OOOH... I CAN SMELL SOMETHING FROM THE BAKERY. A SOFT, SWEET BUN WOULD BE BOO-TIFUL.",
                  "gift": {"coins": 4}, "giftSay": "HERE, SOME SHINY COINS I FOUND UNDER THE BRIDGE. BOO!"},
    "ghost-misty": {"treat": "food-sandwich",
                    "say": "A SANDWICH! I'LL SHARE IT WITH THE CROWS. WELL... MAYBE JUST THE CRUMBS. THANK YOU!",
                    "hint": "I GET SO HUNGRY FLOATING ABOUT ALL DAY. A BIG SANDWICH WOULD BE JUST THE THING.",
                    "gift": {"items": {"amethyst": 1}}, "giftSay": "I FOUND THIS PURPLE STONE BY THE CRYPT. IT'S FOR YOU!"},
    "ghost-giggles": {"treat": "food-tart",
                      "say": "HEE HEE HEE! A TART! IT'S SO YUMMY IT MAKES ME GIGGLE EVEN MORE!",
                      "hint": "HEE HEE! DO YOU KNOW WHAT MAKES ME HAPPIEST? A FRUITY LITTLE TART!",
                      "gift": {"coins": 4}, "giftSay": "HEE HEE, TAKE THESE COINS! I KEEP THEM IN THE HAUNTED HOUSE."},
    # Baker Bun's house (the picnic Bun shares this, "sameFriend")
    "baker-bun": {"treat": "food-toast",
                  "say": "HONEY TOAST! I BAKE ALL DAY, BUT NOBODY EVER BAKES FOR ME. THANK YOU, {name}!",
                  "hint": "A BAKER'S SECRET: MY FAVOURITE TREAT IS THE SIMPLEST ONE. WARM HONEY TOAST!",
                  "gift": {"coins": 5}, "giftSay": "PLEASE TAKE THESE COINS. BUY SOMETHING YUMMY AT MY COUNTER!"},
}

SAME_FRIEND = {"picnic-bun": "baker-bun"}


def add_favourites(npcs):
    """Write each friend's favourite into their own entry (followers like the chicks get none)."""
    for n in npcs:
        if n.get('kind') == 'follower':
            continue
        if n['id'] in FAVOURITES:
            n['favourite'] = FAVOURITES[n['id']]
        elif n['id'] in SAME_FRIEND:
            n['sameFriend'] = SAME_FRIEND[n['id']]
        else:
            raise SystemExit(f"friend {n['id']} has no favourite treat: add one to favourites.py")
