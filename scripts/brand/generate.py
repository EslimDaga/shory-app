"""Regenerates the Shory logo SVGs (assets/brand) and app icon PNGs (assets).

Requirements: `pip install fonttools pillow`, `npm i -g playwright` (Chromium),
and `npm install` so the Bricolage Grotesque font files exist in node_modules.

    python3 scripts/brand/generate.py
"""
import json, os, subprocess, tempfile
from PIL import Image
from brand import CREAM, INK, LIME, PROGRESS, WHITE, monogram, svg, tidy, wordmark
from glyphs import ROOT, glyph_paths, text_path

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


LOGO_TS = os.path.join(ROOT, 'src', 'components', 'splash', 'logoGlyphs.ts')


def write_logo_glyphs(tracking=-0.035, bar_h=11, gap=30, knob_r=10.5, pad=24):
    """Per-letter wordmark outlines plus bar geometry, so the splash can animate each piece."""
    _, _, boxes = text_path('brico800', 'shory', 100, tracking)
    left = boxes[0][0]; right = boxes[-1][2]; top = min(b[1] for b in boxes)
    length = right - left
    view_box = [left - pad, top - pad, length + 2 * pad, (gap + bar_h / 2 + knob_r) - top + 2 * pad]
    letters = [tidy(g) for g in glyph_paths('brico800', 'shory', 100, tracking)]
    r = lambda v: round(v, 2)
    lines = [
        'export const LOGO_VIEW_BOX = ' + json.dumps([r(v) for v in view_box]) + ' as const;',
        '',
        'export const LOGO_LETTERS = ' + json.dumps(letters, indent=2) + ' as const;',
        '',
        'export const LOGO_BAR = ' + json.dumps({
            'x': r(left), 'y': gap, 'width': r(length), 'height': bar_h,
            'knobRadius': knob_r, 'progress': PROGRESS,
        }, indent=2) + ' as const;',
    ]
    os.makedirs(os.path.dirname(LOGO_TS), exist_ok=True)
    with open(LOGO_TS, 'w') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    os.makedirs(BRAND, exist_ok=True)
    write_logo_glyphs()
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
    print(f'Wrote {len(LOGOS)} SVGs to assets/brand, the splash glyphs and {len(ICONS)} PNGs to assets')


if __name__ == '__main__':
    main()
