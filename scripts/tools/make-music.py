"""Composes the game's music from scratch and encodes it to public/assets/music/*.ogg.

    py scripts/tools/make-music.py            make every track
    py scripts/tools/make-music.py farm-day   make one track
    node scripts/sync-art.mjs                 (art.json "music" lists the tracks; see ART below)

There are no recordings and no borrowed tunes. Each track is written as chords (which bar plays
which chord), then a tune is made up over those chords by a small set of music rules:
  - on strong beats the tune lands on a note of the chord, in between it walks by steps;
  - a tune has a shape (A, B, A, C ...): the same letter repeats the same rhythm and contour;
  - every 4 bars the tune comes to rest on a chord note;
and played by instruments from synth.py (plucked guitar, marimba, flute, bells, pads, a soft bass).
Every note gets a tiny random timing and loudness wobble, like a person playing.
Each track ends in a way that leads back to its beginning, so it can loop without a click.
"""
import os
import subprocess
import sys
import wave

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import synth as S  # noqa: E402
from synth import SR, note, midi  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
import json  # noqa: E402
import tempfile  # noqa: E402

WAV_DIR = os.path.join(tempfile.gettempdir(), 'sprout-music-wav')
OUT_DIR = os.path.join(ROOT, 'Made Sounds', 'music')  # node scripts/sync-art.mjs copies these to public/assets/music
CATALOG = os.path.join(ROOT, 'src', 'content', 'starter-adventure', 'assets.catalog.json')
LABELS = {'farm-day': 'Sunny Farm', 'meadow': 'North Meadows', 'woods': 'West Woods', 'village': 'Cobble Village and Pine Hills',
          'hollow': 'Pumpkin Hollow', 'house': 'inside a house', 'mine': 'the old mine', 'title': 'the start screen'}

MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]
DORIAN = [0, 2, 3, 5, 7, 9, 10]
LYDIAN = [0, 2, 4, 6, 7, 9, 11]
HARMONIC = [0, 2, 3, 5, 7, 8, 11]


def sc(root, scale, d):
    """Midi note of scale degree d (1 = the root; 8 = the root an octave up; 0 = the note below)."""
    octave, k = divmod(d - 1, len(scale))
    return root + scale[k] + 12 * octave


def triad(root, scale, d, seventh=False):
    return [sc(root, scale, d + k) for k in ((0, 2, 4, 6) if seventh else (0, 2, 4))]


# how loud each instrument is at its reference note, so they balance without fiddling
_GAIN = {}
INSTRUMENTS = {
    'pluck': lambda f, d, v: S.pluck(f, min(d + 0.5, 2.2), 0.55, v),
    'harp': lambda f, d, v: S.harp(f, min(d + 0.8, 2.6), v),
    'marimba': lambda f, d, v: S.marimba(f, min(d + 0.3, 1.2), v),
    'glock': lambda f, d, v: S.glock(f, min(d + 0.6, 1.8), v),
    'musicbox': lambda f, d, v: S.musicbox(f, min(d + 0.6, 1.8), v),
    'kalimba': lambda f, d, v: S.kalimba(f, min(d + 0.4, 1.4), v),
    'bell': lambda f, d, v: S.bell(f, min(d + 0.8, 2.2), 1.0, v),
    'flute': lambda f, d, v: S.flute(f, max(d, 0.25), v),
    'ocarina': lambda f, d, v: S.ocarina(f, max(d, 0.25), v),
    'pad': lambda f, d, v: S.pad(f, d + 0.6, v),
    'bass': lambda f, d, v: S.bass(f, min(d + 0.2, 1.2), v),
    'voice': lambda f, d, v: S.voice_ah(f, d + 0.3, v, 'o'),
    'pizz': lambda f, d, v: S.pluck(f, 0.5, 0.35, v, body=True),
}
TARGET = {'pluck': 0.085, 'harp': 0.07, 'marimba': 0.11, 'glock': 0.075, 'musicbox': 0.07, 'kalimba': 0.09,
          'bell': 0.06, 'flute': 0.085, 'ocarina': 0.08, 'pad': 0.05, 'bass': 0.11, 'voice': 0.04, 'pizz': 0.1}


