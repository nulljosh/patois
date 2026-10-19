"""Patois Sans: an original monoline sans drawn from skeleton strokes.
Every glyph is a few centre lines; skia-pathops thickens them with round caps and joins,
so the weight, the roundness and the spacing come from three numbers below.
Run: uv run --with fonttools --with skia-pathops --with pillow python build.py
"""
import math
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.t2CharStringPen import T2CharStringPen
from pathops import Path, LineCap, LineJoin

STROKE = 84      # line weight
SIDE = 80        # space either side of a glyph (proportional: advance follows the drawing)
UPM, ASC, DESC = 1000, 800, -240

def arc(cx, cy, rx, ry, a0, a1, n=28):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]

def spline(pts, n=10):
    """Catmull-Rom through pts."""
    p = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        for t in [k / n for k in range(n)]:
            def c(a, b, c_, d):
                return 0.5 * ((2 * b) + (-a + c_) * t + (2 * a - 5 * b + 4 * c_ - d) * t * t + (-a + 3 * b - 3 * c_ + d) * t ** 3)
            out.append((c(p[i-1][0], p[i][0], p[i+1][0], p[i+2][0]), c(p[i-1][1], p[i][1], p[i+1][1], p[i+2][1])))
    out.append(pts[-1])
    return out

def ell(cx, cy, rx, ry): return arc(cx, cy, rx, ry, 0, 360, 48)
def dot(x, y): return [(x, y), (x + 0.1, y)]
def join(*parts):
    out = []
    for p in parts: out += p
    return out

XH, CAP, ASCN = 460, 660, 660     # skeleton heights (the stroke adds half a weight on each side)
BOWL = lambda cx=190: ell(cx, 250, 190, 210)
S_LOW = spline([(340, 400), (270, 452), (180, 460), (90, 430), (60, 370), (100, 310), (190, 270), (290, 230), (330, 170), (290, 100), (200, 46), (100, 46), (30, 100)])
S_CAP = spline([(380, 560), (320, 640), (200, 664), (90, 630), (50, 540), (100, 450), (200, 400), (310, 350), (360, 260), (320, 120), (210, 40), (100, 40), (20, 110)])

