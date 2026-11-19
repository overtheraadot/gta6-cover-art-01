// Draws a Vice Sunset Split cover: diagonal-split panels, each holding a photo the
// user can crop and reposition, a colour grade washed over the whole poster, and a
// big condensed caption with an outline and a hard drop shadow. The same routine
// paints the live preview and the exported PNG, so what you see is what you get.

import { GRADES } from './grades.js';

// Layouts are lists of polygons in normalised [0, 1] cover space. The cuts run
// diagonally, so neighbouring panels share a slanted edge — the poster look.
export const LAYOUTS = {
  trio: {
    label: 'Diagonal Trio',
    panels: [
      [[0, 0], [0.42, 0], [0.30, 1], [0, 1]],
      [[0.42, 0], [0.78, 0], [0.66, 1], [0.30, 1]],
      [[0.78, 0], [1, 0], [1, 1], [0.66, 1]],
    ],
  },
  quartet: {
    label: 'Neon Quartet',
    panels: [
      [[0, 0], [0.55, 0], [0.45, 0.52], [0, 0.52]],
      [[0.55, 0], [1, 0], [1, 0.52], [0.45, 0.52]],
      [[0, 0.52], [0.45, 0.52], [0.38, 1], [0, 1]],
      [[0.45, 0.52], [1, 0.52], [1, 1], [0.38, 1]],
    ],
  },
  five: {
    label: 'Vice Five',
    panels: [
      [[0, 0], [0.34, 0], [0.30, 0.5], [0, 0.5]],
      [[0, 0.5], [0.30, 0.5], [0.26, 1], [0, 1]],
      [[0.34, 0], [0.68, 0], [0.62, 1], [0.26, 1]],
      [[0.68, 0], [1, 0], [1, 0.5], [0.65, 0.5]],
      [[0.65, 0.5], [1, 0.5], [1, 1], [0.62, 1]],
    ],
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);
export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const FONT = '"Anton", "Arial Narrow", sans-serif';

function polygonPath(ctx, poly, w, h) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0] * w, poly[0][1] * h);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0] * w, poly[i][1] * h);
  ctx.closePath();
}

function polygonCentre(poly) {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) { x += px; y += py; }
  return [x / poly.length, y / poly.length];
}

