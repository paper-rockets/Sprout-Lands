"""Objects, animals and things to find for the East Isle (Pine Hills + Cobble Village), plus checks.
Writes world/regions/east.json.

    py scripts/tools/map-authoring/east_objects.py

The ground comes from east_v1.py. Houses and other big things sit on exact tiles; small things are
placed with put(), which nudges them to the nearest free tile of the right kind (so a small change to the
ground never breaks the script). Scatter (flowers, pines, ferns) uses a seeded random generator.
"""
from favourites import add_favourites
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from east_v1 import rows  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
ART = json.load(open(os.path.join(ROOT, 'src/content/starter-adventure/art.json'), encoding='utf-8'))
REGION = os.path.join(ROOT, 'src/content/starter-adventure/world/regions/east.json')
H, W = len(rows), len(rows[0])
LAND = set('.,:fFb!?h^*')
WALK = set('.,:|=o')
WATER_TYPES = {'lily', 'lilies', 'lily_flower', 'lilypads', 'reed', 'reed_small', 'reed_tall', 'reeds_lilies', 'water_rock',
               'water_rock_small', 'water_rocks', 'water_rock_big', 'boat', 'boat_float'}
SAND_OK = {'house_red', 'house_blue', 'house_pink', 'house_yellow', 'house_green', 'house_orange', 'house_purple', 'house_lime',
           'house_teal', 'hut_teal', 'hut_orange', 'hut_blue', 'well', 'rock', 'pebble', 'log', 'log_small', 'sign', 'sign_fish',
           'sign_flower', 'tuft', 'campfire_logs', 'picnic_blanket', 'picnic_basket', 'stump_small', 'crate', 'crate_stack', 'hay_bale',
           'hay_patch', 'hay_patch_small', 'water_tray', 'hay_bale_long', 'picnic_cake', 'picnic_pie', 'flower_white', 'flower_yellow'}
START = (0, 37)  # the bridge from the farm lands here

objects, interactables, pickups, critters, life = [], [], [], [], []
problems = []
used = set()   # tiles already holding something
solid = set()  # tiles the player cannot walk on


def foot_cells(t, x, y):
    d = ART['objects'].get(t)
    return [(x + dx, y + dy) for dx, dy in (d.get('foot', []) if d else [])]


def O(t, x, y):
    return {"type": t, "at": [x, y]}


def add(t, x, y):
    o = O(t, x, y)
    objects.append(o)
    used.add((x, y))
    for c in foot_cells(t, x, y):
        used.add(c)
        solid.add(c)
    return o


def walkable(x, y):
    return 0 <= x < W and 0 <= y < H and rows[y][x] in WALK and (x, y) not in solid


def reach_from(start):
    seen, todo = {start}, [start]
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if (nx, ny) not in seen and walkable(nx, ny):
                seen.add((nx, ny))
                todo.append((nx, ny))
    return seen


def ok_tile(t, x, y):
    if not (0 <= x < W and 0 <= y < H) or (x, y) in used:
        return False
    ch = rows[y][x]
    if t in WATER_TYPES:
        return ch == '~'
    if ch == ':' and t not in SAND_OK:
        return False
    if ch not in '.:' :
        return False
    for c in foot_cells(t, x, y):
        cx, cy = c
        if not (0 <= cx < W and 0 <= cy < H) or rows[cy][cx] not in '.:' or c in used:
            return False
        if rows[cy][cx] == ':' and t not in SAND_OK:
            return False
    return True


def put(t, x, y, r=3):
    """Place t on the nearest free tile of the right kind (within r tiles). Returns the tile used."""
    best = None
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            px, py = x + dx, y + dy
            if ok_tile(t, px, py) and (best is None or abs(dx) + abs(dy) < best[0]):
                best = (abs(dx) + abs(dy), px, py)
    if not best:
        problems.append(f"no room for {t} near {x},{y}")
        return (x, y)
    add(t, best[1], best[2])
    return (best[1], best[2])


def exact(t, x, y):
    if not ok_tile(t, x, y):
        problems.append(f"{t} does not fit exactly at {x},{y} (ground {rows[y][x]!r})")
    add(t, x, y)


