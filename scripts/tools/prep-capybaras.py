"""
Cuts the user's 5-capybara picture (2026-09-29) into one picture per capybara, laid out the way
build-characters-4dir.py wants: 4 rows (front, left, right, back) x 8 poses on a see-through background.

The source has the capybaras in different grids:
  plain, scarf           top half, 4 rows (front, left, right, back) x 7 poses
  nightcap               bottom left, 3 rows (front, left, back) x 6 poses; its last two rows touch
  straw hat, explorer    bottom middle / right, 3 rows (front, left, back) x 5 poses
A missing right row is the left row mirrored. The last pose of each front row is a smile, which goes in
column 7 (like the other friends' sheets); missing columns repeat the standing pose, so the builder's
"two most different poses" are always real leg steps.

    py scripts/tools/prep-capybaras.py "<the picture>.png"
    py scripts/tools/build-characters-4dir.py capy-plain capy-scarf capy-nightcap capy-strawhat capy-explorer
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'Generated Characters', 'sources-4dir')
CELL = 220

# name: (x0, x1, y0, y1) of its part of the picture, and how many poses per row
BLOCKS = {
    'capy-plain': ((0, 880, 0, 450), 7),
    'capy-scarf': ((880, 1774, 0, 450), 7),
    'capy-nightcap': ((0, 610, 450, 887), 6),
    'capy-strawhat': ((610, 1170, 450, 887), 5),
    'capy-explorer': ((1170, 1774, 450, 887), 5),
}


def rows_of(rgba, box, per_row):
    """The poses of one block as rows of pictures, left to right. Touching poses are cut at the gaps
    between the column centres of the block's widest clean row."""
    x0, x1, y0, y1 = box
    part = rgba[y0:y1, x0:x1]
    solid = part[:, :, 3] >= 200
    labels, count = ndimage.label(solid)
    sizes = ndimage.sum(solid, labels, range(1, count + 1))
    boxes = [(sl, i + 1) for i, sl in enumerate(ndimage.find_objects(labels)) if sizes[i] >= 3000]
    # group into rows by their top edge
    boxes.sort(key=lambda b: b[0][0].start)
    rows = []
    for sl, lab in boxes:
        if rows and abs(sl[0].start - rows[-1][0][0][0].start) < 40:
            rows[-1].append((sl, lab))
        else:
            rows.append([(sl, lab)])
    clean = next(r for r in rows if len(r) == per_row)
    centres = sorted((sl[1].start + sl[1].stop) / 2 for sl, _ in clean)
    cuts = [0] + [(a + b) / 2 for a, b in zip(centres, centres[1:])] + [part.shape[1]]
    out = []
    for row in rows:
        top = min(sl[0].start for sl, _ in row)
        bottom = max(sl[0].stop for sl, _ in row)
        mask = np.isin(labels, [lab for _, lab in row])
        if len(row) < per_row:
            # touching poses: move each cut to the thinnest column nearby, where the poses only just touch
            cols = mask[top:bottom].sum(axis=0)
            cuts = [0] + [int(c) - 30 + int(np.argmin(cols[int(c) - 30:int(c) + 30])) for c in cuts[1:-1]] + [part.shape[1]]
        pics = []
        for c in range(per_row):
            a, b = int(cuts[c]), int(cuts[c + 1])
            m = mask[top:bottom, a:b]
            ys, xs = np.nonzero(m)
            pic = part[top:bottom, a:b].copy()
            pic[~m] = 0
            pics.append(Image.fromarray(pic[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
        out.append(pics)
    return out


def main(src):
    rgba = np.array(Image.open(src).convert('RGBA'))
    for name, (box, per_row) in BLOCKS.items():
        rows = rows_of(rgba, box, per_row)
        if len(rows) == 3:  # front, left, back: the right row is the left row mirrored
            rows = [rows[0], rows[1], [p.transpose(Image.FLIP_LEFT_RIGHT) for p in rows[1]], rows[2]]
        if len(rows) != 4 or any(len(r) != per_row for r in rows):
            raise SystemExit(f'{name}: expected 4 rows of {per_row}, got {[len(r) for r in rows]}')
        sheet = Image.new('RGBA', (CELL * 8, CELL * 4), (0, 0, 0, 0))
        for r, pics in enumerate(rows):
            # columns 0..n-2 are the poses, column 7 the last one (the smile), the rest repeat the standing pose
            cols = pics[:-1] + [pics[0]] * (7 - (len(pics) - 1)) + [pics[-1]]
            for c, p in enumerate(cols):
                sheet.alpha_composite(p, (c * CELL + (CELL - p.width) // 2, r * CELL + CELL - 10 - p.height))
        path = os.path.join(OUT, f'{name}.png')
        sheet.save(path)
        print('wrote', os.path.normpath(path))


if __name__ == '__main__':
    main(sys.argv[1])
