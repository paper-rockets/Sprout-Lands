/**
 * Proximity Interaction System.
 * Detects nearby interactable entities (NPCs, signs, doors) and renders an
 * authentic Sprout Lands action prompt ("TALK", "READ", "INSPECT").
 * Supports Spacebar, 'E' key, and direct tap/click on the prompt.
 */

export class InteractionSystem {
  constructor({ scene, player, session, namespace }) {
    this.scene = scene;
    this.player = player;
    this.session = session;
    this.namespace = namespace;
    this.interactables = new Map();
    this.activeTarget = null;

    this.createPromptUI();
    this.setupControls();
  }

  createPromptUI() {
    this.promptContainer = this.scene.add.container(0, 0);
    this.promptContainer.setDepth(99999);
    this.promptContainer.setVisible(false);
    this.promptContainer.setAlpha(0);

    // Reuse the supplied compact Premium dialogue plate for each contextual
    // action, so interaction affordances belong to the same world as dialogue.
    this.promptBg = this.scene.add.image(0, 0, this.namespace.namespaceTextureKey('ui_dialog_small'))
      .setOrigin(0.5)
      .setScale(0.42, 0.58);
    this.drawPromptBox(false);
    this.promptContainer.add(this.promptBg);

    // Prompt text in SproutLands pixel font
    this.promptText = this.scene.add.text(0, -1, 'TALK', {
      fontFamily: 'SproutLands',
      fontSize: '11px',
      color: '#432c21'
    }).setOrigin(0.5);
    this.promptContainer.add(this.promptText);

    // Interactive hit zone for touch/click
    this.hitZone = this.scene.add.zone(0, 0, 60, 24)
      .setInteractive({ useHandCursor: true });
    this.promptContainer.add(this.hitZone);

    this.hitZone.on('pointerdown', () => {
      this.triggerInteraction();
    });
    this.hitZone.on('pointerover', () => this.drawPromptBox(true));
    this.hitZone.on('pointerout', () => this.drawPromptBox(false));
  }

  drawPromptBox(isHover = false) {
    this.promptBg.setTint(isHover ? 0xf5fff0 : 0xffffff);
  }

  setupControls() {
    this.spaceKey = this.scene.input.keyboard.addKey('SPACE');
    this.eKey = this.scene.input.keyboard.addKey('E');

    this.spaceKey.on('down', () => this.triggerInteraction());
    this.eKey.on('down', () => this.triggerInteraction());
  }

  registerInteractable(entity) {
    // entity: { id, type, x, y, radius = 40, label = 'TALK', onInteract }
    this.interactables.set(entity.id, entity);
  }

  unregisterInteractable(id) {
    if (this.activeTarget?.id === id) {
      this.activeTarget = null;
      this.hidePrompt();
    }
    this.interactables.delete(id);
  }

  triggerInteraction() {
    if (!this.activeTarget) return;

    const target = this.activeTarget;
    // Dispatch serializable session event
    this.session?.dispatchAction('INTERACT_ENTITY', {
      id: target.id,
      type: target.type
    });

    target.onInteract?.(target);
  }

  update(delta) {
    const px = this.player.x;
    const py = this.player.y;

    let closest = null;
    let closestDist = Infinity;

    for (const entity of this.interactables.values()) {
      const dist = Math.hypot(px - entity.x, py - entity.y);
      const radius = entity.radius || 42;
      if (dist <= radius && dist < closestDist) {
        closest = entity;
        closestDist = dist;
      }
    }

    if (closest) {
      if (this.activeTarget !== closest) {
        this.activeTarget = closest;
        this.showPrompt(closest);
      }
      // Float above target entity
      this.promptContainer.setPosition(closest.x, closest.y - 32);
    } else {
      if (this.activeTarget) {
        this.activeTarget = null;
        this.hidePrompt();
      }
    }
  }

  showPrompt(entity) {
    this.promptText.setText(entity.label || 'TALK');
    this.promptContainer.setVisible(true);
    this.scene.tweens.killTweensOf(this.promptContainer);
    this.scene.tweens.add({
      targets: this.promptContainer,
      alpha: 1,
      duration: 150,
      ease: 'Power2'
    });
  }

  hidePrompt() {
    this.scene.tweens.killTweensOf(this.promptContainer);
    this.scene.tweens.add({
      targets: this.promptContainer,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        if (!this.activeTarget) {
          this.promptContainer.setVisible(false);
        }
      }
    });
  }
}
