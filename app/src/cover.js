// The cover itself: panel layouts as polygons in cover coordinates (0..1),
// and the drawing that turns photos, a grade and a caption into one poster.
//
// A panel is a polygon. Its photo is drawn cover-fit inside the polygon's
// bounding box, then clipped to the polygon, so a photo never leaks across a
// gutter. The gutters are the white slanted strokes between the polygons.
import { GRADES } from './grades.js';

// Three layouts, each a list of polygons. Every layout tiles the whole cover.
export const LAYOUTS = {
  trio: {
    name: 'Diagonal Trio',
    // Two slanted cuts: a wide left band, a top-right wedge, a bottom-right
    // triangle. The cuts lean the same way, like the GTA V poster.
    panels: [
      [[0, 0], [0.66, 0], [0.34, 1], [0, 1]],
      [[0.66, 0], [1, 0], [1, 0.52], [0.34, 1]],
      [[1, 0.52], [1, 1], [0.34, 1]],
    ],
  },
  quartet: {
    name: 'Neon Quartet',
    // Four even quarters, crossed by one diagonal accent bar (drawn later).
    panels: [
      [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]],
      [[0.5, 0], [1, 0], [1, 0.5], [0.5, 0.5]],
      [[0, 0.5], [0.5, 0.5], [0.5, 1], [0, 1]],
      [[0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1]],
    ],
    diagonalBar: true,
  },
  five: {
    name: 'Vice Five',
    // One tall hero panel on the left, four stacked strips on the right.
    panels: [
      [[0, 0], [0.6, 0], [0.6, 1], [0, 1]],
      [[0.6, 0], [1, 0], [1, 0.25], [0.6, 0.25]],
      [[0.6, 0.25], [1, 0.25], [1, 0.5], [0.6, 0.5]],
      [[0.6, 0.5], [1, 0.5], [1, 0.75], [0.6, 0.75]],
      [[0.6, 0.75], [1, 0.75], [1, 1], [0.6, 1]],
    ],
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);
export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
};

/** True when the point (x, y) in cover pixels lies inside the polygon. */
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polyPath(ctx, poly, w, h) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0] * w, poly[0][1] * h);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0] * w, poly[i][1] * h);
  ctx.closePath();
}

