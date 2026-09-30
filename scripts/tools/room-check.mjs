// Walks into a house, saves, reloads (still inside), walks back out, and checks the things that
// must keep working in rooms: a friend following you comes along, the map shows you at the door,
// the camera keeps the small room in the middle, "less motion" still works, and tapping the door
// (phone/tablet) walks you in. Then the Old Mine (a cave room): in through the stone arch, open the
// treasure chest at the far end, and back out; then Miner Moss's crystal quest with the bats and slimes. Screenshots go to the folder given as the first argument.
//
//   npm run dev            (in another terminal)
//   npm run check:rooms [screenshot folder]

import { openGame } from './browser.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = process.argv[2] || tmpdir();
const ROOM = 'baker-house';
let failures = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures += 1;
};

const where = (game) => game.eval((id) => {
  const s = window.__GAME_DEBUG__.scene;
  const link = s.rooms.links.find((l) => l.room.id === id);
  const cam = s.cameras.main;
  return {
    x: s.player.x, y: s.player.y, region: s.player.region, room: s.rooms.current?.room.id || null,
    saved: s.session.state.player, outside: link.outside, inside: link.inside,
    camMid: [cam.midPoint.x, cam.midPoint.y], roomMid: [(link.room.ox + link.room.width / 2) * 16, (link.room.oy + link.room.height / 2) * 16],
    map: s.mapPosition(), busy: s.rooms.busy
  };
}, ROOM);

/** Stand just below the door of the room's house, outside. */
async function standOutside(game) {
  await game.eval((id) => {
    const s = window.__GAME_DEBUG__.scene;
    const link = s.rooms.links.find((l) => l.room.id === id);
    s.rooms.placePlayer(link.outside.x, link.outside.y, 'up');
  }, ROOM);
  await game.wait(300);
}

async function waitSettled(game) {
  for (let i = 0; i < 30; i += 1) {
    if (!(await game.eval(() => window.__GAME_DEBUG__.scene.rooms.busy))) break;
    await game.wait(100);
  }
  await game.wait(200);
}

// ---- 1. Walk up into the yellow house's door: the room opens.
let game = await openGame('', { width: 1280, height: 720 });
await game.wait(1500);
await standOutside(game);
// A chick that is following the player (as in the chick quest) should come along.
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const chick = s.npcs.find((n) => n.def.kind === 'follower' && n.creature && !n.hidden);
  chick.creature.guide = () => s.trailPoint(28);
  window.__ROOM_CHICK__ = chick.def.id;
});
await game.shot(join(OUT, 'room-1-outside.png'));
await game.hold('ArrowUp', 900);
await waitSettled(game);
let at = await where(game);
check(at.room === ROOM && at.region === ROOM, `walking up through the door goes inside (${at.room}, ${at.region})`);
check(Math.abs(at.camMid[0] - at.roomMid[0]) < 2 && Math.abs(at.camMid[1] - at.roomMid[1]) < 2, `the small room is in the middle of the screen (camera ${at.camMid}, room ${at.roomMid})`);
check(at.map.x === at.outside.x && at.map.y === at.outside.y, 'the map shows the player at the house door');
const chickInside = await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const chick = s.npcs.find((n) => n.def.id === window.__ROOM_CHICK__).creature;
  return s.world.regionAt(Math.floor(chick.x / 16), Math.floor((chick.y - 1) / 16))?.id;
});
check(chickInside === ROOM, `the following chick came in too (${chickInside})`);
await game.shot(join(OUT, 'room-2-inside.png'));

// ---- 2. Walk about, then reload: still inside.
await game.hold('ArrowLeft', 400);
await game.wait(300);
at = await where(game);
check(at.saved.room === ROOM, `the save knows the player is inside (${JSON.stringify(at.saved)})`);
const before = { x: at.x, y: at.y };
await game.page.reload({ waitUntil: 'domcontentloaded' });
await game.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
await game.wait(1500);
at = await where(game);
check(at.room === ROOM && Math.abs(at.x - before.x) < 1 && Math.abs(at.y - before.y) < 1, `after a reload the player is still in the room, same spot (${at.room}, ${at.x},${at.y})`);
check(Math.abs(at.camMid[0] - at.roomMid[0]) < 2, 'after a reload the room is still in the middle of the screen');
await game.shot(join(OUT, 'room-3-reloaded.png'));

