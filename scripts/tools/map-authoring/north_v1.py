"""Paints the ground of the North Meadows (region "north", 104 x 18 tiles) as a text map.

Laid out from map-drafts/north-hill-cottage.png (layout only). It sits above the whole world:
columns 0-43 are above the West Woods (thick forest joining the woods' own forest), columns 44-103
are above the Sunny Farm, and its bottom row touches the farm's thin north bank, so the land north
of the farm's river simply goes on. From west to east: the forest mass, a lily pond with a little
pier and a rowboat, the hill cottage in a fenced yard (reached by the trail from the farm's north
bridge), a pink blossom meadow with a picnic, and a small treasure island out at sea reached by
stepping stones. The hill in the picture is drawn flat (stair art is not ready, see HANDOFF section 8).

Columns are written as FARM columns (0-59, the same numbers as in farm.json) with C(), so the trail,
the blossom grove and the coast line up with the farm below. north_objects.py imports `rows`,
adds objects, animals and things to find, checks them and writes north.json.

Map key: ~ water, . grass, : sand or trail, b forest, f / F fence, = bridge east-west,
| bridge or pier north-south, o stepping stones.
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from hedges import wall, tidy  # noqa: E402

W, H = 104, 18
FARM_X = 44  # where the farm starts in this map (the farm is placed 44 tiles in)
g = [['~'] * W for _ in range(H)]


def C(cf):
    """A farm column number -> this map's column."""
    return cf + FARM_X


def spans(pairs):
    """[(first, last, value), ...] -> dict indexed by position."""
    out = {}
    for a, b, v in pairs:
        for i in range(a, b + 1):
            out[i] = v
    return out


# ---- above the woods: forest, with a wobbly sea coast in the top-left corner ---------------------
woodsTop = spans([(0, 3, 7), (4, 6, 6), (7, 9, 5), (10, 13, 4), (14, 17, 3), (18, 22, 2), (23, 26, 1), (27, 43, 0)])
for x in range(0, FARM_X):
    for y in range(woodsTop[x], H):
        g[y][x] = 'b'

# ---- above the farm: land out to the east coast (last land farm column per row) -----------------
eastLast = spans([(0, 1, 44), (2, 4, 47), (5, 6, 48), (7, 8, 49), (9, 10, 50), (11, 13, 51), (14, 15, 51), (16, 17, 52)])
for y in range(H):
    for cf in range(0, eastLast[y] + 1):
        g[y][C(cf)] = '.'
# the far-left forest mass (last forest farm column per row); the farm's own forest carries on below
westForest = spans([(0, 2, 12), (3, 3, 10), (4, 5, 8), (6, 7, 7), (8, 9, 6), (10, 11, 7), (12, 13, 8), (14, 15, 9), (16, 17, 10)])
for y, last in westForest.items():
    for cf in range(0, last + 1):
        g[y][C(cf)] = 'b'
# the forest band along the top (how many rows deep, per farm column)
topBand = spans([(13, 16, 3), (17, 19, 2), (20, 22, 3), (23, 26, 2), (27, 33, 2), (34, 36, 2), (37, 39, 3), (40, 42, 2), (43, 44, 3)])
for cf, depth in topBand.items():
    for y in range(depth):
        if g[y][C(cf)] == '.':
            g[y][C(cf)] = 'b'

# ---- water: the lily pond, and the treasure island out at sea -------------------------------------
pond = {9: (13, 17), 10: (12, 19), 11: (11, 20), 12: (11, 20), 13: (12, 19), 14: (13, 17)}
for y, (a, b) in pond.items():
    for cf in range(a, b + 1):
        g[y][C(cf)] = '~'
island = {2: (53, 56), 3: (52, 57), 4: (52, 57), 5: (52, 57), 6: (53, 56)}
for y, (a, b) in island.items():
    for cf in range(a, b + 1):
        g[y][C(cf)] = '.'


def bushes(cells):
    for cf, y in cells:
        if g[y][C(cf)] == '.':
            g[y][C(cf)] = 'b'


# little forest inlets so no edge is a straight wall
bushes([(9, 4), (10, 4), (13, 3), (14, 3), (18, 2), (19, 2), (35, 2), (36, 2), (41, 2), (42, 2), (8, 6), (8, 10), (8, 11), (10, 15)])


