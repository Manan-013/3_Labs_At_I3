# Five Nights at I-3

A browser survival-horror game set in the real I-3 lab. Five corrupted robots hunt you from 11 PM to 6 AM,
your power keeps draining, and the only way to recharge it is to solve code tickets on the terminal:
**correct fix +5% power, error -7%**.

## Play
Needs Python (only to serve the files):

```
python -m http.server 8642 --directory game
```

Open http://localhost:8642 and use headphones. **New Game** starts with the walk across campus to the lab.

| Key | Action |
|---|---|
| W A S D / Shift | walk / run (intro) · E enter the lab |
| Q / E | left / right blast gate |
| A / D | left / right door light |
| S | cameras (1-9 to switch) |
| T | code terminal |

## Project layout
| Path | What |
|---|---|
| `game/` | the playable game (HTML, CSS, plain JavaScript); see `game/README.md` |
| `images/lab/`, `images/campus/` | source photos of the lab and campus |
| `tools/prepare_images.py` | turns the lab photos into night camera images |
| `tools/prepare_campus.py` | turns the campus photos into night intro scenes |
| `tools/make_voices.py` | records the narrator tapes and phone calls (Windows speech + ffmpeg) |
| `GAME_DESIGN_DOCUMENT.md` | full design document |
| `generate_pdf.py` | builds `Five_Nights_At_I3_Game_Design_Document.pdf` |

## Credits
- Font: Creepster by Font Diner, SIL Open Font License (`game/assets/fonts/Creepster-OFL.txt`)
- All sound effects and music are synthesized in the browser; the narrator voice uses the Windows speech engine.
