"""Builds public/assets-halloween/ from public/assets/: same files, same sizes, Halloween colours.

    py scripts/tools/make-halloween.py

Only colours change (hue / saturation / brightness by colour family), nothing moves, so the
map code works untouched. Play it with  ?theme=halloween  in the address.
Characters, animals, sounds and fonts are copied as they are.
"""
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "assets"
DST = ROOT / "public" / "assets-halloween"

LEAFY = {"trees.png", "birch.png", "blossoms.png"}          # greens turn autumn orange
PINES = {"pines.png", "winter.png", "xmas-tree.png"}         # greens turn dark spooky teal
WATER = {"tiles/water.png"}
COPY_ONLY = ("characters/", "animals/", "audio/", "music/", "fonts/")


def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rr = m & (mx == r)
    gg = m & (mx == g) & ~rr
    bb = m & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6
    h[gg] = (b - r)[gg] / d[gg] + 2
    h[bb] = (r - g)[bb] / d[bb] + 4
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    return h * 60.0, s, mx


def hsv_to_rgb(h, s, v):
    h = (h % 360.0) / 60.0
    c = v * s
    x = c * (1 - np.abs(h % 2 - 1))
    z = np.zeros_like(h)
    idx = h.astype(int) % 6
    r = np.choose(idx, [c, x, z, z, x, c])
    g = np.choose(idx, [x, c, c, x, z, z])
    b = np.choose(idx, [z, z, x, c, c, x])
    m = v - c
    return np.stack([r + m, g + m, b + m], -1)


def grade(img, rel):
    name = Path(rel).name
    a = np.asarray(img.convert("RGBA")).astype(np.float64) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    grey = s < 0.12

    if rel in WATER:
        h = np.full_like(h, 255.0)
        s = np.clip(s * 1.1, 0, 1)
        v = v * 0.62
    else:
        green = (h >= 65) & (h <= 175) & ~grey
        teal = (h > 150) & (h <= 200) & ~grey
        sand = (h >= 22) & (h <= 52) & (s < 0.55) & ~grey & (v > 0.6)
        wood = (h >= 10) & (h < 45) & ~sand & ~grey
        pink = ((h >= 300) | (h < 10)) & ~grey & (s > 0.15)
        blue = (h > 200) & (h < 300) & ~grey

        if name in LEAFY:
            # autumn: lighter greens go orange, darker greens go burnt red-brown
            h = np.where(green, np.where(v > 0.55, 28.0, 14.0), h)
            s = np.where(green, np.clip(s * 1.15, 0, 1), s)
            v = np.where(green, v * 0.95, v)
        elif name in PINES:
            h = np.where(green, 170.0, h)
            s = np.where(green, s * 0.8, s)
            v = np.where(green, v * 0.55, v)
        else:
            # grass, bushes, plants, reeds: dusky moss
            h = np.where(green, 88.0, h)
            s = np.where(green, s * 0.70, s)
            v = np.where(green, v * 0.66, v)
        h = np.where(teal & (name not in LEAFY) & (name not in PINES), 255.0, h)  # ponds' lily water, tiny bits
        v = np.where(teal & (name not in LEAFY) & (name not in PINES), v * 0.62, v)
        # sand and dirt paths: dusty purple-brown
        if rel.startswith("tiles/"):
            h = np.where(sand, 285.0, h)
            s = np.where(sand, s * 0.40, s)
            v = np.where(sand, v * 0.62, v)
        else:
            v = np.where(sand, v * 0.78, v)
        # wood, fences, houses: darker, a little purple
        h = np.where(wood, h - 6, h)
        s = np.where(wood, s * 0.95, s)
        v = np.where(wood, v * 0.72, v)
        # roofs and blossoms: deep purple / pink
        h = np.where(pink, 290.0, h)
        v = np.where(pink, v * 0.82, v)
        v = np.where(blue, v * 0.8, v)
        # a general dusky tint for everything else that is coloured
        v = np.where(grey, v * 0.82, v)

    out = hsv_to_rgb(h, np.clip(s, 0, 1), np.clip(v, 0, 1))
    res = np.dstack([np.clip(out, 0, 1), alpha])
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), "RGBA")


def main():
    if DST.exists():
        shutil.rmtree(DST)
    done = copied = 0
    for f in sorted(SRC.rglob("*")):
        if f.is_dir():
            continue
        rel = f.relative_to(SRC).as_posix()
        out = DST / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        if f.suffix.lower() == ".png" and not rel.startswith(COPY_ONLY) and not rel.startswith("ui/"):
            img = Image.open(f)
            graded = grade(img, rel)
            assert graded.size == img.size
            graded.save(out)
            done += 1
        else:
            shutil.copy2(f, out)
            copied += 1
    print(f"graded {done} pictures, copied {copied} unchanged -> {DST}")


if __name__ == "__main__":
    main()
