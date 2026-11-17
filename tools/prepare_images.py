"""Turns the daytime lab photos into NIGHT game backgrounds.

For every shot it writes two 1280x720 images into game/assets/img/:
  <name>_dark.jpg  lights off: cold, almost black, windows show night
  <name>_lit.jpg   warm amber pools of light spreading from the photo's own
                   ceiling lights (detected automatically) + optional extra lamps
The game cross-fades between them to make the lights flicker.

Usage (from the project folder):  python tools/prepare_images.py
"""
import os
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images", "lab")
DST = os.path.join(ROOT, "game", "assets", "img")
W, H = 1280, 720

# name: (source photo, vertical crop focus 0..1, extra lamps [(x, y, strength)], light warmth,
#        windows [(x0, y0, x1, y1)] that must show night instead of daylight). All coords 0..1.
SHOTS = {
    "office":  ("office_1.jpg",   0.55, [(0.86, 0.62, 0.9), (0.5, 0.05, 0.6)], 1.0, []),
    "doorway": ("hallway.jpg",    0.55, [(0.5, 0.02, 1.0)], 1.0, [(0.42, 0.0, 0.57, 0.45)]),
    "cam01":   ("big_hall_2.jpg", 0.50, [], 1.0, [(0.25, 0.37, 0.62, 0.5)]),
    "cam02a":  ("hallway.jpg",    0.62, [(0.5, 0.0, 1.0)], 0.9, [(0.42, 0.0, 0.57, 0.5)]),
    "cam02b":  ("big_hall_4.jpg", 0.55, [], 1.0, []),
    "cam03":   ("cabinet_1.jpg",  0.45, [(0.45, 0.05, 1.2)], 0.8, []),
    "cam04":   ("cabin1_1.jpg",   0.60, [(0.55, 0.0, 1.0)], 1.0, []),
    "cam05":   ("cabin2_1.jpg",   0.62, [(0.45, 0.0, 1.0), (0.62, 0.62, 0.45)], 1.0, [(0.0, 0.0, 1.0, 0.36)]),
    "cam06":   ("cabin3_1.jpg",   0.55, [(0.5, 0.0, 0.9), (0.62, 0.55, 0.5)], 1.0,
                [(0.04, 0.2, 0.31, 0.68), (0.34, 0.2, 0.66, 0.68), (0.69, 0.2, 0.96, 0.68)]),
    "cam07":   ("cabin4_3.jpg",   0.62, [(0.6, 0.0, 0.8)], 0.85, [(0.11, 0.0, 0.29, 0.52)]),
    "cam08":   ("cabin5_1.jpg",   0.55, [(0.45, 0.0, 0.8)], 0.9, [(0.9, 0.0, 1.0, 0.9), (0.6, 0.3, 0.74, 0.62, "nolamp")]),
}

# rooms that should show more of the photo (wider view). 1 = normal, smaller = zoomed out
ZOOM = {"cam07": 0.72}


def crop_aspect(im, aspect, focus):
    h, w = im.shape[:2]
    if w / h > aspect:
        nw = int(h * aspect); x = (w - nw) // 2; return im[:, x:x + nw]
    nh = int(w / aspect); y = int((h - nh) * focus); return im[y:y + nh]


def load(src, focus, zoom=1.0):
    im = cv2.imread(os.path.join(SRC, src))[:, :, ::-1].astype(np.float32) / 255.0  # BGR -> RGB
    full = cv2.resize(crop_aspect(im, W / H, focus), (W, H), interpolation=cv2.INTER_AREA)
    if zoom >= 1:
        return full
    # zoomed out: show a taller slice of the photo in the middle, and fill the sides with a
    # blurred, darkened extension of the room so the frame still reads as one camera image
    cw = int(W * zoom)
    mid = cv2.resize(crop_aspect(im, cw / H, focus), (cw, H), interpolation=cv2.INTER_AREA)
    bg = blur(full, 28) * 0.45
    x0 = (W - cw) // 2
    alpha = np.ones((H, cw, 1), np.float32)
    ramp = np.linspace(0, 1, 60, dtype=np.float32)[None, :, None]
    alpha[:, :60] = ramp; alpha[:, -60:] = ramp[:, ::-1]
    bg[:, x0:x0 + cw] = mid * alpha + bg[:, x0:x0 + cw] * (1 - alpha)
    return bg


def blur(a, sigma):
    return cv2.GaussianBlur(a, (0, 0), sigma)