# ---- houses and village things (exact tiles; the door is the tile under the house, on the sand spur) --
for t, x, y in [('house_blue', 8, 34), ('house_pink', 15, 34), ('house_yellow', 29, 34), ('house_green', 37, 34),
                ('house_orange', 6, 41), ('hut_teal', 13, 41), ('house_purple', 31, 41), ('hut_orange', 39, 41),
                ('house_lime', 17, 49), ('house_teal', 27, 49), ('house_red', 33, 49),
                ('hut_orange', 35, 14)]:
    exact(t, x, y)
exact('well', 20, 40)
# the cabin room in the pine hills: campfire, logs, picnic
for t, x, y in [('campfire_logs', 32, 14), ('log_small', 30, 14), ('log_small', 33, 16), ('picnic_blanket', 38, 14),
                ('picnic_basket', 37, 13), ('picnic_cake', 39, 13), ('stump_small', 31, 12), ('sign_flower', 34, 13)]:
    put(t, x, y, 2)
# the mine mouth: the stone arch into the Old Mine (a cave room, rooms_v1.py; walk up into the trail tile
# under the arch), boulders on both sides of the trail and a sign
add('mine_mouth', 23, 7)
used.update({(23, 8), (23, 9)})  # the doorway and the step below it stay clear
for t, x, y in [('boulder_mossy', 21, 8), ('boulder', 25, 8), ('rock_big', 20, 10), ('boulder_mossy', 25, 10), ('sign', 22, 10),
                ('stump_big', 19, 9), ('mushrooms_purple', 21, 11), ('pebble', 24, 9), ('rock_b', 26, 7)]:
    put(t, x, y, 2)
# market corner and barn things in the village
for t, x, y in [('crate_stack', 24, 36), ('crate', 25, 36), ('hay_bale', 26, 36), ('hay_bale_long', 27, 38), ('hay_patch', 20, 35),
                ('water_tray', 38, 48), ('hay_patch', 41, 49), ('hay_bale', 38, 49), ('crate', 13, 52), ('hay_patch_small', 7, 49),
                ('picnic_basket', 29, 45), ('sign', 23, 38)]:
    put(t, x, y, 2)
used.update({(30, 45), (31, 45)})  # the village picnic blanket (an entity, below) and its corner
# lake and pond water plants (each must be on water)
for t, x, y in [('lilies', 11, 13), ('lily_flower', 17, 15), ('lily', 10, 16), ('reed_tall', 16, 16), ('reed', 9, 12),
                ('water_rock', 17, 12), ('lilypads', 12, 16), ('reeds_lilies', 15, 11),
                ('lilies', 26, 40), ('lily_flower', 27, 41), ('reed_tall', 25, 42), ('lily', 25, 40), ('water_rock_small', 27, 43)]:
    put(t, x, y, 1)
# on the coast: rocks in the sea
for t, x, y in [('water_rocks', 24, 56), ('water_rock', 15, 55), ('water_rock_big', 32, 56), ('water_rock', 4, 46), ('water_rock', 46, 30),
                ('water_rocks', 3, 20)]:
    put(t, x, y, 2)

# ---- chests, fruit, berries, hive -------------------------------------------------------------------
def chest(cid, colour, x, y, reward):
    px, py = put('chest', x, y, 2)
    interactables.append({"id": cid, "kind": "chest", "color": colour, "at": [px, py], "reward": reward})
    return px, py


chest('east-chest-lake', 'gold', 13, 13, {"coins": [8, 14], "item": "ruby"})
chest('east-chest-nook', 'cherry', 10, 9, {"coins": [5, 9], "item": "amethyst"})
chest('east-chest-orchard', 'silver', 42, 30, {"coins": [5, 9], "item": "emerald"})
chest('east-chest-beach', 'oak', 12, 53, {"coins": [6, 10], "item": "diamond"})
# a tree on the lake island first, so the chest has company
put('tree_small', 12, 13, 1)


def fruit(tree, item, x, y):
    px, py = put(tree, x, y, 2)
    interactables.append({"kind": "tree", "at": [px, py], "item": item, "count": [1, 3], "cooldown": 40})


for tree, item, x, y in [('tree_apple', 'apple', 33, 26), ('tree_orange', 'orange', 37, 25), ('tree_pear', 'pear', 40, 29),
                         ('tree_peach', 'peach', 36, 29), ('tree_apple', 'apple', 43, 33), ('tree_pear', 'pear', 30, 27),
                         ('tree_orange', 'orange', 5, 30), ('tree_peach', 'peach', 12, 30), ('tree_apple', 'apple', 14, 44)]:
    fruit(tree, item, x, y)


