// Wires the page: photos in, layout / grade / caption / size picked, panels dragged,
// and the cover exported as a PNG. A `?shot=` query sets up a fixed scene for a
// screenshot instead (see ./shots.js).
import { drawCover, exportCanvas, freshPanels, panelAt, LAYOUTS, SIZES } from './cover.js';
import { GRADES } from './grades.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subcaptionInput = document.getElementById('subcaption');
const captionSizeInput = document.getElementById('caption-size');
const captionYInput = document.getElementById('caption-y');
const panelName = document.getElementById('panel-name');
const panelPhotoSelect = document.getElementById('panel-photo');
const panelZoomInput = document.getElementById('panel-zoom');

const state = {
  photos: [],
  photoNames: [],
  panels: freshPanels('trio'),
  layout: 'trio',
  grade: 'sunset',
  caption: 'VICE SUNSET',
  subcaption: 'ONE LAST RIDE DOWN OCEAN DRIVE',
  captionSize: 100,
  captionY: 82,
  size: '1080x1080',
  selected: 0,
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhotos(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    state.photos.push(img);
    state.photoNames.push(file.name.replace(/\.[^.]+$/, ''));
  }
  if (state.photos.length === 1) {
    // First photo fills every panel.
    state.panels = state.panels.map((p) => ({ ...p, photo: 0 }));
  }
  refreshPanelControls();
  redraw();
}

async function loadSamplePhotos() {
  for (const name of ['pier', 'boulevard']) {
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos.push(img);
    state.photoNames.push(name);
  }
  // Spread the two samples across the panels in a diagonal rhythm.
  state.panels = state.panels.map((p, i) => ({ ...p, photo: i % state.photos.length }));
  refreshPanelControls();
  redraw();
}

function panelCount() {
  return LAYOUTS[state.layout].panels.length;
}

function refreshPanelControls() {
  panelName.textContent =
    `Panel ${state.selected + 1} of ${panelCount()} — click a panel in the preview to select it.`;
  panelPhotoSelect.innerHTML = '';
  state.photoNames.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `Photo ${i + 1} — ${name}`;
    panelPhotoSelect.appendChild(option);
  });
  if (state.photos.length === 0) {
    const option = document.createElement('option');
    option.value = '0';
    option.textContent = 'No photo yet';
    panelPhotoSelect.appendChild(option);
  }
  panelPhotoSelect.value = String(state.panels[state.selected]?.photo ?? 0);
  panelZoomInput.value = String(Math.round((state.panels[state.selected]?.zoom ?? 1) * 100));
}

function selectPanel(i) {
  state.selected = Math.max(0, Math.min(panelCount() - 1, i));
  refreshPanelControls();
}

function setLayout(id) {
  state.layout = id;
  state.panels = freshPanels(id);
  // Keep the photos spread across the new panels.
  state.panels = state.panels.map((p, i) => ({
    ...p,
    photo: state.photos.length ? i % state.photos.length : 0,
  }));
  state.selected = 0;
  document.querySelectorAll('#layouts button').forEach((b) =>
    b.classList.toggle('picked', b.dataset.layout === id));
  refreshPanelControls();
  redraw();
}

function setGrade(id) {
  state.grade = id;
  document.querySelectorAll('#grades button').forEach((b) =>
    b.classList.toggle('picked', b.dataset.grade === id));
  redraw();
}

function setSize(id) {
  state.size = id;
  const [w, h] = SIZES[id];
  canvas.width = w;
  canvas.height = h;
  document.querySelectorAll('#sizes button').forEach((b) =>
    b.classList.toggle('picked', b.dataset.size === id));
  redraw();
}

function redraw() {
  drawCover(canvas, state);
}

// --- panel dragging on the preview -------------------------------------------
let drag = null;

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    nx: (event.clientX - rect.left) / rect.width,
    ny: (event.clientY - rect.top) / rect.height,
    rect,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const { nx, ny } = canvasPoint(event);
  const hit = panelAt(state.layout, nx, ny);
  if (hit < 0) return;
  selectPanel(hit);
  drag = { panel: hit, lastX: event.clientX, lastY: event.clientY };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[drag.panel];
  panel.dx += (event.clientX - drag.lastX) / rect.width;
  panel.dy += (event.clientY - drag.lastY) / rect.height;
  panel.dx = Math.max(-0.6, Math.min(0.6, panel.dx));
  panel.dy = Math.max(-0.6, Math.min(0.6, panel.dy));
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  redraw();
});

canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
});

canvas.addEventListener('keydown', (event) => {
  const step = 0.02;
  const panel = state.panels[state.selected];
  if (!panel) return;
  if (event.key === 'ArrowLeft') panel.dx -= step;
  else if (event.key === 'ArrowRight') panel.dx += step;
  else if (event.key === 'ArrowUp') panel.dy -= step;
  else if (event.key === 'ArrowDown') panel.dy += step;
  else return;
  event.preventDefault();
  redraw();
});
canvas.tabIndex = 0;

// --- controls ----------------------------------------------------------------
document.getElementById('photos').addEventListener('change', (e) => addPhotos([...e.target.files]));
document.getElementById('sample-photos').addEventListener('click', loadSamplePhotos);
document.getElementById('shuffle-photos').addEventListener('click', () => {
  if (!state.photos.length) return;
  state.panels = state.panels.map((p) => ({
    ...p,
    photo: Math.floor(Math.random() * state.photos.length),
  }));
  refreshPanelControls();
  redraw();
});
document.querySelectorAll('#layouts button').forEach((b) =>
  b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('#grades button').forEach((b) =>
  b.addEventListener('click', () => setGrade(b.dataset.grade)));
document.querySelectorAll('#sizes button').forEach((b) =>
  b.addEventListener('click', () => setSize(b.dataset.size)));

captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subcaptionInput.addEventListener('input', () => { state.subcaption = subcaptionInput.value; redraw(); });
captionSizeInput.addEventListener('input', () => { state.captionSize = Number(captionSizeInput.value); redraw(); });
captionYInput.addEventListener('input', () => { state.captionY = Number(captionYInput.value); redraw(); });

panelPhotoSelect.addEventListener('change', () => {
  state.panels[state.selected].photo = Number(panelPhotoSelect.value);
  redraw();
});
panelZoomInput.addEventListener('input', () => {
  state.panels[state.selected].zoom = Number(panelZoomInput.value) / 100;
  redraw();
});
document.getElementById('panel-prev').addEventListener('click', () => cyclePanelPhoto(-1));
document.getElementById('panel-next').addEventListener('click', () => cyclePanelPhoto(1));

function cyclePanelPhoto(step) {
  if (!state.photos.length) return;
  const panel = state.panels[state.selected];
  panel.photo = (panel.photo + step + state.photos.length) % state.photos.length;
  refreshPanelControls();
  redraw();
}

document.getElementById('export').addEventListener('click', () => {
  const out = exportCanvas(state, state.size);
  out.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-sunset-split-${state.size}.png`;
    a.click();
    status.textContent = `Saved vice-sunset-split-${state.size}.png (${state.size.replace('x', ' × ')})`;
  }, 'image/png');
});

// --- boot --------------------------------------------------------------------
async function boot() {
  try { await document.fonts.load('40px Anton'); } catch { /* fall back to sans */ }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      state, setLayout, setGrade, setSize, loadSamplePhotos,
      setCaption: (text, sub) => {
        state.caption = text;
        state.subcaption = sub;
        captionInput.value = text;
        subcaptionInput.value = sub;
      },
      redraw,
    });
  } else {
    redraw();
  }
  refreshPanelControls();
}

boot();