def sand(cells):
    for cf, y in cells:
        if g[y][C(cf)] in '.,':
            g[y][C(cf)] = ':'


def trail(points):
    """Walk between hand-placed points (farm columns), first across then down, one tile wide."""
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


def fence_ring(x0, y0, x1, y1, gates):
    """A fenced yard (farm columns); gate tiles stay sand."""
    for cf in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            if (cf, y) in gates:
                g[y][C(cf)] = ':'
            elif cf in (x0, x1) or y in (y0, y1):
                g[y][C(cf)] = 'F' if g[y][C(cf)] == ':' else 'f'


# ---- trails -----------------------------------------------------------------------------------
# up from the farm's north bridge (farm column 29) to the cottage gate
trail([(29, 17), (29, 9)])
# west: round the top of the pond to the old stump corner
trail([(29, 12), (23, 12), (23, 7), (11, 7), (11, 5)])
# east: through the meadow to the blossom trees and the picnic
trail([(29, 11), (36, 11), (36, 9), (42, 9), (42, 12), (47, 12), (47, 14)])
# north-east: to the shore and the stepping stones for the island
trail([(42, 9), (42, 5), (48, 5)])
# wider sandy patches like the picture: under the blossom trees and round the picnic
sand([(43, 12), (44, 11), (45, 11), (46, 13), (44, 14), (45, 14), (46, 14), (48, 13), (43, 5), (44, 4), (45, 4)])

# ---- the cottage yard (the hill in the picture, drawn flat) -------------------------------------
fence_ring(25, 2, 34, 9, {(29, 9)})
for cf, y in [(29, 6), (29, 7), (29, 8)]:
    g[y][C(cf)] = ':'
# a few fence pieces by the paths, like the picture
for cf in (21, 22, 24, 25, 26):
    if g[14][C(cf)] == '.':
        g[14][C(cf)] = 'f'
for cf in (37, 38, 39):
    if g[7][C(cf)] == '.':
        g[7][C(cf)] = 'f'

# ---- the pier into the pond and the stones to the island ------------------------------------------
for y in (9, 10):
    g[y][C(15)] = '|'
for cf in (49, 50, 51):
    g[5][C(cf)] = 'o'

# ---- hedge rooms (user's guide picture, same look as the West Woods, 2026-09-29) --------------------
# The big forest mass above the woods is opened into grass, keeping a thick forest edge along the sea,
# the top and the bottom (where it joins the woods' forest). Thick bush walls then split the grass into
# small rooms and winding paths; single trees stand in the rooms (placed by north_objects.py). Only
# grass becomes hedge, and the deep forest trail below is carved on top, so its clearings and path stay.
for x in range(3, FARM_X):
    for y in range(max(woodsTop[x] + 3, 4), H - 1):  # the bottom row stays forest, joining the woods' forest below
        if g[y][x] == 'b':
            g[y][x] = '.'
for x in range(FARM_X, FARM_X + 13):   # the east end of the same forest, above the farm
    for y in range(4, H - 1):
        if g[y][x] == 'b':
            g[y][x] = '.'


def hedge(*rects):
    for x0, y0, x1, y1 in rects:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if g[y][x] == '.':
                    g[y][x] = 'b'


def dirt(*rects):
    """Bare earth patches, like the sandy squares in the guide picture."""
    for x0, y0, x1, y1 in rects:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if g[y][x] == '.':
                    g[y][x] = ':'



# wide dirt roads and bare patches like the guide picture: more room to walk
dirt((25, 8, 43, 8), (26, 9, 27, 11), (44, 8, 52, 8), (20, 8, 22, 9), (28, 11, 31, 13), (39, 11, 42, 12), (49, 9, 51, 9),
     (53, 10, 54, 11), (5, 5, 6, 6))


# ---- the deep forest trail (the user wanted to go INTO the big forest) ------------------------------
# Written in this map's own columns (0-43 is the forest above the woods). A path comes north out of
# the woods' quiet clearing (woods column 16), passes a mushroom-ring clearing, a side nook with a
# chest, and a fairy glade with a tiny pond, then runs east and comes out in the meadows north of
# the lily pond, joining the meadow trail. Nature has no straight lines: the clearings wobble.
def carve(cells, ch):
    for x, y in cells:
        g[y][x] = ch


