"""Hand-placed things for the North Meadows, plus checks: every object stands on the right ground,
nothing solid sits on a trail, and the player can reach every important spot from the trail that
comes up from the farm's north bridge. Writes the map and objects into world/regions/north.json.

    py scripts/tools/map-authoring/north_objects.py

The ground is drawn by north_v1.py. Positions are written as (farm column, row) with P(), so they
line up with the farm below (farm column 29 is the trail from the farm's north bridge). Trees and
flowers are scattered by a seeded random generator (the meadows look the same every time);
everything else is placed by hand.
"""
from favourites import add_favourites
from hedges import wobble_west
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from north_v1 import rows, C  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
ART = json.load(open(os.path.join(ROOT, 'src/content/starter-adventure/art.json'), encoding='utf-8'))
REGION = os.path.join(ROOT, 'src/content/starter-adventure/world/regions/north.json')
H, W = len(rows), len(rows[0])


def P(cf, y):
    """A (farm column, row) position -> [x, y] in this map."""
    return [C(cf), y]


def O(t, cf, y):
    return {"type": t, "at": P(cf, y)}


# ---- hand-placed objects -----------------------------------------------------------------------
objects = [
    # the hill cottage in its fenced yard: house, well, two mossy stones by the path like the statues
    O("house_red", 29, 5), O("well", 32, 4), O("boulder_mossy", 27, 7), O("boulder_mossy", 31, 7),
    O("sunflower", 26, 4), O("flower_pink", 26, 7), O("flower_yellow", 33, 7), O("sign_flower", 30, 8), O("tulip_pink", 33, 3),
    O("lavender", 26, 3), O("flowers_mix", 32, 6),
    # the lily pond, its pier and the old stump corner
    O("lilies", 13, 11), O("lily_flower", 18, 12), O("lily", 12, 12), O("reeds_lilies", 19, 10), O("reed_tall", 11, 11),
    O("reed", 17, 13), O("water_rock", 14, 14), O("lilypads", 16, 13), O("sign_fish", 14, 8),
    O("log", 12, 5), O("stump_big", 14, 4), O("stump", 10, 8), O("mushroom_red", 9, 8), O("mushrooms_purple", 12, 15),
    # the blossom meadow and the picnic
    O("blossom_big", 45, 9), O("blossom_tree", 40, 14), O("blossom_tree", 49, 11), O("blossom_tree", 38, 16), O("blossom_big", 49, 16),
    O("blossom_tall", 44, 16), O("blossom_bush_pink", 41, 16), O("blossom_bush_rose", 47, 7), O("blossom_sapling", 39, 13),
    O("blossom_stump", 43, 7), O("picnic_blanket", 45, 14), O("picnic_basket", 47, 16), O("log_mossy", 39, 11),
    O("stump_small", 50, 14), O("flower_pink", 42, 15), O("flower_white", 48, 12), O("tulip_blue", 46, 6),
    # the east shore and the stones to the island
    O("rock", 49, 13), O("pebble", 49, 8), O("water_rock", 51, 7), O("water_rocks", 53, 10), O("reed_tall", 50, 4),
    O("lilies", 54, 13), O("water_rock_big", 55, 15),
    # the treasure island
    O("tree_round", 53, 3), O("chest", 55, 4), O("flower_yellow", 56, 5), O("mushroom_red", 54, 6), O("tuft", 57, 4),
    O("reed", 58, 3), O("lily", 58, 5),
    # berry bushes, fruit trees and a beehive to raid
    O("berry_bush_blue", 17, 5), O("berry_bush_red", 35, 14), O("berry_bush_purple", 21, 16), O("beehive", 45, 3),
    # markers where the trails split
    O("sign", 28, 12), O("sign", 37, 10),
    # ---- the deep forest (this map's own columns, 0-43): the mushroom ring, the hidden nook, the fairy glade
    *[{"type": t, "at": [x, y]} for t, x, y in [
        ("mushroom_red", 15, 9), ("mushrooms_red", 17, 9), ("mushroom_red", 13, 11), ("mushroom_red", 19, 11), ("mushrooms_red", 14, 13),
        ("mushroom_red", 18, 13), ("mushroom_big", 16, 11), ("log_mossy", 18, 12), ("fern_big", 12, 12), ("fern", 20, 12), ("mushroom_purple", 14, 10),
        ("flower_blue", 6, 13), ("fern", 8, 10), ("mushrooms_purple", 4, 11), ("fern", 7, 12),
        ("lily", 33, 11), ("lilies", 34, 12), ("bluebell", 31, 10), ("bluebell", 36, 10), ("flower_purple", 32, 13), ("daisy", 35, 13),
        ("blossom_bush_pink", 36, 12), ("fern_big", 30, 11), ("flowers_mix", 31, 12), ("tulip_blue", 35, 9), ("flower_white", 32, 9),
    ]],
]
SAND_OK = {'rock', 'pebble', 'log', 'log_small', 'sign_fish', 'sign', 'sign_flower', 'tuft', 'picnic_blanket', 'picnic_basket',
           'stump_small'}