G = {
 'a': [BOWL(), [(380, 40), (380, XH)]],
 'b': [[(0, 40), (0, ASCN)], BOWL()],
 'c': [arc(210, 250, 200, 210, 42, 318)],
 'd': [BOWL(), [(380, 40), (380, ASCN)]],
 'e': [join(arc(190, 250, 190, 210, 0, 322)), [(0, 250), (380, 250)]],
 'f': [join([(110, 40), (110, 540)], arc(210, 540, 100, 120, 180, 60)), [(0, XH), (240, XH)]],
 'g': [BOWL(), join([(380, XH), (380, -20)], arc(230, -20, 150, 150, 0, -150))],
 'h': [[(0, 40), (0, ASCN)], join(arc(190, 310, 190, 150, 180, 0), [(380, 40)])],
 'i': [[(0, 40), (0, XH)], dot(0, 640)],
 'j': [join([(110, XH), (110, -20)], arc(-40, -20, 150, 150, 0, -160)), dot(110, 640)],
 'k': [[(0, 40), (0, ASCN)], [(0, 190), (310, XH)], [(110, 330), (320, 40)]],
 'l': [[(0, 40), (0, ASCN)]],
 'm': [[(0, 40), (0, XH)], join(arc(150, 310, 150, 150, 180, 0), [(300, 40)]), join(arc(450, 310, 150, 150, 180, 0), [(600, 40)])],
 'n': [[(0, 40), (0, XH)], join(arc(190, 310, 190, 150, 180, 0), [(380, 40)])],
 'o': [BOWL()],
 'p': [[(0, XH), (0, -160)], BOWL()],
 'q': [BOWL(), [(380, XH), (380, -160)]],
 'r': [[(0, 40), (0, XH)], arc(190, 310, 190, 150, 180, 60)],
 's': [S_LOW],
 't': [join([(110, 600), (110, 140)], arc(210, 140, 100, 100, 180, 270)), [(0, XH), (250, XH)]],
 'u': [join([(0, XH), (0, 190)], arc(190, 190, 190, 150, 180, 360)), [(380, 40), (380, XH)]],
 'v': [[(0, XH), (190, 40), (380, XH)]],
 'w': [[(0, XH), (130, 40), (260, XH), (390, 40), (520, XH)]],
 'x': [[(0, XH), (360, 40)], [(0, 40), (360, XH)]],
 'y': [[(0, XH), (190, 40)], [(380, XH), (110, -160)]],
 'z': [[(0, XH), (340, XH), (0, 40), (340, 40)]],
 'A': [[(0, 40), (200, CAP), (400, 40)], [(80, 250), (320, 250)]],
 'B': [[(0, 40), (0, CAP)], join([(0, CAP), (160, CAP)], arc(160, 505, 160, 155, 90, -90), [(0, 350)]),
       join([(0, 350), (170, 350)], arc(170, 195, 190, 155, 90, -90), [(0, 40)])],
 'C': [arc(240, 350, 230, 310, 42, 318)],
 'D': [join([(0, 40), (0, CAP), (150, CAP)], arc(150, 350, 250, 310, 90, -90), [(0, 40)])],
 'E': [[(340, CAP), (0, CAP), (0, 40), (340, 40)], [(0, 350), (290, 350)]],
 'F': [[(340, CAP), (0, CAP), (0, 40)], [(0, 350), (280, 350)]],
 'G': [join(arc(240, 350, 230, 310, 42, 360), [(250, 350)])],
 'H': [[(0, 40), (0, CAP)], [(400, 40), (400, CAP)], [(0, 350), (400, 350)]],
 'I': [[(0, 40), (0, CAP)]],
 'J': [join([(300, CAP), (300, 200)], arc(150, 200, 150, 160, 0, -180))],
 'K': [[(0, 40), (0, CAP)], [(340, CAP), (0, 250)], [(110, 350), (350, 40)]],
 'L': [[(0, CAP), (0, 40), (310, 40)]],
 'M': [[(0, 40), (0, CAP), (270, 160), (540, CAP), (540, 40)]],
 'N': [[(0, 40), (0, CAP), (400, 40), (400, CAP)]],
 'O': [ell(250, 350, 250, 310)],
 'P': [[(0, 40), (0, CAP)], join([(0, CAP), (150, CAP)], arc(150, 490, 170, 170, 90, -90), [(0, 320)])],
 'Q': [ell(250, 350, 250, 310), [(300, 170), (460, 0)]],
 'R': [[(0, 40), (0, CAP)], join([(0, CAP), (150, CAP)], arc(150, 490, 170, 170, 90, -90), [(0, 320)]), [(170, 320), (370, 40)]],
 'S': [S_CAP],
 'T': [[(0, CAP), (420, CAP)], [(210, CAP), (210, 40)]],
 'U': [join([(0, CAP), (0, 230)], arc(190, 230, 190, 190, 180, 360), [(380, CAP)])],
 'V': [[(0, CAP), (210, 40), (420, CAP)]],
 'W': [[(0, CAP), (150, 40), (300, CAP), (450, 40), (600, CAP)]],
 'X': [[(0, CAP), (400, 40)], [(0, 40), (400, CAP)]],
 'Y': [[(0, CAP), (200, 340), (400, CAP)], [(200, 340), (200, 40)]],
 'Z': [[(0, CAP), (380, CAP), (0, 40), (380, 40)]],
 '0': [ell(190, 350, 190, 310)],
 '1': [[(0, 540), (130, CAP), (130, 40)]],
 '2': [spline([(10, 520), (70, 620), (180, 662), (290, 620), (330, 520), (270, 410), (0, 40), (350, 40)])],
 '3': [join(arc(170, 505, 150, 155, 160, -90), arc(170, 195, 175, 155, 90, -160))],
 '4': [[(270, 40), (270, CAP), (0, 200), (380, 200)]],
 '5': [join([(330, CAP), (40, CAP), (20, 380)], arc(170, 230, 170, 190, 112, -150))],
 '6': [ell(190, 230, 190, 190), spline([(340, 620), (250, 662), (150, 640), (60, 540), (20, 380), (20, 230)])],
 '7': [[(0, CAP), (360, CAP), (120, 40)]],
 '8': [ell(180, 505, 150, 155), ell(180, 195, 175, 155)],
 '9': [ell(190, 470, 190, 190), spline([(360, 470), (360, 350), (330, 200), (250, 80), (150, 40), (40, 80)])],
 '.': [dot(0, 40)], ',': [[(0, 40), (-40, -110)]], ':': [dot(0, 40), dot(0, XH)], ';': [[(0, 40), (-40, -110)], dot(0, XH)],
 '!': [[(0, 170), (0, CAP)], dot(0, 40)], '?': [join(spline([(10, 540), (60, 630), (160, 662), (260, 620), (290, 530), (230, 430), (150, 360), (150, 260)]), []), dot(150, 40)],
 '-': [[(0, 300), (240, 300)]], '’': [[(0, CAP), (-30, 520)]], "'": [[(0, CAP), (-30, 520)]],
 '"': [[(0, CAP), (-20, 540)], [(120, CAP), (100, 540)]], '(': [arc(240, 300, 200, 420, 130, 230)], ')': [arc(-40, 300, 200, 420, 50, -50)],
 '/': [[(0, -80), (260, CAP + 60)]], '+': [[(0, 300), (300, 300)], [(150, 150), (150, 450)]], '&': [spline([(380, 40), (120, 330), (90, 450), (170, 560), (260, 520), (270, 440), (80, 250), (60, 130), (150, 40), (260, 80), (380, 260)])],
}

