// Wires the page: layout and grade pickers, caption fields, per-panel photo
// and crop controls, and the PNG export. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, LAYOUT_IDS, SIZES, pointInPolygon } from './cover.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subcaptionInput = document.getElementById('subcaption');
const status = document.getElementById('status');
const panelName = document.getElementById('panelName');
const panelCount = document.getElementById('panelCount');
const zoomInput = document.getElementById('panelZoom');

const SAMPLES = { pier: 'samples/pier.jpg', boulevard: 'samples/boulevard.jpg' };

// One state object drives the preview and every export.
const state = {
  layout: 'trio',
  grade: 'sunset',
  caption: 'VICE CITY',
  subcaption: 'WELCOME BACK TO LEONIDA',
  size: '1920x1080',
  panels: [],
};
let selected = 0;
let uploads = 0;
const photos = {}; // key -> HTMLImageElement

function freshPanels() {
  const count = LAYOUTS[state.layout].panels.length;
  const keys = ['pier', 'boulevard', 'pier', 'boulevard', 'pier'];
  state.panels = Array.from({ length: count }, (_, i) => ({
    photo: keys[i % keys.length],
    zoom: 1.15,
    ox: 0,
    oy: 0,
  }));
  selected = 0;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  for (const [key, url] of Object.entries(SAMPLES)) {
    if (!photos[key]) photos[key] = await loadImage(url);
  }
}

function sizeCanvas() {
  const s = SIZES[state.size];
  canvas.width = s.w;
  canvas.height = s.h;
}

function redraw() {
  drawCover(canvas, state, photos);
  panelCount.textContent = String(state.panels.length);
  panelName.textContent = String(selected + 1);
  const p = state.panels[selected];
  if (p) zoomInput.value = String(p.zoom);
  document.querySelectorAll('#panelPhotos button').forEach((b) => {
    b.setAttribute('aria-pressed', String(p && b.dataset.photo === p.photo));
  });
}

function markButtons(container, value, attr = 'data-value') {
  container.querySelectorAll('button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
  });
}

// Puts every control back in step with the state (the screenshot scenes set
// the state directly, so the inputs and pressed buttons must follow it).
function syncUI() {
  captionInput.value = state.caption;
  subcaptionInput.value = state.subcaption;
  markButtons(layoutBox, state.layout);
  markButtons(gradeBox, state.grade);
  markButtons(sizeBox, state.size);
}

// --- control builders -------------------------------------------------------
const layoutBox = document.getElementById('layouts');
for (const id of LAYOUT_IDS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = LAYOUTS[id].name;
  b.dataset.value = id;
  b.addEventListener('click', () => {
    state.layout = id;
    freshPanels();
    markButtons(layoutBox, id);
    redraw();
  });
  layoutBox.appendChild(b);
}
markButtons(layoutBox, state.layout);

const gradeBox = document.getElementById('grades');
for (const id of GRADE_IDS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.title = GRADES[id].name;
  b.setAttribute('aria-label', GRADES[id].name);
  b.dataset.value = id;
  b.style.background = `linear-gradient(135deg, ${GRADES[id].accent} 0%, #2a1747 130%)`;
  b.addEventListener('click', () => {
    state.grade = id;
    markButtons(gradeBox, id);
    redraw();
  });
  gradeBox.appendChild(b);
}
markButtons(gradeBox, state.grade);

const sizeBox = document.getElementById('sizes');
for (const [id, s] of Object.entries(SIZES)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = s.label;
  b.dataset.value = id;
  b.addEventListener('click', () => {
    state.size = id;
    sizeCanvas();
    markButtons(sizeBox, id);
    redraw();
  });
  sizeBox.appendChild(b);
}
markButtons(sizeBox, state.size);

const photoBox = document.getElementById('panelPhotos');
for (const [key, label] of [['pier', 'Pier'], ['boulevard', 'Boulevard']]) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.dataset.photo = key;
  b.addEventListener('click', async () => {
    await loadSamples();
    state.panels[selected].photo = key;
    redraw();
  });
  photoBox.appendChild(b);
}

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subcaptionInput.addEventListener('input', () => { state.subcaption = subcaptionInput.value; redraw(); });
zoomInput.addEventListener('input', () => {
  const p = state.panels[selected];
  if (p) { p.zoom = Number(zoomInput.value); redraw(); }
});
document.getElementById('panelReset').addEventListener('click', () => {
  const p = state.panels[selected];
  if (p) { p.zoom = 1.15; p.ox = 0; p.oy = 0; redraw(); }
});
document.getElementById('samePhoto').addEventListener('click', () => {
  const p = state.panels[selected];
  if (!p || !p.photo) return;
  for (const panel of state.panels) panel.photo = p.photo;
  redraw();
});
document.getElementById('upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  uploads += 1;
  const key = `upload-${uploads}`;
  photos[key] = await loadImage(URL.createObjectURL(file));
  state.panels[selected].photo = key;
  state.panels[selected].zoom = 1.15;
  state.panels[selected].ox = 0;
  state.panels[selected].oy = 0;
  redraw();
});
document.getElementById('demo').addEventListener('click', async () => {
  await loadSamples();
  freshPanels();
  redraw();
  status.textContent = 'Demo photos loaded into every panel.';
});

// --- picking, panning, zooming on the preview -------------------------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function panelAt(x, y) {
  const polys = LAYOUTS[state.layout].panels;
  for (let i = polys.length - 1; i >= 0; i--) {
    const poly = polys[i].map(([px, py]) => [px * canvas.width, py * canvas.height]);
    if (pointInPolygon(x, y, poly)) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  selected = i;
  canvas.setPointerCapture(e.pointerId);
  drag = { x, y, ox: state.panels[i].ox, oy: state.panels[i].oy, moved: false };
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const p = state.panels[selected];
  const box = { w: canvas.width, h: canvas.height };
  p.ox = drag.ox + (x - drag.x) / box.w;
  p.oy = drag.oy + (y - drag.y) / box.h;
  if (Math.abs(x - drag.x) + Math.abs(y - drag.y) > 2) drag.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { x, y } = canvasPoint(e);
  const i = panelAt(x, y);
  if (i < 0) return;
  selected = i;
  const p = state.panels[i];
  p.zoom = Math.min(2.5, Math.max(1, p.zoom - Math.sign(e.deltaY) * 0.08));
  redraw();
}, { passive: false });

// --- export -----------------------------------------------------------------
function renderExport(sizeKey) {
  const s = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = s.w;
  off.height = s.h;
  drawCover(off, { ...state, size: sizeKey }, photos);
  return off;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

document.getElementById('export').addEventListener('click', () => {
  renderExport(state.size).toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed.'; return; }
    download(blob, `vice-sunset-split-${state.size}.png`);
    status.textContent = `Saved vice-sunset-split-${state.size}.png`;
  }, 'image/png');
});

// The screenshot harness calls this: the same drawing the Export button
// uses, returned as a PNG data URL instead of a download.
window.__exportCover = async function (sizeKey) {
  const off = renderExport(sizeKey || state.size);
  return off.toDataURL('image/png');
};

// --- boot -------------------------------------------------------------------
freshPanels();
sizeCanvas();
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  await loadSamples();
  await document.fonts.load('100px Anton').catch(() => {});
  await runShot(shot, new URLSearchParams(location.search), {
    state, photos, loadSamples, sizeCanvas, redraw, canvas, syncUI,
    setSize(key) { state.size = key; sizeCanvas(); },
  });
} else {
  loadSamples().then(redraw);
  document.fonts.load('100px Anton').then(redraw).catch(() => {});
  redraw();
}
