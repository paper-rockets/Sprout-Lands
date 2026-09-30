"""Load and save src/content/<package>/art.json without wrecking its layout.

The file is meant to be read and edited by people, so lists of pictures, tilesets, objects and
animations keep one entry per line, and short things stay on one line.

    import sys; sys.path.insert(0, r'E:\\Z Pixel\\Sprout-Lands\\scripts\\tools')
    from artjson import load, save
    art = load(); art['objects']['new_thing'] = {...}; save(art)
"""
import json
import os

PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'content', 'starter-adventure', 'art.json')
ONE_PER_LINE = ('textures', 'tilesets', 'objects', 'animations')


def compact(v):
    return json.dumps(v, ensure_ascii=False, separators=(', ', ': '))


def fmt(v, indent=0, width=118):
    text = compact(v)
    if not isinstance(v, (dict, list)) or len(text) + indent <= width:
        return text
    pad = ' ' * (indent + 2)
    if isinstance(v, dict):
        items = [f'{pad}{json.dumps(k, ensure_ascii=False)}: {fmt(x, indent + 2, width)}' for k, x in v.items()]
        return '{\n' + ',\n'.join(items) + '\n' + ' ' * indent + '}'
    items = [f'{pad}{fmt(x, indent + 2, width)}' for x in v]
    return '[\n' + ',\n'.join(items) + '\n' + ' ' * indent + ']'


def dumps(art):
    lines = ['{']
    keys = list(art.keys())
    for i, key in enumerate(keys):
        value = art[key]
        comma = ',' if i < len(keys) - 1 else ''
        if key in ONE_PER_LINE and isinstance(value, dict):
            lines.append(f'  "{key}": {{')
            items = list(value.items())
            for j, (name, entry) in enumerate(items):
                lines.append(f'    {json.dumps(name, ensure_ascii=False)}: {compact(entry)}' + (',' if j < len(items) - 1 else ''))
            lines.append('  }' + comma)
        else:
            lines.append(f'  "{key}": {fmt(value, 2)}{comma}')
    lines.append('}')
    return '\n'.join(lines) + '\n'


def load(path=PATH):
    return json.load(open(path, encoding='utf-8'))


def save(art, path=PATH):
    text = dumps(art)
    json.loads(text)  # make sure it is still valid
    open(path, 'w', encoding='utf-8').write(text)
