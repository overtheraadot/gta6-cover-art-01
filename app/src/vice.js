// Vice Sunset Split — the cover painter.
//
// A cover is a set of photo panels cut by slanted white gutters, a warm or
// neon colour grade washed over the whole sheet, and one big condensed
// caption with a hard outline and an accent-coloured drop shadow. Everything
// here is pure canvas work: no DOM, no network, so the editor, the export
// button and the screenshot scenes all paint through the same function.

export const SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  split: { label: 'Split', blurb: 'Two panels, one diagonal cut' },
  triptych: { label: 'Triptych', blurb: 'Three panels, leaning gutters' },
  hero: { label: 'Hero', blurb: 'One big panel over a strip' },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    washTop: 'rgba(255, 122, 26, 0.20)',
    washBottom: 'rgba(214, 41, 118, 0.26)',
    tint: 'rgba(255, 176, 92, 0.10)',
    accent: '#ff5e3a',
    captionShadow: '#ff2e88',
    kicker: '#ffd166',
    mode: 'soft-light',
  },
  neon: {
    label: 'Neon Night',
    washTop: 'rgba(64, 224, 255, 0.16)',
    washBottom: 'rgba(255, 0, 153, 0.30)',
    tint: 'rgba(122, 60, 255, 0.12)',
    accent: '#00e5ff',
    captionShadow: '#ff00a8',
    kicker: '#00e5ff',
    mode: 'overlay',
  },
  pastel: {
    label: 'Pastel Vice',
    washTop: 'rgba(255, 183, 213, 0.22)',
    washBottom: 'rgba(125, 211, 252, 0.20)',
    tint: 'rgba(255, 241, 208, 0.10)',
    accent: '#ff8fb3',
    captionShadow: '#7dd3fc',
    kicker: '#f472b6',
    mode: 'soft-light',
  },
  noir: {
    label: 'Noir',
    washTop: 'rgba(255, 255, 255, 0.05)',
    washBottom: 'rgba(0, 0, 0, 0.34)',
    tint: 'rgba(255, 190, 90, 0.07)',
    accent: '#f5f5f5',
    captionShadow: '#111111',
    kicker: '#e5e5e5',
    mode: 'soft-light',
  },
};

/** How many photo panels a layout holds. */
export function panelCount(layout) {
  return layout === 'triptych' ? 3 : 2;
}

/**
 * The panel shapes for a layout on a sheet of w × h.
 * Returns { panels: [[[x, y], ...], ...], seams: [[[x1, y1], [x2, y2]], ...] }.
 * Seams are the slanted cuts between panels, drawn later as white gutters.
 */
export function panelShapes(layout, w, h) {
  if (layout === 'triptych') {
    const topA = w * 0.36;
    const topB = w * 0.68;
    const botA = w * 0.29;
    const botB = w * 0.61;
    return {
      panels: [
        [[0, 0], [topA, 0], [botA, h], [0, h]],
        [[topA, 0], [topB, 0], [botB, h], [botA, h]],
        [[topB, 0], [w, 0], [w, h], [botB, h]],
      ],
      seams: [
        [[topA, 0], [botA, h]],
        [[topB, 0], [botB, h]],
      ],
    };
  }
  if (layout === 'hero') {
    const cutLeft = w * 0.62;
    const cutRight = w * 0.78;
    return {
      panels: [
        [[0, 0], [w, 0], [w, h * 0.66], [cutLeft, h * 0.78], [0, h * 0.7]],
        [[0, h * 0.7], [cutLeft, h * 0.78], [w, h * 0.66], [w, h], [0, h]],
      ],
      seams: [[[0, h * 0.7], [cutLeft, h * 0.78]], [[cutLeft, h * 0.78], [w, h * 0.66]]],
    };
  }
  // split: two panels, one diagonal seam leaning left as it falls.
  const top = w * 0.54;
  const bottom = w * 0.44;
  return {
    panels: [
      [[0, 0], [top, 0], [bottom, h], [0, h]],
      [[top, 0], [w, 0], [w, h], [bottom, h]],
    ],
    seams: [[[top, 0], [bottom, h]]],
  };
}

