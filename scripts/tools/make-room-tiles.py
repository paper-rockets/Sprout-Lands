"""Builds the tiles for rooms inside houses: Made Art/room-wood.png (16 x 16 pieces in one row).

    py scripts/tools/make-room-tiles.py
    node scripts/sync-art.mjs          (copies it into public/assets/tiles and updates the lock)

The Sprout Lands "Wooden_House_Walls_Tilset" is a small drawn example of a room, not a grid of
tiles, so this script redraws its pieces (same colours, same plank and brick patterns, same
thin rim) as whole 16 px tiles the game can join into a room of any size.

Pieces, left to right (the numbers art.json "rooms" uses):
  0 brick floor      1 plank floor       2 back wall, top    3 back wall, bottom
  4 left wall        5 right wall        6 front wall        7 top-left corner
  8 top-right corner 9 bottom-left      10 bottom-right     11 doorway (brick floor)
 12 front wall just left of the doorway  13 front wall just right of it  14 doorway (plank floor)
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
SOURCE = os.path.join(ROOT, 'Sprout Lands - Sprites - premium pack', 'Tilesets', 'Building parts', 'Wooden_House_Walls_Tilset.png')
OUT = os.path.join(ROOT, 'Made Art', 'room-wood.png')

src = Image.open(SOURCE).convert('RGBA')
px = src.load()
# The colours, read from the example so they always match it.
OUTLINE = px[11, 16]   # dark purple edge
RIM = px[12, 16]       # top of the wall
PLANK = px[16, 5]      # wall boards
LINE = px[16, 7]       # gaps between boards
LIGHT = px[16, 4]      # light edge under the rim
VOID = (0, 0, 0, 0)
DARK = (58, 40, 56, 255)  # the dark doorway

T = 16
COUNT = 15
sheet = Image.new('RGBA', (T * COUNT, T), VOID)


def tile(i):
    return Image.new('RGBA', (T, T), VOID), i


def put(img, i):
    sheet.alpha_composite(img, (i * T, 0))


def brick_floor():
    # Straight from the example: its floor is exactly one 16 x 16 square that repeats.
    return src.crop((16, 16, 32, 32))


def plank_floor():
    # Lighter than the walls (the colour of the rim), so the floor and the walls read apart.
    img = Image.new('RGBA', (T, T), RIM)
    p = img.load()
    for y in range(T):
        for x in range(T):
            if y % 4 == 3 or x == (3 + (y // 4) * 6) % T:
                p[x, y] = PLANK  # gaps between boards, and staggered board ends
    return img


def boards(img, y0, y1, first_line):
    """Wall boards from row y0 to y1 (inclusive), a gap line every 4 rows."""
    p = img.load()
    for y in range(y0, y1 + 1):
        for x in range(T):
            p[x, y] = LINE if (y - first_line) % 4 == 0 else PLANK


def rim_top(img, x0=0, x1=T - 1):
    p = img.load()
    for x in range(x0, x1 + 1):
        p[x, 0] = OUTLINE
        for y in (1, 2, 3):
            p[x, y] = RIM
        p[x, 4] = LIGHT


def back_top():
    img = Image.new('RGBA', (T, T), VOID)
    boards(img, 5, 15, 7)
    rim_top(img)
    return img


def back_bottom():
    img = Image.new('RGBA', (T, T), VOID)
    boards(img, 0, 14, 3)
    p = img.load()
    for x in range(T):
        p[x, 15] = OUTLINE
    return img


def side(left):
    """A side wall: only its top (the rim) shows; the rest is the dark outside."""
    img = Image.new('RGBA', (T, T), VOID)
    p = img.load()
    xs = (11, 12, 13, 14, 15) if left else (4, 3, 2, 1, 0)
    for y in range(T):
        p[xs[0], y] = OUTLINE
        for x in xs[1:4]:
            p[x, y] = RIM
        p[xs[4], y] = OUTLINE
    return img


def front():
    img = Image.new('RGBA', (T, T), VOID)
    p = img.load()
    for x in range(T):
        p[x, 0] = OUTLINE
        for y in (1, 2, 3):
            p[x, y] = RIM
        p[x, 4] = LIGHT
    boards(img, 5, 14, 7)
    for x in range(T):
        p[x, 15] = OUTLINE
    return img


def corner_top(left):
    img = side(left)
    p = img.load()
    x_in = range(12, 16) if left else range(0, 4)  # the rim turns the corner
    edge = 11 if left else 4
    for x in range(edge, edge + 5) if left else range(0, edge + 1):
        p[x, 0] = OUTLINE
    for x in x_in:
        for y in (1, 2, 3):
            p[x, y] = RIM
    return img


def corner_bottom(left):
    img = Image.new('RGBA', (T, T), VOID)
    f = front()
    fp = f.load()
    p = img.load()
    xs = range(11, 16) if left else range(0, 5)
    for x in xs:
        for y in range(T):
            p[x, y] = fp[x, y]
    edge = 11 if left else 4
    for y in range(T):
        p[edge, y] = OUTLINE
    inner = 15 if left else 0  # the side wall's inner edge meets the front rim
    p[inner, 0] = LINE
    return img


def doorway(floor):
    img = floor.copy()
    p = img.load()
    for y in range(5, T):
        for x in range(T):
            p[x, y] = DARK
    for y in range(4, T):
        p[0, y] = OUTLINE
        p[T - 1, y] = OUTLINE
    for x in range(T):
        p[x, 4] = OUTLINE
    return img


def front_cap(left_of_door):
    img = front()
    p = img.load()
    x = T - 1 if left_of_door else 0
    for y in range(T):
        p[x, y] = OUTLINE
    return img


pieces = [brick_floor(), plank_floor(), back_top(), back_bottom(), side(True), side(False), front(),
          corner_top(True), corner_top(False), corner_bottom(True), corner_bottom(False), doorway(brick_floor()),
          front_cap(True), front_cap(False), doorway(plank_floor())]
assert len(pieces) == COUNT
for i, img in enumerate(pieces):
    put(img, i)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sheet.save(OUT)
print('wrote', os.path.normpath(OUT))
