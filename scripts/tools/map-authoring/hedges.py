"""The "hedge rooms" look (user's guide picture, 2026-09-29), shared by the region scripts.

Thick bush walls split the grass into small rooms and winding paths; single trees stand in the rooms
(the *_objects.py scripts keep trees 4 apart). Nature has no straight lines, so every wall wobbles:
each tile along it is 2 or 3 bushes thick and the wall drifts a tile to one side now and then.
Only plain grass ('.') becomes hedge, so trails, water, fences, bridges and stones are never covered.

Every wobble comes from a seeded random generator passed in by the region script, so the same
script always draws the same map.
"""


def wall(g, rnd, points, thick=(2, 3), drift=1, keep=()):
    """A bush wall along hand-placed points. Each leg goes straight across or straight down
    (like the trails); the wobble makes the edges uneven. `drift` is how far it may lean off the line.
    Tiles in `keep` (things placed by hand on the grass) are left as grass."""
    H, W = len(g), len(g[0])
    lean = 0
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        across = y0 == y1
        n = abs(x1 - x0) if across else abs(y1 - y0)
        step = 1 if (x1 > x0 if across else y1 > y0) else -1
        for i in range(n + 1):
            if rnd.random() < 0.35:
                lean = max(-drift, min(drift, lean + rnd.choice((-1, 1))))
            t = rnd.randint(*thick)
            for k in range(t):
                off = lean + k - (t - 1) // 2
                x, y = (x0 + i * step, y0 + off) if across else (x0 + off, y0 + i * step)
                if 0 <= x < W and 0 <= y < H and g[y][x] == '.' and (x, y) not in keep:
                    g[y][x] = 'b'


def wobble_west(rows, rnd, keep=(), most=2):
    """A straight west coast of forest (it used to be the world's edge) gets a wobble: each row turns
    0 to `most` of its outer bush tiles into water, changing every 3-5 rows, and always leaves at least
    2 bush tiles. Rows in `keep` stay as they are. Works on a list of strings; returns the new list."""
    out, v, hold = [], 0, 0
    for y, row in enumerate(rows):
        if hold == 0:
            v = max(0, min(most, v + rnd.choice((-1, 0, 1))))
            hold = rnd.randint(3, 5)
        hold -= 1
        run = len(row) - len(row.lstrip('b'))
        n = 0 if y in keep else max(0, min(v, run - 2))
        out.append('~' * n + row[n:])
    return out


def lump(g, rnd, cx, cy, rx, ry, ch='b', on='.'):
    """A wobbly round patch: a bush clump (ch 'b') or a bare earth patch (ch ':')."""
    H, W = len(g), len(g[0])
    for y in range(cy - ry - 1, cy + ry + 2):
        for x in range(cx - rx - 1, cx + rx + 2):
            if not (0 <= x < W and 0 <= y < H) or g[y][x] not in on:
                continue
            d = ((x - cx) / (rx + 0.5)) ** 2 + ((y - cy) / (ry + 0.5)) ** 2
            if d <= 1 - rnd.random() * 0.35:
                g[y][x] = ch


def seal(g, start, area, walk='.,:|=o', keep=()):
    """Walls that meet can shut in a little patch of grass nobody can walk into. Every grass tile inside
    `area` (x0, y0, x1, y1) that can't be reached from `start` becomes bush. Returns the tiles in `keep`
    that turned out to be shut in (the caller should treat those as a problem)."""
    H, W = len(g), len(g[0])
    seen = {start}
    todo = [start]
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and g[ny][nx] in walk:
                seen.add((nx, ny))
                todo.append((nx, ny))
    x0, y0, x1, y1 = area
    stuck = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] == '.' and (x, y) not in seen:
                if (x, y) in keep:
                    stuck.append((x, y))
                else:
                    g[y][x] = 'b'
    return stuck


def tidy(g, keep=()):
    """Smooth the bushes so they draw well: a bush tile with at most one bush beside it becomes grass,
    a grass tile with bushes on three sides (a one-tile notch) becomes bush, and two bush tiles that
    only touch at a corner get a third one (on grass) so the join is solid.
    Tiles in `keep` are never changed. Repeats until nothing changes."""
    H, W = len(g), len(g[0])
    keep = set(keep)
    b = lambda x, y: 0 <= x < W and 0 <= y < H and g[y][x] == 'b'
    changed = True
    while changed:
        changed = False
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if g[y][x] == '.' and (x, y) not in keep and sum(b(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) >= 3:
                    g[y][x] = 'b'  # a one-tile dead-end notch of grass
                    changed = True
                elif b(x, y) and (x, y) not in keep and sum(b(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) <= 1:
                    g[y][x] = '.'
                    changed = True
        for y in range(H - 1):
            for x in range(W - 1):
                a, c, d, e = b(x, y), b(x + 1, y), b(x, y + 1), b(x + 1, y + 1)
                if a and e and not c and not d or c and d and not a and not e:
                    for fx, fy in ((x + 1, y), (x, y + 1), (x, y), (x + 1, y + 1)):
                        if g[fy][fx] == '.' and (fx, fy) not in keep:
                            g[fy][fx] = 'b'
                            changed = True
                            break
