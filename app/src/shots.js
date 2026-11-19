// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded; ?shot=cover shows the cover alone at the requested export size.
// Layout, grade, size, caption and sub-caption come from the query string.
// window.__shotReady is set once the cover has been painted.
export async function runShot(shot, query, api) {
  api.setLayout(query.get('layout') ?? 'trio');
  api.setGrade(query.get('grade') ?? 'sunset');
  api.setSize(query.get('size') ?? '1080x1080');
  api.setCaption(
    query.get('caption') ?? 'VICE SUNSET',
    query.get('sub') ?? 'ONE LAST RIDE DOWN OCEAN DRIVE',
  );
  await api.loadSamplePhotos();
  // Frame the people, not the middle of the photo: the pier photo's man stands
  // upper-left, the boulevard photo's woman upper-centre, so nudge each panel's
  // photo towards its subject. The middle panel gets a slight zoom for depth.
  api.state.panels.forEach((panel, i) => {
    panel.zoom = i === 1 ? 1.12 : 1.02;
    if (panel.photo === 1) { // boulevard: woman, face at the top
      panel.dx = 0.02;
      panel.dy = 0.06;
    } else { // pier: man, face upper-left
      panel.dx = 0.07;
      panel.dy = 0.02;
    }
  });
  if (shot === 'cover') document.body.classList.add('shot-cover');
  api.redraw();
  try { await document.fonts.ready; } catch { /* fall back */ }
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
