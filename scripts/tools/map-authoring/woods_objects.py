"""Hand-placed things for the West Woods, plus checks: every object stands on the right ground, nothing
solid sits on a trail, the quiet clearing stays empty, and the player can reach every important spot from
the way in. Writes the map and objects into world/regions/woods.json.

    py scripts/tools/map-authoring/woods_objects.py

The ground is drawn by woods_v1.py. Flowers, ferns, mushrooms and most trees are scattered by a seeded
random generator (so the woods look the same every time); everything else is placed by hand below.
"""
from favourites import add_favourites
from hedges import wobble_west
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
# the scatter below runs on the map as it was before the east band became hedge rooms (so the random
# layout stays the same); the finished map is swapped in right after it
from woods_v1 import rows_before_band as rows, rows as rows_final, BAND  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
ART = json.load(open(os.path.join(ROOT, 'src/content/starter-adventure/art.json'), encoding='utf-8'))
REGION = os.path.join(ROOT, 'src/content/starter-adventure/world/regions/woods.json')
H, W = len(rows), len(rows[0])
CLEARING = (12, 3, 19, 8)  # x0, y0, x1, y1 of the quiet clearing for the forest quest: nothing at all goes in it


def O(t, x, y):
    return {"type": t, "at": [x, y]}


# ---- hand-placed objects -----------------------------------------------------------------------
objects = [
    # the small farm at the top left: house, well, vegetable plots, sunflowers
    O("house_red", 10, 12), O("well", 14, 12),
    *[O("crop_cauliflower", x, y) for y in (10, 11) for x in range(13, 17)],
    *[O("crop_carrot", x, 13) for x in (7, 8, 9, 13, 14, 15, 16)],
    *[O("crop_wheat", x, 14) for x in (7, 8, 9, 13, 14, 15, 16)],
    O("crop_lettuce", 7, 10), O("crop_lettuce", 7, 11), O("crop_lettuce", 8, 10), O("crop_lettuce", 7, 12), O("crop_lettuce", 8, 11),
    O("sunflower", 5, 10), O("sunflower", 5, 13), O("sunflower_small", 18, 13), O("flower_pink", 5, 15), O("flower_yellow", 18, 10),
    O("bush", 4, 8), O("berry_bush_red", 18, 12), O("sign_flower", 11, 16), O("flower_white", 19, 14),
    # the treasure island in the west pond
    O("tree_round", 18, 20), O("chest", 14, 20), O("flower_pink", 15, 19), O("flower_yellow", 17, 21), O("tuft", 17, 19),
    O("lilies", 12, 18), O("lily_flower", 20, 19), O("lily", 12, 22), O("lilypads", 20, 22), O("reed_tall", 11, 21), O("reed", 21, 20),
    O("water_rock", 13, 23), O("reeds_lilies", 19, 23),
    # the mushroom island in lagoon A
    O("mushroom_big", 9, 30), O("chest", 11, 30), O("flower_blue", 8, 30), O("mushrooms_red", 10, 29), O("fern", 9, 31), O("lily", 7, 28),
    O("reed_tall", 12, 28), O("water_rocks", 6, 30), O("lilies", 13, 31), O("reed", 14, 30),
    # the tiny peninsula south of the beach
    O("chest", 15, 37), O("mushroom_red", 16, 36), O("rock", 17, 37), O("flower_pink", 14, 36), O("tuft", 16, 38),
    # lagoon B
    O("lily", 21, 30), O("lily_flower", 23, 32), O("reed_tall", 19, 31), O("water_rock", 22, 33), O("lilies", 21, 31),
    # the stream and the bay where the river comes in
    O("lilies", 30, 5), O("lily_flower", 34, 5), O("lily", 38, 6), O("reed_tall", 41, 4), O("water_rock", 36, 5), O("lilypads", 29, 6),
    O("reeds_lilies", 28, 9), O("lily", 27, 12), O("reed", 26, 17), O("lily_flower", 28, 19), O("lilies", 30, 21), O("reed_tall", 26, 22),
    O("water_rock", 31, 23), O("lilypads", 27, 25), O("lily", 33, 24), O("reed", 24, 25),
    # the beach, the pier and the sea
    O("sign_fish", 23, 36), O("log", 30, 34), O("rock", 29, 35), O("pebble", 33, 34), O("stump_small", 27, 34), O("campfire_logs", 31, 34),
    O("log_small", 29, 33), O("log_small", 32, 32), O("picnic_blanket", 35, 33), O("picnic_basket", 34, 32),
    O("water_rock", 20, 38), O("water_rocks", 31, 37), O("pebble", 19, 35),
    # a mossy corner in the north-west, and stumps and logs in the trees
    O("boulder_mossy", 7, 5), O("log_mossy", 7, 4), O("stump_big", 8, 7), O("stump", 5, 6), O("mushrooms_purple", 4, 6),
    O("boulder", 6, 20), O("log_mossy", 6, 23), O("stump", 6, 26), O("mushrooms_red", 6, 25), O("fern_big", 5, 22),
    O("stump_wide", 34, 29), O("log", 32, 31), O("rock_b", 35, 27),
    # markers on the trail junctions
    O("sign", 21, 15), O("sign", 35, 15),
    # berry bushes and a beehive to raid
    O("berry_bush_red", 25, 4), O("berry_bush_blue", 22, 12), O("berry_bush_purple", 25, 18), O("berry_bush_red", 31, 16),
    O("berry_bush_blue", 34, 26), O("berry_bush_purple", 7, 25), O("beehive", 33, 28),
]