def berry(kind, item, x, y):
    px, py = put(kind, x, y, 2)
    interactables.append({"kind": "bush", "at": [px, py], "item": item, "count": [1, 3], "cooldown": 30})


for kind, item, x, y in [('berry_bush_red', 'raspberry', 18, 12), ('berry_bush_blue', 'blueberry', 24, 22), ('berry_bush_purple', 'grapes', 31, 22),
                         ('berry_bush_red', 'raspberry', 9, 25), ('berry_bush_blue', 'blueberry', 20, 46), ('berry_bush_purple', 'grapes', 44, 40),
                         ('berry_bush_red', 'raspberry', 5, 39)]:
    berry(kind, item, x, y)
hx, hy = put('beehive', 38, 16, 2)
interactables.append({"kind": "hive", "at": [hx, hy], "item": "honey", "cooldown": 90})
put('beehive_small', 36, 17, 2)
# fishing at the pier
interactables.append({"kind": "fishing", "at": [22, 56], "cast": [22, 57]})
put('sign_fish', 21, 54, 1)
put('campfire_logs', 15, 52, 2)

# ---- scatter: pines and birches in the hills, round trees in the village, flowers everywhere ---------
rnd = random.Random(20260930)
grass = [(x, y) for y in range(H) for x in range(W) if rows[y][x] == '.']
rnd.shuffle(grass)


def near(x, y, chars, r=1):
    return any(0 <= x + dx < W and 0 <= y + dy < H and rows[y + dy][x + dx] in chars for dx in range(-r, r + 1) for dy in range(-r, r + 1))


MUST = {  # things the player has to reach (also checked for after the scatter)
    'bridge landing': (0, 37), 'main street east': (44, 37), 'pier end': (22, 56), 'mine mouth': (23, 8),
    'lake bridge south': (14, 18), 'lake bridge': (14, 16), 'cabin door': (35, 14), 'cabin room': (35, 15), 'orchard trail end': (40, 28),
    'west meadow': (10, 30), 'north-west nook': (12, 8), 'hen yard gate': (8, 46), 'cow paddock gate': (40, 46), 'village well': (22, 40),
    'beach lane west': (8, 51), 'second street east': (40, 44),
    **{f'{t} door': (x, y) for t, x, y in [('blue house', 8, 34), ('pink house', 15, 34), ('yellow house', 29, 34), ('green house', 37, 34),
                                            ('orange house', 6, 41), ('teal hut', 13, 41), ('purple house', 31, 41), ('orange hut', 39, 41),
                                            ('lime house', 17, 49), ('teal house', 27, 49), ('red house', 33, 49)]},
}


def all_reachable():
    seen = reach_from(START)
    return all(p in seen for p in MUST.values())


PINES = ['pine', 'pine', 'pine_big', 'pine_small', 'pine_sapling', 'birch', 'birch_tall']
ROUNDS = ['tree_round', 'tree_round', 'tree_small', 'tree_big', 'birch_big']
planted = [tuple(o['at']) for o in objects if o['type'].startswith(('tree', 'pine', 'birch'))]
for x, y in grass:
    if len(planted) >= 70:
        break
    if (x, y) in used or near(x, y, ':fF|=', 1) or (near(x, y, '~', 1) and rnd.random() < 0.7):
        continue
    kind = rnd.choice(PINES if y < 30 else ROUNDS)
    if any(max(abs(x - px), abs(y - py)) < 3 for px, py in planted):
        continue
    if not ok_tile(kind, x, y):
        continue
    solid_before = set(solid)
    add(kind, x, y)
    if not all_reachable():
        objects.pop()
        solid.clear()
        solid.update(solid_before)
        used.discard((x, y))
        continue
    planted.append((x, y))

FLOWERS = ['flower_yellow', 'flower_pink', 'flower_white', 'flower_blue', 'tuft', 'flower_yellow_small', 'daisy', 'tulip_pink', 'lavender',
           'bluebell', 'flower_purple', 'tuft_big', 'flowers_mix', 'sunflower_small']