def blob(shape, ch='.'):
    carve([(x, y) for y, (a, b) in shape.items() for x in range(a, b + 1)], ch)


def path(points):
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
    carve(cells, ':')


blob({9: (14, 18), 10: (13, 19), 11: (12, 20), 12: (12, 20), 13: (13, 19)})        # the mushroom ring
blob({10: (5, 8), 11: (4, 9), 12: (5, 9), 13: (6, 8)})                              # the hidden nook
blob({8: (32, 35), 9: (32, 35), 10: (31, 36), 11: (30, 37), 12: (30, 37), 13: (31, 36), 14: (32, 35)})  # the fairy glade
blob({11: (33, 34), 12: (33, 34)}, '~')                                            # its tiny pond
path([(16, 17), (16, 13)])                                    # up from the woods' quiet clearing
path([(12, 11), (9, 11)])                                     # west to the hidden nook
path([(20, 11), (25, 11), (25, 7), (C(10), 7)])               # east through the trees to the meadows
path([(33, 7), (33, 9)])                                      # down into the fairy glade

# ---- hedge room walls (drawn last, so the trails and clearings above are never covered) -------------
# Wobbly bush walls (hedges.py) hang down from the top forest and up from the bottom forest, so the
# meadow becomes a row of small rooms joined by winding gaps: the hidden nook, the mushroom ring and the
# fairy glade are rooms of their own now. The wobble is seeded, so the map is the same every time.
rnd = random.Random(29092026)
# hand-placed things in north_objects.py that stand where a wall passes: the wall goes round them
KEEP = {(18, 13), (19, 12), (20, 12), (6, 13), (32, 13)}
for pts in [
    # below the road (this map's columns): free-standing walls, with a lane left open along the bottom forest
    [(10, 12), (10, 13)], [(4, 13), (7, 13)], [(12, 13), (14, 13)], [(18, 13), (21, 13)], [(23, 9), (23, 13)],
    [(25, 13), (27, 13)], [(31, 13), (31, 14), (36, 14)], [(42, 13), (47, 13)],
    [(45, 9), (48, 9), (48, 11)], [(50, 13), (52, 13)],
    # above the road: walls hanging down from the top forest
    [(12, 6), (12, 9)], [(21, 5), (21, 6)], [(28, 4), (28, 6)], [(35, 4), (35, 6)], [(42, 4), (42, 6)],
    [(48, 4), (48, 6)],
    # the meadow above the farm, west of the farm trail (farm columns)
    [(C(17), 15), (C(19), 15)], [(C(26), 13), (C(26), 16)], [(C(22), 3), (C(22), 5)], [(C(30), 14), (C(30), 16)],
]:
    wall(g, rnd, pts, keep=KEEP)
tidy(g, keep=KEEP)

rows = [''.join(r) for r in g]


def lint():
    """Warn about tiles that would draw badly: lone tiles and corner-only joins."""
    out = []
    water = lambda x, y: 0 <= x < W and 0 <= y < H and rows[y][x] in '~=|o'
    forest = lambda x, y: 0 <= x < W and 0 <= y < H and rows[y][x] == 'b'
    for name, kind in (('water', water), ('forest', forest)):
        for y in range(H):
            for x in range(W):
                if kind(x, y):
                    n = sum(kind(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    if n <= 1 and not (x in (0, W - 1) or y in (0, H - 1)):
                        out.append(f'{name} tile at {x},{y} (farm column {x - FARM_X}) has {n} neighbour(s)')
        for y in range(H - 1):
            for x in range(W - 1):
                a, b, c, d = kind(x, y), kind(x + 1, y), kind(x, y + 1), kind(x + 1, y + 1)
                if (a and d and not b and not c) or (b and c and not a and not d):
                    out.append(f'{name} tiles meet only at a corner at {x},{y} (farm column {x - FARM_X})')
    return out


if __name__ == '__main__':
    for w in lint():
        print('LINT:', w)
    print('   ' + ''.join(str(x % 10) for x in range(W)))
    for i, r in enumerate(rows):
        print(f'{i:2d} {r}')