/** True when point [x, y] sits inside the polygon (ray casting). */
export function insidePolygon(polygon, x, y) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** The bounding box of a polygon: [minX, minY, maxX, maxY]. */
function boundsOf(polygon) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Paint one photo into one panel: cover-fit, then the panel's own zoom and
 * pan. panX / panY are fractions of the panel size, zoom is a multiplier
 * around 1. The photo is clipped to the panel polygon.
 */
function paintPanel(ctx, image, polygon, panel) {
  const [minX, minY, maxX, maxY] = boundsOf(polygon);
  const pw = maxX - minX;
  const ph = maxY - minY;
  if (pw <= 0 || ph <= 0 || !image) return;
  ctx.save();
  ctx.beginPath();
  polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const zoom = panel.zoom || 1;
  const scale = Math.max(pw / image.naturalWidth, ph / image.naturalHeight) * zoom;
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  const dx = minX + (pw - dw) / 2 + (panel.panX || 0) * pw;
  const dy = minY + (ph - dh) / 2 + (panel.panY || 0) * ph;
  ctx.drawImage(image, dx, dy, dw, dh);
  ctx.restore();
}

/** A soft dark vignette so the caption zone reads against any photo. */
function paintVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The grade wash: a two-stop vertical gradient plus a faint warm tint. */
function paintGrade(ctx, grade, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = grade.mode;
  const wash = ctx.createLinearGradient(0, 0, w * 0.25, h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** White gutters along every seam, with a hairline dark edge for bite. */
function paintSeams(ctx, seams, w) {
  const gutter = Math.max(7, w * 0.011);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [[x1, y1], [x2, y2]] of seams) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = gutter + 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = gutter;
    ctx.stroke();
  }
  ctx.restore();
}