MOSSY = ['fern', 'fern_big', 'mushroom_red', 'mushroom_purple', 'mushrooms_red', 'mushrooms_purple', 'pinecone', 'twig']
count = 0
for x, y in grass:
    if count >= 230:
        break
    if (x, y) in used or rows[y][x] != '.' or near(x, y, 'fF', 1):
        continue
    hills = y < 30
    pick = MOSSY if hills and near(x, y, 'b', 2) and rnd.random() < 0.6 else FLOWERS
    if rnd.random() < 0.3:
        add(rnd.choice(pick), x, y)
        count += 1

# ---- animals and life -------------------------------------------------------------------------------
critters += [
    {"kind": "hen", "color": 1, "at": [8, 48], "radius": 2}, {"kind": "hen", "color": 3, "at": [10, 49], "radius": 2},
    {"kind": "hen", "color": 0, "at": [7, 47], "radius": 2}, {"kind": "chick", "color": 2, "at": [9, 48], "radius": 2},
    {"id": "east-cow-1", "kind": "cow", "color": 0, "at": [40, 48], "radius": 2}, {"kind": "calf", "color": 2, "at": [41, 48], "follow": "east-cow-1"},
    {"id": "east-cow-2", "kind": "cow", "color": 3, "at": [38, 47], "radius": 2},
    {"id": "east-cow-3", "kind": "cow", "color": 4, "at": [34, 26], "radius": 4}, {"kind": "calf", "color": 1, "at": [35, 27], "follow": "east-cow-3"},
    {"kind": "hen", "color": 4, "at": [24, 44], "radius": 4}, {"kind": "hen", "color": 2, "at": [30, 37], "radius": 3},
    {"kind": "chick", "color": 0, "at": [18, 38], "radius": 3}, {"kind": "calf", "color": 3, "at": [30, 22], "radius": 3},
]
# scatter never blocks an animal's starting tile
_crit = {tuple(c['at']) for c in critters}
objects[:] = [o for o in objects if tuple(o['at']) not in _crit]
solid.clear()
for o in objects:
    solid.update(foot_cells(o['type'], *o['at']))
lily_tiles = [tuple(o['at']) for o in objects if o['type'] in ('lily', 'lilies', 'lily_flower')]
for i, (x, y) in enumerate(lily_tiles[:5]):
    life.append({"type": "frog", "at": [x, y], "color": i % 2})
open_water = [(x, y) for y in range(H) for x in range(W) if rows[y][x] == '~' and (x, y) not in used]
sea = [p for p in open_water if p[1] > 53 or p[0] < 3 or p[0] > 45 or p[1] < 2]
lake = [p for p in open_water if 9 <= p[0] <= 18 and 11 <= p[1] <= 17]
rnd2 = random.Random(5)
for pool, n in ((lake, 3), (sea, 9)):
    picks = []
    for p in rnd2.sample(pool, len(pool)):
        if all(abs(p[0] - q[0]) + abs(p[1] - q[1]) > 4 for q in picks):
            picks.append(p)
        if len(picks) >= n:
            break
    for i, (x, y) in enumerate(picks):
        life.append({"type": "fish", "at": [x, y], "size": ["small", "medium", "big"][i % 3], "flip": bool(i % 2)})
boats = [p for p in sea if p[1] >= 55 and 16 <= p[0] <= 20 and (p[0], p[1]) not in used]
if boats:
    life.append({"type": "boat", "at": list(boats[0])})
bee_spots = [tuple(o['at']) for o in objects if o['type'] in ('sunflower_small', 'flower_pink', 'lavender')][:4]
for x, y in bee_spots:
    life.append({"type": "bee", "at": [x, y], "radius": 2})
life.append({"type": "bee", "at": [hx, hy], "radius": 2})
for o in objects:
    if o['type'] == 'campfire_logs' and rows[o['at'][1]][o['at'][0]] in '.:':
        life.append({"type": "fire", "at": o['at']})
        break

