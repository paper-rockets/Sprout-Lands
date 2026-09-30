"""Paints the ground of the West Woods (region "woods", 44 x 40 tiles) as a text map.

Laid out from map-drafts/west-woods-streams.png (layout only): thick forest along the west, the
north and the east, a small farm top left, a stream winding down the middle into ponds, a pond
with a little island, lagoons opening to the sea, a beach with a pier and a quiet clearing in the
north-west for the forest quest. Every number below was chosen by hand. woods_objects.py imports
`rows` from here, adds objects, animals and things to find, checks them and writes woods.json.

Map key (same as the farm): ~ water, . grass, : sand or trail, b forest, f / F fence, = bridge going
east-west, | bridge going north-south, o stepping stones.
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from hedges import wall, seal, tidy as tidy_hedges  # noqa: E402

W, H = 44, 40
g = [['~'] * W for _ in range(H)]


def spans(pairs):
    """[(first, last, value), ...] -> dict indexed by position."""
    out = {}
    for a, b, v in pairs:
        for i in range(a, b + 1):
            out[i] = v
    return out


# ---- land: everything above the coast, per column (last land row) -------------------------------
southLast = spans([(0, 1, 36), (2, 3, 35), (4, 6, 34), (7, 8, 33), (9, 12, 33), (13, 15, 34), (16, 18, 35), (19, 22, 36),
                   (23, 26, 37), (27, 29, 36), (30, 32, 35), (33, 35, 34), (36, 38, 33), (39, 43, 33)])
for x in range(W):
    for y in range(0, southLast[x] + 1):
        g[y][x] = '.'

# ---- forest: top band, west band, east band ---------------------------------------------------
top = spans([(0, 6, 5), (7, 9, 4), (10, 11, 3), (12, 21, 3), (22, 23, 4), (24, 26, 4), (27, 37, 3), (38, 43, 3)])
for x, t in top.items():
    for y in range(t):
        g[y][x] = 'b'
westLast = spans([(3, 3, 5), (4, 5, 3), (6, 6, 2), (7, 7, 2), (8, 9, 3), (10, 11, 4), (12, 12, 3), (13, 14, 2), (15, 16, 3),
                  (17, 18, 4), (19, 20, 3), (21, 22, 2), (23, 24, 3), (25, 26, 4), (27, 27, 4), (28, 29, 3), (30, 31, 4),
                  (32, 33, 3), (34, 35, 2), (36, 36, 1)])
for y, last in westLast.items():
    for x in range(0, last + 1):
        if g[y][x] == '.':
            g[y][x] = 'b'
# the east band: first forest column per row (rows 12-16 stay open: the way in from the farm)
eastFirst = spans([(7, 7, 39), (8, 8, 38), (9, 10, 39), (11, 11, 38), (17, 17, 40), (18, 19, 39), (20, 21, 40), (22, 24, 41),
                   (25, 25, 40), (26, 27, 39), (28, 29, 38), (30, 30, 37), (31, 31, 38), (32, 32, 39), (33, 33, 40)])
for y, first in eastFirst.items():
    for x in range(first, W):
        if g[y][x] == '.':
            g[y][x] = 'b'
# the sea-side corner of the east band is left as beach

# ---- water: the river comes in from the farm, turns south as a stream, opens into a pond -----
stream = {4: (30, 43), 5: (28, 43), 6: (27, 43), 7: (27, 33), 8: (26, 32), 9: (26, 31), 10: (25, 31), 11: (25, 30), 12: (24, 30),
          13: (24, 30), 14: (24, 29), 15: (24, 29), 16: (25, 30), 17: (26, 31), 18: (26, 32), 19: (27, 32), 20: (27, 33),
          21: (26, 33), 22: (25, 34), 23: (24, 35), 24: (23, 35), 25: (23, 34), 26: (24, 33), 27: (25, 31), 28: (27, 30)}
for y, (a, b) in stream.items():
    for x in range(a, b + 1):
        g[y][x] = '~'
# the west pond with the island in it
pond = {17: (13, 19), 18: (11, 21), 19: (10, 22), 20: (10, 22), 21: (10, 22), 22: (11, 21), 23: (12, 20), 24: (14, 18)}
for y, (a, b) in pond.items():
    for x in range(a, b + 1):
        g[y][x] = '~'
island = {19: (15, 17), 20: (14, 18), 21: (15, 17)}
for y, (a, b) in island.items():
    for x in range(a, b + 1):
        g[y][x] = '.'
# the south-west lagoons: a bay cut into the land, and a second one east of it
lagoonA = {27: (6, 12), 28: (5, 14), 29: (5, 15), 30: (5, 16), 31: (6, 17), 32: (7, 15), 33: (9, 13)}
for y, (a, b) in lagoonA.items():
    for x in range(a, b + 1):
        g[y][x] = '~'
lagoonB = {29: (19, 22), 30: (18, 24), 31: (18, 24), 32: (19, 24), 33: (20, 23)}
for y, (a, b) in lagoonB.items():
    for x in range(a, b + 1):
        g[y][x] = '~'
# the island with the big red mushroom, in lagoon A
for y, (a, b) in {29: (8, 10), 30: (7, 11), 31: (8, 10)}.items():
    for x in range(a, b + 1):
        g[y][x] = '.'
# a tiny island out at sea, south of the beach (for the mushroom and a rock)
for y, (a, b) in {36: (14, 17), 37: (13, 18), 38: (14, 17)}.items():
    for x in range(a, b + 1):
        g[y][x] = '.'

# bush clumps on the stream banks, like the hedges in the guide picture
def bushes(cells):
    for x, y in cells:
        if g[y][x] == '.':
            g[y][x] = 'b'


bushes([(20, 8), (21, 8), (22, 8), (23, 8), (21, 9), (22, 9), (23, 9), (23, 10)])
bushes([(20, 17), (21, 17), (22, 17), (22, 18), (23, 18), (23, 19)])
bushes([(32, 10), (33, 10), (33, 11), (34, 11), (34, 12)])
bushes([(31, 24), (31, 25), (32, 26)])
# forest inlets poking out so the edge is never a wall
bushes([(5, 12), (6, 12), (5, 24), (6, 24), (6, 25), (5, 29)])
bushes([(4, 19), (5, 19)])


def sand(cells):
    for x, y in cells:
        if g[y][x] in '.,':
            g[y][x] = ':'


TRAIL_CELLS = []


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
    TRAIL_CELLS.extend(cells)


# ---- trails ----------------------------------------------------------------------------------
# the way in from the farm, along row 14, over the stream on a bridge, to the west bank
trail([(43, 14), (36, 14), (36, 13), (32, 13), (32, 14), (31, 14)])
# to the gate of the small farm
trail([(23, 14), (21, 14), (21, 15), (19, 15), (19, 16), (12, 16), (12, 15)])
# north to the quiet clearing (it fills x 12-19, y 3-8; the trail arrives at its east side)
trail([(20, 15), (20, 6), (19, 6)])
# south along the west bank of the stream, round lagoon B, to the beach
trail([(22, 15), (22, 17), (23, 17), (23, 22), (22, 22), (22, 27), (24, 27), (24, 28), (26, 28), (26, 34)])
# west round the pond to the bridge for the mushroom island
trail([(12, 16), (8, 16), (8, 26), (9, 26)])
# widen every trail to two tiles (a second tile to the east or south, where it is plain grass): more room to walk
for x, y in list(TRAIL_CELLS):
    for nx, ny in ((x + 1, y), (x, y + 1)):
        if 0 <= nx < W and 0 <= ny < H and g[ny][nx] == '.':
            g[ny][nx] = ':'
# the beach: sand along the south coast
for x in range(13, 36):
    for y in range(southLast[x] - 1, southLast[x] + 1):
        if g[y][x] == '.':
            g[y][x] = ':'
for x in range(9, 13):
    if g[33][x] == '.':
        g[33][x] = ':'
for x in range(36, 44):
    for y in (32, 33):
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


# the small farm at the top left: a fenced yard with vegetable plots, a house and a well
fence_ring(6, 9, 17, 15, {(12, 15)}, ':')

# ---- bridges and stones ------------------------------------------------------------------------
for x in range(24, 31):            # over the stream where the way in crosses it (row 14)
    g[14][x] = '='
g[14][23] = ':'
g[14][30] = ':'
g[14][31] = ':'
for y in (17, 18):                 # to the island with the treasure
    g[y][16] = '|'
for y in (27, 28):                 # to the little island with the big red mushroom
    g[y][9] = '|'
for y in range(35, 38):            # the pier
    g[y][24] = '|'

# ---- hedge rooms (user's guide picture, 2026-09-29) ----------------------------------------------
# Instead of one big mass of trees, thick bush walls split the grass into small rooms and winding
# paths, with single trees standing in the rooms (placed by woods_objects.py). Only grass becomes
# hedge, so trails, fences, bridges and water are never covered.
def hedge(*rects):
    for x0, y0, x1, y1 in rects:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if g[y][x] == '.':
                    g[y][x] = 'b'


hedge((10, 4, 11, 7), (9, 4, 9, 5))                    # west wall of the quiet clearing (gap at the bottom to the mossy corner)
hedge((21, 3, 23, 5), (22, 6, 22, 6))                  # east of the clearing: a pocket for the berry bush
hedge((14, 26, 17, 27), (15, 28, 18, 28))              # between the pond and the two lagoons
hedge((36, 24, 40, 26))                              # closes the orchard off from the south meadow
hedge((38, 19, 39, 21))                                # a bulge in the orchard's east wall
hedge((35, 29, 37, 31))                                # a bulge into the south meadow
hedge((35, 8, 38, 8), (36, 9, 38, 10))                 # a bulge north of the way in
hedge((3, 20, 5, 21))                                  # a bulge into the west trail meadow


def dirt(*rects):
    """Bare earth patches, like the sandy squares in the guide picture."""
    for x0, y0, x1, y1 in rects:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if g[y][x] == '.':
                    g[y][x] = ':'


dirt((14, 5, 16, 6), (32, 21, 33, 22), (11, 24, 12, 25), (30, 7, 31, 7))


def tidy():
    """Smooth the hand-drawn shapes: a lone forest or water tile becomes grass, and two tiles that only
    touch at a corner get a third tile so the join is solid. Repeats until nothing changes."""
    kinds = (('b', 'b', '.'), ('~=|', '~', '.'))
    changed = True
    while changed:
        changed = False
        for members, fill, gone in kinds:
            is_ = lambda x, y: 0 <= x < W and 0 <= y < H and g[y][x] in members
            for y in range(H):
                for x in range(W):
                    if g[y][x] in members and g[y][x] == fill and not (fill == '~' and (x in (0, W - 1) or y in (0, H - 1))):
                        n = sum(is_(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                        if n <= 1 and not (fill == 'b' and y <= 2):
                            g[y][x] = gone
                            changed = True
            for y in range(H - 1):
                for x in range(W - 1):
                    a, b, c, d = is_(x, y), is_(x + 1, y), is_(x, y + 1), is_(x + 1, y + 1)
                    if a and d and not b and not c and g[y][x + 1] in '.:,':
                        g[y][x + 1] = fill
                        changed = True
                    elif b and c and not a and not d and g[y][x] in '.:,':
                        g[y][x] = fill
                        changed = True


tidy()
# woods_objects.py scatters its flowers and trees on the map as it was before the east band below was
# opened, so the random layout everywhere else in the woods stays exactly the same
rows_before_band = [''.join(r) for r in g]

# ---- the east band as hedge rooms (2026-09-29, same look as the farm's west forest next to it) ----
# The solid forest along the east edge (columns 36-43, below the top band) becomes grass, except the
# hand-drawn hedges above, then wobbly bush walls (hedges.py) make small rooms that carry on the farm's
# walls across the border. Only the newly opened tiles can change, so nothing else in the woods moves.
HAND_HEDGES = {(x, y) for x0, y0, x1, y1 in ((36, 24, 40, 26), (38, 19, 39, 21), (35, 29, 37, 31), (35, 8, 38, 8), (36, 9, 38, 10))
               for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
BAND = {(x, y) for y in range(3, 34) for x in range(36, W) if g[y][x] == 'b' and (x, y) not in HAND_HEDGES}
for x, y in BAND:
    g[y][x] = '.'
FIXED = {(x, y) for y in range(H) for x in range(W)} - BAND  # everything else stays as it is
rnd = random.Random(20260929)
for pts in [
    [(40, 20), (43, 20)],   # joins the orchard's east bulge to the farm's wall: a room above it, a room below
    [(40, 29), (43, 29)],   # splits the south meadow's east corner
]:
    wall(g, rnd, pts, keep=FIXED)
tidy_hedges(g, keep=FIXED)
seal(g, (43, 14), (36, 3, W - 1, 33), keep=FIXED)
tidy_hedges(g, keep=FIXED)
rows = [''.join(r) for r in g]


def lint():
    """Warn about tiles that would draw badly: lone tiles and corner-only joins."""
    out = []
    water = lambda x, y: 0 <= x < W and 0 <= y < H and rows[y][x] in '~=|'
    forest = lambda x, y: 0 <= x < W and 0 <= y < H and rows[y][x] == 'b'
    for name, kind in (('water', water), ('forest', forest)):
        for y in range(H):
            for x in range(W):
                if kind(x, y):
                    n = sum(kind(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    if n <= 1 and not (name == 'water' and (x in (0, W - 1) or y in (0, H - 1))):
                        out.append(f'{name} tile at {x},{y} has {n} neighbour(s)')
        for y in range(H - 1):
            for x in range(W - 1):
                a, b, c, d = kind(x, y), kind(x + 1, y), kind(x, y + 1), kind(x + 1, y + 1)
                if (a and d and not b and not c) or (b and c and not a and not d):
                    out.append(f'{name} tiles meet only at a corner at {x},{y}')
    return out



if __name__ == '__main__':
    for w in lint():
        print('LINT:', w)
    print('   ' + ''.join(str(x % 10) for x in range(W)))
    for i, r in enumerate(rows):
        print(f'{i:2d} {r}')
