# Quick layout sketch of the planned world, drawn with the real Premium tiles.
import math, random
from PIL import Image, ImageDraw, ImageFont
exec(open(r'C:\Users\macie\AppData\Local\Temp\claude\C--Users-macie--claude\30321c59-0171-4211-ad72-15029235d763\scratchpad\blobtable.py').read())
A = r'E:\Z Pixel\Sprout-Lands\public\assets'
TN = r'E:\Z Pixel\Sprout-Lands\Sprout Lands - Sprites - premium pack\Tilesets\ground tiles\New tiles'
def img(p): return Image.open(p).convert('RGBA')
grass, soil, hill, hedge, snow = img(A + r'\tiles\grass.png'), img(A + r'\tiles\soil.png'), img(A + r'\tiles\hill.png'), img(A + r'\tiles\hedge.png'), img(A + r'\tiles\snow.png')
glayer = img(TN + r'\Grass_Tile_Layers.png')
water = img(A + r'\tiles\water.png').crop((0, 0, 16, 16))
bridge = img(A + r'\tiles\bridge.png')
obj = {n: img(A + '\\objects\\' + n + '.png') for n in ['trees', 'pines', 'blossoms', 'houses', 'brick-houses', 'boats', 'winter']}
W, H = 170, 124
random.seed(7)
def grid(): return [[0] * W for _ in range(H)]
land, sand, hl, hd, sn = grid(), grid(), grid(), grid(), grid()
region = [[None] * W for _ in range(H)]
def blobfill(g, cx, cy, rx, ry, seed, val=1, name=None, wob=0.16):
    ph = [random.Random(seed + i).uniform(0, 6.28) for i in range(4)]
    for y in range(max(0, int(cy - ry - 3)), min(H, int(cy + ry + 4))):
        for x in range(max(0, int(cx - rx - 3)), min(W, int(cx + rx + 4))):
            a = math.atan2((y - cy) / ry, (x - cx) / rx)
            r = 1 + wob * math.sin(3 * a + ph[0]) + wob * 0.6 * math.sin(5 * a + ph[1]) + wob * 0.4 * math.sin(7 * a + ph[2])
            if math.hypot((x - cx) / rx, (y - cy) / ry) < r:
                g[y][x] = val
                if name: region[y][x] = name
islands = [
    ('Sunny Meadow (start)', 84, 50, 26, 16, 1), ('Frosty Isle', 30, 22, 17, 12, 2), ('Pinecrest Cliffs', 137, 22, 21, 14, 3),
    ('Forest Grove', 145, 64, 22, 16, 4), ('Maple Town', 25, 63, 20, 15, 5), ('Fishing Cove', 52, 98, 20, 13, 6),
    ('Sunny Beach', 108, 98, 22, 13, 7), ('Blossom Isle (locked)', 150, 108, 15, 10, 8)]
for n, cx, cy, rx, ry, s in islands: blobfill(land, cx, cy, rx, ry, s * 11, 1, n)
for cx, cy, rx, ry in [(66, 14, 4, 3), (7, 92, 4, 3), (88, 118, 5, 3), (120, 44, 3, 2), (160, 40, 3, 3)]: blobfill(land, cx, cy, rx, ry, cx, 1, None, 0.25)
for y in range(33, 47):
    for x in range(95, 99): land[y][x] = 0
blobfill(land, 52, 98, 8, 5, 91, 0, None, 0.2)
def line(g, pts, wdt, val=1):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n); y = round(y0 + (y1 - y0) * i / n)
            for dy in range(wdt):
                for dx in range(wdt):
                    if 0 <= y + dy < H and 0 <= x + dx < W and land[y + dy][x + dx]: g[y + dy][x + dx] = val
line(sand, [(62, 52), (84, 52), (84, 62)], 2); line(sand, [(84, 52), (106, 50)], 2); line(sand, [(84, 40), (84, 52)], 2)
for y in range(88, 112):
    for x in range(86, 131):
        if land[y][x] and y > 93: sand[y][x] = 1
blobfill(sand, 25, 63, 7, 4, 5, 1, None, 0.05)
line(sand, [(8, 63), (44, 63)], 2)
for y in range(54, 60):
    for x in range(66, 76): sand[y][x] = 1
blobfill(hl, 132, 18, 12, 7, 31); blobfill(hl, 147, 26, 8, 5, 32)
for y in range(H):
    for x in range(W):
        if hl[y][x] and not land[y][x]: hl[y][x] = 0
for (x0, y0, x1, y1) in [(128, 56, 160, 56), (128, 56, 128, 72), (138, 62, 152, 62), (152, 62, 152, 74), (136, 70, 146, 70)]:
    line(hd, [(x0, y0), (x1, y1)], 2)
blobfill(sn, 30, 22, 13, 8, 51)
bridges = [('h', 47, 30, 60, 30), ('h', 110, 30, 116, 30), ('v', 141, 36, 141, 48), ('h', 45, 60, 58, 60), ('v', 66, 66, 66, 86), ('v', 100, 66, 100, 85), ('h', 95, 44, 99, 44)]
out = Image.new('RGBA', (W * 16, H * 16))
for y in range(H):
    for x in range(W): out.paste(water, (x * 16, y * 16))
