"""Sample the supplied GIF into a compact luminance field (requires Pillow).

Run from the repository root: python3 scripts/sample-runner.py
The original GIF is kept in reference/ and is not included in the web bundle.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = 144
source = Image.open(ROOT / 'reference/run.gif')
frames = []
durations = []
for index in range(source.n_frames):
    source.seek(index)
    durations.append(source.info.get('duration', 100))
    frame = source.convert('L').resize((SIZE, SIZE), Image.Resampling.BOX)
    # Lift the small white particles into readable brand ink without filling
    # the black gaps that give the reference its point-cloud texture.
    frames.append(bytes(0 if p < 6 else min(255, round((p / 255) ** .65 * 255))
                        for p in frame.getdata()))

# The supplied GIF alternates dense poses and almost-empty sparkle frames.
# Reconstruct those low-exposure intervals from the adjacent poses, retaining
# their own highlights, so the silhouette does not strobe at half the frame rate.
pixels = bytearray()
exposure = [sum(frame) for frame in frames]
for index, frame in enumerate(frames):
    before = (index - 1) % len(frames)
    after = (index + 1) % len(frames)
    if exposure[index] < .45 * (exposure[before] + exposure[after]) / 2:
        current = bytes(max(value, round((frames[before][p] + frames[after][p]) / 2))
                        for p, value in enumerate(frame))
    else:
        current = frame
    # Match the unusually dark opening pose to the rest of the loop as well.
    gain = max(1, .75 * max(exposure) / max(1, sum(current)))
    pixels.extend(min(255, round(value * gain)) for value in current)

# Tokens < 128 skip 1..128 zero samples; others precede 1..128 literal samples.
packed = bytearray()
i = 0
while i < len(pixels):
    end = i + 1
    if pixels[i] == 0:
        while end < min(i + 128, len(pixels)) and pixels[end] == 0:
            end += 1
        packed.append(end - i - 1)
    else:
        while end < min(i + 128, len(pixels)) and pixels[end] != 0:
            end += 1
        packed.append(127 + end - i)
        packed.extend(pixels[i:end])
    i = end

assets = ROOT / 'src/assets'
assets.mkdir(parents=True, exist_ok=True)
(assets / 'runner.bin').write_bytes(packed)
(assets / 'runner.json').write_text(json.dumps({
    'size': SIZE, 'durations': durations, 'posterFrame': 0,
}, indent=2) + '\n')
print(f'{source.n_frames} frames, {sum(durations)} ms loop, {len(packed):,} bytes')
