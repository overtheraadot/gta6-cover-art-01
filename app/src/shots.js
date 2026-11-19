// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// in the panels; ?shot=cover shows the cover alone at the export size.
// Query params: layout, grade, caption, sub, size, photos (comma list, one
// sample per panel: pier or boulevard). window.__shotReady is set once the
// scene is painted and the caption font is loaded.
import { LAYOUTS } from './cover.js';

const SAMPLE_KEYS = ['pier', 'boulevard'];
// Where each sample's face sits: a positive oy shifts the photo down inside
// its panel, so the visible window shows the top of the photo — the face.
// The pier portrait's face is near the top; the boulevard portrait's higher.
const FACE_OY = { pier: 0.18, boulevard: 0.32 };

function applyQuery(api, query) {
  const { state } = api;
  const layout = query.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  const caption = query.get('caption');
  if (caption !== null) state.caption = caption;
  const sub = query.get('sub');
  if (sub !== null) state.subcaption = sub;
  const size = query.get('size');
  if (size) api.setSize(size);
  const count = LAYOUTS[state.layout].panels.length;
  const wanted = (query.get('photos') || '').split(',').filter(Boolean);
  state.panels = Array.from({ length: count }, (_, i) => {
    const key = wanted[i] || SAMPLE_KEYS[i % SAMPLE_KEYS.length];
    return { photo: key, zoom: 1.08 + (i % 3) * 0.05, ox: (i % 2 ? -0.03 : 0.02), oy: FACE_OY[key] ?? 0 };
  });
  if (api.syncUI) api.syncUI();
}

export async function runShot(shot, query, api) {
  applyQuery(api, query);
  await api.loadSamples();
  await document.fonts.load('100px Anton').catch(() => {});
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.redraw();
  // Two frames, so the canvas paint and the font have landed.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
