"""A small sound-making toolkit, used by make-sounds.py (effects) and make-music.py (music).

Everything is built from maths: no recordings, no packs, so there is nothing to license.
What makes it sound like real instruments instead of beeps:
  - every note has several partials (overtones) that each die away at their own speed,
    so the bright part of a note fades first, like a struck bar or a plucked string;
  - plucked strings are real string models (Karplus-Strong) with a wooden body that rings;
  - a tiny random wobble in pitch, timing and loudness, so repeated notes are never identical;
  - a room (reverb) made of noise that gets darker as it fades, like a real space.

All sounds are arrays of floats between -1 and 1 at 44100 Hz. Mono unless a function says stereo.
"""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(11)


def seed(n):
    global rng
    rng = np.random.default_rng(n)


# ---------------------------------------------------------------- basics

def t_of(dur):
    return np.arange(int(dur * SR)) / SR


def sweep(f0, f1, dur, curve='exp'):
    x = np.linspace(0, 1, int(dur * SR), endpoint=False)
    if curve == 'exp' and f0 > 0 and f1 > 0:
        return f0 * (f1 / f0) ** x
    return f0 + (f1 - f0) * x


def osc(freq, dur=None, wave_='sine', phase=0.0):
    if np.isscalar(freq):
        freq = np.full(int(dur * SR), float(freq))
    ph = phase + 2 * np.pi * np.cumsum(freq) / SR
    if wave_ == 'sine':
        return np.sin(ph)
    if wave_ == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if wave_ == 'saw':  # band-limited: 12 harmonics are plenty after the filters used here
        return sum(np.sin(k * ph) / k for k in range(1, 13)) * 0.55
    if wave_ == 'square':
        return sum(np.sin(k * ph) / k for k in range(1, 12, 2)) * 0.8
    raise ValueError(wave_)


def noise(dur):
    return rng.uniform(-1, 1, int(dur * SR))


def pink(dur):
    """Noise that is stronger in the lows, like wind and water."""
    n = noise(dur)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    x = signal.lfilter(b, a, n)
    return x / (np.max(np.abs(x)) + 1e-9)


def band(x, lo, hi, order=2):
    hi = min(hi, SR / 2 - 200)
    if lo >= hi:
        return x * 0
    sos = signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def low(x, hz, order=2):
    hz = min(hz, SR / 2 - 200)
    return signal.sosfilt(signal.butter(order, hz, btype='low', fs=SR, output='sos'), x)


def high(x, hz, order=2):
    return signal.sosfilt(signal.butter(order, hz, btype='high', fs=SR, output='sos'), x)


def resonator(x, hz, q=8.0, gain=1.0):
    """Ring at hz: what makes a wooden box, a bottle or a mouth sound like itself."""
    b, a = signal.iirpeak(min(hz, SR / 2 - 200), q, fs=SR)
    return signal.lfilter(b, a, x) * gain


def decay(n, tau):
    """Exponential fall: 1 at the start, dies away with time constant tau seconds."""
    return np.exp(-np.arange(int(n)) / SR / max(tau, 1e-4))


