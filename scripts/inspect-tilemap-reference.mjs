import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referenceRoot = path.join(
  projectRoot,
  'Sprout-Lands-Tilemap-0.2.0',
  'Sprout-Lands-Tilemap-0.2.0',
  'addons',
  'sprout_lands_tilemap',
);
const baseScene = path.join(referenceRoot, 'base', 'scenes', 'sprout_lands_tile_map.tscn');
const exampleScene = path.join(referenceRoot, 'examples', 'scenes', 'harvest_hill_example.tscn');
const quiet = process.argv.includes('--quiet');
const verifyRuntime = process.argv.includes('--verify-runtime');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(entryPath));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function assertReferenceExists() {
  try {
    await stat(referenceRoot);
  } catch {
    throw new Error(`Development tilemap reference is missing: ${referenceRoot}`);
  }
}

async function findRuntimeLeaks() {
  const runtimeRoots = [path.join(projectRoot, 'src'), path.join(projectRoot, 'public')];
  const forbiddenFragments = [
    'Sprout-Lands-Tilemap-0.2.0',
    'sprout_lands_tilemap/assets',
    'sprout_lands_tilemap\\assets',
  ];
  const textExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.ts']);
  const leaks = [];

  for (const root of runtimeRoots) {
    for (const file of await walk(root)) {
      const relative = path.relative(projectRoot, file);
      if (file.startsWith(referenceRoot)) {
        leaks.push(`${relative} is inside the non-commercial reference package`);
        continue;
      }
      if (!textExtensions.has(path.extname(file).toLowerCase())) continue;
      const text = await readFile(file, 'utf8');
      for (const fragment of forbiddenFragments) {
        if (text.includes(fragment)) {
          leaks.push(`${relative} references restricted source: ${fragment}`);
        }
      }
    }
  }

  return leaks;
}

await assertReferenceExists();

const leaks = await findRuntimeLeaks();
if (leaks.length > 0) {
  throw new Error(`Restricted tilemap assets crossed into runtime:\n- ${leaks.join('\n- ')}`);
}

if (verifyRuntime && quiet) process.exit(0);

const [baseText, exampleText] = await Promise.all([
  readFile(baseScene, 'utf8'),
  readFile(exampleScene, 'utf8'),
]);

const layerPattern = /^\[node name="([^"]+)"[^\]]*(?:type="TileMapLayer"|parent="\." index="\d+")[^\]]*\]$/gm;
const baseLayers = [...baseText.matchAll(layerPattern)].map((match) => match[1]);
const exampleLayers = [...exampleText.matchAll(layerPattern)].map((match) => match[1]);
const texturePattern = /path="res:\/\/addons\/sprout_lands_tilemap\/assets\/([^"]+\.png)"/g;
const textureRelatives = [...new Set([...baseText.matchAll(texturePattern)].map((match) => match[1]))];

const textures = [];
for (const relative of textureRelatives) {
  const filePath = path.join(referenceRoot, 'assets', ...relative.split('/'));
  const buffer = await readFile(filePath);
  textures.push({
    file: relative,
    ...pngDimensions(buffer),
  });
}

console.log('Sprout Lands tilemap development reference');
console.log('License boundary: Free Basic art is reference-only and must not enter src/ or public/.');
console.log('Runtime boundary check: PASS');
console.log(`Grid: 16 x 16 pixels`);
console.log(`Base layers: ${baseLayers.join(' -> ')}`);
console.log(`Example layers: ${exampleLayers.join(' -> ')}`);
console.log('Reference atlases:');
for (const texture of textures) {
  console.log(`- ${texture.file}: ${texture.width}x${texture.height}`);
}
