// Saves the whole world as one picture per zoom, with no animals, people or menus.
//
//   node scripts/tools/map-shots.mjs [theme]        theme is optional, e.g. halloween
//
// Files go to docs/maps/ as world-<theme>-1x.png (2432 x 928, one pixel per art pixel),
// and -2x / -4x (each art pixel drawn 2 or 4 times as big, still crisp).
// The game must be running: `npm run dev` (port 8190).

import { mkdirSync } from 'node:fs';
import { openGame } from './browser.mjs';

const theme = process.argv[2] || '';
const name = theme || 'normal';
mkdirSync('docs/maps', { recursive: true });

const TILE = 16;
const WORLD = { w: 198 * TILE, h: 58 * TILE }; // the outdoor world (198 x 58 since Pumpkin Hollow)

for (const zoom of [1, 2, 4]) {
  const query = `?overview&clean${theme ? `&theme=${theme}` : ''}`;
  const game = await openGame(query, { width: WORLD.w * zoom, height: WORLD.h * zoom });
  await game.wait(2500);
  const info = await game.eval(() => {
    const s = window.__GAME_DEBUG__.scene;
    return { zoom: s.cameras.main.zoom, canvas: [s.game.canvas.width, s.game.canvas.height] };
  });
  const file = `docs/maps/world-${name}-${zoom}x.png`;
  await game.shot(file);
  console.log(file, JSON.stringify(info), game.problems.length ? game.problems : 'no problems');
  await game.close();
}