/** Ray-casting hit test in normalised cover space. */
export function panelAt(layoutId, nx, ny) {
  const panels = LAYOUTS[layoutId].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const poly = panels[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if ((ay > ny) !== (by > ny) && nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

function paintPhoto(ctx, photo, poly, w, h, panel) {
  // The photo is cover-fit to this panel's own bounding box, centred on the
  // panel, so every panel frames its photo instead of sharing one big crop.
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const [px, py] of poly) {
    minX = Math.min(minX, px); maxX = Math.max(maxX, px);
    minY = Math.min(minY, py); maxY = Math.max(maxY, py);
  }
  const bw = (maxX - minX) * w;
  const bh = (maxY - minY) * h;
  const [cx, cy] = polygonCentre(poly);
  ctx.save();
  polygonPath(ctx, poly, w, h);
  ctx.clip();
  if (!photo) {
    // Empty panel: a sunset placeholder so the layout still reads as a poster.
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, '#3b1155');
    g.addColorStop(0.55, '#a1205c');
    g.addColorStop(1, '#ff7a3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `400 ${Math.round(h * 0.045)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('+ ADD PHOTO', cx * w, cy * h);
    ctx.restore();
    return;
  }
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(bw / iw, bh / ih);
  // A pan must never open a gap at a panel edge: grow the photo just enough
  // that it still covers the whole bounding box after the offset is applied.
  const ox = Math.abs(panel.dx || 0) * w;
  const oy = Math.abs(panel.dy || 0) * h;
  const scale = Math.max(base * (panel.zoom || 1), (bw + 2 * ox) / iw, (bh + 2 * oy) / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = cx * w - dw / 2 + (panel.dx || 0) * w;
  const dy = cy * h - dh / 2 + (panel.dy || 0) * h;
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

function wash(ctx, grade, w, h) {
  for (const layer of grade.washes) {
    const g = ctx.createLinearGradient(0, 0, w * 0.55, h);
    for (const [pos, colour, alpha] of layer.stops) {
      g.addColorStop(pos, hexWithAlpha(colour, alpha));
    }
    ctx.save();
    ctx.globalCompositeOperation = layer.mode;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
}

function hexWithAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function gutters(ctx, layout, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(3, h * 0.007);
  ctx.lineJoin = 'round';
  for (const poly of layout.panels) {
    polygonPath(ctx, poly, w, h);
    ctx.stroke();
  }
  ctx.restore();
}

function captionBlock(ctx, state, w, h) {
  const grade = GRADES[state.grade];
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim().toUpperCase();
  if (!text && !sub) return;

  // Dark scrim behind the lettering so it reads over any photo.
  const scrim = ctx.createLinearGradient(0, h * 0.42, 0, h);
  scrim.addColorStop(0, grade.scrim[0]);
  scrim.addColorStop(1, grade.scrim[1]);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);

  const baseline = h * (state.captionY / 100);
  if (text) {
    let size = h * 0.115 * (state.captionSize / 100);
    ctx.font = `400 ${size}px ${FONT}`;
    while (ctx.measureText(text).width > w * 0.94 && size > 10) {
      size -= 2;
      ctx.font = `400 ${size}px ${FONT}`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // Hard drop shadow: the same words, offset down-right in the grade accent.
    ctx.fillStyle = grade.accent;
    ctx.fillText(text, w / 2 + size * 0.055, baseline + size * 0.06);
    // Thick dark outline, then the white face.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14041f';
    ctx.lineWidth = size * 0.11;
    ctx.strokeText(text, w / 2, baseline);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, baseline);
    // A slanted accent bar under the caption, echoing the panel cuts.
    const barH = Math.max(4, h * 0.008);
    const barY = baseline + size * 0.16;
    ctx.fillStyle = grade.accent;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, barY);
    ctx.lineTo(w * 0.82, barY);
    ctx.lineTo(w * 0.80, barY + barH);
    ctx.lineTo(w * 0.16, barY + barH);
    ctx.closePath();
    ctx.fill();
  }
  if (sub) {
    let size = h * 0.032;
    ctx.font = `400 ${size}px ${FONT}`;
    try { ctx.letterSpacing = `${Math.round(size * 0.18)}px`; } catch { /* older canvas */ }
    while (ctx.measureText(sub).width > w * 0.9 && size > 8) {
      size -= 1;
      ctx.font = `400 ${size}px ${FONT}`;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9f4';
    ctx.fillText(sub, w / 2, baseline + h * 0.075);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

function vignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.55, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Paints the whole cover onto `ctx` at `w` x `h` from a state object. */
export function drawCoverTo(ctx, w, h, state) {
  const layout = LAYOUTS[state.layout];
  const grade = GRADES[state.grade];
  ctx.fillStyle = '#14041f';
  ctx.fillRect(0, 0, w, h);
  layout.panels.forEach((poly, i) => {
    paintPhoto(ctx, state.photos[state.panels[i].photo] || null, poly, w, h, state.panels[i]);
  });
  wash(ctx, grade, w, h);
  gutters(ctx, layout, w, h);
  captionBlock(ctx, state, w, h);
  vignette(ctx, w, h);
}

/** Draws the cover onto a canvas element at its own pixel size. */
export function drawCover(canvas, state) {
  drawCoverTo(canvas.getContext('2d'), canvas.width, canvas.height, state);
}

/** Builds a fresh canvas holding the cover at one of the export sizes. */
export function exportCanvas(state, sizeId) {
  const [w, h] = SIZES[sizeId];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCoverTo(canvas.getContext('2d'), w, h, state);
  return canvas;
}

/** A blank per-panel state for a layout: first photo everywhere, no zoom, centred. */
export function freshPanels(layoutId) {
  return LAYOUTS[layoutId].panels.map(() => ({ photo: 0, zoom: 1, dx: 0, dy: 0 }));
}
