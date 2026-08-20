from pathlib import Path
import re
from urllib.parse import urljoin
import requests
from PIL import Image

ROOT = Path('/home/ubuntu/okulblog/pilot-assets')
ROOT.mkdir(parents=True, exist_ok=True)

sources = {
    'questions': (
        Path('/home/ubuntu/upload/online.fliphtml5.com_hpboy_vtaz__p_1_1787228425016.html'),
        'https://online.fliphtml5.com/hpboy/vtaz/'
    ),
    'answers': (
        Path('/home/ubuntu/upload/online.fliphtml5.com_hpboy_cmil__p_1_1787228456767.html'),
        'https://online.fliphtml5.com/hpboy/cmil/'
    ),
}

for kind, (html_path, base_url) in sources.items():
    html = html_path.read_text(errors='ignore')
    matches = re.findall(r'(?:https?:)?//[^"\s]+/files/(?:large|thumb)/[^"\s)]+?\.webp\?[^"\s)]+|(?:\.\./|\./)?files/(?:large|thumb)/[^"\s)]+?\.webp\?[^"\s)]+', html)
    urls = []
    for raw in matches:
        raw = raw.replace('&quot;', '').rstrip('"\'')
        url = raw if raw.startswith('http') else urljoin(base_url, raw)
        if url not in urls:
            urls.append(url)
    # Keep the first three currently exposed pages for a bounded pilot.
    urls = urls[:3]
    images = []
    for index, url in enumerate(urls, start=1):
        target = ROOT / f'{kind}-{index:02d}.webp'
        response = requests.get(url, timeout=30, headers={'User-Agent': 'OkulBlog pilot importer/1.0'})
        response.raise_for_status()
        target.write_bytes(response.content)
        with Image.open(target) as image:
            converted = target.with_suffix('.png')
            image.convert('RGB').save(converted)
            images.append(converted)
    if images:
        pdf_path = ROOT / f'{kind}-pilot.pdf'
        opened = [Image.open(path).convert('RGB') for path in images]
        opened[0].save(pdf_path, save_all=True, append_images=opened[1:])
        for image in opened:
            image.close()
        print(f'{kind}: {len(images)} sayfa -> {pdf_path}')
    else:
        print(f'{kind}: erişilebilir sayfa görseli bulunamadı')
