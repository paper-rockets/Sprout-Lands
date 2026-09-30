"""Makes the pictures for the Halloween area (Pumpkin Hollow) and lists them in art.json.

    py scripts/tools/make-halloween-art.py        then   node scripts/sync-art.mjs

1. The ChatGPT pieces in "Made Art/halloween/" (cut to game size by its cut_sheet.py):
   - the thin pink/magenta rim left by the sheet's magenta background is recoloured from the piece's own
     neighbouring pixels (sparkles on the wisps turn pale instead), stray specks are removed;
   - animation frames go on one strip each: same cell size, lined up on the same spot (feet at the
     bottom for things that stand, the middle for things that float), one steady shadow per strip;
   - still pictures are packed into three sheets (buildings, nature, decorations).
   Out: "Made Art/halloween-game/"  (ChatGPT art made for this game: pack "halloween-art")
2. The game's own Sprout Lands pictures recoloured for the area (same layout, so the map code draws
   them unchanged): grass, darker grass, soil and paths, hedges, autumn trees; plus the purple iron
   fence (fence-iron-purple.png, the game's fences.png recoloured).
   Out: "Made Art/halloween-tiles/"  (derived from Cup Nooble's art: pack "made-art")
3. Lists everything in art.json (through artjson.py: textures, tilesets, objects, animations, creatures)
   and in assets.catalog.json. Everything it adds starts with "hw" (Halloween), so running it again
   replaces its own entries and nothing else.
"""
import importlib.util
import json
import os
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "Made Art" / "halloween"
OUT_GAME = ROOT / "Made Art" / "halloween-game"
OUT_TILES = ROOT / "Made Art" / "halloween-tiles"
PUBLIC = "assets/halloween"
CATALOG = ROOT / "src" / "content" / "starter-adventure" / "assets.catalog.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from artjson import load as load_art, save as save_art  # noqa: E402

_spec = importlib.util.spec_from_file_location("make_halloween", Path(__file__).resolve().parent / "make-halloween.py")
_mh = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mh)
rgb_to_hsv, hsv_to_rgb = _mh.rgb_to_hsv, _mh.hsv_to_rgb


