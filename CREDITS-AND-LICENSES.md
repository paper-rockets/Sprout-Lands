# Credits and licences

This file records where every picture, sound and tune in the game comes from and what it may be used for. The exact list, file by file, is `src/content/starter-adventure/assets.catalog.json`. Only files listed there are ever shipped.

**Last checked:** 2026-09-29.

## What the game shows (Credits screen)

The in-game Credits screen (Settings → Credits) shows these lines from `game.config.json`:

- Art and fonts: Sprout Lands by Cup Nooble (cupnooble.itch.io)
- Sounds and music: made for this game from scratch
- Made with Phaser

## Sources

### Sprout Lands, Sprites Premium pack: Cup Nooble (paid)
- **Used for:** ground tiles, trees, houses, fences, bridges, animals, items, chests, the mailbox, gates.
- **Licence:** paid Premium licence. Use in any commercial or non-commercial project. Modification allowed. **The pack itself may not be resold or redistributed.** No NFTs and no AI training. **Credit is required.**
- **Evidence:** the pack's `read_me.txt`, the itch.io page (https://cupnooble.itch.io/sprout-lands-asset-pack), and the owner confirmed the pack was purchased on 2026-09-28.
- **In this game:** 50 files.

### Sprout Lands, UI Pack Premium: Cup Nooble (paid)
- **Used for:** buttons, panels, icons, fonts, hearts, coins, the speech box.
- **Licence:** paid Premium UI licence, same terms as above. Credit required.
- **Evidence:** the pack's `read_me.txt`, the itch.io page, and the owner confirmed the purchase on 2026-09-28.
- **In this game:** 23 files.

### Sprout Lands, Sorry pack (free gift): Cup Nooble
- **Used for:** (its sound effects are no longer used) the ocean pack (fishing bobber and things to catch), extra animals and details.
- **Licence:** ⚠️ **check before selling.** The `read_me.txt` in the pack repeats the free (non-commercial) wording. Cup Nooble has publicly answered two buyers on https://cupnooble.itch.io/sorry-package that it may be used in commercial games ("yes it can" and "yes, you can use the sorry pack in a commercial game"; checked 2026-09-28). The pack itself may not be resold.
- **To be sure:** ask Cup Nooble for written confirmation (Discord: `cup_nooble`) before selling the game, and keep the answer with this file.
- **In this game:** 40 files.

### Sound effects and music (made from scratch, project-owned)
- **Used for:** every sound effect, the nature sounds and the background music (8 tunes: one for each area plus the start screen).
- **Made:** by `scripts/tools/make-sounds.py` and `scripts/tools/make-music.py`, using the instruments in `scripts/tools/synth.py` (maths: struck bars, bells, plucked strings, flute, pads, noise). No recordings, no packs, no borrowed tunes: the tunes are composed by the script from chord lists and music rules.
- **Licence:** owned by this game's owner. Nothing to check before selling. (The old Cozy Farm tracks, whose licence was unknown, are no longer used; the loose copies are in the `Music/` folder and can be deleted.)
- **Listen to everything:** `/sound-lab.html` on the dev server.

### Character pictures (project-owned)
- **Used for:** the friends you can pick and the people in the world.
- **Made:** by the owner with image generation, then converted to walking sheets by `scripts/tools/build-characters-4dir.py`.
- ⚠️ **Some characters look like well-known brand characters** (a yellow puppy with a beret, white long-eared puppies, a black hooded imp, a round tabby cat). That is fine for a private gift. **Before selling or sharing widely, change the designs so they are clearly your own**, or remove them.
- **In this game:** 7 files.

### Made Art (redrawn from the Sprout Lands packs)
- **Used for:** the walls and floors inside houses (`assets/tiles/room-wood.png`) and Baker Bun's brick oven (`assets/objects/oven.png`, made by `scripts/tools/make-oven.py` from the brick houses' wall and `fire.png`).
- **Made:** by `scripts/tools/make-room-tiles.py` from the Premium pack's `Tilesets/Building parts/Wooden_House_Walls_Tilset.png` (same colours and patterns, cut into whole tiles). Listed in `Made Art/README.md`.
- **Licence:** same as the Sprites Premium pack above (modification allowed; don't resell the pictures on their own; credit Cup Nooble).
- **House rooms also use (already listed above):** Premium `Basic_Furniture.png` (pictures, clocks, lamps, plants, rugs), Sorry pack `Plant update 2/Furniture/new Wooden Furniture.png` and the chest sheets, and `Plant update 2/piknik` (basket, blanket, foods).
- **In this game:** 1 file.

### Tools and code
- **Phaser** (game engine, MIT licence).
- **Vite** (build tool, MIT licence).
- **puppeteer-core** (test robot, Apache-2.0).
- Written with the help of Claude (Anthropic).

## Not used (recorded so nobody adds them by mistake)

- **Sprout Lands UI Pack, Basic:** free and non-commercial. Everything useful in it is also in the paid Premium UI pack.
- **Sprout-Lands-Tilemap-0.2.0 and Sprout-Lands-UI-0.2.0:** Godot add-ons. Their code is MIT (ideas only, nothing copied) and their art is the free Basic pack. Nothing is taken from them.

## Rules to keep

1. **Never ship a pack's original files.** Only the files listed in the catalog are copied into the game, and `node scripts/sync-art.mjs` removes any that are not listed.
2. **Keep the Cup Nooble credit** visible in the game.
3. **Never put the purchased pack folders online.** The folders with the original packs stay on your computer.
4. **Adding art:** add it to `assets.catalog.json` with its pack, source and licence evidence first.
