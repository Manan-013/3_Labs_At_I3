"""Turns the daytime campus photos into NIGHT scenes for the walk-in intro.

Writes game/assets/img/<name>_dark.jpg (moonlight only) and <name>_lit.jpg (street lamps,
entrance lights and a few lit windows). The sky is replaced with a night sky + stars + moon.

Usage (from the project folder):  python tools/prepare_campus.py
"""
import os
import numpy as np
import cv2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images", "campus")
DST = os.path.join(ROOT, "game", "assets", "img")
W, H = 1280, 720
rng = np.random.default_rng(7)

# name: source, crop (x0,y0,x1,y1 in 0..1, cut to 16:9 inside it), horizon (sky is above this, 0..1;
#       negative = clear blue sky only, so white walls touching the sky are not mistaken for it),
#       lamps [(x, y, strength)], lit windows [(x0, y0, x1, y1)], moon (x, y) or None
SCENES = {
    "campus_aerial": ("campus2.jpg", (0.0, 0.1, 0.86, 1.0), 0.35, [(0.33, 0.52, 0.7), (0.62, 0.5, 0.5), (0.86, 0.6, 0.6)],
                      [(0.18, 0.45, 0.2, 0.47), (0.52, 0.42, 0.54, 0.44), (0.72, 0.4, 0.735, 0.42)], (0.18, 0.12)),
    "campus_gate":   ("campus1.jpg", (0.0, 0.0, 1.0, 1.0), -0.62, [(0.07, 0.42, 0.9), (0.86, 0.42, 0.9), (0.42, 0.72, 0.6)],
                      [(0.32, 0.47, 0.345, 0.5), (0.52, 0.47, 0.545, 0.5)], (0.8, 0.12)),
    "campus_ground": ("campus3.jpg", (0.0, 0.0, 1.0, 1.0), 0.285, [(0.46, 0.49, 0.8), (0.9, 0.48, 0.5), (0.1, 0.48, 0.5)],
                      [(0.3, 0.36, 0.315, 0.39), (0.63, 0.33, 0.645, 0.36), (0.78, 0.41, 0.795, 0.44), (0.18, 0.42, 0.195, 0.45)], (0.2, 0.12)),
    "campus_front":  ("campus4.webp", (0.0, 0.05, 1.0, 1.0), -0.45, [(0.83, 0.75, 1.0), (0.62, 0.86, 0.6), (0.97, 0.86, 0.7)],
                      [(0.55, 0.62, 0.58, 0.66), (0.75, 0.55, 0.79, 0.6), (0.14, 0.63, 0.17, 0.67)], (0.3, 0.15)),
}


def blur(a, s):
    return cv2.GaussianBlur(a, (0, 0), s)


def load(src, crop):
    im = cv2.imread(os.path.join(SRC, src), cv2.IMREAD_COLOR)[:, :, ::-1].astype(np.float32) / 255.0
    h, w = im.shape[:2]
    x0, y0, x1, y1 = crop
    im = im[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)]
    h, w = im.shape[:2]
    if w / h > W / H:
        nw = int(h * W / H); x = (w - nw) // 2; im = im[:, x:x + nw]
    else:
        nh = int(w * H / W); y = (h - nh) // 2; im = im[y:y + nh]
    return cv2.resize(im, (W, H), interpolation=cv2.INTER_CUBIC)


