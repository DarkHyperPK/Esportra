"""Original soundtrack for the Find Teammates reel: 108 BPM (the 120 BPM timeline at 0.9 speed), F minor, synthesized in code.

Reads sfx.json (cue list exported from the timeline) so UI clicks, keystrokes, hits and
whooshes land on exactly the frames the picture uses. Writes build/soundtrack.wav (48 kHz stereo).
"""
import json
import os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 30.0           # timeline seconds (authored at 120 BPM)
SPEED = 0.9          # playback speed: 120 → 108 BPM
TS = 1 / SPEED       # timeline seconds → real seconds
N = int(round(SR * DUR * TS))
BEAT = 0.5
BAR = 2.0
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(1207)

# ── buses (stereo) ───────────────────────────────────────────────────────────
def bus():
    return np.zeros((2, N))

DRUMS, BASS, MUSIC, SFX, VERB = bus(), bus(), bus(), bus(), bus()


def place(b, t, sig, pan=0.0, gain=1.0, send=0.0):
    """Mix mono or stereo `sig` into bus `b` at timeline time t (scaled to real time). Equal-power pan."""
    i = int(round(t * TS * SR))
    if i >= N or i + (sig.shape[-1]) <= 0:
        return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    j0 = max(0, -i)
    n = min(sig.shape[1] - j0, N - max(i, 0))
    b[:, max(i, 0):max(i, 0) + n] += sig[:, j0:j0 + n] * gain
    if send:
        VERB[:, max(i, 0):max(i, 0) + n] += sig[:, j0:j0 + n] * gain * send


# ── DSP helpers ──────────────────────────────────────────────────────────────
def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.uniform(-1, 1, int(d * SR))


def filt(x, kind, f, order=2):
    if kind == 'band':
        sos = butter(order, f, btype='band', fs=SR, output='sos')
    else:
        sos = butter(order, f, btype=kind, fs=SR, output='sos')
    return sosfilt(sos, x, axis=-1)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def adsr(n, a=0.004, r=0.04):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def saw(f, t, phase=0.0):
    return 2 * ((f * t + phase) % 1.0) - 1


# ── instruments ──────────────────────────────────────────────────────────────
def kick(d=0.42, f0=170, f1=44, tau=0.2, drive=2.4):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.032)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    s = np.tanh(s * drive) / np.tanh(drive)
    click = filt(noise(0.006), 'high', 2500) * np.exp(-tt(0.006) / 0.0015) * 0.6
    s[:len(click)] += click
    return s


def clap(d=0.24):
    t = tt(d)
    n = filt(noise(d), 'band', [900, 5200])
    env = np.exp(-t / 0.07)
    for off in (0.0, 0.009, 0.018):
        k = (t >= off) & (t < off + 0.007)
        env[k] = np.maximum(env[k], 1.0)
    return n * env * 0.9


def snare(d=0.22, g=1.0):
    t = tt(d)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05) * 0.6
    sn = filt(noise(d), 'band', [1200, 9000]) * np.exp(-t / 0.09)
    return (body + sn) * g


def hat(open_=False, g=1.0):
    d = 0.16 if open_ else 0.04
    t = tt(d)
    return filt(noise(d), 'high', 7500, 2) * np.exp(-t / (0.06 if open_ else 0.012)) * g


def crash(d=2.0, g=1.0):
    t = tt(d)
    return filt(noise(d), 'high', 4000, 2) * np.exp(-t / 0.55) * g


def supersaw(notes, d, cutoff=5000, voices=7, spread=0.22, g=1.0):
    t = tt(d)
    L = np.zeros(len(t)); R = np.zeros(len(t))
    for m in notes:
        for v in range(voices):
            det = (v - (voices - 1) / 2) / ((voices - 1) / 2) * spread
            s = saw(mtof(m + det), t, rng.random())
            pan = (v / (voices - 1)) * 2 - 1
            a = (pan * 0.8 + 1) * np.pi / 4
            L += s * np.cos(a); R += s * np.sin(a)
    st = np.vstack([L, R]) / (voices * len(notes)) * 2.2
    st = filt(st, 'low', cutoff, 2)
    return st * adsr(len(t), 0.006, 0.06) * g


