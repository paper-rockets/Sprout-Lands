import './game.css';
import { loadContent } from './engine/content/loadContent.js';
import { startGame } from './engine/boot/startGame.js';
import { installCursors } from './engine/boot/cursors.js';

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** The pixel fonts must be ready before the first text is drawn, or it would use a plain font. */
async function loadFonts(art) {
  const fonts = Object.values(art.ui.fonts).map((f) => new FontFace(f.family, `url(${f.file})`).load());
  try {
    (await Promise.all(fonts)).forEach((font) => document.fonts.add(font));
  } catch (err) {
    console.warn('The pixel fonts could not be loaded:', err);
  }
}

// The built game keeps an offline copy of itself (sw.js, written by scripts/tools/pwa-plugin.mjs),
// so it can be installed on a tablet and played without internet. While developing there is
// no offline copy, and any left over from a build is removed so it never serves stale files.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Offline play is not available:', err)));
  } else {
    navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => r.unregister()));
  }
}

async function boot() {
  const content = loadContent();
  document.title = content.config.title;
  if (!hasWebGL()) {
    document.body.classList.add('no-webgl');
    return;
  }
  await loadFonts(content.art);
  window.__SPROUT__ = startGame(content, document.getElementById('game'));
  installCursors(content.art, window.__SPROUT__.canvas);
}

boot();
