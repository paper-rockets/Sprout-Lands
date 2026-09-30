"""Objects, friends and animals for Pumpkin Hollow (the Halloween island west of the West Woods), plus checks.
Writes world/regions/halloween.json.

    py scripts/tools/map-authoring/halloween_objects.py

The ground comes from halloween_v1.py. Buildings and other big things sit on exact tiles; small things are
placed with put(), which nudges them to the nearest free tile of the right kind. Trees and flowers are
scattered by a seeded random generator, so the island looks the same every time. Friendly and kid-sized:
pumpkins, candy, lanterns, glowing mushrooms, smiling ghosts. No quest yet: the Halloween items (candy,
pie slice, treat bag...) are only decorations here.
"""
from favourites import add_favourites
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from halloween_v1 import rows, START, GATE, LANDING  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
ART = json.load(open(os.path.join(ROOT, 'src/content/starter-adventure/art.json'), encoding='utf-8'))
REGION = os.path.join(ROOT, 'src/content/starter-adventure/world/regions/halloween.json')
H, W = len(rows), len(rows[0])
LAND = set('.,:fFb')
WALK = set('.,:|=o')
GRASS = set('.,')
WATER_TYPES = {'lily', 'lilies', 'lily_flower', 'lilypads', 'reed', 'reed_small', 'reed_tall', 'reeds_lilies', 'water_rock',
               'water_rock_small', 'water_rocks', 'water_rock_big'}
# things that may stand on the dirt trails (beside the way, never in it: put() still keeps trail tiles free
# unless the thing is listed here)
SAND_OK = {'hw_arch_gate', 'hw_pumpkin_small', 'hw_candles',
           'rock', 'pebble', 'sign_fish', 'hw_candy_corn', 'hw_lollipop', 'hw_candy', 'hw_treat_bag'}

objects, interactables, pickups, critters, life = [], [], [], [], []
problems = []
used = set()   # tiles already holding something
solid = set()  # tiles the player cannot walk on


def foot_cells(t, x, y):
    d = ART['objects'].get(t)
    return [(x + dx, y + dy) for dx, dy in (d.get('foot', []) if d else [])]


def add(t, x, y):
    o = {"type": t, "at": [x, y]}
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
    if ch not in '.,:':
        return False
    for cx, cy in foot_cells(t, x, y):
        if not (0 <= cx < W and 0 <= cy < H) or rows[cy][cx] not in '.,' or (cx, cy) in used:
            return False
    return True


def put(t, x, y, r=3):
    """Place t on the nearest free tile of the right kind (within r tiles) where its solid part cuts
    nobody off (every tile you could walk to before, except the ones it covers, is still reachable).
    Returns the tile used."""
    spots = sorted((abs(dx) + abs(dy), x + dx, y + dy) for dy in range(-r, r + 1) for dx in range(-r, r + 1))
    for _, px, py in spots:
        if not ok_tile(t, px, py):
            continue
        cells = set(foot_cells(t, px, py))
        before = reach_from(START) if cells else None
        add(t, px, py)
        if cells and reach_from(START) != before - cells:
            objects.pop()
            used.discard((px, py))
            used.difference_update(cells)
            solid.difference_update(cells)
            continue
        return (px, py)
    problems.append(f"no room for {t} near {x},{y}")
    return (x, y)


def exact(t, x, y):
    if not ok_tile(t, x, y):
        problems.append(f"{t} does not fit exactly at {x},{y} (ground {rows[y][x]!r})")
    add(t, x, y)


# tiles kept clear for the friends (listed further down) and the gate's way through
FRIEND_SPOTS = {(26, 24), (14, 24), (17, 12), (28, 14), (37, 41), (14, 45), (6, 13), (27, 46)}
used.update(FRIEND_SPOTS)
used.update({(GATE[0], GATE[1] - 1), (GATE[0], GATE[1] + 1)})

# ---- buildings and the gate (exact tiles; the tile under each is its trail end) -------------------------
exact('hw_arch_gate', *GATE)
exact('hw_haunted_house', 12, 11)
exact('hw_witch_cottage', 10, 25)
exact('hw_pumpkin_house', 36, 24)
exact('hw_crypt', 15, 41)