// ---- 3. Walk back down through the gap in the wall: outside, just below the same door.
await game.eval((id) => {
  const s = window.__GAME_DEBUG__.scene;
  const link = s.rooms.links.find((l) => l.room.id === id);
  s.rooms.placePlayer(link.inside.x, link.inside.y, 'down');
}, ROOM);
await game.hold('ArrowDown', 700);
await waitSettled(game);
at = await where(game);
check(at.room === null && at.region === 'east', `walking down through the exit goes back outside (${at.room}, ${at.region})`);
check(Math.abs(at.x - at.outside.x) < 2 && Math.abs(at.y - at.outside.y) < 6, `outside again, just below the door (${at.x},${at.y} vs ${at.outside.x},${at.outside.y})`);
check(!at.saved.room, 'the save knows the player is outside again');
await game.shot(join(OUT, 'room-4-back-outside.png'));

// ---- 4. "Less motion": no fade, straight through.
await game.eval(() => { window.__GAME_DEBUG__.scene.session.change((s) => { s.settings.reducedMotion = true; }); });
await standOutside(game);
await game.hold('ArrowUp', 900);
at = await where(game);
check(at.room === ROOM && !at.busy, 'with "less motion" the door works without fading');
await game.eval(() => { window.__GAME_DEBUG__.scene.session.change((s) => { s.settings.reducedMotion = false; }); });
await game.hold('ArrowDown', 900);
await waitSettled(game);

// ---- 5. Phone and tablet: tap the doorway and the player walks in by themselves.
await standOutside(game);
await game.eval(() => window.__GAME_DEBUG__.scene.rooms.placePlayer(window.__GAME_DEBUG__.scene.player.x + 40, window.__GAME_DEBUG__.scene.player.y + 20, 'up'));
await game.wait(300);
const tap = await game.eval((id) => {
  const s = window.__GAME_DEBUG__.scene;
  const link = s.rooms.links.find((l) => l.room.id === id);
  const cam = s.cameras.main;
  const wx = link.door.x * 16 + 8;
  const wy = link.door.y * 16 + 8;
  return { x: (wx - cam.worldView.x) * cam.zoom, y: (wy - cam.worldView.y) * cam.zoom };
}, ROOM);
await game.click(tap.x, tap.y);
for (let i = 0; i < 40; i += 1) {
  if ((await where(game)).room) break;
  await game.wait(100);
}
await waitSettled(game);
at = await where(game);
check(at.room === ROOM, 'tapping the door walks the player inside');

// ---- 6. The other rooms: each one opens from its own door.
for (const id of ['blue-house', 'pine-cabin', 'old-mine']) {
  await game.eval(() => {
    const s = window.__GAME_DEBUG__.scene;
    const link = s.rooms.current;
    if (link) s.rooms.placePlayer(link.inside.x, link.inside.y, 'down');
  });
  await game.hold('ArrowDown', 700);
  await waitSettled(game);
  await game.eval((rid) => {
    const s = window.__GAME_DEBUG__.scene;
    const link = s.rooms.links.find((l) => l.room.id === rid);
    s.rooms.placePlayer(link.outside.x, link.outside.y, 'up');
  }, id);
  await game.wait(300);
  await game.hold('ArrowUp', 900);
  await waitSettled(game);
  const inside = await game.eval(() => window.__GAME_DEBUG__.scene.rooms.current?.room.id);
  check(inside === id, `the ${id} door leads into ${id} (${inside})`);
  await game.shot(join(OUT, `room-5-${id}.png`));
}

