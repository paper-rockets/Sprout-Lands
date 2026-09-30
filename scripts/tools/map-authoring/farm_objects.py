"""Hand-placed things for the Sunny Farm test area, plus checks:
every object stands on the right ground, nothing solid sits on a trail,
and the player can reach every important spot from the start.
Writes the map and objects into world/regions/farm.json.

    py scripts/tools/map-authoring/farm_objects.py
"""
from favourites import add_favourites
import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from farm_v2 import rows, GAP_A  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
ART = json.load(open(os.path.join(ROOT, 'src/content/starter-adventure/art.json'), encoding='utf-8'))
REGION = os.path.join(ROOT, 'src/content/starter-adventure/world/regions/farm.json')


def O(t, x, y):
    return {"type": t, "at": [x, y]}


objects = [
    # north bank, across the river (the way to the village)
    O("mushroom_red", 11, 0), O("tree_round", 14, 1), O("flower_yellow", 16, 2), O("tree_small", 18, 0),
    O("flower_yellow", 19, 3), O("tree_round", 22, 1), O("flower_pink", 24, 0), O("sign", 27, 2), O("tuft", 31, 2),
    O("tree_round", 33, 1), O("flower_white", 35, 0), O("tree_small", 37, 0),
    # a little cherry-blossom grove in the north-east
    O("blossom_tree", 41, 1), O("blossom_big", 45, 2), O("blossom_tree", 48, 0), O("blossom_bush_pink", 43, 2),
    O("blossom_bush_rose", 46, 0), O("blossom_sapling", 42, 0), O("blossom_stump", 39, 2), O("flower_pink", 44, 0),
    O("bush", 49, 2), O("rock", 51, 0),
    # river plants
    O("lilies", 8, 5), O("reed_tall", 13, 5), O("lily", 19, 5), O("lily_flower", 24, 5), O("lilies", 35, 4),
    O("water_rock", 41, 5), O("reeds_lilies", 44, 7), O("reed", 47, 8), O("reed_tall", 50, 7), O("lilypads", 53, 6),
    # south bank
    O("tree_round", 12, 8), O("bush", 15, 7), O("tree_round", 24, 8), O("flower_yellow", 26, 7),
    O("tree_round", 34, 7), O("bush", 38, 8), O("tree_small", 42, 8), O("tuft_big", 44, 8),
    # farmhouse and yard
    O("house_red", 19, 12), O("well", 23, 12), O("sunflower", 15, 12), O("flower_pink", 16, 11), O("flower_yellow", 22, 11),
    O("bush", 14, 10), O("berry_bush_red", 25, 10), O("tree_round", 11, 11), O("tree_apple", 26, 11),
    # forest edge
    O("tree_round", 7, 10), O("mushroom_red", 8, 13), O("mushrooms_purple", 6, 15), O("tree_small", 8, 17),
    O("tree_round", 7, 22), O("stump", 7, 24), O("mushroom_purple", 9, 28), O("tree_big", 10, 30), O("log", 12, 32),
    # Mama Hen's coop
    O("coop", 16, 22),
    # crops (Plant update 2 sheet); row 12 of field A and row 14 of field B are the walkways.
    # Field A: sunflowers along the top fence, cauliflower + lettuce, carrots + turnips, beets + eggplant.
    # Field B: pumpkins, melons + purple cabbage, corn, wheat.
    *[O("crop_sunflower", x, 10) for x in range(34, 41)],
    *[O("crop_cauliflower" if x < 38 else "crop_lettuce", x, 11) for x in range(34, 41)],
    *[O("crop_carrot" if x < 38 else "crop_turnip", x, 13) for x in range(34, 41)],
    *[O("crop_beet" if x < 38 else "crop_eggplant", x, 14) for x in range(34, 41)],
    *[O("crop_pumpkin", x, 12) for x in range(45, 51)],
    *[O("crop_melon" if x < 48 else "crop_cabbage_purple", x, 13) for x in range(45, 51)],
    *[O("crop_corn", x, 15) for x in range(45, 51)],
    *[O("crop_wheat", x, 16) for x in range(45, 51)],
    # birch trees at the meadow edges
    O("birch_big", 27, 20), O("birch", 28, 25), O("birch_tall", 10, 16), O("birch", 4, 13),
    # middle meadow
    O("tree_round", 22, 20), O("flower_pink", 19, 18), O("flower_yellow", 25, 17), O("bush", 20, 24),
    O("tree_small", 25, 23), O("flower_blue", 23, 26), O("tuft", 21, 23), O("rock_b", 26, 27),
    O("flower_yellow", 20, 19), O("flower_pink", 21, 17), O("flower_blue", 21, 26), O("flower_white", 24, 28),
    O("tuft", 22, 27), O("flower_yellow", 14, 15), O("flower_pink", 13, 13),
    # east meadow and the pond
    O("tree_round", 35, 21), O("flower_yellow", 32, 21), O("berry_bush_blue", 40, 22), O("tree_round", 39, 28),
    O("tuft_big", 43, 29), O("flower_white", 34, 29), O("sunflower", 42, 21), O("flower_blue", 41, 26),
    O("flower_white", 40, 30), O("tuft", 37, 29), O("flower_pink", 32, 26), O("tuft", 39, 24),
    O("lilies", 35, 24), O("lily_flower", 37, 25), O("reed_tall", 33, 25), O("reed", 36, 26),
    # orchard and beehive
    O("tree_apple", 46, 21), O("tree_orange", 50, 20), O("tree_pear", 54, 22), O("tree_peach", 48, 24),
    O("tree_apple", 52, 25), O("tree_orange", 45, 27), O("tree_pear", 49, 28), O("tree_peach", 53, 29),
    O("berry_bush_red", 43, 25), O("flower_yellow", 48, 21), O("beehive", 55, 18), O("beehive_small", 53, 18),
    O("flower_pink", 51, 22), O("tuft", 47, 26), O("flower_blue", 54, 26), O("flower_yellow", 45, 3),
    O("tuft", 20, 2), O("flower_yellow", 12, 28), O("flower_white", 15, 33),
    # south-west meadow
    O("tree_round", 16, 29), O("tree_round", 21, 31), O("bush", 13, 31),
    O("tuft", 14, 28), O("stump", 19, 27), O("rock", 8, 33),
    # the barn corner: crates and hay bales, loose hay on the ground, and a water trough for the cows
    O("crate", 17, 28), O("crate_stack", 19, 28), O("hay_bale", 22, 28), O("hay_bale_long", 24, 29), O("hay_bale", 17, 30),
    O("hay_patch", 20, 30), O("hay_patch_small", 19, 31), O("hay_patch", 22, 31), O("hay_patch_small", 26, 28), O("water_tray", 27, 30),
    # beach, dock and sea
    O("rock", 26, 33), O("log", 44, 33), O("sign_fish", 37, 35),
    O("water_rock", 31, 37), O("water_rocks", 45, 36), O("pebble", 34, 32), O("pebble", 41, 34), O("tuft", 24, 31),
    # a campfire and a picnic on the beach
    O("campfire_logs", 28, 32), O("log_small", 26, 32), O("log_small", 30, 33), O("picnic_blanket", 34, 32), O("picnic_basket", 33, 31), O("picnic_cake", 35, 31), O("picnic_pie", 34, 30),
    O("stump_small", 36, 30),
    # the little island
    O("tree_small", 12, 37), O("rock", 9, 37), O("flower_yellow", 10, 38),
    # east coast
    O("rock_b", 55, 14), O("tuft", 56, 19),
]
# People and animals you can talk to. Mama Hen's and the gardener's words are in dialogue/farm.json
# and quests/chicks-home.quest.json. The three lost chicks follow the player once greeted
# ("kind": "follower"), and stay with Mama Hen ("homeWith") once brought home.
def chick(cid, name, color, sprite, at):
    return {"id": cid, "name": name, "sprite": sprite, "kind": "follower", "tags": ["chick"], "homeWith": "mama-hen",
            "critter": {"kind": "chick", "color": color, "radius": 2}, "at": at,
            "joinsWhen": {"questStep": {"quest": "chicks-home", "step": "find"}},
            "notYetSay": [f"PEEP! ({name.upper()} IS BUSY PLAYING. MAYBE MAMA HEN NEEDS YOUR HELP FIRST.)"],
            "joinSay": ["PEEP PEEP! ARE YOU TAKING ME HOME TO MAMA?", f"({name.upper()} HOPS ALONG BEHIND YOU.)"],
            "followSay": [f"PEEP! ({name.upper()} IS RIGHT BEHIND YOU.)"],
            "homeSay": [f"PEEP PEEP! ({name.upper()} SNUGGLES UP TO MAMA HEN.)"]}


