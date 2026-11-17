# Five Nights at I-3 — playable build

Plain HTML/JS, no install. All sound is synthesized in the browser; the backgrounds are the real I-3 lab photos.

## Play
From the project folder:

```
python -m http.server 8642 --directory game
```

Then open http://localhost:8642. Headphones recommended (left/right door sounds are panned).

## Controls
| Key | Action |
|---|---|
| Q / E | close / open left / right blast gate |
| A / D | left / right door light |
| S (or Space) | cameras · 1–9 switch camera |
| T | code terminal · 1–4 answer multiple choice |
| F | strobe the cabinet (on CAM 03) |
| Esc | back to the office |

## Files
- `js/config.js` – all balance numbers (power drain, night difficulty, camera spots, tape lines)
- `js/game.js` – game loop, robot AI, power, doors, terminal
- `js/art.js` – the five robots, drawn in code, plus static/scanline effects
- `js/puzzles.js` – Python code tickets by tier (add more here)
- `js/audio.js` – synthesized ambience, footsteps, bangs, music box, jumpscare
- `assets/img/` – night versions of the lab photos, made by `tools/prepare_images.py` from `images/lab/`.
  Each room has `_dark` (lights off, windows show night) and `_lit` (warm amber light pools from the
  room's own ceiling lights). The game cross-fades them to flicker the lights. To tweak a room, edit its
  lamps / windows in `SHOTS` at the top of the script and run `python tools/prepare_images.py`.

## Walk-in intro (New Game)
The story tape plays over three automatic cinematic shots (aerial, main gate, sports ground), then
you walk yourself through the main building entrance and the corridor to the Lab I-3 door
(W/S walk, A/D look, Shift run, E to enter, or SKIP INTRO). Scenes are listed in `WALK_SCENES`
in `js/game.js`; a scene with `auto: {...}` is a B-roll shot, one without is walkable.
The campus night images come from `images/campus/` via `python tools/prepare_campus.py`
(lamps, lit windows, sky and moon are set per photo in `SCENES` at the top of that script).

## Narrator voice
Kaelen's tapes and 3 AM phone calls are real voice clips in `assets/voice/`, recorded with the Windows
speech engine and degraded to sound like an old cassette / bad phone line. After editing `TAPES` or
`PHONE_CALLS` in `js/config.js`, re-record them (Windows, needs ffmpeg):

```
python tools/make_voices.py
```

## Testing helpers
- `?speed=10` runs the clock 10x faster
- `?debug=1` unlocks all nights on the menu
- `gallery.html?who=rust|np|echo|deadlock|kz|all&lit=0.5` shows a robot large; `?who=jump&j=rust` shows a jumpscare