# ---- the Landing: lanterns, a pumpkin sign and jack-o'-lanterns to say hello ------------------------------
for t, x, y in [('hw_lantern_post', 32, 39), ('hw_lantern_post', 39, 39), ('hw_sign_pumpkin', 34, 38), ('hw_jack', 32, 37),
                ('hw_jack', 34, 37), ('hw_pumpkin_big', 38, 43), ('hw_pumpkin', 36, 43), ('hw_pumpkin_small', 33, 43),
                ('hw_bush_b', 40, 43), ('hw_candles', 35, 38), ('hw_shroom_teal', 39, 38)]:
    put(t, x, y, 2)
# ---- the Hollow Road: lanterns along it, a signpost at the crossing --------------------------------------
for t, x, y in [('hw_lantern_post', 30, 30), ('hw_lantern_post', 24, 28), ('hw_lantern_post', 16, 30), ('hw_lantern_post', 8, 28),
                ('hw_sign_pumpkin', 21, 30), ('hw_jack', 19, 28), ('hw_jack', 34, 30)]:
    put(t, x, y, 2)
# ---- the Haunted House: the lantern path, face trees, a bench of pumpkins --------------------------------
for t, x, y in [('hw_lantern_post', 11, 13), ('hw_lantern_post', 13, 13), ('hw_lantern_post', 11, 15), ('hw_lantern_post', 13, 15),
                ('hw_face_tree', 5, 11), ('hw_face_tree_b', 19, 9), ('hw_jack', 9, 12), ('hw_jack', 15, 12), ('hw_pumpkin_big', 16, 14),
                ('hw_pumpkin', 8, 14), ('hw_candles', 14, 12), ('hw_witch_hat', 7, 9), ('hw_lantern', 17, 11), ('hw_bush_wide', 17, 5),
                ('hw_stump_shrooms', 9, 5), ('hw_glow_shrooms', 20, 13), ('hw_glow_shrooms_b', 5, 14), ('hw_ghost_cookie', 15, 15)]:
    put(t, x, y, 2)
# ---- Moon Pond: the owl's island, reeds and lilies, glowing mushrooms on the shore ------------------------
exact('hw_dead_tree', 31, 9)
add('hw_owl_up', 31, 10)          # sits on the dead tree's branch (raised 30 px); no foot, the pier end stays walkable
for t, x, y in [('lilies', 27, 8), ('lily_flower', 34, 7), ('lily', 28, 11), ('reed_tall', 35, 10), ('reed', 26, 9),
                ('lilypads', 33, 11), ('reeds_lilies', 29, 6), ('water_rock_small', 35, 8)]:
    put(t, x, y, 1)
for t, x, y in [('hw_glow_shrooms', 27, 13), ('hw_glow_shrooms_b', 35, 13), ('hw_shroom_teal', 25, 11), ('hw_shroom_purple', 37, 12),
                ('hw_dead_tree_small', 37, 5), ('hw_stump_shrooms_b', 27, 3), ('hw_candles', 33, 14), ('hw_owl', 38, 14),
                ('hw_bush_b', 25, 4), ('hw_lantern', 30, 14)]:
    put(t, x, y, 2)
# ---- the Pumpkin Patch: rows of pumpkins, a scarecrow; the pumpkin house next door -------------------------
exact('hw_scarecrow', 27, 23)
for x, y in [(23, 21), (25, 21), (29, 21), (23, 23), (30, 23), (23, 25), (29, 25)]:
    put('hw_pumpkin_patch', x, y, 1)
for t, x, y in [('hw_pumpkin_big', 31, 20), ('hw_pumpkin', 28, 20), ('hw_pumpkin', 24, 24), ('hw_pumpkin_small', 26, 22),
                ('hw_pumpkin_small', 31, 26), ('hw_pumpkin', 25, 26), ('hw_crow_post', 31, 22), ('hw_pumpkin_small', 29, 26)]:
    put(t, x, y, 1)
for t, x, y in [('hw_jack', 35, 25), ('hw_jack', 37, 25), ('hw_pumpkin_big', 38, 21), ('hw_pumpkin', 34, 21), ('hw_sign_pumpkin', 33, 27),
                ('hw_broom', 38, 23), ('hw_pumpkin_small', 39, 27)]:
    put(t, x, y, 2)
