# Builds single-file previews (everything inlined): python3 tests/bundle.py <outdir>
import base64, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]
def data(path, mime):
    with open(path, 'rb') as f: return 'data:%s;base64,%s' % (mime, base64.b64encode(f.read()).decode())
MIME = {'.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg'}
css = open(os.path.join(ROOT, 'assets/style.css'), encoding='utf-8').read()
css = re.sub(r'url\((fonts|img)/([^)]+)\)', lambda m: 'url("%s")' % data(os.path.join(ROOT, 'assets', m.group(1), m.group(2)), MIME[os.path.splitext(m.group(2))[1]]), css)
js = open(os.path.join(ROOT, 'assets/site.js'), encoding='utf-8').read()
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
html = re.sub(r'<link rel="preload"[^>]+>\n', '', html)
html = html.replace('<link rel="stylesheet" href="assets/style.css">', '<style>' + css + '</style>')
html = html.replace('<script src="assets/site.js" defer></script>', '<script>' + js + '</script>')
html = re.sub(r'(href|src)="(assets/img/[^"]+)"', lambda m: '%s="%s"' % (m.group(1), data(os.path.join(ROOT, m.group(2)), MIME[os.path.splitext(m.group(2))[1]])), html)
open(os.path.join(OUT, 'saudi-brothers-preview.html'), 'w', encoding='utf-8').write(html)
dark = html.replace('<html lang="ar" dir="rtl" data-theme="light">', '<html lang="ar" dir="rtl" data-theme="dark">').replace('t=q.get("theme")||localStorage.getItem("sb-theme")', 't=q.get("theme")||"dark"')
open(os.path.join(OUT, 'saudi-brothers-preview-dark.html'), 'w', encoding='utf-8').write(dark)
print(len(html) // 1024, 'KB each')