def fade(x, a=0.004, r=0.02):
    x = x.copy()
    na, nr = min(int(a * SR), len(x) // 2), min(int(r * SR), len(x) // 2)
    if na:
        x[:na] *= np.linspace(0, 1, na)
    if nr:
        x[-nr:] *= np.linspace(1, 0, nr)
    return x


def shape(n, attack=0.005, hold=0.0, release=0.1, curve=2.0):
    """Rise, hold, then fall smoothly to silence over the rest (release is the last part)."""
    n = int(n)
    a, h = int(attack * SR), int(hold * SR)
    out = np.ones(n)
    if a:
        out[:min(a, n)] = np.linspace(0, 1, min(a, n)) ** 0.8
    rest = n - a - h
    if rest > 0:
        out[a + h:] = (1 - np.linspace(0, 1, rest)) ** curve
    return out


def soft(x, drive=1.0):
    """Round off peaks the way tape or a tube does, so loud parts are warm instead of harsh."""
    return np.tanh(x * drive) / np.tanh(drive)


def seq(parts, gap=0.0):
    """Lay sounds one after another; an item can be (array, start_seconds) to place it exactly."""
    placed, pos = [], 0.0
    for p in parts:
        arr, start = p if isinstance(p, tuple) else (p, pos)
        placed.append((arr, int(start * SR)))
        pos = start + len(arr) / SR + gap
    n = max(s + len(a) for a, s in placed)
    out = np.zeros(n)
    for a, s in placed:
        out[s:s + len(a)] += a
    return out


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def note(name):
    """'C5' -> Hz, 'F#4', 'Bb3'."""
    names = {'C': -9, 'D': -7, 'E': -5, 'F': -4, 'G': -2, 'A': 0, 'B': 2}
    semis, rest = names[name[0]], name[1:]
    if rest.startswith('#'):
        semis, rest = semis + 1, rest[1:]
    elif rest.startswith('b'):
        semis, rest = semis - 1, rest[1:]
    return 440 * 2 ** ((semis + (int(rest) - 4) * 12) / 12)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------------------------------------------------------------- rooms

_ir_cache = {}


def room_ir(rt60=0.6, bright=0.6, pre=0.012, seed_=3):
    """A room's echo pattern: noise whose high notes die faster than its low notes."""
    key = (rt60, bright, pre, seed_)
    if key in _ir_cache:
        return _ir_cache[key]
    r = np.random.default_rng(seed_)
    n = int((rt60 * 1.2 + pre) * SR)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        raw = r.standard_normal(n)
        bands = [(60, 400, 1.0), (400, 2500, 0.8), (2500, 9000, 0.45 * bright + 0.15)]
        acc = np.zeros(n)
        for lo, hi, life in bands:
            tau = rt60 * life / 6.9  # 60 dB = 6.9 time constants
            acc += band(raw, lo, hi, 2) * np.exp(-t / max(tau, 0.02)) * (1.0 if lo < 2000 else 0.7)
        d = int(pre * SR)
        acc[:d] = 0
        acc[d:] *= np.minimum(1, (np.arange(n - d) / (0.008 * SR)))  # soft start, no click
        out[ch] = acc
    out /= np.sqrt(np.sum(out ** 2, axis=1, keepdims=True)) + 1e-9
    _ir_cache[key] = out
    return out


def reverb(x, rt60=0.6, wet=0.2, bright=0.6):
    """Add a room around a mono sound. Returns stereo if you ask for it (see stereo_reverb)."""
    ir = room_ir(rt60, bright)[0]
    tail = signal.fftconvolve(np.concatenate([x, np.zeros(len(ir))]), ir)[:len(x) + len(ir)]
    return np.concatenate([x, np.zeros(len(ir))]) + wet * tail


def stereo_reverb(left, right, rt60=1.2, wet=0.25, bright=0.6):
    ir = room_ir(rt60, bright)
    n = len(left) + ir.shape[1]
    L = np.concatenate([left, np.zeros(ir.shape[1])])
    R = np.concatenate([right, np.zeros(ir.shape[1])])
    wl = signal.fftconvolve(L, ir[0])[:n] + signal.fftconvolve(R, ir[1])[:n] * 0.4
    wr = signal.fftconvolve(R, ir[1])[:n] + signal.fftconvolve(L, ir[0])[:n] * 0.4
    return L + wet * wl, R + wet * wr


# ---------------------------------------------------------------- instruments

def _partials(freq, dur, parts, click=0.0, vel=1.0):
    """Sum of decaying sine partials: (ratio, amount, decay seconds)."""
    t = t_of(dur)
    out = np.zeros(len(t))
    for ratio, amt, tau in parts:
        f = freq * ratio
        if f > SR * 0.45:
            continue
        ph = rng.uniform(0, 6.28)
        out += amt * np.sin(2 * np.pi * f * t + ph) * np.exp(-t / tau)
    if click:
        c = band(noise(0.012), min(freq * 5, 9000), min(freq * 12, 12000)) * np.exp(-t[:int(0.012 * SR)] / 0.003)
        out[:len(c)] += click * c
    return out * vel


def marimba(freq, dur=0.8, vel=1.0):
    """A wooden bar: a warm fundamental, a tuned overtone two octaves up, a quick knock."""
    s = (440 / freq) ** 0.35
    return fade(_partials(freq, dur, [(1, 1.0, 0.55 * s), (3.96, 0.30, 0.10 * s), (9.8, 0.10, 0.035)], click=0.25, vel=vel), 0.001, 0.05)


def glock(freq, dur=1.2, vel=1.0):
    """A little metal bar (glockenspiel / celesta): bright, bell-like, rings longer."""
    s = (880 / freq) ** 0.3
    return fade(_partials(freq, dur, [(1, 1.0, 0.9 * s), (2.76, 0.30, 0.35 * s), (5.4, 0.14, 0.18 * s), (8.93, 0.05, 0.09)], click=0.08, vel=vel), 0.001, 0.08)


def musicbox(freq, dur=1.4, vel=1.0):
    """A music-box tine: pure and tinkly, with a faint clink."""
    return fade(_partials(freq, dur, [(1, 1.0, 0.7), (6.27, 0.12, 0.09), (2.0, 0.12, 0.3)], click=0.12, vel=vel), 0.001, 0.08)


def kalimba(freq, dur=1.0, vel=1.0):
    """A thumb piano: soft round body, a touch of metal buzz."""
    s = (440 / freq) ** 0.25
    return fade(_partials(freq, dur, [(1, 1.0, 0.5 * s), (5.4, 0.09, 0.05), (2.0, 0.08, 0.25), (8.0, 0.03, 0.03)], click=0.15, vel=vel), 0.001, 0.06)


def bell(freq, dur=1.0, bright=1.0, vel=1.0):
    """A small handbell: sparkly, with the bright overtones fading first."""
    s = (880 / freq) ** 0.25
    return fade(_partials(freq, dur, [(1, 1.0, 0.7 * s), (2.0, 0.25, 0.45 * s), (2.76, 0.3 * bright, 0.25 * s), (5.4, 0.14 * bright, 0.12 * s), (8.4, 0.06 * bright, 0.06)], click=0.05, vel=vel), 0.001, 0.08)


def pluck(freq, dur=1.0, bright=0.5, vel=1.0, body=True):
    """A plucked string (nylon guitar / harp): a looped burst of noise that loses its highs as it rings."""
    n = int(dur * SR)
    D = SR / freq - 0.5
    N = int(D)
    frac = D - N
    # string feedback: delay loop with a gentle lowpass (average of two neighbours), slight loss
    loss = 0.9965 - 0.0025 * (1 - bright) * (440 / freq) ** 0.2
    a = np.zeros(N + 3)
    a[0] = 1
    a[N] -= loss * 0.5 * (1 - frac)
    a[N + 1] -= loss * 0.5
    a[N + 2] -= loss * 0.5 * frac
    burst = low(rng.uniform(-1, 1, N), 1800 + 7000 * bright)
    excite = np.zeros(n)
    excite[:N] = burst
    y = signal.lfilter([1], a, excite)
    y = y - np.mean(y)
    if body:  # wooden body resonances
        y = y + 0.35 * resonator(y, 210, 6) + 0.25 * resonator(y, 480, 5) + 0.1 * resonator(y, 1100, 4)
    return fade(y / (np.max(np.abs(y)) + 1e-9) * vel, 0.001, 0.05)


def harp(freq, dur=1.6, vel=1.0):
    return pluck(freq, dur, 0.8, vel, body=False)


def flute(freq, dur=0.8, vel=1.0, vib=5.0, breath=0.12):
    """A soft wooden flute: sine with faint harmonics, breath noise, vibrato that arrives late."""
    t = t_of(dur)
    depth = 0.004 * np.minimum(1, np.maximum(0, (t - 0.12) / 0.25))
    f = freq * (1 + depth * np.sin(2 * np.pi * vib * t)) * (1 + 0.012 * np.exp(-t / 0.05))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
    air = band(noise(dur), freq * 1.5, freq * 4) * breath
    e = shape(len(t), 0.06, max(0, dur - 0.22), 0.16, 1.5)
    return fade(soft((body + air * (0.5 + 0.5 * np.exp(-t / 0.2))) * e, 1.2), 0.02, 0.05) * vel * 0.8


def ocarina(freq, dur=0.6, vel=1.0):
    """A round, sweet whistle tone: nearly pure, a little vibrato."""
    t = t_of(dur)
    f = freq * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.2))
    ph = 2 * np.pi * np.cumsum(f) / SR
    e = shape(len(t), 0.03, max(0, dur - 0.2), 0.14, 1.5)
    return fade((np.sin(ph) + 0.12 * np.sin(2 * ph)) * e, 0.01, 0.04) * vel * 0.8