# ---- Witch's Glade: cauldron, broom, candles, glowing mushrooms --------------------------------------------
exact('hw_cauldron', 13, 26)
for t, x, y in [('hw_broom', 12, 23), ('hw_candles', 12, 27), ('hw_candles', 15, 25), ('hw_witch_hat', 7, 26), ('hw_glow_shrooms', 5, 22),
                ('hw_glow_shrooms_b', 15, 22), ('hw_shroom_pink', 4, 27), ('hw_shroom_purple', 8, 21), ('hw_shroom_teal', 14, 21),
                ('hw_stump_shrooms', 5, 25), ('hw_candy_apple', 8, 27), ('hw_lantern', 11, 21), ('hw_pie_slice', 14, 28)]:
    put(t, x, y, 2)
# ---- the Graveyard: graves in rows, a crypt, crows' posts, candles ----------------------------------------
GRAVES = ['hw_grave', 'hw_grave_round', 'hw_grave_mossy', 'hw_grave_cracked', 'hw_grave_tall']
for i, (x, y) in enumerate([(9, 38), (14, 38), (17, 38), (9, 41), (11, 41), (18, 41), (9, 44), (12, 44), (16, 44), (18, 45)]):
    put(GRAVES[i % len(GRAVES)], x, y, 1)
for t, x, y in [('hw_crow_post', 8, 46), ('hw_candles', 13, 40), ('hw_candles', 17, 40), ('hw_dead_tree_b', 10, 46),
                ('hw_shroom_purple', 8, 39), ('hw_glow_shrooms', 16, 46), ('hw_lantern', 13, 37), ('hw_jack', 11, 37)]:
    put(t, x, y, 1)
# ---- Candy Lane and the south beach: sweets along the way, a picnic of treats, the pier -------------------
for t, x, y in [('hw_candy_corn', 21, 37), ('hw_lollipop', 23, 39), ('hw_candy', 21, 41), ('hw_candy_apple', 23, 43), ('hw_treat_bag', 21, 45),
                ('hw_lollipop', 23, 47), ('hw_candy_corn', 25, 51), ('hw_candy', 29, 49), ('hw_coin_bag', 31, 51), ('hw_ghost_cookie', 33, 49),
                ('hw_lantern_post', 21, 49), ('hw_lantern_post', 27, 51), ('hw_jack', 23, 51), ('hw_pumpkin_big', 26, 40),
                ('hw_pumpkin', 28, 42), ('hw_pumpkin_small', 25, 45), ('hw_pie_slice', 27, 44), ('hw_candles', 29, 46),
                ('hw_lollipop', 36, 49), ('hw_candy_apple', 38, 50), ('sign_fish', 21, 53), ('hw_owl', 37, 47), ('hw_dead_tree_small_b', 38, 48)]:
    put(t, x, y, 2)
for t, x, y in [('water_rocks', 17, 55), ('water_rock', 30, 55), ('water_rock_big', 2, 30), ('water_rock', 42, 20), ('water_rocks', 6, 4),
                ('water_rock_small', 42, 50)]:
    put(t, x, y, 2)


# ---- chests, fruit and berries ------------------------------------------------------------------------------
def chest(cid, colour, x, y, reward):
    px, py = put('chest', x, y, 2)
    interactables.append({"id": cid, "kind": "chest", "color": colour, "at": [px, py], "reward": reward})


chest('hollow-chest-attic', 'cherry', 8, 8, {"coins": [8, 14], "item": "amethyst"})
chest('hollow-chest-island', 'gold', 32, 9, {"coins": [10, 16], "item": "ruby"})
chest('hollow-chest-crypt', 'silver', 17, 42, {"coins": [6, 10], "item": "diamond"})
chest('hollow-chest-beach', 'oak', 11, 51, {"coins": [5, 9], "item": "emerald"})
for kind, item, x, y in [('berry_bush_purple', 'grapes', 4, 20), ('berry_bush_blue', 'blueberry', 36, 3), ('berry_bush_purple', 'grapes', 33, 52)]:
    px, py = put(kind, x, y, 2)
    interactables.append({"kind": "bush", "at": [px, py], "item": item, "count": [1, 3], "cooldown": 30})
