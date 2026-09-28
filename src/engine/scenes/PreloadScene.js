import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  init(data) {
    this.session = data.session;
    this.gameConfig = data.gameConfig;
    this.namespace = data.namespace;
  }

  preload() {
    const { width, height } = this.scale;

    // Loading Bar Graphics
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x19354e, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const titleText = this.add.text(width / 2, height / 2 - 50, this.gameConfig.title, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffd54f'
    }).setOrigin(0.5);

    const statusText = this.add.text(width / 2, height / 2 + 35, 'Loading assets...', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x8bc34a, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
      statusText.setText(`Loading: ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      titleText.destroy();
      statusText.destroy();
    });

    // 1. Load Character Sheets (128x48, 16x16 frames)
    const characters = [
      { key: 'capybara_natural', path: 'assets/characters/capybara-natural-walk-8dir-3frame-128x48.png' },
      { key: 'capybara_gardener', path: 'assets/characters/capybara-gardener-walk-8dir-3frame-128x48.png' },
      { key: 'capybara_baker', path: 'assets/characters/capybara-baker-walk-8dir-3frame-128x48.png' },
      { key: 'sky_puppy', path: 'assets/characters/sky-puppy-walk-8dir-3frame-128x48.png' },
      { key: 'long_ear_white_puppy', path: 'assets/characters/long-ear-white-puppy-walk-8dir-3frame-128x48.png' },
      { key: 'forest_imp', path: 'assets/characters/forest-imp-walk-8dir-3frame-128x48.png' }
    ];

    for (const char of characters) {
      this.load.spritesheet(this.namespace.namespaceTextureKey(char.key), char.path, {
        frameWidth: 16,
        frameHeight: 16
      });
    }

    // 2. Load Curated UI elements
    this.load.image(this.namespace.namespaceTextureKey('ui_btn_play'), 'assets/ui/buttons/UI Big Play Button.png');
    this.load.image(this.namespace.namespaceTextureKey('ui_dialog_box'), 'assets/ui/dialogue/Premade dialog box medium.png');
    this.load.image(this.namespace.namespaceTextureKey('ui_dialog_big'), 'assets/ui/dialogue/Premade dialog box big.png');
    this.load.image(this.namespace.namespaceTextureKey('ui_dialog_small'), 'assets/ui/dialogue/Premade dialog box small.png');
    this.load.image(this.namespace.namespaceTextureKey('ui_btn_round'), 'assets/ui/buttons/medium colored round buttons.png');
    this.load.spritesheet(this.namespace.namespaceTextureKey('ui_icons'), 'assets/ui/icons/All Icons.png', {
      frameWidth: 16,
      frameHeight: 16
    });

    // 3. Curated Premium world art. These files are a small, runtime-only
    // selection from the supplied commercial Sprout Lands sprites pack.
    this.load.image(this.namespace.namespaceTextureKey('env_trees'), 'assets/environment/premium-trees-stumps-bushes.png');
    this.load.image(this.namespace.namespaceTextureKey('env_meadow_objects'), 'assets/environment/premium-meadow-objects.png');
    this.load.image(this.namespace.namespaceTextureKey('env_signs'), 'assets/environment/premium-signs.png');
    this.load.image(this.namespace.namespaceTextureKey('env_water_objects'), 'assets/environment/premium-water-objects.png');
    this.load.image(this.namespace.namespaceTextureKey('env_wooden_bridge'), 'assets/environment/premium-wooden-bridge.png');
    this.load.image(this.namespace.namespaceTextureKey('env_house_roof'), 'assets/environment/premium-house-roof.png');
    this.load.image(this.namespace.namespaceTextureKey('env_house_walls'), 'assets/environment/premium-house-walls.png');
    this.load.image(this.namespace.namespaceTextureKey('env_grass_tiles'), 'assets/environment/premium-grass-tiles.png');
    this.load.image(this.namespace.namespaceTextureKey('env_water_tiles'), 'assets/environment/premium-water-tiles.png');
    this.load.image(this.namespace.namespaceTextureKey('env_fences'), 'assets/environment/premium-fences.png');
    this.load.image(this.namespace.namespaceTextureKey('env_chest'), 'assets/environment/premium-chest.png');
    this.load.image(this.namespace.namespaceTextureKey('env_picnic_blanket'), 'assets/environment/premium-picnic-blanket.png');
    this.load.image(this.namespace.namespaceTextureKey('env_picnic_basket'), 'assets/environment/premium-picnic-basket.png');
    this.load.image(this.namespace.namespaceTextureKey('env_soil_tiles'), 'assets/environment/premium-soil-tiles.png');
    this.load.spritesheet(this.namespace.namespaceTextureKey('premium_chicken_baby'), 'assets/characters/premium-chicken-baby.png', {
      frameWidth: 16,
      frameHeight: 16
    });

    // 4. Individual Premium grass tiles let the world form real banks and
    // paths instead of stretching one reference sheet across the map.
    const grassTiles = [
      ['grass_mid', 'Grass_tiles_v2_Mid.png'],
      ['grass_flowers_1', 'Grass_tiles_v2_Mid_Flowers1.png'],
      ['grass_flowers_2', 'Grass_tiles_v2_Mid_Flowers2.png'],
      ['grass_grass_1', 'Grass_tiles_v2_Mid_Grass1.png'],
      ['grass_grass_2', 'Grass_tiles_v2_Mid_Grass2.png'],
      ['grass_moss_1', 'Grass_tiles_v2_mMid_Moss1.png'],
      ['grass_moss_2', 'Grass_tiles_v2_Mid_Moss2.png'],
      ['grass_moss_3', 'Grass_tiles_v2_Mid_Moss3.png'],
      ['grass_moss_4', 'Grass_tiles_v2_Mid_Moss4.png'],
      ['grass_sprouts_1', 'Grass_tiles_v2_Mid_Sprouts1.png'],
      ['grass_sprouts_2', 'Grass_tiles_v2_Mid_Sprouts2.png'],
      ['grass_sprouts_3', 'Grass_tiles_v2_Mid_Sprouts3.png'],
      ['grass_sprouts_4', 'Grass_tiles_v2_Mid_Sprouts4.png'],
      ['grass_flat_north', 'Grass_tiles_v2_Flat_North.png'],
      ['grass_flat_south', 'Grass_tiles_v2_Flat_South.png'],
      ['grass_flat_west', 'Grass_tiles_v2_Flat_West.png'],
      ['grass_corner_ne', 'Grass_tiles_v2_Corner_NorthEast.png'],
      ['grass_corner_nw', 'Grass_tiles_v2_Corner_NortWest.png'],
      ['grass_corner_se', 'Grass_tiles_v2_Corner_SouthEast.png'],
      ['grass_corner_sw', 'Grass_tiles_v2_Corner_SouthWest.png'],
      ['grass_edge_ne', 'Grass_tiles_v2_Edge_NorthEast.png'],
      ['grass_edge_nw', 'Grass_tiles_v2_Edge_NorthWest.png'],
      ['grass_edge_se', 'Grass_tiles_v2_Edge_SouthEast.png'],
      ['grass_edge_sw', 'Grass_tiles_v2_Edge_SouthWest.png']
    ];
    for (const [key, filename] of grassTiles) {
      this.load.image(this.namespace.namespaceTextureKey(key), `assets/environment/premium-grass-cuts/${filename}`);
    }
  }

  create() {
    this.scene.start('WorldScene', {
      session: this.session,
      gameConfig: this.gameConfig,
      namespace: this.namespace
    });
    this.scene.start('UIScene', {
      session: this.session,
      gameConfig: this.gameConfig,
      namespace: this.namespace
    });
  }
}
