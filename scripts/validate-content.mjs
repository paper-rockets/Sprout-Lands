import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function validateContentPackage(contentDir = path.join(rootDir, 'src', 'content', 'starter-adventure')) {
  const errors = [];

  // 1. Validate game.config.json
  const configPath = path.join(contentDir, 'game.config.json');
  if (!fs.existsSync(configPath)) {
    errors.push(`Missing game.config.json at ${configPath}`);
    return { valid: false, errors };
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    errors.push(`game.config.json is not valid JSON: ${err.message}`);
    return { valid: false, errors };
  }

  const requiredConfigKeys = ['gameId', 'schemaVersion', 'title', 'engine', 'world', 'quests', 'pwa'];
  for (const key of requiredConfigKeys) {
    if (!config[key]) {
      errors.push(`game.config.json missing required key: "${key}"`);
    }
  }

  if (config.engine && config.engine.renderType !== 'WEBGL') {
    errors.push(`engine.renderType must be explicitly set to 'WEBGL', found '${config.engine?.renderType}'`);
  }

  // 2. Validate theme.json
  const themePath = path.join(contentDir, 'theme.json');
  if (!fs.existsSync(themePath)) {
    errors.push(`Missing theme.json at ${themePath}`);
  } else {
    try {
      const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'));
      if (!theme.tokens?.color || !theme.tokens?.typography) {
        errors.push('theme.json must specify tokens.color and tokens.typography');
      }
    } catch (err) {
      errors.push(`theme.json parse error: ${err.message}`);
    }
  }

  // 3. Validate characters.json
  const charsPath = path.join(contentDir, 'characters.json');
  let charIds = new Set();
  if (!fs.existsSync(charsPath)) {
    errors.push(`Missing characters.json at ${charsPath}`);
  } else {
    try {
      const charsData = JSON.parse(fs.readFileSync(charsPath, 'utf8'));
      if (!Array.isArray(charsData.characters) || charsData.characters.length === 0) {
        errors.push('characters.json must contain a non-empty "characters" array');
      } else {
        charsData.characters.forEach((char, index) => {
          if (!char.id || !char.name || !char.sheetPath) {
            errors.push(`characters[${index}] missing required properties (id, name, sheetPath)`);
          }
          charIds.add(char.id);
          // Check file existence in public/
          const publicAssetPath = path.join(rootDir, 'public', char.sheetPath);
          if (!fs.existsSync(publicAssetPath)) {
            errors.push(`Character asset sheet does not exist: ${publicAssetPath}`);
          }
        });
      }
    } catch (err) {
      errors.push(`characters.json parse error: ${err.message}`);
    }
  }

  // 4. Validate world.graph.json
  const graphRelPath = config.world?.graphFile || './world/world.graph.json';
  const graphPath = path.resolve(contentDir, graphRelPath);
  let regionIds = new Set();
  if (!fs.existsSync(graphPath)) {
    errors.push(`World graph not found at ${graphPath}`);
  } else {
    try {
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      if (!Array.isArray(graph.regions) || graph.regions.length === 0) {
        errors.push('world.graph.json must have a non-empty "regions" array');
      } else {
        for (const reg of graph.regions) {
          regionIds.add(reg.id);
        }
      }
    } catch (err) {
      errors.push(`world.graph.json parse error: ${err.message}`);
    }
  }

  // Check startRegionId
  if (config.world?.startRegionId && !regionIds.has(config.world.startRegionId)) {
    errors.push(`startRegionId "${config.world.startRegionId}" does not exist in world graph`);
  }

  // 5. Validate Quests
  if (Array.isArray(config.quests)) {
    for (const qRel of config.quests) {
      const qPath = path.resolve(contentDir, qRel);
      if (!fs.existsSync(qPath)) {
        errors.push(`Referenced quest file does not exist: ${qPath}`);
      } else {
        try {
          const quest = JSON.parse(fs.readFileSync(qPath, 'utf8'));
          if (!quest.questId || !quest.title || !Array.isArray(quest.objectives)) {
            errors.push(`Invalid quest schema in ${qRel}`);
          }
        } catch (err) {
          errors.push(`Error parsing ${qRel}: ${err.message}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      gameId: config?.gameId,
      title: config?.title,
      characterCount: charIds.size,
      regionCount: regionIds.size,
      questCount: config?.quests?.length || 0
    }
  };
}

// Direct CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('Validating starter-adventure content package...');
  const res = validateContentPackage();
  if (res.valid) {
    console.log('Content package is VALID!');
    console.log(JSON.stringify(res.summary, null, 2));
    process.exit(0);
  } else {
    console.error('Content package validation FAILED:');
    res.errors.forEach(err => console.error(` - ${err}`));
    process.exit(1);
  }
}
