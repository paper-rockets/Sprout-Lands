import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene.js';
import { PreloadScene } from '../scenes/PreloadScene.js';
import { WorldScene } from '../scenes/WorldScene.js';
import { UIScene } from '../scenes/UIScene.js';
import { LocalSinglePlayerSession } from '../session/LocalSinglePlayerSession.js';
import { SaveNamespaceService } from '../services/SaveNamespaceService.js';
import { SaveService } from '../services/SaveService.js';
import { ProfileImageService } from '../services/ProfileImageService.js';
import { ProfileSetupModal } from '../../ui/ProfileSetupModal.js';
import { PocketAtlasJournalModal } from '../../ui/PocketAtlasJournalModal.js';
import charactersData from '../../content/starter-adventure/characters.json';

export async function createGame(gameConfig, parentContainerId = 'game-container') {
  if (!gameConfig || !gameConfig.gameId) {
    throw new Error('createGame: A valid gameConfig with a gameId is required.');
  }

  // 1. Establish session boundary, storage namespace, and persistence services
  const namespace = new SaveNamespaceService(gameConfig.gameId);
  const saveService = new SaveService(namespace);
  const profileImageService = new ProfileImageService(namespace);
  const session = new LocalSinglePlayerSession(gameConfig);

  // 2. Load persistent save data or defaults
  const { isNew, state: loadedState } = saveService.loadSave(session.getState());
  if (!isNew && loadedState) {
    session.state = loadedState;
    console.log(`[SaveService] Restored saved profile for "${loadedState.player?.username}"`);
  }

  // Save changes on movement debounce or interaction
  session.subscribe('player.moved', (player) => {
    saveService.saveGame(session.getState());
  });

  // 3. Initialize Profile & Settings UI Modal
  const profileModal = new ProfileSetupModal({
    containerId: 'app',
    session,
    saveService,
    profileImageService,
    characters: charactersData.characters,
    onSave: (updated) => {
      console.log('[ProfileSetupModal] Profile updated:', updated);
    }
  });
  await profileModal.init();
  window.__PROFILE_MODAL__ = profileModal;

  // 3b. Initialize Pocket Atlas & Quest Journal Modal
  const atlasJournalModal = new PocketAtlasJournalModal({
    containerId: 'app',
    session
  });
  atlasJournalModal.init();
  window.__ATLAS_JOURNAL_MODAL__ = atlasJournalModal;

  // If first run, present the character/profile creation modal
  if (isNew) {
    profileModal.show(true);
  }

  // 4. Phaser configuration explicitly bound to WebGL mode
  const phaserConfig = {
    type: Phaser.WEBGL,
    parent: parentContainerId,
    width: gameConfig.engine?.width || 960,
    height: gameConfig.engine?.height || 540,
    pixelArt: gameConfig.engine?.pixelArt !== false,
    roundPixels: gameConfig.engine?.roundPixels !== false,
    backgroundColor: '#19354e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, PreloadScene, WorldScene, UIScene]
  };

  const game = new Phaser.Game(phaserConfig);

  // Pass configuration into initial BootScene
  game.scene.start('BootScene', { session, gameConfig, namespace, saveService, profileImageService });

  return { game, session, namespace, saveService, profileImageService, profileModal };
}
