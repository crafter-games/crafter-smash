import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage
def segment(fn, tag):
    im = np.array(Image.open(fn).convert('RGBA'))
    from collections import Counter
    bg = np.array(Counter(map(tuple, im[::5, ::5, :3].reshape(-1, 3))).most_common(1)[0][0])
    fg = np.any(np.abs(im[:,:,:3].astype(int) - bg.astype(int)) > 6, axis=2) & (im[:,:,3] > 0)
    lab, n = ndimage.label(fg, structure=np.ones((3,3)))
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(fg, lab, range(1, n + 1))
    big = [[sl[1].start, sl[0].start, sl[1].stop, sl[0].stop] for i, sl in enumerate(objs) if sizes[i] >= 250 and sl[0].stop - sl[0].start >= 22]
    # fusionar fragmentos chicos cercanos (pelo suelto, manos, efectos)
    for i, sl in enumerate(objs):
        if sizes[i] >= 250 and sl[0].stop - sl[0].start >= 22: continue
        if sizes[i] < 4: continue
        x0, y0, x1, y1 = sl[1].start, sl[0].start, sl[1].stop, sl[0].stop
        best = None
        for b in big:
            dx = max(b[0] - x1, x0 - b[2], 0); dy = max(b[1] - y1, y0 - b[3], 0)
            d = max(dx, dy)
            if d <= 3 and (best is None or d < best[0]): best = (d, b)
        if best:
            b = best[1]; b[0] = min(b[0], x0); b[1] = min(b[1], y0); b[2] = max(b[2], x1); b[3] = max(b[3], y1)
    frames = [[b[0], b[1], b[2] - b[0], b[3] - b[1]] for b in big]
    # ordenar por filas
    frames.sort(key=lambda f: (f[1] + f[3]) // 1)
    rows = []
    for f in sorted(frames, key=lambda f: f[1] + f[3]):
        base = f[1] + f[3]
        for r in rows:
            if abs(r['base'] - base) < 18: r['items'].append(f); break
        else: rows.append({'base': base, 'items': [f]})
    out = []
    for r in sorted(rows, key=lambda r: r['base']):
        out += sorted(r['items'], key=lambda f: f[0])
    # contact sheet con índices
    src = Image.open(fn).convert('RGBA')
    W = 1800; x = y = 0; rowh = 0; tiles = []
    for idx, (fx, fy, fw, fh) in enumerate(out):
        tw, th = fw * 2, fh * 2 + 14
        if x + tw > W: x = 0; y += rowh + 4; rowh = 0
        tiles.append((idx, x, y, fx, fy, fw, fh)); x += tw + 4; rowh = max(rowh, th)
    sheet = Image.new('RGBA', (W, y + rowh + 4), (40, 40, 60, 255))
    d = ImageDraw.Draw(sheet)
    for idx, x, y, fx, fy, fw, fh in tiles:
        crop = src.crop((fx, fy, fx + fw, fy + fh)).resize((fw * 2, fh * 2), Image.NEAREST)
        sheet.paste(crop, (x, y + 14))
        d.text((x + 1, y), str(idx), fill=(255, 255, 0, 255))
    sheet.save(f'contact_{tag}.png')
    json.dump({'bg': bg.tolist(), 'frames': out}, open(f'frames_{tag}.json', 'w'))
    print(tag, len(out), 'frames; sheet', sheet.size)
import sys
segment(sys.argv[1], sys.argv[2])
