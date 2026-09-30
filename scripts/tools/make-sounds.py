"""Make every sound effect in the game from scratch (no recordings, no packs).

    py scripts/tools/make-sounds.py          writes the .wav files into "Made Sounds/"
    py scripts/tools/make-sounds.py coin     make just one (or a few) by name
    node scripts/sync-art.mjs                 then copies them into public/assets/audio

The sounds are built with the instruments in synth.py: struck wooden bars, bells, plucked strings,
breathy flutes, voices shaped by mouth resonances, and noise shaped like leaves, water and wood.
They are all gentle and rounded on purpose (a game for young children): no harsh buzzers, and the
"no" sound is a friendly bonk. Musical sounds use the same notes as the music (a pentatonic
scale), so nothing clashes with the soundtrack.

The list at the bottom (SOUNDS) is the only place that names the sounds.
"""
import json
import os
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from synth import (SR, band, bass, bell, decay, fade, finish, flute, glock, harp, high, kalimba, kick, low, marimba,  # noqa: E402
                   midi, mix, musicbox, noise, note, ocarina, osc, pink, pluck, resonator, seq, shape, soft, sweep, t_of,
                   tick, voice_ah)
import synth as S  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'Made Sounds')
rng = S.rng


def sine_sweep(f0, f1, dur, curve='exp'):
    return np.sin(2 * np.pi * np.cumsum(sweep(f0, f1, dur, curve)) / SR)


def grains(dur, count, lo, hi, length=(0.006, 0.02), level=(0.4, 1.0), seed=None):
    """Lots of tiny noise bursts scattered over dur: leaves, gravel, crumbs, paper."""
    r = np.random.default_rng(seed) if seed is not None else rng
    out = np.zeros(int(dur * SR))
    for _ in range(count):
        d = r.uniform(*length)
        n = int(d * SR)
        start = int(r.uniform(0, max(0.0001, dur - d)) * SR)
        f0 = r.uniform(lo, hi)
        burst = band(r.uniform(-1, 1, n), f0 * 0.6, f0 * 1.5, 2) * np.exp(-np.arange(n) / SR / (d / 3))
        out[start:start + n] += burst * r.uniform(*level)
    return out