SAND_OK = {'crop_cauliflower', 'crop_carrot', 'crop_pumpkin', 'crop_wheat', 'crop_lettuce', 'rock', 'pebble', 'log', 'log_small',
           'sign_fish', 'sign', 'sign_flower', 'tuft', 'campfire_logs', 'picnic_blanket', 'picnic_basket', 'stump_small',
           'house_red', 'well', 'sunflower_small', 'flower_white'}
WATER_TYPES = {'lily', 'lilies', 'lily_flower', 'lilypads', 'reed', 'reed_small', 'reed_tall', 'reeds_lilies', 'water_rock',
               'water_rock_small', 'water_rocks', 'water_rock_big', 'boat', 'boat_float'}

# Things to use with the Talk button or E. Trees, bushes and hives need an object on the same tile.
interactables = [
    {"kind": "fishing", "at": [24, 37], "cast": [24, 38]},
    {"kind": "bush", "at": [25, 4], "item": "raspberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [22, 12], "item": "blueberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [25, 18], "item": "blueberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [31, 16], "item": "raspberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [34, 26], "item": "blueberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [7, 25], "item": "raspberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [18, 12], "item": "raspberry", "count": [1, 3], "cooldown": 30},
    {"kind": "hive", "at": [33, 28], "item": "honey", "cooldown": 90},
    {"id": "woods-chest-pond", "kind": "chest", "color": "gold", "at": [14, 20], "reward": {"coins": [8, 14], "item": "ruby"}},
    {"id": "woods-chest-mushroom", "kind": "chest", "color": "cherry", "at": [11, 30], "reward": {"coins": [5, 9], "item": "amethyst"}},
    {"id": "woods-chest-beach", "kind": "chest", "color": "silver", "at": [15, 37], "reward": {"coins": [5, 9], "item": "emerald"}},
]
# Fruit trees you can shake (each needs a matching tree picture on its tile).
FRUIT = [("tree_apple", "apple", 35, 19), ("tree_orange", "orange", 35, 21), ("tree_pear", "pear", 37, 22), ("tree_peach", "peach", 33, 17),
         ("tree_apple", "apple", 7, 21), ("tree_pear", "pear", 6, 7), ("tree_orange", "orange", 21, 24), ("tree_peach", "peach", 5, 18)]
for tree, item, x, y in FRUIT:
    objects.append(O(tree, x, y))
    interactables.append({"kind": "tree", "at": [x, y], "item": item, "count": [1, 3], "cooldown": 40})

