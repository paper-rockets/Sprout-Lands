"""Rooms inside houses (and caves): writes world/rooms/<id>.json for each room below, places them in world.json, and checks them.

    py scripts/tools/map-authoring/rooms_v1.py

A room is a box drawn with 'W' (walls; the top two rows are the back wall you see from the front) and
'_' (floor). Its 'exit' is one '_' gap in the bottom wall: walking down through it takes you back outside.
'door' says which outdoor door leads in: a region id and the region tile of the house's doorway (the
tile you walk onto under the house picture). You come back out one tile below that doorway.

Furniture comes from art.json objects. Things that hang on the wall (pictures, clocks) go on the back
wall rows; everything else stands on the floor. Food and baskets 'on a table' are placed on the tile
just below the table (their picture is lifted up onto it); food on a counter uses the counter_* pictures,
which sit on the counter's own tile (art.json "raise" lifts them). 'reserved' keeps a patch of floor empty
for a later job.

'npcs' are people standing in the room (same fields as in a region file). 'entities' are things you use:
the oven (opens the cooking screen), the shop counter (opens the shop; "shop" names a shop in
cooking.json) and quest items to pick up (the mine's crystals). "solid": true makes a thing's picture
block walking like furniture. 'critters' are wandering animals (art.json creatures: the mine's bats
and slimes), each starting on free floor.

A cave is a room too, with a style whose "shape" is "cave" and its own 'map' (any shape, not a box:
'W' rock, '_' floor; the walls are drawn to fit). Its door is not a house: 'doorway' names the object
standing just above the door tile outside (the mine's stone arch), and the check looks for it there.

Rooms sit in a strip below the islands (world.json "rooms"); the islands keep "outdoorBounds".
Other rooms in world.json are left alone.
"""
from favourites import add_favourites
import json
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
PKG = os.path.join(ROOT, 'src', 'content', 'starter-adventure')
ART = json.load(open(os.path.join(PKG, 'art.json'), encoding='utf-8'))
WORLD_PATH = os.path.join(PKG, 'world', 'world.json')
ROOM_DIR = os.path.join(PKG, 'world', 'rooms')
STRIP_Y = 60      # rooms start this many tiles down (the islands are 58 tall)
GAP = 2           # empty tiles between rooms


def box(width, height, exit_x):
    rows = ['W' * width, 'W' * width] + ['W' + '_' * (width - 2) + 'W' for _ in range(height - 3)]
    rows.append('W' * exit_x + '_' + 'W' * (width - exit_x - 1))
    return rows