interactables.append({"kind": "fishing", "at": [22, 55], "cast": [22, 56]})
# ---- trick or treat: knock on a house door, get a candy (each door needs a minute between visits) ----------
for house, hx, hy, who, reply, candy in [
    ('hw_haunted_house', 12, 11, 'Haunted House', 'OOOooo! A friendly ghostly hand slides out with a treat. Happy Halloween!', ['candy-corn', 'candy-cookie', 'candy-wrapped']),
    ('hw_witch_cottage', 10, 25, 'Witch', 'Bubble, bubble, sweet and round! Here is a treat for you!', ['candy-apple', 'candy-lollipop', 'candy-corn']),
    ('hw_pumpkin_house', 36, 24, 'Pumpkin House', 'Pumpkin-tastic! Take a treat from our big orange house!', ['candy-corn', 'candy-wrapped', 'candy-lollipop']),
    ('hw_crypt', 15, 41, 'Old Crypt', 'Creeeak... not a scary one, a sweet one! Enjoy!', ['candy-cookie', 'candy-apple', 'candy-wrapped']),
]:
    interactables.append({"id": f"treats-{house[3:]}", "kind": "treats", "at": [hx, hy], "who": who, "reply": reply, "items": candy, "cooldown": 60})

MUST = {  # things the player has to reach
    'bridge': START, 'landing': LANDING, 'through the gate': (GATE[0], GATE[1] - 1), 'haunted house door': (12, 12),
    'moon pond pier': (31, 12), "owl's island": (31, 10), 'witch cottage door': (10, 26), 'pumpkin patch gate': (27, 27),
    'inside the patch': (27, 25), 'pumpkin house door': (36, 25), 'graveyard gate': (12, 36), 'crypt door': (15, 42),
    'south pier end': (22, 55), 'owl corner': (35, 48), 'west beach': (6, 48), 'north-west shore': (5, 9), 'moon pond east shore': (38, 9),
}


def all_reachable():
    seen = reach_from(START)
    return all(p in seen for p in MUST.values())


# ---- scatter: autumn trees and dead trees (4 apart), then small things everywhere --------------------------
rnd = random.Random(20261031)
grass = [(x, y) for y in range(H) for x in range(W) if rows[y][x] in GRASS]
rnd.shuffle(grass)


def near(x, y, chars, r=1):
    return any(0 <= x + dx < W and 0 <= y + dy < H and rows[y + dy][x + dx] in chars for dx in range(-r, r + 1) for dy in range(-r, r + 1))


def in_fence(x, y):
    return 22 <= x <= 32 and 19 <= y <= 27 or 7 <= x <= 19 and 36 <= y <= 47


TREES = ['hw_tree_round', 'hw_tree_round', 'hw_tree_small', 'hw_tree_big', 'hw_dead_tree', 'hw_dead_tree_b', 'hw_dead_tree_small',
         'hw_dead_tree_small_b', 'hw_tree_round', 'hw_face_tree']
planted = [tuple(o['at']) for o in objects if 'tree' in o['type']]
open_now = reach_from(START)
for x, y in grass:
    if len(planted) >= 34:
        break
    if (x, y) in used or (x, y) in MUST.values() or in_fence(x, y) or near(x, y, ':fF|=', 1) or near(x, y, '~', 1) and rnd.random() < 0.7:
        continue
    kind = rnd.choice(TREES)
    if any(max(abs(x - px), abs(y - py)) < 4 for px, py in planted) or not ok_tile(kind, x, y):
        continue
    saved = set(solid)
    add(kind, x, y)
    if reach_from(START) != open_now - set(foot_cells(kind, x, y)):  # never cuts off any grass
        objects.pop()
        solid.clear()
        solid.update(saved)
        used.discard((x, y))
        continue
    planted.append((x, y))
    open_now -= set(foot_cells(kind, x, y))