def pluck(m, d=0.22, g=1.0, bright=3200):
    t = tt(d)
    f = mtof(m)
    s = saw(f, t) * 0.6 + np.sign(np.sin(2 * np.pi * f * 1.002 * t)) * 0.35
    s = filt(s, 'low', bright, 2) * np.exp(-t / 0.085) + filt(s, 'low', 900, 2) * np.exp(-t / 0.16) * 0.5
    return s * adsr(len(t), 0.002, 0.03) * g


def bass_note(m, d=0.11, g=1.0, cutoff=520):
    t = tt(d)
    f = mtof(m)
    s = filt(saw(f, t), 'low', cutoff, 2) * 0.9 + np.sin(2 * np.pi * f / 2 * t) * 0.8
    return np.tanh(s * 1.4) * adsr(len(t), 0.002, 0.025) * g


def sub808(m, d=0.6, g=1.0, glide=0.0):
    t = tt(d)
    f = mtof(m) * (1 + glide * np.exp(-t / 0.05))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35)
    return np.tanh(s * 2.0) * g


def sweep(d, f0, f1, g=1.0, q=0.35):
    """Band-limited noise with a moving band (approximated with stepped filters)."""
    n = noise(d)
    out = np.zeros_like(n)
    steps = 24
    edges = np.linspace(0, len(n), steps + 1).astype(int)
    for k in range(steps):
        fc = f0 * (f1 / f0) ** ((k + 0.5) / steps)
        seg = filt(n, 'band', [max(40, fc * (1 - q)), min(SR / 2 - 100, fc * (1 + q))])
        w = np.zeros_like(n)
        a, b = edges[k], edges[k + 1]
        w[a:b] = 1
        out += seg * w
    return out * g


def riser(d, g=1.0):
    t = tt(d)
    nz = sweep(d, 300, 9000, 1.0) * (t / d) ** 2
    f = 220 * 2 ** (t / d * 2.5)
    ph = np.cumsum(f) / SR
    tone = (2 * (ph % 1) - 1) * 0.25 * (t / d) ** 1.5
    tone = filt(tone, 'low', 4000)
    return (nz + tone) * g


def ui_click(g=1.0, pitch=1.0):
    t = tt(0.07)
    tr = filt(noise(0.07), 'band', [2500, 9000]) * np.exp(-t / 0.0022) * 1.2
    tr2 = np.zeros_like(tr); o = int(0.0018 * SR); tr2[o:] = tr[:-o] * 0.55
    body = np.sin(2 * np.pi * 1950 * pitch * t) * np.exp(-t / 0.011) * 0.55
    tone = np.sin(2 * np.pi * mtof(89) * pitch * t) * np.exp(-t / 0.03) * 0.28  # F6 — in key
    thump = np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.018) * 0.5
    return (tr + tr2 + body + tone + thump) * g


def key_tick(i, g=1.0):
    t = tt(0.03)
    p = 1 + (hash_(i) - 0.5) * 0.3
    s = filt(noise(0.03), 'band', [3000 * p, 9000]) * np.exp(-t / 0.0018) + np.sin(2 * np.pi * 2600 * p * t) * np.exp(-t / 0.006) * 0.3
    return s * g


def hash_(i):
    x = np.sin(i * 127.1 + 311.7) * 43758.5453
    return x - np.floor(x)


def blip(f0, f1, d=0.09, g=1.0):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d / 3)) * g


