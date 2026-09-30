# Made Art

Pictures made for this game by its own scripts, from art in the purchased Sprout Lands packs.
Same licence as the pack each one comes from (see `CREDITS-AND-LICENSES.md`). Don't edit these by
hand: change the script and run it again, then `node scripts/sync-art.mjs` to copy them into the game.

| File | Made by | From |
|---|---|---|
| `room-wood.png` | `py scripts/tools/make-room-tiles.py` | Sprout Lands Premium: `Tilesets/Building parts/Wooden_House_Walls_Tilset.png` (walls, rim, brick floor redrawn as whole 16 px tiles; the plank floor uses the same colours) |
| `oven.png` | `py scripts/tools/make-oven.py` | Sprout Lands: the brick houses' lower wall (colours and brick pattern) and `fire.png` (the animated flame, one oven frame per flame frame). No pack has an oven |
| `mine-mouth.png` | `py scripts/tools/make-mine-mouth.py` | Sprout Lands Sorry pack: `Early Access/Dungeon Pack/tiles/dungeon_walls_decor_gates.png` (the wide stone arch at 0,40, its see-through opening filled with the rooms' dark colour) |