WATER_TYPES = {'lily', 'lilies', 'lily_flower', 'lilypads', 'reed', 'reed_small', 'reed_tall', 'reeds_lilies', 'water_rock',
               'water_rock_small', 'water_rocks', 'water_rock_big', 'boat', 'boat_float'}

# Things to use with the Talk button or E. Trees, bushes and hives need an object on the same tile.
interactables = [
    {"kind": "fishing", "at": P(15, 10), "cast": P(15, 11)},
    {"kind": "bush", "at": P(17, 5), "item": "blueberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": P(35, 14), "item": "raspberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": P(21, 16), "item": "grapes", "count": [1, 2], "cooldown": 30},
    {"kind": "hive", "at": P(45, 3), "item": "honey", "cooldown": 90},
    {"id": "north-chest-island", "kind": "chest", "color": "gold", "at": P(55, 4), "reward": {"coins": [10, 16], "item": "ruby"}},
    {"id": "north-chest-pond", "kind": "chest", "color": "cherry", "at": P(10, 13), "reward": {"coins": [6, 10], "item": "amethyst"}},
    {"id": "north-chest-nook", "kind": "chest", "color": "silver", "at": [5, 11], "reward": {"coins": [10, 16], "item": "emerald"}},
]
FRUIT = [("tree_apple", "apple", 20, 4), ("tree_peach", "peach", 36, 13), ("tree_pear", "pear", 23, 15), ("tree_orange", "orange", 36, 5)]
for tree, item, cf, y in FRUIT:
    objects.append(O(tree, cf, y))
    interactables.append({"kind": "tree", "at": P(cf, y), "item": item, "count": [1, 3], "cooldown": 40})

# Animals that only wander about (color picks a version from art.json creatures: 0 is the first).
critters = [
    {"id": "north-cow-1", "kind": "cow", "color": 3, "at": P(33, 15), "radius": 4}, {"kind": "calf", "color": 2, "at": P(34, 16), "follow": "north-cow-1"},
    {"kind": "cow", "color": 1, "at": P(24, 13), "radius": 3},
    {"id": "north-hen-1", "kind": "hen", "color": 2, "at": P(31, 11), "radius": 3}, {"kind": "chick", "color": 1, "at": P(32, 12), "follow": "north-hen-1"},
    {"kind": "hen", "color": 4, "at": P(20, 8), "radius": 3},
    {"kind": "calf", "color": 4, "at": P(44, 5), "radius": 3},
]
# Small things that make the meadows feel alive.
life = [
    {"type": "frog", "at": P(13, 11)}, {"type": "frog", "at": P(18, 12), "color": 1},
    {"type": "fish", "at": P(16, 12), "size": "small"}, {"type": "fish", "at": P(13, 13), "size": "medium", "flip": True},
    {"type": "boat", "at": P(18, 11)},
    {"type": "fish", "at": P(54, 9), "size": "big"}, {"type": "fish", "at": P(55, 12), "size": "small"}, {"type": "fish", "at": P(57, 16), "size": "medium", "flip": True},
    {"type": "fish", "at": P(59, 7), "size": "small"},
    {"type": "bee", "at": P(46, 10), "radius": 2}, {"type": "bee", "at": P(41, 14), "radius": 2}, {"type": "bee", "at": P(45, 5), "radius": 2},
    {"type": "bee", "at": P(27, 4), "radius": 2}, {"type": "bee", "at": P(18, 6), "radius": 2},
    {"type": "frog", "at": [33, 11], "color": 1}, {"type": "bee", "at": [34, 9], "radius": 2}, {"type": "bee", "at": [16, 10], "radius": 2},
]
# One-time treasures lying about: walk over them to pick them up. Every id must be different.
pickups = [
    {"id": "north-egg-1", "item": "egg-brown", "at": P(24, 10)},
    {"id": "north-egg-2", "item": "egg-blue", "at": P(40, 5)},
    {"id": "north-egg-3", "item": "egg-green", "at": P(14, 16)},
    {"id": "north-gem-1", "item": "diamond", "at": P(56, 3)},
    {"id": "north-honey-1", "item": "honey", "at": P(19, 3)},
    {"id": "north-peach-1", "item": "peach", "at": P(43, 13)},
    {"id": "north-forest-gem", "item": "amethyst", "at": [36, 11]},
    {"id": "north-forest-egg", "item": "egg-pink", "at": [15, 12]},
]
landmarks = [
    {"name": "Hill Cottage", "at": P(29, 5), "icon": "home"},
    {"name": "Lily Pond", "at": P(16, 11), "icon": "dock"},
    {"name": "Blossom Meadow", "at": P(44, 11), "icon": "heart"},
    {"name": "Treasure Isle", "at": P(55, 4), "icon": "star"},
    {"name": "Mushroom Ring", "at": [16, 11], "icon": "sprout"},
    {"name": "Fairy Glade", "at": [33, 11], "icon": "heart"},
]
gates = [{"at": P(29, 9)}]
# Granny Tabby lives in the hill cottage. Her words are in dialogue/north.json.
npcs = [
    {"id": "north-granny", "name": "Granny Tabby", "character": "tabby-cat", "alt": {"character": "sky-puppy", "name": "Granny Sky"},
     "dialogue": "north-granny", "facing": "down", "at": P(30, 7)},
    # sitting cats who blink now and then (pictures from build-sitting-npcs.py; spots: open grass, reachable, off paths)
    {"id": "cat-nimbus", "name": "Nimbus", "sprite": "npc-cloud-cat", "anim": "npc-cloud-cat-sit", "dialogue": "cat-nimbus", "at": [84, 12]},
    {"id": "cat-sprig", "name": "Sprig", "sprite": "npc-leaf-cat", "anim": "npc-leaf-cat-sit", "dialogue": "cat-sprig", "at": [17, 15]},
]

