"""Convert the supplied three-exercise GIF into circle-field animation data.

Run from the repository root: python3 scripts/sample-exercises.py (Pillow).
The source remains in reference/ and is never shipped to the browser.
"""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 180, 160
SOURCE = ROOT / 'reference/motion.gif'
# Source crops exclude the neighbouring athletes and the ground shadows.
# Each transform places the athlete in a shared 360 x 320 stage, floor y=300.
EXERCISES = [
    ('push-up', (80, 110, 380, 246), 1.12, 228, 242, 300),
    ('seated-press', (475, 25, 635, 246), 1.22, 554, 242, 300),
    ('pull-up', (330, 290, 470, 560), 1.08, 400, 330, 48),
]


def field(frame, bounds, scale, centre, anchor_y, target_y, name):
    crop = frame.crop(bounds)
    silhouette, garments = [], []
    for r, g, b in crop.getdata():
        skin = r > 242 and g < 218 and b < 199
        dark = max(r, g, b) < 185
        white = min(r, g, b) > 198 and b >= r - 7 and g >= r - 12
        red = r > 235 and g < 115
        # Navy shirts and red shorts get dim interiors; skin/equipment stay lit.
        clothed = (b < 90 and r < 85 and g < 85) or red
        silhouette.append(255 if skin or dark or white else 0)
        garments.append(255 if clothed else 0)
    mask = Image.new('L', crop.size)
    mask.putdata(silhouette)
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    clothes = Image.new('L', crop.size)
    clothes.putdata(garments)
    # Keep a bright 3px contour around clothing, preserving the reference design.
    interior = clothes.filter(ImageFilter.MinFilter(7))
    light = ImageChops.subtract(mask, interior.point(lambda v: round(v * .72)))
    if name == 'pull-up':
        # The original bar crosses the entire source image. Rebuild it as fixed
        # geometry in the scene, so its length and hand contact survive resizing.
        for y in range(327 - bounds[1], 341 - bounds[1]):
            for x in range(crop.width):
                r, g, b = crop.getpixel((x, y))
                if not (r > 242 and g < 218 and b < 199):
                    light.putpixel((x, y), 0)
    stage = Image.new('L', (360, 320))
    scaled = light.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.BICUBIC)
    stage.paste(scaled, (round(180 + (bounds[0] - centre) * scale),
                         round(target_y + (bounds[1] - anchor_y) * scale)))
    small = stage.resize((WIDTH, HEIGHT), Image.Resampling.BOX)
    return bytes(0 if p < 12 else round(p / 17) * 17 for p in small.getdata())


def pack(data):
    """Value/count pairs; 1..255 equal samples per run."""
    packed = bytearray()
    start = 0
    while start < len(data):
        end = start + 1
        while end < min(start + 255, len(data)) and data[end] == data[start]:
            end += 1
        packed.extend((data[start], end - start))
        start = end
    return packed


source = Image.open(SOURCE)
durations = []
for index in range(source.n_frames):
    source.seek(index)
    durations.append(source.info.get('duration', 30))
# Retain every other pose at its original elapsed time; the browser interpolates
# between them. The source's full 4.74s loop and relative exercise timing remain.
indices = list(range(0, source.n_frames, 2))
timings = [sum(durations[i:i + 2]) for i in indices]
all_fields, posters = bytearray(), []
for name, bounds, scale, centre, anchor_y, target_y in EXERCISES:
    frames = []
    for index in indices:
        source.seek(index)
        frames.append(field(source.convert('RGB'), bounds, scale, centre, anchor_y, target_y, name))
    all_fields.extend(b''.join(frames))
    # Inline a high push-up / lowered press / raised pull-up pose as a fallback.
    posters.append(list(pack(frames[15])))

assets = ROOT / 'src/assets'
assets.mkdir(parents=True, exist_ok=True)
packed = pack(all_fields)
(assets / 'exercises.bin').write_bytes(packed)
(assets / 'exercises.json').write_text(json.dumps({
    'width': WIDTH, 'height': HEIGHT, 'durations': timings,
    'names': [entry[0] for entry in EXERCISES], 'posters': posters,
}, separators=(',', ':')) + '\n')
print(f'{len(EXERCISES)} exercises, {len(indices)} poses each, {sum(timings)} ms, {len(packed):,} bytes')