def gain_of(name):
    if name not in _GAIN:
        ref = INSTRUMENTS[name](note('C4') if name not in ('bass',) else note('C3'), 0.5, 1.0)
        _GAIN[name] = TARGET[name] / (S.loudness(ref[:int(0.6 * SR)]) + 1e-9)
    return _GAIN[name]


class Song:
    def __init__(self, bpm, bars, beats=4, tail=3.0, swing=0.0, seed=1):
        self.spb = 60.0 / bpm
        self.beats, self.bars, self.swing = beats, bars, swing
        self.length = bars * beats * self.spb
        self.n = int((self.length + tail) * SR)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)
        self.rng = np.random.default_rng(seed)

    def put(self, sig, beat, pan=0.0, gain=1.0, jitter=0.006):
        if self.swing and abs((beat % 1) - 0.5) < 1e-6:
            beat += self.swing / 6.0
        t = beat * self.spb + (self.rng.normal(0, jitter) if jitter else 0.0)
        i = max(0, int(t * SR))
        if i >= self.n:
            return
        sig = sig[:self.n - i]
        a = (pan + 1) * np.pi / 4
        self.L[i:i + len(sig)] += sig * gain * np.cos(a)
        self.R[i:i + len(sig)] += sig * gain * np.sin(a)

    def play(self, inst, m, beat, dur_beats, vel=0.8, pan=0.0, vol=1.0):
        """One note: inst name, midi note, start (in beats), length (in beats)."""
        v = float(np.clip(vel * (1 + self.rng.normal(0, 0.07)), 0.2, 1.2))
        sig = INSTRUMENTS[inst](midi(m), dur_beats * self.spb, v) * gain_of(inst)
        self.put(sig, beat, pan, vol)

    def hit(self, fn, beat, vel=1.0, pan=0.0, vol=1.0):
        self.put(fn(vel), beat, pan, vol, jitter=0.004)

    def render(self, wet=0.22, rt60=1.6, target_rms=0.085):
        """Room around it, then fold the room's tail back onto the start so it loops cleanly."""
        L, R = S.stereo_reverb(self.L, self.R, rt60, wet, 0.55)
        loop_n = int(self.length * SR)
        tail_L, tail_R = L[loop_n:], R[loop_n:]
        L, R = L[:loop_n].copy(), R[:loop_n].copy()
        k = min(len(tail_L), loop_n)
        L[:k] += tail_L[:k]
        R[:k] += tail_R[:k]
        out = np.stack([S.high(L, 35), S.high(R, 35)])
        rms = np.sqrt(np.mean(out ** 2))
        out *= target_rms / (rms + 1e-9)
        out = np.tanh(out * 1.6) / 1.6 * 1.25  # gentle limiter: peaks round off instead of clipping
        peak = np.max(np.abs(out))
        if peak > 0.95:
            out *= 0.95 / peak
        return out


# ---------------------------------------------------------------- tune writing

RHYTHMS = {  # one 4/4 bar, in beats; negative = rest
    'a': [1, 1, 1, 1], 'b': [1.5, 0.5, 1, 1], 'c': [1, 0.5, 0.5, 1, 1], 'd': [2, 1, 1], 'e': [0.5, 0.5, 1, 0.5, 0.5, 1],
    'f': [1, 1, 2], 'g': [0.5, 0.5, 0.5, 0.5, 1, 1], 'h': [1.5, 0.5, 2], 'i': [1, 0.5, 0.5, 0.5, 0.5, 1], 'j': [-0.5, 0.5, 1, 1, 1],
    'k': [2, 2], 'l': [1, 0.5, 0.5, 2],
}
RHYTHMS_3 = {  # 3/4 bars
    'a': [1, 1, 1], 'b': [2, 1], 'c': [1, 0.5, 0.5, 1], 'd': [1.5, 0.5, 1], 'e': [0.5, 0.5, 1, 1], 'f': [3],
}


def nearest_chord_tone(m, chord_d, n):
    """The scale step nearest to m that belongs to the chord rooted on degree chord_d."""
    best = None
    for cand in range(m - 3, m + 4):
        if (cand - chord_d) % n in (0, 2, 4):
            if best is None or abs(cand - m) < abs(best - m):
                best = cand
    return best if best is not None else m