# Animals that only wander about (color picks a version from art.json creatures: 0 is the first).
critters = [
    {"kind": "hen", "color": 1, "at": [10, 14], "radius": 3}, {"kind": "hen", "color": 3, "at": [15, 14], "radius": 2},
    {"kind": "chick", "color": 2, "at": [12, 13], "radius": 2},
    {"id": "woods-cow-1", "kind": "cow", "color": 2, "at": [36, 21], "radius": 4}, {"kind": "calf", "color": 1, "at": [36, 22], "follow": "woods-cow-1"},
    {"id": "woods-cow-2", "kind": "cow", "color": 4, "at": [34, 30], "radius": 3},
    {"kind": "hen", "color": 4, "at": [20, 24], "radius": 3},
    {"kind": "hen", "color": 0, "at": [8, 24], "radius": 3}, {"kind": "chick", "color": 3, "at": [9, 25], "radius": 2},
    {"kind": "calf", "color": 3, "at": [38, 15], "radius": 3},
]
# Small things that make the world feel alive.
life = [
    {"type": "frog", "at": [12, 22]}, {"type": "frog", "at": [20, 19], "color": 1}, {"type": "frog", "at": [28, 19]}, {"type": "frog", "at": [7, 28], "color": 1},
    {"type": "frog", "at": [21, 30]}, {"type": "frog", "at": [30, 5], "color": 1},
    {"type": "bee", "at": [17, 10], "radius": 2}, {"type": "bee", "at": [5, 12], "radius": 2}, {"type": "bee", "at": [35, 27], "radius": 3},
    {"type": "bee", "at": [15, 19], "radius": 2}, {"type": "bee", "at": [24, 5], "radius": 2},
    {"type": "fish", "at": [32, 5], "size": "big"}, {"type": "fish", "at": [39, 5], "size": "small"}, {"type": "fish", "at": [29, 10], "size": "small"},
    {"type": "fish", "at": [28, 17], "size": "medium"}, {"type": "fish", "at": [29, 23], "size": "big", "flip": True}, {"type": "fish", "at": [16, 22], "size": "small"},
    {"type": "fish", "at": [11, 20], "size": "small"}, {"type": "fish", "at": [13, 29], "size": "small", "flip": True},
    {"type": "fish", "at": [10, 38], "size": "medium"}, {"type": "fish", "at": [21, 37], "size": "small"}, {"type": "fish", "at": [28, 38], "size": "big", "flip": True},
    {"type": "fish", "at": [38, 37], "size": "medium"},
    {"type": "boat", "at": [27, 37]},
    {"type": "fire", "at": [31, 34]},
]
# One-time treasures lying about: walk over them to pick them up. Every id must be different.
pickups = [
    {"id": "woods-egg-1", "item": "egg-blue", "at": [4, 14]},
    {"id": "woods-egg-2", "item": "egg-pink", "at": [19, 9]},
    {"id": "woods-egg-3", "item": "egg-green", "at": [7, 17]},
    {"id": "woods-apple-1", "item": "apple", "at": [24, 20]},
    {"id": "woods-pear-1", "item": "pear", "at": [36, 18]},
    {"id": "woods-gem-1", "item": "emerald", "at": [5, 25]},
    {"id": "woods-gem-2", "item": "diamond", "at": [35, 9]},
    {"id": "woods-grapes-1", "item": "grapes", "at": [30, 30]},
]
landmarks = [
    {"name": "Woodland Farm", "at": [10, 12], "icon": "home"},
    {"name": "Treasure Pond", "at": [16, 20], "icon": "star"},
    {"name": "Mushroom Isle", "at": [9, 30], "icon": "heart"},
    {"name": "Stream Bridge", "at": [27, 14], "icon": "sprout"},
    {"name": "Woods Pier", "at": [24, 36], "icon": "dock"},
]
gates = [{"at": [12, 15]}]

START = (43, 14)  # the way in from the farm: the trail tile at the gap in the east wall of trees
MUST_REACH = {
    'way in': (43, 14), 'stream bridge west end': (23, 14), 'stream bridge east end': (30, 14), 'small farm gate': (12, 16), 'small farm door': (10, 13),
    'well': (14, 13), 'pond island bridge': (16, 19), 'pond chest side': (15, 20), 'mushroom island bridge': (9, 29), 'mushroom chest side': (10, 30),
    'peninsula chest side': (16, 37), 'pier end': (24, 37), 'beach': (33, 33), 'west trail': (8, 20), 'north trail': (20, 8),
    'clearing east side': (19, 6), 'clearing middle': (15, 5), 'clearing south-west corner': (12, 8), 'east bank': (34, 20), 'west bank': (23, 20),
    'south meadow': (30, 30),
}

