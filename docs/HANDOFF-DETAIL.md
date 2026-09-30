# HANDOFF — Sprout Lands game (rebuild in progress)

Written 2026-09-28 at the end of the first Claude session, and updated later the same day by four more sessions: layout chosen and new engine (2nd), the whole UI (3rd), a "make it busier for kids" pass (4th), and **the rest of that pass: journal, map, ending, start screen, new high-resolution characters, petting, emotes, paw cursor, music, mailbox, gates (5th, latest)**. Everything described here is saved in git (last commit: "Panel decoration..."). **This file is the only plan.** All older plans and briefs were removed to avoid confusion (see section 9).

**Read section 3b first**: the user found the game too minimal, and that shapes every next step.

## 1. What the user wants

- **Claude builds and fixes everything. Don't use Codex.** The user said "dont use codex… I need you to fix all".
- The goal is a **full, production-ready game** that can be **easily edited later**: names, dialogue, quests and maps should be simple text/JSON files. **No new art for now.** Use only the pictures already in this folder.
- **Only use assets inside `E:\Z Pixel\Sprout-Lands`.** Don't use `E:\X Phaser` or `E:\Z Pixel\Phaser`.
- The user **owns the paid versions** of the Sprout Lands Sprites and UI packs.
- The user prefers **plain language, no jargon**.
- **No helpers/sub-agents.** When Claude offered to hand UI screens to cheaper agents the user said "do it yourself". (The user also switched this chat to a cheaper model themselves, so keep steps small and check every change with screenshots.)
- The user reads screenshots, not code. Show pictures after every visible change.

## 2. The product (condensed from the original brief)

- **What it is:** a reusable, single-player Phaser 4.2.1 **WebGL** adventure for children around 8–12.
  - A new personalised gift game is made by editing **only the content package**: title, recipient name, characters, maps, quests, dialogue, rewards, theme and art list.
  - No customer-specific names go in the engine code.
- **Player setup:** a username and an avatar choice. An optional photo stays on the device, resized and stored in IndexedDB.
- **Separate identity per `gameId`:**
  - save key `personal-adventure:<gameId>:save:v1`;
  - profile-photo database;
  - offline-cache prefix;
  - install manifest `id`, `start_url` and name;
  - texture keys.
  - Two gift games must never overwrite each other.
- **World:** one large connected world. Required places: meadow, forest, school/neighbourhood, rivers, bridges, wetlands, beach/shore, small islands, and at least one hidden or locked area.
- **Quests, as data:**
  - "Help the Baby Chicks Find Mom": the original "Baby Ducks" idea, using the hen and chicks because there is no duck art.
  - "Lost in the Forest": follow clues, find the lost friend, walk them home.
  - Goal types: talk, reach, inspect clue, collect, gather followers, escort, deliver, unlock, reward.
  - Allow flexible order. Give rewards exactly once. Resume mid-quest after a reload.
- **Controls:**
  - keyboard (WASD/arrows, E/Space) and touch/mouse (tap to walk, hold to steer);
  - touch targets of at least 44 px, visible focus, a reduced-motion setting;
  - status never shown by colour alone;
  - portrait phones get a "turn sideways" message.
- **Install:** as an app (PWA) on Android and Windows, and it opens offline on the second launch.
- **Multiplayer:** keep a replaceable "session" layer so it could be added later. Don't build it.
- **Unsupported devices:** show a friendly message if WebGL is missing.
- **Credits:** Cup Nooble credit visible in the game, licence notes in the release docs, and only the art files actually used get shipped.

## 3. World layout: "River Garden" (chosen 2026-09-28)

The user picked the **River Garden** layout: one big island with the village in the middle, rivers around it crossed by bridges, a forest on the west, fruit trees (orchard) on the east, farm fields and a dock in the south, and tiny islands around the coast. (An earlier sketch of 8 separate islands was rejected.)

- The picture `docs/map-concepts/generated/river-garden-village.png` shows that layout, **but its look is wrong**. It is AI art with tall brown cliffs and a style the real tiles can't make. The user said "sprouts tiles arent like that". Use it for the layout idea only. `seasonal-islands-village.png` in the same folder is the unchosen option.
- **The look must come from the real tiles**, the way Cup Nooble's own promo scenes on https://cupnooble.itch.io/sprout-lands-asset-pack use them. Those are the reference pictures the user showed earlier:
  - the banner with the open-top farmhouse, pier and rowboat;
  - the hedge-maze forest (a thick bush mass around clearings, sand patches, orange trees);
  - the small barn island with chicks, a tilled patch and a rowboat.
  - The look: flat top-down ground, soft green coasts or a thin sand rim, pale teal water with little ripples. No cliffs.
- Palm trees, a torii gate and autumn trees are **not** in the packs. Snow, ice, Christmas items and cherry-blossom trees are.
- Nature has no straight lines: coasts, banks, ponds and forest edges must wobble every few tiles. Only built things (fences, fields, bridges, houses) are straight.

## 3b. Design direction: busy, colourful, alive (user feedback, 2026-09-28)

After seeing the farm and the menus the user said, in their words: it is "a bit minimalistic", it should be "more interesting for kids", it looks "too modern minimalistic, which I like from my personal stuff, but not for a game". They also asked whether the packs had "a whole bunch of different assets". **They do**, and most of them are still unused. The user sent back the screenshot of the journal / map / ending screens: big flat beige boxes with a few words.

What a kids' game needs, and what to do about each:
- **Something is always moving.** Done for the farm: wandering hens, chicks, cows and calves, hopping frogs, bees, fish shadows, a bobbing boat, a campfire. The menus now have animals sitting on their edges. Still to do: characters that react, emotes, confetti, animated cards.
- **Things to find and collect, with instant feedback.** Done: coloured eggs, fruit that falls when a tree is shaken, berries, honey, treasure chests, with sparkles, "+1" pop-ups, sounds, an item bar and heart / coin / star counters. Still to do: fishing, petting animals for hearts, flowers to pick, letters in the mailbox.
- **Screens full of pictures, not words.** Started: title plaques, flower borders, mascots. Still to do (in this order): illustrated quest journal, map with pins and animal dots, celebrating ending screen, animated start screen (details in section 11).
- **Colour and variety.** Cherry-blossom grove added; snow/ice, birch, pine, autumn-free (no autumn art exists). Hens, cows and calves come in five colours each.
- **Sound.** Only eight short effects exist (see section 8). The pack also has flute tunes (Sorry pack audio `flute_1..4`): play them softly and randomly as ambient music.

**What the packs still hold that the game does not use yet** (all inside this folder, all fine to use; the Sorry pack is OK for commercial use per section 5):
- *Characters and actions:* Cup Nooble's cat hero "Teemo" with a huge action sheet (`Sprites premium pack/Characters/Premium Charakter Spritesheet.png`, 384 x 1152): walking, running, axe, hoe, watering, fishing, swimming. Could become a 7th choosable friend that unlocks fishing and watering. Also `Basic Charakter Actions.png`, `Tools.png`, `water from wateringcan frames.png`.
- *Fishing:* Sorry pack `Early Access/Ocean Pack/`: fishing animations (front, back, side), rod pieces, splash frames, `Fish Sprites.png` (a 160 x 80 sheet of coloured fish icons), plus the three swimming-fish sheets (already used as shadows).
- *Animated props:* `Tilesets/Building parts/`: `Mailbox Animation Frames.png` (176 x 336), `door animation sprites.png` (288 x 32), `Fence gates animation sprites .png`, `Water tray.png`, `Barn structures.png` (hay bales, crates), `Paths.png` (boardwalks), `Wooden_House_Roof_Tilset.png` and `Wooden_House_Walls_Tilset.png` (to build houses you can enter), `work station.png`.
- *Village pack* (Sorry pack): small houses and huts in 9 colours (light and dark versions), grey brick houses, `wooden_door_spritesheet.png` (the doors in different colours).
- *Trees:* `Objects/Tree animations/` has fruit-drop and tree-shake animations (`tree apple sprites.png`, `no_tree_*_sprites.png`), and a tree-falling sheet. Biomes: cherry blossom, birch (`Birch wood Biom.png`) and pine, with matching water plants.
- *Winter set* (Sorry pack `Sprout winter/`): Christmas tree, animated presents, snowflakes, snow and ice tiles, campfire, fire. Only part of it is used.
- *Dungeon pack:* bats, a small green slime, minecarts, rails, gems and potions (`dungeon_items.png`, already used for gems), walls, switches. A cave area could use it.
- *UI extras* (UI pack): cat emotes (`tiny emotes.png`, `Teemo ... emote animations`), 300+ coloured emoji icons (`emojis/Emoji spritesheet.png`), six colours of speech bubbles (`emojis/speech_bubble_*.png`), progress rings (`Stamina circle ... sprite sheet.png`), a big PLAY button, coloured round buttons, inventory boxes and hearts, weather icons, **cat-paw mouse cursors** (`UI Sprites/Mouse sprites/Catpaw*.png`, 16 x 16; make a 2x or 3x pixel-doubled copy for a CSS cursor).
- *Items* (Premium sprites `Objects/Items/`): all the food, milk, egg, tool and material icons.

## 4. The game runs again (new engine), showing only the test area

