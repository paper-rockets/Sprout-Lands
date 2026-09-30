"""Makes the home-screen icons (the picture a tablet shows for the installed game)
from one frame of a picture in public/assets, set in game.config.json:

    "pwa": { "icon": { "file": "assets/characters/floppy-pup.png", "rect": [256, 64, 64, 64] }, "backgroundColor": "#9bd4c3" }

rect = [x, y, width, height] of the frame to use. Pixel art is enlarged with sharp
pixels. Writes public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
(extra margin, for phones that cut icons into circles) and apple-touch-icon.png.

    py scripts/tools/make-icons.py
"""
import json
import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
PKG = os.environ.get('CONTENT_PACKAGE', 'starter-adventure')
config = json.load(open(os.path.join(ROOT, 'src', 'content', PKG, 'game.config.json'), encoding='utf-8'))
pwa = config.get('pwa', {})
spec = pwa.get('icon') or {'file': 'assets/characters/floppy-pup.png', 'rect': [256, 64, 64, 64]}
bg = pwa.get('backgroundColor', '#9bd4c3')
OUT = os.path.join(ROOT, 'public', 'icons')
os.makedirs(OUT, exist_ok=True)

x, y, w, h = spec['rect']
frame = Image.open(os.path.join(ROOT, 'public', spec['file'])).convert('RGBA').crop((x, y, x + w, y + h))
box = frame.getbbox()  # trim the empty space around the character
if box:
    frame = frame.crop(box)


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def icon(size, fill, rounded):
    """The character as big as `fill` of the icon allows, in whole-pixel steps, on a soft tile."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    base = hex_rgb(bg)
    light = tuple(min(255, c + 28) for c in base)
    if rounded:
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 5, fill=base + (255,))
    else:
        draw.rectangle((0, 0, size, size), fill=base + (255,))
    r = int(size * fill * 0.5)
    draw.ellipse((size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r), fill=light + (255,))
    scale = max(1, int(size * fill / max(frame.size)))
    big = frame.resize((frame.width * scale, frame.height * scale), Image.NEAREST)
    img.alpha_composite(big, ((size - big.width) // 2, (size - big.height) // 2))
    return img


icon(192, 0.78, True).save(os.path.join(OUT, 'icon-192.png'))
icon(512, 0.78, True).save(os.path.join(OUT, 'icon-512.png'))
icon(512, 0.6, False).save(os.path.join(OUT, 'icon-maskable-512.png'))
icon(180, 0.78, False).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))
print('wrote', os.path.normpath(OUT))