def write_tune(prog, scale, form, seed, beats=4, lo=8, hi=14, start=None, rests=0.0, rhythms=None, busy=0.5):
    """A tune over the chords in prog (one degree per bar). Returns [(beat, scale_step, dur_beats)].

    Scale steps count from the scale's root: 1 is the root, 8 an octave above. `form` is a letter per
    4 bars ('ABAC'); the same letter gives the same rhythm and the same up-and-down shape."""
    n = len(scale)
    rhythms = rhythms or (RHYTHMS if beats == 4 else RHYTHMS_3)
    keys = sorted(rhythms)
    out = []
    plans = {}
    for letter in sorted(set(form)):
        r = np.random.default_rng(seed * 100 + ord(letter))
        first = keys[int(r.integers(0, len(keys)))]
        shape_bars = [first, keys[int(r.integers(0, len(keys)))], first, 'k' if beats == 4 else 'f']
        steps = [int(r.choice([-2, -1, -1, 0, 1, 1, 2, 3, -3], p=[.08, .2, .14, .05, .2, .14, .1, .05, .04])) for _ in range(40)]
        plans[letter] = (shape_bars, steps)
    m = start if start is not None else lo + 2
    bar = 0
    direction = 1
    for g, letter in enumerate(form):
        shape_bars, steps = plans[letter]
        si = 0
        for b in range(4):
            if bar >= len(prog):
                break
            chord = prog[bar]
            pos = 0.0
            last_note = None
            for dur in rhythms[shape_bars[b]]:
                if dur < 0:
                    pos += -dur
                    continue
                strong = (pos % 2 == 0) if beats == 4 else (pos == 0)
                step = steps[si % len(steps)]
                si += 1
                m2 = m + step * direction
                if m2 > hi:
                    m2, direction = hi - abs(step), -1
                elif m2 < lo:
                    m2, direction = lo + abs(step), 1
                if strong:
                    m2 = nearest_chord_tone(m2, chord, n)
                if rests and r_random(seed, bar, pos) < rests and not strong:
                    pos += dur
                    continue
                m = m2
                last_note = [bar * beats + pos, m, dur]
                out.append(last_note)
                pos += dur
            if b == 3 and last_note is not None:  # the phrase comes to rest on the chord
                last_note[1] = nearest_chord_tone(last_note[1], chord, n)
                last_note[2] = max(last_note[2], 1.5)
            bar += 1
    return [tuple(x) for x in out]


def r_random(seed, bar, pos):
    return np.random.default_rng(seed * 1000 + bar * 17 + int(pos * 4)).random()


def play_tune(song, tune, inst, root, scale, octave=0, vel=0.8, pan=0.0, vol=1.0, shift=0):
    for beat, m, dur in tune:
        song.play(inst, sc(root, scale, m + shift) + 12 * octave, beat + 0, dur * 0.95, vel, pan, vol)


def arpeggio(song, prog, root, scale, start_bar, pattern, inst='pluck', octave=0, vel=0.65, pan=0.0, seventh=False, step=0.5, vol=1.0, hold=1.2):
    """Play the chord's notes one after another: pattern picks chord tones (0 = lowest) for every step."""
    for i, d in enumerate(prog):
        ch = triad(root, scale, d, seventh)
        ch = ch + [ch[0] + 12, ch[1] + 12, ch[2] + 12]
        for k, p in enumerate(pattern):
            if p is None:
                continue
            beat = (start_bar + i) * song.beats + k * step
            accent = 1.0 if k % 4 == 0 else (0.85 if k % 2 == 0 else 0.7)
            song.play(inst, ch[p] + 12 * octave, beat, step * hold * 2, vel * accent, pan, vol)


def basslines(song, prog, root, scale, start_bar, kind='walk', octave=-2, vel=0.8, vol=1.0, inst='bass'):
    for i, d in enumerate(prog):
        ch = triad(root, scale, d)
        r, th, fi = ch[0] + 12 * octave, ch[1] + 12 * octave, ch[2] + 12 * octave
        b0 = (start_bar + i) * song.beats
        if kind == 'root-fifth':
            song.play(inst, r, b0, 1.6, vel, -0.1, vol)
            song.play(inst, fi, b0 + 2, 1.6, vel * 0.8, -0.1, vol)
        elif kind == 'walk':
            nxt = prog[(i + 1) % len(prog)]
            approach = sc(root, scale, nxt - 1) + 12 * octave  # a step below the next chord's root
            song.play(inst, r, b0, 0.9, vel, -0.1, vol)
            song.play(inst, fi, b0 + 1, 0.9, vel * 0.7, -0.1, vol)
            song.play(inst, th, b0 + 2, 0.9, vel * 0.8, -0.1, vol)
            song.play(inst, approach, b0 + 3, 0.9, vel * 0.7, -0.1, vol)
        elif kind == 'whole':
            song.play(inst, r, b0, song.beats * 0.95, vel, -0.1, vol)
        elif kind == 'waltz':
            song.play(inst, r, b0, 1.4, vel, -0.1, vol)
        elif kind == 'pulse':
            song.play(inst, r, b0, 1.4, vel, -0.1, vol)
            song.play(inst, r, b0 + 2.5, 1.0, vel * 0.7, -0.1, vol)