function polyBox(poly, w, h) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of poly) {
    x0 = Math.min(x0, px * w); y0 = Math.min(y0, py * h);
    x1 = Math.max(x1, px * w); y1 = Math.max(y1, py * h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Draws one photo cover-fit into a panel's box, panned by (ox, oy) — each a
// fraction of the box — and zoomed. The offsets are clamped so the photo
// always covers the box: panning can never open an edge gap.
function drawPanelPhoto(ctx, img, poly, w, h, zoom, ox, oy, filter) {
  const box = polyBox(poly, w, h);
  const base = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const scale = base * Math.max(1, zoom);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxOx = Math.max(0, (dw - box.w) / 2 / box.w);
  const maxOy = Math.max(0, (dh - box.h) / 2 / box.h);
  const cx = Math.min(Math.max(ox, -maxOx), maxOx);
  const cy = Math.min(Math.max(oy, -maxOy), maxOy);
  const dx = box.x + (box.w - dw) / 2 + cx * box.w;
  const dy = box.y + (box.h - dh) / 2 + cy * box.h;
  ctx.save();
  polyPath(ctx, poly, w, h);
  ctx.clip();
  ctx.filter = filter || 'none';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// A dark placeholder with a diagonal sheen, for a panel with no photo yet.
function drawPanelEmpty(ctx, poly, w, h, i) {
  ctx.save();
  polyPath(ctx, poly, w, h);
  ctx.clip();
  const box = polyBox(poly, w, h);
  const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
  const a = ['#3b1d5e', '#241238', '#4a1e4f', '#1c1030', '#3d1c52'][i % 5];
  g.addColorStop(0, a);
  g.addColorStop(1, '#12081f');
  ctx.fillStyle = g;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = Math.max(1, w * 0.002);
  for (let k = -2; k < 5; k++) {
    ctx.beginPath();
    ctx.moveTo(box.x + k * box.w * 0.25, box.y + box.h);
    ctx.lineTo(box.x + k * box.w * 0.25 + box.h * 0.6, box.y);
    ctx.stroke();
  }
  ctx.restore();
}

// The caption band across the foot: a dark wash, a slanted accent bar, the
// big condensed caption with a hard accent shadow, and the sub-caption.
function drawCaption(ctx, w, h, caption, subcaption, grade) {
  const bandH = h * 0.2;
  const bandY = h - bandH;
  const wash = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  wash.addColorStop(0, 'rgba(10, 4, 20, 0)');
  wash.addColorStop(0.45, grade.band);
  wash.addColorStop(1, grade.band);
  ctx.fillStyle = wash;
  ctx.fillRect(0, bandY - h * 0.06, w, h * 0.06 + bandH);

  // Slanted accent bar above the caption.
  const barH = Math.max(6, h * 0.014);
  const barY = bandY + h * 0.028;
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, barY + barH);
  ctx.lineTo(w * 0.06 + h * 0.05, barY);
  ctx.lineTo(w * 0.46, barY);
  ctx.lineTo(w * 0.46 - h * 0.05, barY + barH);
  ctx.closePath();
  ctx.fill();

  const text = (caption || '').trim().toUpperCase();
  if (text) {
    let size = h * 0.115;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    while (ctx.measureText(text).width > w * 0.88 && size > 14) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    const x = w * 0.06;
    const y = bandY + bandH * 0.62;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Hard accent shadow: the same words, offset, no blur.
    ctx.fillStyle = grade.accent;
    ctx.fillText(text, x + size * 0.055, y + size * 0.055);
    // Dark outline, then the white face.
    ctx.lineWidth = Math.max(2, size * 0.1);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 2, 18, 0.9)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
  }

  const sub = (subcaption || '').trim().toUpperCase();
  if (sub) {
    let size = Math.max(12, h * 0.026);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    while (ctx.measureText(sub).width > w * 0.88 && size > 10) {
      size -= 1;
      ctx.font = `700 ${size}px system-ui, sans-serif`;
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'left';
    try { ctx.letterSpacing = `${Math.max(2, size * 0.22)}px`; } catch { /* older canvas */ }
    ctx.fillText(sub, w * 0.06, bandY + bandH * 0.88);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

/**
 * Draws the whole cover onto `canvas` (already sized to the export size).
 * `state` is { layout, grade, caption, subcaption, panels: [{photo, zoom, ox, oy}] }
 * and `photos` maps a photo key ('pier', 'boulevard', 'upload-3', ...) to an
 * HTMLImageElement, or null for an empty panel.
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = LAYOUTS[state.layout] || LAYOUTS.trio;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const panels = state.panels || [];

  ctx.filter = 'none';
  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((poly, i) => {
    const p = panels[i] || {};
    const img = p.photo ? photos[p.photo] : null;
    if (img) drawPanelPhoto(ctx, img, poly, w, h, p.zoom ?? 1.15, p.ox ?? 0, p.oy ?? 0, grade.photoFilter);
    else drawPanelEmpty(ctx, poly, w, h, i);
  });

  // The grade wash over the whole cover.
  if (grade.wash.length) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [stop, color] of grade.wash) g.addColorStop(stop, color);
    ctx.save();
    ctx.globalCompositeOperation = grade.washMode;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Vignette: the corners fall away, the middle stays bright.
  const v = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  // White slanted gutters between the panels.
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, w * 0.007);
  for (const poly of layout.panels) {
    polyPath(ctx, poly, w, h);
    ctx.stroke();
  }
  ctx.restore();

  // The quartet's diagonal accent bar, crossing the whole cover.
  if (layout.diagonalBar) {
    ctx.save();
    ctx.fillStyle = grade.accent;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    const t = h * 0.045;
    ctx.moveTo(0, h * 0.725);
    ctx.lineTo(w, h * 0.68);
    ctx.lineTo(w, h * 0.68 + t);
    ctx.lineTo(0, h * 0.725 + t);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawCaption(ctx, w, h, state.caption, state.subcaption, grade);
  ctx.filter = 'none';
}
