"""Builds a labelled contact sheet of many pictures, so a whole folder can be judged at a glance.

    py contact.py groups.json out.png [max_width]

groups.json is a list of groups:
    [{"title": "Animals", "root": "C:/path/to/folder", "cell": [200, 150], "files": ["a.png", "b.png"]}]
Each picture is scaled up by a whole number (nearest neighbour) so it fits its cell,
or scaled down when it is bigger than the cell. A grey background shows transparency.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

groups = json.load(open(sys.argv[1], encoding='utf-8'))
out_path = sys.argv[2]
max_w = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
font = ImageFont.load_default()
BG = (104, 118, 132)
PAD = 6


def fit(im, cw, ch):
    w, h = im.size
    if w <= cw and h <= ch:
        s = max(1, min(cw // w, ch // h))
        return im.resize((w * s, h * s), Image.NEAREST)
    s = min(cw / w, ch / h)
    return im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.NEAREST)


sections = []
for g in groups:
    cw, ch = g.get('cell', [160, 120])
    cells = []
    for f in g['files']:
        path = os.path.join(g['root'], f)
        try:
            im = Image.open(path).convert('RGBA')
        except Exception as e:  # noqa: BLE001
            print('cannot open', path, e)
            continue
        pic = fit(im, cw, ch)
        cell = Image.new('RGBA', (cw + PAD, ch + 22), BG + (255,))
        cell.alpha_composite(pic, ((cw - pic.width) // 2 + PAD // 2, (ch - pic.height) // 2))
        d = ImageDraw.Draw(cell)
        label = os.path.splitext(os.path.basename(f))[0][:34]
        d.text((3, ch + 4), f'{label} {im.width}x{im.height}', fill=(255, 255, 255, 255), font=font)
        cells.append(cell)
    # lay out cells in rows
    x = y = rowh = 0
    placed = []
    for c in cells:
        if x + c.width > max_w:
            x = 0
            y += rowh + 4
            rowh = 0
        placed.append((c, x, y))
        x += c.width + 4
        rowh = max(rowh, c.height)
    height = y + rowh
    body = Image.new('RGBA', (max_w, height + 20), (40, 44, 52, 255))
    ImageDraw.Draw(body).text((4, 3), g['title'], fill=(255, 235, 120, 255), font=font)
    for c, cx, cy in placed:
        body.alpha_composite(c, (cx, cy + 16))
    sections.append(body)

total = sum(s.height + 6 for s in sections)
sheet = Image.new('RGBA', (max_w, total), (30, 30, 34, 255))
y = 0
for s in sections:
    sheet.alpha_composite(s, (0, y))
    y += s.height + 6
sheet.convert('RGB').save(out_path, quality=90)
print('saved', out_path, sheet.size)
