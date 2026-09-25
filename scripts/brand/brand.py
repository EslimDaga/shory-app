from glyphs import text_path, glyph_paths
INK='#0A0A09'; CREAM='#F4F1EA'; LIME='#CCFF00'; WHITE='#FFFFFF'
PROGRESS=0.42

def wordmark(fg, track, knob, fill=LIME, tracking=-0.035, weight='brico800', bar_h=11, gap=30, knob_r=10.5, pad=24, thin_track=False, split=False):
    d,w,b = text_path(weight,'shory',100,tracking, baseline=0)
    left=b[0][0]; right=b[-1][2]; top=min(x[1] for x in b); desc=max(x[3] for x in b)
    bar_y = gap  # below baseline
    L=right-left; fx = left + L*PROGRESS
    kr = knob_r if knob_r is not None else bar_h*0.95
    vb = (left-pad, top-pad, L+2*pad, (bar_y+bar_h/2+kr)-top+2*pad)
    if split:
        letters = ''.join(f'<path class="l" style="--i:{i}" d="{g}"/>' for i,g in enumerate(glyph_paths(weight,'shory',100,tracking)))
        glyphs = f'<g fill="{fg}">{letters}</g>'
    else:
        glyphs = f'<path d="{d}" fill="{fg}"/>'
    th = 3 if thin_track else bar_h
    track_el = f'<rect class="track" x="{left:.2f}" y="{bar_y+(bar_h-th)/2:.2f}" width="{L:.2f}" height="{th}" rx="{th/2}" fill="{track}"/>'
    body = f'''{glyphs}
{track_el}
<rect class="fill" x="{left:.2f}" y="{bar_y}" width="{fx-left:.2f}" height="{bar_h}" rx="{bar_h/2}" fill="{fill}"/>
<circle class="knob" cx="{fx:.2f}" cy="{bar_y+bar_h/2}" r="{kr:.2f}" fill="{knob}"/>'''
    return vb, body

import re as _re
def _round(m):
    v = round(float(m.group(0)), 2)
    return ('%g' % v) if v != int(v) else str(int(v))
def tidy(body):
    return _re.sub(r'-?\d+\.\d{3,}', _round, body)

def svg(vb, body, bg=None, title='Shory'):
    body = tidy(body)
    x,y,w,h = vb
    bgr = f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.2f} {y:.2f} {w:.2f} {h:.2f}" role="img" aria-label="{title}"><title>{title}</title>{bgr}{body}</svg>'

def monogram(size, bg, fg, track, fill, knob, radius_ratio=0.2237, bleed=False, s_ratio=0.40, bar_ratio=0.46, bar_h_ratio=0.062, gap_ratio=0.105, k=1.0):
    s_ratio*=k; bar_ratio*=k; bar_h_ratio*=k; gap_ratio*=k
    # 's' centered, progress bar beneath
    d,w,b = text_path('brico800','s',100,0, baseline=0)
    sx0,sy0,sx1,sy1 = b[0]; sw=sx1-sx0; sh=sy1-sy0
    scale = size*s_ratio/sw
    bar_h = size*bar_h_ratio; bar_w = size*bar_ratio; gap = size*gap_ratio
    total_h = sh*scale + gap + bar_h
    oy = (size-total_h)/2 - sy0*scale
    ox = size/2 - (sx0+sw/2)*scale
    bx = (size-bar_w)/2; by = (size-total_h)/2 + sh*scale + gap
    fx = bx + bar_w*PROGRESS; kr = bar_h*0.95
    r = 0 if bleed else size*radius_ratio
    bg_el = f'<rect width="{size}" height="{size}" rx="{r:.2f}" fill="{bg}"/>' if bg else ''
    body = f'''{bg_el}
<path d="{d}" transform="translate({ox:.2f} {oy:.2f}) scale({scale:.4f})" fill="{fg}"/>
<rect x="{bx:.2f}" y="{by:.2f}" width="{bar_w:.2f}" height="{bar_h:.2f}" rx="{bar_h/2:.2f}" fill="{track}"/>
<rect x="{bx:.2f}" y="{by:.2f}" width="{fx-bx:.2f}" height="{bar_h:.2f}" rx="{bar_h/2:.2f}" fill="{fill}"/>
<circle cx="{fx:.2f}" cy="{by+bar_h/2:.2f}" r="{kr:.2f}" fill="{knob}"/>'''
    return (0,0,size,size), body
