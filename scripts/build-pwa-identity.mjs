import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function generatePwaIdentity(contentDir = path.join(rootDir, 'src', 'content', 'starter-adventure'), outputDir = path.join(rootDir, 'public')) {
  const configPath = path.join(contentDir, 'game.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`game.config.json not found at ${configPath}`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const gameId = config.gameId || 'default-adventure';
  const pwa = config.pwa || {};

  const manifest = {
    id: `/${gameId}/`,
    name: pwa.name || config.title || 'Sprout Lands Adventure',
    short_name: pwa.shortName || config.shortTitle || 'Adventure',
    description: config.description || 'Personalized adventure game',
    start_url: pwa.startUrl || './index.html',
    display: 'standalone',
    orientation: 'landscape',
    theme_color: pwa.themeColor || '#33691e',
    background_color: pwa.backgroundColor || '#19354e',
    icons: [
      {
        src: 'assets/characters/capybara-natural-walk-8dir-3frame-128x48.png',
        sizes: '128x48',
        type: 'image/png'
      }
    ]
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return { manifest, manifestPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { manifestPath } = generatePwaIdentity();
  console.log(`Generated namespaced PWA manifest at ${manifestPath}`);
}