`npm run dev` (http://localhost:8190) starts the **new** engine: `src/main.js` → `src/engine/boot/startGame.js` → `LoadScene` → `OverworldScene` (the world) with `UIScene` (menus, buttons, speech box) drawn on top. You can walk around the Sunny Farm test area (now full of animals and things to collect), talk to Mama Hen, the chick and the gardener, shake trees, open chests, and use every menu. The first real quest, **"Help the Baby Chicks Find Mom"**, can be played from start to end (see section 11, step 3). The world has three areas: Sunny Farm, the West Woods and the North Meadows (no village yet).

The old Codex code was **deleted on 2026-09-29** (Opus): the old engine folders, old scenes, `src/ui`, `style.css`, `theme.json`, `world.graph.json`, the old scripts and the old `public/sw.js` / `manifest.json`. It's all still in git history (the first commit) if anything is ever needed. Its known bugs are listed in section 10; don't copy them.
- Codex was closed at the start of the second session (the user confirmed).

## 5. Licences (checked and recorded)

- **Sprites Premium and UI Premium are paid and fine for commercial use.** Credit Cup Nooble, and don't ship the raw pack.
- **Sorry pack:** its `read_me.txt` says "non-commercial", but Cup Nooble publicly answered two buyers on https://cupnooble.itch.io/sorry-package that it can be used in commercial games. That evidence is recorded in the catalog. The user could ask Cup Nooble on Discord (`cup_nooble`) for written confirmation.
- **Not used:**
  - Basic UI pack: free and non-commercial. Everything useful in it is also in Premium.
  - Tilemap-0.2.0 and UI-0.2.0: Godot add-ons with MIT code and free Basic art.

## 6. What's done

**New in the second session (wired in and running):**

| File | What it is | State |
|---|---|---|
| `src/engine/world/terrain.js` | Turns the world grid into ground tile layers: soil under the land, grass on top (soft coast or soft edge onto sand), dark grass, hill, hedge (deep forest fill inside), bridges, stepping stones, fences | done, checked by screenshots |
| `src/engine/scenes/OverworldScene.js` | Draws animated water, the tile layers, objects (sorted so things lower on screen are in front, trees/houses fade when you're behind them), animals and NPCs, and the player (8-direction walk, collision with the walk grid, keyboard + tap-to-walk). The camera uses a whole-number zoom of 2–4 | first version |
| `src/engine/scenes/LoadScene.js`, `src/engine/boot/startGame.js`, `src/engine/content/loadContent.js`, `src/main.js`, `index.html`, `src/game.css` | Start-up: loads every texture listed in art.json and reads the content package through the `@content` alias (set in `vite.config.js`, which can be changed with `CONTENT_PACKAGE=...`). Includes the "no WebGL" and "turn sideways" messages | done |
| `src/content/starter-adventure/world/world.json` | World size, which regions go where, the start spot and the map key (`mapKey`) | done for the test area |
| `src/content/starter-adventure/world/regions/farm.json` | **Sunny Farm test area** (60 × 40): text map, 177 hand-placed objects, Mama Hen, a chick and the gardener | waiting for the user's yes |
| `scripts/tools/map-authoring/farm_v2.py` + `farm_objects.py` | How the farm was drawn: hand-picked coast, bank, forest-edge and trail numbers, plus the object list, with checks (right ground, nothing solid on trails, trees not touching, every important spot reachable from the start). Running `farm_objects.py` rewrites farm.json | helper tools |
| `public/assets/tiles/grass-soft.png` and `grass-dark.png` | Premium "Old tiles/Grass.png" (the soft green coast of the promo scenes) and Darker_Grass_Tile_Layers | added to the catalog; 73 files |

**Fifth session (Sonnet 5.5, 2026-09-28): the richness pass is nearly finished. All saved in git, `npm run check:ui` passes (now with a "friendly things" test).**

| Done | Where / how |
|---|---|
| Illustrated quest journal | `ui/JournalPanel.js`: a face tab per quest, giver in the wooden frame, steps with a row of little pictures for "find N" steps, prize row, hero + "?" bubble when empty. Quest data may carry `icon`, `reward: { stars, hearts, coins, items }`, per-step `icon`. Tested only with quests injected by a script |
| Map with pins | `ui/MapPanel.js`: framed picture, the player's own face bobbing, animal dots that move (`Modal.update` hook, called from `UIScene.update`), tap a pin to read the place name. Places come from `landmarks` in region files (written by `farm_objects.py`); their icons are `art.json ui.mapIcons` |
| Celebrating ending | `ui/EndingPanel.js`: confetti (off with "Less motion"), stars pop in one by one with a sound, name in big letters, a hopping cast from `game.config.json ending.cast` |
| Animated start screen | `ui/StartScreen.js`: the chosen friend walks on the spot and hops when picked, plaque shows `shortTitle`, four animals sit on the panel edge |
| **New characters** | Two kinds of sources go through `py scripts/tools/build-characters-4dir.py` (then `node scripts/sync-art.mjs`), both into the game's usual sheet (32 x 32 cells, 8 directions x 3 poses) in `Generated Characters/game-ready-4dir/`. **Best quality: `Generated Characters/sources-v2/`** holds clean pixel-art sheets (transparent background, drawn exactly 8x too big; 4 rows front / left / right / back x 8 poses): the script finds the pixel grid, copies the real pixels 1:1 (soft ground shadow kept), no blur. Used for capybara, scarf capybara, Cloud Pup and Little Imp. **`sources-4dir/`** holds older blurry sheets, shrunk with a filter (rougher): still used for Pudding Pup, Snowy Pup and Tabby Cat until better ones arrive (a name in `sources-v2` wins over the same name in `sources-4dir`). Diagonals borrow the left / right pictures; the 3 poses are standing plus the two most different steps. Checked in the game: every direction faces the way it walks. Characters: capybara, gardener (= Scarf Capybara), pudding-pup (yellow dog), sky-puppy (Cloud Pup), snowy-puppy, forest-imp (Little Imp), tabby-cat. Older `game-ready-32` and 16 x 16 sheets are unused. The yellow dog, white puppies, black imp and cat resemble well-known Sanrio / Pusheen characters: fine for a private gift, worth a thought before selling |
| Petting + kindness hearts | `OverworldScene.refreshNear/pet/kindnessHeart`. Wandering hens, chicks, cows and calves can be petted (use button turns into a heart; talkers and things to use take priority). The first pet of each animal (or first talk with an animal NPC) gives one heart, saved as `pet:<id>` in `state.collected`. Cows and calves play their "love" row; others hop |
| Emotes | `Effects.emote(sprite, icon)` (pops over a head) and `Effects.attachEmote(sprite, icon)` (stays and bobs; returns a remover). An NPC with `"emote": "exclaim"` in its region entry shows one automatically. Icons are `ui.mapIcons` names (`exclaim`, `question`, `heart`, `star`...). **Nothing uses the persistent "!" yet: the quest work should set it on quest givers** |
| Cat-paw cursor | `engine/boot/cursors.js` + `game.css`: three paw pictures doubled to 32 px, paw / pointing paw over buttons / holding paw while pressed. Mouse only (`pointer: fine`) |
| Soft flute music | `AudioService.startMusic`, config in `art.json music` (four flute sounds, volume 0.35, every 20-40 s). Sounds `flute-2..4` added to the catalog |
| Mailbox with letters | interactable kind `mailbox` in `systems/Pickups.js`; letters `{ from, portrait, text, reward: { coins | item } }` in the region file. An envelope bubble flips while letters wait; opening plays the mailbox frames (`art.json mailbox`). Farm mailbox at (23, 15) with two placeholder letters |
| Swinging fence gates | `systems/Gates.js`, region `gates: [{ at }]` on a gap in a left-right fence line (`farm_objects.py` checks that). Solid while shut, swings open when you come within 30 px, shuts 1.2 s after you leave (never on someone in the doorway). Three on the farm |
| Fishing | `systems/Fishing.js`, interactable kind `fishing` (`{ at, cast }`: where the player stands, and the water tile the bobber lands on; `farm_objects.py` checks both). Press use to cast, wait for the splash and the "!", press use again within 1.6 s to catch. Too early or too late catches nothing; walking away puts the rod away. What bites and how often is `art.json fishing.catches` (13 things from the ocean pack's `Fish Sprites`; the bottle and the little chest also give coins). Catches go in the bag group `fish`, shown as a sixth slot on the item bar. One spot on the farm: the end of the pier at (38, 38) casting east |
| Optional profile photo | `engine/state/PhotoStore.js` + `ui/StartScreen.js` (`PhotoSlot`): a small frame at the end of the name row on the start screen (open it again from Settings -> Friend). Tap it to pick or take a photo, tap the x to remove it. The picture is cropped to a 64 x 64 round avatar and saved **only in this browser's IndexedDB**, in a database named `personal-adventure:<gameId>:photos` (so two gift games never share one); `profile.hasPhoto` in the save says whether to load it. `UIScene.photoKey()` gives the texture (`<gameId>:profile-photo`) or null; the map's "you are here" marker uses it instead of the friend's face. Tested by `check:ui` (add, survives a reload, remove). Not shown anywhere else yet (journal, ending) |
| **Background music** | 24 "Cozy Farm" tracks supplied by the user (raw mp3s in `Music/Cozy Farm Tracks/`, git-ignored; the shipped copies are 64 kbps mp3s in `public/assets/music`, 21 MB, made by `node scripts/sync-art.mjs` from catalog entries with `process.encode`). `engine/audio/MusicPlayer.js` plays them shuffled, one after another with a 3-8 s gap, streaming (nothing preloaded); the first track starts on the first tap / key press. Settings has a new **Music** slider (`settings.musicVolume`, default 0.5); the mute setting silences it; it pauses in a hidden tab. Playlist and loudness are in `art.json music`. The old flute chimes are gone (the `flute-*` sounds are still in the catalog, unused). **Offline install must not precache all 21 MB at once: cache tracks as they are played.** Confirm the licence of the source of these tracks before selling (recorded in the catalog pack `cozy-farm-music`) |

**Not done from the richness pass:** animated doors (the door sheet is for building your own enterable houses; the farmhouse door is painted into its picture), hay bales and a barn corner, the Teemo cat, the optional fog on the map.

**Fourth session: living world, collectibles, richer HUD (done and saved), panel decoration (done), screen redesign (NOT done)**

New pack files (catalog is now **109 files, 752 KB**; run `node scripts/sync-art.mjs` after changing the catalog): hens and chicks in 5 colours, cows and calves in 5 colours, a second frog, three fish sheets, item icons (eggs, fruit and berries, honey and food, gems, tools), coins, hearts, wooden hearts and stars, item slots, and 4 chest colours. **Edit `art.json` only through `scripts/tools/artjson.py`** (`load()` / `save()`), which keeps its one-line-per-entry layout.

| File | What it is |
|---|---|
| `src/engine/systems/Creatures.js` | Wandering animals. Each idles, strolls to a nearby spot, pecks / grazes / naps. They only stand where the player could stand (same walk grid), so they never enter water, fences or trees. Chicks and calves can `follow` a leader. Animals come from a region's `critters` list, or an NPC with a `critter` field (then you can also talk to it and it stops and faces you). Animation rows per animal are in `art.json` `creatures` |
| `src/engine/systems/Life.js` | Things you cannot talk to: `bee` (circles a spot, with a shadow), `frog` (on a lily pad, sometimes flicks its tongue or hops), `fish` (a shadow swimming under the water), `boat` (bobs), `fire` (campfire flame with a flickering glow; needs a `campfire_logs` object under it). Listed in a region's `life` |
| `src/engine/systems/Effects.js` | Sparkle burst, floating "+1" with the item's picture, shake, hop. "Less motion" makes them fade in place |
| `src/engine/systems/Pickups.js` | `pickups`: one-time treasures (walk over them; saved in `state.collected`, so they never come back). `interactables`: `tree` and `bush` (shake: fruit falls, bounces, then can be picked up; comes back after a cooldown), `hive` (honey), `chest` (opens with an animation, gives coins and maybe a gem, once only). Trees, bushes and hives need an object picture on the same tile; chests draw themselves and become solid |
| `src/engine/ui/Hud.js` (rewritten) | Goal note, heart / coin (spinning) / star counters, 5-slot item bar (eggs, fruit, berries, honey, gems: faded until you own one, count in the corner), Quests / Map / gear, and the use button whose picture changes (talk bubble, sprout for trees and bushes, heart for the hive, star for chests) |
| `src/engine/ui/Decor.js` | `addPlaque` (coloured title plaque with a sprout at each end), `addGarden` (flowers, tufts, sunflower and a cat-shaped bush along the panel's bottom edge), `addMascot` (a small animal sitting on the panel edge), `addHero` (the player's friend marching on the spot). `Modal` uses them for every screen (options `accent`, `garden`, `mascots`) |
| `src/engine/state/Session.js`, `rules/GameRules.js` | New saved fields: `bag` (item id -> count), `coins`, `hearts` (kindness), `stars` (one per finished quest), `collected` (ids of one-time treasures). `Session.collect(item, n, oneTimeId)`, `addCoins`, `addHearts`, `addStars`, `groupCount(group)`; they emit `gained` events that make HUD counters jump. `GameRules.journal()` now also returns the giver (name + portrait), the quest icon, the reward and each step's icon and progress (`have` / `need`) |
| `art.json` new sections | `creatures` (sheet columns, animation rows, speed, radius, acts), `items` (every collectible: name, picture, `group`), `itemBar` (which groups get a slot), `chests`, `ui.pieces` (heart, starSmall, coin, sprout, ...), `ui.coinSpin`, `ui.boxes.slot` / `slotTan`, `sounds.pop` |
| `farm.json` new lists | `critters` (10 animals in all), `life` (22 things), `pickups` (5 coloured eggs), `interactables` (9 fruit trees, 3 berry bushes, 1 hive, 3 chests: gold on the little island, pink in the blossom grove, silver by the forest) |
| `scripts/tools/map-authoring/farm_objects.py` | Now also writes those lists and checks them: animals start on walkable ground, frogs sit on lily pads, fish and boats on open water, the fire has logs, pickups and chests can be reached, ids are unique, trees and bushes have a matching picture |
| `scripts/tools/artjson.py`, `art-inspect/contact.py`, `art-inspect/aseprite_tags.py` | Save art.json tidily; make a labelled contact sheet of many pictures (`py contact.py groups.json out.jpg`); read animation tags from `.aseprite` files (**the pack's .aseprite files have no tags**, so animation rows were worked out by eye) |

Also changed: 4 more coloured blossoms and a picnic, a campfire and a blossom grove were added to the farm; `Overworld` `refreshNear()` now covers people, animals, trees, bushes, hives and chests (`near-changed` sends `{ kind, icon }`); credits lines wrap.

**Not done from the redesign (nothing half-written is saved; a drafted new `JournalPanel.js` was lost when a write failed, so write it fresh from the notes in section 11):**
journal with portrait, tabs and progress pictures; map with pins, animal dots and the player's face; ending with confetti and a dancing cast; animated start screen; emotes and speech bubbles over heads; cat-paw cursor; fishing; music.

**Third session: the whole UI (done, checked by `npm run check:ui`)**

Everything is drawn with the Sprout Lands Premium UI art. All the measurements (which part of each picture stretches, icon numbers, font sizes) are in `art.json` under `ui`; the words are in `text/strings.json`.

| File | What it is |
|---|---|
| `src/engine/scenes/UIScene.js` | Runs on top of the world. Picks a whole-number zoom (2-4), opens and closes the screens, sends key presses, and tells the world to stand still (`registry uiBusy`) while a screen or the speech box is open. Screens are listed in `SCREENS`. Debug: `?ui=settings` (or `start`, `journal`, `map`, `credits`, `ending`) opens one straight away; `&focus=1` shows the keyboard brackets; `?nostart` skips the first-run start screen |
| `src/engine/ui/theme.js` | `uiScaleFor`, texture/frame helpers, `words()` (text from strings.json), `fontSafe()` (turns accents into plain letters; the pixel font has no accents), `portraitFor()` |
| `src/engine/ui/widgets.js` | `uiText`, `uiTitle`, `uiBox` (stretchable boxes), `UiButton` (icon or text), `UiSlider`, `UiToggle`, `FocusGroup` (keyboard: arrows move, Enter/Space press). **Never name a field `w` on a Phaser object: Phaser resets it. Widgets use `bw` / `bh`.** |
| `src/engine/ui/Modal.js` | Base of every full screen: dimmed backdrop that swallows taps, centred panel, Esc closes |
| `src/engine/ui/StartScreen.js` | First run: name (a real HTML text box, so phones show their keyboard) and a choice of six friends. An empty name becomes `recipient.defaultName`. Saves `profile.ready` |
| `src/engine/ui/DialogueBox.js` | Speech box: face in the wooden window, name plate, typed text (speed from Settings), blip sounds, bouncing arrow. Two lines per page. Tap, Enter, Space or E advances; Esc skips. `UIScene.say(lines, onDone)` shows `[{speaker, portrait, text}]`, `{name}` becomes the player's name |
| `src/engine/ui/Hud.js` | Goal note (top left), Quests / Map / gear (top right), Talk button (bottom right, only near someone) |
| `src/engine/ui/SettingsPanel.js`, `CreditsPanel.js` | Sound slider, text speed (Slow / Normal / Fast), "Less motion", Credits. Credits lines come from `credits` in `game.config.json` |
| `src/engine/ui/JournalPanel.js` | Quest journal from `GameRules.journal()`: one quest at a time, arrows to switch, tick for finished steps, `>` for the current one. **Not tested with real quests yet** (a demo quest was injected in a test) |
| `src/engine/ui/MapPanel.js` | Small painted picture of the whole world (from the world grid) with a bouncing heart where the player is |
| `src/engine/ui/EndingPanel.js` | Three stars and a thank-you with the player's name. Nothing opens it yet: open it with `ui.open('ending')` when `rules.allQuestsComplete()` |
| `src/engine/state/SaveStore.js`, `Session.js`, `src/engine/audio/AudioService.js` | Save under `personal-adventure:<gameId>:save:v1` (settings and position are saved the moment they change); `Session` holds the state, `rules` (a `GameRules`) and change events; `AudioService.play(id)` plays the sounds listed in `art.json` `sounds` at the chosen volume |
| `scripts/tools/browser.mjs`, `scripts/tools/ui-check.mjs` | A test player: opens the game in headless Chrome and clicks, types and presses keys. `npm run check:ui` runs 50+ checks (start screen, settings by mouse and keyboard, talking, tap-to-walk, journal/map/ending, resizing) |

Other changes this session: `characters.json`, `game.config.json` and `text/strings.json` were rewritten in the new format (the six characters are now `capybara`, `gardener`, `baker`, `sky-puppy`, `snowy-puppy`, `forest-imp`; NPCs refer to them by these ids). `loadContent.js` also loads `quests/*.quest.json`, `dialogue/*.json`, `rewards.json` and builds `entityIndex` from every region's `npcs` and `entities`. The two old Codex quest files were deleted (still in git history). `theme.json` and `world/world.graph.json` are old Codex files that nothing uses; delete them at cleanup.

Not done in the UI:
- **The optional profile photo** (brief: resized, stored on the device in IndexedDB). Skipped for now.
- Sounds are wired for buttons, talking and the ending, but there is no ambient sound or music.
- "Less motion" stops the water animation, the bouncing arrow and the map heart. Fades and camera smoothing don't exist yet.

Fixed in `worldModel.js`: object footprints read `foot`, the name art.json uses, not `footprint`. `pickFill` in `autotile.js` now takes a chance for decorated fill tiles.

**From the first session:**

| File | What it is | State |
|---|---|---|
| `src/content/starter-adventure/assets.catalog.json` | Every shipped file: its pack, source path, licence evidence and use. 73 files, 628 KB | done |
| `src/content/starter-adventure/assets.lock.json` | Fingerprints, generated by the sync script | generated |
| `scripts/sync-art.mjs` | Copies the listed files from the packs into `public/assets`, trims the sounds (ffmpeg), and deletes unlisted files. Run with `node scripts/sync-art.mjs`; `--check` only reports | done, **not yet in package.json** |
| `public/assets/**` | The curated art and sounds (tiles, objects, characters, animals, ui, fonts, audio) | done |
| `src/content/starter-adventure/art.json` | Texture keys, autotile tilesets, object pieces (sheet rectangle, which tiles block walking, fade-when-behind), animations and UI icon numbers | written; **several values unchecked** (see section 8) |
| `src/engine/world/autotile.js` | 47-piece edge table and 16-piece fence table. **Checked by rendering test islands** | done |
| `src/engine/world/worldModel.js` | Builds the world grid from region text maps, connectors and rooms, plus the walk/block grid, footprints and flood-fill | written, untested |
| `src/engine/rules/GameRules.js` | Pure quest, dialogue, follower, clue, chest and lock logic, driven by content data. Step types: talk, gatherFollowers, escort, inspectClues, collect, deliver, reach | written, untested |
| `scripts/tools/art-inspect/*.py` | Python helpers used to study the sheets: grid view, numbered sprite boxes, edge test, layer test, layout sketch. `boxes.json` holds the measured sprite boxes | helper tools |

The old content files in `src/content/starter-adventure/` (`game.config.json`, `characters.json`, `theme.json`, `quests/*`, `world/world.graph.json`) are Codex's. Rewrite them for the new format.

### House rooms (2026-09-30, Opus)

**What the player sees:** walk up into a house's open door and the screen fades to a small room (the dark edge colour is art.json `rooms.void`). The room's name pops up the first time ("You found Baker Bun's House"). Walk down through the gap in the bottom wall and you fade back out, one step below the same door, facing down. Friends walking behind you (chicks, lost friends) start in the doorway behind you and follow on through. "Less motion" cuts straight through with no fade. On a phone or tablet, tapping a doorway (or a room's exit) walks you there and on through.

**How it works (one "different place" system, meant for caves too):**
- Rooms are in the **same big grid** as the islands, in a strip below them: world.json `"rooms": [{ "id", "at" }]`, and `"outdoorBounds": [0, 0, 152, 58]` says where the islands end (the world is now 152 x 71). So walking, collisions, saving, pickups, chests and the world check all work inside with nothing special.
- A room file (`world/rooms/<id>.json`) names its own way in: `"door": { "region": "east", "at": [x, y] }` (the house's doorway tile in that region) and `"exit": [x, y]` (the floor gap in its bottom wall). Nothing is added to the region files, so the region scripts don't need to know about rooms.
- The map is a box: `W` walls (the top two rows are the back wall, seen from the front), `_` floor. Things on the back wall (pictures, clocks) sit on wall rows and have no `foot`. Food "on a table" (`table_bun`, `table_pie`, `table_cake`, `table_muffin`, `table_basket`) goes on the tile **below** the table; the picture is lifted onto the table top so it draws in front of it.
- `"reserved": [{ "for", "at", "size" }]` keeps a patch of floor free for a later job. **Baker Bun's room keeps `at [6, 2]`, size 4 x 2 (back-right corner, against the back wall) free for the counter and oven**; the world check fails if anything solid is put there.
- Drawing: art.json `"rooms": { "void", "styles": { "wood-brick", "wood-plank" } }`. A style names the tile sheet and which of its 16 px pieces make the floor, doorway and each part of the walls (`Rooms.piece`). The tiles are `assets/tiles/room-wood.png`, made by `py scripts/tools/make-room-tiles.py` (redrawn from the Premium `Wooden_House_Walls_Tilset`, which is a drawn example, not a tile grid) into `Made Art/`, then copied by `node scripts/sync-art.mjs` (new pack "made-art" in the catalog).
- Camera: outdoors it stays on `outdoorBounds`; in a room, a room smaller than the screen sits in the middle with a dark edge, a bigger one scrolls with the player. Four dark covers (`Rooms.covers`) hide everything outside the current room (the sea, the other rooms). The water picture is now only drawn under the islands.
- Saving: `state.player` also stores `room`, `roomX`, `roomY` (position inside the room), so a reload resumes inside even if the rooms are moved in world.json later.
- Map screen: somebody inside a room shows at the door they went in by (`scene.mapPosition`).

**Files:**

| File | What it is |
|---|---|
| `src/engine/systems/Rooms.js` | Links doors to rooms, draws rooms, camera, covers, fading through doors, taps on doorways, placing the player and followers |
| `src/engine/scenes/OverworldScene.js` | Small hooks: creates `this.rooms`, water under the islands only, `?room=<id>` test switch, two-leg tap walks (`walkTarget.next`), saves the spot inside a room, `faceStill`, `mapPosition` |
| `src/engine/ui/MapPanel.js` | Player face and animal dots use `mapPosition` |
| `src/engine/content/checkContent.js` | `checkRooms` (placed, not overlapping, style known, exit is a gap in the bottom wall, door in a placed region, doors not shared, reserved floor free) and `reachThroughDoors` (reachability goes through doors; floor in a room nobody can reach is an **error**, "somebody could get trapped") |
| `scripts/tools/map-authoring/rooms_v1.py` | Writes the three room files and their world.json places (keeps any other rooms, such as caves, and never overlaps them); its own checks: furniture on the floor/wall, nothing blocking the way in, every floor tile reachable, chests reachable, door is a real house doorway with ground below |
| `scripts/tools/make-room-tiles.py`, `Made Art/` | The room wall/floor tiles |
| `scripts/tools/room-check.mjs` (`npm run check:rooms`) | In headless Chrome: walk in, room centred, map pin at the door, chick follows, save, reload (still inside, same spot), walk out, "less motion", tap the door, the other two rooms |
| `test/run-tests.mjs` | Two room tests: the rooms are there and pass, and the check catches a missing exit, a trapped corner, an unreachable door and furniture on the counter spot |

**Rooms now:** `baker-house` (east yellow house, door east 29,34; brick floor, bed, table with a bun, picnic corner with the Plant update 2 blanket and foods, cherry chest), `blue-house` (east blue house, door 8,34; plank floor, bed, grandfather clock, table with pie, oak chest), `pine-cabin` (east orange hut in the Pine Hills, door 35,14; oak furniture, basket on the table, gold chest). Baker Bun has since moved inside behind a counter, with an oven (see "Cooking, the bakery shop and the Village Picnic" below).

**For caves (done for the Old Mine, see below):** make the cave a room: a `world/rooms/<cave>.json` with `"door": { "region": "east", "at": [23, 8] }` (the mine mouth; the check only notes that it is not a house doorway), its own `exit`, and a new style in art.json `rooms.styles` (or, if a cave needs a free shape instead of a box, add a second drawing rule in `Rooms.draw` chosen by the style). Place it in world.json `rooms` below the islands, not on top of the house rooms (`rooms_v1.py` leaves other rooms alone). Stepping through the door, the camera, saving, followers and the world check then work for the cave with no more engine work.

### The Old Mine cave (2026-09-30, Opus)

**What the player sees:** the pine trail in the Pine Hills now ends at a grey stone arch with a dark inside, set into the hedge wall between the boulders (east 23,7; Miner Moss now says "walk right in"). Walk up into it and the screen fades into **The Old Mine**: orange dirt floor, stone walls with dark rock tops. The tunnel winds: in by the gap in the bottom wall, left past crates and pots, up a rail tunnel with a mine cart, along the top on more rails (a barrel cart at the end), and round into the treasure room (gold and crystals, crates of ore, a side cart and a **gold chest: 10-15 coins and a diamond**). A crystal nook sits to the right of the entrance. Walk down out of the bottom gap and you are back outside, just below the arch.

**How it works:** the cave is a normal room (everything in "House rooms" above applies: fade, saving, followers, map pin at the arch, camera, world check). What is new:
- `rooms_v1.py`: a room may have its own `"map"` (any shape; `'W'` rock, `'_'` floor) instead of a box, and `"doorway": "mine_mouth"`, which says the door is not a house: the check looks for that object on the tile just above the door and walkable ground on the door tile. The script's reach check makes sure every floor tile and the chest can be reached.
- art.json `rooms.styles["cave-stone"]` with `"shape": "cave"`: `Rooms.drawCave` draws two layers. The floor (`tiles-cave-floor`, `floor` pieces mixed by place, a `floorRare` one now and then) and the rock (`tiles-cave-walls`): rock with floor just below shows its stone front (`front.left/right/single/middle`), all other rock shows its dark top, picked from the 4 x 4 block that starts at `top` [0, 2] by which sides are rock (so rims appear exactly where rock meets floor). Pieces are [column, row] in the sheet. Keep rock at least 2 tiles tall between two floors (1-tall rock would only show a front).
- New art.json objects: `cave_rock_*`, `cave_boulder_*`, `cave_ore_*`, `cave_crystal`, `cave_cart`, `cave_cart_side`, `cave_cart_barrel`, `cave_rails_up`, `cave_rails_across` (flat, walk over them), `cave_workbench`, `cave_crate`, `cave_crate_ore`, `cave_crate_stack`, `cave_crate_small`, `cave_pot`, `cave_pots`, `cave_jar`, `mine_mouth`. Pictures: the Sorry pack's Dungeon Pack (copied in by an earlier chat: `cave-floor`, `cave-walls`, `cave-rocks`, `cave-carts`, `cave-rails`, `cave-props`, `cave-gates`; `bat.png` and `slime.png` are there too but not used yet).
- East Isle: `east_objects.py` adds `mine_mouth` at 23,7 (allowed on the hedge) and keeps 23,8-9 clear.

| File | What changed |
|---|---|
| `src/engine/systems/Rooms.js` | `drawCave` (free-shape rooms), `sheetColumns` |
| `scripts/tools/map-authoring/rooms_v1.py` | the `old-mine` room; `map` and `doorway` options |
| `scripts/tools/map-authoring/east_objects.py` | the arch |
| `scripts/tools/make-mine-mouth.py`, `Made Art/mine-mouth.png` | the arch picture (the Dungeon Pack's wide stone arch, inside filled dark) |
| `src/content/starter-adventure/world/rooms/old-mine.json` | written by `rooms_v1.py` (world is now 152 x 76) |
| `scripts/tools/room-check.mjs` | also walks into the mine, opens its chest, walks out below the arch |
| `dialogue/east.json` | Miner Moss invites you in (and thanks you after the crystal quest) |
| `src/content/starter-adventure/quests/sparkles-in-mine.quest.json` | The fifth quest (crystals) |
| `src/engine/systems/Creatures.js`, `src/engine/rules/GameRules.js` | Flying/foot-offset creatures; `collect`/`deliver` with several items |

**Bats, slimes and the crystal quest (2026-09-30, Opus).** *What the player sees:* three purple bats flap about the cave, bobbing gently up and down a little above the floor with a small shadow under them, and three green slimes wobble and bounce along the floor. They wander, never hurt you, and can be petted (a heart, and the first time a kindness heart). Miner Moss has a "!" and gives the fifth quest, **Sparkles in the Mine**: he dropped three shiny crystals in the mine. Once he asks, three purple crystals lie on the cave floor with stars over them (by the rails in the left tunnel, in the top tunnel, and in the little corner behind the workbench). Each one sparkles away when picked up; the goal note and journal count "(1 of 3)". With all three: back to Moss, prize 1 star, 2 hearts, 15 coins and an amethyst. Afterwards Moss thanks you. The ending now needs all five quests.

*How it works:*
- `Creatures.js`: art.json creatures may have `"feet"` (the pixel row of the feet in a frame, for sheets with empty space below, the slime: 25 of 38) and `"fly"` (pixels above the ground: the bat flies 8 up, bobs 2.5 px, has a shadow ellipse; the bob stops with "less motion"). Animations may start at a column (`"start"`). All position updates go through `Creature.draw()`.
- art.json: textures `animal-bat` (32 x 32, row 0 = 5 flap frames) and `animal-slime` (38 x 38; row 0 idle, row 4 walk, row 5 bounce; rows 6-7 are hurt/vanish frames, not used); creatures `bat`, `slime`; object `mine_crystal` (the gems sheet's amethyst, frame 9). `OverworldScene` PETTABLE now has bat and slime.
- `rooms_v1.py`: a room may have `critters` (written to the room file, checked to start on reachable floor) and item `entities`. The old-mine has 3 bats, 3 slimes, and the crystals `mine-crystal-1..3` (`"kind": "item"`, `visibleWhen` questActive `sparkles-in-mine`, `pickupSay`).
- Rules (`GameRules.js`): `collect` and `deliver` steps take `"items": [...]` (several things; `stepItems`); `stepProgress` counts them, so `{have} of {need}` works in objectives, hints and the journal (which draws one icon per item from the step's `icon`). `deliver` takes all of them out of `state.items`. Content check accepts `deliver` with `items`. Picking up an item now sparkles (`syncQuestWorld`).
- Quest `quests/sparkles-in-mine.quest.json` (talk -> collect -> deliver); `dialogue/east.json` has Moss's thank-you line once it is done.
- Checks: new unit test (crystals hidden before, 2 found, reload, 3rd, hand over, prize once, thank-you line); the "all quests" test and `quest-check.mjs` now finish five quests (5 stars); `room-check.mjs` section 8 plays it in the browser (bats/slimes present, animated, wandering on the floor; picks crystals, reloads halfway, journal, prize once) and saves `room-8-mine-critters.png` (copy in `map-drafts/shot-mine-critters.png`).

**Not done:** the rails' corner has no curved piece (the straight pieces just overlap). The amethyst prize and the crystals are only for show (nobody buys gems yet).

### Cooking, the bakery shop and the Village Picnic (2026-09-30, Opus)

**What the player sees:** Baker Bun now lives in the bakery (the yellow house in Cobble Village), standing behind a wooden counter next to a brick oven with a flickering fire. A grocer ("Grocer Flop", floppy-pup) keeps the market busy where Bun used to stand and tells you Bun moved inside. Walk up to the **oven** (or tap it) and the **Oven** screen opens: all ten treats as pictures (greyed out while something is missing), the picked one shown big in a wooden frame with "Needs" (a picture and have/need for each thing: wheat, any egg, any fruit...) and a **Cook!** button; cooking uses the things up and puts the treat in the bag (new bag slot "treats", bread picture). The **counter** opens the shop, **Baker Bun's Bakery**: a Buy tab (treats and wheat, eggs, honey, seeds, each with its price) and a Sell tab (everything in your bag Bun will buy, with how many you have), your coins top right, the picked item big with its price next to the coin picture, and a Buy/Sell button. Too few coins: "Not enough coins yet", nothing changes. Talking to Bun starts **The Village Picnic**: bring a bun, a fruit pie and a honey cake (cooked or bought) to the picnic blanket by the village pond. A star hangs over the blanket; using it without all three says what you still need. With all three: the food appears on the blanket with a sparkle, Bun walks over (the bakery Bun hides, a picnic Bun appears with a sparkle and a hop), you say hello, confetti, Bun is overjoyed, prize 1 star, 2 hearts, 10 coins, 2 muffins. The ending now needs all four quests.

**How it works:**
- **Rules** (`engine/rules/Kitchen.js`, no Phaser): `plan` works out which bag items a recipe would use (exact items first, then groups from what is left, so "a wheat and any vegetable" never uses the same wheat twice), `cook`, `buy` (never below zero coins), `sell`, `sellable`, prices. `GameRules.cook / buy / sell` wrap them into the usual outcome (sounds, `gained` for the item bar).
- **Content** `cooking.json` (new, loaded like rewards.json by `loadContent.js` / `node-content.mjs` into `content.cooking`): `recipes` (id, makes, needs: `{ item }` or `{ group, count }`) and `shops` (`bakery`: sells, buys by item or group). The content check refuses a recipe or shop naming a missing item or group, prices that are not whole coins, and any price that would let you buy something and sell it back for more.
- **New thing kinds** in `entities` (region or room files): `oven` (opens `cook`), `shop` (opens `shop`, with `"shop": "<id>"`), `picnic` (somewhere to bring things; its own lines have no speaker name), `prop` (only a picture that comes and goes with `visibleWhen`; never used or tapped). `"solid": true` makes a thing's picture block walking (oven, counter) in `worldModel.computeBlocked`. `OverworldScene.interact` opens the screen for oven/shop (`SCREEN_FOR`), `UIScene.open(name, { data })` hands the thing to the screen.
- **New step type `bring`**: `{ "type": "bring", "target": <thing or person>, "bag": { item: count } }`. Done when you use the target holding everything (it leaves the bag). `stepProgress` counts `{have} of {need}`; the journal shows one little picture per thing, filled in when you have it (`journal()` step `icons`). Hints now fill `{have}`/`{need}` from `stepProgress` (this also fixed the Busy Bees hint, which always said 0).
- **Pictures:** `Made Art/oven.png` (16 frames of 32 x 48) made by `py scripts/tools/make-oven.py` from the brick houses' wall colours and pattern and `fire.png` (no pack has an oven), catalog entry in pack `made-art`. art.json: texture `obj-oven`, animation `oven-burn`, object `oven` (`"anim"`: objects and things can now play an art.json animation; it holds still with "less motion", `OverworldScene.placePicture` / `applyMotion`), `counter_bun` / `counter_honey` (`"raise"` lifts a picture onto a counter on the same tile and keeps it in front of the counter), ten `food-*` items (group `treats`: picnic-foods bun, pie, tart, cake, muffin, pudding; item-food bread, toast, jam, sandwich), item bar slot `treats`.
- **Rooms:** `rooms_v1.py` now writes `npcs` and `entities` for a room and checks them (on the floor, somewhere to stand next to them, solid things counted as furniture). The bakery's old `reserved` patch is used up and gone (the check for `reserved` still works for later jobs). Bakery layout: Bun (6,2) behind the counter (6-7,3), oven (8-9,2) with its chimney up the back wall; the small wall clock moved to (7,1).
- **Village picnic spot:** `east_objects.py` has an `entities` list (blanket `village-picnic` at east 30,45 plus three `prop` foods) and the npc `picnic-bun` (`visibleWhen` flag `picnic-ready`); the bakery Bun has `hiddenWhen` the same flag. The old blanket/pie objects there were removed; the scatter is unchanged.

**Files:**

| File | What it is |
|---|---|
| `src/engine/rules/Kitchen.js` | Recipes, shops, coins (pure rules) |
| `src/engine/ui/CookPanel.js`, `ShopPanel.js`, `ItemTile.js` | The Oven and shop screens, the square item button they share |
| `src/content/starter-adventure/cooking.json` | Ten recipes and the bakery's prices |
| `src/content/starter-adventure/quests/village-picnic.quest.json` | The fourth quest |
| `src/content/starter-adventure/dialogue/bakery.json` | Baker Bun, the picnic Bun, the grocer (`east-baker` was removed from `east.json`) |
| `scripts/tools/make-oven.py`, `Made Art/oven.png` | The oven picture |
| `scripts/tools/bakery-check.mjs` (`npm run check:bakery`, `--shots` saves pictures in map-drafts/) | Headless Chrome: tap the counter and buy (and fail to buy a cake with too few coins), tap the oven and cook, reload (coins, food, spot in the room kept), "less motion" stops the fire, start the picnic, cook a cake, journal, put the food on the blanket, Bun appears, finish, prize |
| `scripts/tools/bakery-shots.mjs` | Three pictures: the bakery, the Oven screen, the shop screen |
| `test/run-tests.mjs` | Four new tests: cooking uses the right things, "wheat + any vegetable", every recipe makeable, shop coins never below zero and survive a reload, the picnic end to end with a reload halfway and the prize once |

**Sharing treats (2026-09-30, Opus):** talk to any friend (anyone under `npcs`, sitting cats and Mama Hen included; not followers like the chicks) while carrying a treat and they take one: the treat floats up over them with "-1", a heart bubble pops, they hop, and the treat lifts out of the item bar's treats slot with "-1"; their "yum" line opens 0.9 s later (`TREAT_PAUSE_MS`, the item bar hides while someone talks; the player stands still meanwhile, `holdStill`). The **first** treat for each friend gives a kindness heart (`collected` key `treat:<id>`, kept after reload; separate from the petting heart `pet:<id>`). After eating, a friend is "full" and chats normally the next time, then is hungry again (`state.fed[id] = { count, full }`). **Quest talk always comes first** (sharing is step 5 of `GameRules.interact`, after quest steps, quest starts, thing kinds and hints), and **quest food is never eaten**: `spareTreats()` keeps back everything a `bring` step still needs, in active quests and in quests not started yet (the picnic's bun, pie and cake before you even meet Bun); the friend takes the treat you have most spare of. Content: `cooking.json` `share` (`group`: which bag group counts as treats, `say`: lines taking turns, `{treat}` = its name); a person can have their own `treatSay` lines or `"treats": false`. The content check refuses a missing group or no lines. Code: `GameRules.shareTreat` / `spareTreats` (outcome gets `shared: { item, heart }` and a `gained` entry with count -1), `assembleContent` marks `person` in the entity index, `OverworldScene.treatTaken` (pictures), `Hud` `Slot.give`, `theme.itemPicture` (item pictures cut by `rect` now float correctly too), `Effects.floater` shows "-1". Test: "sharing treats" in `test/run-tests.mjs` (the picnic test now empties the bag before chatting to Bun again, or Bun would take a prize muffin).

**Favourite treats (2026-09-30, Opus):** each friend's entry has `favourite: { treat, say, hint, gift, giftSay }`, all kept in `scripts/tools/map-authoring/favourites.py` (`add_favourites(npcs)` runs in every `*_objects.py` and `rooms_v1.py`; a friend without one stops the script). `sameFriend` makes the picnic Bun share Baker Bun's favourite, gift and fed state. Rules (`GameRules`): `shareTreat` picks the favourite first if it is spare, then says `favourite.say`, sets `out.shared.favourite` (and `.gift` the first time, collected key `favourite:<id>`, given through `grant`, with `giftSay`); `hintFavourite` adds `hint` after every other normal chat (1st, 3rd...) until they have had it; `favourites()` lists friends for the journal; `state.likes` = favourites the player knows, `state.fed[id].loved/chats`. Pictures: `OverworldScene.treatTaken` adds `Effects.heartBurst` (big pink hearts) + sparkle + second hop. Journal: last tab (cake) = three columns of friends, "?" until known, tick once had (`JournalPanel.drawTreats`). `theme.iconFor` now cuts `rect` item pictures properly (picnic foods in the journal were wrong before). Content check refuses a favourite that isn't a treat, missing say/hint, or unknown gift items. Test: "favourite treats" in `test/run-tests.mjs`. Pictures: `node scripts/tools/favourite-shots.mjs` (Mittens + honey toast, and the journal page).

**Not done / next ideas:** the Halloween pictures (`public/assets-halloween`) have no room tiles and no oven yet: rerun `py scripts/tools/make-halloween.py` once the cave art is committed. Other shops can be added in `cooking.json` plus a `shop` thing in any room or region.

### Hedge rooms everywhere (2026-09-29, Opus)
The user's guide picture (thick bush walls, small rooms, single trees) now covers North Meadows, the Sunny Farm's west forest and the West Woods' east edge, as well as the woods. Every wall wobbles from a seeded random generator, so each script always draws the same map (checked: running each region script twice leaves the JSON unchanged).

| File | What changed |
|---|---|
| `scripts/tools/map-authoring/hedges.py` (new) | Shared helper. `wall(g, rnd, points, keep=)` draws a 2-3 thick wobbly wall along hand-placed points (only on plain grass). `seal(g, start, area, keep=)` turns shut-in grass pockets (where walls meet) into bush and returns any `keep` tile that got shut in. `tidy(g, keep=)` removes lone bushes, fills one-tile notches, fixes corner-only joins; it skips the map's outer rows/columns on purpose (letting it reach them erased North Meadows' bottom forest row). |
| `north_v1.py`, `north_objects.py` | Bottom forest band opened, walls hang from the top forest and stand below the road (seed 29092026). The tree scatter now skips one-tile-wide lanes (`in_lane`, same test as check:world's "dead end" note). |
| `farm_v2.py` | Every `b` in cols 0-10, rows 0-33 becomes grass, then walls (seed 20260929): wobbly edge down col 0, north-bank divider, river room, walls beside Mama Hen's yard; `KEEP` = hand-placed tiles; then `tidy` + `seal` from the west trail. The strip is only ~7 tiles wide, so its walls mostly join into one thick wall between woods and farm. |
| `farm_objects.py` | Seeded single-tree scatter in cols 2-10 (4 apart from every tree, off trails/water, never cutting off grass); writes `"canopy": false`. Crops, coop, picnic and chicks untouched. |
| `woods_v1.py` | After the old map is finished it is kept as `rows_before_band`; then the east band (cols 36-43, rows 3-33, not the hand hedges) opens, with walls (40,20)-(43,20) (joins the orchard bulge to the farm wall) and (40,29)-(43,29). `BAND` lists the opened tiles; only they can change. |
| `woods_objects.py` | The old scatter runs on `rows_before_band`, so every old tree and flower stays put; then the finished map is swapped in and only `BAND` gets its own trees (not in the last column; farm trees keep 2 columns back, so trees stay 4 apart across the border) and flowers. Tree at (37,7) removed (it plugged the one-tile riverbank strip that now leads into the band). |
| `scripts/tools/map-shots.mjs` | World width 104 -> 152 (East Isle). |
| `scripts/tools/ui-check.mjs` | The fruit-tree tap test picks a tree the player can walk straight up to. Why it failed: it put the player 50 px right of North Meadows' first fruit tree, north (64,4), and tested only the one tile under that point. The player's feet cover two tile rows, and the upper one, north (67,5), is hedge, so the player stood inside the hedge and could not take a step. It now uses the game's own feet test (`blockedAt`) for the spot and for the straight walk to `approachSpot`. The map was fine (a hedge near a tree is the look we want). |

Checks (2026-09-29, after the fix): npm test 20/20, check:world passes (4 notes left, none from this work: east egg/lane notes, farm 43,3 pocket from before), check:ui all passed, check:quest, check:rooms, check:bakery passed.

**Open question for the user:** the farm's west strip is one thick wall (farm cols 0-2 at rows 17-24, cols 0-6 at rows 25-33) between the woods' east rooms and the farm meadow; the only way across is the dirt road at rows 14-15. Picture: `map-drafts/west-strip-gaps.png`. Gap A (farm cols 0-2, rows 22-23, 3 tiles thick) joins the woods' middle room to the grass beside the chick yard and makes a loop with the road. Gap B (cols 0-6, rows 31-32, 7 tiles thick) would be a long tunnel near the picnic blanket. Recommended: A only.

**Done (2026-09-30): gap A only.** `farm_v2.py` cuts `GAP_A` (farm cols 0-2, rows 22-23) to grass after the last `tidy`, so nothing refills it. `farm_objects.py` imports `GAP_A`: the gap tiles stay out of the tree spot list (so the shuffle, and every other tree, is unchanged) and `gap_clear` (gap + one tile round it + two tiles east) gets no tree. Only change in farm.json: the tree at (3,22), which stood in the gap's mouth, is gone. Picture: `map-drafts/shot-west-gap-a.png`. Gap B is not done (add a `GAP_B` the same way if the user asks). Same session: `game.css` gives `#turn-sideways` / `#no-webgl` `z-index: 100`, so on an upright phone the start screen's name box (`.name-input`, z-index 10) no longer shows on top of the "turn your phone sideways" message (checked at 390 x 844). Checks: npm test 20/20, check:world (same 4 old notes), check:ui, check:quest, check:rooms, check:bakery all passed first time.

### New friends and sitting cats (2026-09-29, Opus)
The user sent ChatGPT sheets (kept in `C:\Users\macie\Downloads`, copied into the project): 4 cat friends (4 rows x 8, like the other friends), 9 sitting cats (2 rows of 4 front poses: blinks, winks, smiles) and one picture with 5 capybaras in different grids.

| File | What changed |
|---|---|
| `Generated Characters/sources-4dir/{pumpkin,witch,bat,donut}-cat.png` | The 4 cat friend sheets, built by `build-characters-4dir.py` as usual. The black cats' faces go dark when shrunk (same as before with dark faces). |
| `scripts/tools/prep-capybaras.py` (new) | Cuts the 5-capybara picture into `sources-4dir/capy-{plain,scarf,nightcap,strawhat,explorer}.png`. Missing right row = left row mirrored; last front pose (smile) goes to column 7; missing columns repeat the standing pose. The nightcap's touching poses are cut at the thinnest column near each gap. |
| `assets.catalog.json` | `assets/characters/capybara-scarf.png` now comes from `capy-scarf` (so the Gardener NPC has the new look); new rows for the other 8 friends and the 9 sitting cats (`assets/npcs/*.png`). |
| `characters.json` | 15 friends (new ones appended at the end, so check:ui's `cards[6]` is still Tabby Cat). Keep "Name: blurb" at 47 letters or less, or it runs past the panel. |
| `src/engine/ui/StartScreen.js` | More than 6 friends: 5 cards show at a time with left/right arrow buttons (wrap round at the ends); keyboard focus onto a hidden card slides the row. A second row was tried first but made the panel too tall for a sideways phone (UI is built for 170 px tall). |
| `scripts/tools/build-sitting-npcs.py` (new) | `Generated Characters/sources-sitting/<name>.png` -> `game-ready-sitting/<name>-sit-8frame-256x32.png` (8 frames of 32 x 32). The 8 biggest pieces are the poses; loose bits (stars) join the nearest pose. |
| `art.json` | Textures `char-*` for the new friends, `npc-<cat>` for the sitting cats, animations `npc-<cat>-sit` (plain pose held, a blink/wink every ~2 s). |
| `*_objects.py`, `dialogue/{north,woods,farm,east}.json` | Sitting cats (sprite NPCs with `anim`): north Nimbus (cloud, blossom meadow 84,12), Sprig (leaf hood, mushroom ring 17,15); woods Luna (moon, 32,11 near the Stream Bridge), Dozy (nightcap, 17,32); farm Patch (pumpkin, 31,9 by the fields), Mittens (scarf, 20,16 near the start); east Hazel (witch, Pine Cabin 33,16), Flit (bat, near the Old Mine 16,8), Sprinkles (donut, village pond 21,42). Spots: open grass, reachable, 3 wide and 2 tall clear, nothing within 2 tiles. North's small flowers/tufts reshuffled (the random scatter skips NPC tiles); trees did not move. |
| `ui-check.mjs` | The change-friend check presses the right arrow before picking Tabby Cat. |

Checks after this: npm test 20/20, check:world, check:art, check:ui, check:quest, check:rooms, check:bakery all pass. The portrait-phone "turn sideways" bug (name box on top of the message) was fixed on 2026-09-30 (see "Hedge rooms everywhere").

### Screen-size check before building (2026-09-30, Opus)
Every screen looked at in phone (1089 x 490, zoom 2, 544 x 245 UI pixels), tablet (1280 x 800, zoom 3, 426 x 266) and PC (1920 x 1080, zoom 4, 480 x 270): start, item bar, speech box, journal (quests + treats tab), map, oven, shop, settings, ending. Every tap area is at least 44 screen pixels (hit zones are bigger than the pictures), so nothing was too small.

| File | What changed |
|---|---|
| `scripts/tools/screen-size-shots.mjs` (new) | Takes all 10 screens at the 3 sizes into `map-drafts/sizes/` and prints `EDGE` (sticks out of the screen) and `SMALL` (tap area under 40 px) lines. Ending confetti falling from above shows as EDGE lines: that is fine. `node scripts/tools/screen-size-shots.mjs [folder] [phone|tablet|pc]`. |
| `src/engine/ui/NoticeBanner.js` | `topFor()`: on tablet the "You found ..." sign covered the goal note and star counter; when the sign doesn't fit between the top-left note/counters and the top-right buttons it now drops in just below them. |
| `src/engine/ui/JournalPanel.js`, `strings.json` | The journal's sign says "Treats" (gold) on the treats tab instead of "Quests" (`setPlaque`, new string `journal.treatsTitle`). |
| `src/engine/ui/Hud.js` | The gear button's picture poked 1 pixel past the right edge; round icon buttons now sit 2 pixels further in. |

Contact sheet: `map-drafts/sizes/screen-sizes-contact-sheet.png`. After this: npm test 23/23, check:world, check:ui, check:quest, check:rooms, check:bakery pass; `npm run build` works (the "chunk larger than 500 kB" warning is Phaser itself and is normal).

### Pumpkin Hollow, the Halloween area (2026-09-30, Opus) - DONE (steps 1-4; no quest yet)
The user's job: a new Halloween region about the size of the farm, WEST of the West Woods, reached through a gap in the woods' west hedge wall; everything else moves right; hedge rooms like the woods, wobbly nature edges, busy and colourful, kid-friendly; the Halloween cats and a few friendly ghosts live there; no quest yet. The saved game must be cleared afterwards (tell the user).

**Done (step 1 of 4): the art.** `py scripts/tools/make-halloween-art.py` then `node scripts/sync-art.mjs`. Everything it adds starts with `hw` and a rerun replaces only its own entries.
- Source: the user's ChatGPT pieces in `Made Art/halloween/` (untracked, not ours: don't commit or edit them; `cut_sheet.py` there cut them). The pink rim turned out to be ChatGPT's own plum outline (not only background bleed; re-cutting from the originals did not help), so `clean()` gives every pink outline pixel a darker shade of the colour just inside it (white ghost: lilac-grey edge; wisps: pale sparkles), plus stray specks removed.
- Out, ChatGPT art (new catalog pack `halloween-art`, folder `Made Art/halloween-game/`): sheets `hw-buildings` (hw_haunted_house 6 wide, hw_witch_cottage, hw_pumpkin_house, hw_crypt, hw_arch_gate: posts only are solid, walk through the middle), `hw-nature` (hw_dead_tree(_b), hw_dead_tree_small(_b), hw_face_tree(_b) 3 tiles solid, hw_glow_shrooms(_b), hw_bush(_b), hw_bush_wide(_b), hw_stump_shrooms(_b)), `hw-decor` (pumpkins small/normal/big/patch, 5 graves, 3 mushrooms, cobweb (looks odd: don't use), candles, scarecrow, broom, crow post, pumpkin sign, and the 10 "items" as decorations only: hw_candy_corn, hw_candy, hw_lollipop, hw_candy_apple, hw_pie_slice, hw_coin_bag, hw_treat_bag, hw_witch_hat, hw_lantern, hw_ghost_cookie). Strips (frames lined up, one steady shadow for standing things): `hw-ghost` 8, `hw-wisp` 4, `hw-owl` 4, `hw-crow` 6, `hw-cauldron` 4, `hw-lantern-post` 2, `hw-jack` 2. Animated objects: hw_owl, hw_owl_up (raise 30: stand it on the tile below a dead tree to sit on it; untested), hw_cauldron, hw_lantern_post, hw_jack. New creatures: `ghost` and `wisp` (fly: engine bobs them and draws a shadow), `crow` (walk/peck/look). Engine: `Creatures.js rowFrames` now takes a `frames` list of columns.
- Out, recoloured Sprout Lands art (pack `made-art`, folder `Made Art/halloween-tiles/`): tilesets `hwGrassSoft`, `hwGrassLayer`, `hwGrassDark` (dusky olive), `hwSoil` (brown paths), `hwHedge` (plum bushes), `hwFence` (the purple iron fence, `fence-iron-purple.png`), and autumn-orange copies of the round trees/bushes/stumps/log as `hw_tree_round`, `hw_tree_small`, `hw_tree_big`, `hw_bush`... (tex `hw-trees`). Colour mock: user has not seen it yet.
- Checks after step 1: npm test 23/23, check:art, check:world pass.

**Plan for the rest (decided, not built):**
2. Engine, per-region ground pictures: region JSON key `"tiles": {"grassSoft": "hwGrassSoft", "grassLayer": "hwGrassLayer", "grassDark": "hwGrassDark", "soil": "hwSoil", "hedge": "hwHedge", "fence": "hwFence"}`. In `terrain.js buildTerrain`, pick each cell's tileset by `world.regionAt(x, y)?.tiles?.[key]` and put swapped cells in an extra layer right after its base layer (each layer is its own Phaser tilemap with one tileset, `OverworldScene.drawTerrain`, so extra layers just work). Water stays the normal colour (one tileSprite). Also `MapPanel`: per-region map colours (e.g. region `"mapColors"`), and its size: `measure()` uses whole-number scale, and a ~198-wide world drops the map to scale 1 (half size): allow a half step (1.5) and recheck the map screen at phone/tablet/PC (`node scripts/tools/screen-size-shots.mjs`). Add `ghost`, `crow` to `PETTABLE` in `OverworldScene.js`.
3. World layout: new region `halloween` (name "Pumpkin Hollow"), about 44-46 wide x 58 tall at world [0, 0], an island whose east side faces a narrow strait (3-5 tiles of water) next to the woods and North Meadows. Reason: where the new dark ground would touch the woods' green ground there'd be a straight colour seam; water between them hides it. The way in: a 2-wide trail through the woods' west hedge band at woods rows 22-23 (cols 0-3, joining the woods trail at col 8; remove the fern_big at 5,22 / anything on it; add to MUST_REACH), then a 1-wide `=` bridge across the strait, landing at the hw_arch_gate. The woods' and North's west edges are straight (they used to be the world edge): wobble them by turning 0-2 of their outer forest columns into water, keeping at least 2 bush tiles, done AFTER each script's scatter (like woods_objects.py's cove bridge) so no other object moves. Shift all regions right by the new width W in world.json (north [W,0], woods [W,18], farm [44+W,18], east [104+W,0]), `size` and `outdoorBounds` width +W; rooms can stay where they are. `?at=` counts from the farm, so every existing `?at=` in checks and docs stays right; a Pumpkin Hollow tile (x, y) is `?at=(x-44-W),(y-18)` (negative is fine). Update `map-shots.mjs` WORLD width (152).
   Rooms inside the area (hedge rooms, wobbly walls from `hedges.py`): Pumpkin Patch by the gate (iron-fenced field, pumpkins, scarecrow, pumpkin house), Witch's Glade (cottage, cauldron, broom, candles, glow mushrooms), Haunted House (lantern posts along the path, face trees), Graveyard (iron fence, graves, crypt, crows), Moon Pond (wisps, owls on dead trees), maybe a pier for fishing. Chests and pickups of existing items only (eggs, gems, fruit): the Halloween items stay decorations until a quest needs them.
   Friends: MOVE (not copy) the 4 Halloween sitting cats here: cat-patch (pumpkin, now farm_objects.py), cat-hazel (witch) and cat-flit (bat) (east_objects.py), cat-luna (moon, woods_objects.py); move their lines into a new `dialogue/halloween.json` and reword the ones that name their old places. Friendly ghosts: 2-3 talkable ghosts as `npcs` with `"critter": {"kind": "ghost", ...}` (they float about and talk), plus a few wandering ghosts, crows and wisps in `critters`. Landmarks for map pins.
   Scripts: `halloween_v1.py` (ground) + `halloween_objects.py` (objects, checks, writes `regions/halloween.json`), copy the pattern of `east_v1.py`/`east_objects.py` (put(), exact(), MUST, checks). A new region file is picked up automatically (glob).
4. Checks: `py scripts/tools/map-authoring/halloween_objects.py` (and woods/north/farm/east objects scripts after their edits), `npm test`, `npm run check:world`, `npm run check:rooms`, then a whole-world picture with headless Chrome at `http://localhost:8190/?overview=1&nostart` (1920x1280) and close-ups with `?at=x,y`, sent to the user. The dev server on 8190 may belong to the other chat: use headless Chrome (`scripts/tools/browser.mjs`), don't start a second server. Then a line in HANDOFF.md, commit only our own files.

**Done (steps 2-4, 2026-09-30).**

| File | What changed |
|---|---|
| `src/engine/world/terrain.js` | A region's `"tiles"` key (normal tileset name -> other tileset, e.g. `"hedge": "hwHedge"`) swaps that region's ground pictures. Swapped cells go into an extra layer drawn right after the normal one (`altOf`, `setOf`), so each layer still has one tileset. Water stays one colour. |
| `src/engine/ui/MapPanel.js` | Region `"mapColors"` (`grass`, `dark`, `sand`, `forest`, `snow`, `hill`) recolour the map inside it; the map's scale may be a half step (198-wide world = 1.5x; picture painted 4x finer then). hw buildings/trees get map marks. Checked at phone, tablet, PC. |
| `OverworldScene.js` | `ghost` and `crow` can be petted. |
| `scripts/tools/map-authoring/halloween_v1.py` (new) | The island's ground: wobbly coast (land to col 40, strait cols 41-45 + the woods' wobble), bridge `=` on row 40 (= woods row 22), Landing room shut in by hedge (only the bridge and the gate at (33,36) lead out), trails, Moon Pond with a pier to the owl's island, iron-fenced Pumpkin Patch (22-32 x 19-27, gap 27,27) and Graveyard (7-19 x 36-47, gap 12,36), hedge walls (`hedges.wall`), dark-grass lumps, `tidy` + `seal`. Seed 31102026. |
| `halloween_objects.py` (new) | Objects/friends/animals + checks; writes `regions/halloween.json` with `"tiles"` and `"mapColors"`. `put()` refuses any spot where a solid thing would cut off walkable tiles; the tree scatter does the same and skips MUST tiles; pickups avoid tiles hidden behind a picture. Extra checks: no unreachable walkable tile, and the Landing has no way round the arch gate. Iron fence gaps have no swinging gate (the gate picture is wooden). |
| `hedges.py` | `wobble_west(rows, rnd, keep=, most=)`: turns 0-`most` outer bush columns of a straight west coast into water, always leaving 2 bush. |
| `woods_objects.py` | After the scatter: `WEST_GAP` (cols 0-7, rows 22-23 -> dirt; the fern/log/mushroom on it removed), then `wobble_west(seed 3, keep rows 19-26, most 3)`; MUST 'way west to Pumpkin Hollow'. Luna removed. |
| `north_objects.py` | `wobble_west(seed 10, most 3)` after the scatter. |
| `farm_objects.py`, `east_objects.py` | Patch, Hazel, Flit removed (the farm keeps Patch's old tile in `OLD_SPOTS` so its tree scatter is unchanged). |
| `favourites.py` | ghost-boo (bun), ghost-misty (sandwich, gift amethyst), ghost-giggles (tart). |
| `dialogue/halloween.json` (new) | The 4 cats (lines reworded for their new homes) and the 3 ghosts; their old entries removed from farm/woods/east.json. |
| `world.json` | halloween [0,0], north [46,0], woods [46,18], farm [90,18], east [150,0]; size/outdoorBounds 198 wide. Rooms stay. `map-shots.mjs` width 198. |

Checks: all 5 region scripts pass, npm test 23/23, check:world (0 problems, 5 old notes), check:rooms passed (failed once while I was rewriting the JSON under it, then passed twice). Pictures: `map-drafts/hollow-overview.png`, `map-drafts/hollow-closeups.png`. The port-8190 server was an old `vite preview` of the build (showed the old world); it was stopped and `npm run dev` started.
Not done: a Halloween quest (the items are decorations only); a room inside the haunted house; `npm run build` + screen-size check redo (the map screen was checked). Old bug seen, not fixed: help pins "!" for people inside rooms (Baker Bun) sit clamped at the map's bottom-left corner.

## 7. Planned architecture

- **Content package** in `src/content/starter-adventure/`:
  - `game.config.json`, `theme.json` and `characters.json`;
  - `art.json` and `assets.catalog.json`;
  - `text/strings.json`, `dialogue/*.json` and `quests/*.quest.json`;
  - `world/world.json`, which places regions, rooms and connectors and holds the locked `routes`;
  - `world/regions/*.json` and `world/rooms/*.json`: text maps plus objects, NPCs and entities.
  - Map legend is in `worldModel.js` (`~` water, `.` grass, `:` sand, `h` hill, `^` stairs, `b` hedge, `f` fence, `=`/`|` bridges, `o` stepping stones, `*` snow, `!` invisible wall, `_` room floor, `W` wall, `#` void).
- **One connected outdoor world**, with rooms in a strip below it. Doors fade and teleport you between the two.
- **Display:**
  - Scale.RESIZE with an integer camera zoom of 2–4, so pixels stay crisp.
  - 16 px tiles, and characters at scale 1. The old code drew 2.5× characters on 1× tiles.
- **Ground layering:**
  - grass coasts use `Grass_tiles_v2` (stone rim);
  - sand coasts use `Soil_Ground_Tiles`;
  - paths are soil underneath with `Grass_Tile_Layers` edges on the grass next to them (the "worn path" look);
  - hills use `Grass_Hill_Tiles_v2`, with stairs from the slopes sheet;
  - hedges use `Bush_Tiles`; forest mass uses the deep-bush fill rows 5–10.
- **Save state**, schema 2:
  - `profile`, `player`, `settings`, `quests`, `tracked`, `entities`, `followers`, `clues`, `items`, `flags`, `rewards`, `discovered`, `routes`.
  - Migrating an old Codex save keeps only the name and avatar.
  - Save immediately on every quest change.
- **Offline install:**
  - icons at 192 and 512 px;
  - `sw.js` generated from `gameId`: precache, and never delete another game's caches.
  - `vite.config.js` should use `build.assetsDir: 'build'` so it doesn't clash with `public/assets`. CSS must not use `/assets/...` absolute paths because `base` is `'./'`.
- **Build check:** every file in `public/assets` must be in the catalog, and its fingerprint must match the lock.

## 8. Art facts found (so nobody has to re-research)

**How the ground is stacked (second session, checked in the game)**
- Soil (`Soil_Ground_Tiles`) goes under every piece of land where it can show. Its brown rim and white foam line appear wherever sand meets water, like Cup Nooble's "TILE LAYER EXAMPLE".
- Grass goes on top:
  - where grass meets water, use **old `Grass.png`** (`grass-soft`). This is the soft green coast from the promo scenes. A 1 px foam line of the soil underneath peeks out, which looks right;
  - where grass is next to sand, use `Grass_Tile_Layers` (`grass-layer`), whose soft edge fades onto the sand.
  - This mix is seamless, including where a beach meets a grass coast. `?coast=layer` shows the other style (a sand rim on every coast).
- `Grass_tiles_v2` (grey stone rim) isn't used now. It's an option if the user wants stony coasts.
- `Darker_Grass_Tile_Layers` is a pale blue-green, not really darker. Small patches of it looked like odd pale rectangles, so the farm doesn't use it.
- **Deep forest mass (`Bush_Tiles` rows 6–10):** most of those cells have leaves that cross into their neighbours, so mixing them at random makes a checkered pattern. Use (1,7), which is plain, plus the few cells whose leaves stay inside: (5,7), (6,7), (6,8), (5,8), (9,6), (8,7), (6,10). This is `deepFill` in art.json.
- **Bridges (`Wooden_Bridge_v2`, checked in the game):**
  - horizontal: left end (0,0), right end (1,0), middle (0,2);
  - vertical: top (2,0), bottom (2,1), middle (2,2);
  - row 1 and column 3 are the same ends with foam, for posts standing in open water (a pier's far end).
  - Bridges are 1 tile wide.
- Paths drawn 1 tile wide look about 1.5 tiles wide, because the soft grass edge sits inside the grass tile. Draw trails 1 wide; 2 wide looks like a road.
- Tiny ponds made of rows of different widths look like a "+". Make ponds at least 4–5 tiles across, with an uneven oval outline.

**Tiles**
- **Generated characters:**
  - columns are back, back-left, left, front-left, front, front-right, right, back-right;
  - rows are left step, standing, right step;
  - frame = row × 8 + column. **Codex's direction mapping was wrong.**
- **Edge ("blob47") layout:**
  - It is Cup Nooble's `Bitmask references 1.png` (11 × 5 cells). The table is in `autotile.js`.
  - It is the same for grass, hill, dark grass, soil, bush, grass-layer and snow (rows 0–4). Rows 5–6 are plain-fill variations.
- **Fences.png:** columns 0–3 × rows 0–3 are the 16 connection pieces (checked); columns 4–7 are broken variants.
- **Wooden_Bridge_v2:**
  - horizontal 2 × 2 segment at pixels (0,0)–(32,32);
  - vertical 2 × 2 segment at (32,0)–(64,32);
  - single planks at (0,33) and (32,32).
  - How they tile along a long bridge is **not yet checked in game**.
- **House walls sheet:** not a clean 16 px tileset.
  - The piece at x 11–37 is a room slice: frame rows 0–3, log wall 4–15, a brick floor tile repeating at (16..31, 16..31), bottom frame 32–35, front log wall 36–47. Side walls are 5 px.
  - There is a window tile at (48, 32, 16, 16).
- **Stairs** (`Grass_Hill_Tiles_Slopes v.2`): 2 × 2 stair pieces meant to sit on a hill's south edge. The exact crop is **not yet checked**.

**Objects**
- **Sorry-pack houses and huts:**
  - 3 × 3 grids of 64 × 64 buildings, 9 colours;
  - the door is at house column 2 (x 32–48);
  - `art.json` still needs `"offset": [-8, 0]` on every house/hut.
- **Grey brick houses:** 3 × (96 × 80); the door position is not measured yet.
- **Water.png:** 4 animation frames of 16 × 16.
- **Boats.png:** 48 × 32 cells; frames 0–1 docked, 3–4 floating, 6–8 rowing with a wake.
- **Hen and chick sheets (checked):** 16 x 16 frames, 8 per row, frame = row x 8 + column, drawn facing right (the game flips them). Row 0 = idle with blinks (4), row 1 = tall bobbing (7), row 2 = walk (8), row 3 = peck / crouch (7), row 8 = sleeping loaf (4), rows 4-6 and 9-12 = other poses. Chick sheet has the same rows. Hens: default, blue, brown, green, red. The "hearts" animation guess (row 13) is unverified.
- **Cow sheets (checked):** 32 x 32 frames, 8 per row. Row 0 idle (3), row 1 walk (8), row 2 walk variation (7), rows 3-4 lie down / turn, row 5 chewing (7), row 6 grazing with a grass tuft (4), **row 7 "love": a heart pops up (6)**. Calves (256 x 288, 9 rows): row 1 idle (4), **row 6 walk (8)**, row 7 graze (4), **row 8 love (6)**. Colours: light, brown, green, pink, purple.
- **Frog (checked):** 16 x 16, 14 per row. Row 1 idle (2), row 2 slow breathing (14), row 3 hop (9), row 4 tongue flick (8, red tongue on frames 4-5).
- **Fish sheets:** 15 frames of 16 x 16; each frame shows a small blue-grey fish shape moving round a circle inside its cell, so it works as a translucent shadow circling in the water. Small, medium, big.
- **Bee:** `bee.png` 128 x 16 = 8 frames of a buzzing bee.
- **Campfire / fire:** `campfire.png` (112 x 48, 7 x 3): row 2 column 6 (rect 96, 32, 16, 16) is the full log pile; row 0 is stones / ash. `fire.png` is 16 flame frames (16 x 16); put the flame's base on the logs.
- **Chest sheets (4 colours, 160 x 64):** 32 x 32 cells; row 0 = front view: closed, opening, half open, open, fully open (5 frames). Row 1 is the side view.
- **Egg sheet** (`Animals/Chicken_Egg`, 160 x 288, 10 columns): wobbling and **hatching animations** (egg cracks, a chick pops out). Not used yet: a hatching egg would be a lovely quest moment.
- **Item icons, 16 x 16 (frame = row x columns + column):** `eggs` (5 columns): 0 cream, 1 brown, 2 pink, 3 green, 4 blue. `fruit` (4 columns): 0 apple, 1 orange, 2 pear, 3 peach, 4 raspberry, 5 grapes, 6 blueberry. `food` (4 columns): 1 honey jar, 3 honeycomb, 4 bread, 5 / 9 / 13 blueberry / purple / red jam, 12 sandwich. `gems` (5 columns): 0 pickaxe, 1 coal, 2-4 copper / silver / gold ingot, 6 ruby, 7 diamond, 8 emerald, 9 amethyst, 10-14 potions. `tools` (4 columns): 0 watering can, 1 axe, 2 pickaxe, 3 herb, 4 branch, 6 log, 8 plank, 9 stone.
- **Coins** (`ui/coins.png`, 128 x 48): small coin spin = four 16 x 16 cells across the top row (rects 0/16/32/48, 0, 16, 16); big coin = four 32 x 32 cells on rows 1-2. **Hearts** (`Hearts.png`): many styles; row 1 columns 0-2 are the white-outlined full / half / empty heart (rects 0/16/32, 16, 16, 16). **Wooden hearts and stars:** 32 x 32 cells, full / half / empty. **Slots** (`ui/slots.png`): cream slot 30 x 32 at (9, 9), tan at (57, 9), brown at (105, 9); nine-slice with [6, 6, 6, 8].
- **Small icon sheet** (`ui/icons.png`, 16 columns): every icon exists in four colours, 4 columns apart: white, cream, tan, brown (frame, +4, +8, +12); rows 10-19 repeat them white with a green outline. Home is 114, paw 146, star 2, heart 64, sprout 65, ? is 1, ! is 96.
- **The pixel fonts:** both have capitals, lowercase (drawn as capitals) and digits only, no accents. **In the small font the digit 0 looks like a D.** Big font: native size 18 px, capitals 14 px tall. Small font: native size 9 px, capitals 7 px tall.

**UI**
- **Icon Buttons Spritesheet:** 32 × 32 cells, 6 per row, in normal/pressed pairs. The icon numbers in `art.json` need checking.
- **Premade dialog box big** (304 × 64): portrait window plus a text box. Use it for dialogue.
- **Continue arrow:** 7 frames.

**Sounds and tools**
- Each Sorry-pack sound had about 8 s of silence. They are now trimmed in `public/assets/audio`: talk, found, peep, splash, step, tune, fanfare, locked.
- ffmpeg is installed and on the PATH.
- Phaser 4 ships agent docs in `node_modules/phaser/skills/`, including v3→v4 migration and tilemaps. In v4, `setTintFill` is gone and `roundPixels` defaults to off.

## 9. Removed on 2026-09-28 (in the Windows Recycle Bin, not deleted)

These were removed at the user's request because they were old plans or briefs that contradicted the current direction:
- `BUILD_PLAN.md` (the Gemini phased plan with stop-for-approval gates);
- `PRODUCT.md` and `DESIGN.md`, plus `.impeccable/`;
- `WHAT_IS_MISSING.md` (my audit of Codex's version);
- `docs/ASSET-CATALOG.md`, `docs/assets.catalog.json` and `docs/TILEMAP-REFERENCE-WORKFLOW.md`;
- the whole `docs/map-concepts/` folder: Lantern Chain, Spiral Estuary and River Ribbon, with their diagrams;
- `tmp-grass-cuts.png`.

Restore them from the Recycle Bin if the user asks.

## 10. Bugs in Codex's old version (don't repeat them)

- **Traps:**
  - leaving the forest dropped the player in the river, where they couldn't move;
  - the cottage and cave floors were never made walkable;
  - the cave door was inside a cliff.
  - Prevention: an automatic "can a kid get stuck?" test for every area.
- **Dialogue keys:** E/Space meant both "talk" and "close", so the dialogue reopened forever. While a dialogue is open, they must only close it.
- **Saving:** quest progress was saved only on the next step, because the save service was passed as `undefined`. Settings were saved into a copy of the state and ignored.
- **Quest order:** the forest imp could be rescued before any clue was found.
- **Hard-coded content:** the world and quests were typed into engine code, and the content JSON was ignored.
- **Stand-in visuals:** drawn boxes, circles, emoji and ★ text instead of pack art. There was no credit screen.
- **Offline install:**
  - the icon was a 128×48 walk sheet;
  - `sw.js` deleted every other cache and had a fixed cache name.

## 11. Next steps, in order

**Who should do what next (agreed with the user 2026-09-29):**
- **Opus 5.5 (the hard, easy-to-break parts):** the two real quests and wiring `GameRules` into `OverworldScene` (`interact`, followers, reload-resume, rewards exactly once, ending trigger, persistent "!" over quest givers); planning the River Garden world with the user; the "can a kid get stuck" checker and content validator for every area; offline install + `npm run build` + fixing `package.json` (music cached lazily); removing the old Codex code.
- **Sonnet (well-specified work):** drawing each area once the plan exists (use the farm as the model), fishing at the dock, hay bales / barn corner, docs (`EDITING-GUIDE.md`, `CREDITS-AND-LICENSES.md`), swapping in new character sheets, the optional profile photo, final screenshots at each screen size.
- Waiting on the user: new 4-row pixel-art sheets (transparent background, see `sources-v2`) for Pudding Pup, Snowy Pup and Tabby Cat; the big painterly Cinnamoroll sheet they sent is not a walking sheet (no legs moving, soft painted art) so it was not used.


0. **The richness pass is done except fishing, hay bales / barn corner and animated doors** (see the fifth-session table). Optional: the Teemo cat as a 7th friend, fog on the map, the persistent "!" over quest givers (do that with the quests).
1. **Get the user's yes on the farm and the new look.** Change what they ask for first.
2. **Plan the whole River Garden world with the user** (where each area goes and how they connect; keep the farm in the south). Required places are in section 2. Then hand-draw the areas one by one, using the farm as the model, and give every area the same richness (animals, things to find, colour). The "how to draw an area" guide is still to be written (map key, no straight lines, spacing, object list, how to run `farm_objects.py`-style checks and screenshots). A cheaper model could draw areas from the user's reference pictures with that guide, one at a time, with a screenshot check by Claude or the user.
   - **THE PLAN FOR THE NEXT TWO AREAS (agreed with the user 2026-09-29). Sonnet draws them; do the west woods first.** The user's guide pictures are `map-drafts/west-woods-streams.png` and `map-drafts/north-hill-cottage.png`. Both show our farm in them, so they show exactly where each area joins on. Use them for **layout only**; the look comes from our real tiles and objects, like the farm.
     - **West woods** (region id `woods`, about 44 x 40 tiles). In the picture it's everything left of the thick forest band that runs down the middle.
       - **Where it goes:** add it to `world.json` at `[0, 0]`, move the farm to `[44, 0]`, and make the world size `[104, 40]`. The start spot is counted inside the farm, so it still works. Old saves will put the player in the wrong place: clear the save (localStorage) after the move.
       - **The way in:** open a gap in the farm's west forest wall (`b`, columns 0-8). Run a sand trail (`:`) west from the farmhouse trail at about rows 13-15 to column 0 of the farm, and meet it with a trail in the woods. Keep a thick forest band (`b`) down the woods' east edge everywhere else, like the picture. Optional second way in: along the south beach.
       - **What goes in it, from the picture:** thick forest (`b`) along the far west and north-west; a small farm top left (house, well, fenced vegetable plots); a stream coming in from the north and winding down the middle into ponds, with bridges (`=` east-west, `|` north-south); a pond with a small island (a tree and a treasure chest) reached by a bridge; lagoons opening to the sea at the bottom, a small island with a big red mushroom, and a sandy beach with a pier and a rowboat.
       - **No hills or stairs:** the stair art isn't drawn yet (section 8). Where the picture has raised ground and steps, draw flat grass bordered by trees or bushes instead.
       - **Keep a quiet clearing deep in the woods** (north-west middle, about 8 x 6 tiles, reachable by a trail, with no chests or pickups in it). Opus will put the "Lost in the Forest" quest there (clues and the lost friend). Leave ids starting `forest-` free for it.
       - **Same richness as the farm:** wandering animals, frogs, fish, bees, eggs or fruit to find, 2-3 chests, berry bushes or fruit trees to shake, flowers everywhere, landmarks for the map screen. Nature never has straight lines (cliffs, ponds, streams, forest edges all wobble); only built things like fences and fields are straight. Kids want it busy and colourful, not minimal.
       - **How:** copy `farm_v2.py` to `woods_v1.py` (the ground) and `farm_objects.py` to `woods_objects.py` (objects, animals, checks). Change the size, the `REGION` file, `START` (use the trail tile at the gap on the woods' east edge) and `MUST_REACH` (every chest, pickup, bridge end, island and the clearing). Run it until it prints "all checks passed". Then screenshot with `scripts/tools/browser.mjs` (`?overview` for the whole world, plus walking shots), and run `npm run check:ui` and `npm run check:quest`. Both must still pass, because the farm moves.
       - **Don't touch:** `GameRules.js`, the quest code in `OverworldScene.js`, `quests/`, `dialogue/`, or Mama Hen and the chicks in `farm_objects.py` (Opus's quest work).
     - **WEST WOODS: DONE (Sonnet, 2026-09-29).** Region `woods` (44 x 40) at world `[0, 0]`; the farm is now at `[44, 0]` and the world is `[104, 40]`. Ground: `scripts/tools/map-authoring/woods_v1.py` (hand-drawn spans, then `tidy()` removes lone tiles and corner-only joins). Everything on it: `woods_objects.py` (seeded random scatter for trees, flowers, ferns and mushrooms; hand-placed farm, islands, chests, animals, frogs, fish, pickups, landmarks; the checks; it writes `woods.json`). Run `py scripts/tools/map-authoring/woods_objects.py`. **Clear the save (localStorage) if the player ends up in the wrong place: the farm moved.**
       - **The way in:** the farm's west forest wall is open on rows 12-16 (`farm_v2.py`) with a trail along row 14; the woods' east wall has the matching gap and trail (start of the woods checks is world tile `(43, 14)`).
       - **The quiet clearing for "Lost in the Forest":** woods tiles x 12-19, y 3-8, empty (`CLEARING` in `woods_objects.py` makes the script fail if anything is put in it). A trail arrives at its east side at `(19, 6)`, from `(20, 15)` up `x = 20`. Use ids starting `forest-` for the quest's clues and the lost friend, and add them to `woods_objects.py` (`npcs` is written as an empty list for now; add the `npcs` / `entities` you need in the script, not by hand in `woods.json`, which is regenerated).
       - What is in it: a small farm top left (house, well, plots, hens), a treasure pond with an island (gold chest), a stream from the farm's river with a bridge on the way in, lagoons with a mushroom island (cherry chest), a beach with a pier (fishing spot at `(24, 37)`), a peninsula chest (silver), 8 fruit trees and 7 berry bushes to shake, a beehive, 8 pickups, cows and calves on the east bank, frogs, bees, fish shadows, a boat and a campfire. Ids: `woods-chest-*`, `woods-egg-*`, `woods-cow-*`.
       - Screenshots of any woods tile: `?at=x,y` counts from the **farm's** corner, so woods tile `(wx, wy)` is `?at=<wx - 44>,<wy>`.
       - Tests that use world pixels now add the farm's offset (`ui-check.mjs` looks it up); `check:ui` and `check:quest` pass.
       - Not done in the woods (on purpose): hills and stairs (art missing), the optional second way in along the beach, the north area.
     - **North area: DONE by Opus (2026-09-30)**, region `north` ("North Meadows", 104 x 18) from `north_v1.py` (ground) and `north_objects.py` (objects, animals, checks). Positions are written in **farm column numbers** (`C()` / `P()`), so farm column 29 is the trail from the farm's north bridge up to the hill cottage. Lily pond with a pier (fishing) and rowboat; the fenced hill cottage (drawn flat) with Granny Tabby (`north-granny`, `dialogue/north.json`); the pink blossom meadow with a picnic (it carries on from the farm's blossom grove); Treasure Isle over stepping stones. The world is now **104 x 58**: north at `[0, 0]`, woods at `[0, 18]`, farm at `[44, 18]`. Its left 44 columns are forest joining the woods' forest. Tests count positions inside each region, so moving regions is safe.
   - **Gemini base maps (added 2026-09-28):** `map-drafts/GEMINI-MAP-PROMPT.txt` is a reusable prompt. The user attaches any map picture in Gemini and pastes the whole file. Gemini answers with the **ground only** (the user said "clean maps no buildings, just the bases"): 9 characters from our map key (`~ . : b h ^ = | o`), rows numbered `00`, `01`... and cut into groups of 10, plus NOTES on what it left out (buildings, fences, fields) and roughly where. `GEMINI-FIX-PROMPT.txt` is a follow-up if the rows come out uneven. Gemini does not touch the game; answers get saved in `map-drafts/` or pasted to Claude.
   - **To finish a Gemini draft:** strip the row numbers and spaces; a row that isn't the full width has a group that isn't 10 long, so fix it there; remove lone tiles and corner-only joins; check bridges and stones have land at both ends and every hill has `^^` on its bottom edge (stair art isn't drawn yet, see section 8); run it through `buildWorld` / `buildTerrain` / `floodReachable` in Node (every character was checked to load); then make it a region file and add objects, animals and life the way `farm_objects.py` does, and screenshot it.
3. **Quests as data.** **The chick quest is DONE (2026-09-29)**:
   - `quests/chicks-home.quest.json` (talk to Mama Hen -> find 3 chicks -> walk them into the coop; prize 1 star, 3 hearts, 10 coins, a diamond), `dialogue/farm.json` (Mama Hen and the gardener), and the chicks Pip (pond), Nutmeg (east of the pumpkins) and Rosie (blossom grove, over the bridge) in `farm_objects.py` (`chick(...)`, `"kind": "follower"`, `"homeWith": "mama-hen"`, `joinSay` / `followSay` / `homeSay`). `chick-1` is gone. Chicks may be found before talking to Mama Hen (flexible order).
   - `OverworldScene` now sends every talk through `session.rules.interact`, then `handleOutcome` saves, plays sounds, hands out prizes (`out.gained`, from the quest's `reward`, via `GameRules.grant`), shows signs (`ui/NoticeBanner.js`: "New quest!", "Quest done!", "You found SUNNY FARM") and opens the ending once (`endingSeen`). `syncQuestWorld` puts "!" over quest givers and "?" over lost followers, makes followers trail the player (`Creature.guide` walking the player's path) and settles them with `homeWith` once home. `enterArea` runs on load; `playerMoved` every 250 ms while followers walk.
   - Test: `npm run check:quest` (dev server running) plays it end to end, including reloads mid-quest and after the end.
   - **Engine for more quests (2026-09-29):** region `"entities"` = clues/items with a picture (`{ "id", "kind": "clue", "object": "<art.json object>", "at", "foundSay" }`, used with the Talk button, a star bubble while the current step wants them); `visibleWhen` / `hiddenWhen` on people (they sparkle in when the story needs them); a person (`"character"`) with `"kind": "follower"` walks behind the player like the chicks (`systems/Walkers.js`); `"alt": { "character", "name" }` is used when the player picked that same character; text can say anyone's name with `{@their-id}`; the goal note says "Say hello to <giver>!" when a quest is waiting.
   - **"Lost in the Forest" is DONE (2026-09-29):** `quests/lost-in-forest.quest.json`, `dialogue/woods.json`; people and clues are in `woods_objects.py` (the `npcs` / `entities` lists near the end, placed on free tiles without changing Sonnet's layout, with their own checks). Pudding (`forest-pudding`, by the woods farm gate) asks you to find `forest-imp`; clues `forest-basket` (near the way in), `forest-mushrooms` (by the stream trail), `forest-footprints` (at the clearing's edge); the Imp appears in the quiet clearing after the third clue, follows you and stays with Pudding. Prize: 1 star, 3 hearts, 15 coins, an emerald. The ending opens once both quests are done. Both quests are tested in `npm test` and `npm run check:quest`.
   - **Secret cove (the brief's hidden place), DONE 2026-09-29:** a mossy log (`woods-cove-log`, region `"entities"` with `"kind": "blocker"`, `"hiddenWhen": { "route": "secret-cove" }`) blocks a little bridge from Mushroom Isle to the woods' south-west corner; "Lost in the Forest" ends with `{ "type": "unlock", "route": "secret-cove" }` and Pudding says she moved it; an oak chest with a diamond waits inside. Routes are listed in `world.json` `"routes"`. The bridge is added in `woods_objects.py` after the scatter so the random layout does not change.
   - **Celebrations (2026-09-29):** confetti over the player and a heart over the quest giver when a quest ends; a heart when someone starts following and when they get home; a sparkle and hop when a clue is found (`Effects.confetti`, `OverworldScene.celebrate`).
   - **Still to do here:** `rewards.json` is unused (prizes live in each quest's `reward`). `npm run check:ui` failed once in six runs on 2026-09-29 and could not be repeated: watch for a flaky check.
   - Original plan, for reference: write `quests/*.quest.json` in the `GameRules` format ("Help the Baby Chicks Find Mom" and "Lost in the Forest"), with `icon`, `reward` and per-step `icon` for the journal, plus entities (chicks as followers, clues, chests) in the regions' `entities` lists, `rewards.json` and `dialogue/*.json`. **Mama Hen's and the gardener's lines in `farm_objects.py` are placeholders.** `chick-1` is a placeholder too: it should become one of the lost chicks.
   - Wire `GameRules` into `OverworldScene`: `interact()` currently just shows an NPC's `say` lines. It should call `session.rules.interact(id, ctx)`, show its `lines`, play its `sounds`, save, and show the `notices` (quest started, step done, reward, +1 star).
   - Followers walking behind the player, `enterArea` / `playerMoved`, the locked route, and opening the ending screen when `rules.allQuestsComplete()`.
4. **World check: DONE (2026-09-29).** `src/engine/content/checkContent.js` (shared by the game in dev, `npm run check:world`, `npm test` and `npm run build`): every name points at something real (quests, people, pictures, items, dialogue, unique ids), and from the start spot every person, treasure, chest, tree, fishing spot and quest goal can be reached; walkable ground nobody can reach is a note. The Python checks in `farm_objects.py` / `woods_objects.py` still run when drawing an area.
5. Rooms (indoors) and doors that fade and teleport (only if the final plan needs them).
6. Audio: check the quest-step and ending sounds play at the right moments.
7. **Offline install: DONE (2026-09-29).** `npm run build` = `check:art` + `check:world` + `vite build`; `scripts/tools/pwa-plugin.mjs` writes `dist/manifest.webmanifest` and `dist/sw.js` (everything kept at install except music, kept on first play; storage named `gameId` + build fingerprint; only this game's old copies are deleted). Icons in `public/icons` from `py scripts/tools/make-icons.py` (`game.config.json` `pwa.icon`). `npm run check:offline` (after a build) proves it starts with the network cut.
8. **Tests: mostly DONE (2026-09-29).** `npm test` now tests the real game (content check, chick quest through the rules in any order with a reload mid-quest and the prize only once, journal, saves kept apart between gift games, broken saves). Browser tests: `npm run check:ui`, `npm run check:quest`, `npm run check:offline`. `check:quest` plays both quests end to end (and the secret cove); `check:ui` now also has `testCollecting` (shake a tree and pick up the fruit, cooldown, an egg that stays gone after a reload, a chest opened once, the item bar and coin counter).
9. Docs: `EDITING-GUIDE.md` (how to change names, dialogue, quests and maps) and `CREDITS-AND-LICENSES.md`.
10. The optional profile photo (section 6, UI).
11. Verify at desktop, tablet and phone-landscape sizes (section 12), then run `npm run build`.

## 12. How to check your work

- Start the game with `npm run dev` (port 8190). In the Browser pane it's the `sprout-lands` entry in `C:/Users/macie/.claude/.claude/launch.json`.
  - The pane slows the game loop down to a few frames, so the game can look stuck on the loading bar there.
  - Use headless Chrome for screenshots instead.
- Screenshot of the whole area at 2x (crisp):
  `"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --hide-scrollbars --enable-unsafe-swiftshader --use-angle=swiftshader --virtual-time-budget=8000 --window-size=1920,1280 --screenshot=out.png "http://localhost:8190/?overview=1"`
- Screenshot at play zoom: use `--window-size=1280,720` and `?at=x,y`, which starts the player on that tile.
- Other test switches:
  - `?blocked=1` shows the tiles you can't walk on in red;
  - `?room=<id>` starts inside that room, just inside its exit (for example `?room=baker-house`);
  - `?coast=layer` shows the other coast style;
  - `?ui=settings|start|journal|map|credits|ending` opens a screen; `&focus=1` shows keyboard focus; `?nostart` skips the start screen.
- `window.__GAME_DEBUG__` gives `{ scene, world }` and `window.__UI_DEBUG__` is the UI scene, in the browser console.
- Map checks: `py scripts/tools/map-authoring/farm_objects.py` (placement, and whether the player can reach everything).
- Art check: `npm run check:art`.
- Look at pack art: `py scripts/tools/art-inspect/contact.py groups.json out.jpg 1500` (a labelled sheet of many pictures; see the file's header for the JSON format) and `gridsheet.py out.png scale cell file...` (numbered grid over sheets). View big sheets in pieces, and note findings at once (only about 35 image views stay visible in one chat).
- Debug in the browser console: `__GAME_DEBUG__.scene.creatures.creatures`, `.pickups.floating`, `.pickups.spots`, `.life`, `.near`; `__UI_DEBUG__.session.state` (bag, coins, collected...). `?at=x,y` starts the player on a tile and **skips collision**, so only use it for screenshots.
- Menu check (clicks, keys, resizing): `npm run check:ui`, with the game running. Add `-- settings` (any part of a test's name) to run just that test. `scripts/tools/browser.mjs` is the helper for writing more (`openGame`, `press`, `hold`, `click`, `eval`, `shot`).
- The Browser pane slows the game down; use `browser.mjs` or the headless Chrome command above for screenshots.

## 13. Gotchas (things that cost time)

- **Phaser reserves the field name `w`** on every object and resets it when you call `setPosition`. Widgets use `bw` / `bh`.
- **Phaser 4:** `setTintFill` is gone (use `setTint` plus `setTintMode(FILL)`); `roundPixels` defaults to off (the game sets it); a `Zone` needs `setSize(w, h, true)` to resize its click area; Text needs its font loaded before it is first drawn (`main.js` waits for the fonts).
- **UI text** always goes through `uiText()` (right size, line spacing and metrics for the two pixel fonts). Names of screens in `UIScene` `SCREENS` must match the `?ui=` switch.
- **Editing files:** after a shell command changes a file, the Edit / Write tools refuse ("modified since read") until it is Read again. The Bash tool also **collapses double backslashes** and has trouble with long here-documents that contain apostrophes: write scripts and files with the Write tool, and use Python raw strings (`r"..."`) for anything with `\u...` or `\p{...}`.
- **The Browser pane throttles the game** to a few frames; use `scripts/tools/browser.mjs` (headless Chrome) for screenshots and tests. Headless Chrome with software drawing runs slowly, so waits in tests are generous.
- `art.json` must be saved through `scripts/tools/artjson.py` so its layout stays readable.
- Animals and NPCs must be created before anything that follows them (`follow: "<id>"` refers to an earlier id).
- The pixel fonts have no accents, and the small font's digit 0 looks like a D. Typed names are simplified (`fontSafe`).
- Old Codex leftovers: deleted 2026-09-29 (see section 4).

### Offline install check (2026-09-29)
`npm run build` then `npm run check:offline` (own server, port 8191) passed: 316 files kept at install, game starts offline. `scripts/tools/offline-phone-check.mjs` repeats it at 1089x490 against `npm run preview` (8190): first tap starts music online, all 24 songs end up in the offline copy, network cut + reload -> start screen shows and a song plays. Screenshot: `map-drafts/offline-phone.png`. All other checks (test, world, ui, quest, rooms, bakery) passed the same session on the dev server. Phone link: http://192.168.0.22:8190 (Wi-Fi) - Chrome menu -> Add to Home screen; install needs the page opened once online; the Tailscale link 100.83.82.18 also works.