def pad(freq, dur=3.0, vel=1.0, bright=1.0):
    """A warm, slow-breathing chord sound: detuned triangles under a soft filter."""
    t = t_of(dur)
    out = np.zeros(len(t))
    for det in (-0.004, 0.0, 0.004):
        out += osc(freq * (1 + det), dur, 'tri', rng.uniform(0, 6))
    out += 0.5 * osc(freq * 2 * 1.002, dur, 'sine', rng.uniform(0, 6))
    out = low(out, 900 + 1600 * bright)
    return fade(out * shape(len(t), min(0.6, dur / 3), 0, min(0.9, dur / 2), 1.2) * vel * 0.3, 0.05, 0.05)


def bass(freq, dur=0.8, vel=1.0):
    """A soft upright-style bass note: round, with a gentle pluck at the start."""
    t = t_of(dur)
    x = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.55) + 0.35 * np.sin(4 * np.pi * freq * t) * np.exp(-t / 0.2) + 0.12 * np.sin(6 * np.pi * freq * t) * np.exp(-t / 0.08)
    return fade(soft(x, 1.3) * vel * 0.9, 0.004, 0.05)


def voice_ah(freq, dur=0.8, vel=1.0, vowel='a'):
    """A soft human-ish 'ooh / ah' made of a buzz shaped by mouth resonances (for choirs and ghosts)."""
    forms = {'a': [(800, 1.0), (1200, 0.5), (2600, 0.2)], 'o': [(450, 1.0), (800, 0.4), (2500, 0.1)], 'u': [(320, 1.0), (800, 0.2), (2500, 0.05)]}[vowel]
    t = t_of(dur)
    f = freq * (1 + 0.006 * np.sin(2 * np.pi * 5 * t) * np.minimum(1, t / 0.3))
    src = osc(f, None, 'saw')
    out = sum(band(src, fr * 0.8, fr * 1.25, 2) * g for fr, g in forms)
    return fade(out * shape(len(t), 0.12, max(0, dur - 0.4), 0.25, 1.3) * vel * 0.5, 0.02, 0.05)