def pads(song, prog, root, scale, start_bar, octave=0, vel=0.6, per_chord_bars=1, vol=1.0, inst='pad', pan=0.0):
    for i in range(0, len(prog), per_chord_bars):
        d = prog[i]
        for j, m in enumerate(triad(root, scale, d)):
            song.play(inst, m + 12 * octave, (start_bar + i) * song.beats, per_chord_bars * song.beats, vel, pan + (j - 1) * 0.25, vol)


def rhythm_section(song, start_bar, bars, kind, vol=1.0):
    for bar in range(start_bar, start_bar + bars):
        b0 = bar * song.beats
        if kind == 'shaker8':
            for k in range(8):
                song.hit(S.shaker, b0 + k * 0.5, 1.0 if k % 2 == 0 else 0.6, 0.35, vol)
        elif kind == 'shaker-off':
            for k in range(4):
                song.hit(S.shaker, b0 + k + 0.5, 0.8, 0.3, vol)
        elif kind == 'tick24':
            song.hit(S.tick, b0 + 1, 0.7, -0.3, vol)
            song.hit(S.tick, b0 + 3, 0.8, -0.3, vol)
        elif kind == 'tamb24':
            song.hit(S.tambourine, b0 + 1, 0.6, 0.4, vol)
            song.hit(S.tambourine, b0 + 3, 0.7, 0.4, vol)
        elif kind == 'kick-soft':
            song.hit(S.kick, b0, 0.5, 0, vol)
            song.hit(S.kick, b0 + 2.5, 0.35, 0, vol)
        elif kind == 'brush':
            for k in range(4):
                song.hit(S.brush, b0 + k + (0.5 if k % 2 else 0), 0.7, 0.3, vol)
        elif kind == 'waltz':
            for k in (1, 2):
                song.hit(S.tick, b0 + k, 0.6, 0.3, vol)


# ---------------------------------------------------------------- the tracks

def T_farm_day():
    """Sunny Farm: bright, bouncy, plucked guitar and marimba. G major."""
    root, scale = 55, MAJOR
    A = [1, 5, 6, 4, 1, 5, 4, 5]
    B = [1, 3, 4, 5, 6, 4, 1, 5]
    intro = [1, 5, 6, 4]
    s = Song(104, 28, seed=4)
    arp = [0, 2, 1, 2, 0, 2, 1, 2]
    arp_b = [0, 1, 2, 4, 2, 1, 2, 1]
    # intro: guitar + shaker
    arpeggio(s, intro, root, scale, 0, arp, 'pluck', 0, 0.7, -0.25)
    pads(s, intro, root, scale, 0, 0, 0.5, 1)
    rhythm_section(s, 0, 4, 'shaker8', 0.6)
    # A: marimba tune
    tuneA = write_tune(A, scale, 'AB', seed=11, lo=9, hi=16)
    for start, tune, inst, octv in ((4, tuneA, 'marimba', 0), (20, tuneA, 'ocarina', 0)):
        arpeggio(s, A, root, scale, start, arp, 'pluck', 0, 0.68, -0.25)
        basslines(s, A, root, scale, start, 'walk', -2, 0.8)
        rhythm_section(s, start, 8, 'shaker8', 0.7)
        rhythm_section(s, start, 8, 'tick24', 0.6)
        pads(s, A, root, scale, start, 0, 0.45, 2)
        play_tune(s, [(b + start * 4, m, d) for b, m, d in tune], inst, root, scale, octv, 0.85, 0.2)
    # B: flute tune over a different harp arpeggio
    tuneB = write_tune(B, scale, 'CD', seed=12, lo=9, hi=17)
    arpeggio(s, B, root, scale, 12, arp_b, 'harp', 0, 0.6, -0.3)
    basslines(s, B, root, scale, 12, 'root-fifth', -2, 0.75)
    rhythm_section(s, 12, 8, 'tamb24', 0.5)
    rhythm_section(s, 12, 8, 'shaker-off', 0.6)
    pads(s, B, root, scale, 12, 0, 0.5, 2)
    play_tune(s, [(b + 12 * 4, m, d) for b, m, d in tuneB], 'flute', root, scale, 0, 0.8, 0.15)
    return s.render(0.2, 1.3)