# ---- scatter: flowers, tufts, ferns, mushrooms and trees ---------------------------------------
rnd = random.Random(20260929)
LAND = set('.,:fFb!?h^*')
WALK = set('.,:|=o')
solid = set()
used = set()
problems = []


def foot_cells(o):
    d = ART['objects'].get(o['type'])
    x, y = o['at']
    return [(x + dx, y + dy) for dx, dy in (d.get('foot', []) if d else [])]


# tiles the quest people and clues stand on (listed further down): the scatter keeps off them
used.update(tuple(p["at"]) for p in pickups)
used.update({(34, 15), (22, 10), (18, 9), (13, 16), (15, 5), (6, 31)})
for o in objects:
    used.add(tuple(o['at']))
    for c in foot_cells(o):
        solid.add(c)
        used.add(c)


def in_clearing(x, y, pad=0):
    return CLEARING[0] - pad <= x <= CLEARING[2] + pad and CLEARING[1] - pad <= y <= CLEARING[3] + pad


def near(x, y, chars, r=1):
    return any(0 <= x + dx < W and 0 <= y + dy < H and rows[y + dy][x + dx] in chars for dx in range(-r, r + 1) for dy in range(-r, r + 1))


def walkable(x, y):
    return 0 <= x < W and 0 <= y < H and rows[y][x] in WALK and (x, y) not in solid


def reach_from(start):
    seen = {start}
    todo = [start]
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in seen and walkable(nx, ny):
                seen.add((nx, ny))
                todo.append((nx, ny))
    return seen


def still_reachable():
    seen = reach_from(START)
    return all(p in seen for p in MUST_REACH.values())


grass = [(x, y) for y in range(H) for x in range(W) if rows[y][x] == '.']
rnd.shuffle(grass)

# trees: kept 3 tiles apart, off the trail, out of the clearing, and never in the way of anything important
TREES = ['tree_round', 'tree_round', 'tree_round', 'tree_small', 'tree_small', 'tree_big']
planted = [tuple(o["at"]) for o in objects if o["type"].startswith("tree")]
n_planted_start = len(planted)
for x, y in grass:
    if len(planted) >= 30:  # single trees in the hedge rooms, not a crowd (was 54)
        break
    kind = rnd.choice(TREES)
    if in_clearing(x, y, 1) or (x, y) in used or near(x, y, ':fF|=', 1) or near(x, y, '~', 1) and rnd.random() < 0.7:
        continue
    if any(max(abs(x - px), abs(y - py)) < 4 for px, py in planted):
        continue
    if x < 3 or x > W - 3:
        continue
    o = O(kind, x, y)
    cells = foot_cells(o)
    if any(not (0 <= cx < W and 0 <= cy < H and rows[cy][cx] == '.') or (cx, cy) in used or in_clearing(cx, cy, 1) for cx, cy in cells):
        continue
    saved = set(solid)
    solid.update(cells)
    if not still_reachable():
        solid.clear()
        solid.update(saved)
        continue
    objects.append(o)
    planted.append((x, y))
    used.update(cells)
    used.add((x, y))

# small flowers, tufts and ferns everywhere else on the grass; mushrooms and ferns near the forest edge
FLOWERS = ['flower_yellow', 'flower_pink', 'flower_white', 'flower_blue', 'tuft', 'flower_yellow_small', 'daisy', 'tulip_pink', 'lavender', 'bluebell', 'flower_purple', 'tuft_big', 'flowers_mix']
MOSSY = ['fern', 'fern_big', 'mushroom_red', 'mushroom_purple', 'mushrooms_red', 'mushrooms_purple', 'fern', 'fern']
count = 0
for x, y in grass:
    if count >= 200:
        break
    if in_clearing(x, y, 0) or (x, y) in used or rows[y][x] != '.':
        continue
    if near(x, y, 'fF', 1):
        continue
    edge = near(x, y, 'b', 2)
    pick = MOSSY if edge and rnd.random() < 0.55 else FLOWERS
    if rnd.random() < 0.35:
        objects.append(O(rnd.choice(pick), x, y))
        used.add((x, y))
        count += 1

