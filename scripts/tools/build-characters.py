"""
Turns the high-resolution character pictures (Generated Characters/high-resolution-sources,
2048 x 768, 8 directions x 3 walking poses) into the game's walking sheets.

The big pictures are pixel art that was blown up about 9 times. This finds each of the 24
poses, shrinks it back to its real pixels, keeps the colours tidy (hard edges, 24 colours), and
lines the poses up so the feet always touch the bottom of a 32 x 32 cell and walking does not wobble.
Result: Generated Characters/game-ready-32/<name>-walk-8dir-3frame-256x96.png

    py scripts/tools/build-characters.py
    node scripts/sync-art.mjs        (copies them into public/assets)
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'Generated Characters')
SOURCES = os.path.join(ROOT, 'high-resolution-sources')
OUT = os.path.join(ROOT, 'game-ready-32')
PITCH = 256 / 28  # one real pixel is about 9.14 pixels in the big picture
CELL = 32
COLORS = 24


def find_poses(alpha):
    """The 24 pose boxes as [row][col] = (x0, y0, x1, y1)."""
    grown = ndimage.binary_dilation(alpha > 40, iterations=4)
    labels, count = ndimage.label(grown)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(labels)):
        area = int((labels[sl] == i + 1).sum())
        if area < 3000:
            continue
        # Shrink back to the real (undilated) sprite.
        sub = alpha[sl] > 40
        ys, xs = np.nonzero(sub & (labels[sl] == i + 1))
        boxes.append((sl[1].start + xs.min(), sl[0].start + ys.min(), sl[1].start + xs.max() + 1, sl[0].start + ys.max() + 1))
    if len(boxes) != 24:
        raise SystemExit(f'expected 24 poses, found {len(boxes)}')
    columns = {}
    for box in boxes:
        columns.setdefault(min(7, int(((box[0] + box[2]) / 2) // 256)), []).append(box)
    grid = [[None] * 8 for _ in range(3)]
    for col, items in columns.items():
        if len(items) != 3:
            raise SystemExit(f'column {col} has {len(items)} poses')
        for row, box in enumerate(sorted(items, key=lambda b: b[1])):
            grid[row][col] = box
    return grid


def convert(name):
    img = Image.open(os.path.join(SOURCES, f'{name}-2048x768.png')).convert('RGBA')
    grid = find_poses(np.array(img)[:, :, 3])
    sheet = Image.new('RGBA', (CELL * 8, CELL * 3), (0, 0, 0, 0))
    for col in range(8):
        boxes = [grid[r][col] for r in range(3)]
        base = max(b[3] for b in boxes)  # the lowest feet in this direction
        mid = sum((b[0] + b[2]) / 2 for b in boxes) / 3
        for row, (x0, y0, x1, y1) in enumerate(boxes):
            w = max(1, round((x1 - x0) / PITCH))
            h = max(1, round((y1 - y0) / PITCH))
            small = img.crop((x0, y0, x1, y1)).resize((w, h), Image.BOX)
            # Hard edges: a pixel is either there or not.
            a = small.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
            small.putalpha(a)
            px = CELL // 2 - w // 2 + round(((x0 + x1) / 2 - mid) / PITCH)
            py = CELL - h - round((base - y1) / PITCH)
            sheet.alpha_composite(small, (col * CELL + max(0, min(CELL - w, px)), row * CELL + max(0, py)))
    # Keep the colours tidy: one shared palette for the whole sheet.
    alpha = sheet.getchannel('A')
    palette = sheet.convert('RGB').quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    final = palette.convert('RGBA')
    final.putalpha(alpha)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}-walk-8dir-3frame-256x96.png')
    final.save(path)
    print('wrote', os.path.normpath(path))


if __name__ == '__main__':
    names = sys.argv[1:] or sorted(f[:-len('-2048x768.png')] for f in os.listdir(SOURCES) if f.endswith('-2048x768.png'))
    for n in names:
        convert(n)
