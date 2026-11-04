"""Original 120 BPM score + UI sound design for the Scrim reel, synthesized from scratch.

Reads motion/comp/timeline.json so every click, whoosh and hit lands on the picture's events.
Writes a 48 kHz stereo 24-bit WAV.

    python3 -I motion/audio/score.py motion/comp/timeline.json out.wav [540|1440]

The width picks which click track to lay down: the 9:16 and 1:1 cuts play the 540 px
interaction script, the 16:9 cut the 1440 px one.
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48_000
rng = np.random.default_rng(7)

tl = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
WIDTH = sys.argv[3] if len(sys.argv) > 3 else "540"


def build_events(tl, width):
    ev = [{"t": t, "type": "word"} for t in tl["hook"]["words"]]
    ev.append({"t": tl["hook"]["riser"][0], "type": "riser", "len": tl["hook"]["riser"][1]})
    ev += [{"t": tl["hook"]["drop"], "type": "impact"}, {"t": 38.0, "type": "impact"}]
    ev += [{"t": t, "type": "tick"} for t in tl["reveal"]["ticks"]]
    ev += [{"t": b["start"], "type": "whoosh"} for b in tl["beats"] if b["start"] >= 6]
    ev += [{"t": 20.5, "type": "riser", "len": 1.5}, {"t": 22.0, "type": "impact", "small": True}]
    for sc in tl["screens"].values():
        for st in sc.get(width) or sc["*"]:
            if st.get("click"):
                ev.append({"t": st["t"], "type": "click"})
            elif st.get("hover"):
                ev.append({"t": st["t"], "type": "hover"})
            if st.get("keys"):
                ev += [{"t": st["t"] - 0.24 + k * 0.06, "type": "key"} for k in range(4)]
            if st.get("sfx"):
                ev.append({"t": st["t"] + 0.04, "type": st["sfx"], "small": st["sfx"] == "impact"})
            elif st.get("cam") and not st.get("click") and st["t"] % 2 != 0:
                ev.append({"t": st["t"], "type": "whoosh", "small": True})
    return sorted(ev, key=lambda e: e["t"])


tl["events"] = build_events(tl, WIDTH)
BPM = tl["bpm"]
BEAT = 60 / BPM
DUR = tl["duration"] + 1.2  # tail
N = int(DUR * SR)

mix = {k: np.zeros((N, 2)) for k in ["drums", "bass", "music", "sfx"]}


def t_arr(n):
    return np.arange(n) / SR


def place(bus, buf, at, gain=1.0, pan=0.0):
    """Add a mono or stereo buffer at time `at` (s) with equal-power pan."""
    i = int(round(at * SR))
    if i >= N:
        return
    if buf.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        buf = np.stack([buf * l, buf * r], axis=1) * np.sqrt(2)
    j = min(N, i + len(buf))
    if i < 0:
        buf, i = buf[-i:], 0
    mix[bus][i:j] += buf[: j - i] * gain


def env_exp(n, decay):
    return np.exp(-t_arr(n) / decay)


def adsr(n, a=0.005, d=0.1, s=0.6, r=0.1):
    t = t_arr(n)
    total = n / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel_start = max(total - r, a)
    e = np.where(t > rel_start, e * np.clip(1 - (t - rel_start) / r, 0, 1), e)
    return e


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), "low")
    return signal.lfilter(b, a, x, axis=0)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x, axis=0)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], "band")
    return signal.lfilter(b, a, x, axis=0)


def saw(freq, n, phase=0.0):
    t = t_arr(n)
    return 2 * ((freq * t + phase) % 1.0) - 1


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def reverb(x, wet=0.25, length=1.6, seed=3):
    """Cheap stereo convolution reverb from decaying filtered noise."""
    r = np.random.default_rng(seed)
    n = int(length * SR)
    ir = r.standard_normal((n, 2)) * np.exp(-t_arr(n) / (length / 5))[:, None]
    ir = lp(ir, 6000)
    ir /= np.sqrt((ir ** 2).sum(axis=0))
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x) + n] for c in range(2)], axis=1)
    out = np.zeros_like(y)
    out[: len(x)] += x * (1 - wet)
    out += y * wet
    return out


# ---------------------------------------------------------------- instruments

def kick(strong=1.0):
    n = int(0.45 * SR)
    t = t_arr(n)
    f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(n, 0.28)
    click = hp(rng.standard_normal(n), 2500) * env_exp(n, 0.004) * 0.5
    return np.tanh((body + click) * 1.6 * strong) * 0.9


def clap():
    n = int(0.5 * SR)
    noise = bp(rng.standard_normal(n), 900, 5200)
    e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        e[i:] += np.exp(-t_arr(n - i) / (0.012 if k < 2 else 0.16))
    tone = np.sin(2 * np.pi * 220 * t_arr(n)) * env_exp(n, 0.05) * 0.2
    return reverb(noise * e * 0.7 + tone, wet=0.3, length=0.9)


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    x = hp(rng.standard_normal(n), 7000, 4)
    return x * env_exp(n, 0.07 if open_ else 0.012) * (0.35 if open_ else 0.28)


def sub_boom(length=1.8, f0=70, f1=32):
    n = int(length * SR)
    t = t_arr(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.25)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, length / 3)
    return np.tanh(x * 1.8)


def impact(big=True):
    n = int((2.4 if big else 1.0) * SR)
    boom = sub_boom(n / SR, 90 if big else 120, 30 if big else 45)
    crack = bp(rng.standard_normal(n), 300, 9000) * env_exp(n, 0.06 if big else 0.03)
    x = boom * 0.9 + crack * (0.6 if big else 0.35)
    return reverb(x, wet=0.35 if big else 0.2, length=2.2 if big else 1.0)


def whoosh(small=False):
    length = 0.3 if small else 0.5
    n = int(length * SR)
    t = t_arr(n)
    x = rng.standard_normal(n)
    # sweep a band-pass up through the swell, then down as it passes
    out = np.zeros(n)
    hop = 256
    centers = 400 + 5200 * np.sin(np.pi * np.clip(t / length, 0, 1)) ** 2
    for i in range(0, n, hop):
        c = centers[i]
        seg = bp(x[max(0, i - 2048): i + hop], c * 0.6, c * 1.6)[-hop:]
        out[i: i + len(seg)] = seg[: n - i]
    amp = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.5
    amp *= np.clip((t / length) * 1.6, 0, 1)
    mono = out * amp * (0.5 if small else 0.8)
    pan = np.linspace(-0.7, 0.7, n)
    st = np.stack([mono * np.cos((pan + 1) * np.pi / 4), mono * np.sin((pan + 1) * np.pi / 4)], axis=1) * np.sqrt(2)
    return st, length * 0.78  # buffer, offset so the peak lands on the event


def ui_click():
    n = int(0.09 * SR)
    t = t_arr(n)
    tick = hp(rng.standard_normal(n), 3000) * env_exp(n, 0.0025) * 0.6
    blip = np.sin(2 * np.pi * 1850 * t) * env_exp(n, 0.012) * 0.45
    low = np.sin(2 * np.pi * 180 * t) * env_exp(n, 0.02) * 0.4
    return reverb(tick + blip + low, wet=0.12, length=0.4)


def ui_tick(pitch=1.0):
    n = int(0.06 * SR)
    t = t_arr(n)
    return (np.sin(2 * np.pi * 2600 * pitch * t) * env_exp(n, 0.008) * 0.35
            + hp(rng.standard_normal(n), 5000) * env_exp(n, 0.002) * 0.3)


def ui_key():
    n = int(0.04 * SR)
    return hp(rng.standard_normal(n), 2500) * env_exp(n, 0.004) * 0.35 + np.sin(2 * np.pi * 3200 * t_arr(n)) * env_exp(n, 0.005) * 0.08


def ui_hover():
    n = int(0.12 * SR)
    t = t_arr(n)
    return np.sin(2 * np.pi * (900 + 600 * t / 0.12) * t) * env_exp(n, 0.04) * 0.18


def success():
    n = int(0.7 * SR)
    t = t_arr(n)
    a = np.sin(2 * np.pi * note(81) * t) * env_exp(n, 0.18)
    i = int(0.06 * SR)
    b = np.zeros(n)
    b[i:] = np.sin(2 * np.pi * note(88) * t[: n - i]) * env_exp(n - i, 0.25)
    return reverb((a + b) * 0.22, wet=0.35, length=1.2)


def thud():
    n = int(0.5 * SR)
    return np.tanh(sub_boom(0.5, 140, 50) * 1.3) * 0.7 + bp(rng.standard_normal(n), 200, 2000) * env_exp(n, 0.02) * 0.3


def riser(length):
    n = int(length * SR)
    t = t_arr(n)
    prog = t / length
    x = rng.standard_normal(n)
    out = np.zeros(n)
    hop = 256
    for i in range(0, n, hop):
        c = 300 + 9000 * prog[i] ** 2
        seg = bp(x[max(0, i - 2048): i + hop], c * 0.7, c * 1.5)[-hop:]
        out[i: i + len(seg)] = seg[: n - i]
    tone = np.sin(2 * np.pi * np.cumsum(220 + 880 * prog ** 2) / SR) * 0.15
    return (out * 0.6 + tone) * prog ** 2


def supersaw(midi_notes, length, cutoff=3200, detune=0.18, voices=5):
    n = int(length * SR)
    st = np.zeros((n, 2))
    for m in midi_notes:
        f = note(m)
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
            ff = f * 2 ** (d / 12)
            s = saw(ff, n, phase=rng.random())
            pan = (v / (voices - 1)) * 2 - 1
            st[:, 0] += s * np.cos((pan * 0.8 + 1) * np.pi / 4)
            st[:, 1] += s * np.sin((pan * 0.8 + 1) * np.pi / 4)
    st /= voices * len(midi_notes)
    return lp(st, cutoff)


def pluck(midi, length=0.2, cutoff=2400):
    n = int(length * SR)
    s = saw(note(midi), n) * 0.6 + np.sign(np.sin(2 * np.pi * note(midi) * t_arr(n))) * 0.3
    return lp(s, cutoff) * env_exp(n, 0.09)


def bass_note(midi, length):
    n = int(length * SR)
    s = saw(note(midi), n) * 0.7 + np.sin(2 * np.pi * note(midi) * t_arr(n)) * 0.6
    return np.tanh(lp(s, 420) * 1.6) * adsr(n, 0.004, 0.12, 0.75, 0.03)


# ---------------------------------------------------------------- arrangement
# A minor: Am - F - C - G (i - VI - III - VII), one chord per bar.
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [33, 29, 36, 31]


def bar_of(t):
    return int(t // (4 * BEAT))


# Hook (0-2s): a hit on every word, filtered stab, no groove yet.
for ev in [e for e in tl["events"] if e["type"] == "word"]:
    place("drums", kick(1.1), ev["t"], 0.9)
    place("drums", clap(), ev["t"], 0.35)
    place("music", supersaw([57 + 12, 60 + 12, 64 + 12], 0.35, cutoff=1800) * adsr(int(0.35 * SR), 0.002, 0.08, 0.2, 0.1)[:, None], ev["t"], 0.55)
    place("bass", bass_note(33, 0.3), ev["t"], 0.7)
place("music", supersaw([45, 52, 57], 2.0, cutoff=700) * np.linspace(0.3, 1, int(2.0 * SR))[:, None], 0.0, 0.35)

# Groove from the drop (2s) to the outro hit (18s).
GROOVE_START, GROOVE_END = 2.0, 38.0
step = BEAT / 4
k = 0
t = GROOVE_START
while t < GROOVE_END - 1e-6:
    s16 = k % 16
    beat_in_bar = s16 // 4
    bar = bar_of(t)
    chord = CHORDS[bar % 4]
    root = ROOTS[bar % 4]
    if s16 % 4 == 0:
        place("drums", kick(), t, 1.0)
    if s16 in (4, 12):
        place("drums", clap(), t, 0.55)
    # 16th hats with accents, open hat on the off-beat
    place("drums", hat(open_=(s16 % 4 == 2)), t, 0.9 if s16 % 2 == 0 else 0.55, pan=0.25)
    # bass: off-beat 8ths, octave jumps on the last beat
    if s16 % 2 == 1 or s16 == 0:
        oct_ = 12 if (beat_in_bar == 3 and s16 % 4 == 3) else 0
        place("bass", bass_note(root + 12 + oct_, step * 1.6), t, 0.55)
    # second half (from the check-in lift): a lead on top and shaker 16ths
    if t >= 22.0:
        if s16 in (0, 3, 6, 10, 12):
            lead = chord[(s16 // 3) % 3] + 24
            place("music", pluck(lead, 0.3, 3800) * 0.9, t, 0.2, pan=0.1)
        place("drums", bp(rng.standard_normal(int(0.04 * SR)), 5000, 12000) * env_exp(int(0.04 * SR), 0.01) * 0.25, t, 0.6, pan=-0.35)
    # arp: chord tones in 16ths, from bar 3 on
    if t >= 4.0:
        tones = chord + [chord[0] + 12, chord[1] + 12]
        place("music", pluck(tones[(k * 3) % len(tones)] + 12, 0.18, 2600 + 900 * np.sin(k / 9)), t, 0.16, pan=(-0.4 if k % 2 else 0.4))
    # chord stabs on 1 and the "and" of 2
    if s16 in (0, 6, 10):
        place("music", supersaw([m + 12 for m in chord], step * 2.2, cutoff=4200) * adsr(int(step * 2.2 * SR), 0.002, 0.07, 0.25, 0.05)[:, None], t, 0.5)
    k += 1
    t = GROOVE_START + k * step

# Pad under the features, swelling every two bars.
for bar in range(1, 19):
    t0 = bar * 4 * BEAT
    pad = supersaw(CHORDS[bar % 4], 4 * BEAT, cutoff=1400, voices=7)
    pad *= adsr(len(pad), 0.25, 0.6, 0.8, 0.3)[:, None]
    place("music", pad, t0, 0.32)

# Outro (18-20s): one big chord and the logo hit, then air.
outro = supersaw([57, 64, 69, 72, 76], 4.2, cutoff=5200, voices=7) * env_exp(int(4.2 * SR), 1.4)[:, None]
place("music", reverb(outro, wet=0.4, length=2.5), 38.0, 0.7)
place("bass", bass_note(33, 1.4) * env_exp(int(1.4 * SR), 0.6), 38.0, 0.8)
place("drums", kick(1.3), 38.0, 1.0)

# Sound design on the picture's events.
for ev in tl["events"]:
    typ, at = ev["type"], ev["t"]
    if typ == "impact":
        place("sfx", impact(big=not ev.get("small")), at, 0.9 if not ev.get("small") else 0.6)
    elif typ == "riser":
        place("sfx", riser(ev["len"]), at, 0.55)
    elif typ == "whoosh":
        buf, off = whoosh(small=ev.get("small", False))
        place("sfx", buf, at - off, 0.7)
    elif typ == "click":
        place("sfx", ui_click(), at, 0.95)
    elif typ == "tick":
        place("sfx", ui_tick(1.0 + 0.06 * ((at * 4) % 6)), at, 0.8)
    elif typ == "key":
        place("sfx", ui_key(), at, 0.7, pan=0.15)
    elif typ == "hover":
        place("sfx", ui_hover(), at, 0.8)
    elif typ == "success":
        place("sfx", success(), at, 0.8)
    elif typ == "thud":
        place("sfx", thud(), at, 0.7)

# ---------------------------------------------------------------- mix
# Sidechain: duck bass and music under every groove kick.
duck = np.ones(N)
dn = int(0.22 * SR)
curve = 1 - 0.65 * np.exp(-t_arr(dn) / 0.07)
kt = GROOVE_START
while kt < GROOVE_END:
    i = int(kt * SR)
    duck[i: i + dn] = np.minimum(duck[i: i + dn], curve[: len(duck[i: i + dn])])
    kt += BEAT
mix["bass"] *= duck[:, None]
mix["music"] *= (0.35 + 0.65 * duck)[:, None]

master = mix["drums"] * 0.9 + mix["bass"] * 0.8 + mix["music"] * 0.75 + mix["sfx"] * 0.85
master = hp(master, 28)
# Glue: bring the sum to a sane level first, then gentle saturation, then normalise to -1 dBFS.
master *= 0.9 / np.percentile(np.abs(master), 99.9)
master = np.tanh(master * 0.9) / np.tanh(0.9)
fade = int(0.8 * SR)
master[-fade:] *= np.linspace(1, 0, fade)[:, None]
master *= 10 ** (-1 / 20) / np.max(np.abs(master))

pcm = (np.clip(master, -1, 1) * (2 ** 23 - 1)).astype(np.int32)
raw = np.zeros((len(pcm), 2, 3), np.uint8)
for b in range(3):
    raw[:, :, b] = (pcm >> (8 * b)) & 0xFF
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(3)
    w.setframerate(SR)
    w.writeframes(raw.tobytes())
print("wrote", OUT, f"{len(pcm) / SR:.2f}s")
