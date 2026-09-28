import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  init(data) {
    this.session = data.session;
    this.gameConfig = data.gameConfig;
    this.namespace = data.namespace;
  }

  create() {
    // Explicitly verify WebGL mode
    if (this.game.renderer.type !== Phaser.WEBGL) {
      console.error('Fatal: Phaser is not running in WebGL mode.');
      const errEl = document.getElementById('webgl-unsupported');
      if (errEl) errEl.style.display = 'flex';
      return;
    }

    // Proceed to Preload
    this.scene.start('PreloadScene', {
      session: this.session,
      gameConfig: this.gameConfig,
      namespace: this.namespace
    });
  }
}