ROOMS = [
    {
        "id": "baker-house", "name": "Baker Bun's House", "style": "wood-brick",
        "about": "Baker Bun's home and bakery in Cobble Village (the yellow house). Bun stands behind the counter (the shop) next to the brick oven (cooking); while the village picnic is set out, Bun is at the picnic instead.",
        "door": {"region": "east", "at": [29, 34]},
        "size": [12, 9], "exit": [5, 8],
        "npcs": [
            {"id": "baker-bun", "name": "Baker Bun", "character": "tabby-cat", "alt": {"character": "sky-puppy", "name": "Baker Sky"},
             "dialogue": "baker-bun", "facing": "down", "at": [6, 2], "hiddenWhen": {"flag": "picnic-ready"}},
        ],
        "entities": [
            {"id": "baker-counter", "name": "Bakery counter", "kind": "shop", "shop": "bakery", "object": "shelf_light", "at": [6, 3], "solid": True},
            {"id": "baker-oven", "name": "Brick oven", "kind": "oven", "object": "oven", "at": [8, 2], "solid": True},
        ],
        "objects": [
            ("wall_picture_flowers", 3, 1), ("wall_clock", 5, 1), ("wall_clock_small", 7, 1), ("wall_picture_field", 10, 1),
            ("counter_bun", 6, 3), ("counter_honey", 7, 3),
            ("bed_light_pink", 1, 2), ("lamp_pink", 2, 2), ("dresser_light", 4, 2),
            ("rug_pink", 3, 5), ("chair_light_r", 2, 5), ("table_light", 3, 5), ("chair_light_l", 4, 5), ("table_bun", 3, 6),
            ("plant_pot_flower", 10, 4), ("shelf_light", 1, 7), ("picnic_basket", 9, 7), ("plant_pot_big", 10, 7),
            ("mat_green", 5, 7),
            # a picnic corner (Plant update 2 piknik art)
            ("picnic_blanket", 8, 6), ("picnic_cake", 7, 5), ("picnic_tart", 8, 4), ("picnic_muffin", 9, 6),
        ],
        "chests": [("baker-chest", "cherry", 10, 5, {"coins": [4, 8], "item": "raspberry"})],
    },
    {
        "id": "blue-house", "name": "Blue House", "style": "wood-plank",
        "about": "An ordinary cosy home in Cobble Village (the blue house on the top street).",
        "door": {"region": "east", "at": [8, 34]},
        "size": [10, 8], "exit": [4, 7],
        "objects": [
            ("wall_picture_night", 3, 1), ("wall_picture_field", 6, 1),
            ("bed_light_blue", 1, 2), ("lamp_blue", 2, 2), ("grandfather_clock", 7, 2), ("dresser_light", 8, 2),
            ("chair_light_r", 4, 4), ("table_light", 5, 4), ("chair_light_l", 6, 4), ("table_pie", 5, 5),
            ("armchair_light", 8, 4), ("stool_pink", 2, 6), ("plant_pot_flower", 7, 6), ("plant_pot_small", 1, 6), ("plant_pot_big", 8, 6), ("mat_blue", 4, 6), ("rug_green", 5, 4),
        ],
        "chests": [("blue-house-chest", "oak", 1, 4, {"coins": [3, 6]})],
    },
    {
        "id": "pine-cabin", "name": "Pine Cabin", "style": "wood-plank",
        "about": "The little cabin up in the Pine Hills (the orange hut by the campfire).",
        "door": {"region": "east", "at": [35, 14]},
        "size": [9, 7], "exit": [4, 6],
        "objects": [
            ("wall_picture_night", 4, 1), ("wall_clock_small", 2, 1),
            ("bed_oak_green", 1, 2), ("dresser_oak", 3, 2), ("shelf_oak", 6, 2),
            ("rug_blue", 2, 4), ("mat_pink", 4, 5), ("stool_oak", 4, 3), ("table_oak", 6, 4), ("chair_oak_l", 7, 4), ("table_basket", 6, 5),
            ("plant_pot_flower", 1, 5), ("lamp_green", 7, 5),
        ],
        "chests": [("cabin-chest", "gold", 1, 4, {"coins": [6, 10], "item": "emerald"})],
    },
    {
        "id": "old-mine", "name": "The Old Mine", "style": "cave-stone",
        "about": "The old mine under the Pine Hills (the stone arch at the top of the pine trail, by Miner Moss). A winding tunnel with mine carts on rails, a sparkly crystal nook and a treasure chest at the far end.",
        "door": {"region": "east", "at": [23, 8]}, "doorway": "mine_mouth",
        "exit": [9, 13],
        # in by the bottom gap, left along the bottom, up the rail tunnel, along the top, and round into the treasure room
        "map": [
            "WWWWWWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWW",
            "WW_________WW_____WW",
            "WW________________WW",
            "WW________________WW",
            "WW___WWWWWWWW_____WW",
            "WW___WWWWWWWW_____WW",
            "WW___WWWWWWWW_____WW",
            "WW___WW______WWWWWWW",
            "WW___WW______WWWWWWW",
            "WW________________WW",
            "WW________________WW",
            "WW________________WW",
            "WWWWWWWWW_WWWWWWWWWW",
        ],
        "objects": [
            # the rail tunnel on the left, a cart parked on it, and the rails turning along the top
            ("cave_rails_up", 3, 11), ("cave_rails_up", 3, 9), ("cave_rails_up", 3, 7), ("cave_rails_up", 3, 5),
            ("cave_rails_across", 3, 3), ("cave_rails_across", 5, 3), ("cave_rails_across", 7, 3),
            ("cave_cart", 3, 6), ("cave_cart_barrel", 9, 3), ("cave_boulder_white", 2, 2), ("cave_rock_brown", 4, 12),
            # the room you come into: a workbench, crates and pots
            ("cave_workbench", 10, 8), ("cave_crate_small", 7, 10), ("cave_pots", 7, 8), ("cave_rock_grey", 12, 12),
            ("cave_crate_stack", 6, 10),
            # the crystal nook on the right
            ("cave_crystal", 17, 10), ("cave_ore_ruby", 17, 12), ("cave_ore_diamond", 15, 10), ("cave_ore_green", 14, 12),
            # the treasure room at the far end
            ("cave_ore_gold", 13, 2), ("cave_crystal", 17, 2), ("cave_crate_ore", 16, 7), ("cave_cart_side", 13, 7),
            ("cave_rock_spike", 17, 5), ("cave_ore_blue", 14, 5), ("cave_rock_orange", 10, 2),
        ],
        "chests": [("mine-chest", "gold", 15, 3, {"coins": [10, 15], "item": "diamond"})],
        # Miner Moss's quest "Sparkles in the Mine": three shiny crystals, only there while the quest is on
        "entities": [
            {"id": f"mine-crystal-{n}", "name": "Shiny crystal", "kind": "item", "object": "mine_crystal", "at": at,
             "visibleWhen": {"questActive": "sparkles-in-mine"}, "pickupSay": [say]}
            for n, at, say in [
                (1, [2, 9], "(A SHINY CRYSTAL, HIDING BY THE RAILS!)"),
                (2, [6, 2], "(A SHINY CRYSTAL, UP IN THE TOP TUNNEL!)"),
                (3, [12, 9], "(A SHINY CRYSTAL, TUCKED BEHIND THE WORKBENCH!)"),
            ]
        ],
        # friendly bats and slimes: they wander about and never hurt you
        "critters": [
            {"kind": "bat", "at": [8, 4]}, {"kind": "bat", "at": [15, 5]}, {"kind": "bat", "at": [5, 11]},
            {"kind": "slime", "at": [11, 11]}, {"kind": "slime", "at": [3, 8]}, {"kind": "slime", "at": [16, 11]},
        ],
    },
]

