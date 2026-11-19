// Vice Sunset Split — the editor.
//
// Wires the page around the painter in vice.js: photo picking per panel,
// drag-to-pan and wheel zoom on the preview, layout / grade / size pickers,
// and PNG export at the real post size. Everything runs offline; photos are
// read on the user's own machine and never uploaded anywhere.

import {
  SIZES,
  LAYOUTS,
  GRADES,
  panelCount,
  panelShapes,
  insidePolygon,
  drawCover,
  loadViceFonts,
} from './vice.js';

const SAMPLES = ['pier', 'boulevard'];

function freshPanels() {
  return [0, 1, 2].map(() => ({ image: null, panX: 0, panY: 0, zoom: 1 }));
}

function defaultState() {
  return {
    layout: 'split',
    grade: 'sunset',
    size: 'square',
    caption: 'Sunset Heist',
    tagline: 'One last job under the neon sky',
    kicker: 'Grand Sunset',
    samePhoto: true,
    panels: freshPanels(),
    selected: 0,
  };
}

/** Load an image file (a File, a blob URL or a path under app/) as an Image. */
function readImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not read ${typeof source === 'string' ? source : 'that photo'}`));
    image.src = typeof source === 'string' ? source : URL.createObjectURL(source);
  });
}

export function bootEditor() {
  const state = defaultState();
  const stage = document.getElementById('stage');
  const stageCtx = stage.getContext('2d');
  const panelLabel = document.getElementById('panelLabel');
  const zoomRange = document.getElementById('zoomRange');
  const sizeNote = document.getElementById('sizeNote');
  const statusLine = document.getElementById('statusLine');
  let fontsReady = false;
  let drawing = false;

  function say(message) {
    if (statusLine) statusLine.textContent = message;
  }

  /** The preview size: fit the cover's aspect into the stage box. */
  function previewBox() {
    const size = SIZES[state.size];
    const box = stage.parentElement.getBoundingClientRect();
    const scale = Math.min(box.width / size.w, box.height / size.h, 1);
    return { w: Math.max(240, Math.round(size.w * scale)), h: Math.max(240, Math.round(size.h * scale)) };
  }

  function renderPreview() {
    if (drawing) return;
    drawing = true;
    requestAnimationFrame(() => {
      drawing = false;
      const { w, h } = previewBox();
      if (stage.width !== w || stage.height !== h) {
        stage.width = w;
        stage.height = h;
      }
      drawCover(stageCtx, state, w, h);
      const size = SIZES[state.size];
      if (sizeNote) sizeNote.textContent = `${size.label} · preview ${w} × ${h}`;
    });
  }

  function refreshPanelLabel() {
    const count = panelCount(state.layout);
    if (panelLabel) {
      panelLabel.textContent = `Panel ${state.selected + 1} of ${count} — drag the preview to pan, scroll to zoom`;
    }
    if (zoomRange) zoomRange.value = String(Math.round((state.panels[state.selected].zoom || 1) * 100));
  }

  function pickLayout(name) {
    if (!LAYOUTS[name]) return;
    state.layout = name;
    if (state.selected >= panelCount(name)) state.selected = 0;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === name));
    refreshPanelLabel();
    renderPreview();
  }

  function pickGrade(name) {
    if (!GRADES[name]) return;
    state.grade = name;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === name));
    renderPreview();
  }

  function pickSize(name) {
    if (!SIZES[name]) return;
    state.size = name;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === name));
    renderPreview();
  }

  /** Put an image into one panel slot, or into every slot when linked. */
  function setPanelPhoto(index, image) {
    if (state.samePhoto) {
      state.panels.forEach((panel) => {
        panel.image = image;
        panel.panX = 0;
        panel.panY = 0;
        panel.zoom = 1;
      });
    } else {
      const panel = state.panels[index];
      panel.image = image;
      panel.panX = 0;
      panel.panY = 0;
      panel.zoom = 1;
    }
    renderPreview();
  }

  async function loadSample(name) {
    try {
      const image = await readImage(`samples/${name}.jpg`);
      setPanelPhoto(state.selected, image);
      say(`Loaded sample photo “${name}”.`);
    } catch {
      say(`Could not load the sample photo “${name}”.`);
    }
  }

  async function loadFile(file, index) {
    if (!file || !file.type.startsWith('image/')) {
      say('Pick an image file (JPEG or PNG).');
      return;
    }
    try {
      const image = await readImage(file);
      setPanelPhoto(index, image);
      say(`Loaded “${file.name}” into panel ${index + 1}.`);
    } catch {
      say(`Could not read “${file.name}”.`);
    }
  }

  /** Which panel sits under a point on the stage, in stage pixels. */
  function panelAt(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * stage.width;
    const y = ((clientY - rect.top) / rect.height) * stage.height;
    const shapes = panelShapes(state.layout, stage.width, stage.height);
    for (let i = shapes.panels.length - 1; i >= 0; i--) {
      if (insidePolygon(shapes.panels[i], x, y)) return i;
    }
    return -1;
  }

  // --- pointer: click selects a panel, drag pans its photo -----------------
  let drag = null;
  stage.addEventListener('pointerdown', (event) => {
    const hit = panelAt(event.clientX, event.clientY);
    if (hit < 0) return;
    state.selected = hit;
    refreshPanelLabel();
    drag = { x: event.clientX, y: event.clientY, panX: state.panels[hit].panX, panY: state.panels[hit].panY };
    stage.setPointerCapture(event.pointerId);
    stage.style.cursor = 'grabbing';
  });
  stage.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = stage.getBoundingClientRect();
    const panel = state.panels[state.selected];
    panel.panX = drag.panX + (event.clientX - drag.x) / rect.width;
    panel.panY = drag.panY + (event.clientY - drag.y) / rect.height;
    renderPreview();
  });
  const endDrag = () => {
    drag = null;
    stage.style.cursor = 'grab';
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selected];
    const next = (panel.zoom || 1) * (event.deltaY < 0 ? 1.08 : 0.93);
    panel.zoom = Math.min(3, Math.max(1, next));
    refreshPanelLabel();
    renderPreview();
  }, { passive: false });

  // --- controls ------------------------------------------------------------
  document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => pickLayout(b.dataset.layout)));
  document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => pickGrade(b.dataset.grade)));
  document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => pickSize(b.dataset.size)));
  document.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => loadSample(b.dataset.sample)));

  const captionInput = document.getElementById('captionInput');
  const taglineInput = document.getElementById('taglineInput');
  const kickerInput = document.getElementById('kickerInput');
  if (captionInput) captionInput.addEventListener('input', () => { state.caption = captionInput.value; renderPreview(); });
  if (taglineInput) taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; renderPreview(); });
  if (kickerInput) kickerInput.addEventListener('input', () => { state.kicker = kickerInput.value; renderPreview(); });

  const samePhoto = document.getElementById('samePhoto');
  if (samePhoto) {
    samePhoto.addEventListener('change', () => {
      state.samePhoto = samePhoto.checked;
      say(state.samePhoto ? 'One photo fills every panel.' : 'Each panel takes its own photo.');
    });
  }

  [0, 1, 2].forEach((i) => {
    const input = document.getElementById(`file${i}`);
    if (input) input.addEventListener('change', () => loadFile(input.files[0], i));
  });

  if (zoomRange) {
    zoomRange.addEventListener('input', () => {
      state.panels[state.selected].zoom = Number(zoomRange.value) / 100;
      renderPreview();
    });
  }
  const resetPan = document.getElementById('resetPan');
  if (resetPan) {
    resetPan.addEventListener('click', () => {
      const panel = state.panels[state.selected];
      panel.panX = 0;
      panel.panY = 0;
      panel.zoom = 1;
      refreshPanelLabel();
      renderPreview();
      say(`Panel ${state.selected + 1} reset.`);
    });
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const size = SIZES[state.size];
      const off = document.createElement('canvas');
      off.width = size.w;
      off.height = size.h;
      drawCover(off.getContext('2d'), state, size.w, size.h);
      off.toBlob((blob) => {
        if (!blob) {
          say('Export failed — try again.');
          return;
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `vice-sunset-split-${state.size}-${size.w}x${size.h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        say(`Exported ${size.w} × ${size.h} PNG.`);
      }, 'image/png');
    });
  }

  window.addEventListener('resize', renderPreview);

  // --- boot ----------------------------------------------------------------
  const ready = loadViceFonts()
    .then((n) => {
      fontsReady = n > 0;
      say(fontsReady ? 'Condensed type loaded. Pick a sample photo to begin.' : 'Using the system condensed stack.');
      return loadSample('pier');
    })
    .then(() => {
      refreshPanelLabel();
      renderPreview();
    })
    .catch(() => {
      refreshPanelLabel();
      renderPreview();
    });

  return {
    state,
    ready,
    renderPreview,
    loadSample,
    setCaption(text) {
      state.caption = text;
      if (captionInput) captionInput.value = text;
      renderPreview();
    },
    setGrade: pickGrade,
    setLayout: pickLayout,
    setSize: pickSize,
  };
}