def desat(im, k):
    L = (im @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
    return im * (1 - k) + L * k


def vignette():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
    return np.clip(1.15 - d ** 2, 0.08, 1.0)[..., None]


def light_sources(im):
    """Ceiling panels / tubes: very bright, neutral, in the upper part of the frame."""
    L = im @ np.array([0.299, 0.587, 0.114], np.float32)
    sat = im.max(2) - im.min(2)
    yy = np.linspace(0, 1, H)[:, None]
    src = ((L > 0.88) & (sat < 0.3) & (yy < 0.45)).astype(np.uint8)
    src = cv2.morphologyEx(src, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    # drop huge blobs (those are windows / sky, not lamps)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(src)
    keep = np.zeros_like(src, np.float32)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < W * H * 0.03:
            keep[lab == i] = 1.0
    return keep


def night(name, src, focus, lamps, warmth, windows):
    im = load(src, focus, ZOOM.get(name, 1.0))
    L = im @ np.array([0.299, 0.587, 0.114], np.float32)

    # a window rect is (x0, y0, x1, y1); add a 5th value "nolamp" to only stop lamp detection there
    win_rect = np.zeros((H, W), np.float32)
    no_lamp = np.zeros((H, W), np.float32)
    for r in windows:
        x0, y0, x1, y1 = r[:4]
        target = no_lamp if len(r) > 4 else win_rect
        target[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 1.0
    lamp_px = light_sources(im) * (1 - win_rect) * (1 - no_lamp)   # bright windows / sun patches are not lamps
    L = np.where(no_lamp > 0, np.minimum(L, 0.6), L)                # and they shouldn't read as daylight either
    # extra hand-placed lamps
    for (lx, ly, s) in lamps:
        cv2.circle(lamp_px, (int(lx * W), int(ly * H)), 18, float(s), -1)

    # windows / daylight blow-outs that are not lamps -> night outside.
    # Feathered (no hard box edges) and strongest only on the bright glass itself,
    # so frames, bars, trees and anything standing in front stay as shapes.
    near_lamp = cv2.dilate(lamp_px, np.ones((25, 25), np.uint8)) > 0
    win = ((L > 0.86) & ~near_lamp).astype(np.uint8)
    # only big bright areas are windows; small bright spots are distant lights, leave them
    n, lab, stats, _ = cv2.connectedComponentsWithStats(win)
    big = np.zeros((H, W), np.float32)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > W * H * 0.006:
            big[lab == i] = 1.0
    win = big
    rect_soft = blur(win_rect, 14)
    win = np.maximum(win, rect_soft * np.clip((L - 0.45) / 0.35, 0, 1))
    win = blur(win, 3)[..., None]
    # night through the glass keeps the photo's structure: what was bright sky becomes
    # dim navy, what was darker (bars, frames, branches, a fan) becomes black silhouette
    moon = np.array([0.30, 0.40, 0.62], np.float32)
    night_view = moon * (0.02 + 0.30 * (L[..., None] ** 1.8))

    # daylight sun patches on desks/floors would glow like lamps: roll off highlights
    im = im / (im + 0.45) * 1.45

    # light falloff: tight pool + wide spill, pushed downward (light falls on floor/desks)
    pool = blur(lamp_px, W * 0.035) * 1.0 + blur(lamp_px, W * 0.10) * 0.9 + blur(lamp_px, W * 0.22) * 0.6
    M = np.float32([[1, 0, 0], [0, 1, H * 0.10]])
    pool = cv2.warpAffine(pool, M, (W, H), borderMode=cv2.BORDER_REPLICATE)
    if pool.max() > 0:
        pool = pool / np.percentile(pool, 99.7)
    pool = np.clip(pool, 0, 1.3) ** 0.75
    pool = pool[..., None]

    vig = vignette()

    # ---------- lights OFF: cold, near black ----------
    dark = desat(im, 0.85) * np.array([0.62, 0.74, 0.95], np.float32) * 0.21
    dark = dark * (1 - win) + night_view * 0.75 * win
    dark = (dark ** 1.15) * vig

    # ---------- lights ON: warm sodium/amber pools ----------
    amber = np.array([1.0, 0.66, 0.36], np.float32) * warmth + (1 - warmth) * np.array([0.9, 0.8, 0.6], np.float32)
    warm = desat(im, 0.45) * amber
    warm = np.clip((warm - 0.5) * 1.25 + 0.5, 0, 1)            # contrast
    ambient = 0.22
    lit = warm * (ambient + 1.45 * pool)
    # glass at night: dark outside + a faint reflection of the warm room
    lit = lit * (1 - win) + (night_view + warm * pool * 0.12) * win
    # glow around the lamps themselves
    bloom = blur(lamp_px, 10)[..., None] * 0.9 + blur(lamp_px, 40)[..., None] * 0.45
    lit = lit + bloom * np.array([1.0, 0.72, 0.42], np.float32)
    lit = np.clip(lit, 0, 1) * vig

    def save(a, suffix):
        out = (np.clip(a, 0, 1) * 255).astype(np.uint8)[:, :, ::-1]
        cv2.imwrite(os.path.join(DST, f"{name}_{suffix}.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 82])
    save(dark, "dark"); save(lit, "lit")
    return int(lamp_px.sum() > 0)


def main():
    os.makedirs(DST, exist_ok=True)
    for name, (src, focus, lamps, warmth, windows) in SHOTS.items():
        found = night(name, src, focus, lamps, warmth, windows)
        print("wrote", name, "(lights found)" if found else "(no lamps!)")


if __name__ == "__main__":
    main()