# ---------------------------------------------------------------- percussion

def kick(vel=1.0, dur=0.35):
    t = t_of(dur)
    f = 50 + 90 * np.exp(-t / 0.03)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)
    return fade(x * vel, 0.001, 0.02)


def shaker(vel=1.0, dur=0.09):
    n = noise(dur)
    x = band(n, 5000, 11000) * (np.linspace(0, 1, len(n)) ** 0.6) * np.exp(-t_of(dur) / 0.03)
    return fade(x * vel * 0.6, 0.003, 0.02)


def tick(vel=1.0, dur=0.05, hz=1800):
    """A woodblock-ish click."""
    t = t_of(dur)
    x = np.sin(2 * np.pi * hz * t) * np.exp(-t / 0.012) + 0.5 * np.sin(2 * np.pi * hz * 2.3 * t) * np.exp(-t / 0.006)
    return fade(x * vel * 0.6, 0.0005, 0.01)


def brush(vel=1.0, dur=0.25):
    n = band(noise(dur), 2500, 9000)
    e = np.minimum(1, np.arange(len(n)) / (0.06 * SR)) * np.exp(-t_of(dur) / 0.09)
    return fade(n * e * vel * 0.4, 0.01, 0.05)


def tambourine(vel=1.0, dur=0.3):
    t = t_of(dur)
    jing = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / tau) for f, tau in ((4900, 0.08), (6300, 0.06), (7900, 0.05), (9700, 0.04)))
    hit = band(noise(dur), 3000, 10000) * np.exp(-t / 0.02)
    return fade((0.25 * jing + hit) * vel * 0.5, 0.001, 0.03)


# ---------------------------------------------------------------- finishing

def finish(x, peak=0.8, verb=(0.5, 0.15), fade_in=0.003, fade_out=0.04, hp=45):
    """Room, rumble filter, trim the silent end, fade, then set the loudness."""
    if verb:
        x = reverb(x, verb[0], verb[1])
    x = high(x, hp)
    thresh = np.max(np.abs(x)) * 0.003
    idx = np.nonzero(np.abs(x) > thresh)[0]
    if len(idx):
        x = x[:idx[-1] + 1]
    x = fade(x, fade_in, min(fade_out, len(x) / SR / 3))
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def loudness(x):
    return float(np.sqrt(np.mean(x ** 2)))