# Baker Bun lives in the yellow house (rooms_v1.py, the bakery); a grocer keeps the market busy.
# Once the village picnic is set out (quests/village-picnic.quest.json), Bun comes to the blanket.
npcs = [
    {"id": "east-grocer", "name": "Grocer Flop", "character": "floppy-pup", "alt": {"character": "pudding-pup", "name": "Grocer Pud"},
     "dialogue": "east-grocer", "facing": "down", "at": [21, 38]},
    {"id": "picnic-bun", "name": "Baker Bun", "character": "tabby-cat", "alt": {"character": "sky-puppy", "name": "Baker Sky"},
     "dialogue": "picnic-bun", "facing": "left", "at": [32, 44], "visibleWhen": {"flag": "picnic-ready"}},
    {"id": "east-miner", "name": "Miner Moss", "character": "snowy-puppy", "alt": {"character": "gardener", "name": "Miner Capy"},
     "dialogue": "east-miner", "facing": "down", "at": [24, 11]},
    # sitting cats who blink now and then (pictures from build-sitting-npcs.py; spots: open grass, reachable, off paths)
    # Hazel (witch cat) and Flit (bat cat) moved to Pumpkin Hollow (halloween_objects.py)
    {"id": "cat-sprinkles", "name": "Sprinkles", "sprite": "npc-donut-cat", "anim": "npc-donut-cat-sit", "dialogue": "cat-sprinkles", "at": [21, 42]},
]
for n in npcs:
    x, y = n['at']
    if not walkable(x, y):
        # nudge onto a free walkable tile nearby
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (2, 0), (-2, 0)):
            if walkable(x + dx, y + dy) and (x + dx, y + dy) not in used:
                n['at'] = [x + dx, y + dy]
                break
    used.add(tuple(n['at']))
    MUST[n['id']] = tuple(n['at'])

# The village picnic: the blanket is a thing you use (the quest's "bring" step); the food on it only
# shows once the picnic is set out.
entities = [
    {"id": "village-picnic", "name": "Picnic blanket", "kind": "picnic", "object": "picnic_blanket", "at": [30, 45],
     "say": ["(A PICNIC BLANKET BY THE VILLAGE POND. PERFECT FOR A FEAST!)"]},
    {"id": "picnic-set-bun", "kind": "prop", "object": "picnic_bun", "at": [29, 44], "visibleWhen": {"flag": "picnic-ready"}},
    {"id": "picnic-set-pie", "kind": "prop", "object": "picnic_pie", "at": [31, 44], "visibleWhen": {"flag": "picnic-ready"}},
    {"id": "picnic-set-cake", "kind": "prop", "object": "picnic_cake", "at": [30, 43], "visibleWhen": {"flag": "picnic-ready"}},
]
for e in entities:
    x, y = e['at']
    if rows[y][x] not in WALK or (x, y) in solid:
        problems.append(f"{e['id']} at {x},{y} is not on open ground")
    MUST[e['id']] = (x, y)


# pickups: eggs, fruit, gems and shells lying about
def pickup(pid, item, x, y):
    for r in range(0, 4):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                px, py = x + dx, y + dy
                if walkable(px, py) and (px, py) not in used and rows[py][px] in '.:':
                    used.add((px, py))
                    pickups.append({"id": pid, "item": item, "at": [px, py]})
                    return
    problems.append(f"no free tile for pickup {pid} near {x},{y}")


for pid, item, x, y in [('east-egg-1', 'egg', 9, 47), ('east-egg-2', 'egg-brown', 24, 44), ('east-egg-3', 'egg-pink', 19, 36),
                        ('east-egg-4', 'egg-blue', 28, 22), ('east-apple-1', 'apple', 35, 24), ('east-gem-1', 'emerald', 8, 20),
                        ('east-gem-2', 'diamond', 41, 12), ('east-gem-3', 'amethyst', 23, 12), ('east-grapes-1', 'grapes', 16, 30),
                        ('east-shell-1', 'starfish', 30, 53), ('east-shell-2', 'crab', 16, 53), ('east-pear-1', 'pear', 40, 34)]:
    pickup(pid, item, x, y)

landmarks = [
    {"name": "Pine Hills", "at": [23, 20], "icon": "sprout"}, {"name": "Treasure Lake", "at": [13, 13], "icon": "star"},
    {"name": "Pine Cabin", "at": [35, 14], "icon": "home"}, {"name": "Old Mine", "at": [23, 8], "icon": "question"},
    {"name": "Cobble Village", "at": [22, 37], "icon": "home"}, {"name": "Village Pond", "at": [26, 41], "icon": "heart"},
    {"name": "Cow Paddock", "at": [40, 48], "icon": "paw"}, {"name": "Hen Yard", "at": [8, 48], "icon": "paw"},
    {"name": "East Orchard", "at": [36, 27], "icon": "sprout"}, {"name": "East Pier", "at": [22, 55], "icon": "dock"},
]
gates = [{"at": [8, 46]}, {"at": [40, 46]}]

