# Render one or more sprite sheets side by side, scaled up, with a 16px grid and
# column/row numbers, so tile coordinates can be read off by eye.
import sys, os
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]
scale = int(sys.argv[2])
grid = int(sys.argv[3])
paths = sys.argv[4:]
font = ImageFont.load_default()
panels = []
for p in paths:
    im = Image.open(p).convert('RGBA')
    w, h = im.width * scale, im.height * scale
    bg = Image.new('RGBA', (w + 30, h + 40), (70, 80, 100, 255))
    # checker behind transparency
    ck = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ck)
    step = grid * scale // 2
    for yy in range(0, h, step):
        for xx in range(0, w, step):
            if ((xx // step) + (yy // step)) % 2 == 0:
                d.rectangle([xx, yy, xx + step - 1, yy + step - 1], fill=(92, 104, 128, 255))
    bg.paste(ck, (26, 30))
    big = im.resize((w, h), Image.NEAREST)
    bg.paste(big, (26, 30), big)
    d = ImageDraw.Draw(bg)
    for c in range(0, im.width // grid + 1):
        x = 26 + c * grid * scale
        d.line([x, 30, x, 30 + h], fill=(255, 60, 60, 160), width=1)
        if c < im.width // grid:
            d.text((x + 3, 16), str(c), fill=(255, 255, 255, 255), font=font)
    for r in range(0, im.height // grid + 1):
        y = 30 + r * grid * scale
        d.line([26, y, 26 + w, y], fill=(255, 60, 60, 160), width=1)
        if r < im.height // grid:
            d.text((4, y + 3), str(r), fill=(255, 255, 255, 255), font=font)
    d.text((26, 2), os.path.basename(p) + f'  {im.width}x{im.height}', fill=(255, 255, 0, 255), font=font)
    panels.append(bg)
W = sum(p.width for p in panels) + 10 * (len(panels) - 1)
H = max(p.height for p in panels)
sheet = Image.new('RGBA', (W, H), (40, 44, 52, 255))
x = 0
for p in panels:
    sheet.paste(p, (x, 0)); x += p.width + 10
sheet.save(out)
print(sheet.size)