SMALL = ['hw_shroom_purple', 'hw_shroom_teal', 'hw_shroom_pink', 'hw_pumpkin_small', 'lavender', 'flower_purple', 'bluebell', 'tuft',
         'hw_glow_shrooms', 'hw_glow_shrooms_b', 'flower_white', 'tuft_big', 'mushroom_purple', 'flower_blue']
count = 0
for x, y in grass:
    if count >= 190:
        break
    if (x, y) in used or near(x, y, 'fF', 1) and not in_fence(x, y):
        continue
    if rnd.random() < 0.3:
        add(rnd.choice(SMALL), x, y)
        count += 1

# ---- friends: the four Halloween cats (moved here from the farm, the woods and the East Isle) and three
# friendly ghosts who float about and talk -----------------------------------------------------------------
npcs = [
    {"id": "cat-patch", "name": "Patch", "sprite": "npc-pumpkin-cat", "anim": "npc-pumpkin-cat-sit", "dialogue": "cat-patch", "at": [26, 24]},
    {"id": "cat-hazel", "name": "Hazel", "sprite": "npc-witch-cat", "anim": "npc-witch-cat-sit", "dialogue": "cat-hazel", "at": [14, 24]},
    {"id": "cat-flit", "name": "Flit", "sprite": "npc-bat-cat", "anim": "npc-bat-cat-sit", "dialogue": "cat-flit", "at": [17, 12]},
    {"id": "cat-luna", "name": "Luna", "sprite": "npc-moon-cat", "anim": "npc-moon-cat-sit", "dialogue": "cat-luna", "at": [28, 14]},
    {"id": "ghost-boo", "name": "Boo", "sprite": "hw-ghost", "dialogue": "ghost-boo", "critter": {"kind": "ghost", "radius": 2}, "at": [37, 41]},
    {"id": "ghost-misty", "name": "Misty", "sprite": "hw-ghost", "dialogue": "ghost-misty", "critter": {"kind": "ghost", "radius": 2}, "at": [14, 45]},
    {"id": "ghost-giggles", "name": "Giggles", "sprite": "hw-ghost", "dialogue": "ghost-giggles", "critter": {"kind": "ghost", "radius": 3}, "at": [6, 13]},
]
for n in npcs:
    MUST[n['id']] = tuple(n['at'])

# ---- animals and life -----------------------------------------------------------------------------------
critters += [
    {"kind": "ghost", "at": [27, 46], "radius": 4}, {"kind": "ghost", "at": [34, 5], "radius": 4}, {"kind": "ghost", "at": [30, 34], "radius": 3},
    {"kind": "crow", "at": [11, 43], "radius": 3}, {"kind": "crow", "at": [16, 39], "radius": 2}, {"kind": "crow", "at": [28, 24], "radius": 2},
    {"kind": "crow", "at": [8, 31], "radius": 3},
    {"kind": "wisp", "at": [29, 15], "radius": 3}, {"kind": "wisp", "at": [36, 7], "radius": 2}, {"kind": "wisp", "at": [6, 24], "radius": 3},
    {"kind": "wisp", "at": [18, 6], "radius": 3}, {"kind": "wisp", "at": [35, 51], "radius": 2},
    {"kind": "bat", "at": [10, 14], "radius": 3}, {"kind": "bat", "at": [16, 7], "radius": 3},
]
# nothing from the scatter on an animal's or friend's starting tile
_keep = {tuple(c['at']) for c in critters} | {tuple(n['at']) for n in npcs}
objects[:] = [o for o in objects if tuple(o['at']) not in _keep and not (set(foot_cells(o['type'], *o['at'])) & _keep)]
solid.clear()
for o in objects:
    solid.update(foot_cells(o['type'], *o['at']))
lily_tiles = [tuple(o['at']) for o in objects if o['type'] in ('lily', 'lilies', 'lily_flower')]
for i, (x, y) in enumerate(lily_tiles[:3]):
    life.append({"type": "frog", "at": [x, y], "color": i % 2})