def T_meadow():
    """North Meadows: open and airy, a flute over a harp. D major (lydian colour)."""
    root, scale = 50, MAJOR
    prog = [1, 5, 6, 3, 4, 1, 4, 5]
    s = Song(84, 24, seed=5)
    arp = [0, 1, 2, 1, 3, 2, 1, 2]
    pads(s, prog * 3, root, scale, 0, 0, 0.6, 2)
    # harp the whole way through
    for start in (0, 8, 16):
        arpeggio(s, prog, root, scale, start, arp, 'harp', 0, 0.55, -0.35, step=0.5)
        basslines(s, prog, root, scale, start, 'whole', -2, 0.6)
    tune1 = write_tune(prog, scale, 'AB', seed=21, lo=9, hi=16, rests=0.15)
    tune2 = write_tune(prog, scale, 'CB', seed=22, lo=10, hi=17, rests=0.15)
    play_tune(s, [(b + 8 * 4, m, d) for b, m, d in tune1], 'flute', root, scale, 0, 0.8, 0.15)
    play_tune(s, [(b + 16 * 4, m, d) for b, m, d in tune2], 'flute', root, scale, 0, 0.85, 0.1)
    play_tune(s, [(b + 16 * 4, m, d) for b, m, d in tune1], 'glock', root, scale, 1, 0.5, -0.3, 0.6)
    rhythm_section(s, 8, 16, 'brush', 0.6)
    return s.render(0.26, 1.8)


def T_woods():
    """West Woods: mysterious but friendly. Kalimba, low flute, slow pads. A dorian."""
    root, scale = 45, DORIAN
    prog = [1, 4, 1, 4, 7, 6, 7, 1]
    s = Song(72, 24, seed=6)
    arp = [0, 2, 1, 2, 3, 2, 1, 2]
    pads(s, prog * 3, root, scale, 0, 0, 0.65, 2)
    for start in (0, 8, 16):
        arpeggio(s, prog, root, scale, start, arp, 'kalimba', 1, 0.6, -0.3, step=0.5, hold=1.6)
        basslines(s, prog, root, scale, start, 'whole', -2, 0.55)
    tune = write_tune(prog, scale, 'AB', seed=31, lo=6, hi=12, rests=0.2)
    play_tune(s, [(b + 8 * 4, m, d) for b, m, d in tune], 'flute', root, scale, 0, 0.75, 0.2)
    play_tune(s, [(b + 16 * 4, m, d) for b, m, d in tune], 'musicbox', root, scale, 1, 0.6, -0.15)
    rhythm_section(s, 16, 8, 'brush', 0.4)
    # a few soft bells, like dew falling
    for i in range(10):
        s.play('bell', sc(root, scale, int(s.rng.choice([5, 8, 9, 10, 12])) + 7), 2 + i * 9.3 + s.rng.uniform(0, 3), 2, 0.4, float(s.rng.uniform(-0.7, 0.7)))
    return s.render(0.3, 2.2)


