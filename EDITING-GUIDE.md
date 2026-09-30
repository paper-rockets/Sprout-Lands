# How to change the game (no programming needed)

Everything that makes this game *this* game lives in one folder:

```
src/content/starter-adventure/
```

To make a **new gift game**, copy that whole folder, give the copy a new name (for example `emmas-adventure`), and start the game with that name:

```
set CONTENT_PACKAGE=emmas-adventure
npm run dev
```

(PowerShell: `$env:CONTENT_PACKAGE = 'emmas-adventure'; npm run dev`.) Nothing in the engine code (`src/engine`) mentions any person, so you never need to touch it.

Most files are plain text with `"name": "value"` pairs. Keep the quote marks, commas and brackets exactly as they are. If the game shows a red error after an edit, you most likely deleted a comma or a quote. Put it back.

**Every file here has a short `"about"` line at the top that says what it is for.**

---

## 1. The quick changes

| I want to change... | Open this file | Look for |
|---|---|---|
| The game's title | `game.config.json` | `"title"` and `"shortTitle"` (the short one is on the start screen) |
| The name used when a player types nothing | `game.config.json` | `recipient` → `"defaultName"` |
| Which friend is picked first | `game.config.json` | `recipient` → `"avatarId"` (a character id from `characters.json`) |
| The names in the Credits screen | `game.config.json` | `"credits"` (one line each) |
| Who dances on the ending screen | `game.config.json` | `ending` → `"cast"` |
| Button and menu words ("Quests", "Map", "Let's go!") | `text/strings.json` | the word on the right of the colon |
| The app name when installed on a phone | `game.config.json` | `pwa` |
| **The game's secret id** | `game.config.json` | `"gameId"` |

**Important:** give every gift game its own `gameId` (for example `emmas-adventure-v1`). The saved game, the photo storage and the offline copy are all named after it. Two games with the same id would overwrite each other's saves.

Words that mention the player: write `{name}` and the game swaps in whatever the player typed. Example: `"HELLO, {name}!"`.

**Pixel-font tip:** the game's font has capital letters, digits and basic punctuation only. Accents are simplified automatically (é becomes e). Long lines wrap by themselves.

**Player photo.** On the start screen a player can add a photo (the small frame next to the name). It is cropped to a small round picture and kept only on that device, in the browser's own storage, under the game's `gameId`. It is never sent anywhere. The little x removes it.

---

## 2. Characters (the friends you can pick)

File: `characters.json`. Each line is one friend:

```
{"id": "floppy-pup", "name": "Floppy Pup", "texture": "char-floppy-pup", "player": true, "blurb": "A cheerful friend with floppy ears."}
```

- `id`: a short code word. Other files refer to the friend by it.
- `name` and `blurb`: shown on the start screen.
- `player: true`: the player may pick this friend. Leave it out for people who only live in the world (they can still talk).
- `texture`: the picture. It must also be listed in `art.json` under `textures`.

**Adding a friend with a new picture.** Pictures are walking sheets: 8 directions in a row and 3 walking poses, each 32 x 32 pixels (256 x 96 for the whole sheet).

1. Draw or generate a sheet with 4 rows (front, left, right, back) and 8 poses on a transparent background (see the folder `Generated Characters/sources-v2` for examples).
2. Put it in `Generated Characters/sources-v2` and run `py scripts/tools/build-characters-4dir.py` (it makes the walking sheet).
3. Add the file to `assets.catalog.json` and `art.json` (copy the line of an existing friend), then run `node scripts/sync-art.mjs`.
4. Add a line in `characters.json`.

---

## 3. Quests and stories

Quests are in `quests/`, one file each, named `something.quest.json`. Open `chicks-home.quest.json`. It is a complete example, and the comments in it explain the parts:

- `title`, `giver` (who gives the quest), `icon`, `reward` (stars, hearts, coins and items).
- `steps`: what the player does, in order. Each step has an `objective` (the words in the corner of the screen) and a `type`:
  - `talk`: talk to someone. `target` says who.
  - `gatherFollowers`: find friends that follow you (chicks, a lost friend...). `tag` says which ones and `count` how many.
  - `escort`: walk them somewhere. `to` says where.
  - `inspectClues`, `collect`, `deliver`, `reach`: look at clues, gather things, hand something over, walk to a place.
