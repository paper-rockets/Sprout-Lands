# HANDOFF — Sprout Lands game (rebuild in progress)

Written 2026-09-28 at the end of a Claude session. **This file is the only plan.** All older plans and briefs were removed to avoid confusion (see section 9).

## 1. What the user wants

- **Claude builds and fixes everything. Don't use Codex.** The user said "dont use codex… I need you to fix all".
- The goal is a **full, production-ready game** that can be **easily edited later**: names, dialogue, quests and maps should be simple text/JSON files. **No new art for now.** Use only the pictures already in this folder.
- **Only use assets inside `E:\Z Pixel\Sprout-Lands`.** Don't use `E:\X Phaser` or `E:\Z Pixel\Phaser`.
- The user **owns the paid versions** of the Sprout Lands Sprites and UI packs.
- The user prefers **plain language, no jargon**.

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

## 3. Open question: the world layout is not decided

I drew a rough sketch with 8 separate islands joined by bridges. **The user rejected it: "it wrong layout… stop". Ask the user what layout they want before building any maps.**

The user sent reference pictures in chat. **These are not saved on disk**; ask the user to put them in `docs/reference-look/`.
- Cup Nooble promo scenes:
  - an open-top farmhouse where you can see the bed and furniture inside;
  - a hedge-maze forest with a thick bush mass around the clearings;
  - chickens, a small barn island, and the UI with hearts, coins, a mission panel and an item bar.
- AI concept art:
  - a world map with a snow island, autumn cliffs with stairs, a cherry-blossom island, a farm meadow in the middle, and many islets;
  - five island ideas: Berry Island, Fishing Cove, Flower Meadow, Forest Grove and Sunny Beach.
- Palm trees, a torii gate and autumn trees are **not** in the packs.

The user's taste (from other projects): coastlines, ponds and forest edges should wobble; only built things are straight.

## 4. The game right now is broken (expected)

I replaced `public/assets` with the new curated art set, which has new file names. **The old Codex code in `src/engine/**` still points at the old names**, so http://localhost:8190 won't show pictures until the rebuild is wired in.
- The old code is kept only as a reference. Its known bugs are listed in section 10; don't copy them.
- `test/run-tests.mjs` and `scripts/validate-content.mjs` test the old code.
- `scripts/curate-ui-assets.mjs` and `scripts/inspect-tilemap-reference.mjs` belong to the old asset approach.
- `dist/` is an old build that still contains two non-commercial pictures; the next `npm run build` replaces it.

## 5. Licences (checked and recorded)

- **Sprites Premium and UI Premium are paid and fine for commercial use.** Credit Cup Nooble, and don't ship the raw pack.
- **Sorry pack:** its `read_me.txt` says "non-commercial", but Cup Nooble publicly answered two buyers on https://cupnooble.itch.io/sorry-package that it can be used in commercial games. That evidence is recorded in the catalog. The user could ask Cup Nooble on Discord (`cup_nooble`) for written confirmation.
- **Not used:**
  - Basic UI pack: free and non-commercial. Everything useful in it is also in Premium.
  - Tilemap-0.2.0 and UI-0.2.0: Godot add-ons with MIT code and free Basic art.

## 6. What's done (not yet wired into the game)

| File | What it is | State |
|---|---|---|
| `src/content/starter-adventure/assets.catalog.json` | Every shipped file: its pack, source path, licence evidence and use. 71 files, 622 KB | done |
| `src/content/starter-adventure/assets.lock.json` | Fingerprints, generated by the sync script | generated |
| `scripts/sync-art.mjs` | Copies the listed files from the packs into `public/assets`, trims the sounds (ffmpeg), and deletes unlisted files. Run with `node scripts/sync-art.mjs`; `--check` only reports | done, **not yet in package.json** |
| `public/assets/**` | The curated art and sounds (tiles, objects, characters, animals, ui, fonts, audio) | done |
| `src/content/starter-adventure/art.json` | Texture keys, autotile tilesets, object pieces (sheet rectangle, which tiles block walking, fade-when-behind), animations and UI icon numbers | written; **several values unchecked** (see section 8) |
| `src/engine/world/autotile.js` | 47-piece edge table and 16-piece fence table. **Checked by rendering test islands** | done |
| `src/engine/world/worldModel.js` | Builds the world grid from region text maps, connectors and rooms, plus the walk/block grid, footprints and flood-fill | written, untested |
| `src/engine/rules/GameRules.js` | Pure quest, dialogue, follower, clue, chest and lock logic, driven by content data. Step types: talk, gatherFollowers, escort, inspectClues, collect, deliver, reach | written, untested |
| `scripts/tools/art-inspect/*.py` | Python helpers used to study the sheets: grid view, numbered sprite boxes, edge test, layer test, layout sketch. `boxes.json` holds the measured sprite boxes | helper tools |

The old content files in `src/content/starter-adventure/` (`game.config.json`, `characters.json`, `theme.json`, `quests/*`, `world/world.graph.json`) are Codex's. Rewrite them for the new format.

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
- **Hen and chick sheets:** 16 × 16 frames, 8 per row; row 0 is idle, row 2 is walk. The chick "hearts" row (13) frame numbers are a guess.
- **Frog, bee, cow, Christmas tree, fire and campfire:** frame numbers in `art.json` are guesses; check them.

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

1. **Ask the user about the world layout** (section 3) and get the reference pictures saved. Then build **one small, hand-made, fully dressed test area** (for example the starting farm), show it next to the reference pictures, and get a yes before building the rest. Don't generate maps with code. The user rejected code-made layouts and terrain here and in other projects.
2. Content loader and validator: cross-check every id; the Node script and the game should share one validator.
3. Terrain layer builder, then the Phaser renderer (tilemap per region, animated water, objects with depth sorting and tree/house fade). Add a `?debug=1&area=…&overview=1` view for screenshots.
4. Write the maps: region text maps, objects, NPCs, chicks, clues, doors and rooms.
5. Scenes:
   - player movement;
   - NPCs, followers and interactions;
   - HUD built from Premium art, dialogue with a portrait and continue arrow;
   - a map/atlas screen, quest journal, and credits.
6. Quests as data, the locked area, and the ending (use the player's name).
7. Audio service (the trimmed WAVs) and settings (volume, text speed, reduced motion).
8. Offline install: manifest, icons, generated `sw.js`; add `sync-art` and the asset check to `npm run build`.
9. Tests:
   - "can a kid get stuck" reachability for every area;
   - both quests end to end, including resuming mid-quest;
   - two game ids kept separate;
   - the asset check.
10. Docs: `EDITING-GUIDE.md` (how to change names, dialogue, quests and maps) and `CREDITS-AND-LICENSES.md`.
11. Verify in the Browser pane at desktop, tablet and phone-landscape sizes, then run `npm run build` and `npm test`.
