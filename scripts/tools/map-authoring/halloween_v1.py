"""Paints the ground of Pumpkin Hollow (region "halloween", 46 x 58 tiles), the Halloween island west
of the West Woods, as a text map.

Own layout (2026-09-30): an island across a narrow strait from the woods. The bridge comes from the dirt
trail through the woods' west hedge wall (woods rows 22-23 = this map's rows 40-41) and lands in a small
hedged Landing room; the arch gate in its north wall opens onto the Hollow Road. Rooms, split by wobbly
hedge walls (hedges.py) like the West Woods:
  north-west  the Haunted House, with a lantern path
  north-east  Moon Pond, with a pier, owls and wisps
  middle      the Pumpkin Patch (iron-fenced field, scarecrow, pumpkin house)
  west        Witch's Glade (cottage, cauldron, glowing mushrooms)
  south-west  the Graveyard (iron fence, graves, crypt, crows)
  south       Candy Lane down to the south beach and pier
The ground pictures are swapped for the dusky Halloween ones by the region's "tiles" key (terrain.js).
halloween_objects.py imports `rows`, adds objects, friends and animals, checks them and writes the JSON.

Map key: ~ water, . grass, , darker grass, : dirt trail, b hedge, f / F fence, = bridge east-west,
| bridge or pier north-south.
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from hedges import wall, lump, seal, tidy as tidy_hedges  # noqa: E402

W, H = 46, 58
g = [['~'] * W for _ in range(H)]
rnd = random.Random(31102026)

BRIDGE_ROW = 40          # = woods row 22, where the woods' west trail meets the strait
LANDING = (40, 40)       # first land tile west of the bridge
START = (45, 40)         # the bridge's east end, next to the woods
GATE = (33, 36)          # the arch gate's middle (walk through it north-south); posts at x-1 and x+1

# ---- the coast: land from xmin to xmax on each row, with a slow wobble ------------------------------
KEY = [(2, 14, 30), (4, 8, 37), (8, 5, 39), (13, 2, 40), (19, 7, 40), (25, 2, 40), (32, 6, 40), (38, 2, 40), (44, 5, 40), (50, 6, 39), (53, 9, 36), (55, 14, 31)]


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


wa, wb = walk(H, 3), walk(H, 1)
for y in range(H):
    r = interp(y)
    if not r:
        continue
    a = int(round(r[0])) + wa[y]
    b = min(41, int(round(r[1])) + wb[y])   # the strait keeps at least 4 tiles of water on this map
    if 37 <= y <= 43:
        b = 40                                # a straight bit of shore at the bridge
    for x in range(max(a, 1), b + 1):
        g[y][x] = '.'
for x in range(LANDING[0] + 1, W):
    g[BRIDGE_ROW][x] = '='


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
    carve([(x, y) for x, y in cells if g[y][x] in '.,:'], ch)


def fence_ring(x0, y0, x1, y1, gates):
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            if (x, y) in gates:
                g[y][x] = ':'
            elif x in (x0, x1) or y in (y0, y1):
                g[y][x] = 'F' if g[y][x] == ':' else 'f'


# ---- darker grass patches first (only on plain grass), so rooms look mottled ---------------------------
for cx, cy, rx, ry in [(8, 12, 4, 3), (30, 5, 3, 1), (13, 25, 3, 2), (8, 44, 3, 3), (27, 44, 3, 2), (36, 50, 2, 1), (25, 21, 2, 2)]:
    lump(g, rnd, cx, cy, rx, ry, ch=',')

# ---- water: Moon Pond (north-east) ---------------------------------------------------------------------
blob({6: (28, 34), 7: (27, 35), 8: (26, 36), 9: (26, 36), 10: (26, 36), 11: (27, 35), 12: (28, 34)}, '~')
blob({8: (30, 32), 9: (30, 32), 10: (30, 32)}, '.')      # a tiny island in the pond (an owl's dead tree)

# ---- trails --------------------------------------------------------------------------------------------
path([LANDING, (33, 40), (33, 29)])                          # landing -> through the gate -> the Hollow Road
path([(36, 29), (6, 29)])                                     # the Hollow Road, east-west across the middle
path([(20, 29), (20, 16), (12, 16), (12, 12)])                # north to the Haunted House (lantern path)
path([(20, 16), (31, 16), (31, 13)])                          # east to Moon Pond and its pier
path([(10, 29), (10, 26)])                                     # Witch's Glade: up to the cottage door
path([(27, 29), (27, 27)])                                     # the Pumpkin Patch gate
path([(36, 29), (36, 25)])                                     # the pumpkin house
path([(12, 29), (12, 36)])                                     # south to the Graveyard gate
path([(22, 29), (22, 50), (35, 50), (35, 48)])                # Candy Lane, south, then east to the owl corner
path([(22, 50), (22, 53)])                                     # down to the south pier
path([(7, 16), (12, 16)])                                      # west side of the house garden
for y in (54, 55):
    g[y][22] = '|'
for y in (11, 12):
    g[y][31] = '|'                                              # Moon Pond pier, from the shore out to the owl's island

# ---- fenced places --------------------------------------------------------------------------------------
fence_ring(22, 19, 32, 27, {(27, 27)})                         # the Pumpkin Patch (gate on the south side)
fence_ring(7, 36, 19, 47, {(12, 36)})                          # the Graveyard (gate on the north side)
path([(12, 36), (12, 38)])

# ---- hedge walls (wobbly, 2-3 thick): they split the island into rooms -----------------------------------
# tiles that must stay grass: the gate's posts and middle, doorways, the landing
KEEP = {(GATE[0] - 1, GATE[1]), GATE, (GATE[0] + 1, GATE[1]), (GATE[0] - 1, GATE[1] + 1), (GATE[0] + 1, GATE[1] + 1),
        (GATE[0] - 1, GATE[1] - 1), (GATE[0] + 1, GATE[1] - 1)}
walls = [
    [(23, 2), (23, 13)],                                  # Haunted House | Moon Pond
    [(2, 19), (17, 19)], [(23, 17), (33, 17)],            # north rooms | the middle (gap for the road at x 18-22)
    [(17, 20), (17, 27)],                                 # Witch's Glade | Pumpkin Patch
    [(2, 33), (10, 33)], [(14, 33), (19, 33)],             # the road | the Graveyard side
    [(24, 32), (30, 32)],                                 # the road | Candy Lane east
    [(24, 36), (31, 36)], [(35, 36), (41, 36)],           # the Landing's north wall (the gate in the middle)
    [(30, 37), (30, 45)],                                 # the Landing's west wall
    [(30, 45), (41, 45)],                                 # the Landing's south wall
    [(34, 18), (41, 18)],                                 # behind the pumpkin house
    [(19, 38), (19, 51)],                                 # Graveyard | Candy Lane (outside the fence)
]
for pts in walls:
    wall(g, rnd, pts, keep=KEEP)
# a few round hedge clumps in the bigger rooms (nature: no straight lines)
for cx, cy, rx, ry in [(6, 7, 1, 1), (4, 24, 1, 1), (27, 40, 1, 1), (37, 52, 1, 0)]:
    lump(g, rnd, cx, cy, rx, ry)
# The Landing must be shut in (only the bridge and the gate lead out), whatever the wobble did.
for x0, y0, x1, y1 in [(24, 35, 31, 37), (35, 35, 41, 37), (30, 37, 31, 45), (30, 44, 41, 45)]:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] in '.,' and (x, y) not in KEEP:
                g[y][x] = 'b'
tidy_hedges(g, keep=KEEP)
STUCK = seal(g, START, (0, 0, W - 1, H - 1), keep=KEEP)
rows = [''.join(r) for r in g]

if __name__ == '__main__':
    print('stuck:', STUCK)
    print('   ' + ''.join(str(x % 10) for x in range(W)))
    for i, r in enumerate(rows):
        print(f'{i:2d} {r}')