def formant_voice(f0, dur, formants, vib=5.0, vib_depth=0.012, breath=0.0, q=9):
    """A voice: a buzzing throat (f0 may glide) shaped by mouth resonances [(Hz, loudness), ...]."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = (np.full(n, float(f0)) if np.isscalar(f0) else np.interp(np.linspace(0, 1, n), np.linspace(0, 1, len(f0)), f0))
    f = f * (1 + vib_depth * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / 0.15))
    src = osc(f, None, 'saw')
    out = sum(resonator(src, fr, q, g) for fr, g in formants)
    if breath:
        out = out + breath * band(noise(dur), 500, 4000)
    return out


def creak(f0, f1, dur, rough=0.4, body=520):
    """An old wooden hinge: a scratchy rattle of tiny clicks that rings in a wooden frame."""
    n = int(dur * SR)
    f = sweep(f0, f1, dur, 'lin') * (1 + 0.06 * np.cumsum(rng.standard_normal(n)) / 300)
    ph = np.cumsum(f) / SR
    clicks = (np.mod(ph, 1) < 0.05).astype(float) * (1 + rough * rng.uniform(-1, 1, n))
    x = band(clicks, 600, 3800) * 1.0
    x = x + 0.6 * resonator(x, body, 7) + 0.4 * resonator(x, body * 2.3, 6)
    return x * shape(n, 0.04, dur * 0.4, dur * 0.5, 1.4)


def thud(f, dur, body=1.0):
    t = t_of(dur)
    x = sine_sweep(f * 1.6, f, dur) * np.exp(-t / (dur * 0.35))
    return x * body + 0.25 * low(noise(dur), f * 6) * np.exp(-t / 0.03)


# ---------------------------------------------------------------- menus and talking

def s_tap():
    # a small wooden "tock"
    return finish(mix(tick(1.0, 0.06, 1500) * 0.9, marimba(note('G5'), 0.12, 0.5) * 0.25), 0.55, (0.15, 0.1))


def s_open():
    return finish(seq([(marimba(note('G5'), 0.3, 0.8), 0), (marimba(note('C6'), 0.35, 0.9), 0.07)]), 0.6, (0.3, 0.15))


def s_close():
    return finish(seq([(marimba(note('C6'), 0.3, 0.8), 0), (marimba(note('G5'), 0.35, 0.8), 0.07)]), 0.55, (0.3, 0.15))


def s_page():
    # a page turning: a soft swish with a little crinkle at the end
    n = int(0.3 * SR)
    sw = band(pink(0.3), 1800, 7500) * np.sin(np.linspace(0, np.pi, n)) ** 1.6
    cr = grains(0.3, 14, 3000, 7000, (0.004, 0.012), (0.3, 0.8), seed=3) * np.linspace(0.2, 1, n)
    return finish(sw * 0.7 + cr * 0.6, 0.42, (0.2, 0.1))


def s_select():
    return finish(mix(harp(note('E5'), 0.7), 0.5 * harp(note('B5'), 0.6)), 0.6, (0.4, 0.15))


def s_toggle():
    return finish(seq([(tick(1.0, 0.05, 1600), 0), (tick(1.0, 0.06, 2300), 0.05)]), 0.5, (0.15, 0.08))


def s_talk():
    # one speech "bloop"; the game changes its pitch for each speaker and every letter
    t = t_of(0.075)
    f = sweep(500, 570, 0.075)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)) * np.sin(np.pi * np.minimum(1, t / 0.075)) ** 0.7 * np.exp(-t / 0.05)
    return finish(low(x, 2600), 0.42, None, 0.004, 0.02)


def s_locked():
    # a friendly "bonk-bonk" going down: not now / can't
    return finish(seq([(marimba(note('D4'), 0.3, 0.9), 0), (marimba(note('A3'), 0.4, 0.9), 0.15)]), 0.6, (0.25, 0.12))


def s_whoosh():
    # the map or journal slides in: air moving
    n = int(0.4 * SR)
    x = band(pink(0.4), 400, 3200) * np.sin(np.linspace(0, np.pi, n)) ** 1.3
    return finish(x, 0.3, (0.2, 0.1))


# ---------------------------------------------------------------- walking

def s_step_grass():
    n = int(0.12 * SR)
    sw = band(pink(0.12), 800, 5000) * np.sin(np.linspace(0, np.pi, n)) ** 1.5 * 0.7
    gr = grains(0.12, 10, 3000, 7000, (0.003, 0.008), (0.3, 0.7))
    return finish(sw + gr * 0.6, 0.26, (0.08, 0.05))


def s_step_dirt():
    n = int(0.1 * SR)
    x = band(noise(0.1), 250, 2200) * shape(n, 0.004, 0, 0.1, 3)
    return finish(x + 0.5 * thud(110, 0.1), 0.3, (0.08, 0.05))


def s_step_wood():
    t = t_of(0.14)
    click = band(noise(0.01), 500, 4000) * np.exp(-t[:int(0.01 * SR)] / 0.003)
    x = np.zeros(len(t))
    x[:len(click)] += click
    x = resonator(x, 210, 9, 1.6) + resonator(x, 430, 7, 0.9) + 0.25 * x
    return finish(x * np.exp(-t / 0.045), 0.42, (0.12, 0.08))


def s_step_stone():
    t = t_of(0.08)
    x = band(noise(0.08), 1500, 7000) * np.exp(-t / 0.012)
    return finish(mix(x, 0.5 * tick(1.0, 0.05, 2600), 0.4 * thud(200, 0.08, 0.5)), 0.3, (0.1, 0.06))


# ---------------------------------------------------------------- gardening

def s_water():
    # pouring from a watering can: a soft stream with bubbling
    dur = 0.9
    n = int(dur * SR)
    bub = low(rng.uniform(0, 1, n), 14)
    stream = band(pink(dur), 700, 3800) * (0.55 + 0.6 * bub) * shape(n, 0.12, 0.45, 0.45, 1.6)
    drops = np.zeros(n)
    for i in range(18):
        f = rng.uniform(1200, 3000)
        d = int(0.05 * SR)
        s0 = int(rng.uniform(0.04, 0.8) * SR)
        drops[s0:s0 + d] += sine_sweep(f * 0.7, f * 1.25, 0.05) * np.exp(-np.arange(d) / SR / 0.015) * rng.uniform(0.15, 0.4)
    return finish(stream * 0.6 + drops, 0.5, (0.25, 0.12))


def s_grow():
    # the plant grows a step: three rising notes
    p = ['G5', 'C6', 'E6']
    return finish(seq([(harp(note(n), 0.8, 0.8), i * 0.07) for i, n in enumerate(p)]), 0.55, (0.5, 0.2))


def s_ripe():
    p = ['C6', 'E6', 'G6', 'C7']
    return finish(seq([(glock(note(n), 1.0, 0.9), i * 0.08) for i, n in enumerate(p)]), 0.6, (0.6, 0.25))


def s_pick():
    # pulling a vegetable out of the ground: rustle, then a "pop"
    rus = grains(0.14, 12, 1500, 5000, (0.004, 0.012), (0.3, 0.8), seed=5)
    t = t_of(0.12)
    pop = sine_sweep(220, 720, 0.12) * np.exp(-t / 0.03)
    pop = pop + 0.5 * resonator(pop, 600, 6)
    return finish(seq([(rus, 0), (pop, 0.12)]), 0.6, (0.12, 0.08))


def s_plant():
    # digging a little hole and patting the soil
    dig = grains(0.22, 18, 500, 2200, (0.006, 0.02), (0.3, 0.8), seed=6)
    pat = lambda v: thud(95, 0.09) * v
    return finish(seq([(dig, 0), (pat(1.0), 0.26), (pat(0.8), 0.39)]), 0.55, (0.1, 0.06))


# ---------------------------------------------------------------- things in the world

def s_rustle():
    # leaves shaking
    return finish(grains(0.6, 60, 3500, 8500, (0.004, 0.018), (0.3, 1.0), seed=7) * shape(int(0.6 * SR), 0.03, 0.15, 0.4, 1.3), 0.45, (0.15, 0.1))


def s_drop():
    # fruit landing on grass: a soft thump and a little bounce
    return finish(seq([(thud(150, 0.16), 0), (thud(190, 0.09, 0.4), 0.17)]), 0.6, (0.1, 0.06))


def s_found():
    # picked something up: a bright two-note "bling"
    return finish(seq([(bell(note('E6'), 0.8, 0.9), 0), (bell(note('B6'), 0.9, 0.9), 0.08)]), 0.6, (0.5, 0.22))


def s_coin():
    # a little metal coin: two quick pings
    return finish(seq([(bell(note('B5'), 0.3, 1.2), 0), (bell(note('E6'), 0.8, 1.3), 0.07)]), 0.55, (0.3, 0.15))


def s_heart():
    # a warm "ba-dum" and a shimmer
    beat = lambda v: thud(62, 0.16) * v
    shimmer = seq([(harp(note(n), 0.9, 0.7), i * 0.06) for i, n in enumerate(['A5', 'C#6', 'E6', 'A6'])])
    return finish(seq([(beat(1.0), 0), (beat(0.8), 0.16), (shimmer, 0.26)]), 0.6, (0.5, 0.22))


def s_star():
    return finish(seq([(glock(note('G6'), 1.0, 1.0), 0), (glock(note('D7'), 1.2, 0.9), 0.07)]), 0.5, (0.6, 0.25))


def s_sparkle():
    r = np.random.default_rng(12)
    parts = [(glock(r.uniform(2300, 5200), 0.5, r.uniform(0.3, 0.8)), i * 0.05 + r.uniform(0, 0.02)) for i in range(9)]
    return finish(seq(parts), 0.45, (0.6, 0.3))


def s_honey():
    # a bee buzzing by, then a sticky "glug"
    dur = 0.55
    n = int(dur * SR)
    t = t_of(dur)
    f = 210 + 14 * np.sin(2 * np.pi * 6 * t)
    buzz = low(osc(f, None, 'saw'), 1800) * (0.6 + 0.4 * np.sin(2 * np.pi * 110 * t)) * shape(n, 0.06, 0.25, 0.25, 1.4)
    glug = lambda f0: sine_sweep(f0, f0 * 1.9, 0.11) * np.sin(np.pi * np.linspace(0, 1, int(0.11 * SR))) * 0.7
    return finish(seq([(buzz * 0.5, 0), (glug(260), 0.45), (glug(330), 0.58)]), 0.55, (0.15, 0.08))


def s_gate_open():
    return finish(creak(45, 75, 0.35, 0.4, 430), 0.4, (0.2, 0.1))


def s_gate_close():
    k = mix(thud(180, 0.1), resonator(band(noise(0.04), 600, 3000) * np.exp(-t_of(0.04) / 0.008), 300, 6, 1.2))
    return finish(seq([(k, 0), (tick(0.7, 0.04, 1200), 0.09)]), 0.5, (0.15, 0.1))


def s_door_open():
    return finish(creak(60, 32, 0.5, 0.35, 380), 0.42, (0.3, 0.14))


def s_door_close():
    return finish(mix(thud(85, 0.25, 1.0), 0.3 * resonator(band(noise(0.25), 300, 2500) * np.exp(-t_of(0.25) / 0.03), 240, 6)), 0.55, (0.3, 0.15))


def s_room_in():
    # stepping through a door: an airy whoosh going up with a soft chime
    dur = 0.6
    n = int(dur * SR)
    src = pink(dur)
    out = np.zeros(n)
    for i, (lo, hi) in enumerate(zip(np.geomspace(300, 1800, 6), np.geomspace(700, 3500, 6))):
        seg = band(src, lo, hi, 2) * np.exp(-((np.linspace(0, 1, n) - (i + 0.5) / 6) ** 2) / 0.02)
        out += seg
    out *= np.sin(np.linspace(0, np.pi, n)) ** 1.2
    return finish(mix(out * 0.6, np.concatenate([np.zeros(int(0.35 * SR)), 0.3 * glock(note('E6'), 0.5)])), 0.38, (0.3, 0.15))


def s_room_out():
    dur = 0.6
    return finish(s_room_in()[::-1].copy(), 0.36, None)


def s_mail():
    # unfolding a letter: crinkly paper and a tiny ting
    cr = grains(0.4, 30, 2500, 7500, (0.004, 0.02), (0.3, 1.0), seed=9)
    return finish(mix(cr * 0.8, np.concatenate([np.zeros(int(0.3 * SR)), 0.35 * bell(note('G6'), 0.6)])), 0.42, (0.2, 0.1))


def s_splash():
    # a plop into water with bubbles
    t = t_of(0.3)
    plop = sine_sweep(1200, 300, 0.3) * np.exp(-t / 0.06)
    wash = band(pink(0.35), 700, 5000) * shape(int(0.35 * SR), 0.004, 0, 0.35, 3) * 0.5
    bub = np.zeros(int(0.5 * SR))
    for i, f in enumerate(rng.uniform(600, 1500, 5)):
        d = int(0.05 * SR)
        s0 = int((0.1 + i * 0.05) * SR)
        bub[s0:s0 + d] += sine_sweep(f, f * 1.8, 0.05) * np.exp(-np.arange(d) / SR / 0.02) * 0.3
    return finish(mix(plop, wash, bub), 0.55, (0.3, 0.14))


def s_cast():
    # the fishing line whips out
    dur = 0.3
    n = int(dur * SR)
    x = np.zeros(n)
    src = noise(dur)
    for i in range(8):
        a, b = int(n * i / 8), int(n * (i + 1) / 8)
        c = 5500 - 4200 * i / 8
        x[a:b] = band(src[a:b], c * 0.7, c * 1.4)
    return finish(x * shape(n, 0.04, 0, 0.26, 2.5), 0.35, (0.1, 0.06))


def s_bite():
    return finish(seq([(marimba(note('D5'), 0.15, 0.8), 0), (marimba(note('A5'), 0.2, 0.9), 0.1)]), 0.55, (0.2, 0.1))


def s_chest():
    lid = creak(35, 60, 0.42, 0.4, 350)
    glow = seq([(bell(note('C6'), 1.0, 0.8), 0), (bell(note('G6'), 1.2, 0.8), 0.12), (bell(note('E7'), 1.2, 0.6), 0.24)])
    return finish(seq([(lid, 0), (glow, 0.3)]), 0.55, (0.5, 0.22))


# ---------------------------------------------------------------- friends and animals

def s_pet():
    # a happy "mmm!" hum
    f = np.concatenate([sweep(400, 560, 0.1), sweep(560, 520, 0.14)])
    x = formant_voice(f, 0.24, [(400, 1.0), (1000, 0.25), (2300, 0.08)], vib=6, vib_depth=0.01)
    return finish(x * shape(len(x), 0.03, 0.08, 0.14, 1.4), 0.5, (0.2, 0.1))


def chirp(f0, f1, dur, vib=0.0, level=1.0):
    f = sweep(f0, f1, dur)
    if vib:
        f = f * (1 + 0.03 * np.sin(np.linspace(0, vib * 2 * np.pi, len(f))))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.3 * np.sin(2 * ph)
    return x * np.sin(np.linspace(0, np.pi, len(f))) ** 0.8 * level


def s_peep():
    # a chick: three quick cheeps
    return finish(seq([(chirp(3000, 4100, 0.075), 0), (chirp(3200, 4300, 0.065), 0.1), (chirp(3400, 4700, 0.09), 0.19)]), 0.42, (0.15, 0.08))


def s_cluck():
    # a hen: "buk-buk-bukaaak"
    def buk(f, d):
        x = formant_voice(sweep(f, f * 0.75, d), d, [(700, 1.0), (1400, 0.5), (2800, 0.15)], vib=0, vib_depth=0, q=6)
        return x * shape(len(x), 0.008, 0, d, 2.5)
    return finish(seq([(buk(380, 0.09), 0), (buk(400, 0.09), 0.12), (buk(440, 0.28), 0.26)]), 0.5, (0.15, 0.08))


def s_moo():
    f = np.concatenate([sweep(110, 135, 0.25), sweep(135, 100, 0.7)])
    x = formant_voice(f, 0.95, [(330, 1.0), (750, 0.6), (2200, 0.1)], vib=4, vib_depth=0.012, q=7)
    return finish(x * shape(len(x), 0.1, 0.45, 0.4, 1.3), 0.55, (0.35, 0.15))


def s_squeak():
    # a little bat: two high squeaks
    return finish(seq([(chirp(2800, 4200, 0.06, level=0.9), 0), (chirp(3000, 4500, 0.06, level=0.9), 0.09)]), 0.38, (0.2, 0.1))


def s_squish():
    # a slime: a wobbly "bwoing"
    t = t_of(0.4)
    f = 200 * (1 + 0.55 * np.exp(-t / 0.12) * np.sin(2 * np.pi * 13 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.exp(-t / 0.15)
    return finish(resonator(x, 420, 4, 1.0) + x * 0.5, 0.5, (0.15, 0.08))


def s_ghost():
    # a friendly "ooOOoo"
    dur = 1.1
    t = t_of(dur)
    f = 330 + 90 * np.sin(np.pi * t / dur) + 8 * np.sin(2 * np.pi * 5.5 * t)
    x = formant_voice(f, dur, [(330, 1.0), (760, 0.35), (2400, 0.06)], vib=0, vib_depth=0, q=7) * np.sin(np.pi * t / dur) ** 1.6
    return finish(x, 0.42, (0.9, 0.4))


def s_caw():
    def caw(d, f):
        x = formant_voice(sweep(f, f * 0.85, d), d, [(900, 1.0), (1600, 0.6), (2600, 0.25)], vib=0, vib_depth=0, breath=0.5, q=5)
        return x * shape(len(x), 0.012, d * 0.3, d * 0.6, 1.4)
    return finish(seq([(caw(0.2, 560), 0), (caw(0.24, 520), 0.28)]), 0.45, (0.3, 0.14))


def s_meow():
    dur = 0.55
    f = np.concatenate([sweep(520, 780, 0.18), sweep(780, 560, 0.37)])
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    # the mouth opens (ee -> ah) and closes again (-> oo)
    a = formant_voice(f, dur, [(700, 1.0), (1800, 0.35), (3000, 0.1)], vib=6, vib_depth=0.01, q=8)
    e = formant_voice(f, dur, [(400, 1.0), (2300, 0.5), (3200, 0.1)], vib=6, vib_depth=0.01, q=8)
    w = np.sin(np.pi * t) ** 0.8
    return finish((a * w + e * (1 - w)) * shape(n, 0.04, 0.2, 0.25, 1.4), 0.45, (0.2, 0.1))


def s_ribbit():
    dur = 0.3
    t = t_of(dur)
    am = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 32 * t))) * 0.6 + 0.4
    x = formant_voice(sweep(260, 220, dur), dur, [(500, 1.0), (1200, 0.4)], vib=0, vib_depth=0, q=6) * am
    x = x * shape(len(t), 0.02, dur * 0.3, dur * 0.6, 1.3)
    return finish(seq([(x, 0), (x * 0.8, 0.36)]), 0.45, (0.2, 0.1))


# ---------------------------------------------------------------- quests, prizes, the kitchen

def s_quest_new():
    p = ['G5', 'C6', 'E6']
    return finish(seq([(bell(note(n), 1.0, 0.8), i * 0.1) for i, n in enumerate(p)]), 0.6, (0.6, 0.25))


def s_tune():
    # a quest step done: a short happy phrase
    p = ['C6', 'D6', 'E6', 'G6', 'E6', 'G6']
    v = [0.8, 0.7, 0.8, 0.9, 0.6, 1.0]
    return finish(seq([(mix(marimba(note(n), 0.5, vv), 0.3 * harp(note(n), 0.6)), i * 0.11) for i, (n, vv) in enumerate(zip(p, v))]), 0.6, (0.5, 0.2))


def fanfare_chord(notes, dur):
    parts = [ocarina(note(n), dur, 0.9) * 0.5 + bell(note(n), dur, 0.6) * 0.5 + S.pad(note(n), dur, 0.8) * 1.2 for n in notes]
    return mix(*parts)


def s_fanfare():
    run = ['C5', 'E5', 'G5', 'C6']
    lead = seq([(mix(marimba(note(n), 0.5, 1.0), harp(note(n), 0.7, 0.8) * 0.6), i * 0.11) for i, n in enumerate(run)])
    chord = fanfare_chord(['C5', 'E5', 'G5', 'C6'], 1.1)
    return finish(seq([(lead, 0), (chord, 0.48)]), 0.6, (0.8, 0.28))


def s_ending():
    mel = ['C5', 'E5', 'G5', 'C6', 'B5', 'G5', 'A5', 'B5', 'C6']
    lead = seq([(mix(marimba(note(n), 0.6, 0.9), 0.5 * glock(note(n), 0.8, 0.6)), i * 0.15) for i, n in enumerate(mel)])
    chord = fanfare_chord(['C5', 'E5', 'G5', 'C6', 'E6'], 1.6)
    return finish(seq([(lead, 0), (chord, len(mel) * 0.15)]), 0.6, (1.0, 0.3))


def s_cook():
    # bubbling pot, sizzle, then the oven "ding!"
    n = int(0.9 * SR)
    bub = np.zeros(n)
    r = np.random.default_rng(31)
    for i in range(16):
        f = r.uniform(250, 650)
        d = int(0.06 * SR)
        s0 = int(r.uniform(0, 0.8) * SR)
        bub[s0:s0 + d] += sine_sweep(f, f * 1.9, 0.06) * np.exp(-np.arange(d) / SR / 0.02) * r.uniform(0.3, 0.7)
    sizzle = band(noise(0.9), 3500, 10000) * shape(n, 0.1, 0.4, 0.4, 1.2) * 0.12
    ding = mix(bell(note('A6'), 1.4, 0.8), 0.5 * bell(note('E7'), 1.2, 0.5))
    return finish(seq([(mix(bub * 0.6, sizzle), 0), (ding, 0.85)]), 0.6, (0.4, 0.18))


def s_cash():
    # buy or sell: "ka-ching!"
    ka = band(noise(0.05), 1500, 6000) * np.exp(-t_of(0.05) / 0.012)
    ching = bell(note('E7'), 0.9, 1.2) + 0.6 * bell(note('B6'), 0.9, 1.0)
    return finish(seq([(ka, 0), (ching, 0.05)]), 0.5, (0.3, 0.14))


def s_munch():
    # a friend eats your treat: crunch crunch crunch, yum
    parts = [(mix(band(noise(0.08), 700, 5500) * np.exp(-t_of(0.08) / 0.02) * (1 - i * 0.2), 0.3 * thud(120, 0.06)), i * 0.13) for i in range(3)]
    yum = formant_voice(sweep(400, 600, 0.22), 0.22, [(450, 1.0), (1000, 0.3), (2300, 0.06)], vib=6, vib_depth=0.01) * 0.6
    yum = yum * shape(len(yum), 0.02, 0.05, 0.15, 1.3)
    return finish(seq([(seq(parts), 0), (yum, 0.42)]), 0.55, (0.15, 0.08))


# ---------------------------------------------------------------- nature (the Nature slider)

def s_bird(kind):
    if kind == 1:  # "tweet tweet"
        return finish(seq([(chirp(3000, 4600, 0.1), 0), (chirp(3100, 4800, 0.1), 0.15)]), 0.4, (0.8, 0.3))
    if kind == 2:  # a falling warble
        return finish(seq([(chirp(4300 - i * 260, 3700 - i * 260, 0.05, vib=2), i * 0.06) for i in range(7)]), 0.4, (0.8, 0.3))
    return finish(seq([(chirp(2400, 3300, 0.2, vib=5), 0), (chirp(3300, 2600, 0.16), 0.24), (chirp(2700, 3500, 0.12), 0.45)]), 0.4, (0.8, 0.3))


def s_owl():
    def hoo(d, f):
        x = formant_voice(sweep(f, f * 0.93, d), d, [(380, 1.0), (760, 0.3)], vib=0, vib_depth=0, breath=0.12, q=8)
        return x * np.sin(np.pi * np.linspace(0, 1, len(x))) ** 1.3
    return finish(seq([(hoo(0.32, 380), 0), (hoo(0.55, 350), 0.46)]), 0.4, (1.0, 0.4))


def s_drip():
    t = t_of(0.2)
    x = sine_sweep(2000, 900, 0.2) * np.exp(-t / 0.05)
    return finish(x + 0.4 * resonator(x, 1500, 10), 0.4, (1.1, 0.5))


def loopable(x, cross=0.6):
    c = int(cross * SR)
    head, body, tail = x[:c], x[c:-c], x[-c:]
    f = np.linspace(0, 1, c)
    return np.concatenate([tail * (1 - f) + head * f, body])


def s_breeze():
    dur = 10.0
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * (2.2 * t + 0.15 * np.sin(2 * np.pi * 3 * t)) + 0.6)
    x = low(pink(dur), 900, 2) * (0.35 + 0.65 * swell) + 0.25 * band(pink(dur), 1500, 3500) * swell ** 2
    return loopable(finish(x, 0.5, None, 0.001, 0.001))


def s_crickets():
    dur = 8.0
    t = t_of(dur)
    def cric(f, rate, phase, gate):
        ch = ((np.sin(2 * np.pi * rate * t + phase) > gate) & (np.sin(2 * np.pi * 31 * t) > 0)).astype(float)
        return np.sin(2 * np.pi * f * t) * low(ch, 120)
    x = 0.6 * cric(4300, 2.3, 0, 0.3) + 0.35 * cric(3850, 1.7, 1, 0.5) + 0.25 * cric(4650, 1.3, 2, 0.6)
    wind = low(pink(dur), 350) * 0.6
    return loopable(finish(x + wind, 0.45, None, 0.001, 0.001))


def s_cave_hum():
    dur = 8.0
    t = t_of(dur)
    x = low(pink(dur), 220, 2) * 1.6 + 0.25 * np.sin(2 * np.pi * 55 * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.25 * t)) + 0.1 * np.sin(2 * np.pi * 82.5 * t)
    return loopable(finish(x, 0.4, None, 0.001, 0.001))


SOUNDS = {
    # menus and talking
    'tap': s_tap, 'open': s_open, 'close': s_close, 'page': s_page, 'select': s_select, 'toggle': s_toggle,
    'whoosh': s_whoosh, 'talk': s_talk, 'locked': s_locked,
    # walking
    'step-grass': s_step_grass, 'step-dirt': s_step_dirt, 'step-wood': s_step_wood, 'step-stone': s_step_stone,
    # gardening
    'water': s_water, 'grow': s_grow, 'ripe': s_ripe, 'pick': s_pick, 'plant': s_plant,
    # things in the world
    'rustle': s_rustle, 'drop': s_drop, 'found': s_found, 'coin': s_coin, 'heart': s_heart, 'star': s_star,
    'sparkle': s_sparkle, 'honey': s_honey, 'gate-open': s_gate_open, 'gate-close': s_gate_close,
    'door-open': s_door_open, 'door-close': s_door_close, 'room-in': s_room_in, 'room-out': s_room_out,
    'mail': s_mail, 'splash': s_splash, 'cast': s_cast, 'bite': s_bite, 'chest': s_chest,
    # friends and animals
    'pet': s_pet, 'peep': s_peep, 'cluck': s_cluck, 'moo': s_moo, 'squeak': s_squeak, 'squish': s_squish,
    'ghost': s_ghost, 'caw': s_caw, 'meow': s_meow, 'ribbit': s_ribbit,
    # quests, prizes, kitchen
    'quest-new': s_quest_new, 'tune': s_tune, 'fanfare': s_fanfare, 'ending': s_ending,
    'cook': s_cook, 'cash': s_cash, 'munch': s_munch,
    # nature (the Nature slider)
    'bird-1': lambda: s_bird(1), 'bird-2': lambda: s_bird(2), 'bird-3': lambda: s_bird(3),
    'owl': s_owl, 'drip': s_drip, 'breeze': s_breeze, 'crickets': s_crickets, 'cave-hum': s_cave_hum,
}


def write(name, x):
    data = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    total = 0
    for name, make in SOUNDS.items():
        if only and name not in only:
            continue
        x = make()
        assert np.all(np.isfinite(x)), name
        write(name, x)
        total += len(x) * 2
        print(f'{name:12s} {len(x) / SR:5.2f} s  peak {np.max(np.abs(x)):.2f}')
    if not only:
        for f in os.listdir(OUT):  # keep only files this script makes
            if f.endswith('.wav') and f[:-4] not in SOUNDS:
                os.remove(os.path.join(OUT, f))
    print(f'{len(SOUNDS)} sounds, {total / 1e6:.1f} MB in "Made Sounds/"')
    with open(os.path.join(OUT, 'sounds.json'), 'w') as f:
        json.dump(sorted(SOUNDS), f)


if __name__ == '__main__':
    main()