- `hints`: what other people say while a step is going on.
- `complete`: what is said when the quest is finished.

The words inside `say` and `hints` can be changed freely. Keep the `"id"`s and `"target"`s as they are unless you also change them on the other side (the quest file and the map file must use the same code word for the same person).

Extra talk that is not part of a quest is in `dialogue/` (one file per area).

---

## 4. Maps and things in the world

Each area is one file in `world/regions/` (for now: `farm.json`). It has:

- `map`: the ground, drawn in letters. The key is at the top of `world/world.json` (`~` water, `.` grass, `:` sand or path, `b` bushes, `f` fence, `=` and `|` bridges, and so on). Nature should never have long straight lines: make coasts, ponds and forest edges wobble.
- `objects`: trees, flowers, houses. Each is `{"type": "tree_round", "at": [x, y]}` (the tile it stands on).
- `npcs`: people and talking animals. `critters`: animals that only wander. `life`: bees, frogs, fish shadows, boats and campfires. `pickups`: things lying on the ground. `interactables`: trees to shake, chests, mailboxes, fishing spots. `gates`: fence gates. `landmarks`: names shown on the map screen.

**The farm is drawn by a small helper script.** If you want to move things on the farm, edit `scripts/tools/map-authoring/farm_objects.py` and run:

```
py scripts/tools/map-authoring/farm_objects.py
```

It writes `farm.json` for you, and it **checks your work**: nothing solid on a path, every important place reachable from the start, every chest and fishing spot on the right kind of tile. If it prints a `PROBLEM` line, fix that line and run it again.

Use `?blocked=1` at the end of the game's address to see the tiles you cannot walk on in red.

**Rooms inside houses** are in `world/rooms/`, written by `scripts/tools/map-authoring/rooms_v1.py`. To add a room or change its furniture, edit the list at the top of that script and run:

```
py scripts/tools/map-authoring/rooms_v1.py
```

Each room says which house door leads in (`door`: the area and the doorway tile under the house picture), how big it is, where the gap in its bottom wall is (`exit`), and what stands in it. The script checks that everything fits, nothing blocks the way in, and every bit of floor can be walked to. Add `?room=baker-house` to the game's address to start inside a room.

---

## 5. Pictures, sounds and music

- **Pictures and sounds** the game uses are listed in `assets.catalog.json`. It records where each file came from and what its licence says. A file that is not in the catalog is never shipped.
- After adding or changing anything there, run `node scripts/sync-art.mjs`. It copies the files into the game and checks them. `npm run check:art` only checks.
- **Music:** put your tracks in the folder `Music/<your set>/`, list them in `assets.catalog.json` (copy a Cozy Farm line; `"process": {"encode": "64k"}` makes small mp3s), and put the file names in `art.json` under `music` → `playlist`. The Music slider in Settings controls the volume.
- **Where things are drawn from:** `art.json` says which part of each picture is a tree, a fence, a button. It is long, and you rarely need it. If you do, change it with the tool in `scripts/tools/artjson.py`, which keeps the file tidy.

---

## 6. Trying it and checking it

```
npm run dev          starts the game at http://localhost:8190
npm run check:ui     plays the game with a robot (menus, talking, petting, mailbox, fishing...)
npm run check:quest  plays the chick quest from start to finish
npm run check:art    checks the art list against the files
```

Screenshots in the address bar of the game:

- `?at=20,15` starts the player on that tile. (Skips collision. For screenshots only.)
- `?overview=1` shows the whole world.
- `?ui=settings` (or `journal`, `map`, `credits`, `ending`, `start`) opens a screen straight away.
- `?nostart` skips the first-run screen.

On a phone: open the game's address in Chrome, then choose **Install app** (or **Add to Home screen**) from the menu.

---

## 7. If something breaks

- **A white or red page:** you probably broke a comma or a quote in a `.json` file. Undo your last change.
- **The game says an id is unknown:** two files use different code words for the same thing (a person, an item, a texture). Make them match.
- **A picture is missing:** run `node scripts/sync-art.mjs` and read what it says.
- **The saved game acts strange:** open the game, press F12, and paste `localStorage.clear(); location.reload()`. This wipes the save on that device.
- Everything is saved in git. `git log` lists earlier versions and `git checkout <file>` brings a file back.