open_water = [(x, y) for y in range(H) for x in range(W) if rows[y][x] == '~' and (x, y) not in used]
pond = [p for p in open_water if 26 <= p[0] <= 36 and 6 <= p[1] <= 12]
sea = [p for p in open_water if p[1] >= 54 or p[0] <= 2 or p[1] <= 2]
rnd2 = random.Random(31)
for pool, n in ((pond, 3), (sea, 6)):
    picks = []
    for p in rnd2.sample(pool, len(pool)):
        if all(abs(p[0] - q[0]) + abs(p[1] - q[1]) > 4 for q in picks):
            picks.append(p)
        if len(picks) >= n:
            break
    for i, (x, y) in enumerate(picks):
        life.append({"type": "fish", "at": [x, y], "size": ["small", "medium", "big"][i % 3], "flip": bool(i % 2)})


# pickups: eggs, fruit and gems lying about (the Halloween items stay decorations until a quest needs them)
def pickup(pid, item, x, y):
    in_front = {(ox, oy - k) for o in objects for ox, oy in [tuple(o['at'])] + foot_cells(o['type'], *o['at'])
                for k in ((1, 2) if ART['objects'][o['type']].get('occlude') else (1,))}  # a picture below would hide it
    for r in range(0, 4):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                px, py = x + dx, y + dy
                if walkable(px, py) and (px, py) not in used and (px, py) not in in_front and rows[py][px] in '.,:':
                    used.add((px, py))
                    pickups.append({"id": pid, "item": item, "at": [px, py]})
                    return
    problems.append(f"no free tile for pickup {pid} near {x},{y}")


for pid, item, x, y in [('hollow-egg-1', 'egg-green', 19, 4), ('hollow-egg-2', 'egg-pink', 39, 31), ('hollow-egg-3', 'egg-blue', 5, 44),
                        ('hollow-gem-1', 'amethyst', 30, 25), ('hollow-gem-2', 'emerald', 6, 27), ('hollow-apple-1', 'apple', 26, 53),
                        ('hollow-grapes-1', 'grapes', 36, 16), ('hollow-pear-1', 'pear', 15, 49)]:
    pickup(pid, item, x, y)

landmarks = [
    {"name": "Pumpkin Hollow", "at": [36, 41], "icon": "star"}, {"name": "Haunted House", "at": [12, 10], "icon": "home"},
    {"name": "Moon Pond", "at": [31, 9], "icon": "heart"}, {"name": "Pumpkin Patch", "at": [27, 23], "icon": "sprout"},
    {"name": "Witch's Glade", "at": [10, 24], "icon": "home"}, {"name": "Graveyard", "at": [13, 42], "icon": "question"},
    {"name": "Candy Lane", "at": [22, 44], "icon": "heart"}, {"name": "Hollow Pier", "at": [22, 54], "icon": "dock"},
]

# ---- checks -----------------------------------------------------------------------------------------------
by_tile = {}
for o in objects:
    by_tile.setdefault(tuple(o['at']), []).append(o['type'])
dupes = [t for t, v in by_tile.items() if len(v) > 1 and t != (31, 10)]
if dupes:
    problems.append(f"two objects share a tile: {dupes[:6]}")
for o in objects:
    x, y = o['at']
    if o['type'] not in ART['objects']:
        problems.append(f"unknown object {o['type']}")
        continue
    ch = rows[y][x]
    if o['type'] in WATER_TYPES:
        if ch != '~':
            problems.append(f"{o['type']} at {x},{y} is not on water")
        continue
    if o['type'] == 'hw_owl_up':
        continue
    if ch not in LAND or ch == 'b':
        problems.append(f"{o['type']} at {x},{y} is not on open land ({ch!r})")
    if ch in ':Ff' and o['type'] not in SAND_OK:
        problems.append(f"{o['type']} at {x},{y} sits on a trail or a fence")
    for fx, fy in foot_cells(o['type'], x, y):
        if rows[fy][fx] not in GRASS:
            problems.append(f"{o['type']} at {x},{y}: solid part lands on {rows[fy][fx]!r} at {fx},{fy}")
seen = reach_from(START)
for name, p in MUST.items():
    if p not in seen:
        problems.append(f"can't reach {name} {p} from the bridge")
for pk in pickups:
    if tuple(pk['at']) not in seen:
        problems.append(f"pickup {pk['id']} at {pk['at']} cannot be reached")
    if pk['item'] not in ART['items']:
        problems.append(f"pickup {pk['id']} uses unknown item {pk['item']}")
