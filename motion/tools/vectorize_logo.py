"""Trace the real Esportra logo raster (public/brand/esportra-icon-512.png) into a crisp SVG.

White mark on near-black -> luminance threshold -> potrace. Writes mark-only and full lockup SVGs
plus a white-on-transparent PNG to assets/logo/.
"""
import sys
import numpy as np
from PIL import Image
import potrace

src, outdir = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("L")
S = 4
big = im.resize((im.width * S, im.height * S), Image.LANCZOS)
a = np.asarray(big).astype(np.float32)
mask = a > 128

def trace(m, name, box):
    bm = potrace.Bitmap(~m)
    path = bm.trace(turdsize=8, alphamax=1.0, opticurve=True, opttolerance=0.2)
    parts = []
    for curve in path:
        d = [f"M{curve.start_point.x:.2f},{curve.start_point.y:.2f}"]
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}")
            else:
                d.append(f"C{seg.c1.x:.2f},{seg.c1.y:.2f} {seg.c2.x:.2f},{seg.c2.y:.2f} {seg.end_point.x:.2f},{seg.end_point.y:.2f}")
        d.append("Z")
        parts.append("".join(d))
    x0, y0, x1, y1 = box
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1-x0} {y1-y0}">'
           f'<path fill="#FAFAFA" fill-rule="evenodd" d="{" ".join(parts)}"/></svg>')
    open(f"{outdir}/{name}.svg", "w").write(svg)
    return svg

ys, xs = np.nonzero(mask)
pad = 8
full_box = (xs.min() - pad, ys.min() - pad, xs.max() + pad, ys.max() + pad)
trace(mask, "esportra-lockup", full_box)

# Split mark (triangle) from wordmark: find the empty row band between them.
rows = mask.any(axis=1)
r = np.nonzero(rows)[0]
gaps = np.nonzero(np.diff(r) > 6 * S)[0]
split = (r[gaps[-1]] + r[gaps[-1] + 1]) // 2 if len(gaps) else None
if split is not None:
    m2 = mask.copy(); m2[split:] = False
    ys2, xs2 = np.nonzero(m2)
    trace(m2, "esportra-mark", (xs2.min() - pad, ys2.min() - pad, xs2.max() + pad, ys2.max() + pad))
    m3 = mask.copy(); m3[:split] = False
    ys3, xs3 = np.nonzero(m3)
    trace(m3, "esportra-wordmark", (xs3.min() - pad, ys3.min() - pad, xs3.max() + pad, ys3.max() + pad))
    print("split row", split / S)

# White-on-transparent raster straight from the source pixels (alpha = luminance).
src_l = np.asarray(im).astype(np.float32)
alpha = np.clip((src_l - 20) / (235 - 20), 0, 1)
rgba = np.zeros((im.height, im.width, 4), np.uint8)
rgba[..., :3] = 250
rgba[..., 3] = (alpha * 255).astype(np.uint8)
Image.fromarray(rgba).crop(Image.fromarray((alpha > 0.05).astype(np.uint8) * 255).getbbox()).save(f"{outdir}/esportra-lockup-white.png")
print("done", full_box)