# ---- the east band's hedge rooms (woods_v1.py, 2026-09-29) ------------------------------------------
# Swap in the finished map, then dress only the newly opened band with its own seeded scatter: single
# trees 4 apart from every tree (never in the last column by the farm; the farm keeps its trees 2 columns
# back, so trees stay 4 apart across the border), off trails and water, never cutting off reachable grass;
# then a few flowers and ferns.
rows = list(rows_final)
band_rnd = random.Random(20260929)
band = sorted((x, y) for x, y in BAND if rows[y][x] == '.')
band_rnd.shuffle(band)
open_before = reach_from(START)
for x, y in band:
    if x > W - 2 or (x, y) in used or any(max(abs(x - px), abs(y - py)) < 4 for px, py in planted):
        continue
    if near(x, y, ':fF|=o~', 1):
        continue
    solid.add((x, y))
    if reach_from(START) != open_before - {(x, y)}:
        solid.discard((x, y))
        continue
    objects.append(O(band_rnd.choice(['tree_round', 'tree_round', 'tree_small']), x, y))
    planted.append((x, y))
    used.add((x, y))
    open_before.discard((x, y))
for x, y in band:
    if (x, y) in used or near(x, y, 'fF', 1) or band_rnd.random() >= 0.3:
        continue
    objects.append(O(band_rnd.choice(MOSSY if near(x, y, 'b', 1) else FLOWERS), x, y))
    used.add((x, y))

# ---- the secret cove (the brief's hidden place) ----------------------------------------------------
# A little bridge from Mushroom Isle to the grassy corner west of it. A mossy log (a "blocker" in the
# entities list below) sits on it until "Lost in the Forest" is done and Pudding moves it (route
# "secret-cove" in world.json). The bridge is added after the scatter above, so the random layout of
# trees and flowers stays exactly the same; the one tree where the bridge lands is taken away.
COVE_BRIDGE = [(6, 31), (7, 31)]
COVE_CLEAR = {(5, 31), *COVE_BRIDGE}
for bx, by in COVE_BRIDGE:
    rows[by] = rows[by][:bx] + '=' + rows[by][bx + 1:]
# The deep forest trail: a path north out of the quiet clearing (column 16) through the forest wall
# into the North Meadows' forest (north_v1.py). Added after the scatter, like the bridge.
for ty in (0, 1, 2):
    rows[ty] = rows[ty][:16] + ':' + rows[ty][17:]
# The strip of grass west of the small farm is only one tile wide in places; two sunflowers there
# made it a dead end (the user could not walk along it), so they go.
STRIP_CLEAR = {(5, 10), (5, 13), (37, 7), *[(x, 3) for x in range(28, 44)]}  # plus trees on the one-tile riverbank strips in the north-east (row 7 now leads into the east band)
# The way west to Pumpkin Hollow (halloween_v1.py, 2026-09-30): a 2-wide dirt trail through the west hedge
# wall at rows 22-23, from the trail at col 8 to the map's edge, where the bridge across the strait starts.
# Then the west coast (the old world edge, straight) gets a wobble: 0-3 outer bush columns turn to water.
# Both come after the scatter, so no other tree or flower moves; anything on the trail is taken away.
WEST_GAP = {(x, y) for y in (22, 23) for x in range(0, 8)}
for x, y in WEST_GAP:
    rows[y] = rows[y][:x] + ':' + rows[y][x + 1:]
rows = wobble_west(rows, random.Random(3), keep=range(19, 27), most=3)
STRIP_CLEAR |= WEST_GAP
objects = [o for o in objects if not ({tuple(o['at']), *foot_cells(o)} & (COVE_CLEAR | STRIP_CLEAR))]
solid.clear()
for o in objects:
    solid.update(foot_cells(o))
