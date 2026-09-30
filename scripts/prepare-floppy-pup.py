"""Build the 64 px walking sheet from the transparent generated source.

Requires Pillow. The source image has 8 poses across and 3 animation rows,
but its visual rows cross the exact 256 px grid boundaries. Trim each pose
from its visual row before fitting it inside a 64 px game frame.
"""

from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Generated Characters/high-resolution-sources/floppy-pup-walk-8dir-3frame.png"
SHEET = ROOT / "Generated Characters/game-ready-4dir/floppy-pup-walk-8dir-3frame-512x192.png"
PREVIEW = ROOT / "Generated Characters/previews/floppy-pup-walk-preview.png"

source = Image.open(SOURCE).convert("RGBA")
if source.size != (2048, 768):
    raise ValueError(f"Expected a 2048 x 768 source sheet, got {source.size}")

sheet = Image.new("RGBA", (512, 192))
row_bands = ((95, 280), (305, 485), (520, 700))
palette = (
    (255, 250, 245), (246, 237, 229), (232, 213, 202),
    (205, 173, 160), (170, 131, 118),
    (251, 205, 219), (244, 166, 193), (230, 127, 167),
    (110, 193, 246), (35, 145, 234), (19, 104, 201),
)


def nearest_color(color):
    return min(palette, key=lambda match: sum((color[i] - match[i]) ** 2 for i in range(3)))

for row, (top, bottom) in enumerate(row_bands):
    for col in range(8):
        pose = source.crop((col * 256, top, (col + 1) * 256, bottom))
        visible = pose.getchannel("A").point(lambda alpha: 255 if alpha > 64 else 0)
        box = visible.getbbox()
        if box is None:
            raise ValueError(f"No sprite found in row {row}, column {col}")
        x0, y0, x1, y1 = box
        pose = pose.crop((max(0, x0 - 3), max(0, y0 - 3), min(256, x1 + 3), min(bottom - top, y1 + 3)))
        # Keep one scale for every direction so side views do not grow larger
        # than front and back views simply because their ears are narrower.
        scale = 0.21
        width = round(pose.width * scale)
        height = round(pose.height * scale)
        pose = pose.resize((width, height), Image.Resampling.NEAREST)

        # Warm, unobtrusive contours replace the nearly black generated lines.
        pixels = []
        for red, green, blue, alpha in pose.get_flattened_data():
            if alpha < 128:
                pixels.append((0, 0, 0, 0))
                continue
            shade = (red + green + blue) / 3
            if shade < 75:
                color = (170, 131, 118)
            elif shade < 125:
                color = (205, 173, 160)
            else:
                color = (red, green, blue)
            pixels.append((*nearest_color(color), 255))
        pose.putdata(pixels)

        x = col * 64 + (64 - width) // 2
        y = row * 64 + 60 - height
        sheet.alpha_composite(pose, (x, y))

# The generated facial marks become muddy at game size. Redraw only those
# handful of pixels as a small, consistent pixel-art face.
draw = ImageDraw.Draw(sheet)
for row in range(3):
    for col, shift in ((3, -1), (4, 0), (5, 1)):
        ox, oy = col * 64, row * 64
        for eye_x in (24 + shift, 38 + shift):
            draw.rectangle((ox + eye_x - 2, oy + 35, ox + eye_x + 3, oy + 41), fill=(255, 250, 245, 255))
            draw.rectangle((ox + eye_x, oy + 37, ox + eye_x + 1, oy + 39), fill=(35, 145, 234, 255))
            draw.point((ox + eye_x, oy + 37), fill=(110, 193, 246, 255))
        draw.rectangle((ox + 28 + shift, oy + 40, ox + 35 + shift, oy + 43), fill=(255, 250, 245, 255))
        for dx, dy in ((0, 0), (1, 1), (2, 0), (3, 1), (4, 0)):
            draw.point((ox + 30 + shift + dx, oy + 41 + dy), fill=(19, 104, 201, 255))

SHEET.parent.mkdir(parents=True, exist_ok=True)
PREVIEW.parent.mkdir(parents=True, exist_ok=True)
sheet.save(SHEET)
sheet.resize((1024, 384), Image.Resampling.NEAREST).save(PREVIEW)
