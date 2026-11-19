// Fixed scenes for screenshots, driven by the page's query string:
//
//   ?shot=cover&photo=pier&caption=Sunset%20Heist
//       the cover alone, edge to edge, at the window's size.
//   ?shot=editor&photo=boulevard&caption=Boulevard%20Queen
//       the full editor with that sample photo already loaded.
//
// Either way window.__shotReady is set once the scene has painted twice,
// so a screenshot tool can wait on it instead of guessing a delay.

import { SIZES, drawCover, loadViceFonts } from './vice.js';
import { bootEditor } from './editor.js';

function markReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

async function paintCoverScene(query) {
  document.body.classList.add('shot-cover');
  const caption = query.get('caption') || 'Sunset Heist';
  const photo = query.get('photo') || 'pier';
  const grade = query.get('grade') || 'sunset';
  const layout = query.get('layout') || 'split';
  const panY = Number(query.get('pan') || '0') || 0;
  await loadViceFonts();
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('sample photo failed to load'));
    img.src = `samples/${photo}.jpg`;
  });
  const canvas = document.createElement('canvas');
  canvas.id = 'shotCanvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const panels = [0, 1, 2].map((i) => ({ image, panX: 0, panY: panY - i * 0.02, zoom: 1 }));
  // A second panel photo for the triptych / hero scenes keeps every panel full.
  const state = {
    layout,
    grade,
    caption,
    tagline: 'One last job under the neon sky',
    kicker: 'Grand Sunset',
    panels,
  };
  drawCover(canvas.getContext('2d'), state, canvas.width, canvas.height);
  markReady();
}

async function paintEditorScene(query) {
  const api = bootEditor();
  const caption = query.get('caption');
  const photo = query.get('photo') || 'boulevard';
  const grade = query.get('grade');
  const layout = query.get('layout');
  const size = query.get('size');
  await api.ready;
  if (layout) api.setLayout(layout);
  if (grade) api.setGrade(grade);
  if (size && SIZES[size]) api.setSize(size);
  if (caption) api.setCaption(caption);
  await api.loadSample(photo);
  api.renderPreview();
  markReady();
}

export async function runShot() {
  const query = new URLSearchParams(window.location.search);
  const shot = query.get('shot') || 'editor';
  if (shot === 'cover') {
    await paintCoverScene(query);
  } else {
    await paintEditorScene(query);
  }
}
