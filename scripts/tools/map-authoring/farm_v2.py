"""Paints the hand-designed Sunny Farm test area into the text map in
src/content/starter-adventure/world/regions/farm.json.

Every number below was chosen by hand (coast lines, river banks, forest edge,
trails, fields). This script only paints them in, so the map stays easy to
tweak; after that the text map in farm.json is the thing to edit.
"""
import json, os, random, sys

sys.path.insert(0, os.path.dirname(__file__))
from hedges import wall, tidy, seal  # noqa: E402

W, H = 60, 40
g = [['~'] * W for _ in range(H)]

def spans(pairs):
    """[(first, last, value), ...] -> list indexed by position."""
    out = {}
    for a, b, v in pairs:
        for i in range(a, b + 1):
            out[i] = v
    return out

# River: first water row (north edge) and last water row (south edge), per column.
nY = spans([(0, 5, 4), (6, 10, 3), (11, 12, 2), (13, 15, 3), (16, 21, 4), (22, 24, 3), (25, 31, 4), (32, 35, 3),
            (36, 38, 2), (39, 42, 3), (43, 46, 4), (47, 49, 3), (50, 51, 2)])
sY = spans([(0, 3, 6), (4, 7, 7), (8, 10, 6), (11, 14, 5), (15, 18, 6), (19, 21, 7), (22, 34, 6), (35, 38, 5),
            (39, 41, 6), (42, 44, 7), (45, 47, 8), (48, 59, 9)])
# North bank: land above the river, as far east as these columns.
northEast = {0: 53, 1: 52, 2: 51, 3: 49}
# South land: east coast (last land column) per row, and south coast (last land row) per column.
eastLast = spans([(7, 9, 51), (10, 10, 53), (11, 12, 54), (13, 13, 55), (14, 15, 56), (16, 17, 55), (18, 18, 56),
                  (19, 19, 57), (20, 20, 56), (21, 22, 55), (23, 23, 54), (24, 25, 55), (26, 26, 54), (27, 28, 53),
                  (29, 29, 54), (30, 30, 53), (31, 31, 52), (32, 32, 51), (33, 33, 50), (34, 34, 47), (35, 35, 44), (36, 36, 42)])
southLast = spans([(0, 2, 35), (3, 8, 34), (9, 11, 33), (12, 14, 32), (15, 17, 33), (18, 19, 32), (20, 22, 33),
                   (23, 29, 34), (30, 32, 35), (33, 35, 36), (36, 40, 35), (41, 42, 36), (43, 44, 35), (45, 47, 34),
                   (48, 50, 33), (51, 52, 32), (53, 59, 31)])

for x in range(W):
    for y in range(H):
        if x in nY and y < nY[x] and x <= northEast.get(y, 60):
            g[y][x] = '.'
        if x in sY and y > sY[x] and y <= southLast.get(x, -1) and x <= eastLast.get(y, -1):
            g[y][x] = '.'

# Forest mass (bushes) along the west edge: last bush column per row.
hedgeLast = spans([(0, 0, 10), (1, 1, 9), (2, 2, 7), (3, 3, 3), (7, 7, 3), (8, 8, 4), (9, 10, 5), (11, 12, 6),
                   (13, 14, 5), (15, 16, 4), (17, 17, 5), (18, 19, 6), (20, 20, 5), (21, 22, 4), (23, 24, 5),
                   (25, 25, 6), (26, 27, 7), (28, 29, 6), (30, 31, 7), (32, 33, 6), (34, 34, 5), (35, 35, 4)])
for y, last in hedgeLast.items():
    for x in range(0, last + 1):
        if g[y][x] == '.':
            g[y][x] = 'b'

# The way through to the West Woods: the forest wall is open on rows 12-16, with a trail along row 14
# (it meets the trail at the west edge of the woods, one world tile further west).
for y in range(12, 17):
    for x in range(0, 9):
        if g[y][x] == 'b':
            g[y][x] = '.'

# Small inlets of forest poking out, so the edge isn't a wall.
for x, y in [(6, 18), (7, 18), (7, 26), (8, 26), (8, 27), (7, 30), (8, 30)]:
    if g[y][x] == '.':
        g[y][x] = 'b'

def sand(cells):
    for x, y in cells:
        if g[y][x] in '.,':
            g[y][x] = ':'

def trail(points):
    """Walk between hand-placed points, first across then down, one tile wide."""
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
    sand(cells)

