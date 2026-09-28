import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const premiumRoot = path.join(
  projectRoot,
  'Sprout Lands - UI Pack - Premium pack',
  'Sprout Lands - UI Pack - Premium pack',
);
const outputRoot = path.join(projectRoot, 'public', 'assets', 'ui');

const assetFamilies = {
  atlases: [
    ['UI Sprites/ALL UI ASSETS on one sheet.png', 'all-ui-assets.png'],
  ],
  buttons: [
    ['UI Sprites/buttons/Icon Buttons/Icon Buttons Spritesheet.png', 'icon-buttons.png'],
    ['UI Sprites/buttons/round/medium colored round buttons.png', 'round-medium.png'],
    ['UI Sprites/buttons/round/small colored round buttons.png', 'round-small.png'],
    ['UI Sprites/buttons/square/Small Square Buttons.png', 'square-small.png'],
    ['UI Sprites/buttons/square/Square Buttons 19x26.png', 'square-19x26.png'],
    ['UI Sprites/buttons/square/Square Buttons 26x19.png', 'square-26x19.png'],
    ['UI Sprites/buttons/square/Square Buttons 26x26.png', 'square-26x26.png'],
    ['UI Sprites/Other UI sprites/UI Big Play Button.png', 'play-large.png'],
    ['UI Sprites/Other UI sprites/UI Settings Buttons.png', 'settings-buttons.png'],
  ],
  cursors: [
    ['UI Sprites/Mouse sprites/Arrow Mouse icon 1.png', 'arrow-1.png'],
    ['UI Sprites/Mouse sprites/Arrow Mouse icon 2.png', 'arrow-2.png'],
    ['UI Sprites/Mouse sprites/Arrow Mouse icon 3.png', 'arrow-3.png'],
    ['UI Sprites/Mouse sprites/Catpaw holding Mouse icon.png', 'catpaw-holding.png'],
    ['UI Sprites/Mouse sprites/Catpaw Mouse icon.png', 'catpaw.png'],
    ['UI Sprites/Mouse sprites/Catpaw pointing Mouse icon.png', 'catpaw-pointing.png'],
    ['UI Sprites/Mouse sprites/Triangle Mouse icon 1.png', 'triangle-1.png'],
    ['UI Sprites/Mouse sprites/Triangle Mouse icon 2.png', 'triangle-2.png'],
    ['UI Sprites/Mouse sprites/Triangle Mouse icon 3.png', 'triangle-3.png'],
    ['UI Sprites/Mouse sprites/Triangle small Mouse icon 1.png', 'triangle-small-1.png'],
    ['UI Sprites/Mouse sprites/Triangle small Mouse icon 2.png', 'triangle-small-2.png'],
    ['UI Sprites/Mouse sprites/Triangle small Mouse icon 3.png', 'triangle-small-3.png'],
  ],
  dialogue: [
    ['UI Sprites/Dialouge UI/dialog box.png', 'dialog-box-modular.png'],
    ['UI Sprites/Dialouge UI/dialog box big.png', 'dialog-box-big.png'],
    ['UI Sprites/Dialouge UI/dialog box medium.png', 'dialog-box-medium.png'],
    ['UI Sprites/Dialouge UI/dialog box small.png', 'dialog-box-small.png'],
    ['UI Sprites/Dialouge UI/Premade dialog box  big.png', 'dialog-premade-big.png'],
    ['UI Sprites/Dialouge UI/Premade dialog box medium.png', 'dialog-premade-medium.png'],
    ['UI Sprites/Dialouge UI/Premade dialog box small.png', 'dialog-premade-small.png'],
    ['UI Sprites/Dialouge UI/dialog box character finished talking click to continue indicator - spritesheet .png', 'continue-indicator.png'],
  ],
  emotes: [
    ['emojis/Emoji spritesheet.png', 'emoji-spritesheet.png'],
    ['emojis/tiny emotes.png', 'tiny-emotes.png'],
    ['emojis/speech_bubble_blue.png', 'speech-blue.png'],
    ['emojis/speech_bubble_green.png', 'speech-green.png'],
    ['emojis/speech_bubble_grey.png', 'speech-grey.png'],
    ['emojis/speech_bubble_pink.png', 'speech-pink.png'],
    ['emojis/speech_bubble_purple.png', 'speech-purple.png'],
    ['emojis/speech_bubble_yellow.png', 'speech-yellow.png'],
    ['UI Sprites/Dialouge UI/Emotes/Teemo premium emote animations sprite sheet-export.png', 'character-emotes.png'],
  ],
  hud: [
    ['UI Sprites/Other UI sprites/Stamina circle with black outline sprite sheet .png', 'stamina-black.png'],
    ['UI Sprites/Other UI sprites/Stamina circle with white outline sprite sheet .png', 'stamina-white.png'],
  ],
  icons: [
    ['UI Sprites/Icons/All Icons.png', 'all-icons.png'],
    ['UI Sprites/Icons/white icons.png', 'white-icons.png'],
    ['UI Sprites/Icons/special icons/coins.png', 'coins.png'],
    ['UI Sprites/Icons/special icons/Hearts in wood.png', 'hearts-in-wood.png'],
    ['UI Sprites/Icons/special icons/Hearts.png', 'hearts.png'],
    ['UI Sprites/Icons/special icons/Medium Happines-Sadness icons.png', 'mood-medium.png'],
    ['UI Sprites/Icons/special icons/Small Happines-Sadness icons.png', 'mood-small.png'],
    ['UI Sprites/Icons/special icons/stars in wood.png', 'stars-in-wood.png'],
    ['UI Sprites/Icons/special icons/stars.png', 'stars.png'],
  ],
  inventory: [
    ['emojis/emoji style ui/Inventory_Blocks_Spritesheet.png', 'blocks.png'],
    ['emojis/emoji style ui/Inventory_Herat_Spritesheet.png', 'hearts.png'],
    ['emojis/emoji style ui/Inventory_Light_Herat_Spritesheet.png', 'hearts-light.png'],
    ['emojis/emoji style ui/Inventory_Light_Spritesheet.png', 'slots-light.png'],
    ['emojis/emoji style ui/Inventory_Spritesheet.png', 'slots.png'],
  ],
  menus: [
    ['UI Sprites/Other UI sprites/Setting menu.png', 'settings-panel.png'],
  ],
  navigation: [
    ['UI Sprites/Other UI sprites/Selectors/Selectorst.png', 'selectors.png'],
    ['UI Sprites/Other UI sprites/Selectors/dot_1.png', 'dot-1.png'],
    ['UI Sprites/Other UI sprites/Selectors/dot_2.png', 'dot-2.png'],
    ['UI Sprites/Other UI sprites/Selectors/dot_3.png', 'dot-3.png'],
    ['UI Sprites/Other UI sprites/Selectors/dot_4.png', 'dot-4.png'],
    ['UI Sprites/Other UI sprites/Selectors/dot_5.png', 'dot-5.png'],
    ['UI Sprites/Other UI sprites/Selectors/dot_6.png', 'dot-6.png'],
  ],
  panels: [
    ['UI Sprites/Dialouge UI/Character Backdrop-frame/character_backdrops.png', 'character-backdrops.png'],
  ],
  toggles: [
    ['UI Sprites/Other UI sprites/Xs and check marks/Xs and check marks.png', 'checks-and-crosses.png'],
  ],
  sliders: [
    ['UI Sprites/Other UI sprites/Sliders/Sliders.png', 'sliders.png'],
  ],
  weather: [
    ['emojis/emoji style ui/weather/Thermometer_UI.png', 'thermometer.png'],
    ['emojis/emoji style ui/weather/Thermometer_UI_2.png', 'thermometer-alt.png'],
    ['emojis/emoji style ui/weather/Thermometer_UI_Seperated.png', 'thermometer-parts.png'],
    ['emojis/emoji style ui/weather/Thermometer_UI_Seperated_2.png', 'thermometer-parts-alt.png'],
    ['emojis/emoji style ui/weather/Weather_Icons_Big.png', 'icons-big.png'],
    ['emojis/emoji style ui/weather/Weather_Icons_small.png', 'icons-small.png'],
    ['emojis/emoji style ui/weather/Weather_UI.png', 'weather-ui.png'],
  ],
};

