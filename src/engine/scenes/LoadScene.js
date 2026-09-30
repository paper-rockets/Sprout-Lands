import Phaser from 'phaser';

/** Loads every picture and sound listed in art.json, with a simple progress bar. */
export class LoadScene extends Phaser.Scene {
  constructor() {
    super('load');
  }

  preload() {
    const { art } = this.registry.get('content');
    const { width, height } = this.scale;
    const barWidth = Math.min(320, width * 0.6);
    const frame = this.add.rectangle(width / 2, height / 2, barWidth + 8, 18).setStrokeStyle(2, 0x5a3e2b);
    const bar = this.add.rectangle(width / 2 - barWidth / 2, height / 2, 0, 10, 0x8fbf5a).setOrigin(0, 0.5);
    this.load.on('progress', (p) => { bar.width = barWidth * p; });
    this.load.on('complete', () => { frame.destroy(); bar.destroy(); });

    // ?theme=halloween loads the pictures from assets-halloween/ (same file names and sizes as assets/).
    // Sounds, music and fonts always come from assets/.
    const theme = new URLSearchParams(window.location.search).get('theme');
    const themed = theme && /^[a-z]+$/.test(theme) ? theme : null;
    for (const [key, tex] of Object.entries(art.textures)) {
      const file = themed && tex.file.startsWith('assets/') ? tex.file.replace('assets/', `assets-${themed}/`) : tex.file;
      if (tex.frame) this.load.spritesheet(key, file, { frameWidth: tex.frame[0], frameHeight: tex.frame[1] });
      else this.load.image(key, file);
    }
    for (const [id, file] of Object.entries(art.sounds || {})) this.load.audio(`sfx-${id}`, file);
  }

  create() {
    // Animations from art.json are shared by every scene.
    const { art } = this.registry.get('content');
    for (const [key, a] of Object.entries(art.animations || {})) {
      if (this.anims.exists(key) || !this.textures.exists(a.tex)) continue;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(a.tex, { frames: a.frames }), frameRate: a.fps, repeat: a.repeat });
    }
    // Items cut out of a big sheet (vegetables) get a named picture frame.
    for (const item of Object.values(art.items || {})) {
      if (!item.rect) continue;
      const name = `rect:${item.rect.join(',')}`;
      const texture = this.textures.get(item.tex);
      if (!texture.has(name)) texture.add(name, 0, item.rect[0], item.rect[1], item.rect[2], item.rect[3]);
      item.frame = name;
    }
    this.scene.start('overworld');
  }
}