# ---- checks -----------------------------------------------------------------------------------------
by_tile = {}
for o in objects:
    by_tile.setdefault(tuple(o['at']), []).append(o['type'])
dupes = [t for t, v in by_tile.items() if len(v) > 1]
if dupes:
    problems.append(f"two objects share a tile: {dupes[:6]}")
for o in objects:
    d = ART['objects'].get(o['type'])
    x, y = o['at']
    if not d:
        problems.append(f"unknown object {o['type']}")
        continue
    ch = rows[y][x]
    if o['type'] in WATER_TYPES:
        if ch != '~':
            problems.append(f"{o['type']} at {x},{y} is not on water")
        continue
    if o['type'] == 'mine_mouth' and ch == 'b':
        continue  # the mine's arch is set into the hedge wall
    if ch not in LAND or ch == 'b':
        problems.append(f"{o['type']} at {x},{y} is not on open land ({ch!r})")
    if ch in ':Ff' and o['type'] not in SAND_OK:
        problems.append(f"{o['type']} at {x},{y} sits on sand or a fence")
    for fx, fy in foot_cells(o['type'], x, y):
        c = rows[fy][fx]
        if c not in '.,' and not (c == ':' and o['type'] in SAND_OK):
            problems.append(f"{o['type']} at {x},{y}: solid part lands on {c!r} at {fx},{fy}")
seen = reach_from(START)
for name, p in MUST.items():
    if p not in seen:
        problems.append(f"can't reach {name} {p} from the bridge")
for pk in pickups:
    if tuple(pk['at']) not in seen:
        problems.append(f"pickup {pk['id']} at {pk['at']} cannot be reached")
    if pk['item'] not in ART['items']:
        problems.append(f"pickup {pk['id']} uses unknown item {pk['item']}")
ids = set()
for c in critters:
    x, y = c['at']
    if not walkable(x, y) or (x, y) not in seen:
        problems.append(f"{c['kind']} at {x},{y} starts where it cannot stand or be reached ({rows[y][x]!r})")
    if c.get('follow') and c['follow'] not in ids:
        problems.append(f"{c['kind']} follows '{c['follow']}', which is not listed before it")
    if c.get('id'):
        ids.add(c['id'])
for it in interactables:
    x, y = it['at']
    k = it['kind']
    if k == 'fishing':
        cx, cy = it['cast']
        if (x, y) not in seen or rows[cy][cx] != '~':
            problems.append(f"fishing spot at {x},{y}: needs a reachable stand tile and open water at {cx},{cy}")
        continue
    if k == 'tree' and not any(t.startswith('tree_') for t in by_tile.get((x, y), [])):
        problems.append(f"tree at {x},{y} has no tree picture")
    if k == 'bush' and not any(t.startswith('berry_bush') for t in by_tile.get((x, y), [])):
        problems.append(f"bush at {x},{y} has no berry-bush picture")
    if k == 'hive' and not any(t.startswith('beehive') for t in by_tile.get((x, y), [])):
        problems.append(f"hive at {x},{y} has no hive picture")
    if k != 'chest' and it['item'] not in ART['items']:
        problems.append(f"{k} at {x},{y} gives unknown item {it['item']}")
    if k == 'chest':
        if it['color'] not in ART['chests'] or it['reward']['item'] not in ART['items']:
            problems.append(f"chest {it['id']} has an unknown colour or item")
    if not any((x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1))):
        problems.append(f"{k} at {x},{y} has nothing reachable next to it")
for l in life:
    x, y = l['at']
    ch = rows[y][x]
    if l['type'] == 'frog' and (ch != '~' or (x, y) not in lily_tiles):
        problems.append(f"frog at {x},{y} is not on a lily pad")
    if l['type'] in ('fish', 'boat') and (ch != '~' or (x, y) in by_tile):
        problems.append(f"{l['type']} at {x},{y} is not on open water")
for g_ in gates:
    gx, gy = g_['at']
    if not (rows[gy][gx] == ':' and rows[gy][gx - 1] in 'fF' and rows[gy][gx + 1] in 'fF'):
        problems.append(f"gate at {gx},{gy} is not a gap between fence pieces")

print('objects', len(objects), '| pickups', len(pickups), '| spots', len(interactables), '| animals', len(critters), '| life', len(life), '| reachable', len(seen))
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
