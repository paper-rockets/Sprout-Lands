// Plays the menus the way a player would (mouse, touch-style clicks, keyboard) and
// checks that they behave. The game must be running: `npm run dev`.
//
//   node scripts/tools/ui-check.mjs
//
// Prints PASS / FAIL lines and exits with a non-zero code if anything failed.

import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openGame } from './browser.mjs';

let failures = 0;
function check(name, ok, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
}

/** Screen position of the middle of a UI widget, given a path such as "hud.buttons[0]" or "modal.go". */
async function centre(g, path) {
  return g.eval((p) => {
    const ui = window.__UI_DEBUG__;
    const obj = p.split(/[.[\]]+/).filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), ui);
    if (!obj) return null;
    const m = obj.getWorldTransformMatrix();
    return { x: (m.tx + obj.bw / 2) * ui.scaleFactor, y: (m.ty + obj.bh / 2) * ui.scaleFactor };
  }, path);
}

async function clickWidget(g, path) {
  const c = await centre(g, path);
  if (!c) throw new Error(`No widget at ${path}`);
  await g.click(c.x, c.y);
}

const state = (g) => g.eval(() => JSON.parse(JSON.stringify(window.__UI_DEBUG__.session.state)));
const saved = (g) => g.eval(() => {
  const key = window.__UI_DEBUG__.session.store.key;
  return JSON.parse(localStorage.getItem(key) || 'null');
});
const busy = (g) => g.eval(() => window.__UI_DEBUG__.registry.get('uiBusy'));
const modal = (g) => g.eval(() => window.__UI_DEBUG__.modalName);