interactables.append({"id": "woods-chest-cove", "kind": "chest", "color": "oak", "at": [5, 34], "reward": {"coins": [15, 25], "item": "diamond"}})
landmarks.append({"name": "Secret Cove", "at": [4, 33], "icon": "question"})
MUST_REACH['secret cove'] = (5, 32)
MUST_REACH["secret cove chest side"] = (4, 34)
MUST_REACH['way west to Pumpkin Hollow'] = (0, 22)

# ---- checks ------------------------------------------------------------------------------------
by_tile = {}
for o in objects:
    by_tile.setdefault(tuple(o['at']), []).append(o['type'])
for o in objects:
    d = ART['objects'].get(o['type'])
    x, y = o['at']
    if not d:
        problems.append(f"unknown object {o['type']}")
        continue
    if not (0 <= x < W and 0 <= y < H):
        problems.append(f"{o['type']} at {x},{y} is outside the map")
        continue
    ch = rows[y][x]
    if o['type'] in WATER_TYPES:
        if ch != '~':
            problems.append(f"{o['type']} at {x},{y} is not on water ({ch!r})")
        continue
    if ch not in LAND or ch == 'b':
        problems.append(f"{o['type']} at {x},{y} is not on open land ({ch!r})")
    if ch in ':Ff' and o['type'] not in SAND_OK:
        problems.append(f"{o['type']} at {x},{y} sits on a trail, sand or fence ({ch!r})")
    if in_clearing(x, y) and o['type'] not in ():
        problems.append(f"{o['type']} at {x},{y} is inside the quiet clearing, which must stay empty")
    for fx, fy in foot_cells(o):
        c = rows[fy][fx]
        if c not in '.,' and not (c == ':' and o['type'] in SAND_OK):
            problems.append(f"{o['type']} at {x},{y}: solid part lands on {c!r} at {fx},{fy}")
if len({tuple(o['at']) for o in objects}) != len(objects):
    dupes = [t for t, v in by_tile.items() if len(v) > 1]
    problems.append(f"two objects share a tile: {dupes[:6]}")

seen = reach_from(START)
for name, p in MUST_REACH.items():
    if p not in seen:
        problems.append(f"can't reach {name} {p} from the way in")

trees = [o for o in objects if o['type'].startswith('tree') or o['type'].startswith('blossom_tree')]
for i, a in enumerate(trees):
    for b in trees[i + 1:]:
        if abs(a['at'][0] - b['at'][0]) <= 1 and abs(a['at'][1] - b['at'][1]) <= 1:
            problems.append(f"trees touching: {a} {b}")

ids = set()
for c in critters:
    x, y = c['at']
    if not walkable(x, y):
        problems.append(f"{c['kind']} at {x},{y} starts on ground it cannot stand on ({rows[y][x]!r})")
    if in_clearing(x, y):
        problems.append(f"{c['kind']} at {x},{y} starts in the quiet clearing")
    if c.get('follow') and c['follow'] not in ids:
        problems.append(f"{c['kind']} follows '{c['follow']}', which is not listed before it")
    if c.get('id'):
        ids.add(c['id'])
lily_tiles = {tuple(o['at']) for o in objects if o['type'] in ('lily', 'lilies', 'lily_flower')}
object_tiles = {tuple(o['at']) for o in objects}
for l in life:
    x, y = l['at']
    ch = rows[y][x]
    if l['type'] == 'frog' and (ch != '~' or (x, y) not in lily_tiles):
        problems.append(f"frog at {x},{y} is not on a lily pad")
    if l['type'] in ('fish', 'boat') and (ch != '~' or (x, y) in object_tiles):
        problems.append(f"{l['type']} at {x},{y} is not on open water ({ch!r})")
    if l['type'] == 'fire' and not any(o['type'] == 'campfire_logs' and tuple(o['at']) == (x, y) for o in objects):
        problems.append(f"the fire at {x},{y} has no logs under it")
    if l['type'] == 'bee' and in_clearing(x, y):
        problems.append(f"a bee at {x},{y} is in the quiet clearing")