function pngSize(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) {
    throw new Error('Not a valid PNG file');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const manifest = {
  schemaVersion: 1,
  source: 'Cup Nooble — Sprout Lands UI Premium Pack',
  note: 'Curated runtime copies. Keep the paid source pack private and preserve attribution.',
  families: {},
};

for (const [family, assets] of Object.entries(assetFamilies)) {
  const familyOutput = path.join(outputRoot, family);
  await mkdir(familyOutput, { recursive: true });
  manifest.families[family] = [];

  for (const [sourceRelative, outputName] of assets) {
    const sourcePath = path.join(premiumRoot, ...sourceRelative.split('/'));
    const outputPath = path.join(familyOutput, outputName);
    const buffer = await readFile(sourcePath);
    const dimensions = pngSize(buffer);

    await copyFile(sourcePath, outputPath);
    manifest.families[family].push({
      name: path.parse(outputName).name,
      file: `assets/ui/${family}/${outputName}`,
      ...dimensions,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    });
  }
}

const manifestPath = path.join(outputRoot, 'manifest.json');
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const total = Object.values(manifest.families).reduce((sum, assets) => sum + assets.length, 0);
console.log(`Curated ${total} Premium UI assets into ${outputRoot}`);
console.log(`Manifest: ${manifestPath}`);