START = tuple(P(29, 17))  # the trail up from the farm's north bridge
MUST_REACH = {
    'way up from the farm': START, 'cottage gate': tuple(P(29, 9)), 'cottage door': tuple(P(29, 6)), 'pier end': tuple(P(15, 10)),
    'stump corner': tuple(P(11, 5)), 'picnic': tuple(P(47, 14)), 'blossom trees': tuple(P(44, 10)), 'island': tuple(P(54, 4)),
    'island chest side': tuple(P(55, 5)), 'pond chest side': tuple(P(11, 13)), 'east shore': tuple(P(48, 5)),
    'forest trail to the woods': (16, 17), 'mushroom ring': (16, 12), 'hidden nook': (6, 11), 'fairy glade': (32, 11),
}

# ---- scatter: trees and flowers -----------------------------------------------------------------
rnd = random.Random(20260930)
LAND = set('.,:fFb!?h^*')
WALK = set('.,:|=o')
YARD = (C(25), 2, C(34), 9)  # the cottage yard: no random trees in it
solid = set()
used = set()
problems = []


def foot_cells(o):
    d = ART['objects'].get(o['type'])
    x, y = o['at']
    return [(x + dx, y + dy) for dx, dy in (d.get('foot', []) if d else [])]


for o in objects:
    used.add(tuple(o['at']))
    for c in foot_cells(o):
        solid.add(c)
        used.add(c)
for thing in pickups + interactables + critters + npcs:
    x, y = thing['at']
    used.add((x, y))
    # nothing tall in front of (below) a treasure, chest or person, or its picture would hide them
    if thing in pickups or thing in npcs or thing.get('kind') == 'chest':
        used.update({(x - 1, y + 1), (x, y + 1), (x + 1, y + 1), (x, y + 2)})


def in_yard(x, y, pad=0):
    return YARD[0] - pad <= x <= YARD[2] + pad and YARD[1] - pad <= y <= YARD[3] + pad


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


def in_lane(x, y):
    """A tile inside a one-tile-wide path: open ground on two opposite sides, none on the other two
    (the same test check:world uses for its "makes a dead end" note)."""
    g = lambda cx, cy: 0 <= cx < W and 0 <= cy < H and rows[cy][cx] in WALK
    return (g(x - 1, y) and g(x + 1, y) and not g(x, y - 1) and not g(x, y + 1)) or \
           (g(x, y - 1) and g(x, y + 1) and not g(x - 1, y) and not g(x + 1, y))


