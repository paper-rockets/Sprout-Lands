# Render a test shape with the Cup Nooble v2 blob layout to check the edge table.
import sys, random
from PIL import Image
LAYOUT = {
 (0,0):'....##.##',(1,0):'...######',(2,0):'...##.##.',(3,0):'....#..#.',(4,0):'....##.#.',(5,0):'...#####.',(6,0):'...###.##',(7,0):'...##..#.',(8,0):'...###.#.',(9,0):'##.###.##',
 (0,1):'.##.##.##',(1,1):'#########',(2,1):'##.##.##.',(3,1):'.#..#..#.',(4,1):'.##.##.#.',(5,1):'########.',(6,1):'######.##',(7,1):'##.##..#.',(8,1):'######.#.',(9,1):'.#######.',
 (0,2):'.##.##...',(1,2):'######...',(2,2):'##.##....',(3,2):'.#..#....',(4,2):'.#..##.##',(5,2):'##.######',(6,2):'.########',(7,2):'.#.##.##.',(8,2):'.#.######',(9,2):'.#.###.##',(10,2):'.#.#####.',
 (0,3):'....##...',(1,3):'...###...',(2,3):'...##....',(3,3):'....#....',(4,3):'.#..##...',(5,3):'##.###...',(6,3):'.#####...',(7,3):'.#.##....',(8,3):'.#.###...',(9,3):'.#####.#.',(10,3):'##.###.#.',
 (4,4):'.#..##.#.',(5,4):'##.#####.',(6,4):'.#####.##',(7,4):'.#.##..#.',(8,4):'.#.###.#.',
}
BIT = {'N':1,'NE':2,'E':4,'SE':8,'S':16,'SW':32,'W':64,'NW':128}
POS = ['NW','N','NE','W','C','E','SW','S','SE']
def pat_to_mask(p):
    m = 0
    for i,k in enumerate(POS):
        if k != 'C' and p[i] == '#': m |= BIT[k]
    return m
def reduce(m):
    if not (m & 1 and m & 4): m &= ~2
    if not (m & 16 and m & 4): m &= ~8
    if not (m & 16 and m & 64): m &= ~32
    if not (m & 1 and m & 64): m &= ~128
    return m
table = {}
for cell, p in LAYOUT.items():
    m = pat_to_mask(p)
    if reduce(m) != m: print('pattern not reduced!', cell, p)
    if m in table: print('duplicate mask', cell, table[m])
    table[m] = cell
print('masks:', len(table))
sheet = Image.open(sys.argv[1]).convert('RGBA')
water = Image.open(sys.argv[2]).convert('RGBA').crop((0,0,16,16))
W,H = 28,18
random.seed(3)
grid = [[0]*W for _ in range(H)]
import math
for y in range(H):
    for x in range(W):
        d = math.hypot((x-13)/10, (y-8.5)/6.5)
        if d < 1 + 0.15*math.sin(x*1.3+y*0.7): grid[y][x] = 1
# carve a pond, a thin strip and a single tile, diagonal touches
for y in range(6,10):
    for x in range(9,13): grid[y][x] = 0
for x in range(20,27): grid[3][x] = 1
grid[1][24] = 1; grid[15][3] = 1; grid[14][4] = 1
grid[5][18] = 0; grid[12][17] = 0; grid[11][18]=0
out = Image.new('RGBA', (W*16, H*16))
for y in range(H):
    for x in range(W):
        out.paste(water, (x*16, y*16))
fill = (1,1)
for y in range(H):
    for x in range(W):
        if not grid[y][x]: continue
        def g(dx,dy):
            xx,yy = x+dx,y+dy
            return 0 <= xx < W and 0 <= yy < H and grid[yy][xx] == 1
        m = (1 if g(0,-1) else 0) | (2 if g(1,-1) else 0) | (4 if g(1,0) else 0) | (8 if g(1,1) else 0) | (16 if g(0,1) else 0) | (32 if g(-1,1) else 0) | (64 if g(-1,0) else 0) | (128 if g(-1,-1) else 0)
        m = reduce(m)
        c = table.get(m)
        if c is None:
            print('missing', m); c = fill
        t = sheet.crop((c[0]*16, c[1]*16, c[0]*16+16, c[1]*16+16))
        out.alpha_composite(t, (x*16, y*16))
out = out.resize((out.width*3, out.height*3), Image.NEAREST)
out.save(sys.argv[3])
print('saved', out.size)
