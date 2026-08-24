from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE = PROJECT_ROOT / 'assets' / 'brand' / 'fluxora-app-icon-source.png'
OUT_DIR = PROJECT_ROOT / 'icons'

source = Image.open(SOURCE).convert('RGBA')
if source.width != source.height:
    raise RuntimeError('El icono oficial debe ser cuadrado')

OUT_DIR.mkdir(parents=True, exist_ok=True)
for size in (192, 512):
    resized = source.resize((size, size), Image.Resampling.LANCZOS)
    output = OUT_DIR / f'icon-{size}.png'
    resized.save(output, format='PNG', optimize=True)
    print(f'{output}: {resized.size[0]}x{resized.size[1]}')
