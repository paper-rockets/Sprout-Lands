// Makes the built game installable and playable offline (only for `npm run build`).
//
// After Vite has written dist/, this writes:
//   manifest.webmanifest  the game's name, colours and icons (from game.config.json "pwa"),
//                         so a tablet can add it to the home screen;
//   sw.js                 the offline helper. It keeps a copy of every file of this build
//                         (LAZY files, none at the moment, are kept the first time they are used).
// The helper's storage is named after the gameId plus a fingerprint of this build, so a
// new build replaces the old copy, and it only ever deletes its own game's old copies.
//
// Icons come from public/icons (made by scripts/tools/make-icons.py).

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LAZY = [/^assets\/music\//]; // files kept when first used instead of at install (the music: 8 tunes, about 6 MB)
const SKIP = [/\.map$/, /^sw\.js$/];

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name);
    return d.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

export function pwaPlugin({ contentDir }) {
  let outDir = 'dist';
  return {
    name: 'sprout-pwa',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      const tags = '  <link rel="manifest" href="./manifest.webmanifest" />\n  <link rel="apple-touch-icon" href="./icons/apple-touch-icon.png" />\n  <link rel="icon" type="image/png" href="./icons/icon-192.png" />\n';
      return html.replace('  <link rel="icon" href="data:," />\n', '').replace('</head>', `${tags}</head>`);
    },
    writeBundle() {
      const config = JSON.parse(fs.readFileSync(path.join(contentDir, 'game.config.json'), 'utf8'));
      const pwa = config.pwa || {};
      const manifest = {
        id: `./?game=${config.gameId}`,
        name: pwa.name || config.title,
        short_name: pwa.shortName || config.shortTitle || config.title,
        description: config.description || pwa.name || config.title,
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'landscape',
        theme_color: pwa.themeColor || '#9bd4c3',
        background_color: pwa.backgroundColor || '#9bd4c3',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      };
      fs.writeFileSync(path.join(outDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

      const files = walk(outDir).filter((f) => !SKIP.some((re) => re.test(f))).sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(fs.readFileSync(path.join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const precache = ['./', ...files.filter((f) => !LAZY.some((re) => re.test(f))).map((f) => `./${f}`)];
      const sw = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'sw-template.js'), 'utf8')
        .replace('__PREFIX__', JSON.stringify(`${config.gameId}-`))
        .replace('__VERSION__', JSON.stringify(version))
        .replace('__PRECACHE__', JSON.stringify(precache));
      fs.writeFileSync(path.join(outDir, 'sw.js'), sw);
      const lazy = files.length + 1 - precache.length;
      console.log(`\n[pwa] offline copy ${version}: ${precache.length} files kept at install, ${lazy} songs kept when first played`);
    }
  };
}