def get(g, x, y): return 0 <= x < W and 0 <= y < H and g[y][x]
def tile(sheet, c, x, y): out.alpha_composite(sheet.crop((c[0] * 16, c[1] * 16, c[0] * 16 + 16, c[1] * 16 + 16)), (x * 16, y * 16))
landsame = lambda a, b: get(land, a, b)
for y in range(H):
    for x in range(W):
        if not land[y][x]: continue
        m = mask(landsame, x, y)
        if m != 255: tile(soil if sand[y][x] else grass, table[m], x, y)
        else:
            near = any(get(sand, x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
            if sand[y][x] or near: tile(soil, (1, 1), x, y)
            else: tile(grass, random.choice([(1, 1)] * 6 + [(0, 5), (1, 5), (2, 5), (3, 6), (4, 6)]), x, y)
for y in range(H):
    for x in range(W):
        if land[y][x] and not sand[y][x] and mask(landsame, x, y) == 255 and any(get(sand, x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
            tile(glayer, table[mask(lambda a, b: get(land, a, b) and not get(sand, a, b), x, y)], x, y)
        if sn[y][x]: tile(snow, table[mask(lambda a, b: get(sn, a, b), x, y)], x, y)
        if hl[y][x]: tile(hill, table[mask(lambda a, b: get(hl, a, b), x, y)], x, y)
        if hd[y][x]: tile(hedge, table[mask(lambda a, b: get(hd, a, b), x, y)], x, y)
seg_h = bridge.crop((0, 0, 32, 32)); seg_v = bridge.crop((32, 0, 64, 32))
for kind, x0, y0, x1, y1 in bridges:
    if kind == 'h':
        for x in range(x0, x1, 2): out.alpha_composite(seg_h, (x * 16, y0 * 16))
    else:
        for y in range(y0, y1, 2): out.alpha_composite(seg_v, (x0 * 16, y * 16))
def put(sheet, rect, tx, ty):
    s = sheet.crop((rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]))
    out.alpha_composite(s, (int(tx * 16 + 8 - rect[2] / 2), int(ty * 16 + 16 - rect[3])))
def scatter(name, sheet, rects, n, avoid):
    cells = [(x, y) for y in range(H) for x in range(W) if region[y][x] == name and land[y][x] and not sand[y][x] and not hl[y][x] and not hd[y][x] and mask(landsame, x, y) == 255]
    random.shuffle(cells); placed = []
    for (x, y) in cells:
        if len(placed) >= n: break
        if any(abs(x - a) < 3 and abs(y - b) < 3 for a, b in placed): continue
        if any(abs(x - a) < 3 and abs(y - b) < 3 for a, b in avoid): continue
        placed.append((x, y))
    for (x, y) in sorted(placed, key=lambda p: p[1]): put(sheet, random.choice(rects), x, y)
tree_rects = [(20, 0, 24, 31), (52, 0, 24, 31), (84, 0, 24, 31), (116, 0, 24, 31), (148, 0, 24, 31)]
scatter('Sunny Meadow (start)', obj['trees'], tree_rects, 26, [(84, 52)])
scatter('Forest Grove', obj['pines'], [(119, 0, 35, 46), (83, 16, 26, 31), (64, 22, 16, 25)], 40, [])
scatter('Pinecrest Cliffs', obj['trees'], [(20, 0, 24, 31), (1, 1, 14, 29)], 18, [])
scatter('Blossom Isle (locked)', obj['blossoms'], [(116, 0, 40, 48), (84, 16, 24, 31), (65, 18, 14, 29)], 12, [])
scatter('Maple Town', obj['trees'], [(20, 0, 24, 31)], 10, [(25, 63)])
scatter('Fishing Cove', obj['trees'], [(20, 0, 24, 31), (1, 1, 14, 29)], 12, [])
scatter('Frosty Isle', obj['winter'], [(7, 1, 35, 46), (55, 1, 35, 46)], 10, [])
for i, (tx, ty) in enumerate([(14, 58), (20, 56), (32, 57), (38, 58)]):
    out.alpha_composite(obj['houses'].crop(((i % 3) * 64, (i // 3) * 64, (i % 3) * 64 + 64, (i // 3) * 64 + 64)), (tx * 16 - 24, ty * 16 - 48))
out.alpha_composite(obj['brick-houses'].crop((0, 0, 96, 80)), (22 * 16, 66 * 16))
out.alpha_composite(obj['houses'].crop((0, 0, 64, 64)), (70 * 16, 45 * 16))
out.alpha_composite(obj['boats'].crop((0, 0, 48, 32)), (128 * 16, 103 * 16))
out.alpha_composite(obj['boats'].crop((0, 0, 48, 32)), (60 * 16, 105 * 16))
small = out.resize((W * 8, H * 8), Image.NEAREST)
d = ImageDraw.Draw(small)
try:
    font = ImageFont.truetype(r'E:\Z Pixel\Sprout-Lands\public\assets\fonts\sprout-8x14.ttf', 28)
except Exception:
    font = ImageFont.load_default()
for n, cx, cy, rx, ry, s in islands:
    d.text((cx * 8, (cy - ry) * 8 - 22), n, fill=(255, 255, 255), font=font, anchor='mm', stroke_width=4, stroke_fill=(40, 50, 70))
small.save(r'C:\Users\macie\AppData\Local\Temp\claude\C--Users-macie--claude\30321c59-0171-4211-ad72-15029235d763\scratchpad\world_layout_preview.png')
print(small.size)
