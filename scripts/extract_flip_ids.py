from bs4 import BeautifulSoup
from pathlib import Path
import re

html_path = Path('/home/ubuntu/upload/fliphtml5.com_bookcase_oqtwv__1787228312915.html')
soup = BeautifulSoup(html_path.read_text(errors='ignore'), 'html.parser')
text = soup.get_text(' ', strip=True)
patterns = [
    '1. SINIF KIŞ TATİL FASİKÜLLERİM 1. BÖLÜM CEVAPLAR',
    '1. SINIF KIŞ TATİL FASİKÜLLERİM 2. BÖLÜM CEVAPLAR',
    '1. SINIF KIŞ TATİL FASİKÜLLERİM 1. BÖLÜM',
    '1. SINIF KIŞ TATİL FASİKÜLLERİM 2. BÖLÜM',
]
urls = re.findall(r'https://online\.fliphtml5\.com/[A-Za-z0-9_]+/[A-Za-z0-9_]+/files/shot\.jpg\?1', html_path.read_text(errors='ignore'))
urls = list(dict.fromkeys(urls))
print('unique shot urls:', len(urls))
for p in patterns:
    pos = text.find(p)
    print('\nTITLE:', p, 'text_position:', pos)
    if pos >= 0:
        print(text[max(0, pos-160):pos+len(p)+160])
print('\nFIRST URLS:')
for u in urls[:45]:
    print(u)
