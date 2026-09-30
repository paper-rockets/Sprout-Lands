"""
Turns the sitting-cat pictures (Generated Characters/sources-sitting/<name>.png: 8 poses of one cat facing the
front, in 2 rows of 4, on a see-through background) into small picture strips for villagers who sit still.

Each strip is 8 frames of 32 x 32 in one row (256 x 32): frame 0 is the plain pose, the others are blinks,
winks and smiles. Every pose of one cat is shrunk by the same amount, hard-edged, on one shared palette, with
its bottom on the bottom row of the frame and centred like the plain pose, so blinking does not wobble.
Result: Generated Characters/game-ready-sitting/<name>-sit-8frame-256x32.png

    py scripts/tools/build-sitting-npcs.py [name ...]
    node scripts/sync-art.mjs        (copies them into public/assets)
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'Generated Characters')
SOURCES = os.path.join(ROOT, 'sources-sitting')
OUT = os.path.join(ROOT, 'game-ready-sitting')
CELL = 32
COLORS = 24
TARGET_H = 24  # the tallest pose of a cat becomes about this many pixels tall
MAX_W = 30


def find_poses(sheet):
    """The 8 poses in reading order, each (rgb, mask) cut out on its own so neighbours never bleed in."""
    rgba = np.array(sheet)
    solid = rgba[:, :, 3] >= 200
    # Poses can nearly touch, so pieces are not joined up first: the 8 biggest pieces are the cats, and every
    # small loose piece (a star, a sparkle, a puff of cloud) goes to the cat whose middle is nearest.
    labels, count = ndimage.label(solid)
    sizes = ndimage.sum(solid, labels, range(1, count + 1))
    centres = ndimage.center_of_mass(solid, labels, range(1, count + 1))
    big = list(np.argsort(sizes)[::-1][:8] + 1)
    if len(big) < 8 or sizes[big[-1] - 1] < 1500:
        raise SystemExit('expected 8 poses')
    owner = np.zeros(count + 1, int)
    for lab in range(1, count + 1):
        cy, cx = centres[lab - 1]
        owner[lab] = min(big, key=lambda b: (centres[b - 1][0] - cy) ** 2 + (centres[b - 1][1] - cx) ** 2)
    whole = owner[labels] * solid
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    filled = rgba[:, :, :3][iy, ix]
    found = []
    for b in big:
        ys, xs = np.nonzero(whole == b)
        sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        found.append((centres[b - 1][0], centres[b - 1][1], filled[sl], whole[sl] == b))
    found.sort(key=lambda f: f[0])
    rows = [sorted(found[:4], key=lambda f: f[1]), sorted(found[4:], key=lambda f: f[1])]
    return [(f[2], f[3]) for row in rows for f in row]


def convert(name):
    sheet = Image.open(os.path.join(SOURCES, f'{name}.png')).convert('RGBA')
    poses = find_poses(sheet)
    boxes = []
    for _, mask in poses:
        ys, xs = np.nonzero(mask)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    scale = min(TARGET_H / max(b[3] - b[1] for b in boxes), MAX_W / max(b[2] - b[0] for b in boxes))

    out = Image.new('RGBA', (CELL * 8, CELL), (0, 0, 0, 0))
    for i, ((rgb, mask), (x0, y0, x1, y1)) in enumerate(zip(poses, boxes)):
        w = max(1, round((x1 - x0) * scale))
        h = max(1, round((y1 - y0) * scale))
        color = Image.fromarray(rgb[y0:y1, x0:x1]).resize((w, h), Image.BOX).convert('RGBA')
        alpha = Image.fromarray((mask[y0:y1, x0:x1] * 255).astype(np.uint8)).resize((w, h), Image.BOX).point(lambda v: 255 if v >= 128 else 0)
        color.putalpha(alpha)
        px = max(0, min(CELL - w, CELL // 2 - w // 2))
        out.alpha_composite(color, (i * CELL + px, CELL - h))

    alpha = out.getchannel('A')
    flat = out.convert('RGB').quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    flat.putalpha(alpha)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}-sit-8frame-256x32.png')
    flat.save(path)
    print(f'  {name}: scale {scale:.3f} -> {os.path.normpath(path)}')


if __name__ == '__main__':
    names = sys.argv[1:] or sorted(f[:-4] for f in os.listdir(SOURCES) if f.endswith('.png'))
    for n in names:
        convert(n)