for c in critters:
    x, y = c['at']
    if c['kind'] not in ART['creatures']:
        problems.append(f"unknown creature {c['kind']}")
    if not walkable(x, y) or (x, y) not in seen:
        problems.append(f"{c['kind']} at {x},{y} starts where it cannot stand or be reached ({rows[y][x]!r})")
for n in npcs:
    x, y = n['at']
    if not walkable(x, y) or (x, y) in by_tile:
        problems.append(f"{n['id']} must stand on a free tile the player can reach")
for it in interactables:
    x, y = it['at']
    k = it['kind']
    if k == 'fishing':
        cx, cy = it['cast']
        if (x, y) not in seen or rows[cy][cx] != '~':
            problems.append(f"fishing spot at {x},{y}: needs a reachable stand tile and open water at {cx},{cy}")
        continue
    if k == 'bush' and not any(t.startswith('berry_bush') for t in by_tile.get((x, y), [])):
        problems.append(f"bush at {x},{y} has no berry-bush picture")
    if k == 'chest' and (it['color'] not in ART['chests'] or it['reward']['item'] not in ART['items']):
        problems.append(f"chest {it['id']} has an unknown colour or item")
    if not any((x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, 1), (1, -1), (-1, -1))):
        problems.append(f"{k} at {x},{y} has nothing reachable next to it")
for l in life:
    x, y = l['at']
    if l['type'] == 'frog' and (rows[y][x] != '~' or (x, y) not in lily_tiles):
        problems.append(f"frog at {x},{y} is not on a lily pad")
    if l['type'] == 'fish' and (rows[y][x] != '~' or (x, y) in by_tile):
        problems.append(f"fish at {x},{y} is not on open water")
shut = [(x, y) for y in range(H) for x in range(W) if walkable(x, y) and (x, y) not in seen and rows[y][x] != '|']
if shut:
    problems.append(f"{len(shut)} walkable tiles cannot be reached, e.g. {shut[:4]}")
# the Landing is shut in: without the gate's way through, the bridge reaches nothing past it
solid.add(GATE)
if (GATE[0], GATE[1] - 1) in reach_from(START):
    problems.append("the Landing has a way round the arch gate")
solid.discard(GATE)

print('objects', len(objects), '| trees', len(planted), '| pickups', len(pickups), '| spots', len(interactables), '| animals', len(critters),
      '| life', len(life), '| reachable', len(seen))
print('\n'.join(problems) if problems else 'all checks passed')
if problems and '--force' not in sys.argv:
    sys.exit(1)

about = ("Pumpkin Hollow, the Halloween island west of the West Woods, across a narrow strait: a hedged landing with "
         "an arch gate, the Haunted House, Moon Pond, the Pumpkin Patch, Witch's Glade, the Graveyard and Candy Lane. "
         "Written by scripts/tools/map-authoring/halloween_objects.py; edit that, not this file.")
TILES = {"grassSoft": "hwGrassSoft", "grassLayer": "hwGrassLayer", "grassDark": "hwGrassDark", "soil": "hwSoil", "hedge": "hwHedge",
         "fence": "hwFence"}
MAP_COLORS = {"grass": "#9a9c5a", "dark": "#8b9168", "sand": "#c2a07f", "forest": "#7a6585"}


def block(name, items, last=False):
    out = [f'  "{name}": [']
    out += [f'    {json.dumps(item)}' + (',' if i < len(items) - 1 else '') for i, item in enumerate(items)]
    out.append('  ]' + ('' if last else ','))
    return out


add_favourites(npcs)  # each friend's favourite treat (favourites.py)
lines = ['{', '  "id": "halloween",', '  "name": "Pumpkin Hollow",', f'  "about": {json.dumps(about)},', '  "canopy": false,',
         f'  "tiles": {json.dumps(TILES)},', f'  "mapColors": {json.dumps(MAP_COLORS)},']
lines += (block('map', rows) + block('objects', objects) + block('npcs', npcs) + block('critters', critters) + block('life', life)
          + block('pickups', pickups) + block('interactables', interactables) + block('landmarks', landmarks, last=True))
lines += ['}']
open(REGION, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('wrote', os.path.normpath(REGION))