def T_village():
    """Cobble Village and Pine Hills: a friendly folk waltz. F major, 3/4."""
    root, scale = 53, MAJOR
    A = [1, 1, 4, 5, 1, 6, 4, 5]
    B = [6, 4, 1, 5, 6, 4, 5, 1]
    s = Song(132, 32, beats=3, seed=7)
    tuneA = write_tune(A, scale, 'AB', seed=41, beats=3, lo=9, hi=15, rhythms=RHYTHMS_3)
    tuneB = write_tune(B, scale, 'CA', seed=42, beats=3, lo=9, hi=16, rhythms=RHYTHMS_3)

    def oompah(prog, start, vol=1.0):
        for i, d in enumerate(prog):
            ch = triad(root, scale, d)
            b0 = (start + i) * 3
            s.play('bass', ch[0] - 24, b0, 0.9, 0.8, -0.1, vol)
            for k in (1, 2):
                for j, m in enumerate(ch):
                    s.play('pluck', m, b0 + k, 0.6, 0.45, -0.3 + j * 0.1, vol)
    for start, tune, inst in ((0, tuneA, 'marimba'), (8, tuneB, 'marimba'), (16, tuneA, 'ocarina'), (24, tuneB, 'flute')):
        oompah(A if tune is tuneA else B, start)
        rhythm_section(s, start, 8, 'waltz', 0.5)
        pads(s, A if tune is tuneA else B, root, scale, start, 0, 0.35, 2)
        play_tune(s, [(b + start * 3, m, d) for b, m, d in tune], inst, root, scale, 0, 0.85, 0.2)
    return s.render(0.2, 1.3)


def T_hollow():
    """Pumpkin Hollow: spooky-cute. Music box and celesta over a pizzicato bass with a little swing. A harmonic minor."""
    root, scale = 57, HARMONIC
    A = [1, 4, 5, 1, 6, 4, 5, 1]
    B = [1, 6, 4, 5, 1, 4, 5, 1]
    s = Song(96, 24, swing=0.6, seed=8)
    arp = [0, 2, 1, 2, 0, 2, 1, 2]
    tuneA = write_tune(A, scale, 'AB', seed=51, lo=8, hi=15, rests=0.1)
    tuneB = write_tune(B, scale, 'CB', seed=52, lo=9, hi=16, rests=0.1)
    pads(s, A * 3, root, scale, 0, 0, 0.55, 2, inst='voice', pan=0.0)
    for start, prog, tune, inst in ((0, A, tuneA, 'musicbox'), (8, B, tuneB, 'glock'), (16, A, tuneA, 'musicbox')):
        arpeggio(s, prog, root, scale, start, arp, 'pizz', 0, 0.6, 0.3, step=0.5, hold=0.5)
        basslines(s, prog, root, scale, start, 'root-fifth', -2, 0.8, inst='pizz')
        rhythm_section(s, start, 8, 'tick24', 0.6)
        if start:
            play_tune(s, [(b + start * 4, m, d) for b, m, d in tune], inst, root, scale, 0, 0.85, -0.1)
    play_tune(s, [(b, m, d) for b, m, d in tuneA], 'glock', root, scale, 0, 0.55, -0.1)
    # chromatic tinkle at the end of each eight bars
    for start in (7, 15, 23):
        for k, m in enumerate([81, 80, 79, 78, 77, 76]):
            s.play('glock', m, start * 4 + 2.5 + k * 0.25, 0.3, 0.4, 0.3)
    return s.render(0.28, 1.6)


def T_house():
    """Inside a house: a cosy, slow music box and kalimba. C major."""
    root, scale = 48, MAJOR
    prog = [1, 6, 4, 5, 1, 3, 4, 5]
    s = Song(76, 16, seed=9)
    arp = [0, 2, 1, 2, 0, 2, 1, 2]
    tune = write_tune(prog, scale, 'AB', seed=61, lo=9, hi=15, rests=0.1)
    pads(s, prog * 2, root, scale, 0, 0, 0.5, 2)
    for start in (0, 8):
        arpeggio(s, prog, root, scale, start, arp, 'kalimba', 1, 0.55, -0.25, step=0.5, hold=1.4)
        basslines(s, prog, root, scale, start, 'whole', -2, 0.55)
    play_tune(s, [(b, m, d) for b, m, d in tune], 'musicbox', root, scale, 0, 0.7, 0.2)
    play_tune(s, [(b + 8 * 4, m, d) for b, m, d in tune], 'marimba', root, scale, 0, 0.6, 0.2)
    return s.render(0.25, 1.4)


