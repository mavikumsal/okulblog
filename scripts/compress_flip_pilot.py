from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "pilot-assets"
RENDERED = ROOT / "rendered"
OUT = ROOT / "compressed"
OUT.mkdir(parents=True, exist_ok=True)

for stem in ("questions-1", "answers-1"):
    source = RENDERED / f"{stem}.png"
    image = Image.open(source).convert("RGB")
    image.thumbnail((1800, 2600), Image.Resampling.LANCZOS)
    jpg = OUT / f"{stem}.jpg"
    image.save(jpg, format="JPEG", quality=78, optimize=True, progressive=True)
    pdf = OUT / f"{stem}.pdf"
    image.save(pdf, format="PDF", resolution=150.0)
    print(f"{pdf}: {pdf.stat().st_size} bytes; {image.width}x{image.height}")
