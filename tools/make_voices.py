"""Records Kaelen's tape logs and 3 AM phone calls with the Windows speech engine,
then degrades them so they sound like an old cassette (or a bad phone line).

Usage (from the project folder, Windows only):  python tools/make_voices.py
Reads the STORY / TAPES / PHONE_CALLS text from game/js/config.js
Writes game/assets/voice/*.mp3 and game/js/voices.js (file list + durations)
"""
import os, re, json, subprocess, tempfile, warnings
import numpy as np
warnings.filterwarnings("ignore")
from scipy.io import wavfile
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "game", "js", "config.js")
OUT = os.path.join(ROOT, "game", "assets", "voice")
SR = 22050
rng = np.random.default_rng(13)


def parse_blocks(src, name):
    body = src.split(f"const {name} = [", 1)[1].split("\n];", 1)[0]
    blocks = []
    for m in re.finditer(r"lines: \[(.*?)\]\}", body, re.S):
        blocks.append([s.encode().decode("unicode_escape") if "\\" in s else s
                       for s in re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))])
    return blocks


def speakable(t):
    t = t.replace("I-3", "I three").replace("CAM 05", "cam zero five").replace("CAM 03", "cam zero three")
    t = t.replace("—", "").replace("...", ", ")
    return t


def synth_all(items, tmp):
    """items: list of (key, text). One PowerShell call renders them all to WAV."""
    script = [
        "Add-Type -AssemblyName System.Speech",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer",
        "$s.SelectVoice('Microsoft David Desktop')",
        "$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)",
    ]
    for key, text in items:
        ssml = ('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
                f'<prosody rate="-12%" pitch="-8%">{text}</prosody></speak>')
        ssml = ssml.replace("'", "''").replace("&", "and")
        path = os.path.join(tmp, key + ".wav").replace("'", "''")
        script += [f"$s.SetOutputToWaveFile('{path}', $fmt)", f"$s.SpeakSsml('{ssml}')"]
    script.append("$s.SetOutputToNull()")
    ps = os.path.join(tmp, "speak.ps1")
    with open(ps, "w", encoding="utf-8-sig") as f:
        f.write("\n".join(script))
    subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps], check=True)


def wow_flutter(x, amount=1.0, speed=0.95):
    """Tape speed wobble: resample along a slowly wavering time base (also slows/lowers pitch)."""
    n = len(x)
    t = np.arange(int(n / speed)) / SR
    rate = speed * (1 + amount * (0.006 * np.sin(2 * np.pi * 0.6 * t + rng.random() * 6)
                                  + 0.0025 * np.sin(2 * np.pi * 5.7 * t)))
    pos = np.cumsum(rate)
    pos = pos[pos < n - 1]
    return np.interp(pos, np.arange(n), x)


def bandpass(x, lo, hi, order=3):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def cassette(x, phone=False, cut=False):
    x = x / (np.abs(x).max() + 1e-9)
    x = wow_flutter(x, amount=1.6 if phone else 1.0, speed=0.95)
    x = bandpass(x, 380, 3000) if phone else bandpass(x, 220, 4200)
    drive = 3.2 if phone else 2.0
    x = np.tanh(x * drive) / np.tanh(drive)                       # saturated old electronics
    x = x + 0.18 * np.concatenate([np.zeros(int(0.055 * SR)), x])[:len(x)]   # small room slap
    # dropouts: the tape briefly loses signal
    for _ in range(rng.integers(1, 3)):
        c = rng.integers(0, max(1, len(x) - 3000)); w = rng.integers(800, 2500)
        x[c:c + w] *= np.linspace(1, 0.15, w) if rng.random() < 0.5 else 0.3
    if phone:  # digital stutter glitch
        c = rng.integers(0, max(1, len(x) - 4000)); seg = x[c:c + 600].copy()
        for k in range(3):
            x[c + k * 600:c + (k + 1) * 600] = seg[:len(x[c + k * 600:c + (k + 1) * 600])]
    pre, post = int(0.35 * SR), int(0.5 * SR)
    x = np.concatenate([np.zeros(pre), x, np.zeros(post)])
    hiss = bandpass(rng.standard_normal(len(x)), 1500, 9000) * (0.05 if phone else 0.035)
    hum = 0.012 * np.sin(2 * np.pi * 50 * np.arange(len(x)) / SR)
    x = x * 0.8 + hiss + hum
    for _ in range(rng.integers(4, 9)):                            # clicks & pops
        c = rng.integers(0, len(x) - 50); x[c:c + 20] += rng.uniform(-0.5, 0.5)
    x[:300] += rng.uniform(-0.8, 0.8, 300) * np.linspace(1, 0, 300)   # play-button clunk
    if cut:  # line ends in a burst of static and dead air
        burst = rng.standard_normal(int(0.6 * SR)) * np.linspace(0.9, 0, int(0.6 * SR))
        x = np.concatenate([x[:-post], burst, np.zeros(int(0.2 * SR))])
    return x / (np.abs(x).max() + 1e-9) * 0.89


def main():
    src = open(CONFIG, encoding="utf-8").read()
    tapes, calls = parse_blocks(src, "TAPES"), parse_blocks(src, "PHONE_CALLS")
    story = re.findall(r'"((?:[^"\\]|\\.)*)"', src.split("const STORY = {", 1)[1].split("]};", 1)[0].split("lines: [", 1)[1])
    items, meta = [], []
    for i, line in enumerate(story):
        items.append((f"story_{i}", speakable(line))); meta.append((f"story_{i}", False, False))
    for n, lines in enumerate(tapes, start=1):
        for i, line in enumerate(lines):
            items.append((f"tape{n}_{i}", speakable(line))); meta.append((f"tape{n}_{i}", False, line.endswith("—")))
    for n, lines in enumerate(calls, start=1):
        for i, line in enumerate(lines):
            items.append((f"call{n}_{i}", speakable(line))); meta.append((f"call{n}_{i}", True, line.endswith("—")))
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    with tempfile.TemporaryDirectory() as tmp:
        print(f"speaking {len(items)} lines...")
        synth_all(items, tmp)
        for key, phone, cut in meta:
            sr, x = wavfile.read(os.path.join(tmp, key + ".wav"))
            y = cassette(x.astype(np.float32), phone=phone, cut=cut)
            wav = os.path.join(tmp, key + "_fx.wav")
            wavfile.write(wav, SR, (y * 32767).astype(np.int16))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-b:a", "48k",
                            os.path.join(OUT, key + ".mp3")], check=True)
            manifest[key] = round(len(y) / SR, 2)
    with open(os.path.join(ROOT, "game", "js", "voices.js"), "w", encoding="utf-8") as f:
        f.write("// generated by tools/make_voices.py: voice clip -> duration in seconds\n")
        f.write("const VOICES = " + json.dumps(manifest, indent=1) + ";\n")
    print("wrote", len(manifest), "clips,", round(sum(manifest.values())), "seconds total")


if __name__ == "__main__":
    main()
