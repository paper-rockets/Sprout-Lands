import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { validateContentPackage } from '../scripts/validate-content.mjs';
import { SaveNamespaceService } from '../src/engine/services/SaveNamespaceService.js';
import { LocalSinglePlayerSession } from '../src/engine/session/LocalSinglePlayerSession.js';
import { SaveService } from '../src/engine/services/SaveService.js';
import { generatePwaIdentity } from '../scripts/build-pwa-identity.mjs';
import { ProfileSetupModal } from '../src/ui/ProfileSetupModal.js';
import { NavigationService } from '../src/engine/systems/NavigationService.js';
import { DepthOcclusionSystem } from '../src/engine/systems/DepthOcclusionSystem.js';
import { WORLD_AREAS } from '../src/engine/systems/WorldAreaRegistry.js';
import { FollowerSystem } from '../src/engine/systems/FollowerSystem.js';
import { QuestManager } from '../src/engine/systems/QuestManager.js';
import { AudioService } from '../src/engine/services/AudioService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
  }
}

// Mock window.localStorage for Node environment tests
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.window = globalThis.window || {};
globalThis.window.localStorage = new MockLocalStorage();

async function runAllTests() {
  console.log('--- RUNNING PHASE 2 & PHASE 3 ENGINE TESTS ---\n');

  // Test 1: Dependencies version verification
  test('Verify Phaser 4.2.1 and Vite 8 installed', () => {
    const phaserPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'node_modules', 'phaser', 'package.json'), 'utf8'));
    assert.strictEqual(phaserPkg.version, '4.2.1', `Expected Phaser 4.2.1, got ${phaserPkg.version}`);

    const vitePkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'node_modules', 'vite', 'package.json'), 'utf8'));
    assert(vitePkg.version.startsWith('8.'), `Expected Vite 8.x, got ${vitePkg.version}`);
  });

  // Test 2: Starter Adventure Content Validation
  test('Starter adventure passes content validation', () => {
    const res = validateContentPackage();
    assert.strictEqual(res.valid, true, `Validation failed: ${res.errors?.join(', ')}`);
    assert.strictEqual(res.summary.gameId, 'montreal-river-ribbon-v1');
    assert.strictEqual(res.summary.characterCount, 6);
    assert.strictEqual(res.summary.regionCount, 7);
  });

  // Test 3: Negative Content Validation
  test('Content validator catches invalid configurations', () => {
    const tempDir = path.join(rootDir, 'test', 'temp-invalid-content');
    fs.mkdirSync(tempDir, { recursive: true });
    
    fs.writeFileSync(path.join(tempDir, 'game.config.json'), JSON.stringify({
      schemaVersion: '1.0.0',
      title: 'Bad Game',
      engine: { renderType: 'CANVAS' }
    }), 'utf8');

    const res = validateContentPackage(tempDir);
    assert.strictEqual(res.valid, false);
    assert(res.errors.some(e => e.includes('gameId')));
    assert(res.errors.some(e => e.includes('WEBGL')));

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // Test 4: Namespace Isolation for two different gameId values
  test('Storage, database, and cache namespaces are completely isolated per gameId', () => {
    const gameA = new SaveNamespaceService('edition-maya-capy');
    const gameB = new SaveNamespaceService('edition-leo-puppy');

    assert.strictEqual(gameA.getSaveKey('v1'), 'personal-adventure:edition-maya-capy:save:v1');
    assert.strictEqual(gameB.getSaveKey('v1'), 'personal-adventure:edition-leo-puppy:save:v1');
    assert.strictEqual(gameA.getProfileDbName(), 'personal-adventure-profile-edition-maya-capy');
    assert.strictEqual(gameA.getCachePrefix('v2'), 'pwa-edition-maya-capy-v2');
    assert.strictEqual(gameA.namespaceTextureKey('player'), 'edition-maya-capy::player');
  });

  // Test 5: PWA Identity Generation
  test('PWA manifest generation produces namespaced manifest', () => {
    const { manifest, manifestPath } = generatePwaIdentity();
    assert(fs.existsSync(manifestPath));
    assert.strictEqual(manifest.id, '/montreal-river-ribbon-v1/');
    assert.strictEqual(manifest.short_name, 'RiverRibbon');
  });

  // Test 6: Username Validation rules
  test('Username validation enforces 1-16 characters and child-safe characters', () => {
    const modal = new ProfileSetupModal({
      session: { state: { player: {} } },
      saveService: {},
      profileImageService: {},
      characters: []
    });

    assert.strictEqual(modal.validateUsername('').valid, false);
    assert.strictEqual(modal.validateUsername('   ').valid, false);
    assert.strictEqual(modal.validateUsername('ThisNameIsFarTooLongForOurGame').valid, false);
    assert.strictEqual(modal.validateUsername('Player<script>').valid, false);
    assert.strictEqual(modal.validateUsername('Capybara!').valid, false);

    assert.strictEqual(modal.validateUsername('Leo').valid, true);
    assert.strictEqual(modal.validateUsername('Maya-Explorer').valid, true);
    assert.strictEqual(modal.validateUsername('Pip 07').valid, true);
  });

  // Test 7: SaveService Persistence & Reload
  test('SaveService correctly writes and reloads state', () => {
    const namespace = new SaveNamespaceService('test-persistence-game');
    const saveService = new SaveService(namespace);

    // Initial state is new
    const initial = saveService.loadSave({ player: { username: 'Newbie' } });
    assert.strictEqual(initial.isNew, true);

    // Save customized state
    const saved = saveService.saveGame({
      player: { username: 'Captain Capy', avatarId: 'char_sky_puppy', x: 200, y: 350 },
      completedQuests: ['quest_ducklings']
    });
    assert.strictEqual(saved, true);

    // Reload state
    const reloaded = saveService.loadSave({});
    assert.strictEqual(reloaded.isNew, false);
    assert.strictEqual(reloaded.state.player.username, 'Captain Capy');
    assert.strictEqual(reloaded.state.player.avatarId, 'char_sky_puppy');
    assert.deepStrictEqual(reloaded.state.completedQuests, ['quest_ducklings']);
  });

  // Test 8: SaveService Migration from older schema
  test('SaveService migrates older schemas safely', () => {
    const namespace = new SaveNamespaceService('test-migration-game');
    const saveService = new SaveService(namespace, '1.0.0');

    // Simulate older v0.5.0 save in storage
    const oldKey = namespace.getSaveKey('v1');
    window.localStorage.setItem(oldKey, JSON.stringify({
      schemaVersion: '0.5.0',
      player: { username: 'OldPlayer' }
    }));

    const result = saveService.loadSave({ player: { username: 'Default' }, settings: { volume: 0.8 } });
    assert.strictEqual(result.isNew, false);
    assert.strictEqual(result.state.schemaVersion, '1.0.0');
    assert.strictEqual(result.state.player.username, 'OldPlayer');
    assert.strictEqual(result.state.settings.volume, 0.8);
  });

  // Test 9: SaveService Corrupt-Save Recovery
  test('SaveService safely recovers from corrupt save without crashing', () => {
    const namespace = new SaveNamespaceService('test-corrupt-game');
    const saveService = new SaveService(namespace);

    // Put broken JSON in save key
    const saveKey = namespace.getSaveKey('v1');
    window.localStorage.setItem(saveKey, '{ bad json: true, broken... ');

    const result = saveService.loadSave({ player: { username: 'SafeFallback' } });
    assert.strictEqual(result.isNew, true);
    assert.strictEqual(result.recoveredFromCorruption, true);
    assert.strictEqual(result.state.player.username, 'SafeFallback');
  });

  // Test 10: Two-Game Isolation Test
  test('Two personalized games keep completely separate persistent saves', () => {
    const nsGame1 = new SaveNamespaceService('game-child-maya');
    const nsGame2 = new SaveNamespaceService('game-child-liam');

    const saveSvc1 = new SaveService(nsGame1);
    const saveSvc2 = new SaveService(nsGame2);

    saveSvc1.saveGame({ player: { username: 'Maya', avatarId: 'char_capybara_natural' } });
    saveSvc2.saveGame({ player: { username: 'Liam', avatarId: 'char_forest_imp' } });

    const load1 = saveSvc1.loadSave({});
    const load2 = saveSvc2.loadSave({});

    assert.strictEqual(load1.state.player.username, 'Maya');
    assert.strictEqual(load1.state.player.avatarId, 'char_capybara_natural');

    assert.strictEqual(load2.state.player.username, 'Liam');
    assert.strictEqual(load2.state.player.avatarId, 'char_forest_imp');
  });

  // --- PHASE 4 TESTS: EXPLORATION ENGINE ---

  // Test 11: NavigationService A* on open grid
  test('NavigationService finds path on open grid', () => {
    const nav = new NavigationService({ gridWidth: 10, gridHeight: 10, tileSize: 16 });
    // Path from tile (1, 1) [world 24, 24] to tile (4, 4) [world 72, 72]
    const path = nav.findPath(24, 24, 72, 72);
    assert.ok(path.length >= 1, 'Path should contain waypoints');
    const last = path[path.length - 1];
    assert.strictEqual(last.x, 72);
    assert.strictEqual(last.y, 72);
  });

  // Test 12: NavigationService obstacle avoidance and safe diagonals
  test('NavigationService routes around solid wall without corner cutting', () => {
    const nav = new NavigationService({ gridWidth: 10, gridHeight: 10, tileSize: 16 });
    // Create vertical wall at x = 3 from y = 1 to 5
    nav.setRectCollision(3, 1, 1, 5, true);

    const path = nav.findPath(16, 48, 80, 48); // From (1, 3) to (5, 3)
    assert.ok(path.length > 0, 'Path should successfully navigate around the wall');

    // Ensure no point intersects the wall
    for (const pt of path) {
      const tile = nav.worldToTile(pt.x, pt.y);
      assert.strictEqual(nav.isBlocked(tile.x, tile.y), false, 'Waypoint must not be on a blocked tile');
    }
  });

  // Test 13: Unreachable target fallback
  test('NavigationService selects nearest reachable tile if target is inside an obstacle', () => {
    const nav = new NavigationService({ gridWidth: 10, gridHeight: 10, tileSize: 16 });
    // Fill tile (5, 5) as obstacle
    nav.setCollision(5, 5, true);

    // Try to navigate directly to the center of tile (5, 5) -> (88, 88)
    const path = nav.findPath(16, 16, 88, 88);
    assert.ok(path.length > 0, 'Should find path to adjacent reachable tile');
    const last = path[path.length - 1];
    const lastTile = nav.worldToTile(last.x, last.y);
    assert.strictEqual(nav.isBlocked(lastTile.x, lastTile.y), false, 'Fallback endpoint must be walkable');
  });

  // Test 14: Collision sliding calculation
  test('NavigationService computes sliding vector against blocked obstacle', () => {
    const nav = new NavigationService({ gridWidth: 10, gridHeight: 10, tileSize: 16 });
    // Block x = 4
    nav.setCollision(4, 2, true);

    // Attempt to move right (+vx) and down (+vy)
    const worldX = 3 * 16 + 10;
    const worldY = 2 * 16 + 8;
    const slide = nav.computeSlideVector(worldX, worldY, 4, 3, 6);

    // X was blocked by x=4, but Y is free
    assert.strictEqual(slide.vx, 0, 'Blocked X velocity should be zeroed');
    assert.strictEqual(slide.vy, 3, 'Unblocked Y velocity should be preserved');
  });

  // Test 15: DepthOcclusionSystem foot-contact depth sorting
  test('DepthOcclusionSystem sorts depth correctly by foot contact position', () => {
    let playerDepth = 0;
    let treeDepth = 0;

    const mockPlayer = {
      x: 100,
      y: 150,
      setDepth: (d) => { playerDepth = d; }
    };

    const mockTree = {
      x: 100,
      y: 120,
      setDepth: (d) => { treeDepth = d; }
    };

    const system = new DepthOcclusionSystem({ scene: {}, player: mockPlayer });
    system.addDepthEntity(mockTree, 30); // Tree base is at y = 120 + 30 = 150

    // When player foot is in front of tree base (player.y + 12 = 162 > 150)
    system.update(16);
    assert.ok(playerDepth > treeDepth, 'Player in front of tree base should have higher depth');

    // When player foot is behind tree base (player.y = 100 -> foot = 112 < 150)
    mockPlayer.y = 100;
    system.update(16);
    assert.ok(playerDepth < treeDepth, 'Player behind tree base should have lower depth');
  });

  // Test 16: DepthOcclusionSystem occluder alpha fade
  test('DepthOcclusionSystem triggers occluder fade when player walks behind canopy', () => {
    let treeAlpha = 1.0;

    const mockPlayer = {
      x: 100,
      y: 110, // Behind canopy (canopy is 80..120 Y, foot is 150)
      setDepth: () => {}
    };

    const mockTree = {
      x: 100,
      y: 100,
      setAlpha: (a) => { treeAlpha = a; },
      setDepth: () => {}
    };

    const system = new DepthOcclusionSystem({ scene: {}, player: mockPlayer });
    system.registerOccluder(mockTree, { x: 80, y: 80, width: 40, height: 40 }, 150);

    // Update with 1 second delta so alpha lerps toward target
    system.update(1000);
    assert.ok(treeAlpha < 0.6, 'Tree canopy alpha should fade when player is behind it');

    // Move player out of canopy
    mockPlayer.x = 250;
    system.update(1000);
    assert.ok(treeAlpha > 0.9, 'Tree canopy alpha should restore when player leaves');
  });

  // --- PHASE 5 TESTS: CONNECTED WORLD REGISTRY ---

  // Test 17: WorldAreaRegistry integrity and portal connectivity
  test('WorldAreaRegistry contains all 6 regions and 2 interiors with reciprocal portals', () => {
    const requiredAreas = [
      'region_west_meadow',
      'region_central_town',
      'region_pinecrest_forest',
      'region_south_wetlands',
      'region_east_harbour',
      'region_sanctuary_isle',
      'interior_farmhouse',
      'special_crystal_cave'
    ];

    for (const areaId of requiredAreas) {
      const area = WORLD_AREAS[areaId];
      assert.ok(area, `Missing required area ${areaId}`);
      assert.ok(area.name, `Area ${areaId} must have a name`);
      assert.ok(area.description, `Area ${areaId} must have a description`);

      for (const portal of area.portals || []) {
        assert.ok(WORLD_AREAS[portal.targetRegionId], `Portal ${portal.id} in ${areaId} targets unknown area ${portal.targetRegionId}`);
        assert.strictEqual(typeof portal.targetX, 'number', `Portal ${portal.id} targetX must be a number`);
        assert.strictEqual(typeof portal.targetY, 'number', `Portal ${portal.id} targetY must be a number`);
      }
    }
  });

  // --- PHASE 6 TESTS: FOLLOWER SYSTEM & DUCK QUEST ---

  // Test 18: FollowerSystem breadcrumb trailing and area snap
  test('FollowerSystem positions followers along breadcrumb trail and snaps cleanly', () => {
    const mockPlayer = { x: 100, y: 100 };
    const mockScene = { anims: { exists: () => false } };
    const followerSys = new FollowerSystem({ scene: mockScene, player: mockPlayer, spacing: 20 });

    const mockDuckSprite = {
      x: 0,
      y: 0,
      setPosition: function(x, y) { this.x = x; this.y = y; },
      setDepth: () => {}
    };

    followerSys.addFollower({ id: 'duckling_pip', name: 'Pip', sprite: mockDuckSprite });
    assert.strictEqual(followerSys.getFollowerCount(), 1);

    // Simulate player walking right: (100, 100) -> (150, 100)
    for (let px = 100; px <= 150; px += 10) {
      mockPlayer.x = px;
      followerSys.update(50);
    }

    // Follower should have trailed behind the player
    assert.ok(mockDuckSprite.x > 0, 'Follower sprite position should update along trail');
    assert.ok(mockDuckSprite.x < mockPlayer.x, 'Follower should be trailing behind player');

    // Test snap on area transition
    followerSys.snapToPlayer(480, 300);
    assert.strictEqual(mockDuckSprite.x, 480 - 16);
    assert.strictEqual(mockDuckSprite.y, 300);
  });

  // Test 19: QuestManager - Help the Baby Ducks Find Mom
  test('QuestManager progresses Duck Quest from start to gathering to badge award', () => {
    const mockSession = {
      state: { player: { username: 'Maya', rewards: [] }, quests: {} },
      getState: function() { return this.state; }
    };
    const mockFollowerSys = {
      addFollower: () => {},
      clearFollowers: () => {}
    };

    const qm = new QuestManager({
      scene: { scene: { get: () => null } },
      session: mockSession,
      followerSystem: mockFollowerSys,
      saveService: null
    });

    const duckQ = qm.quests.quest_help_baby_ducks;
    assert.strictEqual(duckQ.status, 'not_started');

    // Talk to Mama Duck
    const startMsg = qm.talkToMamaDuck();
    assert.strictEqual(duckQ.status, 'active');
    assert.strictEqual(duckQ.step, 2);
    assert.ok(startMsg.includes('ducklings'));

    // Gather 4 ducklings
    qm.gatherDuckling('duckling_pip', 'Pip', {});
    assert.strictEqual(duckQ.ducklingsGathered.size, 1);

    qm.gatherDuckling('duckling_dottie', 'Dottie', {});
    qm.gatherDuckling('duckling_splash', 'Splash', {});
    assert.strictEqual(duckQ.step, 2);

    qm.gatherDuckling('duckling_barnaby', 'Barnaby', {});
    assert.strictEqual(duckQ.step, 3, 'When all 4 gathered, step must become 3 (escort to Mama)');

    // Return to Mama Duck
    const finishMsg = qm.talkToMamaDuck();
    assert.strictEqual(duckQ.status, 'completed');
    assert.ok(mockSession.state.player.rewards.includes('badge_duck_rescuer'));
    assert.ok(finishMsg.includes('Ribbon'));
  });

  // --- PHASE 7 TESTS: LOST IN THE FOREST QUEST ---

  // Test 20: QuestManager - Lost in the Forest
  test('QuestManager progresses Lost in the Forest from clues to rescue to badge award', () => {
    const mockSession = {
      state: { player: { username: 'Maya', rewards: [] }, quests: {} },
      getState: function() { return this.state; }
    };
    const mockFollowerSys = {
      addFollower: () => {},
      removeFollower: () => {}
    };

    const qm = new QuestManager({
      scene: { scene: { get: () => null } },
      session: mockSession,
      followerSystem: mockFollowerSys,
      saveService: null
    });

    const forestQ = qm.quests.quest_lost_in_forest;
    assert.strictEqual(forestQ.status, 'not_started');

    // Talk to Baker
    qm.talkToBaker();
    assert.strictEqual(forestQ.status, 'active');

    // Inspect 4 clues
    qm.inspectClue('clue_ribbon', 'Silk Ribbon');
    qm.inspectClue('clue_pawprints', 'Small Pawprints');
    qm.inspectClue('clue_twigs', 'Broken Twigs');
    assert.strictEqual(forestQ.step, 2);

    qm.inspectClue('clue_acorn', 'Polished Acorn');
    assert.strictEqual(forestQ.step, 3, 'When all clues found, step becomes 3 (locate imp)');

    // Rescue Imp
    qm.rescueImp({});
    assert.strictEqual(forestQ.impRescued, true);
    assert.strictEqual(forestQ.step, 4, 'When imp rescued, step becomes 4 (escort to town)');

    // Return to Baker
    qm.talkToBaker();
    assert.strictEqual(forestQ.status, 'completed');
    assert.ok(mockSession.state.player.rewards.includes('badge_forest_navigator'));
  });

  // --- PHASE 9 TESTS: AUDIO SERVICE SYNTHESIS ---

  // Test 21: AudioService safe execution in headless / fallback environments
  test('AudioService handles mute toggle and safe playback without throwing', () => {
    const audio = new AudioService();
    assert.strictEqual(audio.enabled, true);

    const toggled = audio.toggleSound();
    assert.strictEqual(toggled, false);
    assert.strictEqual(audio.enabled, false);

    audio.toggleSound();
    assert.strictEqual(audio.enabled, true);

    // Methods should not throw even if Web Audio is mocked/unavailable in Node
    assert.doesNotThrow(() => audio.playStep());
    assert.doesNotThrow(() => audio.playDialoguePing());
    assert.doesNotThrow(() => audio.playDucklingQuack());
    assert.doesNotThrow(() => audio.playClueCollect());
    assert.doesNotThrow(() => audio.playQuestFanfare());
    assert.doesNotThrow(() => audio.playPortalSwoosh());
  });

  // Test 22: Session persistence of quest state
  test('SaveService and QuestManager serialize and restore full quest progress', () => {
    const namespace = new SaveNamespaceService('quest-persistence-test');
    const saveSvc = new SaveService(namespace);

    const sessionA = new LocalSinglePlayerSession({ gameId: 'quest-persistence-test' });
    const qmA = new QuestManager({
      scene: { scene: { get: () => null } },
      session: sessionA,
      followerSystem: null,
      saveService: saveSvc
    });

    // Start quest and gather 2 ducklings
    qmA.talkToMamaDuck();
    qmA.gatherDuckling('duckling_pip', 'Pip', {});
    qmA.gatherDuckling('duckling_dottie', 'Dottie', {});
    qmA.saveToSession();

    // Reload save into sessionB
    const sessionB = new LocalSinglePlayerSession({ gameId: 'quest-persistence-test' });
    const { state: loadedState } = saveSvc.loadSave(sessionB.getState());
    sessionB.state = loadedState;

    const qmB = new QuestManager({
      scene: { scene: { get: () => null } },
      session: sessionB,
      followerSystem: null,
      saveService: saveSvc
    });

    const restoredDuckQ = qmB.quests.quest_help_baby_ducks;
    assert.strictEqual(restoredDuckQ.status, 'active');
    assert.strictEqual(restoredDuckQ.ducklingsGathered.size, 2);
    assert.ok(restoredDuckQ.ducklingsGathered.has('duckling_pip'));
    assert.ok(restoredDuckQ.ducklingsGathered.has('duckling_dottie'));
  });

  console.log(`\nResults: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests();