// ---- 7. The Old Mine: the treasure chest at the far end gives coins and a diamond, and the way out
// leads back to the mine's arch on the East Isle.
const mine = () => game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  return { room: s.rooms.current?.room.id || null, region: s.player.region, x: s.player.x, y: s.player.y, coins: s.session.state.coins, diamonds: s.session.state.bag?.diamond || 0 };
});
const before7 = await mine();
const chestFound = await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const spot = s.pickups.spots.find((sp) => sp.kind === 'chest' && s.world.regionAt(Math.floor(sp.x / 16), Math.floor((sp.y - 1) / 16))?.id === 'old-mine');
  if (!spot) return false;
  s.rooms.placePlayer(spot.x, spot.y + 12, 'up');
  return true;
});
check(chestFound, 'the Old Mine has a treasure chest');
await game.wait(400);
await game.press('Space');
await game.wait(1000);
let m = await mine();
check(m.coins > before7.coins && m.diamonds === before7.diamonds + 1, `the mine chest gives coins and a diamond (${before7.coins} -> ${m.coins} coins, ${m.diamonds} diamonds)`);
await game.shot(join(OUT, 'room-6-mine-chest.png'));
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const link = s.rooms.current;
  s.rooms.placePlayer(link.inside.x, link.inside.y, 'down');
});
await game.hold('ArrowDown', 700);
await waitSettled(game);
m = await mine();
const arch = await game.eval(() => window.__GAME_DEBUG__.scene.rooms.links.find((l) => l.room.id === 'old-mine').outside);
check(m.room === null && m.region === 'east' && Math.abs(m.x - arch.x) < 2 && Math.abs(m.y - arch.y) < 6, `walking down out of the mine comes out below the arch (${m.region}, ${m.x},${m.y})`);
await game.shot(join(OUT, 'room-7-mine-outside.png'));

