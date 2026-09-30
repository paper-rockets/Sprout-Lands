"""Builds Baker Bun's brick oven: Made Art/oven.png (16 frames of 32 x 48, one row).

    py scripts/tools/make-oven.py
    node scripts/sync-art.mjs          (copies it into public/assets/objects and updates the lock)

No pack has an oven, so this one is drawn from pack art:
  - the stone bricks, their mortar lines and the dark purple outline use the colours and the brick
    pattern of the lower walls in the Sprout Lands "brick houses" sheet (4 px courses, 8 px bricks,
    every other course shifted half a brick, a light top edge on some bricks),
  - the wooden beam and the arch round the opening use the same sheet's wood colours (like its door),
  - the flame in the opening is the pack's animated fire.png, one oven frame per flame frame.

The picture is 2 tiles wide and 3 tall: the bottom row stands on the floor (the solid part), the
oven's top half and the chimney go up the back wall of the room.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
BRICKS = os.path.join(ROOT, 'public', 'assets', 'objects', 'brick-houses.png')
FIRE = os.path.join(ROOT, 'public', 'assets', 'objects', 'fire.png')
OUT = os.path.join(ROOT, 'Made Art', 'oven.png')

W, H = 32, 48
FRAMES = 16

src = Image.open(BRICKS).convert('RGBA')
sp = src.load()
# Colours read from the middle (grey brick) house's front wall, so they always match the sheet.
FACE = sp[96 + 20, 40 + 13]      # brick face
MORTAR = sp[96 + 20, 40 + 15]    # the line between courses
DARK = sp[96 + 21, 40 + 15]      # darker specks in the mortar
LIGHT = sp[96 + 21, 40 + 16]     # light top edge of a brick
OUTLINE = sp[96 + 12, 40 + 35]   # dark purple outline
WOOD_DARK = sp[96 + 17, 40 + 12]
WOOD = sp[96 + 13, 40 + 12]
WOOD_LIGHT = sp[96 + 15, 40 + 12]
INSIDE = (58, 40, 56, 255)       # the dark inside (same as the room doorway)
EMBER = (126, 64, 70, 255)       # warm glow at the bottom of the opening
CLEAR = (0, 0, 0, 0)


def brick(x, y, x0=0):
    """Colour of the brick wall at (x, y): 4 px courses, 8 px bricks, every other course shifted."""
    course = y // 4
    row = y % 4
    if row == 3:
        return DARK if (x + course * 3) % 7 == 0 else MORTAR
    shift = 4 if course % 2 else 0
    if (x - x0 + shift) % 8 == 0:
        return MORTAR
    if row == 0 and ((x - x0 + shift) // 8 + course) % 2 == 0:
        return LIGHT
    return FACE


def base():
    img = Image.new('RGBA', (W, H), CLEAR)
    p = img.load()
    # Chimney: 10 px wide, up the back wall, with a wooden cap.
    cx0, cx1 = 11, 20
    for y in range(2, 22):
        for x in range(cx0, cx1 + 1):
            p[x, y] = OUTLINE if x in (cx0, cx1) else brick(x, y, cx0 + 1)
    for x in range(cx0 - 1, cx1 + 2):
        p[x, 0] = OUTLINE
        p[x, 1] = WOOD_LIGHT if cx0 <= x <= cx1 else OUTLINE
        p[x, 2] = WOOD_DARK if cx0 <= x <= cx1 else OUTLINE
        p[x, 3] = OUTLINE
    # Body: a brick box with rounded top corners, from y 16 to the bottom.
    top = 16
    for y in range(top, H):
        for x in range(W):
            dy = y - top
            cut = {0: 5, 1: 3, 2: 2, 3: 1, 4: 1}.get(dy, 0)  # rounded corners
            if x < cut or x > W - 1 - cut:
                continue
            edge = x == cut or x == W - 1 - cut or dy == 0 or y == H - 1
            p[x, y] = OUTLINE if edge else brick(x, y)
    # A wooden beam across the front, like the beam over the brick houses' doors.
    for x in range(1, W - 1):
        p[x, 24] = OUTLINE
        p[x, 25] = WOOD_LIGHT
        p[x, 26] = WOOD
        p[x, 27] = WOOD_DARK
        p[x, 28] = OUTLINE
    # A stone ledge under the opening.
    for x in range(1, W - 1):
        p[x, 41] = OUTLINE
        p[x, 42] = LIGHT
        p[x, 43] = MORTAR
    # The arched opening (16 wide, rows 30-40) with a wooden rim.
    ox0, ox1, oy0, oy1 = 8, 23, 29, 40
    for y in range(oy0, oy1 + 1):
        for x in range(ox0, ox1 + 1):
            dy = y - oy0
            cut = {0: 4, 1: 2, 2: 1}.get(dy, 0)
            if x < ox0 + cut or x > ox1 - cut:
                continue
            rim = x in (ox0 + cut, ox1 - cut) or dy == 0
            inner_rim = x in (ox0 + cut + 1, ox1 - cut - 1) or dy == 1
            if rim:
                p[x, y] = OUTLINE
            elif inner_rim and dy < 3 or (inner_rim and x in (ox0 + 1, ox1 - 1)):
                p[x, y] = WOOD
            else:
                p[x, y] = EMBER if y >= oy1 - 2 else INSIDE
    return img


fire = Image.open(FIRE).convert('RGBA')
sheet = Image.new('RGBA', (W * FRAMES, H), CLEAR)
body = base()
for i in range(FRAMES):
    frame = body.copy()
    flame = fire.crop((i * 16, 0, i * 16 + 16, 16))
    # The flame fills the top 10 rows of its cell; stand its base on the floor of the opening.
    flame = flame.crop((0, 0, 16, 10))
    fp = flame.load()
    p = frame.load()
    for y in range(flame.height):
        for x in range(flame.width):
            c = fp[x, y]
            tx, ty = 8 + x, 30 + y
            if c[3] and p[tx, ty] in (INSIDE, EMBER):
                p[tx, ty] = c
    sheet.alpha_composite(frame, (i * W, 0))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
sheet.save(OUT)
print('wrote', os.path.normpath(OUT))
