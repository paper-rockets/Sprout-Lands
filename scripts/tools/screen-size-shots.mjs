// Pictures of every screen at phone, tablet and PC sizes, plus a check for things that are
// cut off by the screen edge or too small to tap (dev server must be running).
//
//   node scripts/tools/screen-size-shots.mjs [folder]      (default: map-drafts/sizes)
//
// Prints "EDGE" lines (something sticks out of the screen) and "SMALL" lines (a button smaller
// than MIN_TAP screen pixels), then one picture per screen per size.

import { mkdirSync } from 'node:fs';
import { openGame } from './browser.mjs';

const out = process.argv[2] || 'map-drafts/sizes';
mkdirSync(out, { recursive: true });
const MIN_TAP = 40; // screen pixels

const SIZES = [
  { name: 'phone', width: 1089, height: 490 },
  { name: 'tablet', width: 1280, height: 800 },
  { name: 'pc', width: 1920, height: 1080 }
];

/** Everything visible in the UI scene: out-of-screen pieces and small tap targets. */
function audit() {
  const ui = window.__UI_DEBUG__;
  const s = ui.scaleFactor;
  const found = [];
  const label = (o) => o.text ? `text "${String(o.text).slice(0, 24).replace(/\n/g, ' ')}"` : `${o.type}${o.frame?.texture?.key ? ` ${o.frame.texture.key}` : ''}`;
  const walk = (list, parentVisible) => {
    for (const o of list) {
      const vis = parentVisible && o.visible !== false && (o.alpha ?? 1) > 0.01;
      if (!vis) continue;
      if (o.list) walk(o.list, vis);
      if (o.type === 'Container' || !o.getBounds) continue;
      const b = o.getBounds();
      if (b.width <= 0 || b.height <= 0) continue;
      // Full-screen dimmers and backdrops are allowed to go past the edge.
      if (b.width >= ui.uiW - 1 && b.height >= ui.uiH - 1) continue;
      if (b.x < -0.5 || b.y < -0.5 || b.right > ui.uiW + 0.5 || b.bottom > ui.uiH + 0.5) {
        found.push(`EDGE  ${label(o)} at ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)} (screen ${ui.uiW}x${ui.uiH})`);
      }
    }
  };
  walk(ui.children.list, true);
  // Tap targets: every interactive thing, by its hit size on the real screen.
  for (const o of ui.input.manager ? ui.input._list : []) {
    let vis = true;
    for (let p = o; p; p = p.parentContainer) if (p.visible === false) vis = false;
    if (!vis || !o.input?.enabled) continue;
    const ha = o.input.hitArea;
    const m = o.getWorldTransformMatrix();
    const w = (ha?.width ?? o.width) * Math.abs(m.scaleX) * s;
    const h = (ha?.height ?? o.height) * Math.abs(m.scaleY) * s;
    if (Math.min(w, h) < 40) found.push(`SMALL ${label(o)} ${Math.round(w)}x${Math.round(h)} px at ${Math.round(m.tx)},${Math.round(m.ty)}`);
  }
  return { scale: s, uiW: ui.uiW, uiH: ui.uiH, found };
}

async function report(g, size, screen) {
  const r = await g.eval(audit);
  console.log(`-- ${size.name} ${screen} (zoom ${r.scale}, ${r.uiW}x${r.uiH})`);
  for (const f of r.found) console.log(`   ${f}`);
  await g.shot(`${out}/${size.name}-${screen}.png`);
}

const only = process.argv[3];
for (const size of SIZES) {
  if (only && only !== size.name) continue;
  // Start screen (first run).
  let g = await openGame('', { width: size.width, height: size.height, startScreen: true });
  await g.wait(1800);
  await report(g, size, 'start');
  await g.close();

  // The world with a full item bar, then the speech box, journal, map, oven, shop, ending.
  g = await openGame('?room=baker-house', { width: size.width, height: size.height });
  await g.wait(2500);
  await g.eval(() => {
    const { scene } = window.__GAME_DEBUG__;
    scene.session.change((st) => {
      Object.assign(st.bag, { 'veg-wheat': 3, egg: 2, 'egg-blue': 1, apple: 2, raspberry: 1, honey: 1, 'veg-carrot': 2, 'food-toast': 1, 'food-bread': 2, seeds: 2 });
      st.coins = 128;
    });
  });
  await g.hold('ArrowUp', 350);
  await g.wait(400);
  await report(g, size, 'itembar');
  await g.eval(() => window.__UI_DEBUG__.say([
    { speaker: 'Baker Bun', text: 'Hello {name}! My oven is nice and warm today. Bring me wheat and eggs and we can bake a big fluffy cake together for the village picnic by the pond!' }
  ]));
  await g.wait(2500);
  await report(g, size, 'speech');
  await g.eval(() => window.__UI_DEBUG__.dialogue.close());
  await g.wait(300);
  await g.eval(() => window.__UI_DEBUG__.open('journal'));
  await g.wait(500);
  await report(g, size, 'journal');
  await g.eval(() => { const p = window.__UI_DEBUG__.modal; p.select(p.pages.length - 1); });
  await g.wait(400);
  await report(g, size, 'treats');
  await g.eval(() => window.__UI_DEBUG__.open('map'));
  await g.wait(700);
  await report(g, size, 'map');
  await g.eval(() => window.__UI_DEBUG__.open('cook'));
  await g.wait(500);
  await report(g, size, 'oven');
  await g.eval(() => window.__UI_DEBUG__.open('shop', { data: { shop: 'bakery' } }));
  await g.wait(500);
  await report(g, size, 'shop');
  await g.eval(() => window.__UI_DEBUG__.open('settings'));
  await g.wait(500);
  await report(g, size, 'settings');
  await g.eval(() => window.__UI_DEBUG__.open('ending'));
  await g.wait(2500);
  await report(g, size, 'ending');
  if (g.problems.length) console.log(g.problems.join('\n'));
  await g.close();
}