def outline(strokes):
    p = Path()
    for pts in strokes:
        p.moveTo(*pts[0])
        for q in pts[1:]: p.lineTo(*q)
    p.stroke(STROKE, LineCap.ROUND_CAP, LineJoin.ROUND_JOIN, 4)
    p.convertConicsToQuads()
    p.simplify(fix_winding=True)
    return p

glyphs, adv = {'.notdef': None, 'space': None}, {'.notdef': 500, 'space': 280}
for ch, strokes in G.items():
    p = outline(strokes)
    x0, _, x1, _ = p.bounds
    p.transform(1, 0, 0, 1, SIDE - x0, 0)
    name = {'.': 'period', ',': 'comma', ':': 'colon', ';': 'semicolon', '!': 'exclam', '?': 'question', '-': 'hyphen',
            "'": 'quotesingle', '"': 'quotedbl', '(': 'parenleft', ')': 'parenright', '/': 'slash', '+': 'plus', '&': 'ampersand',
            '’': 'quoteright', '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
            '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'}.get(ch, ch)
    w = round(x1 - x0 + 2 * SIDE)
    pen = T2CharStringPen(w, None)
    p.draw(pen)
    glyphs[name], adv[name] = pen.getCharString(), w

empty = T2CharStringPen(500, None).getCharString()
glyphs['.notdef'] = empty
glyphs['space'] = T2CharStringPen(280, None).getCharString()
order = list(glyphs)
cmap = {0x20: 'space'}
for ch in G:
    nm = [n for n in adv if n == ch or n == {'.': 'period', ',': 'comma', ':': 'colon', ';': 'semicolon', '!': 'exclam', '?': 'question', '-': 'hyphen', "'": 'quotesingle', '"': 'quotedbl', '(': 'parenleft', ')': 'parenright', '/': 'slash', '+': 'plus', '&': 'ampersand', '’': 'quoteright', '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'}.get(ch, ch)][0]
    cmap[ord(ch)] = nm

fb = FontBuilder(UPM, isTTF=False)
fb.setupGlyphOrder(order)
fb.setupCharacterMap(cmap)
fb.setupCFF('PatoisSans-Regular', {'FullName': 'Patois Sans Regular', 'FamilyName': 'Patois Sans'}, glyphs, {})
fb.setupHorizontalMetrics({n: (adv[n], 0) for n in order})
fb.setupHorizontalHeader(ascent=ASC, descent=DESC)
fb.setupNameTable({'familyName': 'Patois Sans', 'styleName': 'Regular', 'copyright': 'Copyright 2026 Joshua Trommel. SIL OFL 1.1.', 'licenseDescription': 'SIL Open Font License 1.1'})
fb.setupOS2(sTypoAscender=ASC, sTypoDescender=DESC, usWinAscent=ASC, usWinDescent=-DESC, sxHeight=500, sCapHeight=700)
fb.setupPost()
fb.font.save('PatoisSans-Regular.otf')
print('wrote', len(G), 'glyphs')