npcs = [
    {"id": "mama-hen", "name": "Mama Hen", "sprite": "animal-hen", "dialogue": "mama-hen", "critter": {"kind": "hen", "color": 0, "radius": 3}, "at": [11, 23]},
    chick("chick-pip", "Pip", 0, "animal-chick", [32, 27]),  # by the pond
    chick("chick-nutmeg", "Nutmeg", 2, "animal-chick-brown", [52, 14]),  # by the pumpkins
    chick("chick-rosie", "Rosie", 4, "animal-chick-red", [44, 1]),  # in the blossom grove, over the bridge
    {"id": "gardener", "name": "Gardener", "character": "gardener", "alt": {"character": "snowy-puppy"}, "dialogue": "gardener", "facing": "up", "at": [36, 17]},
    # sitting cats who blink now and then (pictures from build-sitting-npcs.py; spots: open grass, reachable, off paths)
    # Patch (pumpkin cat) moved to Pumpkin Hollow (halloween_objects.py); its old spot stays in OLD_SPOTS
    {"id": "cat-mittens", "name": "Mittens", "sprite": "npc-scarf-cat", "anim": "npc-scarf-cat-sit", "dialogue": "cat-mittens", "at": [20, 16]},
]
# Animals that only wander about (color picks a version from art.json creatures: 0 is the first).
critters = [
    {"kind": "hen", "color": 2, "at": [13, 24], "radius": 3},
    {"kind": "hen", "color": 1, "at": [10, 21], "radius": 2},
    {"kind": "hen", "color": 3, "at": [17, 25], "radius": 2},
    {"kind": "hen", "color": 4, "at": [23, 25], "radius": 4},
    {"id": "cow-1", "kind": "cow", "color": 0, "at": [42, 24], "radius": 4},
    {"kind": "calf", "color": 3, "at": [43, 26], "follow": "cow-1"},
    {"id": "cow-2", "kind": "cow", "color": 1, "at": [38, 29], "radius": 3},
    {"kind": "cow", "color": 4, "at": [52, 30], "radius": 3},
    {"id": "barn-cow", "kind": "cow", "color": 2, "at": [21, 29], "radius": 3},
    {"kind": "calf", "color": 4, "at": [23, 30], "follow": "barn-cow"},
]
# Small things that make the world feel alive.
life = [
    {"type": "frog", "at": [19, 5]}, {"type": "frog", "at": [24, 5], "color": 1},
    {"type": "frog", "at": [35, 24]}, {"type": "frog", "at": [37, 25], "color": 1},
    {"type": "bee", "at": [15, 12], "radius": 2}, {"type": "bee", "at": [32, 21], "radius": 2},
    {"type": "bee", "at": [55, 19], "radius": 2}, {"type": "bee", "at": [48, 21], "radius": 3}, {"type": "bee", "at": [20, 18], "radius": 2},
    {"type": "fish", "at": [10, 5], "size": "small"}, {"type": "fish", "at": [16, 5], "size": "medium"}, {"type": "fish", "at": [21, 4], "size": "small", "flip": True},
    {"type": "fish", "at": [32, 5], "size": "big"}, {"type": "fish", "at": [39, 5], "size": "small"}, {"type": "fish", "at": [46, 4], "size": "medium"},
    {"type": "fish", "at": [20, 37], "size": "medium"}, {"type": "fish", "at": [27, 38], "size": "big", "flip": True}, {"type": "fish", "at": [34, 38], "size": "small"},
    {"type": "fish", "at": [46, 38], "size": "medium"}, {"type": "fish", "at": [52, 36], "size": "small"},
    {"type": "boat", "at": [40, 37]},
    {"type": "fire", "at": [28, 32]},
]
# One-time treasures lying about: walk over them to pick them up. Every id must be different.
pickups = [
    {"id": "farm-egg-1", "item": "egg", "at": [10, 24]},
    {"id": "farm-egg-2", "item": "egg-brown", "at": [18, 24]},
    {"id": "farm-egg-3", "item": "egg-pink", "at": [24, 18]},
    {"id": "farm-egg-4", "item": "egg-green", "at": [8, 21]},
    {"id": "farm-egg-5", "item": "egg-blue", "at": [54, 24]},
    {"id": "farm-watering-can", "item": "watering-can", "at": [37, 17]},  # by the gardener, for watering the crops
    {"id": "farm-seeds-1", "item": "seeds", "at": [38, 17]}, {"id": "farm-seeds-2", "item": "seeds", "at": [39, 17]}, {"id": "farm-seeds-3", "item": "seeds", "at": [38, 16]},  # to plant in empty patches
]
# Things to use with the Talk button or E. Trees, bushes and hives need an object on the same tile.
interactables = [
    {"kind": "fishing", "at": [38, 38], "cast": [39, 38]},
    {"kind": "mailbox", "at": [23, 15], "letters": [
        {"from": "Grandma", "portrait": "gardener", "text": "DEAR {name}, WELCOME TO THE FARM! SAY HELLO TO THE HENS AND COWS. THEY LOVE A GENTLE PAT. LOVE, GRANDMA", "reward": {"coins": 5}},
        {"from": "Mama Hen", "portrait": "animal-hen", "text": "PEEP! I LEFT YOU A NOTE: THE BERRY BUSHES ARE FULL TODAY. SHAKE THEM AND SEE!", "reward": {"item": "raspberry"}}]},
    {"kind": "tree", "at": [46, 21], "item": "apple", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [50, 20], "item": "orange", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [54, 22], "item": "pear", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [48, 24], "item": "peach", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [52, 25], "item": "apple", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [45, 27], "item": "orange", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [49, 28], "item": "pear", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [53, 29], "item": "peach", "count": [1, 3], "cooldown": 40},
    {"kind": "tree", "at": [26, 11], "item": "apple", "count": [1, 2], "cooldown": 40},
    {"kind": "bush", "at": [25, 10], "item": "raspberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [43, 25], "item": "raspberry", "count": [1, 3], "cooldown": 30},
    {"kind": "bush", "at": [40, 22], "item": "blueberry", "count": [1, 3], "cooldown": 30},
    {"kind": "hive", "at": [55, 18], "item": "honey", "cooldown": 90},
    {"id": "farm-chest-island", "kind": "chest", "color": "gold", "at": [11, 37], "reward": {"coins": [8, 14], "item": "ruby"}},
    {"id": "farm-chest-blossom", "kind": "chest", "color": "cherry", "at": [47, 1], "reward": {"coins": [5, 9], "item": "amethyst"}},
    {"id": "farm-chest-forest", "kind": "chest", "color": "silver", "at": [8, 28], "reward": {"coins": [5, 9], "item": "emerald"}},
]
START = (19, 14)
MUST_REACH = {
    'house door': (19, 13), 'coop yard': (11, 24), 'field A': (37, 12), 'field B': (47, 14),
    'pier end': (38, 38), 'little island': (10, 37), 'north trail': (28, 0), 'beach east': (46, 34),
    'orchard': (51, 23),
    **{n['id']: tuple(n['at']) for n in npcs},
}

H, W = len(rows), len(rows[0])

# ---- hedge rooms: single trees in the west forest's rooms (farm_v2.py draws the walls) ---------------
# A small seeded scatter (the same every time): only in columns 2-10, every tree at least 4 tiles from
# every other tree, off trails, fences, bridges and water, never on or in front of a person, treasure or
# chest, and never where it would cut off any grass the player could walk on before.
rnd = random.Random(20260929)


def _reach(block):
    seen = {START}
    todo = [START]
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and rows[ny][nx] in '.,:|=o' and (nx, ny) not in block:
                seen.add((nx, ny))
                todo.append((nx, ny))
    return seen


taken = set()
for o in objects:
    x, y = o['at']
    taken.add((x, y))
    taken.update((x + dx, y + dy) for dx, dy in ART['objects'].get(o['type'], {}).get('foot', []))
OLD_SPOTS = [{"at": [31, 9]}]  # where Patch sat: still kept clear, so the tree scatter stays exactly the same
for thing in pickups + interactables + critters + npcs + OLD_SPOTS:
    x, y = thing['at']
    taken.update({(x, y), (x - 1, y + 1), (x, y + 1), (x + 1, y + 1), (x, y + 2)})  # its picture must not hide behind a tree
blocked ={c for o in objects for c in [(o['at'][0] + dx, o['at'][1] + dy) for dx, dy in ART['objects'].get(o['type'], {}).get('foot', [])]}
TREE_KINDS = ('tree', 'blossom_tree', 'blossom_big', 'birch')
planted = [tuple(o['at']) for o in objects if o['type'].startswith(TREE_KINDS)]
open_before = _reach(blocked)
spots = [(x, y) for y in range(0, 34) for x in range(2, 11) if rows[y][x] == '.' and (x, y) not in GAP_A]  # 2 back from the woods border, so trees stay 4 apart across it
rnd.shuffle(spots)
gap_clear = {(x + dx, y + dy) for x, y in GAP_A for dx in (-1, 0, 1, 2) for dy in (-1, 0, 1)}  # the west-wall gap and its mouth stay open
for x, y in spots:
    if (x, y) in taken or (x, y) in gap_clear or any(max(abs(x - px), abs(y - py)) < 4 for px, py in planted):
        continue
    if any(0 <= x + dx < W and 0 <= y + dy < H and rows[y + dy][x + dx] in ':fF|=o~' for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
        continue
    if _reach(blocked | {(x, y)}) != open_before - {(x, y)}:
        continue
    objects.append(O(rnd.choice(['tree_round', 'tree_round', 'tree_small', 'birch']), x, y))
    planted.append((x, y))
    blocked.add((x, y))
    taken.add((x, y))
    open_before.discard((x, y))
LAND = set('.,:fFb!?h^*')
WALK = set('.,:|=o')
WATER_TYPES = {'lily', 'lilies', 'lily_flower', 'lilypads', 'reed', 'reed_tall', 'reeds_lilies', 'water_rock',
               'water_rock_small', 'water_rocks', 'water_rock_big', 'boat', 'boat_float'}
SAND_OK = {'crop_cauliflower', 'crop_carrot', 'crop_pumpkin', 'crop_wheat', 'crop_lettuce', 'crop_beet', 'crop_eggplant',
           'crop_turnip', 'crop_melon', 'crop_cabbage_purple', 'crop_corn', 'crop_sunflower', 'picnic_cake', 'picnic_pie', 'rock', 'pebble', 'log', 'log_small',
           'sign_fish', 'sign', 'tuft', 'coop', 'campfire_logs', 'picnic_blanket', 'picnic_basket', 'stump_small'}

problems = []
solid = set()
for o in objects:
    d = ART['objects'].get(o['type'])
    x, y = o['at']
    if not d:
        problems.append(f"unknown object {o['type']}")
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
    for dx, dy in d.get('foot', []):
        fx, fy = x + dx, y + dy
        c = rows[fy][fx]
        if c not in '.,' and not (c == ':' and o['type'] in SAND_OK):
            problems.append(f"{o['type']} at {x},{y}: solid part lands on {c!r} at {fx},{fy}")
        solid.add((fx, fy))


def walkable(x, y):
    return 0 <= x < W and 0 <= y < H and rows[y][x] in WALK and (x, y) not in solid


seen = {START}
todo = [START]
while todo:
    x, y = todo.pop()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if (nx, ny) not in seen and walkable(nx, ny):
            seen.add((nx, ny))
            todo.append((nx, ny))
for name, p in MUST_REACH.items():
    if p not in seen:
        problems.append(f"can't reach {name} {p} from the start")

trees = [o for o in objects if o['type'].startswith('tree') or o['type'].startswith('blossom_tree')]
for i, a in enumerate(trees):
    for b in trees[i + 1:]:
        if abs(a['at'][0] - b['at'][0]) <= 1 and abs(a['at'][1] - b['at'][1]) <= 1:
            problems.append(f"trees touching: {a} {b}")

# Animals must start somewhere they can walk, and every animal's home must be reachable ground.
ids = set()
for c in [n['critter'] | {'at': n['at'], 'id': n['id']} for n in npcs if 'critter' in n] + critters:
    x, y = c['at']
    if not walkable(x, y):
        problems.append(f"{c['kind']} at {x},{y} starts on ground it cannot stand on ({rows[y][x]!r})")
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

ITEM_ART = ART['items']
seen_ids = set()
for pk in pickups:
    x, y = pk['at']
    if pk['item'] not in ITEM_ART:
        problems.append(f"pickup {pk['id']} uses unknown item {pk['item']}")
    if pk['id'] in seen_ids:
        problems.append(f"two pickups share the id {pk['id']}")
    seen_ids.add(pk['id'])
    if not walkable(x, y):
        problems.append(f"pickup {pk['id']} at {x},{y} is not on walkable ground ({rows[y][x]!r})")
    elif (x, y) not in seen:
        problems.append(f"pickup {pk['id']} at {x},{y} cannot be reached from the start")
by_tile = {}
for o in objects:
    by_tile.setdefault(tuple(o['at']), []).append(o['type'])
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
    elif kind == 'fishing':
        cx, cy = it['cast']
        if not walkable(x, y) or (x, y) not in seen:
            problems.append(f"fishing spot at {x},{y} must be somewhere the player can stand and reach")
        if rows[cy][cx] != '~':
            problems.append(f"fishing spot at {x},{y}: the cast tile {cx},{cy} must be open water ({rows[cy][cx]!r})")
    elif kind == 'mailbox':
        if not walkable(x, y) or rows[y][x] == ':':
            problems.append(f"mailbox at {x},{y} should stand on grass ({rows[y][x]!r})")
        if not any(walkable(x + dx, y + dy) and (x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            problems.append(f"mailbox at {x},{y} has no reachable tile next to it")
        for i, letter in enumerate(it['letters']):
            if not letter.get('from') or not letter.get('text'):
                problems.append(f"mailbox at {x},{y}: letter {i} needs a sender and text")
            item = letter.get('reward', {}).get('item')
            if item and item not in ITEM_ART:
                problems.append(f"mailbox at {x},{y}: letter {i} gives unknown item {item}")
    elif kind == 'chest':
        if it['id'] in seen_ids:
            problems.append(f"chest id {it['id']} is used twice")
        seen_ids.add(it['id'])
        if it['color'] not in ART['chests']:
            problems.append(f"chest {it['id']} has unknown colour {it['color']}")
        if not walkable(x, y):
            problems.append(f"chest {it['id']} at {x},{y} is not on walkable ground ({rows[y][x]!r})")
        if not any(walkable(x + dx, y + dy) and (x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            problems.append(f"chest {it['id']} at {x},{y} has no reachable tile next to it")
        item = it.get('reward', {}).get('item')
        if item and item not in ITEM_ART:
            problems.append(f"chest {it['id']} gives unknown item {item}")

print('objects', len(objects), '| pickups', len(pickups), '| spots', len(interactables), '| animals', len(critters) + sum(1 for n in npcs if 'critter' in n), '| life', len(life), '| reachable cells', len(seen))
print('\n'.join(problems) if problems else 'all checks passed')
if problems and '--force' not in sys.argv:
    sys.exit(1)

region = json.load(open(REGION, encoding='utf-8'))

# Fence gates go on the gaps in fence lines that run left to right. Each swings open when the player comes near.
gates = [{"at": [12, 19]}, {"at": [37, 15]}, {"at": [47, 17]}]
for g in gates:
    gx, gy = g['at']
    if not (rows[gy][gx] in ':.,' and rows[gy][gx - 1] in 'fF' and rows[gy][gx + 1] in 'fF'):
        print(f"PROBLEM: gate at {gx},{gy} is not a gap between two fence pieces ({rows[gy][gx - 1:gx + 2]!r})")
        sys.exit(1)

# Places named on the map screen: { name, at, icon }. `icon` is a name from art.json ui.mapIcons.
landmarks = [
    {"name": "Farmhouse", "at": [19, 12], "icon": "home"},
    {"name": "Chicken Coop", "at": [16, 22], "icon": "paw"},
    {"name": "Veggie Fields", "at": [37, 13], "icon": "sprout"},
    {"name": "Orchard", "at": [50, 24], "icon": "sprout"},
    {"name": "Blossom Grove", "at": [45, 2], "icon": "heart"},
    {"name": "Treasure Island", "at": [11, 37], "icon": "star"},
    {"name": "Fishing Dock", "at": [37, 35], "icon": "dock"},
    {"name": "Barn Corner", "at": [22, 28], "icon": "paw"},
]


def block(name, items, last=False):
    out = [f'  "{name}": [']
    out += [f'    {json.dumps(item)}' + (',' if i < len(items) - 1 else '') for i, item in enumerate(items)]
    out.append('  ]' + ('' if last else ','))
    return out


add_favourites(npcs)  # each friend's favourite treat (favourites.py)
lines = ['{', f'  "id": {json.dumps(region["id"])},', f'  "name": {json.dumps(region["name"])},',
         f'  "about": {json.dumps(region["about"])},', '  "canopy": false,']  # hedge rooms: no tree-tops drawn over the hedges
lines += block('map', rows) + block('objects', objects) + block('npcs', npcs) + block('critters', critters) + block('life', life) + block('pickups', pickups) + block('interactables', interactables) + block('landmarks', landmarks) + block('gates', gates, last=True)
lines += ['}']
open(REGION, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print('wrote', os.path.normpath(REGION))