# Trails.
trail([(28, 0), (28, 2), (29, 2), (29, 3)])                      # north bank to the bridge
trail([(29, 7), (29, 10), (30, 10), (30, 16), (29, 16), (29, 22), (30, 22), (30, 26), (31, 26), (31, 29), (32, 29), (32, 31)])
trail([(29, 13), (27, 13), (27, 14), (23, 14)])                  # to the farmhouse
trail([(17, 15), (17, 16), (14, 16), (14, 17), (12, 17), (12, 18)])  # to Mama Hen's yard
trail([(0, 14), (14, 14)])                                     # west, through the gap in the forest, to the West Woods
trail([(30, 18), (40, 18), (40, 19), (47, 19), (47, 18)])         # to the fields
trail([(37, 16), (37, 17)])
# Farmyard in front of the house (an uneven patch).
sand([(x, 13) for x in range(16, 23)] + [(x, 14) for x in range(15, 24)] + [(x, 15) for x in range(17, 22)] + [(16, 12), (22, 12)])
# Beach: first sand row per column along the south coast.
beachTop = spans([(23, 24, 33), (25, 30, 32), (31, 32, 31), (33, 35, 30), (36, 37, 31), (38, 40, 32), (41, 47, 33)])
for x, top in beachTop.items():
    for y in range(top, southLast.get(x, -1) + 1):
        if g[y][x] == '.':
            g[y][x] = ':'

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

fence_ring(9, 19, 19, 26, {(12, 19)}, ':')      # Mama Hen's yard
fence_ring(33, 9, 41, 15, {(37, 15)}, ':')      # field A
fence_ring(44, 11, 51, 17, {(47, 17)}, ':')     # field B

# A small pond in the east meadow.
for y, (a, b) in {23: (34, 37), 24: (33, 38), 25: (33, 39), 26: (34, 38), 27: (35, 37)}.items():
    for x in range(a, b + 1):
        g[y][x] = '~'

# Bridge, pier, stepping stones, and the little island.
for y in range(4, 7):
    g[y][29] = '|'
for y in range(36, 39):
    g[y][38] = '|'
for x, y in [(10, 34), (10, 35)]:
    g[y][x] = 'o'
for x, y in [(9, 36), (10, 36), (11, 36), (12, 36), (8, 37), (9, 37), (10, 37), (11, 37), (12, 37), (9, 38), (10, 38), (11, 38)]:
    g[y][x] = '.'

# The bridge over the east strait to the East Isle (its bridge tile at region column 0 continues it).
for x in (58, 59):
    g[19][x] = '='

# ---- hedge rooms (user's guide picture, 2026-09-29) --------------------------------------------------
# The old forest mass along the west edge becomes grass, then wobbly bush walls (hedges.py) split it into
# small rooms and winding paths; single trees stand in the rooms (placed by farm_objects.py). Only grass
# becomes hedge, so the trails, fences and the coop yard are never covered. The wobble is seeded, so the
# map is the same every time.
for y in range(0, 34):
    for x in range(0, 11):
        if g[y][x] == 'b':
            g[y][x] = '.'
rnd = random.Random(20260929)
# hand-placed things in farm_objects.py that stand where a wall passes: the wall goes round them
KEEP = {(8, 17), (7, 22), (8, 21), (7, 24), (8, 28), (9, 28), (10, 30), (8, 33), (4, 13), (7, 10), (12, 8), (11, 0)}
for pts in [
    [(0, 0), (0, 3)], [(0, 7), (0, 11)], [(0, 17), (0, 33)],   # a wobbly edge down the west side
    [(5, 0), (5, 1)],                                         # a divider on the north bank
    [(2, 9), (4, 9)],                                         # a room by the river
    [(1, 20), (5, 20)], [(1, 26), (6, 26)], [(2, 31), (5, 31)],  # walls reaching in beside Mama Hen's yard
    [(4, 23), (4, 24)], [(5, 29), (6, 29)],                   # short walls
]:
    wall(g, rnd, pts, keep=KEEP)
tidy(g, keep=KEEP)
# where walls meet they can shut in a little patch of grass: those patches become bush too
stuck = seal(g, (0, 14), (0, 0, 10, 33), keep=KEEP)
assert not stuck, f'hand-placed things shut in by the hedges: {stuck}'
tidy(g, keep=KEEP)
# Gap A (user's choice, picture map-drafts/west-strip-gaps.png): a 2-tile opening through the thick west
# wall, joining the woods' middle room to the grass beside the chick yard. Cut after tidy so nothing refills it.
GAP_A = [(x, y) for x in range(0, 3) for y in (22, 23)]
for x, y in GAP_A:
    g[y][x] = '.'

rows =[''.join(r) for r in g]
if __name__ == '__main__':
    for i, r in enumerate(rows):
        print(f'{i:2d} {r}')
