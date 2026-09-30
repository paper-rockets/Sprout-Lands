"""Builds the Old Mine's doorway: Made Art/mine-mouth.png (48 x 24).

    py scripts/tools/make-mine-mouth.py
    node scripts/sync-art.mjs          (copies it into public/assets/objects and updates the lock)

The Dungeon Pack's big stone gate (dungeon_walls_decor_gates.png, the wide arch at 0,40) with
its see-through opening filled dark, so it reads as a hole into the hill. The dark gets a little
lighter towards the bottom, where the orange cave floor starts.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SOURCE = os.path.join(ROOT, 'Sprout Sorry pack', 'Sprout Sorry pack', 'Early Access', 'Dungeon Pack', 'tiles', 'dungeon_walls_decor_gates.png')
OUT = os.path.join(ROOT, 'Made Art', 'mine-mouth.png')
DARK = (42, 31, 43)       # the rooms' "void" colour (art.json rooms.void)
FLOOR = (196, 128, 84)    # a hint of orange floor at the very bottom

src = Image.open(SOURCE).convert('RGBA')
gate = src.crop((0, 40, 48, 64))
px = gate.load()
w, h = gate.size

# The opening: see-through (or faded) pixels between the first and last stone pixel of each row.
for y in range(h):
    solid = [x for x in range(w) if px[x, y][3] == 255]
    if len(solid) < 2:
        continue
    for x in range(solid[0], solid[-1] + 1):
        r, g, b, a = px[x, y]
        if a < 255:
            t = max(0, (y - (h - 6)) / 6)  # the bottom few rows warm up towards the floor colour
            c = [DARK[i] + (FLOOR[i] - DARK[i]) * t * 0.35 for i in range(3)]
            k = a / 255  # keep any faded stone the pack drew, laid over the dark
            px[x, y] = (round(c[0] * (1 - k) + r * k), round(c[1] * (1 - k) + g * k), round(c[2] * (1 - k) + b * k), 255)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
gate.save(OUT)
print('wrote', os.path.normpath(OUT), gate.size)
