import sys, json, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NM = os.path.join(ROOT, 'node_modules', '@expo-google-fonts')
FONTS = {
 'brico800': os.path.join(NM, 'bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
 'brico700': os.path.join(NM, 'bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
 'brico600': os.path.join(NM, 'bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.ttf'),
 'serifIt': os.path.join(NM, 'instrument-serif/400Regular_Italic/InstrumentSerif_400Regular_Italic.ttf'),
}
def glyph_paths(font_key, text, size=100, tracking=0.0, x0=0, baseline=0):
    f = TTFont(FONTS[font_key]); gs = f.getGlyphSet(); cmap = f.getBestCmap()
    upm = f['head'].unitsPerEm; s = size/upm; x = 0; out=[]
    for ch in text:
        g = cmap[ord(ch)]; pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (s,0,0,-s,x0+x*s,baseline)))
        out.append(pen.getCommands()); x += gs[g].width + tracking*upm
    return out

def text_path(font_key, text, size=100, tracking=0.0, x0=0, baseline=0):
    f = TTFont(FONTS[font_key]); gs = f.getGlyphSet(); cmap = f.getBestCmap()
    upm = f['head'].unitsPerEm; s = size/upm
    pen = SVGPathPen(gs); x = 0; boxes=[]
    for ch in text:
        g = cmap[ord(ch)]
        tp = TransformPen(pen, (s,0,0,-s,x0+x*s,baseline))
        gs[g].draw(tp)
        bp = BoundsPen(gs); gs[g].draw(bp)
        b = bp.bounds
        if b: boxes.append((x0+(x+b[0])*s, baseline-b[3]*s, x0+(x+b[2])*s, baseline-b[1]*s))
        x += gs[g].width + tracking*upm
    return pen.getCommands(), x*s, boxes
