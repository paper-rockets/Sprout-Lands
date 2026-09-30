/**
 * Gathers the content package (src/content/<package>) into one object.
 * The engine never names a specific game; everything personal lives in the package.
 * In development the content is also checked (checkContent.js) and any problems are
 * printed in the browser console.
 */

import config from '@content/game.config.json';
import art from '@content/art.json';
import world from '@content/world/world.json';
import strings from '@content/text/strings.json';
import characterList from '@content/characters.json';
import { assembleContent } from './assembleContent.js';
import { checkContent } from './checkContent.js';

const regionFiles = import.meta.glob('@content/world/regions/*.json', { eager: true, import: 'default' });
const roomFiles = import.meta.glob('@content/world/rooms/*.json', { eager: true, import: 'default' });
const questFiles = import.meta.glob('@content/quests/*.quest.json', { eager: true, import: 'default' });
const dialogueFiles = import.meta.glob('@content/dialogue/*.json', { eager: true, import: 'default' });
const rewardFiles = import.meta.glob('@content/rewards.json', { eager: true, import: 'default' });
const cookingFiles = import.meta.glob('@content/cooking.json', { eager: true, import: 'default' });

export function loadContent() {
  const content = assembleContent({ config, art, world, strings, characterList, regionFiles, roomFiles, questFiles, dialogueFiles, rewardFiles, cookingFiles });
  if (import.meta.env?.DEV) {
    try {
      const report = checkContent(content);
      for (const problem of report.errors) console.error(`[content] ${problem}`);
      for (const note of report.warnings) console.warn(`[content] ${note}`);
    } catch (err) {
      console.error('[content] the content check itself failed:', err);
    }
  }
  return content;
}
