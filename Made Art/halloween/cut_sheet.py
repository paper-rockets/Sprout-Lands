"""Cuts a ChatGPT sheet into game-size pictures and makes a comparison picture.

    py "Made Art/halloween/cut_sheet.py" <sheet.png> <prefix> <width,width,...> [name,name,...]

Items are found left to right, top row first. Each is shrunk to the given width (height keeps
its shape), colours reduced to 14, hard edges, and a soft ground shadow added.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def items(path):
    im = np.array(Image.open(path).convert("RGBA")).astype(int)
    r, g, b, a = im[..., 0], im[..., 1], im[..., 2], im[..., 3]
    magenta = (r > 180) & (b > 150) & (g < 120) & (abs(r - b) < 90)
    fringe = ((r > 150) & (g < 110) & (b < 120) & (r - g > 90)) | ((b > 200) & (r < 120) & (g < 140))
    fg = ndimage.binary_opening((a > 160) & ~magenta & ~fringe, iterations=1)
    lab, _ = ndimage.label(ndimage.binary_dilation(fg, iterations=5))
    objs = [s for s in ndimage.find_objects(lab) if (s[1].stop - s[1].start) > 60]
    # group into rows: a new row starts when an item's top is below the previous row's bottom
    objs.sort(key=lambda s: s[0].start)
    rows, bottom = [], -1
    for s in objs:
        if s[0].start > bottom:
            rows.append([])
            bottom = -1
        rows[-1].append(s)
        bottom = max(bottom, s[0].stop)
    im[..., 3] = np.where(fg, 255, 0)
    out = []
    for row in rows:
        for s in sorted(row, key=lambda s: s[1].start):
            c, m = im[s[0], s[1]], fg[s[0], s[1]]
            ys, xs = np.where(m)
            out.append(c[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    return out


def shrink(c, w, shadow=True):
    h = round(c.shape[0] * w / c.shape[1])
    al = c[..., 3:4] / 255.0
    pm = np.concatenate([c[..., :3] * al, al * 255], -1).astype("uint8")
    S = np.array(Image.fromarray(pm).resize((w, h), Image.BOX)).astype(float)
    A = S[..., 3]
    rgb = np.clip(S[..., :3] / np.maximum(A[..., None] / 255, 1e-3), 0, 255)
    q = np.array(Image.fromarray(rgb.astype("uint8")).quantize(14, method=Image.Quantize.MEDIANCUT).convert("RGB"))
    body = Image.fromarray(np.dstack([q, np.where(A > 110, 255, 0)]).astype("uint8"))
    if not shadow:
        return body
    img = Image.new("RGBA", (w, h + 3))
    sw = int(w * 0.8)
    ImageDraw.Draw(img).ellipse(((w - sw) // 2, h - 5, (w + sw) // 2, h + 2), fill=(80, 110, 60, 70))
    img.alpha_composite(body, (0, 0))
    return img


def compare(pics, out, refs=()):
    grass = Image.open(ROOT / "public/assets/tiles/grass.png").convert("RGBA").crop((16, 16, 32, 32))
    allp = list(refs) + list(pics)
    W = sum(i.size[0] for i in allp) + 10 * len(allp) + 10
    H = max(i.size[1] for i in allp) + 20
    bg = Image.new("RGBA", (W, H))
    for y in range(0, H, 16):
        for x in range(0, W, 16):
            bg.paste(grass, (x, y))
    x = 10
    for i in allp:
        bg.alpha_composite(i, (x, H - 10 - i.size[1]))
        x += i.size[0] + 10
    bg.resize((W * 4, H * 4), Image.NEAREST).save(out)


if __name__ == "__main__":
    sheet, prefix = sys.argv[1], sys.argv[2]
    found = items(sheet)
    if sys.argv[3].startswith("scale="):  # one shrink factor for the whole sheet keeps relative sizes
        f = float(sys.argv[3][6:])
        widths = [max(4, round(c.shape[1] / f)) for c in found]
    else:
        widths = [int(v) for v in sys.argv[3].split(",")]
    names = sys.argv[4].split(",") if len(sys.argv) > 4 else [str(i + 1) for i in range(len(widths))]
    print(f"found {len(found)} items, expected {len(widths)}")
    pics = []
    for c, w, n in zip(found, widths, names):
        p = shrink(c, w)
        p.save(HERE / f"{prefix}-{n}.png")
        pics.append(p)
        print(n, p.size)
    T = Image.open(ROOT / "public/assets/objects/trees.png").convert("RGBA")
    H_ = Image.open(ROOT / "public/assets/objects/houses.png").convert("RGBA")
    compare(pics, HERE / f"{prefix}-at-game-size.png", refs=[H_.crop((64, 64, 128, 128)), T.crop((144, 48, 192, 96))])
