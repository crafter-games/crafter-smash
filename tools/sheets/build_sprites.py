import numpy as np, json, os
from PIL import Image
from scipy import ndimage

OUT_IMG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'sprites')
OUT_JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'spritedata.js')
os.makedirs(OUT_IMG, exist_ok=True)

def hx(c): return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))

# ---------------- Animaciones ----------------
# f: frames (índices de la hoja), hit: índice (dentro de f) del frame de impacto, loop: frames por imagen, flip: espejo
BASE_ANIMS = {
 'scott': {
  'idle': {'f': [0, 1, 2, 3, 4, 5, 6, 7], 'loop': 6}, 'walk': {'f': [66, 67, 68, 69, 70, 71], 'loop': 6},
  'run': {'f': [28, 29, 30, 31, 32, 33, 34, 35], 'loop': 4}, 'crouch': {'f': [126]}, 'jumpsquat': {'f': [86, 87]}, 'land': {'f': [88, 99]},
  'rise': {'f': [89, 90, 91, 92]}, 'apex': {'f': [93, 94, 95]}, 'fall': {'f': [96, 97, 98]}, 'djump': {'f': [122, 123, 124, 125]},
  'helpless': {'f': [97, 98], 'loop': 8}, 'guard': {'f': [128, 129, 130], 'loop': 8}, 'roll': {'f': [134, 135, 136, 137]},
  'dodge': {'f': [135, 136, 137]}, 'hurt': {'f': [193, 194, 195]}, 'tumble': {'f': [215, 216, 217, 218], 'loop': 4},
  'down': {'f': [227]}, 'getup': {'f': [245, 246, 247, 248]}, 'ledge': {'f': [8, 9], 'loop': 10}, 'dizzy': {'f': [261, 262, 263, 264], 'loop': 8},
  'grabbed': {'f': [199, 200], 'loop': 6}, 'grab': {'f': [336, 337], 'hit': 1}, 'grabhold': {'f': [338]}, 'pummel': {'f': [343, 344], 'hit': 1},
  'throw_f': {'f': [473, 474, 475], 'hit': 1}, 'throw_b': {'f': [473, 474, 475], 'hit': 1}, 'throw_u': {'f': [395, 396, 397], 'hit': 1}, 'throw_d': {'f': [390, 391, 392], 'hit': 1},
  'jab': {'f': [336, 337, 338], 'hit': 1}, 'jab2': {'f': [343, 344, 345], 'hit': 1}, 'ftilt': {'f': [352, 353, 355, 356, 358], 'hit': 2},
  'utilt': {'f': [389, 395, 396, 397], 'hit': 1}, 'dtilt': {'f': [360, 361, 362, 364], 'hit': 1}, 'dashattack': {'f': [368, 369, 370, 371], 'hit': 1},
  'fsmash': {'f': [537, 538, 540, 541, 542, 543], 'hit': 3}, 'usmash': {'f': [392, 393, 394, 396], 'hit': 1}, 'dsmash': {'f': [547, 548, 552, 549, 550], 'hit': 2},
  'nair': {'f': [410, 411, 412, 413], 'hit': 2}, 'fair': {'f': [383, 384, 385, 386], 'hit': 2}, 'bair': {'f': [405, 406, 407, 408], 'hit': 2, 'flip': True},
  'uair': {'f': [389, 395, 396, 397], 'hit': 1}, 'dair': {'f': [449, 450, 451, 452], 'hit': 1},
  'nspecial': {'f': [459, 462, 464, 468], 'hit': 2}, 'sspecial': {'f': [368, 369, 370, 371], 'hit': 1},
  'uspecial': {'f': [441, 529, 530, 531, 532, 533], 'hit': 1}, 'dspecial': {'f': [127, 128], 'hit': 0},
  'final': {'f': [520, 521, 522, 523, 524, 525, 526, 527], 'hit': 4}, 'finalcombo': {'f': [538, 540, 541, 542], 'loop': 3}, 'finalend': {'f': [529, 530, 531]},
  'getupattack': {'f': [386, 387, 388], 'hit': 1}, 'ledgeattack': {'f': [361, 362, 363], 'hit': 1},
 },
 'stephen': {
  'idle': {'f': [0, 1, 2, 3, 4, 5], 'loop': 7}, 'walk': {'f': [46, 47, 48, 49, 50, 51], 'loop': 7},
  'run': {'f': [22, 23, 24, 25, 26, 27, 28, 29], 'loop': 4}, 'crouch': {'f': [101]}, 'jumpsquat': {'f': [64]}, 'land': {'f': [81]},
  'rise': {'f': [65, 66, 67]}, 'apex': {'f': [72, 73]}, 'fall': {'f': [74, 75]}, 'djump': {'f': [76, 77, 78, 79, 80]},
  'helpless': {'f': [74, 75], 'loop': 8}, 'guard': {'f': [98, 99, 100], 'loop': 8}, 'roll': {'f': [107, 108, 109, 110]},
  'dodge': {'f': [107, 108, 109]}, 'hurt': {'f': [174, 175, 176]}, 'tumble': {'f': [170, 171, 172, 173], 'loop': 4},
  'down': {'f': [168]}, 'getup': {'f': [204, 205, 206, 207, 208]}, 'ledge': {'f': [89, 90], 'loop': 10}, 'dizzy': {'f': [183, 184, 185, 186], 'loop': 8},
  'grabbed': {'f': [192, 193], 'loop': 6}, 'grab': {'f': [374, 375], 'hit': 1}, 'grabhold': {'f': [376, 377], 'loop': 8}, 'pummel': {'f': [378, 376], 'hit': 0},
  'throw_f': {'f': [379, 380, 381], 'hit': 1}, 'throw_b': {'f': [386, 387, 388], 'hit': 1}, 'throw_u': {'f': [444, 445, 446], 'hit': 1}, 'throw_d': {'f': [392, 393], 'hit': 1},
  'jab': {'f': [297, 298, 299, 300], 'hit': 1}, 'ftilt': {'f': [301, 303, 304], 'hit': 1}, 'utilt': {'f': [308, 309, 310], 'hit': 1},
  'dtilt': {'f': [329, 331, 332, 333], 'hit': 1}, 'dashattack': {'f': [337, 338, 339, 340], 'hit': 1},
  'fsmash': {'f': [316, 317, 318, 319, 320, 321], 'hit': 2}, 'usmash': {'f': [346, 347, 348, 349], 'hit': 1}, 'dsmash': {'f': [352, 353, 354, 355], 'hit': 2},
  'nair': {'f': [343, 344, 345], 'hit': 1}, 'fair': {'f': [336, 337, 338], 'hit': 1}, 'bair': {'f': [352, 354, 355], 'hit': 1, 'flip': True},
  'uair': {'f': [346, 347, 348], 'hit': 1}, 'dair': {'f': [399, 400, 401, 402], 'hit': 1},
  'nspecial': {'f': [449, 452, 454, 455], 'hit': 2}, 'sspecial': {'f': [235, 236, 237, 238], 'hit': 2},
  'uspecial': {'f': [395, 396, 397, 398], 'loop': 3}, 'dspecial': {'f': [98, 99], 'hit': 0}, 'counterHit': {'f': [449, 450, 452], 'hit': 1},
  'final': {'f': [236, 237], 'loop': 10}, 'finalflash': {'f': [450, 452]},
  'getupattack': {'f': [339, 340], 'hit': 0}, 'ledgeattack': {'f': [331, 332, 333], 'hit': 1},
 },
 'knives': {
  'idle': {'f': [0, 1, 2, 3], 'loop': 8}, 'walk': {'f': [13, 14, 15, 16, 17, 18, 19, 20], 'loop': 6},
  'run': {'f': [40, 41, 42, 43, 44, 45, 46, 47], 'loop': 4}, 'crouch': {'f': [100]}, 'jumpsquat': {'f': [64]}, 'land': {'f': [75]},
  'rise': {'f': [65, 66, 67]}, 'apex': {'f': [68, 69, 70, 71]}, 'fall': {'f': [72, 73, 74]}, 'djump': {'f': [116, 117, 118, 119, 120]},
  'helpless': {'f': [73, 74], 'loop': 8}, 'guard': {'f': [110, 111, 112], 'loop': 8}, 'roll': {'f': [103, 104, 105, 106, 107]},
  'dodge': {'f': [104, 105, 106]}, 'hurt': {'f': [190, 191, 192]}, 'tumble': {'f': [205, 206, 207, 208], 'loop': 4},
  'down': {'f': [213]}, 'getup': {'f': [218, 219, 220, 221]}, 'ledge': {'f': [8, 9], 'loop': 10}, 'dizzy': {'f': [193, 194, 195], 'loop': 8},
  'grabbed': {'f': [202, 203], 'loop': 6}, 'grab': {'f': [296, 297], 'hit': 1}, 'grabhold': {'f': [301]}, 'pummel': {'f': [302, 303], 'hit': 0},
  'throw_f': {'f': [305, 306, 307], 'hit': 1}, 'throw_b': {'f': [311, 312, 313], 'hit': 0}, 'throw_u': {'f': [344, 345, 346], 'hit': 1}, 'throw_d': {'f': [381, 382], 'hit': 1},
  'jab': {'f': [297, 298, 299], 'hit': 1}, 'jab2': {'f': [302, 303], 'hit': 0}, 'ftilt': {'f': [305, 306, 307], 'hit': 1},
  'utilt': {'f': [315, 316, 317], 'hit': 1}, 'dtilt': {'f': [381, 382, 383], 'hit': 1}, 'dashattack': {'f': [338, 339, 340, 341], 'hit': 1},
  'fsmash': {'f': [361, 362, 363, 364], 'hit': 1}, 'usmash': {'f': [367, 368, 369], 'hit': 2}, 'dsmash': {'f': [311, 312, 313], 'hit': 0},
  'nair': {'f': [348, 349, 350], 'hit': 1}, 'fair': {'f': [338, 339], 'hit': 1}, 'bair': {'f': [415, 416, 417], 'hit': 1, 'flip': True},
  'uair': {'f': [344, 345, 346], 'hit': 1}, 'dair': {'f': [330, 331, 332], 'hit': 1},
  'nspecial': {'f': [466, 467, 468], 'hit': 1}, 'sspecial': {'f': [468, 469, 470], 'hit': 0}, 'uspecial': {'f': [72, 73], 'loop': 6},
  'dspecial': {'f': [179, 180, 181, 182], 'hit': 2}, 'final': {'f': [287, 288, 289, 290, 291], 'loop': 6},
  'getupattack': {'f': [381, 382], 'hit': 0}, 'ledgeattack': {'f': [305, 306, 307], 'hit': 1},
 },
}


