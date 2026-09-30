"""
Turns the 4-direction character pictures (Generated Characters/sources-4dir, 4 rows x 8 columns:
front, left, right, back, each with 8 poses) into the game's walking sheets.

The game wants 8 directions x 3 poses in 32 x 32 cells. So:
  - the four diagonals borrow the left / right pictures (moving up-left shows the left picture, and so on);
  - the 3 poses are the standing pose plus the two poses that differ most from it (the leg steps);
  - every picture of one character is shrunk by the same amount, hard-edged, on one shared palette;
  - the feet always touch the bottom row of the cell, so walking does not wobble.
Result: Generated Characters/game-ready-4dir/<name>-walk-8dir-3frame-256x96.png

    py scripts/tools/build-characters-4dir.py [name ...]
    node scripts/sync-art.mjs        (copies them into public/assets)
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'Generated Characters')
SOURCES = os.path.join(ROOT, 'sources-4dir')
NATIVE = os.path.join(ROOT, 'sources-v2')  # pictures that are exact pixel art blown up 8 times: copied pixel for pixel
OUT = os.path.join(ROOT, 'game-ready-4dir')
CELL = 32
COLORS = 24
TARGET_H = 25  # the tallest picture of a character becomes about this many pixels tall
MAX_W = 30
# Game direction columns: back, back-left, left, front-left, front, front-right, right, back-right.
# Source rows: 0 front, 1 left, 2 right, 3 back.
COLUMN_ROW = [3, 1, 1, 1, 0, 2, 2, 2]
# Characters whose faces are tiny dark dots on a light body get "dark priority" when shrunk: an output pixel
# becomes dark when at least this share of its source block is dark, so eyes and whiskers survive.
DARK_PRIORITY = {'tabby-cat': 0.22}
WALK_CANDIDATES = [2, 3, 4, 5, 6]  # column 1 is a wink and column 7 a smile, not steps


def find_pictures(sheet):
    """The 32 pictures as cells[row][col] = (rgb, mask, box), each cut out on its own so neighbours never bleed in."""
    rgba = np.array(sheet)
    H, W = rgba.shape[:2]
    solid = rgba[:, :, 3] >= 200  # drops the faint dirty halo around each picture
    labels, count = ndimage.label(ndimage.binary_dilation(solid, iterations=1))
    # Fill the colours under the removed halo with the nearest solid colour, so shrinking does not smear red or yellow.
    _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
    filled = rgba[:, :, :3][iy, ix]
    cells = [[None] * 8 for _ in range(4)]
    for i, sl in enumerate(ndimage.find_objects(labels)):
        mask = solid[sl] & (labels[sl] == i + 1)
        if mask.sum() < 3000:  # specks
            continue
        ys, xs = np.nonzero(mask)
        cx, cy = sl[1].start + xs.mean(), sl[0].start + ys.mean()
        row, col = min(3, int(cy // (H / 4))), min(7, int(cx // (W / 8)))
        if cells[row][col] is not None:
            raise SystemExit(f'two pictures in row {row}, column {col}')
        cells[row][col] = (filled[sl], mask, (0, 0, mask.shape[1], mask.shape[0]))
    missing = [(r, c) for r in range(4) for c in range(8) if cells[r][c] is None]
    if missing:
        raise SystemExit(f'missing pictures: {missing}')
    return cells


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def convert(name):
    sheet = Image.open(os.path.join(SOURCES, f'{name}.png')).convert('RGBA')
    cells = find_pictures(sheet)
    boxes = [[cells[r][c][2] for c in range(8)] for r in range(4)]
    max_h = max(b[3] - b[1] for row in boxes for b in row)
    max_w = max(b[2] - b[0] for row in boxes for b in row)
    scale = min(TARGET_H / max_h, MAX_W / max_w)

    def shrink(r, c):
        rgb, mask, _ = cells[r][c]
        x0, y0, x1, y1 = boxes[r][c]
        w = max(1, round((x1 - x0) * scale))
        h = max(1, round((y1 - y0) * scale))
        block = rgb[y0:y1, x0:x1]
        color = Image.fromarray(block).resize((w, h), Image.BOX)
        share = DARK_PRIORITY.get(name)
        if share:
            lum = block.astype(float) @ [0.299, 0.587, 0.114]
            dark = lum < 105
            frac = np.array(Image.fromarray((dark * 255).astype(np.uint8)).resize((w, h), Image.BOX)) / 255.0
            dark_rgb = np.array(Image.fromarray(np.where(dark[:, :, None], block, 0).astype(np.uint8)).resize((w, h), Image.BOX)).astype(float)
            dark_rgb = dark_rgb / np.maximum(frac[:, :, None], 1e-6)
            merged = np.array(color).astype(float)
            pick = frac >= share
            merged[pick] = dark_rgb[pick]
            color = Image.fromarray(np.clip(merged, 0, 255).astype(np.uint8))
        alpha = Image.fromarray((mask[y0:y1, x0:x1] * 255).astype(np.uint8)).resize((w, h), Image.BOX).point(lambda v: 255 if v >= 128 else 0)
        out = color.convert('RGBA')
        out.putalpha(alpha)
        return out

    # For each source row, choose the standing pose (column 0) and the two most different step poses.
    chosen = {}
    for r in range(4):
        base = np.array(shrink(r, 0).getchannel('A')) > 0
        scored = []
        for c in WALK_CANDIDATES:
            other = np.array(shrink(r, c).getchannel('A')) > 0
            h = min(base.shape[0], other.shape[0])
            w = min(base.shape[1], other.shape[1])
            scored.append((int((base[-h:, :w] ^ other[-h:, :w]).sum()), c))
        scored.sort(reverse=True)
        steps = sorted(c for _, c in scored[:2])
        chosen[r] = [steps[0], 0, steps[1]]
    print(f'  {name}: scale {scale:.3f}, poses per row {chosen}')

    out = Image.new('RGBA', (CELL * 8, CELL * 3), (0, 0, 0, 0))
    for col in range(8):
        r = COLUMN_ROW[col]
        cols = chosen[r]
        bs = [boxes[r][c] for c in cols]
        base_y = max(b[3] for b in bs)
        mid_x = sum((b[0] + b[2]) / 2 for b in bs) / 3
        for pose, c in enumerate(cols):
            small = shrink(r, c)
            x0, y0, x1, y1 = boxes[r][c]
            w, h = small.size
            px = CELL // 2 - w // 2 + round((((x0 + x1) / 2) - mid_x) * scale)
            py = CELL - h - round((base_y - y1) * scale)
            out.alpha_composite(small, (col * CELL + max(0, min(CELL - w, px)), pose * CELL + max(0, py)))

    alpha = out.getchannel('A')
    palette = out.convert('RGB').quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    palette.putalpha(alpha)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}-walk-8dir-3frame-256x96.png')
    palette.save(path)
    print('  wrote', os.path.normpath(path))


NATIVE_SCALE = 8


def block_pick(inner, body):
    """One output pixel from a block of the big picture. Outline, eyes, mouth and blush are thin, so a colour
    that differs from the body colour wins when it fills a quarter of the block; otherwise the common colour."""
    if len(inner) == 0:
        return (0, 0, 0, 0)
    if (inner[:, 3] < 128).mean() > 0.5:
        # Mostly see-through: keep a faint shadow if there is one, otherwise nothing.
        return (0, 0, 0, 0) if inner[:, 3].max() < 24 else tuple(int(v) for v in np.median(inner, axis=0))
    solid = inner[inner[:, 3] >= 128]
    keys, inverse, counts = np.unique((solid[:, :3] // 24).astype(int), axis=0, return_inverse=True, return_counts=True)
    share = counts / len(solid)
    dist = np.abs(keys * 24 - body).sum(axis=1)
    order = [k for k in np.argsort(-dist) if share[k] >= 0.16 and dist[k] > 90]
    pick = order[0] if order else int(counts.argmax())
    members = solid[inverse.reshape(-1) == pick]
    color = np.median(members[:, :3], axis=0)
    return (int(color[0]), int(color[1]), int(color[2]), 255)


def solid_box(rgba, rect):
    cx0, cy0, cx1, cy1 = rect
    ys, xs = np.nonzero(rgba[cy0:cy1, cx0:cx1, 3] >= 200)
    if len(xs) < 200:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def sample_picture(rgba, rect, step):
    """One picture cut out of the big sheet and shrunk to its real pixels. Each output pixel covers `step` big pixels.
    The picture's own top-left corner anchors the grid, because its outline always starts on a pixel edge."""
    cx0, cy0, cx1, cy1 = rect
    sub = rgba[cy0:cy1, cx0:cx1]
    X0, Y0, X1, Y1 = solid_box(rgba, rect)
    nw = max(1, round((X1 - X0) / step))
    nh = max(1, round((Y1 - Y0) / step))
    sx, sy = (X1 - X0) / nw, (Y1 - Y0) / nh
    inside = sub[Y0:Y1, X0:X1].reshape(-1, 4)
    inside = inside[inside[:, 3] >= 200]
    kk, cc = np.unique((inside[:, :3] // 24).astype(int), axis=0, return_counts=True)
    body = kk[cc.argmax()] * 24
    # Grid columns / rows that cover the whole cell (so the soft shadow under the feet is kept too).
    i0, i1 = -int(np.ceil(X0 / sx)), int(np.ceil((sub.shape[1] - X0) / sx))
    j0, j1 = -int(np.ceil(Y0 / sy)), int(np.ceil((sub.shape[0] - Y0) / sy))
    pic = np.zeros((j1 - j0, i1 - i0, 4), np.uint8)
    for j in range(j0, j1):
        for i in range(i0, i1):
            bx0, by0 = X0 + i * sx, Y0 + j * sy
            block = sub[max(0, int(round(by0))):max(0, int(round(by0 + sy))), max(0, int(round(bx0))):max(0, int(round(bx0 + sx)))].reshape(-1, 4)
            pic[j - j0, i - i0] = block_pick(block, body)
    mask = pic[:, :, 3] >= 200
    ys, xs = np.nonzero(mask)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    keep = np.nonzero(pic[:, :, 3] > 0)
    tight = (keep[1].min(), keep[0].min(), keep[1].max() + 1, keep[0].max() + 1)
    return pic[tight[1]:tight[3], tight[0]:tight[2]], (box[0] - tight[0], box[1] - tight[1], box[2] - tight[0], box[3] - tight[1])


PALETTE_COLORS = 14
KEEP_DISTINCT = 42  # a colour this far from every palette colour is a real feature (blue eyes, blush), not noise


def flatten_colours(frames):
    """The source pictures have a little noise in every colour. Snap all solid pixels of a character to one small
    shared palette so each colour is perfectly flat and every edge is crisp. Soft shadow pixels are left alone."""
    solid = np.concatenate([pic[pic[:, :, 3] >= 200][:, :3] for pic, _ in frames.values()])
    strip = Image.fromarray(solid.reshape(1, -1, 3).astype(np.uint8), 'RGB')
    quant = strip.quantize(colors=PALETTE_COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    palette = np.array(quant.getpalette()[:PALETTE_COLORS * 3]).reshape(-1, 3)
    out = {}
    for key, (pic, box) in frames.items():
        pic = pic.copy()
        mask = pic[:, :, 3] >= 200
        if mask.any():
            colours = pic[mask][:, :3].astype(int)
            dist = np.sqrt(((colours[:, None, :] - palette[None, :, :]) ** 2).sum(axis=2))
            nearest = dist.argmin(axis=1)
            snapped = np.where((dist.min(axis=1) > KEEP_DISTINCT)[:, None], colours, palette[nearest])
            pic[mask, :3] = snapped
        out[key] = (pic, box)
    return out


def convert_native(name):
    """Sheets that are clean pixel art drawn about 8 times too big: rebuild each picture's real pixels, nothing else."""
    sheet = np.array(Image.open(os.path.join(NATIVE, f'{name}.png')).convert('RGBA'))
    H, W = sheet.shape[:2]
    frames = {}
    rects = {(r, c): (int(c * W / 8), int(r * H / 4), int((c + 1) * W / 8), int((r + 1) * H / 4)) for r in range(4) for c in range(8)}
    widest = max((solid_box(sheet, rc)[2] - solid_box(sheet, rc)[0]) for rc in rects.values() if solid_box(sheet, rc))
    step = max(NATIVE_SCALE, widest / (CELL - 4))  # big pictures are shrunk a little more so they fit their 32-pixel cell
    for r in range(4):
        for c in range(8):
            rect = rects[(r, c)]
            got = sample_picture(sheet, rect, step)
            if got is None:
                raise SystemExit(f'{name}: nothing in row {r}, column {c}')
            frames[(r, c)] = got  # (pixels, solid box inside the pixels)
    frames = flatten_colours(frames)
    shadow_room = max(pic.shape[0] - box[3] for pic, box in frames.values())
    chosen = {}
    for r in range(4):
        base = np.zeros((CELL * 2, CELL * 2), bool)

        def solid_of(c):
            pic, box = frames[(r, c)]
            m = np.zeros((CELL * 2, CELL * 2), bool)
            part = pic[box[1]:box[3], box[0]:box[2], 3] >= 200
            h, w = part.shape
            m[CELL * 2 - h:, CELL - w // 2:CELL - w // 2 + w] = part[:CELL * 2, :]
            return m
        base = solid_of(0)
        scored = sorted(((int((base ^ solid_of(c)).sum()), c) for c in [1, 2, 3, 4, 5]), reverse=True)
        steps = sorted(c for _, c in scored[:2])
        chosen[r] = [steps[0], 0, steps[1]]
    print(f'  {name} (real pixels, {step:.1f} big pixels each): poses per row {chosen}, shadow room {shadow_room}px')

    out = Image.new('RGBA', (CELL * 8, CELL * 3), (0, 0, 0, 0))
    for col in range(8):
        r = COLUMN_ROW[col]
        cols = chosen[r]
        widths = [frames[(r, c)][1][2] - frames[(r, c)][1][0] for c in cols]
        for pose, c in enumerate(cols):
            pic, box = frames[(r, c)]
            h, w = pic.shape[:2]
            # Every pose of a direction shares one centre line and one feet line, so walking does not wobble.
            centre = (box[0] + box[2]) / 2
            left = CELL // 2 - round(centre)
            top = CELL - shadow_room - box[3]
            cell_x = col * CELL + max(0, min(CELL - w, left))
            out.alpha_composite(Image.fromarray(pic, 'RGBA'), (cell_x, pose * CELL + max(0, top)))
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f'{name}-walk-8dir-3frame-256x96.png')
    out.save(path)
    print('  wrote', os.path.normpath(path))


if __name__ == '__main__':
    native_names = sorted(f[:-4] for f in os.listdir(NATIVE) if f.endswith('.png')) if os.path.isdir(NATIVE) else []
    names = sys.argv[1:] or sorted(f[:-4] for f in os.listdir(SOURCES) if f.endswith('.png'))
    for n in names:
        if n in native_names:
            convert_native(n)
        else:
            convert(n)