def still_reachable():
    seen = reach_from(START)
    return all(p in seen for p in MUST_REACH.values())


# the meadows and the hedge rooms; the deep-trail clearings (ring, nook, glade) are dressed by hand
CLEARINGS = [(11, 8, 21, 14), (3, 9, 10, 14), (29, 7, 38, 15)]
grass = [(x, y) for y in range(H) for x in range(W) if rows[y][x] == '.'
         and not any(a <= x <= c and b <= y <= d for a, b, c, d in CLEARINGS)]
rnd.shuffle(grass)
TREES = ['tree_round', 'tree_round', 'tree_round', 'tree_small', 'tree_small', 'tree_big']
planted = [tuple(o["at"]) for o in objects if o["type"].startswith(("tree", "blossom_tree", "blossom_big"))]
for x, y in grass:
    if len(planted) >= 34:  # single trees in the hedge rooms, not a crowd
        break
    kind = rnd.choice(TREES)
    if in_yard(x, y, 1) or (x, y) in used or near(x, y, ':fF|=o', 1) or near(x, y, '~', 1) or y >= H - 1:
        continue
    if y <= 4 and x < C(0):  # no trees in the one-tile lane under the top forest
        continue
    if C(37) <= x <= C(51) and 5 <= y <= 17:  # the blossom meadow keeps its own pink trees
        continue
    if any(max(abs(x - px), abs(y - py)) < 4 for px, py in planted):
        continue
    o = O(kind, 0, y)
    o['at'] = [x, y]
    cells = foot_cells(o)
    if any(not (0 <= cx < W and 0 <= cy < H and rows[cy][cx] == '.') or (cx, cy) in used for cx, cy in cells):
        continue
    if any(in_lane(cx, cy) for cx, cy in cells):  # a tree in a one-tile-wide lane would make it a dead end
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

FLOWERS = ['flower_yellow', 'flower_pink', 'flower_white', 'flower_blue', 'tuft', 'flower_yellow_small', 'daisy', 'tulip_pink',
           'lavender', 'bluebell', 'flower_purple', 'tuft_big', 'flowers_mix']
MOSSY = ['fern', 'fern_big', 'mushroom_red', 'mushroom_purple', 'mushrooms_red', 'mushrooms_purple', 'fern', 'fern']
count = 0
for x, y in grass:
    if count >= 120:
        break
    if (x, y) in used or rows[y][x] != '.' or near(x, y, 'fF', 1):
        continue
    edge = near(x, y, 'b', 2)
    pick = MOSSY if edge and rnd.random() < 0.55 else FLOWERS
    if rnd.random() < 0.35:
        objects.append({"type": rnd.choice(pick), "at": [x, y]})
        used.add((x, y))
        count += 1

# The west coast (the old world edge, straight) gets a wobble now that Pumpkin Hollow lies across the
# strait (2026-09-30): 0-3 outer bush columns turn to water. After the scatter, so nothing else moves.
rows = wobble_west(rows, random.Random(10), most=3)

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
    ch = rows[y][x]
    if o['type'] in WATER_TYPES:
        if ch != '~':
            problems.append(f"{o['type']} at farm column {x - C(0)}, row {y} is not on water ({ch!r})")
        continue
    if ch not in LAND or ch == 'b':
        problems.append(f"{o['type']} at farm column {x - C(0)}, row {y} is not on open land ({ch!r})")
    if ch in ':Ff' and o['type'] not in SAND_OK:
        problems.append(f"{o['type']} at farm column {x - C(0)}, row {y} sits on a trail, sand or fence ({ch!r})")
    for fx, fy in foot_cells(o):
        c = rows[fy][fx]
        if c not in '.,' and not (c == ':' and o['type'] in SAND_OK):
            problems.append(f"{o['type']} at farm column {x - C(0)}, row {y}: solid part lands on {c!r} at farm column {fx - C(0)}, row {fy}")
if len({tuple(o['at']) for o in objects}) != len(objects):
    problems.append(f"two objects share a tile: {[t for t, v in by_tile.items() if len(v) > 1][:6]}")

seen = reach_from(START)
for name, p in MUST_REACH.items():
    if p not in seen:
        problems.append(f"can't reach {name} (farm column {p[0] - C(0)}, row {p[1]}) from the way up")
