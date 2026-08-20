from pathlib import Path
import re

html = Path('/home/ubuntu/upload/fliphtml5.com_bookcase_oqtwv__1787228312915.html').read_text(errors='ignore')
# The bookcase embeds escaped JSON-like records with title, url, pages and bLink.
pattern = re.compile(r'"id":(?P<id>\d+),"title":"(?P<title>.*?)".*?"url":"https:\\/\\/online\.fliphtml5\.com\\/hpboy\\/(?P<link>[A-Za-z0-9_]+)\\/".*?"pages":(?P<pages>\d+)', re.S)
seen = set()
for m in pattern.finditer(html):
    title = m.group('title').replace('\\"', '"')
    if 'KIŞ TATİL' in title.upper() and m.group('link') not in seen:
        seen.add(m.group('link'))
        print(f"{title}\t{m.group('link')}\tpages={m.group('pages')}\tid={m.group('id')}")
