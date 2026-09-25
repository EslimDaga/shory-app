"""Regenerates the Shory logo SVGs (assets/brand) and app icon PNGs (assets).

Requirements: `pip install fonttools pillow`, `npm i -g playwright` (Chromium),
and `npm install` so the Bricolage Grotesque font files exist in node_modules.

    python3 scripts/brand/generate.py
"""
import json, os, subprocess, tempfile
from PIL import Image
from brand import CREAM, INK, LIME, WHITE, monogram, svg, tidy, wordmark
from glyphs import ROOT

ASSETS = os.path.join(ROOT, 'assets')
BRAND = os.path.join(ASSETS, 'brand')
ICON_TRACK = 'rgba(10,10,9,0.14)'

LOGOS = {
    'shory-logo.svg': wordmark(CREAM, 'rgba(244,241,234,0.16)', LIME),  # primary, dark backgrounds
    'shory-logo-on-white.svg': wordmark(INK, 'rgba(10,10,9,0.1)', INK),
    'shory-logo-knockout.svg': wordmark(WHITE, WHITE, WHITE, fill=WHITE, thin_track=True),
    'shory-logo-mono.svg': wordmark(INK, INK, INK, fill=INK, thin_track=True),
    'shory-icon.svg': monogram(1024, LIME, INK, ICON_TRACK, INK, INK, bleed=True),
    'shory-social.svg': monogram(1080, LIME, INK, 'rgba(10,10,9,0.2)', INK, INK, bleed=True,
                                 s_ratio=0.36, bar_ratio=0.40, bar_h_ratio=0.068, gap_ratio=0.095),
}

# name: (pixels, svg, opaque). iOS rejects app icons with an alpha channel, so icon.png is flattened.
# Android foreground/monochrome shrink by 0.68 to stay inside the 66dp adaptive-icon safe zone.
ICONS = {
    'icon.png': (1024, monogram(1024, LIME, INK, ICON_TRACK, INK, INK, bleed=True), True),
    'icon-dark.png': (1024, monogram(1024, None, LIME, 'rgba(204,255,0,0.28)', LIME, LIME, bleed=True), False),
    'icon-tinted.png': (1024, monogram(1024, None, WHITE, 'rgba(255,255,255,0.35)', WHITE, WHITE, bleed=True), False),
    'android-icon-foreground.png': (1024, monogram(1024, None, INK, ICON_TRACK, INK, INK, bleed=True, k=0.68), False),
    'android-icon-monochrome.png': (1024, monogram(1024, None, WHITE, 'rgba(255,255,255,0.35)', WHITE, WHITE, bleed=True, k=0.68), False),
    'favicon.png': (48, monogram(1024, LIME, INK, 'rgba(10,10,9,0.2)', INK, INK, radius_ratio=0.22,
                                  s_ratio=0.46, bar_ratio=0.5, bar_h_ratio=0.085, gap_ratio=0.09), False),
}

RENDER_JS = """
const { chromium } = require('playwright');
const jobs = JSON.parse(require('fs').readFileSync(process.argv.at(-1), 'utf8'));
(async () => {
  const browser = await chromium.launch();
  for (const [html, out, px] of jobs) {
    const page = await browser.newPage({ viewport: { width: px, height: px } });
    await page.setContent(html);
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: px, height: px } });
    await page.close();
  }
  await browser.close();
})();
"""


def main():
    os.makedirs(BRAND, exist_ok=True)
    for name, (vb, body) in LOGOS.items():
        with open(os.path.join(BRAND, name), 'w') as f:
            f.write(svg(vb, body) + '\n')

    tmp = tempfile.mkdtemp()
    jobs = []
    for name, (px, (vb, body), _) in ICONS.items():
        x, y, w, h = vb
        html = (f'<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" '
                f'viewBox="{x} {y} {w} {h}" style="display:block">{tidy(body)}</svg></body>')
        jobs.append([html, os.path.join(tmp, name), px])
    npm_root = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()
    jobs_file = os.path.join(tmp, 'jobs.json')
    with open(jobs_file, 'w') as f:
        json.dump(jobs, f)
    subprocess.run(['node', '-e', RENDER_JS, jobs_file], check=True, env={**os.environ, 'NODE_PATH': npm_root})

    for name, (px, _, opaque) in ICONS.items():
        image = Image.open(os.path.join(tmp, name))
        image = image.convert('RGB' if opaque else 'RGBA')
        image.save(os.path.join(ASSETS, name), optimize=True)
    print(f'Wrote {len(LOGOS)} SVGs to assets/brand and {len(ICONS)} PNGs to assets')


if __name__ == '__main__':
    main()