def T_mine():
    """The old mine: a deep, slow hum with drips of bell notes. D minor."""
    root, scale = 38, MINOR
    prog = [1, 6, 3, 7, 1, 4, 6, 5]
    s = Song(60, 16, seed=10)
    pads(s, prog * 2, root, scale, 0, 0, 0.7, 2, inst='pad')
    pads(s, prog * 2, root, scale, 0, 1, 0.4, 2, inst='voice')
    for start in (0, 8):
        basslines(s, prog, root, scale, start, 'whole', -1, 0.6)
    rng = np.random.default_rng(99)
    for i in range(22):
        m = sc(root + 12, scale, int(rng.choice([1, 3, 5, 6, 8, 10])) + int(rng.choice([0, 7])))
        s.play('bell', m, 1 + i * 2.9 + rng.uniform(0, 1.2), 2, float(rng.uniform(0.35, 0.6)), float(rng.uniform(-0.8, 0.8)))
    for i in range(6):
        s.play('marimba', sc(root, scale, int(rng.choice([1, 3, 5])) + 7), 4 + i * 10.5, 1.5, 0.5, float(rng.uniform(-0.4, 0.4)))
    return s.render(0.35, 2.6)


def T_title():
    """The start screen: warm and welcoming, builds up. G major."""
    root, scale = 55, MAJOR
    prog = [1, 5, 6, 4, 1, 5, 4, 5]
    s = Song(92, 24, seed=12)
    arp = [0, 2, 1, 2, 0, 2, 1, 2]
    tune = write_tune(prog, scale, 'AB', seed=71, lo=9, hi=17)
    tune2 = write_tune(prog, scale, 'AC', seed=72, lo=10, hi=18)
    pads(s, prog * 3, root, scale, 0, 0, 0.6, 2)
    arpeggio(s, prog, root, scale, 0, arp, 'harp', 0, 0.6, -0.3)
    for start in (8, 16):
        arpeggio(s, prog, root, scale, start, arp, 'pluck', 0, 0.68, -0.25)
        basslines(s, prog, root, scale, start, 'walk', -2, 0.8)
        rhythm_section(s, start, 8, 'shaker8', 0.6)
    rhythm_section(s, 16, 8, 'kick-soft', 0.6)
    rhythm_section(s, 16, 8, 'tamb24', 0.5)
    play_tune(s, [(b + 8 * 4, m, d) for b, m, d in tune], 'flute', root, scale, 0, 0.8, 0.15)
    play_tune(s, [(b + 16 * 4, m, d) for b, m, d in tune2], 'marimba', root, scale, 0, 0.85, 0.2)
    play_tune(s, [(b + 16 * 4, m, d) for b, m, d in tune2], 'glock', root, scale, 1, 0.5, -0.25, 0.7)
    return s.render(0.24, 1.5)


TRACKS = {
    'farm-day': T_farm_day, 'meadow': T_meadow, 'woods': T_woods, 'village': T_village,
    'hollow': T_hollow, 'house': T_house, 'mine': T_mine, 'title': T_title,
}


def write_wav(name, stereo):
    os.makedirs(WAV_DIR, exist_ok=True)
    path = os.path.join(WAV_DIR, f'{name}.wav')
    data = (np.clip(stereo.T, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    return path


def encode(name, wav):
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f'{name}.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', '4', out], check=True)
    return out


def update_catalog(names):
    with open(CATALOG, encoding='utf-8') as f:
        text = f.read()
    cat = json.loads(text)
    assert json.dumps(cat, indent=2, ensure_ascii=False) + chr(10) == text, 'assets.catalog.json layout changed; check before rewriting'
    cat['files'] = [f for f in cat['files'] if not f['path'].startswith('assets/music/')]
    for n in names:
        cat['files'].append({'path': f'assets/music/{n}.ogg', 'pack': 'made-sounds', 'source': f'music/{n}.ogg', 'role': 'runtime', 'use': f'music for {LABELS[n]} (made by make-music.py)'})
    with open(CATALOG, 'w', encoding='utf-8') as f:
        f.write(json.dumps(cat, indent=2, ensure_ascii=False) + chr(10))


def main():
    only = set(sys.argv[1:])
    for name, make in TRACKS.items():
        if only and name not in only:
            continue
        x = make()
        assert np.all(np.isfinite(x)), name
        wav = write_wav(name, x)
        out = encode(name, wav)
        print(f'{name:10s} {x.shape[1] / SR:6.1f} s  peak {np.max(np.abs(x)):.2f}  rms {np.sqrt(np.mean(x ** 2)):.3f}  {os.path.getsize(out) / 1e6:.2f} MB')
    update_catalog(sorted(TRACKS))
    print('assets.catalog.json updated. Next: node scripts/sync-art.mjs')


if __name__ == '__main__':
    main()
