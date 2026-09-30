// Loads a content package from disk in Node, exactly the way the game does in the browser
// (both use src/engine/content/assembleContent.js).
//
//   import { loadContentFromDisk } from './node-content.mjs';
//   const content = loadContentFromDisk();                    // src/content/starter-adventure
//   const other = loadContentFromDisk('emmas-adventure');     // another gift game

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleContent } from '../../src/engine/content/assembleContent.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** { "file path": parsed JSON } for every file in `dir` whose name ends with `suffix`. */
function readAll(dir, suffix) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).sort()) {
    if (name.endsWith(suffix)) out[path.join(dir, name)] = readJson(path.join(dir, name));
  }
  return out;
}

export function loadContentFromDisk(pkg = process.env.CONTENT_PACKAGE || 'starter-adventure') {
  const dir = path.join(ROOT, 'src', 'content', pkg);
  const rewards = path.join(dir, 'rewards.json');
  const cooking = path.join(dir, 'cooking.json');
  return assembleContent({
    config: readJson(path.join(dir, 'game.config.json')),
    art: readJson(path.join(dir, 'art.json')),
    world: readJson(path.join(dir, 'world', 'world.json')),
    strings: readJson(path.join(dir, 'text', 'strings.json')),
    characterList: readJson(path.join(dir, 'characters.json')),
    regionFiles: readAll(path.join(dir, 'world', 'regions'), '.json'),
    roomFiles: readAll(path.join(dir, 'world', 'rooms'), '.json'),
    questFiles: readAll(path.join(dir, 'quests'), '.quest.json'),
    dialogueFiles: readAll(path.join(dir, 'dialogue'), '.json'),
    rewardFiles: fs.existsSync(rewards) ? { [rewards]: readJson(rewards) } : {},
    cookingFiles: fs.existsSync(cooking) ? { [cooking]: readJson(cooking) } : {}
  });
}
