import Phaser from 'phaser';
import { NavigationService } from '../systems/NavigationService.js';
import { PlayerController } from '../systems/PlayerController.js';
import { DepthOcclusionSystem } from '../systems/DepthOcclusionSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { AreaManager } from '../systems/AreaManager.js';
import { FollowerSystem } from '../systems/FollowerSystem.js';
import { QuestManager } from '../systems/QuestManager.js';
import { AudioService } from '../services/AudioService.js';

export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
  }

  init(data) {
    this.session = data.session;
    this.gameConfig = data.gameConfig;
    this.namespace = data.namespace;
  }

  getTextureKeyForAvatar(avatarId) {
    const mapping = {
      'char_capybara_natural': 'capybara_natural',
      'char_capybara_gardener': 'capybara_gardener',
      'char_capybara_baker': 'capybara_baker',
      'char_sky_puppy': 'sky_puppy',
      'char_long_ear_white_puppy': 'long_ear_white_puppy',
      'char_forest_imp': 'forest_imp'
    };
    const key = mapping[avatarId] || 'capybara_natural';
    return this.namespace.namespaceTextureKey(key);
  }

  create() {
    const { width, height } = this.scale;
    const playerState = this.session.getState().player;
    const currentTexKey = this.getTextureKeyForAvatar(playerState.avatarId);

    // Audio synthesizer
    this.audio = new AudioService({ session: this.session });

    // 1. Setup 8-direction animations for all 6 characters
    this.createCharacterAnimations();

    // 2. Setup Player Sprite
    const spawnX = playerState.x || 340;
    const spawnY = playerState.y || 290;
    this.player = this.add.sprite(spawnX, spawnY, currentTexKey, 12);
    this.player.setScale(2.5);

    // 3. Initialize Exploration Systems
    this.nav = new NavigationService({
      gridWidth: Math.ceil(width / 16),
      gridHeight: Math.ceil(height / 16),
      tileSize: 16
    });

    this.depthOcclusion = new DepthOcclusionSystem({
      scene: this,
      player: this.player
    });
    this.depthOcclusion.addDepthEntity(this.player, 12);

    this.interaction = new InteractionSystem({
      scene: this,
      player: this.player,
      session: this.session,
      namespace: this.namespace
    });

    this.followerSystem = new FollowerSystem({
      scene: this,
      player: this.player
    });

    this.questManager = new QuestManager({
      scene: this,
      session: this.session,
      followerSystem: this.followerSystem,
      saveService: this.session.saveService,
      audioService: this.audio
    });

    this.areaManager = new AreaManager({
      scene: this,
      navigationService: this.nav,
      depthOcclusion: this.depthOcclusion,
      interactionSystem: this.interaction,
      namespace: this.namespace,
      session: this.session,
      questManager: this.questManager,
      followerSystem: this.followerSystem,
      audioService: this.audio
    });

    // 4. Load the current/saved region
    const startArea = playerState.currentAreaId || 'region_west_meadow';
    this.areaManager.loadArea(startArea, spawnX, spawnY);
    this.questManager.restoreFollowers(this);
    this.questManager.updateHUD();

    // 5. Initialize Player Controller with unified inputs & A*
    this.playerController = new PlayerController({
      scene: this,
      sprite: this.player,
      navigationService: this.nav,
      session: this.session,
      speed: 125,
      characterKey: currentTexKey,
      audioService: this.audio
    });

    // 6. Camera smooth follow
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 7. Subscribe to avatar changes from Profile Modal
    this.session.subscribe('settings.changed', (updatedPlayer) => {
      if (updatedPlayer.avatarId) {
        const newTexKey = this.getTextureKeyForAvatar(updatedPlayer.avatarId);
        this.player.setTexture(newTexKey, 12);
        this.playerController.setCharacterKey(newTexKey);
      }
    });
  }

  createCharacterAnimations() {
    const characterKeys = [
      'capybara_natural',
      'capybara_gardener',
      'capybara_baker',
      'sky_puppy',
      'long_ear_white_puppy',
      'forest_imp'
    ];

    const directions = [
      { dir: 'down', frames: [4, 12, 20] },
      { dir: 'up', frames: [3, 11, 19] },
      { dir: 'left', frames: [6, 14, 22] },
      { dir: 'right', frames: [1, 9, 17] },
      { dir: 'down-right', frames: [0, 8, 16] },
      { dir: 'down-left', frames: [7, 15, 23] },
      { dir: 'up-right', frames: [2, 10, 18] },
      { dir: 'up-left', frames: [5, 13, 21] }
    ];

    for (const char of characterKeys) {
      const texKey = this.namespace.namespaceTextureKey(char);

      for (const { dir, frames } of directions) {
        const animKey = `walk-${dir}-${texKey}`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(texKey, { frames }),
            frameRate: 7,
            repeat: -1
          });
        }
      }
    }
  }

  update(time, delta) {
    if (this.playerController) {
      this.playerController.update(time, delta);
    }
    if (this.depthOcclusion) {
      this.depthOcclusion.update(delta);
    }
    if (this.interaction) {
      this.interaction.update(delta);
    }
    if (this.areaManager) {
      this.areaManager.update(delta);
    }
    if (this.followerSystem) {
      this.followerSystem.update(delta);
    }
  }
}