trees = [o for o in objects if o['type'].startswith('tree') or o['type'].startswith('blossom_tree')]
for i, a in enumerate(trees):
    for b in trees[i + 1:]:
        if abs(a['at'][0] - b['at'][0]) <= 1 and abs(a['at'][1] - b['at'][1]) <= 1:
            problems.append(f"trees touching: {a} {b}")
ids = set()
for c in critters:
    x, y = c['at']
    if not walkable(x, y):
        problems.append(f"{c['kind']} at farm column {x - C(0)}, row {y} starts on ground it cannot stand on ({rows[y][x]!r})")
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
        problems.append(f"frog at farm column {x - C(0)}, row {y} is not on a lily pad")
    if l['type'] in ('fish', 'boat') and (ch != '~' or (x, y) in object_tiles):
        problems.append(f"{l['type']} at farm column {x - C(0)}, row {y} is not on open water ({ch!r})")
ITEM_ART = ART['items']
for pk in pickups:
    x, y = pk['at']
    if pk['item'] not in ITEM_ART:
        problems.append(f"pickup {pk['id']} uses unknown item {pk['item']}")
    if not walkable(x, y) or (x, y) not in seen or (x, y) in object_tiles:
        problems.append(f"pickup {pk['id']} at farm column {x - C(0)}, row {y} must be on free ground the player can reach")
KIND_OBJECTS = {'tree': ('tree_',), 'bush': ('berry_bush_',), 'hive': ('beehive',)}
for it in interactables:
    x, y = it['at']
    kind = it['kind']
    beside = any(walkable(x + dx, y + dy) and (x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    if kind in KIND_OBJECTS:
        if not any(t.startswith(KIND_OBJECTS[kind]) for t in by_tile.get((x, y), [])):
            problems.append(f"{kind} at farm column {x - C(0)}, row {y} has no matching picture there")
        if it['item'] not in ITEM_ART:
            problems.append(f"{kind} at farm column {x - C(0)}, row {y} gives unknown item {it['item']}")
        if not beside:
            problems.append(f"{kind} at farm column {x - C(0)}, row {y} has nothing reachable next to it")
    elif kind == 'fishing':
        cx, cy = it['cast']
        if not walkable(x, y) or (x, y) not in seen:
            problems.append("the fishing spot must be somewhere the player can stand and reach")
        if rows[cy][cx] != '~':
            problems.append("the fishing spot must cast onto open water")
    elif kind == 'chest':
        if it['color'] not in ART['chests']:
            problems.append(f"chest {it['id']} has unknown colour {it['color']}")
        if not beside:
            problems.append(f"chest {it['id']} has no reachable tile next to it")
for g_ in gates:
    gx, gy = g_['at']
    if not (rows[gy][gx] in ':.,' and rows[gy][gx - 1] in 'fF' and rows[gy][gx + 1] in 'fF'):
        problems.append(f"gate at farm column {gx - C(0)}, row {gy} is not a gap between two fence pieces")
for n in npcs:
    x, y = n['at']
    if not walkable(x, y) or (x, y) in object_tiles or (x, y) not in seen:
        problems.append(f"{n['id']} must stand on a free tile the player can reach")

print('objects', len(objects), '| trees', len(planted), '| pickups', len(pickups), '| spots', len(interactables),
      '| animals', len(critters), '| life', len(life), '| reachable cells', len(seen))
print('\n'.join(problems) if problems else 'all checks passed')
if problems and '--force' not in sys.argv:
    sys.exit(1)

about = ("The North Meadows, above the farm and the woods: a lily pond with a pier, the hill cottage where Granny Tabby "
         "lives, a pink blossom meadow with a picnic, and a treasure island reached by stepping stones. Written by "
         "scripts/tools/map-authoring/north_objects.py; edit that, not this file.")


def block(name, items, last=False):
    out = [f'  "{name}": [']
    out += [f'    {json.dumps(item)}' + (',' if i < len(items) - 1 else '') for i, item in enumerate(items)]
    out.append('  ]' + ('' if last else ','))
    return out


add_favourites(npcs)  # each friend's favourite treat (favourites.py)
lines = ['{', '  "id": "north",', '  "name": "North Meadows",', f'  "about": {json.dumps(about)},', '  "canopy": false,']
lines += (block('map', rows) + block('objects', objects) + block('npcs', npcs) + block('critters', critters) + block('life', life)
          + block('pickups', pickups) + block('interactables', interactables) + block('landmarks', landmarks) + block('gates', gates, last=True))
lines += ['}']
open(REGION, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('wrote', os.path.normpath(REGION))