async function testStartScreen() {
  const g = await openGame('', { startScreen: true });
  await g.wait(1200);
  check('start screen opens on the first run', (await modal(g)) === 'start');
  check('the world stands still behind it', (await busy(g)) === true);
  await g.page.type('.name-input', 'Zoë-Ann');
  const typed = await g.eval(() => document.querySelector('.name-input').value);
  check('accented letters are simplified as they are typed', typed === 'Zoe-Ann', typed);
  await clickWidget(g, 'modal.cards[3]');
  check('tapping a friend chooses them', await g.eval(() => window.__UI_DEBUG__.modal.chosen.id) === 'sky-puppy');
  await clickWidget(g, 'modal.go');
  await g.wait(500);
  const s = await state(g);
  check('the name and friend are saved', s.profile.username === 'Zoe-Ann' && s.profile.avatarId === 'sky-puppy' && s.profile.ready, JSON.stringify(s.profile));
  check('the start screen closes and the game runs', (await modal(g)) === null && (await busy(g)) === false);
  check('the world shows the chosen friend', await g.eval(() => window.__GAME_DEBUG__.scene.player.texture) === 'char-sky-puppy');
  check('the input box is removed', await g.eval(() => !document.querySelector('.name-input')));
  const goal = await g.eval(() => window.__UI_DEBUG__.hud.goalText.text);
  check('the goal note is showing', /EXPLORE|SAY HELLO/.test(goal), goal);
  // Reload: no start screen the second time, same friend.
  await g.page.reload({ waitUntil: 'domcontentloaded' });
  await g.page.waitForFunction(() => window.__UI_DEBUG__?.hud, { timeout: 30000 });
  await g.wait(800);
  check('a saved game skips the start screen', (await modal(g)) === null);
  check('and remembers the friend', await g.eval(() => window.__GAME_DEBUG__.scene.player.texture) === 'char-sky-puppy');
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testEmptyNameUsesDefault() {
  const g = await openGame('', { startScreen: true });
  await g.wait(1000);
  await g.press('Enter');
  await g.wait(400);
  const s = await state(g);
  check('an empty name becomes the default name', s.profile.username === 'Adventurer' && s.profile.ready, JSON.stringify(s.profile));
  await g.close();
}

async function testSettingsWithMouse() {
  const g = await openGame('');
  await g.wait(1200);
  const gear = await g.eval(() => window.__UI_DEBUG__.hud.buttons.length - 1);
  await clickWidget(g, `hud.buttons[${gear}]`);
  await g.wait(300);
  check('the gear button opens Settings', (await modal(g)) === 'settings');
  check('the HUD hides behind it', await g.eval(() => window.__UI_DEBUG__.hud.goalText.visible === false));
  await clickWidget(g, 'modal.speedButtons[2]');
  check('"Fast" is chosen and saved', (await state(g)).settings.textSpeed === 'fast');
  await clickWidget(g, 'modal.motion');
  check('"Less motion" turns on', (await state(g)).settings.reducedMotion === true);
  // Drag the volume slider to the far left.
  const c = await centre(g, 'modal.slider');
  await g.page.mouse.move(c.x, c.y);
  await g.page.mouse.down();
  await g.page.mouse.move(c.x - 400, c.y, { steps: 4 });
  await g.page.mouse.up();
  await g.wait(200);
  const vol = (await state(g)).settings.volume;
  check('the volume slider sets the volume', vol === 0, String(vol));
  check('settings are written to the save straight away', (await saved(g))?.settings?.textSpeed === 'fast');
  await clickWidget(g, 'modal.credits');
  await g.wait(200);
  check('Credits opens', (await modal(g)) === 'credits');
  await g.press('Escape');
  await g.wait(200);
  check('closing Credits goes back to Settings', (await modal(g)) === 'settings');
  await clickWidget(g, 'modal.ok');
  await g.wait(200);
  check('OK closes Settings', (await modal(g)) === null && (await busy(g)) === false);
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testSettingsWithKeyboard() {
  const g = await openGame('');
  await g.wait(1000);
  await g.press('Escape');
  await g.wait(200);
  check('Esc opens Settings', (await modal(g)) === 'settings');
  check('the focus brackets are not shown until an arrow key is pressed', await g.eval(() => window.__UI_DEBUG__.modal.focus.visible) === true, 'opened by keyboard, brackets should show');
  await g.press('ArrowLeft'); // slider: volume down one step
  const v1 = (await state(g)).settings.volume;
  check('Left lowers the volume by a step', Math.abs(v1 - 0.7) < 0.001, String(v1));
  await g.press('ArrowDown'); // the Nature slider
  await g.press('ArrowRight');
  const nature = (await state(g)).settings.natureVolume;
  check('Right on the Nature slider raises the nature sounds by a step', Math.abs(nature - 0.6) < 0.001, String(nature));
  await g.press('ArrowDown'); // the Music slider
  await g.press('ArrowRight');
  const music = (await state(g)).settings.musicVolume;
  check('Right on the Music slider raises the music by a step', Math.abs(music - 0.6) < 0.001, String(music));
  await g.press('ArrowDown');
  await g.press('ArrowRight');
  await g.press('ArrowRight'); // Slow, Normal, Fast
  await g.press('Enter');
  check('Down, Right, Right, Enter picks "Fast"', (await state(g)).settings.textSpeed === 'fast');
  await g.press('ArrowDown');
  await g.press('Enter');
  check('Enter flips "Less motion"', (await state(g)).settings.reducedMotion === true);
  await g.press('Escape');
  await g.wait(200);
  check('Esc closes Settings', (await modal(g)) === null);
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testTalking() {
  const g = await openGame('?at=12,24');
  await g.wait(1200);
  check('the talk button shows next to Mama Hen', await g.eval(() => window.__UI_DEBUG__.hud.talk.visible));
  await clickWidget(g, 'hud.talk');
  await g.wait(400);
  check('tapping it starts the conversation', await g.eval(() => window.__UI_DEBUG__.dialogue.active));
  check('the world stands still while talking', (await busy(g)) === true);
  await g.press('Enter'); // finish typing
  await g.wait(150);
  await g.press('Enter'); // next page
  await g.wait(150);
  const page = await g.eval(() => window.__UI_DEBUG__.dialogue.index);
  check('Enter moves to the next page', page >= 1, String(page));
  for (let i = 0; i < 6 && (await g.eval(() => window.__UI_DEBUG__.dialogue.active)); i += 1) {
    await g.press('Enter');
    await g.wait(150);
  }
  check('the last page closes it', (await g.eval(() => window.__UI_DEBUG__.dialogue.active)) === false);
  check('and the world moves again', (await busy(g)) === false);
  await g.press('e');
  await g.wait(300);
  check('E talks again (once)', await g.eval(() => window.__UI_DEBUG__.dialogue.active));
  await g.press('Escape');
  await g.wait(200);
  check('Esc skips the rest', (await g.eval(() => window.__UI_DEBUG__.dialogue.active)) === false);
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testWalkingAndTaps() {
  const g = await openGame('?at=19,15');
  await g.wait(1200);
  const pos = () => g.eval(() => ({ x: window.__GAME_DEBUG__.scene.player.x, y: window.__GAME_DEBUG__.scene.player.y }));
  const p0 = await pos();
  // A tap on the gear button must not also send the player walking.
  const gear = await g.eval(() => window.__UI_DEBUG__.hud.buttons.length - 1);
  await clickWidget(g, `hud.buttons[${gear}]`);
  await g.wait(300);
  await g.press('Escape');
  await g.wait(400);
  const p1 = await pos();
  check('tapping a button does not move the player', Math.hypot(p1.x - p0.x, p1.y - p0.y) < 1, JSON.stringify([p0, p1]));
  // A tap on open ground walks towards it.
  await g.click(760, 400);
  await g.wait(1500);
  const p2 = await pos();
  check('tapping the ground walks there', Math.hypot(p2.x - p0.x, p2.y - p0.y) > 8, JSON.stringify([p0, p2]));
  // Keys walk too; the player is remembered where they stop.
  await g.hold('ArrowLeft', 600);
  await g.wait(400);
  const s = await saved(g);
  check('the position is saved when the player stops', s?.player?.x != null, JSON.stringify(s?.player));
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testOtherScreens() {
  const g = await openGame('');
  await g.wait(1200);
  const labels = await g.eval(() => window.__UI_DEBUG__.hud.buttons.map((b) => b.opts.label || b.opts.icon));
  check('the HUD has Quests, Map and Settings', JSON.stringify(labels) === JSON.stringify(['Quests', 'Map', 'settings']), JSON.stringify(labels));
  await clickWidget(g, 'hud.buttons[0]');
  await g.wait(300);
  check('Quests opens the journal', (await modal(g)) === 'journal');
  await g.press('Escape');
  await g.wait(200);
  await clickWidget(g, 'hud.buttons[1]');
  await g.wait(300);
  check('Map opens the map', (await modal(g)) === 'map');
  await clickWidget(g, 'modal.ok');
  await g.wait(200);
  check('OK closes the map', (await modal(g)) === null);
  await g.eval(() => window.__UI_DEBUG__.open('ending'));
  await g.wait(300);
  check('the ending screen opens', (await modal(g)) === 'ending');
  await g.press('Escape');
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testResize() {
  const g = await openGame('?ui=settings', { width: 1280, height: 720 });
  await g.wait(1000);
  const scaleBefore = await g.eval(() => window.__UI_DEBUG__.scaleFactor);
  await g.page.setViewport({ width: 800, height: 360 });
  await g.wait(800);
  const after = await g.eval(() => ({ s: window.__UI_DEBUG__.scaleFactor, top: window.__UI_DEBUG__.modal.root.y, h: window.__UI_DEBUG__.modal.height, uiH: window.__UI_DEBUG__.uiH }));
  check('the UI re-scales when the window changes', scaleBefore === 3 && after.s === 2, JSON.stringify({ scaleBefore, after }));
  check('and the open panel stays on screen', after.top >= 0 && after.top + after.h <= after.uiH, JSON.stringify(after));
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testFriendlyThings() {
  // Petting: stand next to a wandering cow, press Space: a kindness heart, only the first time.
  const g = await openGame('?at=19,15');
  await g.wait(1200);
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    const cow = o.creatures.creatures.find((c) => c.kind === 'cow' && !c.isNpc);
    cow.pause(true);
    o.player.x = cow.sprite.x - 14;
    o.player.y = cow.sprite.y;
    o.playerSprite.setPosition(o.player.x, o.player.y);
  });
  await g.wait(500);
  check('the use button offers petting next to a cow', (await g.eval(() => window.__GAME_DEBUG__.scene.near?.kind)) === 'pet');
  await g.press('Space');
  await g.wait(300);
  await g.press('Space');
  await g.wait(300);
  check('petting gives one kindness heart, once', (await state(g)).hearts === 1, String((await state(g)).hearts));

  // Mailbox: the first letter gives 5 coins, the second gives a raspberry, then it is empty.
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    const box = o.pickups.spots.find((s) => s.kind === 'mailbox');
    o.player.x = box.x;
    o.player.y = box.y + 8;
    o.playerSprite.setPosition(o.player.x, o.player.y);
  });
  await g.wait(500);
  for (let letter = 0; letter < 2; letter += 1) {
    await g.press('Space');
    await g.wait(900);
    for (let i = 0; i < 8 && (await g.eval(() => window.__UI_DEBUG__.dialogue.active)); i += 1) {
      await g.press('Enter');
      await g.wait(250);
    }
    await g.wait(300);
  }
  const after = await state(g);
  check('the mailbox letters give their gifts', after.coins === 5 && after.bag.raspberry === 1, JSON.stringify({ coins: after.coins, bag: after.bag }));
  check('the world moves again after reading', (await busy(g)) === false);

  // Gates open when you come close, and shut again when you leave.
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    o.player.x = o.world.regions.find((r) => r.id === 'farm').ox * 16 + 12 * 16 + 8; // the farm's coop gate (the farm is not at the world's left edge)
    o.player.y = (o.world.regions.find((r) => r.id === 'farm').oy + 18) * 16 + 5;
    o.playerSprite.setPosition(o.player.x, o.player.y);
  });
  await g.wait(1200);
  const open = await g.eval(() => (() => { const o = window.__GAME_DEBUG__.scene; const farm = o.world.regions.find((r) => r.id === 'farm'); return o.gates.list.find((gate) => gate.tx === farm.ox + 12 && gate.ty === farm.oy + 19).state; })());
  check('a gate swings open when you come close', open === 'open', open);
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    o.player.y = (o.world.regions.find((r) => r.id === 'farm').oy + 14) * 16;
    o.playerSprite.setPosition(o.player.x, o.player.y);
  });
  await g.wait(2500);
  const shut = await g.eval(() => (() => { const o = window.__GAME_DEBUG__.scene; const farm = o.world.regions.find((r) => r.id === 'farm'); return o.gates.list.find((gate) => gate.tx === farm.ox + 12 && gate.ty === farm.oy + 19).state; })());
  check('and shuts again when you leave', shut === 'closed', shut);
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testChangeFriend() {
  const g = await openGame('?at=19,15');
  await g.wait(1200);
  await g.eval(() => window.__UI_DEBUG__.open('settings'));
  await g.wait(300);
  await clickWidget(g, 'modal.friend');
  await g.wait(400);
  check('the Friend button in Settings opens the friend picker', (await modal(g)) === 'start');
  // More than 6 friends: the row shows 5 at a time, and the right arrow slides it along to Tabby Cat.
  await clickWidget(g, 'modal.next');
  await g.wait(200);
  check('the arrow slides the friend row along', await g.eval(() => window.__UI_DEBUG__.modal.cards[6].visible));
  await clickWidget(g, 'modal.cards[6]');
  await g.wait(200);
  await clickWidget(g, 'modal.go');
  await g.wait(500);
  check('picking another friend saves it', (await state(g)).profile.avatarId === 'tabby-cat', (await state(g)).profile.avatarId);
  check('and the player picture changes', (await g.eval(() => window.__GAME_DEBUG__.scene.player.texture)) === 'char-tabby-cat');
  check('then Settings comes back', (await modal(g)) === 'settings');
  await g.press('Escape');
  await g.wait(200);
  await g.eval(() => window.__UI_DEBUG__.open('settings'));
  await g.wait(300);
  await clickWidget(g, 'modal.friend');
  await g.wait(300);
  await g.press('Escape');
  await g.wait(300);
  check('Esc cancels the picker and keeps the friend', (await modal(g)) === 'settings' && (await state(g)).profile.avatarId === 'tabby-cat');
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testNature() {
  const g = await openGame('?at=19,15');
  await g.wait(1200);
  check('the nature sounds are ready', await g.eval(() => Boolean(window.__SPROUT__.registry.get('audio').nature)));
  await g.page.mouse.click(600, 300); // the first tap lets the browser play sound
  await g.wait(2500);
  const bed = await g.eval(() => {
    const n = window.__SPROUT__.registry.get('audio').nature;
    return n.bed ? { id: n.bed.bedId, playing: n.bed.isPlaying, volume: n.bed.volume, place: n.placeName } : { place: n.placeName };
  });
  check('the breeze loops on the farm after the first tap', bed.id === 'breeze' && bed.playing, JSON.stringify(bed));
  await g.eval(() => window.__UI_DEBUG__.session.change((s) => { s.settings.natureVolume = 0; }));
  await g.eval(() => window.__SPROUT__.registry.get('audio').refreshNature());
  check('the Nature slider at 0 silences it', (await g.eval(() => window.__SPROUT__.registry.get('audio').nature.bed.currentConfig.volume)) === 0);
  // The music: a tune for the place, fading out at volume 0.
  const tune = await g.eval(() => {
    const m = window.__SPROUT__.registry.get('audio').music;
    return { wanted: m.wanted, playing: m.voices.filter((v) => !v.audio.paused).map((v) => v.id) };
  });
  check('the farm tune plays after the first tap', tune.wanted === 'farm-day' && tune.playing.includes('farm-day'), JSON.stringify(tune));
  await g.eval(() => window.__UI_DEBUG__.session.change((s) => { s.settings.musicVolume = 0; }));
  await g.eval(() => window.__SPROUT__.registry.get('audio').refreshMusic());
  check('the Music slider at 0 silences it', await g.eval(() => window.__SPROUT__.registry.get('audio').music.voices.every((v) => v.audio.volume === 0)));
  // Walking plays footsteps.
  await g.eval(() => { window.__SPROUT__.registry.get('audio').played.length = 0; });
  await g.page.keyboard.down('ArrowRight');
  await g.wait(900);
  await g.page.keyboard.up('ArrowRight');
  const steps = await g.eval(() => window.__SPROUT__.registry.get('audio').played.filter((id) => id.startsWith('step-')));
  check('walking plays footsteps', steps.length >= 2, JSON.stringify(steps));
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testFishing() {
  const g = await openGame('?at=38,37');
  await g.wait(1200);
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    o.player.x = o.world.regions.find((r) => r.id === 'farm').ox * 16 + 38 * 16 + 8; // the farm's pier
    o.player.y = (o.world.regions.find((r) => r.id === 'farm').oy + 39) * 16 - 2;
    o.playerSprite.setPosition(o.player.x, o.player.y);
  });
  await g.wait(600);
  check('the use button offers fishing on the pier', (await g.eval(() => window.__GAME_DEBUG__.scene.near?.spot?.kind)) === 'fishing');
  await g.press('Space');
  await g.wait(300);
  check('pressing it casts the line', (await g.eval(() => window.__GAME_DEBUG__.scene.pickups.fishing.state)) === 'waiting');
  await g.press('Space'); // too early: reels in nothing
  await g.wait(300);
  check('reeling in too early catches nothing', (await g.eval(() => window.__GAME_DEBUG__.scene.pickups.fishing.state)) === 'idle' && Object.keys((await state(g)).bag).length === 0);
  await g.press('Space');
  let bite = false;
  for (let i = 0; i < 40 && !bite; i += 1) {
    bite = (await g.eval(() => window.__GAME_DEBUG__.scene.pickups.fishing.state)) === 'bite';
    if (!bite) await g.wait(250);
  }
  check('a fish bites after a few seconds', bite);
  await g.press('Space');
  await g.wait(400);
  const fish = await g.eval(() => window.__UI_DEBUG__.groupCount ? 0 : window.__UI_DEBUG__.session.groupCount('fish'));
  check('pressing in time catches something', fish === 1, String(fish));
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testCollecting() {
  const g = await openGame('?at=19,15');
  await g.wait(1200);
  /** Stand just below a spot (tree, chest...) found by kind and farm tile. */
  const standBelow = (kind, tx, ty) => g.eval((k, x, y) => {
    const o = window.__GAME_DEBUG__.scene;
    const farm = o.world.regions.find((r) => r.id === 'farm');
    const spot = o.pickups.spots.find((sp) => sp.kind === k && Math.floor(sp.x / 16) === farm.ox + x && Math.floor((sp.y - 1) / 16) === farm.oy + y);
    o.player.x = spot.x;
    o.player.y = spot.y + 12;
    o.playerSprite.setPosition(o.player.x, o.player.y);
    return Boolean(spot);
  }, kind, tx, ty);
  const hudCount = (group) => g.eval((gr) => window.__UI_DEBUG__.hud.slots.find((sl) => sl.group === gr).count.text, group);

  // Shake the apple tree in the orchard: fruit falls, walk over it to pick it up.
  check('found the orchard apple tree', await standBelow('tree', 46, 21));
  await g.wait(400);
  check('the use button offers shaking the tree', (await g.eval(() => window.__GAME_DEBUG__.scene.near?.spot?.kind)) === 'tree');
  const before = await g.eval(() => window.__GAME_DEBUG__.scene.pickups.floating.length);
  await g.press('Space');
  await g.wait(100); // count the apples while they are still falling (ones landing at your feet are picked up at once)
  const drops = await g.eval(() => window.__GAME_DEBUG__.scene.pickups.floating.filter((e) => e.itemId === 'apple' && !e.oneTimeId).map((e) => [e.x, e.y]));
  await g.wait(800);
  check('shaking drops 1 to 3 apples', drops.length >= 1 && drops.length <= 3 && drops.length > 0 && before >= 0, String(drops.length));
  // walk to where each apple has landed (the ones at your feet are already picked up)
  const landed = await g.eval(() => window.__GAME_DEBUG__.scene.pickups.floating.filter((e) => e.itemId === 'apple' && !e.oneTimeId).map((e) => [e.x, e.y]));
  for (const [x, y] of landed) {
    await g.eval((px, py) => { const o = window.__GAME_DEBUG__.scene; o.player.x = px; o.player.y = py + 6; o.playerSprite.setPosition(px, py + 6); }, x, y);
    await g.wait(150);
  }
  await g.wait(300);
  const apples = (await state(g)).bag.apple || 0;
  check('walking over the apples picks them all up', apples === drops.length, `${apples} of ${drops.length}`);
  check('the fruit slot in the item bar counts them', (await hudCount('fruit')) === String(apples), await hudCount('fruit'));
  await standBelow('tree', 46, 21);
  await g.wait(300);
  await g.press('Space');
  await g.wait(700);
  check('the same tree gives nothing more straight away', (await g.eval(() => window.__GAME_DEBUG__.scene.pickups.floating.filter((e) => e.itemId === 'apple' && !e.oneTimeId).length)) === 0);

  // An egg lying on the ground: picked up once, gone for good after a reload.
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    const egg = o.pickups.floating.find((e) => e.oneTimeId === 'farm-egg-3');
    o.player.x = egg.x; o.player.y = egg.y + 6; o.playerSprite.setPosition(o.player.x, o.player.y);
  });
  await g.wait(400);
  check('walking over an egg picks it up', ((await state(g)).bag['egg-pink'] || 0) === 1);

  // A treasure chest: coins and a gem, only once, and the coin counter goes up.
  const coins0 = (await state(g)).coins;
  check('found the blossom grove chest', await standBelow('chest', 47, 1));
  await g.wait(400);
  await g.press('Space');
  await g.wait(1000);
  const opened = await state(g);
  check('the chest gives coins and an amethyst', opened.coins > coins0 && opened.bag.amethyst === 1, JSON.stringify({ coins: opened.coins, amethyst: opened.bag.amethyst }));
  check('the coin counter shows the new total', (await g.eval(() => window.__UI_DEBUG__.hud.coins.number.text)) === String(opened.coins));
  await g.press('Space');
  await g.wait(900);
  check('an open chest stays empty', (await state(g)).coins === opened.coins && (await state(g)).bag.amethyst === 1);

  await g.page.reload({ waitUntil: 'domcontentloaded' });
  await g.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
  await g.wait(1200);
  check('after a reload the egg does not come back', !(await g.eval(() => window.__GAME_DEBUG__.scene.pickups.floating.some((e) => e.oneTimeId === 'farm-egg-3'))));
  check('and the chest stays open', (await g.eval(() => window.__UI_DEBUG__.session.hasCollected('farm-chest-blossom'))));
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testPhoto() {
  const g = await openGame('', { startScreen: true });
  await g.wait(1500);
  check('the start screen has a photo slot', await g.eval(() => Boolean(window.__UI_DEBUG__.modal.photoSlot)));
  // A test picture made inside the page, saved to a file so the file chooser can be given it.
  const b64 = await g.eval(() => {
    const c = document.createElement('canvas');
    c.width = 300;
    c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = '#ffd23f';
    x.fillRect(0, 0, 300, 200);
    return c.toDataURL('image/png').split(',')[1];
  });
  const file = join(tmpdir(), 'sprout-test-photo.png');
  writeFileSync(file, Buffer.from(b64, 'base64'));
  await (await g.page.$('.photo-input')).uploadFile(file);
  await g.wait(1500);
  check('adding a photo saves it and shows it', (await state(g)).profile.hasPhoto === true && (await g.eval(() => window.__UI_DEBUG__.photoKey())) !== null);
  await g.page.reload({ waitUntil: 'domcontentloaded' });
  await g.page.waitForFunction(() => window.__UI_DEBUG__?.photos, { timeout: 60000 });
  await g.wait(1500);
  check('the photo is still there after a reload', (await g.eval(() => window.__UI_DEBUG__.photoKey())) !== null);
  await g.eval(() => window.__UI_DEBUG__.modal.photoSlot.onRemove());
  await g.wait(600);
  check('the x removes it for good', (await state(g)).profile.hasPhoto === false && (await g.eval(() => window.__UI_DEBUG__.photoKey())) === null);
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

async function testTapToUse() {
  // Kids tap on things: tapping someone walks you over and talks to them, tapping a tree shakes it.
  const g = await openGame('?at=19,15', { width: 1089, height: 600 });
  await g.wait(1200);
  const screenOf = (fn) => g.eval((src) => {
    const o = window.__GAME_DEBUG__.scene;
    const sprite = new Function('o', `return ${src}`)(o);
    const cam = o.cameras.main;
    const b = sprite.getBounds();
    return { x: (b.centerX - cam.worldView.x) * cam.zoom, y: (b.centerY - cam.worldView.y) * cam.zoom };
  }, fn);
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    const hen = o.creatures.byId.get('mama-hen');
    hen.pause(true);
    o.player.x = hen.x + 48; o.player.y = hen.y + 4; o.playerSprite.setPosition(o.player.x, o.player.y);
  });
  await g.wait(600);
  const hen = await screenOf("o.creatures.byId.get('mama-hen').sprite");
  await g.click(hen.x, hen.y);
  let talking = false;
  for (let i = 0; i < 20 && !talking; i += 1) {
    await g.wait(200);
    talking = await g.eval(() => window.__UI_DEBUG__.dialogue.active);
  }
  check('tapping Mama Hen from a few steps away walks over and talks to her', talking);
  await g.eval(() => window.__UI_DEBUG__.dialogue.close());
  await g.wait(300);
  await g.eval(() => {
    const o = window.__GAME_DEBUG__.scene;
    // A tree the player can walk straight up to from 50 px to its right (hedges stand beside some trees).
    // Uses the game's own feet test: the feet cover two tile rows, so testing one tile is not enough.
    const clearWalk = (sp) => {
      const x0 = sp.x + 50, y0 = sp.y + 20;
      if (o.blockedAt(x0, y0)) return false;
      const saved = [o.player.x, o.player.y];
      o.player.x = x0; o.player.y = y0;
      const to = o.approachSpot({ sprite: sp.sprite });
      [o.player.x, o.player.y] = saved;
      for (let i = 1; i <= 20; i += 1) if (o.blockedAt(x0 + ((to.x - x0) * i) / 20, y0 + ((to.y - y0) * i) / 20)) return false;
      return true;
    };
    const tree = o.pickups.spots.find((sp) => sp.kind === 'tree' && sp.sprite && clearWalk(sp));
    o.player.x = tree.x + 50; o.player.y = tree.y + 20; o.playerSprite.setPosition(o.player.x, o.player.y);
    window.__treeId = tree.id;
  });
  await g.wait(600);
  const tree = await screenOf("o.pickups.spots.find((sp) => sp.id === window.__treeId).sprite");
  await g.click(tree.x, tree.y);
  let shaken = false;
  for (let i = 0; i < 20 && !shaken; i += 1) {
    await g.wait(200);
    shaken = await g.eval(() => window.__GAME_DEBUG__.scene.pickups.floating.some((e) => !e.oneTimeId));
  }
  check('tapping a fruit tree walks over and shakes it', shaken);
  check('no errors', g.problems.length === 0, g.problems.join(' | '));
  await g.close();
}

const tests = [testStartScreen, testEmptyNameUsesDefault, testSettingsWithMouse, testSettingsWithKeyboard, testTalking, testWalkingAndTaps, testOtherScreens, testFriendlyThings, testCollecting, testTapToUse, testChangeFriend, testNature, testFishing, testPhoto, testResize];
const only = process.argv[2];
for (const t of tests) {
  if (only && !t.name.toLowerCase().includes(only.toLowerCase())) continue;
  console.log(`\n${t.name}`);
  try {
    await t();
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${t.name} crashed: ${err.message}`);
  }
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