def sky_mask(im, horizon):
    blue_only = horizon < 0; horizon = abs(horizon)
    L = im @ np.array([0.299, 0.587, 0.114], np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    sat = im.max(2) - im.min(2)
    yy = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
    bluish = (b > r + 0.05) & (L > 0.35)
    cand = (bluish if blue_only else (bluish | ((L > 0.7) & (sat < 0.14)))) & (yy < horizon)
    cand = cand.astype(np.uint8)
    # keep only regions connected to the top edge (that's sky, not a white wall)
    n, lab = cv2.connectedComponents(cand)
    top = set(np.unique(lab[0][lab[0] > 0]))
    m = np.isin(lab, list(top)).astype(np.float32)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    return blur(m, 2.5)[..., None]


def night_sky(moon):
    yy = np.linspace(0, 1, H)[:, None, None]
    sky = (np.array([0.01, 0.015, 0.035]) * (1 - yy) + np.array([0.03, 0.04, 0.07]) * yy).astype(np.float32)
    sky = np.broadcast_to(sky, (H, W, 3)).copy()
    stars = (rng.random((H, W)) > 0.9985).astype(np.float32) * rng.uniform(0.3, 1.0, (H, W))
    sky += blur(stars, 0.7)[..., None] * 1.8 * np.array([0.9, 0.95, 1.0], np.float32)
    if moon:
        mx, my = int(moon[0] * W), int(moon[1] * H)
        glow = np.zeros((H, W), np.float32); cv2.circle(glow, (mx, my), 22, 1.0, -1)
        sky += blur(glow, 40)[..., None] * 0.35 * np.array([0.7, 0.8, 1.0], np.float32)
        disc = np.zeros((H, W), np.float32); cv2.circle(disc, (mx, my), 20, 1.0, -1)
        bite = np.zeros((H, W), np.float32); cv2.circle(bite, (mx + 9, my - 4), 18, 1.0, -1)
        sky += blur(disc * (1 - bite), 1.2)[..., None] * np.array([0.85, 0.88, 0.8], np.float32)
    return np.clip(sky, 0, 1)


def vignette():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.62)) ** 2)
    return np.clip(1.15 - d ** 2, 0.1, 1.0)[..., None]


def desat(im, k):
    L = (im @ np.array([0.299, 0.587, 0.114], np.float32))[..., None]
    return im * (1 - k) + L * k


def convert(name, src, crop, horizon, lamps, windows, moon):
    im = load(src, crop)
    im = im / (im + 0.45) * 1.45                      # tame daylight highlights
    sky = sky_mask(im, horizon)
    nsky = night_sky(moon)
    vig = vignette()

    moonlit = desat(im, 0.8) * np.array([0.55, 0.68, 0.95], np.float32) * 0.22
    dark = moonlit * (1 - sky) + nsky * sky
    dark = (dark ** 1.1) * vig

    lamp = np.zeros((H, W), np.float32)
    for (x, y, s) in lamps:
        cv2.circle(lamp, (int(x * W), int(y * H)), 10, float(s), -1)
    pool = blur(lamp, 30) * 1.0 + blur(lamp, 90) * 1.0 + blur(lamp, 200) * 0.6
    pool = pool / (pool.max() + 1e-6)
    pool = np.clip(pool, 0, 1)[..., None] ** 0.8
    amber = np.array([1.0, 0.68, 0.38], np.float32)
    warm = desat(im, 0.4) * amber
    lit = moonlit * (1 - pool) + warm * pool * 1.15
    # lit windows: a few rooms still on, warm and slightly blurred
    win = np.zeros((H, W), np.float32)
    for (x0, y0, x1, y1) in windows:
        win[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 1.0
    lit = lit + blur(win, 1.5)[..., None] * np.array([0.95, 0.7, 0.4], np.float32) * 0.8 + blur(win, 12)[..., None] * 0.25 * amber
    lit = lit * (1 - sky) + nsky * sky
    bloom = blur(lamp, 6)[..., None] * 0.9 + blur(lamp, 22)[..., None] * 0.5
    lit = np.clip(lit + bloom * np.array([1.0, 0.78, 0.5], np.float32), 0, 1) * vig

    for a, suffix in ((dark, "dark"), (lit, "lit")):
        out = (np.clip(a, 0, 1) * 255).astype(np.uint8)[:, :, ::-1]
        cv2.imwrite(os.path.join(DST, f"{name}_{suffix}.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 84])
    print("wrote", name)


if __name__ == "__main__":
    os.makedirs(DST, exist_ok=True)
    for name, args in SCENES.items():
        convert(name, *args)