/** The caption block: kicker, big condensed caption, tagline, all slanted -2°. */
function paintCaption(ctx, state, grade, w, h) {
  const caption = (state.caption || '').trim() || 'Sunset Heist';
  const tagline = (state.tagline || '').trim();
  const kicker = (state.kicker || '').trim();
  const tilt = -0.035;
  const left = w * 0.055;
  // Size the tagline first, then anchor the whole block from the bottom so
  // the tagline never runs off the sheet on wide covers.
  let tagSize = Math.round(w * 0.032);
  ctx.font = `700 ${tagSize}px "ViceCondensed", "Arial Narrow", sans-serif`;
  while (tagSize > 14 && ctx.measureText(tagline).width > w * 0.9) {
    tagSize = Math.round(tagSize * 0.94);
    ctx.font = `700 ${tagSize}px "ViceCondensed", "Arial Narrow", sans-serif`;
  }
  const base = h - tagSize * 2.6;
  ctx.save();
  ctx.translate(left, base);
  ctx.rotate(tilt);
  ctx.textBaseline = 'alphabetic';
  // Accent bar behind the caption.
  let capSize = Math.round(w * 0.105);
  ctx.font = `900 ${capSize}px "ViceCondensed", "Arial Narrow", sans-serif`;
  while (capSize > 24 && ctx.measureText(caption.toUpperCase()).width > w * 0.9) {
    capSize = Math.round(capSize * 0.94);
    ctx.font = `900 ${capSize}px "ViceCondensed", "Arial Narrow", sans-serif`;
  }
  const capWidth = ctx.measureText(caption.toUpperCase()).width;
  const barH = capSize * 1.04;
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  const skew = capSize * 0.22;
  ctx.moveTo(-capSize * 0.18 + skew, -barH * 0.92);
  ctx.lineTo(capWidth + capSize * 0.28 + skew, -barH * 0.92);
  ctx.lineTo(capWidth + capSize * 0.28 - skew, barH * 0.12);
  ctx.lineTo(-capSize * 0.18 - skew, barH * 0.12);
  ctx.closePath();
  ctx.globalAlpha = 0.92;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Caption: accent shadow, then white fill with a dark outline.
  ctx.fillStyle = grade.captionShadow;
  ctx.fillText(caption.toUpperCase(), capSize * 0.1, capSize * 0.06);
  ctx.lineWidth = Math.max(3, capSize * 0.09);
  ctx.strokeStyle = 'rgba(10, 8, 12, 0.9)';
  ctx.lineJoin = 'round';
  ctx.strokeText(caption.toUpperCase(), 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(caption.toUpperCase(), 0, 0);
  // Tagline under the bar, kicker above it. Shrink the tagline until it fits.
  ctx.font = `700 ${tagSize}px "ViceCondensed", "Arial Narrow", sans-serif`;
  if (tagline) {
    ctx.fillStyle = 'rgba(12, 8, 16, 0.85)';
    ctx.fillText(tagline, capSize * 0.04 + 2, tagSize * 1.9 + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(tagline, capSize * 0.04, tagSize * 1.9);
  }
  if (kicker) {
    const kickSize = Math.round(w * 0.026);
    ctx.font = `700 ${kickSize}px "ViceCondensed", "Arial Narrow", sans-serif`;
    ctx.fillStyle = grade.kicker;
    const kickY = -barH * 0.92 - kickSize * 0.9;
    ctx.fillText(kicker.toUpperCase(), capSize * 0.02, kickY);
    ctx.fillStyle = grade.kicker;
    ctx.fillRect(capSize * 0.02, kickY + kickSize * 0.35, capWidth * 0.42, Math.max(2, kickSize * 0.14));
  }
  ctx.restore();
}

/**
 * Paint the whole cover onto ctx at w × h.
 * state: { layout, grade, caption, tagline, kicker, panels: [{image, panX, panY, zoom}] }
 * A panel with no image yet gets a warm placeholder wash so the layout
 * still reads while the user picks photos.
 */
export function drawCover(ctx, state, w, h) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const shapes = panelShapes(state.layout || 'split', w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1b0f1e';
  ctx.fillRect(0, 0, w, h);
  shapes.panels.forEach((polygon, i) => {
    const panel = (state.panels && state.panels[i]) || {};
    if (panel.image) {
      if (state.grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.12) brightness(1.04)';
      paintPanel(ctx, panel.image, polygon, panel);
      ctx.filter = 'none';
    } else {
      ctx.save();
      ctx.beginPath();
      polygon.forEach(([x, y], n) => (n === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.clip();
      const wash = ctx.createLinearGradient(0, 0, w, h);
      wash.addColorStop(0, i % 2 === 0 ? '#3d1c4d' : '#57203a');
      wash.addColorStop(1, i % 2 === 0 ? '#c2415d' : '#e07b39');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `700 ${Math.round(w * 0.03)}px "ViceCondensed", "Arial Narrow", sans-serif`;
      ctx.textAlign = 'center';
      const [minX, minY, maxX, maxY] = boundsOf(polygon);
      ctx.fillText('ADD A PHOTO', (minX + maxX) / 2, (minY + maxY) / 2);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  });
  paintGrade(ctx, grade, w, h);
  paintVignette(ctx, w, h);
  paintSeams(ctx, shapes.seams, w);
  paintCaption(ctx, state, grade, w, h);
}

/** Load the two condensed faces so canvas text and the page share them. */
export async function loadViceFonts() {
  const faces = [
    new FontFace('ViceCondensed', 'url(fonts/ViceCondensed-Black.ttf)', { weight: '900' }),
    new FontFace('ViceCondensed', 'url(fonts/ViceCondensed-Bold.ttf)', { weight: '700' }),
  ];
  const loaded = await Promise.all(
    faces.map((face) => face.load().then((f) => document.fonts.add(f)).catch(() => null)),
  );
  try {
    await document.fonts.ready;
  } catch {
    // A font that fails to load falls back to the system condensed stack.
  }
  return loaded.filter(Boolean).length;
}