BASES = {
 'scott': {'sheet': 's70725.png', 'tag': 'scott', 'hair': ['#d08058', '#905848', '#f8e8d8'], 'skin': ['#f8d8b0', '#e09080'], 'white': '#f8f8f8'},
 'stephen': {'sheet': 's70729.png', 'tag': 'stephen', 'hair': ['#d06058', '#903028', '#601010'], 'skin': ['#f8c8b8', '#d88870', '#905848', '#f8e8d8'], 'white': '#f8f8f8'},
 'knives': {'sheet': 's252360.png', 'tag': 'knives', 'hair': ['#8c1931', '#ce425a', '#5a0819'], 'skin': ['#ffcebd', '#de8c73', '#945a4a'], 'white': '#ffffff'},
}
CHARS = {
 'railly': {'base': 'scott', 'edit': 'beard', 'over': {}},
 'anthony': {'base': 'stephen', 'edit': 'glasses', 'over': {'pushups': {'f': ['pu_down', 'pu_up']}}},
 'jibaru': {'base': 'scott', 'edit': 'shades', 'over': {
   'nspecial': {'f': [144, 145, 146], 'hit': 1}, 'sspecial': {'f': [144, 145, 146], 'hit': 1},
   'dspecial': {'f': [330, 331, 332, 333], 'loop': 5}, 'final': {'f': [332, 333, 334, 335], 'loop': 6}, 'finalcombo': None, 'finalend': None,
   'uspecial': {'f': [529, 530, 531, 532], 'loop': 3}}},
 'edward': {'base': 'stephen', 'edit': None, 'over': {
   'nspecial': {'f': [121, 122, 123], 'hit': 1}, 'sspecial': {'f': [235, 236, 237], 'hit': 1},
   'dspecial': {'f': [244, 245, 246, 247], 'loop': 5}, 'final': {'f': [248, 249, 250, 251], 'loop': 5}, 'counterHit': None, 'finalflash': None}},
 'shiara': {'base': 'knives', 'edit': 'darkglasses', 'over': {}},
}
def anims_for(cid):
    A = dict(BASE_ANIMS[CHARS[cid]['base']])
    for k, v in CHARS[cid]['over'].items():
        if v is None: A.pop(k, None)
        else: A[k] = v
    return A


