from pathlib import Path
from PIL import Image

project_root = Path(__file__).resolve().parents[2]
path = project_root / 'assets' / 'brand' / 'fluxora-app-icon-source.png'
im = Image.open(path)
print({'format': im.format, 'size': im.size, 'mode': im.mode, 'has_alpha': 'A' in im.getbands(), 'bbox': im.getbbox()})
