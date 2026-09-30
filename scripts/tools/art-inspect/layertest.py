import sys, math
from PIL import Image
sys.path.insert(0, r'C:\Users\macie\AppData\Local\Temp\claude\C--Users-macie--claude\30321c59-0171-4211-ad72-15029235d763\scratchpad')
LAYOUT = {
 (0,0):'....##.##',(1,0):'...######',(2,0):'...##.##.',(3,0):'....#..#.',(4,0):'....##.#.',(5,0):'...#####.',(6,0):'...###.##',(7,0):'...##..#.',(8,0):'...###.#.',(9,0):'##.###.##',
 (0,1):'.##.##.##',(1,1):'#########',(2,1):'##.##.##.',(3,1):'.#..#..#.',(4,1):'.##.##.#.',(5,1):'########.',(6,1):'######.##',(7,1):'##.##..#.',(8,1):'######.#.',(9,1):'.#######.',
 (0,2):'.##.##...',(1,2):'######...',(2,2):'##.##....',(3,2):'.#..#....',(4,2):'.#..##.##',(5,2):'##.######',(6,2):'.########',(7,2):'.#.##.##.',(8,2):'.#.######',(9,2):'.#.###.##',(10,2):'.#.#####.',
 (0,3):'....##...',(1,3):'...###...',(2,3):'...##....',(3,3):'....#....',(4,3):'.#..##...',(5,3):'##.###...',(6,3):'.#####...',(7,3):'.#.##....',(8,3):'.#.###...',(9,3):'.#####.#.',(10,3):'##.###.#.',
 (4,4):'.#..##.#.',(5,4):'##.#####.',(6,4):'.#####.##',(7,4):'.#.##..#.',(8,4):'.#.###.#.',
}
BIT = {'N':1,'NE':2,'E':4,'SE':8,'S':16,'SW':32,'W':64,'NW':128}
POS = ['NW','N','NE','W','C','E','SW','S','SE']
def reduce(m):
    if not (m & 1 and m & 4): m &= ~2
    if not (m & 16 and m & 4): m &= ~8
    if not (m & 16 and m & 64): m &= ~32
    if not (m & 1 and m & 64): m &= ~128
    return m
table = {}
for cell, p in LAYOUT.items():
    m = 0
    for i,k in enumerate(POS):
        if k != 'C' and p[i] == '#': m |= BIT[k]
    table[m] = cell
T = r'E:\Z Pixel\Sprout-Lands\Sprout Lands - Sprites - premium pack\Tilesets\ground tiles\New tiles'
grass = Image.open(T + r'\Grass_tiles_v2.png').convert('RGBA')
soil = Image.open(T + r'\Soil_Ground_Tiles.png').convert('RGBA')
glayer = Image.open(T + r'\Grass_Tile_Layers.png').convert('RGBA')
dglayer = Image.open(T + r'\Darker_Grass_Tile_Layers.png').convert('RGBA')
hill = Image.open(T + r'\Grass_Hill_Tiles_v2.png').convert('RGBA')
water = Image.open(r'E:\Z Pixel\Sprout-Lands\public\assets\tiles\water.png').convert('RGBA').crop((0,0,16,16))
W,H = 26,16
land = [[0]*W for _ in range(H)]
for y in range(H):
    for x in range(W):
        if math.hypot((x-12.5)/11, (y-7.5)/6.6) < 1: land[y][x] = 1
path = [[0]*W for _ in range(H)]
for x in range(3, 22): path[8][x] = 1; path[9][x] = 1
for y in range(3, 13): path[y][12] = 1; path[y][13] = 1
for y in range(4,7):
    for x in range(16,20): path[y][x] = 1
dark = [[0]*W for _ in range(H)]
for y in range(10,14):
    for x in range(4,9): dark[y][x] = land[y][x]
hl = [[0]*W for _ in range(H)]
for y in range(3,6):
    for x in range(4,10): hl[y][x] = 1
def blob(img, grid, x, y, same=None):
    same = same or (lambda xx, yy: 0 <= xx < W and 0 <= yy < H and grid[yy][xx])
    m = (1 if same(x,y-1) else 0)|(2 if same(x+1,y-1) else 0)|(4 if same(x+1,y) else 0)|(8 if same(x+1,y+1) else 0)|(16 if same(x,y+1) else 0)|(32 if same(x-1,y+1) else 0)|(64 if same(x-1,y) else 0)|(128 if same(x-1,y-1) else 0)
    c = table[reduce(m)]
    return img.crop((c[0]*16, c[1]*16, c[0]*16+16, c[1]*16+16))
def render(style):
    out = Image.new('RGBA', (W*16, H*16))
    for y in range(H):
        for x in range(W): out.paste(water, (x*16, y*16))
    for y in range(H):
        for x in range(W):
            if land[y][x]: out.alpha_composite(blob(grass, land, x, y), (x*16, y*16))
    if style == 'soil-on-grass':
        for y in range(H):
            for x in range(W):
                if path[y][x] and land[y][x]: out.alpha_composite(blob(soil, path, x, y), (x*16, y*16))
    else:
        # soil everywhere inland under a grass layer with holes
        inland = lambda xx, yy: 0 <= xx < W and 0 <= yy < H and land[yy][xx]
        for y in range(H):
            for x in range(W):
                if not land[y][x]: continue
                near = any(0 <= x+dx < W and 0 <= y+dy < H and path[y+dy][x+dx] for dx in (-1,0,1) for dy in (-1,0,1))
                if near: out.alpha_composite(soil.crop((16,16,32,32)), (x*16, y*16))
        gl = [[1 if land[y][x] and not path[y][x] else 0 for x in range(W)] for y in range(H)]
        same = lambda xx, yy: not (0 <= xx < W and 0 <= yy < H) or (gl[yy][xx] == 1 or not land[yy][xx])
        for y in range(H):
            for x in range(W):
                if gl[y][x]:
                    near = any(0 <= x+dx < W and 0 <= y+dy < H and path[y+dy][x+dx] for dx in (-1,0,1) for dy in (-1,0,1))
                    if near: out.alpha_composite(blob(glayer, gl, x, y, same), (x*16, y*16))
    for y in range(H):
        for x in range(W):
            if dark[y][x]: out.alpha_composite(blob(dglayer, dark, x, y), (x*16, y*16))
            if hl[y][x]: out.alpha_composite(blob(hill, hl, x, y), (x*16, y*16))
    return out
a = render('soil-on-grass'); b = render('grass-layer-holes')
sheet = Image.new('RGBA', (W*16*2+8, H*16), (0,0,0,255)); sheet.paste(a, (0,0)); sheet.paste(b, (W*16+8, 0))
sheet = sheet.resize((sheet.width*2, sheet.height*2), Image.NEAREST)
sheet.save(r'C:\Users\macie\AppData\Local\Temp\claude\C--Users-macie--claude\30321c59-0171-4211-ad72-15029235d763\scratchpad\layertest.png'); print(sheet.size)