# ---------------- Frames sintetizados (flexiones de Anthony) ----------------
def synth_pushup(im, F, bg, up):
    x, y, w, h = F['frames'][170]
    c = im[y:y + h, x:x + w].copy().astype(np.uint8)
    isbg = np.all(np.abs(c[:, :, :3].astype(int) - bg) <= 6, axis=2); c[isbg] = 0
    hair = np.zeros(c.shape[:2], bool)
    for col in ['#d06058', '#903028', '#601010']: hair |= np.all(c[:, :, :3] == hx(col), axis=2)
    ys, xs = np.nonzero(hair)
    hx1 = xs.max(); hx0 = xs.min()
    c[:, hx1 + 1:] = 0                      # quita el brazo estirado
    rgb = c[:, :, :3].astype(int)
    shirt = np.zeros(c.shape[:2], bool)
    for col in ['#582830', '#905060', '#785870', '#502830', '#482830', '#805868', '#f8c8b8', '#d88870']:
        shirt |= np.all(rgb == hx(col), axis=2)
    R = np.zeros_like(shirt); R[:, hx0 + 3:] = True
    keep_skin = ndimage.binary_dilation(hair, iterations=2)
    c[shirt & R & ~keep_skin] = 0
    # limpia contornos sueltos y recierra el borde
    blk = np.all(c[:, :, :3] == 0, axis=2) & (c[:, :, 3] > 0)
    solid = (c[:, :, 3] > 0) & ~blk
    near = ndimage.binary_dilation(solid, iterations=1)
    c[blk & ~near] = 0
    solid = (c[:, :, 3] > 0)
    ring = ndimage.binary_dilation(solid, iterations=1) & ~solid
    c[ring] = [0, 0, 0, 255]
    # recorta
    a = c[:, :, 3] > 0; ys, xs = np.nonzero(a)
    body = Image.fromarray(c[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    sx = hx0 - xs.min() + 2                 # hombro (justo detrás de la cabeza)
    bw, bh = body.size
    Hc, Wc = bh + 18, bw + 6
    can = Image.new('RGBA', (Wc, Hc), (0, 0, 0, 0))
    ang = 12 if up else 3
    rb = body.rotate(ang, resample=Image.NEAREST, expand=True, center=(0, bh))
    # pies en el suelo: alinea el pixel más bajo del cuerpo rotado con el suelo
    ra = np.array(rb)[:, :, 3] > 0
    low = np.nonzero(ra.any(axis=1))[0].max()
    ox = 1; oy = (Hc - 1) - low + (0 if up else 1)
    can.alpha_composite(rb, (ox, max(0, oy)))
    arr = np.array(can)
    shx = ox + sx + int((rb.size[0] - bw) * 0.6)
    colm = np.nonzero(arr[:, shx, 3] > 0)[0]
    shy = (colm.max() + 1) if len(colm) else Hc - 8
    if not up: shy = min(shy, Hc - 5)
    col = lambda hexc: list(hx(hexc)) + [255]
    OUT, SH, SH2, SK = col('#000000'), col('#905060'), col('#582830'), col('#f8c8b8')
    ground = Hc - 1
    if up:
        for yy in range(shy, ground + 1):
            for xx in range(shx - 3, shx + 3):
                edge = xx in (shx - 3, shx + 2)
                arr[yy, xx] = OUT if edge else (SK if yy > ground - 4 else (SH if xx < shx else SH2))
        for xx in range(shx - 4, shx + 5): arr[ground, xx] = OUT
        for xx in range(shx - 3, shx + 4): arr[ground - 1, xx] = SK if shx - 3 < xx < shx + 3 else OUT
    else:
        # brazo doblado: codo hacia atrás y mano en el suelo
        ey = max(shy - 2, 0)
        for yy in range(ey, ey + 5):
            for xx in range(shx - 9, shx - 1):
                arr[yy, xx] = OUT if yy in (ey, ey + 4) or xx == shx - 9 else SH
        for yy in range(ey, ground + 1):
            for xx in range(shx - 3, shx + 3):
                edge = xx in (shx - 3, shx + 2) or yy == ground
                arr[yy, xx] = OUT if edge else (SK if yy > ground - 3 else SH2)
    # vuelve a poner el fondo en el color del sheet para que el pipeline lo trate igual
    out = arr.astype(np.int32)
    t = out[:, :, 3] == 0
    out[t, :3] = bg; out[t, 3] = 255
    return out
SYNTH = {'pu_up': lambda im, F, bg: synth_pushup(im, F, bg, True), 'pu_down': lambda im, F, bg: synth_pushup(im, F, bg, False)}

# ---------------- Paletas ----------------
PAL = {
 'railly': {
  'base': {'#d08058': '#2c1d17', '#905848': '#150d0a', '#f8e8d8': '#5c4436', '#f8d8b0': '#c68a60', '#e09080': '#96593a',
           '#285838': '#7a1016', '#30a860': '#d0252f', '#50a878': '#ee5a60', '#185838': '#4a080c',
           '#705850': '#1f2438', '#a08880': '#3a4466', '#d0e8f0': '#8a9ac0'},
  'alt': {'#285838': '#8a5a08', '#30a860': '#e0a21f', '#50a878': '#ffd060', '#185838': '#5a3a04'},
 },
 'anthony': {
  'base': {'#d06058': '#2b201c', '#903028': '#171010', '#601010': '#0b0707', '#f8c8b8': '#eab58a', '#d88870': '#c48560', '#905848': '#8e5a3c', '#f8e8d8': '#f8d6b8',
           '#582830': '#1c3f7a', '#905060': '#2f7fd8', '#785870': '#6fb0f0', '#502830': '#16305e', '#482830': '#16305e', '#805868': '#5a9ae0',
           '#585880': '#2c2c38', '#202038': '#141418'},
  'alt': {'#582830': '#1d6b2c', '#905060': '#3fbf5a', '#785870': '#8fe8a0', '#502830': '#14521f', '#482830': '#14521f', '#805868': '#7ad88c'},
 },
 'jibaru': {
  'base': {'#d08058': '#1a1414', '#905848': '#0c0808', '#f8e8d8': '#40343a', '#f8d8b0': '#dca47c', '#e09080': '#b07852',
           '#285838': '#3c3c44', '#30a860': '#6e6e78', '#50a878': '#9c9ca8', '#185838': '#26262c',
           '#705850': '#1e2233', '#a08880': '#343d5c', '#d0e8f0': '#7684a8'},
  'alt': {'#285838': '#1f4a7a', '#30a860': '#3a78c0', '#50a878': '#78aee8', '#185838': '#123256'},
 },
 'edward': {
  'base': {'#d06058': '#1f1716', '#903028': '#110c0c', '#601010': '#080505', '#f8c8b8': '#e2ad86', '#d88870': '#bc7f5a', '#905848': '#8a573a', '#f8e8d8': '#f3cfae',
           '#582830': '#4a1418', '#905060': '#7c2630', '#785870': '#a8404a', '#502830': '#3e1014', '#482830': '#3e1014', '#805868': '#98363f',
           '#585880': '#2c2c38', '#202038': '#141418'},
  'alt': {'#582830': '#26262e', '#905060': '#44444f', '#785870': '#6a6a78', '#502830': '#1c1c22', '#482830': '#1c1c22', '#805868': '#5c5c68'},
 },
 'shiara': {
  'base': {'#8c1931': '#3a2c30', '#ce425a': '#f2e8d8', '#5a0819': '#1e1519', '#ffcebd': '#f6d2bc', '#de8c73': '#d99e84', '#945a4a': '#9a624e'},
  'alt': {'#5a5a84': '#c0507a', '#adadbd': '#ffb0cc', '#21213a': '#7a2448'},
 },
}

STUBBLE = [hx('#4a2e20'), hx('#6a4431')]
GLASS = hx('#2a2230'); LENS = hx('#ffffff'); LENS2 = hx('#cfe6f5')

def process(cid, variant):
    C = CHARS[cid]; S = BASES[C['base']]; A = anims_for(cid); edit = C['edit']
    im = np.array(Image.open(S['sheet']).convert('RGBA')).astype(np.int32)
    F = json.load(open(f"frames_{S['tag']}.json")); bg = np.array(F['bg'])
    used = sorted({i for a in A.values() for i in a['f']}, key=lambda v: (isinstance(v, str), str(v)))
    cmap = dict(PAL[cid]['base']);
    if variant == 'alt': cmap.update(PAL[cid]['alt'])
    cmap = {hx(k): hx(v) for k, v in cmap.items()}
    hair = [hx(c) for c in S['hair']]; skin = [hx(c) for c in S['skin']]; white = hx(S['white'])
    out = {}
    for idx in used:
        if isinstance(idx, str):
            c = SYNTH[idx](im, F, bg); h, w = c.shape[:2]
        else:
            x, y, w, h = F['frames'][idx]
            c = im[y:y + h, x:x + w].copy()
        isbg = np.all(np.abs(c[:, :, :3] - bg) <= 6, axis=2) | (c[:, :, 3] == 0)
        c[isbg] = 0
        rgb = c[:, :, :3]
        def mask(cols):
            m = np.zeros(rgb.shape[:2], bool)
            for col in cols: m |= np.all(rgb == col, axis=2)
            return m & ~isbg
        hm = mask(hair[:1]); sm = mask(skin); wm = mask([white])
        # ancla: centro del pelo (estable entre frames), pies = borde inferior
        if hm.sum() > 8:
            ys, xs = np.nonzero(hm); ax = (xs.min() + xs.max()) / 2; hy0, hy1, hx0, hx1 = ys.min(), ys.max(), xs.min(), xs.max()
        else:
            ax = w / 2; hy0 = None
        edits = []
        if hy0 is not None:
            region = np.zeros_like(hm); region[max(0, hy0):min(h, hy0 + 30), max(0, hx0 - 3):min(w, hx1 + 4)] = True
            if edit == 'beard':
                # barba: componente de piel de la cara (el que más toca la zona bajo el pelo) y sus 2 pixeles más bajos por columna
                lab, n = ndimage.label(sm)
                if n:
                    zone = np.zeros_like(sm); zone[hy0:min(h, hy1 + 8), max(0, hx0):min(w, hx1 + 1)] = True
                    counts = ndimage.sum(zone & sm, lab, range(1, n + 1))
                    face = lab == (int(np.argmax(counts)) + 1)
                    fys, fxs = np.nonzero(face)
                    if len(fys) > 10:
                        top = fys.min(); H = fys.max() - top
                        for cx in np.unique(fxs):
                            yy = fys[fxs == cx]
                            bottom = yy.max()
                            if bottom - top < H * 0.55: continue
                            for k, yb in enumerate([bottom, bottom - 1, bottom - 2][: 2 + (cx % 2)]):
                                if face[yb, cx]: edits.append((yb, cx, STUBBLE[(cx + yb) % 2]))
            elif edit == 'shades':
                LENS_D, LENS_H, FRAME = hx('#1c2028'), hx('#6e7c8e'), hx('#e2e9ee')
                hairall = mask(hair)
                near_hair = np.zeros_like(hairall)
                for dy in range(1, 5): near_hair[dy:] |= hairall[:-dy]
                lab, n = ndimage.label(wm & region)
                comps = []
                for k, sl in enumerate(ndimage.find_objects(lab)):
                    if sl is None: continue
                    m = lab[sl] == k + 1
                    if not (near_hair[sl] & m).any(): continue      # los ojos tocan el pelo; los dientes no
                    comps.append((m.sum(), sl))
                comps = [c2[1] for c2 in sorted(comps, key=lambda c2: -c2[0])[:2]]
                boxes = [(sl[0].start - 1, sl[0].stop, sl[1].start - 1, sl[1].stop) for sl in comps]
                if len(boxes) == 1:
                    y0, y1, x0, x1 = boxes[0]; lw = max(3, x1 - x0 - 1)
                    boxes.append((y0 + 1, y1, x1 + 2, x1 + 2 + lw))
                boxes.sort(key=lambda b: b[2])
                for (y0, y1, x0, x1) in boxes:
                    for yy in range(y0, y1 + 1):
                        for xx in range(x0, x1 + 1):
                            if not (0 <= yy < h and 0 <= xx < w) or isbg[yy, xx] or hairall[yy, xx]: continue
                            border = yy in (y0, y1) or xx in (x0, x1)
                            if border: edits.append((yy, xx, FRAME if sm[yy, xx] else hx('#0d0f14')))
                            else: edits.append((yy, xx, LENS_H if (yy == y0 + 1 and xx == x0 + 1) else LENS_D))
                if len(boxes) == 2:
                    (a0, a1, b0, b1), (c0, c1, d0, d1) = boxes
                    my = min(a0, c0) + 1
                    for xx in range(b1 + 1, d0):
                        if 0 <= my < h and 0 <= xx < w and not isbg[my, xx] and not hairall[my, xx]: edits.append((my, xx, FRAME))
            elif edit == 'darkglasses':
                lab, n = ndimage.label(sm)
                if n:
                    zone = np.zeros_like(sm); zone[hy0:min(h, hy1 + 10), max(0, hx0 - 2):min(w, hx1 + 3)] = True
                    counts = ndimage.sum(zone & sm, lab, range(1, n + 1))
                    face = lab == (int(np.argmax(counts)) + 1)
                    fys, fxs = np.nonzero(face)
                    if len(fys) > 12:
                        fy0, fy1, fx0, fx1 = fys.min(), fys.max(), fxs.min(), fxs.max()
                        dark = np.all(rgb == 0, axis=2) & ~isbg
                        sub = np.zeros_like(dark); sub[fy0:fy0 + max(3, int((fy1 - fy0) * 0.75)), fx0:fx1 + 1] = True
                        cand = np.zeros_like(dark)
                        for yy, xx in zip(*np.nonzero(dark & sub)):
                            L = sm[yy, max(0, xx - 3):xx].any(); R = sm[yy, xx + 1:min(w, xx + 4)].any()
                            if L and R: cand[yy, xx] = True
                        el, en = ndimage.label(ndimage.binary_dilation(cand, iterations=1) & (dark | cand))
                        boxes = []
                        for sl in ndimage.find_objects(el):
                            if sl is None: continue
                            bh, bw = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
                            if not (2 <= bh <= 6 and 1 <= bw <= 5): continue
                            y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
                            boxes.append((y0 - 1, y1, x0 - 2, x1 + 1))
                        boxes = sorted(boxes, key=lambda b: b[2])[-2:]
                        for (y0, y1, x0, x1) in boxes:
                            for yy in range(y0, y1 + 1):
                                for xx in range(x0, x1 + 1):
                                    if not (0 <= yy < h and 0 <= xx < w): continue
                                    if yy in (y0, y1) and xx in (x0, x1): continue
                                    if yy in (y0, y1) or xx in (x0, x1):
                                        if not isbg[yy, xx] and not np.all(rgb[yy, xx] == 0): edits.append((yy, xx, GLASS))
                                    elif sm[yy, xx]: edits.append((yy, xx, LENS2))
                        if len(boxes) == 2:
                            (a0, a1, b0, b1), (c0, c1, d0, d1) = boxes
                            for xx in range(b1, d0 + 1):
                                if 0 <= a0 < h and sm[a0, xx]: edits.append((a0, xx, GLASS))
            elif edit in ('glasses', 'sunglasses'):
                FR, LN = (GLASS, LENS) if edit == 'glasses' else (hx('#e4ecf0'), hx('#3a4048'))
                # lentes alrededor del blanco de los ojos
                eyes = wm & region
                lab, n = ndimage.label(eyes)
                comps = [c2 for c2 in ndimage.find_objects(lab) if c2 is not None]
                comps = [c2 for c2 in comps if (c2[0].stop - c2[0].start) * (c2[1].stop - c2[1].start) <= 20]
                comps = sorted(comps, key=lambda s: -(s[0].stop - s[0].start) * (s[1].stop - s[1].start))[:2]
                boxes = []
                for sl in comps:
                    y0, y1, x0, x1 = sl[0].start - 2, sl[0].stop + 1, sl[1].start - 2, sl[1].stop + 1
                    boxes.append((y0, y1, x0, x1))
                    for yy in range(y0, y1 + 1):
                        for xx in range(x0, x1 + 1):
                            if not (0 <= yy < h and 0 <= xx < w): continue
                            corner = yy in (y0, y1) and xx in (x0, x1)
                            if corner: continue
                            border = yy in (y0, y1) or xx in (x0, x1)
                            if border:
                                if not isbg[yy, xx]: edits.append((yy, xx, FR))
                            elif wm[yy, xx]: edits.append((yy, xx, LN))
                            elif sm[yy, xx] and edit == 'glasses': edits.append((yy, xx, LENS2))
                if len(boxes) == 2:
                    (a0, a1, b0, b1), (c0, c1, d0, d1) = sorted(boxes, key=lambda b: b[2])
                    my = (a0 + c0) // 2
                    for xx in range(b1, d0 + 1):
                        if 0 <= my < h and 0 <= xx < w and sm[my, xx]: edits.append((my, xx, FR))
                elif len(boxes) == 1:
                    y0, y1, x0, x1 = boxes[0]
                    for xx in range(max(0, x0 - 4), x0):
                        if not isbg[y0, xx] and sm[y0, xx]: edits.append((y0, xx, FR))
        # recolor
        for src, dst in cmap.items():
            m = np.all(c[:, :, :3] == src, axis=2) & ~isbg
            c[m, :3] = dst
        for (yy, xx, col) in edits: c[yy, xx, :3] = col; c[yy, xx, 3] = 255
        out[idx] = (c.astype(np.uint8), float(ax), float(h))
    return out

def pack(frames, W=2048):
    x = y = rowh = 0; pos = {}
    for idx, (c, ax, ay) in sorted(frames.items(), key=lambda kv: -kv[1][0].shape[0]):
        h, w = c.shape[:2]
        if x + w + 2 > W: x = 0; y += rowh + 2; rowh = 0
        pos[idx] = (x, y); x += w + 2; rowh = max(rowh, h)
    H = y + rowh + 2
    atlas = np.zeros((H, W, 4), np.uint8)
    meta = {}
    for idx, (c, ax, ay) in frames.items():
        px, py = pos[idx]; h, w = c.shape[:2]
        atlas[py:py + h, px:px + w] = c
        meta[idx] = [px, py, w, h, round(ax, 1), ay]
    return Image.fromarray(atlas), meta

import sys
only = sys.argv[1:] or list(CHARS)
old = {}
if os.path.exists(OUT_JS):
    t = open(OUT_JS).read(); old = json.loads(t[t.index('{'):t.rindex('}') + 1])
js = old
for cid in only:
    D = {'anims': anims_for(cid)}
    for variant in ['base', 'alt']:
        fr = process(cid, variant)
        img, meta = pack(fr)
        img.save(f'{OUT_IMG}/{cid}_{variant}.png')
        D['frames'] = {str(k): v for k, v in meta.items()}
        # retrato: cabeza del primer frame idle, ampliada
        c, ax, ay = fr[D['anims']['idle']['f'][0]]
        hm = np.any(c[:, :, 3:] > 0, axis=2)
        ys, xs = np.nonzero(hm)
        top = ys.min(); ch = 30 if CHARS[cid]['base'] == 'scott' else 32
        x0 = int(ax - 17); crop = np.zeros((ch, 34, 4), np.uint8)
        for yy in range(ch):
            for xx in range(34):
                sy, sx = top + yy, x0 + xx
                if 0 <= sy < c.shape[0] and 0 <= sx < c.shape[1]: crop[yy, xx] = c[sy, sx]
        Image.fromarray(crop).save(f'{OUT_IMG}/{cid}_{variant}_face.png')
        print(cid, variant, img.size, len(meta))
    D['idleH'] = fr[D['anims']['idle']['f'][0]][2]
    js[cid] = D
open(OUT_JS, 'w').write('// Sprites (generados por build_sprites.py a partir de hojas de Scott Pilgrim vs. the World: The Game)\nconst SPRITE_DATA = ' + json.dumps(js) + ';\n')
print('ok')