WALL_THINGS = {'wall_picture_flowers', 'wall_picture_field', 'wall_picture_night', 'wall_clock', 'wall_clock_small'}
problems = []


def foot(t, x, y):
    return [(x + dx, y + dy) for dx, dy in ART['objects'][t].get('foot', [])]


def region_file(rid):
    return json.load(open(os.path.join(PKG, 'world', 'regions', f'{rid}.json'), encoding='utf-8'))


def check_room(room, rows):
    rid = room['id']
    w, h = room['size']
    ex, ey = room['exit']
    if any(len(r) != w for r in rows):
        problems.append(f"{rid}: every map row must be {w} wide")
    if room['style'] not in ART['rooms']['styles']:
        problems.append(f"{rid}: unknown style {room['style']}")
    if ey != h - 1 or rows[ey][ex] != '_':
        problems.append(f"{rid}: the exit {ex},{ey} must be a gap in the bottom wall")
    solid = set()
    for x in range(w):
        for y in range(h):
            if rows[y][x] == 'W':
                solid.add((x, y))
    reserved = set()
    for r in room.get('reserved', []):
        rx, ry = r['at']
        for dx in range(r['size'][0]):
            for dy in range(r['size'][1]):
                reserved.add((rx + dx, ry + dy))
    things = [(e['object'], *e['at']) for e in room.get('entities', []) if e.get('solid')]
    things += list(room['objects']) + [('chest', cx, cy) for _, _, cx, cy, _ in room.get('chests', [])]
    for t, x, y in things:
        if t not in ART['objects']:
            problems.append(f"{rid}: unknown object {t}")
            continue
        if t in WALL_THINGS:
            if y not in (0, 1) or rows[y][x] != 'W' or not (0 < x < w - 1):
                problems.append(f"{rid}: {t} at {x},{y} should hang on the back wall")
            continue
        cells = foot(t, x, y) or [(x, y)]
        for c in cells:
            if not (0 <= c[0] < w and 0 <= c[1] < h) or rows[c[1]][c[0]] != '_':
                problems.append(f"{rid}: {t} at {x},{y} is not on the floor")
            if c in reserved:
                problems.append(f"{rid}: {t} at {x},{y} is on the patch kept free for {room['reserved'][0]['for']}")
            if (c[0], c[1]) in ((ex, ey), (ex, ey - 1)) and ART['objects'][t].get('foot'):
                problems.append(f"{rid}: {t} at {x},{y} blocks the way in")
        for c in foot(t, x, y):
            if c in solid:
                problems.append(f"{rid}: {t} at {x},{y} overlaps something solid at {c}")
            solid.add(c)
    # Every bit of floor can be walked to from the doorway (nobody can get stuck or miss a corner).
    start = (ex, ey - 1)
    seen = {start} if start not in solid else set()
    todo = list(seen)
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and (nx, ny) not in solid:
                seen.add((nx, ny))
                todo.append((nx, ny))
    floor = {(x, y) for y in range(h) for x in range(w) if rows[y][x] == '_' and (x, y) not in solid}
    for cell in sorted(floor - seen):
        problems.append(f"{rid}: floor at {cell} cannot be reached from the door")
    for cid, _, cx, cy, _ in room.get('chests', []):
        if not any((cx + dx, cy + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            problems.append(f"{rid}: chest {cid} has no free floor next to it")
    # People and things to use: on the floor, with free floor next to them to stand on.
    for who in room.get('npcs', []) + room.get('entities', []):
        x, y = who['at']
        if who.get('object') and who['object'] not in ART['objects']:
            problems.append(f"{rid}: {who['id']} uses unknown object {who['object']}")
        if rows[y][x] != '_' or ('object' not in who and (x, y) in solid):
            problems.append(f"{rid}: {who['id']} at {x},{y} is not on free floor")
        if not any((x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            problems.append(f"{rid}: nobody can stand next to {who['id']} at {x},{y}")
    for c in room.get('critters', []):
        if c['kind'] not in ART['creatures']:
            problems.append(f"{rid}: there is no animal called {c['kind']} in art.json creatures")
        if tuple(c['at']) not in seen:
            problems.append(f"{rid}: a {c['kind']} at {c['at']} does not start on free floor")
    for cell in reserved:
        if cell not in seen:
            problems.append(f"{rid}: the kept-free patch at {cell} cannot be reached")
    # The outdoor side: the doorway is a house's door tile, and there is ground to step out onto.
    reg = region_file(room['door']['region'])
    dx, dy = room['door']['at']
    if room.get('doorway'):
        if not any(o['type'] == room['doorway'] and o['at'] == [dx, dy - 1] for o in reg['objects']):
            problems.append(f"{rid}: no {room['doorway']} stands just above the door at {room['door']['region']} {dx},{dy}")
        if reg['map'][dy][dx] not in '.,:|=o':
            problems.append(f"{rid}: the door tile {dx},{dy} is not ground you can walk on")
    else:
        houses = [o for o in reg['objects'] if ART['objects'].get(o['type'], {}).get('door') is not None
                  and [o['at'][0] + ART['objects'][o['type']]['door'][0], o['at'][1] + ART['objects'][o['type']]['door'][1]] == [dx, dy]]
        if not houses:
            problems.append(f"{rid}: no house has its door at {room['door']['region']} {dx},{dy}")
    if reg['map'][dy + 1][dx] not in '.,:|=o':
        problems.append(f"{rid}: nowhere to step out below the door at {dx},{dy}")


def room_json(room):
    if 'map' in room:
        room['size'] = [len(room['map'][0]), len(room['map'])]
    w, h = room['size']
    rows = room.get('map') or box(w, h, room['exit'][0])
    check_room(room, rows)
    objects = [{"type": t, "at": [x, y]} for t, x, y in room['objects']]
    interactables = []
    for cid, colour, x, y, reward in room.get('chests', []):
        objects.append({"type": "chest", "at": [x, y]})
        interactables.append({"id": cid, "kind": "chest", "color": colour, "at": [x, y], "reward": reward})
    lines = ['{']
    for key in ('id', 'name', 'about', 'style'):
        lines.append(f'  "{key}": {json.dumps(room[key])},')
    lines.append(f'  "door": {json.dumps(room["door"])},')
    lines.append(f'  "exit": {json.dumps(room["exit"])},')
    if room.get('reserved'):
        lines.append(f'  "reserved": {json.dumps(room["reserved"])},')
    lines.append('  "map": [')
    lines += [f'    {json.dumps(r)}' + (',' if i < len(rows) - 1 else '') for i, r in enumerate(rows)]
    lines.append('  ],')
    blocks = [('objects', objects, False)]
    blocks += [(name, room[name], False) for name in ('npcs', 'entities', 'critters') if room.get(name)]
    blocks.append(('interactables', interactables, True))
    for name, items, last in blocks:
        lines.append(f'  "{name}": [')
        lines += [f'    {json.dumps(it)}' + (',' if i < len(items) - 1 else '') for i, it in enumerate(items)]
        lines.append('  ]' + ('' if last else ','))
    lines.append('}')
    return '\n'.join(lines) + '\n'


for room in ROOMS:
    add_favourites(room.get('npcs', []))  # each friend's favourite treat (favourites.py)
outputs = {room['id']: room_json(room) for room in ROOMS}

# ---- place the rooms in world.json (keep any other rooms, and never overlap them) -----------------
world = json.load(open(WORLD_PATH, encoding='utf-8'))
mine = {r['id'] for r in ROOMS}
others = [p for p in world.get('rooms', []) if p['id'] not in mine]
taken = []
for p in others:
    other = json.load(open(os.path.join(ROOM_DIR, f"{p['id']}.json"), encoding='utf-8'))
    taken.append((p['at'][0], p['at'][1], len(other['map'][0]), len(other['map'])))
outdoor = world.get('outdoorBounds') or [0, 0, world['size'][0], min(world['size'][1], STRIP_Y - GAP)]
placements = []
x = GAP
for room in ROOMS:
    w, h = room['size']
    while any(x < tx + tw + GAP and tx < x + w + GAP and STRIP_Y < ty + th + GAP and ty < STRIP_Y + h + GAP for tx, ty, tw, th in taken):
        x += 1
    placements.append({"id": room['id'], "at": [x, STRIP_Y]})
    taken.append((x, STRIP_Y, w, h))
    x += w + GAP
width = max(world['size'][0], max(tx + tw for tx, ty, tw, th in taken) + GAP)
height = max(outdoor[1] + outdoor[3], max(ty + th for tx, ty, tw, th in taken) + GAP)
if width > world['size'][0]:
    problems.append(f"the rooms need the world to be {width} wide; make the strip two rows instead")

print('rooms', len(ROOMS), '| world', width, 'x', height)
print('\n'.join(problems) if problems else 'all checks passed')
if problems and '--force' not in sys.argv:
    sys.exit(1)

os.makedirs(ROOM_DIR, exist_ok=True)
for rid, text in outputs.items():
    open(os.path.join(ROOM_DIR, f'{rid}.json'), 'w', encoding='utf-8').write(text)
    print('wrote', os.path.normpath(os.path.join(ROOM_DIR, f'{rid}.json')))

# world.json is written by hand elsewhere, so only these three lines change: size, outdoorBounds, rooms.
text = open(WORLD_PATH, encoding='utf-8').read()
start = text.index('"size"')
end = text.index('\n', start)
line = f'"size": [{width}, {height}],'
if '"outdoorBounds"' not in text:
    line += f'\n  "outdoorBounds": {json.dumps(outdoor)},'
text = text[:start] + line + text[end:]
start = text.index('"rooms"')
end = text.index('[', start)
depth = 0
while True:  # the ']' that closes the rooms list
    depth += {'[': 1, ']': -1}.get(text[end], 0)
    end += 1
    if depth == 0:
        break
room_lines = ',\n'.join(f'    {json.dumps(p)}' for p in others + placements)
text = text[:start] + '"rooms": [\n' + room_lines + '\n  ]' + text[end:]
json.loads(text)  # never write a broken file
open(WORLD_PATH, 'w', encoding='utf-8').write(text)
print('wrote', os.path.normpath(WORLD_PATH))
