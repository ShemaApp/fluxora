from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT_ROOT / 'assets' / 'brand' / 'fluxora-logo.png'
OUT_DIR = PROJECT_ROOT / 'icons'
BACKGROUND = (6, 59, 92, 255)  # Deep Navy FLUXORA #063B5C

source = Image.open(SOURCE).convert('RGBA')
bbox = source.getbbox()
if bbox is None:
    raise RuntimeError('El logo no contiene píxeles visibles')

visible = source.crop(bbox)
# El icono conserva el símbolo gráfico izquierdo del logo aprobado.
mark_width = max(1, int(visible.width * 0.30))
mark = visible.crop((0, 0, mark_width, visible.height))
mark_bbox = mark.getbbox()
if mark_bbox:
    mark = mark.crop(mark_bbox)

OUT_DIR.mkdir(parents=True, exist_ok=True)
for size in (192, 512):
    canvas = Image.new('RGBA', (size, size), BACKGROUND)
    safe = int(size * 0.64)
    scale = min(safe / mark.width, safe / mark.height)
    resized = mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.Resampling.LANCZOS)
    position = ((size - resized.width) // 2, (size - resized.height) // 2)
    canvas.alpha_composite(resized, position)
    output = OUT_DIR / f'icon-{size}.png'
    canvas.convert('RGB').save(output, format='PNG', optimize=True)
    print(f'{output}: {canvas.size[0]}x{canvas.size[1]}')
