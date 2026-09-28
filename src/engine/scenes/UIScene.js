import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
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
    const { width } = this.scale;
    const player = this.session.getState().player;

    // 1. Authentic Sprout Lands HUD Dialogue Box (Top-Left)
    const hudBox = this.add.image(16, 14, this.namespace.namespaceTextureKey('ui_dialog_box'))
      .setOrigin(0, 0)
      .setScale(1.35);

    // Character Portrait inside the wooden frame
    const portraitX = 16 + (38 * 1.35);
    const portraitY = 14 + (32 * 1.35);
    this.playerPortrait = this.add.sprite(portraitX, portraitY, this.getTextureKeyForAvatar(player.avatarId), 12)
      .setScale(2.2);

    // Title and Player Name in SproutLands Pixel Font
    const title = this.gameConfig.shortTitle ? `${this.gameConfig.shortTitle} Island` : this.gameConfig.title;
    this.playerTitleText = this.add.text(16 + (62 * 1.35), 14 + (16 * 1.35), title, {
      fontFamily: 'SproutLands',
      fontSize: '12px',
      color: '#432c21'
    });

    this.playerBadgeText = this.add.text(16 + (62 * 1.35), 14 + (34 * 1.35), `Adventurer: ${player.username || 'Adventurer'}`, {
      fontFamily: 'SproutLands',
      fontSize: '11px',
      color: '#6a4938'
    });

    // 1b. Active Quest Objective Tracker Banner (Top-Left, below portrait)
    const trackerContainer = this.add.container(16, 94);
    const trackerBg = this.add.image(0, 0, this.namespace.namespaceTextureKey('ui_dialog_small'))
      .setOrigin(0, 0)
      .setScale(1.6, 0.66);
    const trackerW = 280;
    const trackerH = 42;

    const drawTracker = (isHover = false) => {
      trackerBg.setTint(isHover ? 0xf5fff0 : 0xffffff);
    };
    drawTracker(false);
    trackerContainer.add(trackerBg);

    this.questObjectiveText = this.add.text(18, 21, 'Explore the island and talk to villagers.', {
      fontFamily: 'SproutLands',
      fontSize: '10px',
      color: '#432c21'
    }).setOrigin(0, 0.5);
    trackerContainer.add(this.questObjectiveText);

    const trackerHit = this.add.zone(trackerW / 2, trackerH / 2, trackerW, trackerH)
      .setInteractive({ useHandCursor: true });
    trackerContainer.add(trackerHit);

    trackerHit.on('pointerover', () => drawTracker(true));
    trackerHit.on('pointerout', () => drawTracker(false));
    trackerHit.on('pointerdown', () => {
      if (window.__ATLAS_JOURNAL_MODAL__) {
        window.__ATLAS_JOURNAL_MODAL__.show('journal');
      }
    });

    // 2. Authentic Sprout Lands Profile & Settings Button (Top-Right)
    const btnW = 150;
    const btnH = 34;
    const btnX = width - btnW - 16;
    const btnY = 16;

    const btnContainer = this.add.container(btnX, btnY);

    const btnBg = this.add.graphics();
    const drawButton = (isHover = false, isPressed = false) => {
      btnBg.clear();
      const fillCol = isPressed ? 0x558b2f : (isHover ? 0x84b24b : 0x739d42);
      const topCol = isPressed ? 0x2f5416 : 0x9ecc61;
      const botCol = isPressed ? 0x9ecc61 : 0x2f5416;

      // Drop shadow
      btnBg.fillStyle(0x000000, 0.35);
      btnBg.fillRoundedRect(2, 2, btnW, btnH, 4);

      // Main background
      btnBg.fillStyle(fillCol, 1);
      btnBg.fillRoundedRect(0, 0, btnW, btnH, 4);

      // Bevel borders
      btnBg.lineStyle(2, topCol, 1);
      btnBg.beginPath();
      btnBg.moveTo(2, btnH - 2);
      btnBg.lineTo(2, 2);
      btnBg.lineTo(btnW - 2, 2);
      btnBg.strokePath();

      btnBg.lineStyle(2, botCol, 1);
      btnBg.beginPath();
      btnBg.moveTo(btnW - 2, 2);
      btnBg.lineTo(btnW - 2, btnH - 2);
      btnBg.lineTo(2, btnH - 2);
      btnBg.strokePath();
    };
    drawButton(false, false);
    btnContainer.add(btnBg);

    // Gear Icon
    const gearIcon = this.add.sprite(18, btnH / 2, this.namespace.namespaceTextureKey('ui_icons'), 0)
      .setScale(1.1)
      .setTint(0xffffff);
    btnContainer.add(gearIcon);

    // Button Text
    const btnText = this.add.text(32, btnH / 2 - 1, 'Profile & Settings', {
      fontFamily: 'SproutLands',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    btnText.setShadow(1, 1, '#1b350a', 0);
    btnContainer.add(btnText);

    // Interactive Zone
    const hitArea = this.add.zone(btnW / 2, btnH / 2, btnW, btnH)
      .setInteractive({ useHandCursor: true });
    btnContainer.add(hitArea);

    hitArea.on('pointerover', () => drawButton(true, false));
    hitArea.on('pointerout', () => drawButton(false, false));
    hitArea.on('pointerdown', () => {
      drawButton(false, true);
      if (window.__PROFILE_MODAL__) {
        window.__PROFILE_MODAL__.show(false);
      }
    });
    hitArea.on('pointerup', () => drawButton(true, false));

    // 2b. Pocket Atlas & Journal HUD Button (Next to Profile)
    const atlasBtnW = 160;
    const atlasBtnH = 34;
    const atlasBtnX = btnX - atlasBtnW - 12;
    const atlasBtnY = 16;

    const atlasBtnContainer = this.add.container(atlasBtnX, atlasBtnY);
    const atlasBtnBg = this.add.graphics();

    const drawAtlasButton = (isHover = false, isPressed = false) => {
      atlasBtnBg.clear();
      const fillCol = isPressed ? 0x8d623d : (isHover ? 0xd4a76a : 0xba8c53);
      const topCol = isPressed ? 0x4a2a16 : 0xf1dcba;
      const botCol = isPressed ? 0xf1dcba : 0x4a2a16;

      atlasBtnBg.fillStyle(0x000000, 0.35);
      atlasBtnBg.fillRoundedRect(2, 2, atlasBtnW, atlasBtnH, 4);

      atlasBtnBg.fillStyle(fillCol, 1);
      atlasBtnBg.fillRoundedRect(0, 0, atlasBtnW, atlasBtnH, 4);

      atlasBtnBg.lineStyle(2, topCol, 1);
      atlasBtnBg.beginPath();
      atlasBtnBg.moveTo(2, atlasBtnH - 2);
      atlasBtnBg.lineTo(2, 2);
      atlasBtnBg.lineTo(atlasBtnW - 2, 2);
      atlasBtnBg.strokePath();

      atlasBtnBg.lineStyle(2, botCol, 1);
      atlasBtnBg.beginPath();
      atlasBtnBg.moveTo(atlasBtnW - 2, 2);
      atlasBtnBg.lineTo(atlasBtnW - 2, atlasBtnH - 2);
      atlasBtnBg.lineTo(2, atlasBtnH - 2);
      atlasBtnBg.strokePath();
    };
    drawAtlasButton(false, false);
    atlasBtnContainer.add(atlasBtnBg);

    const atlasBtnText = this.add.text(16, atlasBtnH / 2 - 1, 'Atlas & Journal', {
      fontFamily: 'SproutLands',
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0, 0.5);
    atlasBtnText.setShadow(1, 1, '#3e2212', 0);
    atlasBtnContainer.add(atlasBtnText);

    const atlasHit = this.add.zone(atlasBtnW / 2, atlasBtnH / 2, atlasBtnW, atlasBtnH)
      .setInteractive({ useHandCursor: true });
    atlasBtnContainer.add(atlasHit);

    atlasHit.on('pointerover', () => drawAtlasButton(true, false));
    atlasHit.on('pointerout', () => drawAtlasButton(false, false));
    atlasHit.on('pointerdown', () => {
      drawAtlasButton(false, true);
      if (window.__ATLAS_JOURNAL_MODAL__) {
        window.__ATLAS_JOURNAL_MODAL__.show('atlas');
      }
    });
    atlasHit.on('pointerup', () => drawAtlasButton(true, false));

    // Keyboard Hotkeys
    this.input.keyboard.on('keydown-M', () => {
      if (window.__ATLAS_JOURNAL_MODAL__) {
        window.__ATLAS_JOURNAL_MODAL__.show('atlas');
      }
    });
    this.input.keyboard.on('keydown-J', () => {
      if (window.__ATLAS_JOURNAL_MODAL__) {
        window.__ATLAS_JOURNAL_MODAL__.show('journal');
      }
    });
    this.input.keyboard.on('keydown-P', () => {
      if (window.__PROFILE_MODAL__) {
        window.__PROFILE_MODAL__.show(false);
      }
    });

    // 3. Movement Controls Hint
    const hintBg = this.add.image(width - 250, 60, this.namespace.namespaceTextureKey('ui_dialog_small'))
      .setOrigin(0, 0)
      .setScale(1.33, 0.55)
      .setAlpha(0.96);

    this.add.text(width - 133, 78, 'WASD · Arrows · Click', {
      fontFamily: 'SproutLands',
      fontSize: '11px',
      color: '#432c21'
    }).setOrigin(0.5);

    // Listen for session profile updates
    this.session.subscribe('settings.changed', (state) => {
      if (state.username) {
        this.playerBadgeText.setText(`Adventurer: ${state.username}`);
      }
      if (state.avatarId) {
        const texKey = this.getTextureKeyForAvatar(state.avatarId);
        this.playerPortrait.setTexture(texKey, 12);
      }
    });

    this.createDialogueSystem();
  }

  createDialogueSystem() {
    const { width, height } = this.scale;
    const boxW = 562;
    const boxH = 118;
    const boxX = (width - boxW) / 2;
    const boxY = height - boxH - 24;

    this.dialogueContainer = this.add.container(boxX, boxY);
    this.dialogueContainer.setDepth(999999);
    this.dialogueContainer.setVisible(false);

    // A full Premium frame makes dialogue feel like an event instead of a
    // browser notification layered on top of the island.
    const bg = this.add.image(0, 0, this.namespace.namespaceTextureKey('ui_dialog_big'))
      .setOrigin(0, 0)
      .setScale(1.85);
    this.dialogueContainer.add(bg);

    // Speaker Name
    this.dialogueSpeaker = this.add.text(28, 20, '', {
      fontFamily: 'SproutLands',
      fontSize: '14px',
      color: '#784824'
    });
    this.dialogueContainer.add(this.dialogueSpeaker);

    // Message Body
    this.dialogueText = this.add.text(28, 45, '', {
      fontFamily: 'SproutLands',
      fontSize: '12px',
      color: '#432c21',
      wordWrap: { width: boxW - 56 }
    });
    this.dialogueContainer.add(this.dialogueText);

    // Continue Indicator
    this.dialoguePrompt = this.add.text(boxW - 26, boxH - 22, 'Tap or Space to continue', {
      fontFamily: 'SproutLands',
      fontSize: '10px',
      color: '#8d623d'
    }).setOrigin(1, 0.5);
    this.dialogueContainer.add(this.dialoguePrompt);

    // Hit area to dismiss
    const hitArea = this.add.zone(boxW / 2, boxH / 2, boxW, boxH)
      .setInteractive({ useHandCursor: true });
    this.dialogueContainer.add(hitArea);

    const closeDialogue = () => {
      if (this.dialogueContainer.visible) {
        if (Date.now() - (this.dialogueOpenTime || 0) < 300) return;
        this.tweens.add({
          targets: this.dialogueContainer,
          alpha: 0,
          duration: 150,
          onComplete: () => this.dialogueContainer.setVisible(false)
        });
      }
    };

    hitArea.on('pointerdown', closeDialogue);
    this.input.keyboard.on('keydown-SPACE', closeDialogue);
    this.input.keyboard.on('keydown-ENTER', closeDialogue);
    this.input.keyboard.on('keydown-E', closeDialogue);
  }

  showDialogueBox(speaker, text) {
    this.dialogueOpenTime = Date.now();
    this.dialogueSpeaker.setText(speaker);
    this.dialogueText.setText(text);
    this.dialogueContainer.setAlpha(0);
    this.dialogueContainer.setVisible(true);

    this.tweens.killTweensOf(this.dialogueContainer);
    this.tweens.add({
      targets: this.dialogueContainer,
      alpha: 1,
      duration: 180,
      ease: 'Power2'
    });
  }

  hideDialogueBox() {
    if (this.dialogueContainer && this.dialogueContainer.visible) {
      this.tweens.killTweensOf(this.dialogueContainer);
      this.dialogueContainer.setVisible(false);
      this.dialogueContainer.setAlpha(0);
    }
  }

  updateQuestObjective(text) {
    if (this.questObjectiveText) {
      this.questObjectiveText.setText(text);
    }
  }
}