# ---- 1. cleaning the ChatGPT pieces ------------------------------------------------------------------
# The sheets were drawn on magenta, and ChatGPT's outlines picked up that colour: at game size the outer ring
# of each piece is a thin pink / plum rim. Each rim pixel gets a darker shade of the colour just inside it
# (brown wood gets a dark brown edge, a white ghost a soft grey-lilac one), so the outline stays but the pink
# goes. Purple things (the witch's hat, a roof) keep a purple edge, because the colour inside them is purple.
def magenta_score(rgb):
    """How pink-magenta a colour is: high when red and blue are both well above green and close to each other."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return np.minimum(r, b) - g - 0.5 * np.abs(r - b)


def hsv(rgb):
    h, s, v = rgb_to_hsv(rgb / 255.0)
    return h, s, v


def rings(body):
    """Ring 1 = picture pixels touching the outside; ring 2 = the pixels just inside ring 1."""
    def edge_of(mask):
        p = np.pad(mask, 1)
        return mask & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    r1 = edge_of(body)
    r2 = edge_of(body & ~r1)
    return r1, r2


def nearest(allowed, y, x, limit=3):
    """The nearest pixel in `allowed`, walking through the picture (breadth-first); None if none is close."""
    H, W = allowed.shape
    seen, todo = {(y, x)}, deque([(y, x, 0)])
    while todo:
        cy, cx, d = todo.popleft()
        if (cy, cx) != (y, x) and allowed[cy, cx]:
            return cy, cx
        if d >= limit:
            continue
        for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1), (cy + 1, cx + 1), (cy - 1, cx - 1), (cy + 1, cx - 1), (cy - 1, cx + 1)):
            if 0 <= ny < H and 0 <= nx < W and (ny, nx) not in seen:
                seen.add((ny, nx))
                todo.append((ny, nx, d + 1))
    return None


def clean(path, sparkly=False, specks=True):
    """A piece without its pink rim, as an RGBA uint8 array. Opaque pixels (alpha 255) are the picture; the
    soft see-through ground shadow cut_sheet.py added stays. sparkly: the wisps, whose loose sparkles turn
    pale lilac instead of dark."""
    a = np.array(Image.open(path).convert("RGBA")).astype(int)
    body = a[..., 3] == 255
    rgb = a[..., :3].astype(float)
    h, s, v = hsv(rgb)
    pink = body & (((h >= 275) & (h <= 350) & (s > 0.28)) | ((h >= 250) & (h < 275) & (s > 0.6)))
    r1, r2 = rings(body)
    # ring 2 only where it is a strong pink (the rim is sometimes two pixels thick)
    rim = (r1 & pink) | (r2 & pink & (magenta_score(rgb) > 55))
    rim |= body & (magenta_score(rgb) > 110) & (s > 0.75)  # a hot-pink pixel anywhere (a crow's foot)
    inside = body & ~rim & ~r1
    out = a.copy()
    for y, x in zip(*np.where(rim)):
        n = nearest(inside, y, x)
        if n is None:
            n = nearest(body & ~rim, y, x)
        if sparkly:
            out[y, x, :3] = rgb[n] if n is not None and v[n] > 0.75 else (244, 232, 255)
            continue
        if n is None:
            hh, ss, vv = h[y, x], s[y, x] * 0.35, v[y, x] * 0.7  # a thin bit with nothing inside it: just calmer
        else:
            hh, ss, vv = h[n], min(1.0, s[n] * 1.05), v[n] * (0.62 if v[n] > 0.35 else 0.85)
            if s[n] < 0.12:
                hh, ss = 270.0, 0.18  # a white or grey inside (the ghost): a soft lilac-grey edge
        out[y, x, :3] = np.clip(hsv_to_rgb(np.array(hh), np.array(ss), np.array(vv)) * 255, 0, 255)
    if specks and not sparkly:
        # tiny bits that are not joined to the picture (left over from the cut) go
        solid = out[..., 3] == 255
        lab, n = ndimage.label(solid, structure=np.ones((3, 3)))
        if n > 1:
            sizes = ndimage.sum(solid, lab, range(1, n + 1))
            for i, sz in enumerate(sizes, 1):
                if sz < 4:
                    out[lab == i, 3] = 0
    return out.astype(np.uint8)


def body_only(a):
    """The picture without its soft ground shadow (the shadow pixels are the see-through ones)."""
    b = a.copy()
    b[b[..., 3] < 255, 3] = 0
    return b


def bbox(a):
    ys, xs = np.where(a[..., 3] > 0)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def shadow_img(w, h, sw):
    """cut_sheet.py's soft shadow: a flat ellipse in a dark green, mostly see-through."""
    img = Image.new("RGBA", (w, h))
    ImageDraw.Draw(img).ellipse(((w - sw) // 2, h - 5, (w + sw) // 2, h - 1), fill=(80, 110, 60, 70))
    return img


def strip(files, anchor, shadow, pad=1, sparkly=False):
    """Frames lined up on one strip. anchor 'feet': bottom middle of each picture on the same spot;
    'middle': the middle of each picture on the same spot. shadow: one steady shadow for the whole strip."""
    bodies = []
    for f in files:
        b = body_only(clean(SRC / f, sparkly=sparkly))
        x0, y0, x1, y1 = bbox(b)
        bodies.append(b[y0:y1, x0:x1])
    bw = max(b.shape[1] for b in bodies)
    bh = max(b.shape[0] for b in bodies)
    sh = 3 if shadow else 0
    cw, ch = bw + 2 * pad, bh + pad + sh + (pad if anchor == "middle" else 0)
    sheet = Image.new("RGBA", (cw * len(bodies), ch))
    for i, b in enumerate(bodies):
        cell = Image.new("RGBA", (cw, ch))
        if shadow:
            cell.alpha_composite(shadow_img(cw, ch, int(bw * 0.8)))
        h, w = b.shape[:2]
        x = (cw - w) // 2
        y = ch - sh - h if anchor == "feet" else pad + (bh - h) // 2
        cell.alpha_composite(Image.fromarray(b), (x, y))
        sheet.paste(cell, (i * cw, 0))
    return sheet, (cw, ch)


def pack(pieces, width):
    """Shelf-pack pictures into one sheet (1 px apart). Returns the sheet and {name: [x, y, w, h]}."""
    order = sorted(pieces.items(), key=lambda kv: -kv[1].size[1])
    x = y = rowh = 0
    spots = {}
    for name, im in order:
        w, h = im.size
        if x + w > width:
            x, y, rowh = 0, y + rowh + 1, 0
        spots[name] = (x, y)
        x += w + 1
        rowh = max(rowh, h)
    sheet = Image.new("RGBA", (width, y + rowh))
    rects = {}
    for name, im in pieces.items():
        sx, sy = spots[name]
        sheet.alpha_composite(im, (sx, sy))
        rects[name] = [sx, sy, im.size[0], im.size[1]]
    return sheet, rects


def still(f, **kw):
    a = clean(SRC / f, **kw)
    x0, y0, x1, y1 = bbox(a)
    return Image.fromarray(a[y0:y1, x0:x1])


# ---- 2. recolouring the game's own tiles --------------------------------------------------------------
def grade(img, kind):
    """Autumn-night colours for one of the game's pictures (same size, only colours change)."""
    a = np.asarray(img.convert("RGBA")).astype(np.float64) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    h, s, v = rgb_to_hsv(rgb)
    grey = s < 0.12
    green = (h >= 60) & (h <= 180) & ~grey
    sand = (h >= 15) & (h < 60) & ~grey
    if kind == "grass":
        # deep mossy olive, a touch warmer in the light blades
        h = np.where(green, np.where(v > 0.8, 64.0, 76.0), h)
        s = np.where(green, np.clip(s * 1.0, 0, 1), s)
        v = np.where(green, v * 0.72, v)
        h = np.where(sand, h - 4, h)
        v = np.where(sand, v * 0.74, v)
    elif kind == "hedge":
        # plum bushes, like the purple bushes in the ChatGPT art
        # keep the bright leaf tips bright so the bush has a shape, darken only the hollows
        t = np.clip((v - 0.45) / 0.45, 0, 1)
        # the plain forest-mass tile is one flat colour: give it leaf clumps (same 16x16 pattern on
        # every tile, so edges still join up); light clump on top, a darker hollow under it
        flat = green & (np.abs(rgb[..., 0] - 130 / 255) < 0.01) & (np.abs(rgb[..., 1] - 168 / 255) < 0.01)
        yy, xx = np.mgrid[0:v.shape[0], 0:v.shape[1]]
        lit = np.zeros(v.shape, bool)
        hollow = np.zeros(v.shape, bool)
        for cx, cy in [(2, 2), (9, 1), (13, 6), (5, 8), (11, 11), (1, 13), (7, 14)]:
            for dx, dy in [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1)]:
                lit |= (xx % 16 == (cx + dx) % 16) & (yy % 16 == (cy + dy) % 16)
            for dx in (0, 1, 2, 3):
                hollow |= (xx % 16 == (cx + dx) % 16) & (yy % 16 == (cy + 2) % 16)
        v = np.where(flat & lit, v * 1.3, np.where(flat & hollow, v * 0.72, v))
        t = np.clip((v - 0.45) / 0.45, 0, 1)
        h = np.where(green, 284.0 - 16.0 * t, h)
        s = np.where(green, np.clip(s * (0.9 - 0.25 * t), 0, 1), s)
        v = np.where(green, v * (0.55 + 0.4 * t), v)
    elif kind == "soil":
        # dusty autumn paths: warm brown with a little plum in the shadows
        h = np.where(sand, np.where(v > 0.75, 26.0, 8.0), h)
        s = np.where(sand, np.clip(s * 1.05, 0, 1), s)
        v = np.where(sand, v * 0.78, v)
        h = np.where(green, 82.0, h)
        v = np.where(green, v * 0.7, v)
    elif kind == "leafy":
        # autumn trees: lighter leaves orange, darker leaves a burnt red-brown
        h = np.where(green, np.where(v > 0.55, 30.0, 16.0), h)
        s = np.where(green, np.clip(s * 1.25, 0, 1), s)
        v = np.where(green, v * 0.98, v)
    out = hsv_to_rgb(h, np.clip(s, 0, 1), np.clip(v, 0, 1))
    res = np.dstack([np.clip(out, 0, 1), alpha])
    return Image.fromarray((res * 255 + 0.5).astype(np.uint8), "RGBA")


# ---- 3. doors that open ------------------------------------------------------------------------------
# The houses are painted with their door shut. Each one gets a picture of the same doorway standing open
# (dark plum at the top, warm lamp light at the bottom, the door edge-on on the hinge side). The game lays it
# over the house when the player walks up. Measured by eye on the pictures, pixels from each one's top-left:
# (left, right, top of the arch, bottom) of the wooden leaf inside its frame, inclusive.
OPEN_DOORS = {
    "hw_haunted_house": (45, 58, 95, 113),
    "hw_witch_cottage": (27, 38, 54, 67),
    "hw_pumpkin_house": (27, 37, 42, 57),
    "hw_crypt": (18, 30, 24, 41),
}
DOOR_GLOW = [(36, 20, 54), (48, 26, 60), (66, 32, 66), (92, 42, 68), (122, 56, 66), (158, 76, 64), (196, 102, 62), (228, 138, 70), (246, 168, 84)]


def open_door(piece, box):
    """The doorway picture for one house piece: only the leaf's area, rounded at the top."""
    x0, x1, y0, y1 = box
    w, h = x1 - x0 + 1, y1 - y0 + 1
    src = np.asarray(piece.convert("RGBA"))
    out = np.zeros((h, w, 4), np.uint8)
    r = max(3, w // 3)
    for y in range(h):
        for x in range(w):
            # rounded top corners
            cx = min(x, w - 1 - x)
            if y < r and cx < r and (r - cx - 0.5) ** 2 + (r - y - 0.5) ** 2 > r * r:
                continue
            step = min(len(DOOR_GLOW) - 1, int((y / max(1, h - 1)) ** 1.15 * len(DOOR_GLOW)))
            out[y, x] = (*DOOR_GLOW[step], 255)
    # the door itself, seen from the side, stands against the hinge (left) edge
    for y in range(h):
        for x in range(2):
            if out[y, x, 3]:
                out[y, x] = src[y0 + y, x0 + x]
                out[y, x, :3] = (out[y, x, :3] * 0.8).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


# ---- what goes where ----------------------------------------------------------------------------------
BUILDINGS = {  # name: (piece, foot, offset)   foot = tiles the house stands on, counted from its door tile
    "hw_haunted_house": ("try2-1.png", [[dx, dy] for dy in (0, -1, -2, -3) for dx in range(-3, 3)], [-8, 0]),
    "hw_witch_cottage": ("try2-2.png", [[dx, dy] for dy in (0, -1, -2) for dx in range(-2, 2)], [-8, 0]),
    "hw_pumpkin_house": ("try2-3.png", [[dx, dy] for dy in (0, -1, -2) for dx in range(-2, 2)], [-8, 0]),
    "hw_crypt": ("try2-4.png", [[dx, dy] for dy in (0, -1) for dx in (-1, 0, 1)], [0, 0]),
    "hw_arch_gate": ("try2-5.png", [[-1, 0], [1, 0]], [0, 0]),
}
NATURE = {  # name: (piece, foot, offset)
    "hw_dead_tree": ("trees-v1-dead-tree-big.png", [[0, 0]], [0, 0]),
    "hw_dead_tree_b": ("trees-v2-dead-tree-big.png", [[0, 0]], [0, 0]),
    "hw_dead_tree_small": ("trees-v1-dead-tree-small.png", [[0, 0]], [0, 0]),
    "hw_dead_tree_small_b": ("trees-v2-dead-tree-small.png", [[0, 0]], [0, 0]),
    "hw_face_tree": ("trees-v1-face-tree.png", [[-1, 0], [0, 0], [1, 0]], [0, 0]),
    "hw_face_tree_b": ("trees-v2-face-tree.png", [[-1, 0], [0, 0], [1, 0]], [0, 0]),
    "hw_glow_shrooms": ("trees-v1-glow-mushrooms.png", [], [0, 0]),
    "hw_glow_shrooms_b": ("trees-v2-glow-mushrooms.png", [], [0, 0]),
    "hw_bush": ("trees-v1-purple-bush.png", [[0, 0]], [0, 0]),
    "hw_bush_b": ("trees-v2-purple-bush.png", [[0, 0]], [0, 0]),
    "hw_bush_wide": ("trees-v1-purple-bush-wide.png", [[0, 0], [1, 0]], [8, 0]),
    "hw_bush_wide_b": ("trees-v2-purple-bush-wide.png", [[0, 0], [1, 0]], [8, 0]),
    "hw_stump_shrooms": ("trees-v1-stump-mushrooms.png", [[0, 0], [1, 0]], [8, 0]),
    "hw_stump_shrooms_b": ("trees-v2-stump-mushrooms.png", [[0, 0], [1, 0]], [8, 0]),
}
DECOR = {  # name: (piece, foot, offset)
    "hw_pumpkin_small": ("deco-1.png", [], [0, 0]),
    "hw_pumpkin": ("deco-2.png", [[0, 0]], [0, 0]),
    "hw_pumpkin_big": ("deco-3.png", [[0, 0]], [0, 0]),
    "hw_pumpkin_patch": ("deco-4.png", [[0, 0], [1, 0]], [8, 0]),
    "hw_grave": ("deco-7.png", [[0, 0]], [0, 0]),
    "hw_grave_round": ("deco-8.png", [[0, 0]], [0, 0]),
    "hw_grave_mossy": ("deco-9.png", [[0, 0]], [0, 0]),
    "hw_grave_cracked": ("deco-10.png", [[0, 0]], [0, 0]),
    "hw_grave_tall": ("deco-11.png", [[0, 0]], [0, 0]),
    "hw_shroom_purple": ("deco-12.png", [], [0, 0]),
    "hw_shroom_teal": ("deco-13.png", [], [0, 0]),
    "hw_shroom_pink": ("deco-14.png", [], [0, 0]),
    "hw_cobweb": ("deco-16.png", [], [0, 0]),
    "hw_candles": ("deco-18.png", [], [0, 0]),
    "hw_scarecrow": ("deco-20.png", [[0, 0]], [0, 0]),
    "hw_broom": ("deco-23.png", [], [0, 0]),
    "hw_crow_post": ("deco-25.png", [[0, 0]], [0, 0]),
    "hw_sign_pumpkin": ("deco-26.png", [[0, 0]], [0, 0]),
    "hw_candy_corn": ("items-1.png", [], [0, 0]),
    "hw_candy": ("items-2.png", [], [0, 0]),
    "hw_lollipop": ("items-3.png", [], [0, 0]),
    "hw_candy_apple": ("items-4.png", [], [0, 0]),
    "hw_pie_slice": ("items-5.png", [], [0, 0]),
    "hw_coin_bag": ("items-6.png", [], [0, 0]),
    "hw_treat_bag": ("items-7.png", [], [0, 0]),
    "hw_witch_hat": ("items-8.png", [], [0, 0]),
    "hw_lantern": ("items-9.png", [], [0, 0]),
    "hw_ghost_cookie": ("items-10.png", [], [0, 0]),
}
CANDY = {  # item id: (decor piece, name)
    "candy-corn": ("hw_candy_corn", "Candy corn"),
    "candy-lollipop": ("hw_lollipop", "Lollipop"),
    "candy-apple": ("hw_candy_apple", "Candy apple"),
    "candy-wrapped": ("hw_candy", "Wrapped candy"),
    "candy-cookie": ("hw_ghost_cookie", "Ghost cookie"),
}
# strips: texture name ->(pieces in order, anchor, shadow, sparkly)
STRIPS = {
    "hw-ghost": ([f"critters-{i}.png" for i in range(1, 9)], "middle", False, False),
    "hw-owl": ([f"critters-{i}.png" for i in (9, 10, 11, 12)], "feet", True, False),
    "hw-crow": ([f"critters-{i}.png" for i in (13, 14, 15, 17, 18, 19)], "feet", True, False),
    "hw-wisp": ([f"critters-{i}.png" for i in (20, 21, 22, 23)], "middle", False, True),
    "hw-cauldron": ([f"deco-{i}.png" for i in (15, 17, 19, 21)], "feet", True, False),
    "hw-lantern-post": (["deco-22.png", "deco-24.png"], "feet", True, False),
    "hw-jack": (["deco-5.png", "deco-6.png"], "feet", True, False),
}
ANIMS = {  # animation name: (strip, frames, fps)
    "hw-owl-blink": ("hw-owl", [0] * 10 + [1, 0, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 3, 3, 0, 0, 1], 4),
    "hw-cauldron-bubble": ("hw-cauldron", [0, 1, 2, 3], 5),
    "hw-lantern-flicker": ("hw-lantern-post", [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0], 6),
    "hw-jack-flicker": ("hw-jack", [0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1], 6),
}
ANIM_OBJECTS = {  # name: (strip, animation, foot, offset)
    "hw_owl": ("hw-owl", "hw-owl-blink", [], [0, 0]),
    "hw_cauldron": ("hw-cauldron", "hw-cauldron-bubble", [[0, 0]], [0, 0]),
    "hw_lantern_post": ("hw-lantern-post", "hw-lantern-flicker", [[0, 0]], [0, 0]),
    "hw_jack": ("hw-jack", "hw-jack-flicker", [[0, 0]], [0, 0]),
}
TILES = {  # tileset name: (base tileset in art.json, source picture in public/, grade)
    "hwGrassSoft": ("grassSoft", "assets/tiles/grass-soft.png", "grass"),
    "hwGrassLayer": ("grassLayer", "assets/tiles/grass-layer.png", "grass"),
    "hwGrassDark": ("grassDark", "assets/tiles/grass-dark.png", "grass"),
    "hwSoil": ("soil", "assets/tiles/soil.png", "soil"),
    "hwHedge": ("hedge", "assets/tiles/hedge.png", "hedge"),
}
AUTUMN_TREES = ["tree_small", "tree_round", "tree_big", "bush", "bush_small", "bush_long", "stump", "stump_wide", "log"]


def main():
    OUT_GAME.mkdir(exist_ok=True)
    OUT_TILES.mkdir(exist_ok=True)
    art = load_art()
    for section in ("textures", "tilesets", "objects", "animations"):
        for k in [k for k in art[section] if k.startswith(("hw", "hw-", "hw_"))]:
            del art[section][k]
    for k in [k for k in art["creatures"] if k in ("ghost", "crow", "wisp")]:
        del art["creatures"][k]
    files = []  # (public path, pack, source relative to the pack folder, use)

    # still pictures -> three sheets
    for sheet_name, group, width, kw in (("buildings", BUILDINGS, 260, {}), ("nature", NATURE, 200, {}), ("decor", DECOR, 160, {})):
        pieces = {name: still(f, **kw) for name, (f, _, _) in group.items()}
        sheet, rects = pack(pieces, width)
        file = f"hw-{sheet_name}.png"
        sheet.save(OUT_GAME / file)
        tex = f"hw-{sheet_name}"
        art["textures"][tex] = {"file": f"{PUBLIC}/{file}"}
        files.append((f"{PUBLIC}/{file}", "halloween-art", file, f"Pumpkin Hollow {sheet_name} (ChatGPT pieces, pink rim cleaned by make-halloween-art.py)"))
        for name, (f, foot, offset) in group.items():
            d = {"tex": tex, "rect": rects[name]}
            if foot:
                d["foot"] = foot
            if offset != [0, 0]:
                d["offset"] = offset
            if sheet_name in ("buildings",) or name.startswith(("hw_dead_tree", "hw_face_tree")):
                d["occlude"] = True
            art["objects"][name] = d
        print(sheet_name, sheet.size, len(pieces), "pictures")
        if sheet_name == "decor":
            # candy for the item bar and the bag: each piece shrunk to fit a 16 x 16 cell, centred
            cells = Image.new("RGBA", (16 * len(CANDY), 16), (0, 0, 0, 0))
            for i, (item, (piece_name, label)) in enumerate(CANDY.items()):
                pic = pieces[piece_name]
                k = min(1.0, 15 / max(pic.size))
                if k < 1.0:
                    pic = pic.resize((max(1, round(pic.width * k)), max(1, round(pic.height * k))), Image.BOX)
                cells.paste(pic, (16 * i + (16 - pic.width) // 2, 16 - pic.height - (16 - pic.height) // 2), pic)
                art["items"][item] = {"name": label, "tex": "hw-candy", "rect": [16 * i, 0, 16, 16], "group": "candy"}
            cells.save(OUT_GAME / "hw-candy.png")
            art["textures"]["hw-candy"] = {"file": f"{PUBLIC}/hw-candy.png"}
            files.append((f"{PUBLIC}/hw-candy.png", "halloween-art", "hw-candy.png", "Pumpkin Hollow candy icons, 16 x 16 each (make-halloween-art.py)"))
            if not any(slot.get("group") == "candy" for slot in art["itemBar"]):
                art["itemBar"].append({"group": "candy", "icon": "candy-corn"})
        if sheet_name == "buildings":
            doors = {n: open_door(pieces[n], box) for n, box in OPEN_DOORS.items()}
            dsheet, drects = pack(doors, 120)
            dsheet.save(OUT_GAME / "hw-doors.png")
            art["textures"]["hw-doors"] = {"file": f"{PUBLIC}/hw-doors.png"}
            files.append((f"{PUBLIC}/hw-doors.png", "halloween-art", "hw-doors.png", "Pumpkin Hollow: the four houses' doorways standing open (made by make-halloween-art.py)"))
            for n, box in OPEN_DOORS.items():
                art["objects"][n]["openDoor"] = {"tex": "hw-doors", "rect": drects[n], "at": [box[0], box[2]]}

    # animation strips
    sizes = {}
    for tex, (pieces, anchor, shadow, sparkly) in STRIPS.items():
        img, cell = strip(pieces, anchor, shadow, sparkly=sparkly)
        file = f"{tex}.png"
        img.save(OUT_GAME / file)
        sizes[tex] = cell
        art["textures"][tex] = {"file": f"{PUBLIC}/{file}", "frame": list(cell)}
        files.append((f"{PUBLIC}/{file}", "halloween-art", file, f"{tex[3:]}: {len(pieces)} frames lined up on one strip (make-halloween-art.py)"))
        print(tex, img.size, "cell", cell)
    for name, (tex, frames, fps) in ANIMS.items():
        art["animations"][name] = {"tex": tex, "frames": frames, "fps": fps, "repeat": -1}
    for name, (tex, anim, foot, offset) in ANIM_OBJECTS.items():
        d = {"tex": tex, "frame": 0, "anim": anim}
        if foot:
            d["foot"] = foot
        if offset != [0, 0]:
            d["offset"] = offset
        art["objects"][name] = d
    # an owl up on a branch of a dead tree: stands on the tile below the tree, lifted up onto it
    art["objects"]["hw_owl_up"] = {"tex": "hw-owl", "frame": 0, "anim": "hw-owl-blink", "raise": 30}
    # wandering creatures (ghosts and wisps float: "fly" lifts them and gives them a shadow)
    art["creatures"]["ghost"] = {"textures": ["hw-ghost"], "cols": 8, "speed": 9, "radius": 3, "fly": 6, "acts": [],
                                 "anims": {"idle": {"row": 0, "count": 8, "fps": 5}, "walk": {"row": 0, "count": 8, "fps": 7}}}
    art["creatures"]["wisp"] = {"textures": ["hw-wisp"], "cols": 4, "speed": 7, "radius": 2, "fly": 12, "acts": [],
                                "anims": {"idle": {"row": 0, "count": 4, "fps": 6}, "walk": {"row": 0, "count": 4, "fps": 8}}}
    art["creatures"]["crow"] = {"textures": ["hw-crow"], "cols": 6, "speed": 12, "radius": 3, "acts": ["peck", "peck", "look"],
                                "anims": {"idle": {"row": 0, "frames": [0, 0, 0, 3], "count": 4, "fps": 2},
                                          "walk": {"row": 0, "frames": [0, 1, 2, 1], "count": 4, "fps": 8},
                                          "peck": {"row": 0, "frames": [1, 4, 4, 1], "count": 4, "fps": 5},
                                          "look": {"row": 0, "frames": [3, 5, 3, 0], "count": 4, "fps": 3}}}

    # recoloured tiles (same layout as the game's own)
    for name, (base, src, kind) in TILES.items():
        file = f"hw-{Path(src).stem}.png"
        grade(Image.open(ROOT / "public" / src), kind).save(OUT_TILES / file)
        tex = f"hw-tiles-{Path(src).stem}"
        art["textures"][tex] = {"file": f"{PUBLIC}/{file}", "frame": [16, 16]}
        art["tilesets"][name] = {**art["tilesets"][base], "texture": tex}
        files.append((f"{PUBLIC}/{file}", "made-art", f"halloween-tiles/{file}", f"Pumpkin Hollow ground: {src} recoloured by make-halloween-art.py"))
    # the purple iron fence: fences.png recoloured (same 8 x 4 layout), made with ChatGPT's help
    fence = Image.open(SRC / "fence-iron-purple.png").convert("RGBA")
    assert fence.size == Image.open(ROOT / "public/assets/tiles/fences.png").size
    fence.save(OUT_TILES / "hw-fences.png")
    art["textures"]["hw-tiles-fences"] = {"file": f"{PUBLIC}/hw-fences.png", "frame": [16, 16]}
    art["tilesets"]["hwFence"] = {**art["tilesets"]["fence"], "texture": "hw-tiles-fences"}
    files.append((f"{PUBLIC}/hw-fences.png", "made-art", "halloween-tiles/hw-fences.png", "Pumpkin Hollow iron fence: fences.png recoloured purple (same layout)"))
    # autumn trees: trees.png recoloured, same rectangles as the green ones
    grade(Image.open(ROOT / "public/assets/objects/trees.png"), "leafy").save(OUT_TILES / "hw-trees.png")
    art["textures"]["hw-trees"] = {"file": f"{PUBLIC}/hw-trees.png"}
    files.append((f"{PUBLIC}/hw-trees.png", "made-art", "halloween-tiles/hw-trees.png", "autumn trees for Pumpkin Hollow: trees.png recoloured orange"))
    for t in AUTUMN_TREES:
        art["objects"][f"hw_{t}"] = {**art["objects"][t], "tex": "hw-trees"}

    save_art(art)
    update_catalog(files)
    print("art.json and assets.catalog.json updated;", len(files), "files. Next: node scripts/sync-art.mjs")


def update_catalog(files):
    text = CATALOG.read_text(encoding="utf-8")
    cat = json.loads(text)
    assert json.dumps(cat, indent=2, ensure_ascii=False) + "\n" == text, "assets.catalog.json layout changed; check before rewriting"
    cat["packs"]["halloween-art"] = {
        "name": "Halloween pictures (made with ChatGPT for this game)",
        "folder": "Made Art/halloween-game",
        "creator": "Made for this game's owner with ChatGPT image generation, then cut and cleaned by the game's scripts",
        "url": "",
        "license": "Project-owned pictures made for this game (ChatGPT image generation, Sprout Lands style). Check the image tool's terms before selling.",
        "commercialUse": True,
        "credit": "",
        "evidence": ["Made Art/halloween/ holds the original ChatGPT sheets and cut_sheet.py; scripts/tools/make-halloween-art.py cleans and packs them"],
    }
    cat["files"] = [f for f in cat["files"] if not f["path"].startswith(PUBLIC + "/")]
    for path, pack_, source, use in files:
        cat["files"].append({"path": path, "pack": pack_, "source": source, "role": "runtime", "use": use})
    CATALOG.write_text(json.dumps(cat, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