ITEM_ART = ART['items']
seen_ids = set()
for pk in pickups:
    x, y = pk['at']
    if pk['item'] not in ITEM_ART:
        problems.append(f"pickup {pk['id']} uses unknown item {pk['item']}")
    if pk['id'] in seen_ids:
        problems.append(f"two pickups share the id {pk['id']}")
    seen_ids.add(pk['id'])
    if in_clearing(x, y):
        problems.append(f"pickup {pk['id']} is in the quiet clearing")
    if not walkable(x, y):
        problems.append(f"pickup {pk['id']} at {x},{y} is not on walkable ground ({rows[y][x]!r})")
    elif (x, y) not in seen:
        problems.append(f"pickup {pk['id']} at {x},{y} cannot be reached from the way in")
KIND_OBJECTS = {'tree': ('tree_',), 'bush': ('berry_bush_',), 'hive': ('beehive',)}
for it in interactables:
    x, y = it['at']
    kind = it['kind']
    if kind in KIND_OBJECTS:
        types = by_tile.get((x, y), [])
        if not any(t.startswith(KIND_OBJECTS[kind]) for t in types):
            problems.append(f"{kind} at {x},{y} has no matching picture there (found {types})")
        if it['item'] not in ITEM_ART:
            problems.append(f"{kind} at {x},{y} gives unknown item {it['item']}")
        if not any(walkable(x + dx, y + dy) and (x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1))):
            problems.append(f"{kind} at {x},{y} has nothing reachable next to it")
    elif kind == 'fishing':
        cx, cy = it['cast']
        if not walkable(x, y) or (x, y) not in seen:
            problems.append(f"fishing spot at {x},{y} must be somewhere the player can stand and reach")
        if rows[cy][cx] != '~':
            problems.append(f"fishing spot at {x},{y}: the cast tile {cx},{cy} must be open water ({rows[cy][cx]!r})")
    elif kind == 'chest':
        if it['id'] in seen_ids:
            problems.append(f"chest id {it['id']} is used twice")
        seen_ids.add(it['id'])
        if it['color'] not in ART['chests']:
            problems.append(f"chest {it['id']} has unknown colour {it['color']}")
        if not any(walkable(x + dx, y + dy) and (x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            problems.append(f"chest {it['id']} at {x},{y} has no reachable tile next to it")
        if in_clearing(x, y):
            problems.append(f"chest {it['id']} is in the quiet clearing")
        item = it.get('reward', {}).get('item')
        if item and item not in ITEM_ART:
            problems.append(f"chest {it['id']} gives unknown item {item}")
for g_ in gates:
    gx, gy = g_['at']
    if not (rows[gy][gx] in ':.,' and rows[gy][gx - 1] in 'fF' and rows[gy][gx + 1] in 'fF'):
        problems.append(f"gate at {gx},{gy} is not a gap between two fence pieces ({rows[gy][gx - 1:gx + 2]!r})")
for lm in landmarks:
    x, y = lm['at']
    if not (0 <= x < W and 0 <= y < H):
        problems.append(f"landmark {lm['name']} is outside the map")

# ---- "Lost in the Forest" (quests/lost-in-forest.quest.json): Pudding asks you to find the Little Imp.
# Three clues (pictures from art.json objects, used with the Talk button); the Imp only appears in the
# quiet clearing once all three are found, then follows you back to Pudding.
FOREST_CLUES = ["forest-basket", "forest-mushrooms", "forest-footprints"]
npcs = [
    {"id": "forest-pudding", "name": "Pudding", "character": "pudding-pup", "alt": {"character": "sky-puppy", "name": "Sky"},
     "dialogue": "forest-pudding", "facing": "down", "at": [13, 16]},
    {"id": "forest-imp", "name": "Little Imp", "character": "forest-imp", "alt": {"character": "tabby-cat", "name": "Little Tabby"},
     "kind": "follower", "tags": ["lost-friend"], "homeWith": "forest-pudding", "facing": "down", "at": [15, 5],
     "visibleWhen": {"hasClues": FOREST_CLUES}, "joinsWhen": {"hasClues": FOREST_CLUES},
     "joinSay": ["SNIFF... OH! {name}, YOU FOUND ME!", "I CHASED THE PRETTIEST MUSHROOMS AND GOT ALL TURNED AROUND.", "CAN WE GO HOME TO {@forest-pudding} NOW? I'LL STAY RIGHT BEHIND YOU!"],
     "followSay": ["I'M RIGHT BEHIND YOU, {name}!"],
     "homeSay": ["HOME SWEET HOME! THANK YOU FOR FINDING ME, {name}."]},
    # sitting cats who blink now and then (pictures from build-sitting-npcs.py; spots: open grass, reachable, off paths)
    # Luna (moon cat) moved to Pumpkin Hollow (halloween_objects.py)
    {"id": "cat-dozy", "name": "Dozy", "sprite": "npc-sleepy-cat", "anim": "npc-sleepy-cat-sit", "dialogue": "cat-dozy", "at": [17, 32]},
]
entities = [
    {"id": "woods-cove-log", "kind": "blocker", "object": "log_mossy", "at": [6, 31], "hiddenWhen": {"route": "secret-cove"},
     "say": ["A BIG MOSSY LOG IS STUCK ON THIS LITTLE BRIDGE. IT'S MUCH TOO HEAVY TO MOVE!", "MAYBE SOMEONE WHO LIVES IN THE WOODS COULD HELP."]},
    {"id": "forest-basket", "kind": "clue", "object": "picnic_basket", "at": [34, 15],
     "foundSay": ["A LITTLE BASKET, HALF FULL OF MUSHROOMS! SOMEONE DROPPED IT IN A HURRY."], "againSay": ["THE DROPPED MUSHROOM BASKET."]},
    {"id": "forest-mushrooms", "kind": "clue", "object": "mushrooms_red", "at": [22, 10],
     "foundSay": ["RED MUSHROOMS... SOME HAVE BEEN PICKED! THE TRAIL GOES NORTH, DEEPER INTO THE WOODS."], "againSay": ["THE HALF-PICKED MUSHROOMS."]},
    {"id": "forest-footprints", "kind": "clue", "object": "twig", "at": [18, 9],
     "foundSay": ["A SNAPPED TWIG AND TINY FOOTPRINTS! THEY LEAD INTO THE QUIET CLEARING."], "againSay": ["TINY FOOTPRINTS, GOING INTO THE CLEARING."]},
]
object_tiles_now = {tuple(o['at']) for o in objects}
spot_tiles = {tuple(it['at']) for it in interactables + pickups}
for thing in npcs + entities:
    x, y = thing['at']
    if not walkable(x, y) or (x, y) in object_tiles_now or (x, y) in spot_tiles:
        problems.append(f"{thing['id']} at {x},{y} must stand on a free tile the player can walk on")
    elif not any((x + dx, y + dy) in seen for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1))):
        problems.append(f"{thing['id']} at {x},{y} cannot be reached from the way in")
    if thing['id'] != 'forest-imp' and in_clearing(x, y):
        problems.append(f"{thing['id']} is in the quiet clearing, which only the lost friend uses")

print('objects', len(objects), '| trees', len(planted), '| pickups', len(pickups), '| spots', len(interactables), '| animals', len(critters), '| life', len(life), '| reachable cells', len(seen))
print('\n'.join(problems) if problems else 'all checks passed')
if problems and '--force' not in sys.argv:
    sys.exit(1)

region = json.load(open(REGION, encoding='utf-8'))


def block(name, items, last=False):
    out = [f'  "{name}": [']
    out += [f'    {json.dumps(item)}' + (',' if i < len(items) - 1 else '') for i, item in enumerate(items)]
    out.append('  ]' + ('' if last else ','))
    return out


add_favourites(npcs)  # each friend's favourite treat (favourites.py)
lines = ['{', f'  "id": {json.dumps(region["id"])},', f'  "name": {json.dumps(region["name"])},',
         f'  "about": {json.dumps(region["about"])},', '  "canopy": false,']
lines += block('map', rows) + block('objects', objects) + block('npcs', npcs) + block('entities', entities) + block('critters', critters) + block('life', life) + block('pickups', pickups) + block('interactables', interactables) + block('landmarks', landmarks) + block('gates', gates, last=True)
lines += ['}']
open(REGION, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('wrote', os.path.normpath(REGION))
