"""Paints the ground of the East Isle (region "east", 48 x 58 tiles) as a text map.

Layout idea (own design, drawn like the farm): a bridge from the farm's east coast lands in the middle of the
west side (row 37). North of it are the Pine Hills (hedge rooms, a treasure pond, a cabin and the trail up to
a rocky spot where the mine will go); south of it is Cobble Village (colourful houses along sand trails, a
well, a pond, a cow paddock, a hen yard, an orchard and a fishing pier).

Written by hand-picked numbers plus a seeded wobble, so the coast is never straight. east_objects.py imports
`rows`, adds objects, animals and things to find, checks them and writes east.json.

Map key: ~ water, . grass, : sand or trail, b forest/hedge, f / F fence, = bridge east-west, | bridge or pier north-south.
"""
import random

W, H = 48, 58
g = [['~'] * W for _ in range(H)]
rnd = random.Random(7351)

# ---- the coast: land from xmin to xmax on each row, with a slow wobble ------------------------------
KEY = [(2, 15, 31), (5, 10, 37), (10, 6, 41), (18, 5, 43), (28, 4, 44), (34, 3, 44), (37, 1, 45), (44, 3, 45),
       (50, 5, 43), (53, 9, 38), (54, 13, 34)]


def interp(y):
    for (y0, a0, b0), (y1, a1, b1) in zip(KEY, KEY[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            return a0 + (a1 - a0) * t, b0 + (b1 - b0) * t
    return None


def walk(n, lim=2):
    out, v, hold = [], 0, 0
    for _ in range(n):
        if hold == 0:
            v = max(-lim, min(lim, v + rnd.choice((-1, 0, 1))))
            hold = rnd.randint(3, 5)
        hold -= 1
        out.append(v)
    return out


wa, wb = walk(H), walk(H)
for y in range(H):
    r = interp(y)
    if not r:
        continue
    a, b = int(round(r[0])) + wa[y], int(round(r[1])) + wb[y]
    for x in range(max(a, 1), min(b, W - 2) + 1):
        g[y][x] = '.'
# the landing for the bridge
for y in range(36, 39):
    for x in range(1, 4):
        g[y][x] = '.'
g[37][0] = '='


def carve(cells, ch):
    for x, y in cells:
        if 0 <= x < W and 0 <= y < H:
            g[y][x] = ch


def blob(shape, ch):
    carve([(x, y) for y, (a, b) in shape.items() for x in range(a, b + 1)], ch)


def path(points, ch=':'):
    cells = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        x, y = x0, y0
        cells.append((x, y))
        while x != x1:
            x += 1 if x1 > x else -1
            cells.append((x, y))
        while y != y1:
            y += 1 if y1 > y else -1
            cells.append((x, y))
    carve([(x, y) for x, y in cells if 0 <= y < H and g[y][x] in '.,:'], ch)


def forest(*rects):
    """Bush walls: rects are (x0, y0, x1, y1); only grass turns to bushes."""
    for x0, y0, x1, y1 in rects:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if g[y][x] == '.':
                    g[y][x] = 'b'


# ---- Pine Hills (north): forest masses and hedge rooms ---------------------------------------------
# the thick forest in the far north and north-west / north-east, uneven
top = {}
for x in range(W):
    top[x] = 0
for y in range(2, 8):
    for x in range(W):
        if g[y][x] == '.':
            g[y][x] = 'b'
forest((5, 8, 9, 12), (6, 13, 8, 15), (36, 8, 43, 10), (39, 11, 44, 14), (5, 24, 8, 27), (40, 24, 44, 27))
# hedge walls that split the hills into rooms (each has a gap for the trails)
forest((26, 8, 27, 14), (26, 17, 27, 20), (28, 19, 34, 20), (37, 19, 41, 20), (10, 21, 13, 22), (16, 21, 19, 22),
       (33, 21, 34, 23))
# a small lake with a treasure island
blob({11: (10, 17), 12: (9, 18), 13: (9, 18), 14: (9, 18), 15: (9, 18), 16: (9, 18), 17: (10, 17)}, '~')
blob({12: (12, 15), 13: (11, 16), 14: (12, 15)}, '.')
# the cabin room (north-east): a clearing with its own trail
# the pine trail: from the village up to the mine mouth
path([(22, 37), (22, 30), (21, 30), (21, 24), (22, 24), (22, 15), (23, 15), (23, 9)])
path([(23, 8), (23, 6)])
path([(22, 18), (14, 18), (14, 17)])            # west to the lake bridge (bridge tiles added below)
path([(23, 15), (35, 15), (35, 18)])            # east to the cabin room
path([(35, 15), (35, 12)])
path([(21, 27), (10, 27), (10, 30)])            # west meadow trail
path([(22, 30), (34, 30), (34, 28), (40, 28)])  # east to the orchard
# the lake bridge
for y in (15, 16, 17):
    g[y][14] = '|'

# ---- Cobble Village (south) ------------------------------------------------------------------------
path([(1, 37), (22, 37), (44, 37)])              # main street
path([(22, 37), (22, 55)])                        # down to the pier
path([(4, 44), (40, 44)])                         # second street
path([(6, 51), (41, 51)])                         # beach lane
path([(10, 37), (10, 44)])                        # cross lanes
path([(36, 37), (36, 44)])
# spurs from house doors down to the streets (x, door y, street y)
for x, dy, sy in [(8, 34, 37), (15, 34, 37), (29, 34, 37), (37, 34, 37),
                  (6, 41, 44), (13, 41, 44), (31, 41, 44), (39, 41, 44),
                  (17, 49, 51), (27, 49, 51), (33, 49, 51)]:
    path([(x, dy), (x, sy)])
# the village pond
blob({39: (25, 28), 40: (24, 28), 41: (24, 28), 42: (25, 27), 43: (26, 27)}, '~')
# a yard in front of the well
blob({39: (19, 21), 40: (19, 21), 41: (19, 21)}, ':')
# fenced places: the cow paddock (south-east) and the hen yard (south-west)
def fence_ring(x0, y0, x1, y1, gates, inside):
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            edge = x in (x0, x1) or y in (y0, y1)
            if (x, y) in gates:
                g[y][x] = ':'
            elif edge:
                g[y][x] = 'F' if g[y][x] == ':' else 'f'
            else:
                g[y][x] = inside


fence_ring(37, 46, 43, 50, {(40, 46)}, '.')     # cow paddock; gate on the north side (row 46), trail row 44 above
path([(40, 44), (40, 45)])
fence_ring(6, 46, 11, 50, {(8, 46)}, '.')       # hen yard
path([(8, 44), (8, 45)])
# the pier
for y in (55, 56):
    g[y][22] = '|'


def lint():
    out = []
    water = lambda x, y: 0 <= x < W and 0 <= y < H and g[y][x] in '~=|'
    forest_ = lambda x, y: 0 <= x < W and 0 <= y < H and g[y][x] == 'b'
    for name, kind in (('water', water), ('forest', forest_)):
        for y in range(H - 1):
            for x in range(W - 1):
                a, b, c, d = kind(x, y), kind(x + 1, y), kind(x, y + 1), kind(x + 1, y + 1)
                if (a and d and not b and not c) or (b and c and not a and not d):
                    out.append((name, 'corner', x, y))
        for y in range(H):
            for x in range(W):
                if kind(x, y) and not (x in (0, W - 1) or y in (0, H - 1)):
                    n = sum(kind(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    if n <= 1:
                        out.append((name, 'lone', x, y))
    return out


def tidy():
    """Lone water/forest tiles become grass; corner-only joins get a third tile. Repeats until stable."""
    for _ in range(20):
        found = lint()
        if not found:
            return
        for name, what, x, y in found:
            fill = '~' if name == 'water' else 'b'
            if what == 'lone':
                if g[y][x] in ('~', 'b'):
                    g[y][x] = '.'
            else:
                for cx, cy in ((x + 1, y), (x, y), (x, y + 1), (x + 1, y + 1)):
                    if g[cy][cx] == '.':
                        g[cy][cx] = fill
                        break


tidy()
rows = [''.join(r) for r in g]

if __name__ == '__main__':
    for w in lint():
        print('LINT:', w)
    print('   ' + ''.join(str(x % 10) for x in range(W)))
    for i, r in enumerate(rows):
        print(f'{i:2d} {r}')
