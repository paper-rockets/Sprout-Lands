# Find each separate sprite in a sheet (connected opaque pixels), draw numbered
# boxes on an enlarged copy, and save the boxes as JSON for later use.
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
out_png, out_json, scale = sys.argv[1], sys.argv[2], int(sys.argv[3])
paths = sys.argv[4:]
font = ImageFont.load_default()
result = {}
panels = []
for p in paths:
    im = Image.open(p).convert('RGBA')
    W, H = im.size
    a = im.split()[3].load()
    seen = [[False] * W for _ in range(H)]
    boxes = []
    for y in range(H):
        for x in range(W):
            if a[x, y] > 0 and not seen[y][x]:
                st = [(x, y)]; seen[y][x] = True
                x0 = x1 = x; y0 = y1 = y
                while st:
                    cx, cy = st.pop()
                    x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx] and a[nx, ny] > 0:
                                seen[ny][nx] = True; st.append((nx, ny))
                boxes.append([x0, y0, x1 - x0 + 1, y1 - y0 + 1])
    # merge boxes that overlap or touch (gap <= 1px) so trunks/canopies stay together
    merged = True
    while merged:
        merged = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                A, B = boxes[i], boxes[j]
                if A[0] <= B[0] + B[2] and B[0] <= A[0] + A[2] and A[1] <= B[1] + B[3] and B[1] <= A[1] + A[3]:
                    nx0 = min(A[0], B[0]); ny0 = min(A[1], B[1])
                    nx1 = max(A[0] + A[2], B[0] + B[2]); ny1 = max(A[1] + A[3], B[1] + B[3])
                    boxes[i] = [nx0, ny0, nx1 - nx0, ny1 - ny0]
                    boxes.pop(j); merged = True; break
            if merged: break
    boxes.sort(key=lambda b: (b[1] // 16, b[0]))
    result[os.path.basename(p)] = boxes
    big = im.resize((W * scale, H * scale), Image.NEAREST)
    panel = Image.new('RGBA', (W * scale + 4, H * scale + 18), (70, 80, 100, 255))
    panel.paste(big, (2, 16), big)
    d = ImageDraw.Draw(panel)
    d.text((2, 2), os.path.basename(p), fill=(255, 255, 0, 255), font=font)
    for i, (x, y, w, h) in enumerate(boxes):
        d.rectangle([2 + x * scale, 16 + y * scale, 2 + (x + w) * scale - 1, 16 + (y + h) * scale - 1], outline=(255, 50, 50, 255))
        d.text((4 + x * scale, 17 + y * scale), str(i), fill=(255, 255, 255, 255), font=font, stroke_width=2, stroke_fill=(0, 0, 0, 255))
    panels.append(panel)
Wt = max(p.width for p in panels); Ht = sum(p.height for p in panels) + 6 * len(panels)
sheet = Image.new('RGBA', (Wt, Ht), (40, 44, 52, 255)); y = 0
for p in panels:
    sheet.paste(p, (0, y)); y += p.height + 6
sheet.save(out_png)
old = json.load(open(out_json)) if os.path.exists(out_json) else {}
old.update(result)
json.dump(old, open(out_json, 'w'), indent=1)
print(sheet.size, {k: len(v) for k, v in result.items()})
