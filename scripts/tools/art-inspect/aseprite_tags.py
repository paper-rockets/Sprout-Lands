"""Reads the animation names ("tags") out of an Aseprite file, so a sprite sheet's frames can be
matched to their animations: walk, idle, peck, and so on.

    py aseprite_tags.py file.aseprite [more.aseprite ...]

Prints the canvas size, the number of frames, and each tag: name, first frame, last frame,
direction and the speed in frames per second (from the frame durations).
"""
import struct
import sys


def read(path):
    data = open(path, 'rb').read()
    (file_size, magic, frames, width, height, depth, flags, speed) = struct.unpack_from('<IHHHHHIH', data, 0)
    if magic != 0xA5E0:
        raise ValueError('not an aseprite file')
    pos = 128
    tags = []
    durations = []
    for f in range(frames):
        (size, fmagic, old_chunks, duration, _r1, _r2, new_chunks) = struct.unpack_from('<IHHHBBI', data, pos)
        durations.append(duration)
        chunks = new_chunks if new_chunks else old_chunks
        cpos = pos + 16
        for _ in range(chunks):
            csize, ctype = struct.unpack_from('<IH', data, cpos)
            if ctype == 0x2018:  # tags
                count = struct.unpack_from('<H', data, cpos + 6)[0]
                tpos = cpos + 6 + 2 + 8
                for _t in range(count):
                    start, end, direction, repeat = struct.unpack_from('<HHBH', data, tpos)
                    tpos += 2 + 2 + 1 + 2 + 6 + 3 + 1
                    (name_len,) = struct.unpack_from('<H', data, tpos)
                    name = data[tpos + 2:tpos + 2 + name_len].decode('utf-8', 'replace')
                    tpos += 2 + name_len
                    tags.append((name, start, end, direction, repeat))
            cpos += csize
        pos += size
    return width, height, frames, durations, tags


for path in sys.argv[1:]:
    try:
        width, height, frames, durations, tags = read(path)
    except Exception as e:  # noqa: BLE001
        print(path, 'ERROR', e)
        continue
    print(f'\n{path}\n  canvas {width}x{height}, {frames} frames, default {durations[0]} ms per frame')
    dirs = {0: 'forward', 1: 'reverse', 2: 'ping-pong', 3: 'ping-pong reverse'}
    for name, start, end, direction, repeat in tags:
        span = durations[start:end + 1] or [100]
        fps = round(1000 / (sum(span) / len(span)), 1)
        print(f'  {name!r:28} frames {start:3d}-{end:3d} ({end - start + 1:2d})  {dirs.get(direction, direction):9}  ~{fps} fps')