// ---- 8. Miner Moss's quest "Sparkles in the Mine": bats and slimes wander in the cave, three crystals
// appear once Moss asks, pick them up (reload halfway), bring them back, prize once.
/** Stand just left of a person or thing (anywhere, inside or out) and face it. */
const standBy = (id) => game.eval((who) => {
  const s = window.__GAME_DEBUG__.scene;
  const target = (s.npcs.find((n) => n.def.id === who) || s.things.find((t) => t.def.id === who)).sprite;
  s.rooms.placePlayer(target.x - 12, target.y, 'right');
}, id).then(() => game.wait(300));
/** Press the use key, then click through the speech box until it closes. */
async function talk() {
  await game.press('e');
  await game.wait(300);
  for (let i = 0; i < 20; i += 1) {
    if (!(await game.eval(() => window.__UI_DEBUG__.dialogue.active))) break;
    await game.press('Space');
    await game.wait(700);
    await game.press('Space');
  }
  await game.wait(300);
}
const CRYSTALS = ['mine-crystal-1', 'mine-crystal-2', 'mine-crystal-3'];
const quest = () => game.eval((ids) => {
  const s = window.__GAME_DEBUG__.scene;
  const st = s.session.state;
  return {
    q: st.quests['sparkles-in-mine'] || null, items: [...st.items], stars: st.stars, amethyst: st.bag.amethyst || 0,
    shown: ids.map((id) => s.things.find((t) => t.def.id === id).sprite.visible),
    goal: window.__UI_DEBUG__.hud.goalText.text
  };
}, CRYSTALS);
let mq = await quest();
check(mq.shown.every((v) => !v), 'no crystals in the cave before Miner Moss asks');
await standBy('east-miner');
await talk();
mq = await quest();
check(mq.q?.status === 'active' && mq.q.step === 1, `Miner Moss starts "Sparkles in the Mine" (${JSON.stringify(mq.q)})`);
check(mq.shown.every((v) => v), 'the three crystals are on the cave floor now');
check(/0 OF 3/i.test(mq.goal), `the goal note counts the crystals (${mq.goal})`);
// into the mine through the arch
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const link = s.rooms.links.find((l) => l.room.id === 'old-mine');
  s.rooms.placePlayer(link.outside.x, link.outside.y, 'up');
});
await game.wait(300);
await game.hold('ArrowUp', 900);
await waitSettled(game);
const critters = await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const inMine = (c) => s.world.regionAt(Math.floor(c.x / 16), Math.floor((c.y - 1) / 16))?.id === 'old-mine';
  return ['bat', 'slime'].map((kind) => s.creatures.creatures.filter((c) => c.kind === kind && inMine(c)).map((c) => ({ x: c.x, y: c.y, playing: c.sprite.anims.isPlaying })));
});
check(critters[0].length === 3 && critters[1].length === 3, `3 bats and 3 slimes in the mine (${critters[0].length} bats, ${critters[1].length} slimes)`);
check([...critters[0], ...critters[1]].every((c) => c.playing), 'the bats flap and the slimes wobble');
await game.wait(4000);
const moved = await game.eval((before) => {
  const s = window.__GAME_DEBUG__.scene;
  const now = ['bat', 'slime'].map((kind) => s.creatures.creatures.filter((c) => c.kind === kind).map((c) => ({ x: c.x, y: c.y })));
  let count = 0;
  for (const k of [0, 1]) before[k].forEach((b) => { if (!now[k].some((n) => n.x === b.x && n.y === b.y)) count += 1; });
  const floor = now.flat().every((c) => !s.world.isBlocked(Math.floor(c.x / 16), Math.floor((c.y - 1) / 16)));
  return { count, floor };
}, critters);
check(moved.count >= 2 && moved.floor, `they wander about and stay on the cave floor (${moved.count} moved)`);
// a quick picture with the bats and slimes
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  const m = s.world.regions.find((r) => r.id === 'old-mine');
  s.rooms.placePlayer((m.ox + 9) * 16 + 8, (m.oy + 11) * 16, 'up');
});
await game.wait(600);
await game.shot(join(OUT, 'room-8-mine-critters.png'));
for (const [i, id] of CRYSTALS.entries()) {
  await standBy(id);
  await talk();
  if (i === 1) {
    mq = await quest();
    check(mq.items.length === 2 && !mq.shown[0] && !mq.shown[1] && /2 OF 3/i.test(mq.goal), `two crystals picked up, gone from the floor (${mq.goal})`);
    await game.page.reload({ waitUntil: 'domcontentloaded' });
    await game.page.waitForFunction(() => window.__GAME_DEBUG__?.scene?.sys?.isActive?.(), { timeout: 60000 });
    await game.wait(1500);
    mq = await quest();
    check(mq.items.length === 2 && !mq.shown[0] && mq.shown[2], 'after a reload: still two crystals, the third still waiting on the floor');
  }
}
mq = await quest();
check(mq.q.step === 2 && mq.items.length === 3, `all three crystals found; now back to Miner Moss (${mq.goal})`);
const journal = await game.eval(() => window.__GAME_DEBUG__.scene.session.rules.journal().find((e) => e.id === 'sparkles-in-mine'));
check(journal && journal.steps.length === 3 && journal.steps[1].state === 'done' && journal.steps[1].have === 3, 'the journal shows the quest and the crystals found');
await game.eval(() => {
  const s = window.__GAME_DEBUG__.scene;
  s.rooms.placePlayer(s.rooms.current.inside.x, s.rooms.current.inside.y, 'down');
});
await game.hold('ArrowDown', 700);
await waitSettled(game);
await standBy('east-miner');
await talk();
mq = await quest();
check(mq.q.status === 'completed' && mq.stars === 1 && mq.amethyst === 1 && mq.items.length === 0, `crystals handed over, prize given (stars ${mq.stars}, amethyst ${mq.amethyst})`);
await talk();
mq = await quest();
check(mq.stars === 1 && mq.amethyst === 1, 'talking again gives no second prize');
check(await game.eval(() => window.__UI_DEBUG__.modalName !== 'ending'), 'no ending yet: the other quests are still to do');

check(game.problems.length === 0, `no errors in the page${game.problems.length ? `: ${game.problems.join(' | ')}` : ''}`);
await game.close();
console.log(failures ? `\n${failures} room check(s) FAILED` : '\nAll room checks passed.');
process.exit(failures ? 1 : 0);