# ── arrangement ──────────────────────────────────────────────────────────────
CH = {  # F minor: i – VI – III – VII
    'Fm': [65, 68, 72], 'Db': [65, 68, 73], 'Ab': [63, 68, 72], 'Eb': [63, 67, 70],
}
PROG = ['Fm', 'Db', 'Ab', 'Eb']
ROOT = {'Fm': 41, 'Db': 37, 'Ab': 44, 'Eb': 39}
KICKS = []


def chord_at(t):
    return PROG[int(t // BAR) % 4]


def drums():
    for b in range(int(4.0 / BEAT), int(26.0 / BEAT)):
        t = b * BEAT
        KICKS.append(t)
        place(DRUMS, t, kick(), gain=1.0)
    # build bar: 8ths kick 26.0–26.94
    for t in np.arange(26.0, 26.9, 0.25):
        KICKS.append(t); place(DRUMS, t, kick(0.25, tau=0.12), gain=0.85)
    for t in (27.0, 28.0, 29.0):
        KICKS.append(t); place(DRUMS, t, kick(0.6, tau=0.3), gain=1.0)
    for bar in range(2, 13):
        for off in (0.5, 1.5):
            t = bar * BAR + off
            place(DRUMS, t, clap(), gain=0.75, send=0.18, pan=0.0)
    # hats
    for s in np.arange(4.0, 26.0, 0.125):
        pos = int(round(s / 0.125)) % 4
        full = s >= 8.0
        if pos == 2:
            place(DRUMS, s, hat(True, 0.5), pan=0.25)
        elif full or pos == 0:
            place(DRUMS, s, hat(False, 0.55 if pos == 0 else 0.32), pan=-0.2 + 0.4 * hash_(s))
    # fills / rolls
    for t in np.arange(17.5, 18.0, 0.0625):
        place(DRUMS, t, snare(0.12, 0.25 + 0.6 * (t - 17.5) / 0.5), pan=0.1, send=0.1)
    for t in np.arange(3.0, 3.875, 0.0625):
        g = 0.15 + 0.75 * ((t - 3.0) / 0.875) ** 1.5
        place(DRUMS, t, snare(0.1, g), send=0.15)
    for t in np.concatenate([np.arange(26.0, 26.5, 0.125), np.arange(26.5, 26.94, 0.0625)]):
        g = 0.2 + 0.8 * ((t - 26.0) / 0.94) ** 1.5
        place(DRUMS, t, snare(0.1, g), send=0.15)
    for t, g in ((4.0, 1.0), (8.0, 0.75), (13.5, 0.6), (21.0, 0.6), (27.0, 1.0)):
        place(DRUMS, t, crash(2.2, g * 0.5), pan=0.15, send=0.3)


def music():
    # pads: open the filter through the intro, full in the drop, close in the build
    for bar in range(2, 13):
        t0 = bar * BAR
        c = PROG[bar % 4]
        cutoff = 900 + 3100 * min(1, (t0 - 4.0) / 4.0) if t0 < 8 else 5200
        place(MUSIC, t0, supersaw(CH[c], BAR * TS, cutoff=cutoff, g=0.55), send=0.25)
    # build bar: chord with closing filter, stopping before the impact gap
    place(MUSIC, 26.0, supersaw(CH['Eb'], 0.94 * TS, cutoff=2400, g=0.5), send=0.3)
    # bass: rolling 16ths, skipping the kick
    for s in np.arange(4.0, 26.94, 0.125):
        if int(round(s / 0.125)) % 4 == 0:
            continue
        c = chord_at(s) if s < 26 else 'Eb'
        g = 0.55 if s < 8 else 0.7
        place(BASS, s, bass_note(ROOT[c], 0.11 * TS, g, cutoff=420 if s < 8 else 620))
    # lead arp 16ths from the first feature onward, an octave lift from bar 12
    pat = [0, 1, 2, 1, 2, 0, 1, 2, 0, 2, 1, 2, 1, 0, 2, 1]
    for k, s in enumerate(np.arange(8.0, 26.0, 0.125)):
        c = CH[chord_at(s)]
        m = c[pat[k % 16]] + 12 + (12 if s >= 22.0 and k % 2 == 0 else 0)
        acc = 1.0 if k % 4 == 0 else 0.7
        place(MUSIC, s, pluck(m, 0.2, 0.34 * acc), pan=0.35 * np.sin(k * 0.7), send=0.22)
    # outro: big held chord
    place(MUSIC, 27.0, supersaw(CH['Fm'] + [77], 2.9 * TS, cutoff=4200, g=0.75) * np.exp(-tt(2.9 * TS) / (1.4 * TS)), send=0.45)
    place(BASS, 27.0, sub808(29, 2.5 * TS, 0.9, glide=0.6))


def stab(name, t, g=1.0, up=0, d=0.28, gate=None):
    s = supersaw([m + up for m in CH[name]], d, cutoff=6500, g=g)
    s *= np.exp(-tt(d) / (d * 0.6))
    if gate:
        n = s.shape[1]; seg = int(gate * SR)
        mask = ((np.arange(n) // seg) % 2 == 0).astype(float)
        mask[: seg * 2] = 1
        s *= mask
    place(MUSIC, t, s, send=0.35)


def cues():
    cue = json.load(open(os.path.join(HERE, 'sfx.json')))
    hook_ch = ['Fm', 'Fm', 'Db', 'Eb', 'Fm']
    for c in cue:
        t, k = c['t'], c['type']
        if k == 'hit':
            i = c['i']
            place(DRUMS, t, kick(0.5, f0=190, tau=0.25), gain=1.0)
            place(BASS, t, sub808(29 + (0, 0, -4, -2, 0)[i], 0.45, 0.8, glide=0.8))
            place(DRUMS, t, snare(0.2, 0.55), send=0.25)
            stab(hook_ch[i], t, g=0.8, up=12 if i == 4 else 0, d=0.45 if i == 4 else 0.3, gate=0.03125 if i == 4 else None)
        elif k == 'slam':
            place(DRUMS, t, snare(0.22, 0.8), send=0.3)
            place(DRUMS, t, kick(0.3, tau=0.14), gain=0.8)
            if t < 4:
                stab('Ab' if t < 2.6 else 'Eb', t, g=0.65)
            else:
                stab(['Fm', 'Db', 'Ab', 'Fm'][int(round((t - 27.25) / 0.25)) % 4], t, g=0.35, up=12, d=0.2)
        elif k == 'tick':
            place(SFX, t, blip(2400, 3200, 0.04, 0.35), pan=0.3)
        elif k == 'riser':
            d = c.get('len', 0.6) * TS
            if t > 20:
                d = (26.94 - t) * TS
            place(SFX, t, riser(d, 0.55), send=0.3)
        elif k == 'boom':
            place(DRUMS, t, kick(1.2, f0=120, f1=32, tau=0.6, drive=3.0), gain=1.0)
            place(SFX, t, filt(noise(1.2), 'low', 3000) * np.exp(-tt(1.2) / 0.25) * 0.6, send=0.5)
            stab('Fm', t, g=0.7, d=0.9)
        elif k == 'impact':
            place(DRUMS, t, kick(1.4, f0=130, f1=30, tau=0.7, drive=3.0), gain=1.0)
            place(SFX, t, filt(noise(1.6), 'low', 3500) * np.exp(-tt(1.6) / 0.3) * 0.7, send=0.6)
        elif k == 'pop':
            place(SFX, t, blip(500, 1400, 0.09, 0.5), send=0.1)
        elif k == 'piece':
            i = c['i']
            place(SFX, t, blip(mtof(72 + [0, 3, 7, 10, 12, 15, 19, 22, 24, 27, 31, 34][i % 12]), mtof(72 + [0, 3, 7, 10, 12, 15, 19, 22, 24, 27, 31, 34][i % 12]) * 1.01, 0.06, 0.28), pan=-0.6 + 1.2 * (i % 5) / 4, send=0.2)
            place(SFX, t, ui_click(0.25, 1.2))
        elif k == 'click':
            place(SFX, t, ui_click(1.0), pan=0.08)
        elif k == 'key':
            place(SFX, t, key_tick(c.get('i', 0), 0.45), pan=-0.1 + 0.2 * hash_(t))
        elif k in ('whip', 'whoosh', 'swoosh', 'slash'):
            d = {'whip': 0.28, 'whoosh': 0.4, 'swoosh': 0.32, 'slash': 0.34}[k]
            f0, f1 = {'whip': (600, 7000), 'whoosh': (300, 3500), 'swoosh': (2500, 500), 'slash': (900, 9000)}[k]
            s = sweep(d, f0, f1, 0.9) * np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 1.5
            st = np.vstack([s * np.linspace(1.2, 0.3, len(s)), s * np.linspace(0.3, 1.2, len(s))])
            place(SFX, t - d * 0.45, st, gain=0.45, send=0.15)
            if k == 'slash':
                place(SFX, t, blip(mtof(84), mtof(96), 0.25, 0.25), send=0.4)
        elif k == 'scroll':
            for j in range(6):
                place(SFX, t + j * 0.035, key_tick(j + 40, 0.3))
        elif k == 'burst':
            for j, m in enumerate([84, 89, 91, 96]):
                place(SFX, t + j * 0.03, blip(mtof(m), mtof(m), 0.12, 0.22), pan=-0.5 + j * 0.33, send=0.35)
        elif k == 'confirm':
            place(SFX, t, blip(mtof(84), mtof(84), 0.12, 0.3), send=0.3)
            place(SFX, t + 0.08, blip(mtof(91), mtof(91), 0.2, 0.3), send=0.35)


def sidechain():
    tk = np.array(sorted(KICKS)) * TS
    t = np.arange(N) / SR
    idx = np.searchsorted(tk, t, side='right') - 1
    valid = idx >= 0
    dt = np.where(valid, t - tk[np.clip(idx, 0, None)], 10)
    env = 1 - 0.72 * np.exp(-dt / 0.11)
    return env


def reverb(x, secs=2.2, decay=0.55):
    n = int(secs * SR)
    tir = np.arange(n) / SR
    ir = np.vstack([filt(noise(secs), 'low', 6500), filt(noise(secs), 'low', 6500)]) * np.exp(-tir / decay)
    ir[:, : int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    wet = np.vstack([fftconvolve(x[0], ir[0])[:N], fftconvolve(x[1], ir[1])[:N]])
    return filt(wet, 'high', 250)


def main():
    drums(); music(); cues()
    sc = sidechain()
    # the impact gaps: silence everything except reverb just before the drops
    gate = np.ones(N)
    for a, b in ((3.89, 4.0), (26.94, 27.0)):
        i0, i1 = int(a * TS * SR), int(b * TS * SR)
        gate[i0:i1] = np.linspace(1, 0, i1 - i0) ** 4
    mix = DRUMS * gate + (BASS * sc) * gate * 0.95 + (MUSIC * sc) * gate * 0.8 + SFX * 0.9
    mix += reverb(VERB) * 0.35
    # master: gentle tilt, soft clip, fade
    mix = filt(mix, 'high', 28, 2)
    peak = np.abs(mix).max()
    mix = mix / peak * 1.25
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    fade = np.ones(N); f0 = int(29.65 * TS * SR); fade[f0:] = np.linspace(1, 0, N - f0) ** 1.5
    mix *= fade
    mix *= 0.97 / np.abs(mix).max()
    os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
    out = os.path.join(HERE, 'build', 'soundtrack.wav')
    pcm = (mix.T * 32767).astype(np.int16)
    import wave
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    rms = 20 * np.log10(np.sqrt((mix ** 2).mean()))
    print('wrote', out, f'RMS {rms:.1f} dBFS')


if __name__ == '__main__':
    main()
