import Phaser from 'phaser';
import { CookPanel } from '../ui/CookPanel.js';
import { CreditsPanel } from '../ui/CreditsPanel.js';
import { DialogueBox } from '../ui/DialogueBox.js';
import { EndingPanel } from '../ui/EndingPanel.js';
import { Hud } from '../ui/Hud.js';
import { JournalPanel } from '../ui/JournalPanel.js';
import { MapPanel } from '../ui/MapPanel.js';
import { NoticeBanner } from '../ui/NoticeBanner.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { ShopPanel } from '../ui/ShopPanel.js';
import { StartScreen } from '../ui/StartScreen.js';
import { fillBlanks, uiScaleFor, words } from '../ui/theme.js';

/** Every full screen the game can show. Add new ones here. */
const SCREENS = {
  start: StartScreen,
  settings: SettingsPanel,
  credits: CreditsPanel,
  journal: JournalPanel,
  map: MapPanel,
  ending: EndingPanel,
  cook: CookPanel, // the oven
  shop: ShopPanel // a shop counter
};

const ACTION_KEYS = new Set(['Enter', ' ', 'e', 'E']);

/**
 * Everything drawn on top of the game world: the buttons, the goal note, the
 * speech box and the menu screens. It runs at a whole-number zoom (2 to 4), so
 * all sizes here are "UI pixels" and the pixel art stays sharp on any screen.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('ui');
  }

  create() {
    this.photos = this.registry.get('photos');
    this.session = this.registry.get('session');
    this.content = this.registry.get('content');
    this.modal = null;
    this.modalName = null;
    this.applyScale();
    this.hud = new Hud(this);
    this.dialogue = new DialogueBox(this);
    this.banner = new NoticeBanner(this);
    this.refreshGoal();

    this.scale.on('resize', this.onResize, this);
    this.input.keyboard.on('keydown', this.onKey, this);
    this.input.on('pointerdown', (pointer, over) => {
      // Tells the game world not to also walk towards a tap that landed on the UI.
      pointer.uiHandled = over.length > 0;
    });
    this.game.events.on('near-changed', this.onNear, this);
    this.session.events.on('changed', this.refreshGoal, this);
    this.session.events.on('changed', this.refreshHud, this);
    this.session.events.on('gained', this.hud.pop, this.hud);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onResize, this);
      this.game.events.off('near-changed', this.onNear, this);
      this.session.events.off('changed', this.refreshGoal, this);
      this.session.events.off('changed', this.refreshHud, this);
      this.session.events.off('gained', this.hud.pop, this.hud);
    });

    if (this.session.state.profile.hasPhoto) {
      this.photos.loadTexture(this).then(() => this.modal?.photoSlot?.showPhoto(this.photoKey()));
    }

    // ?ui=settings (and so on) opens a screen straight away, for screenshots and testing.
    // ?nostart skips the first-run start screen.
    const params = new URLSearchParams(window.location.search);
    const first = params.get('ui');
    if (first && this.hasScreen(first)) this.open(first, { keyboard: params.has('focus') });
    else if (!this.session.state.profile.ready && !params.has('nostart')) this.open('start');
    window.__UI_DEBUG__ = this;
  }

  /** The texture key of the player's photo avatar, or null when there is none. */
  photoKey() {
    return this.session.state.profile.hasPhoto && this.textures.exists(this.photos.textureKey) ? this.photos.textureKey : null;
  }

  /** Pick the whole-number zoom and work out how many UI pixels fit on the screen. */
  applyScale() {
    const { width, height } = this.scale;
    this.scaleFactor = uiScaleFor(width, height);
    this.uiW = Math.floor(width / this.scaleFactor);
    this.uiH = Math.floor(height / this.scaleFactor);
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    cam.setZoom(this.scaleFactor);
    cam.centerOn(width / (2 * this.scaleFactor), height / (2 * this.scaleFactor));
  }

  onResize() {
    this.applyScale();
    this.hud.layout();
    this.modal?.layout();
    this.dialogue.layout();
  }

  hasScreen(name) {
    return name in SCREENS;
  }

  /**
   * Open a full screen, replacing any that is open. Screens opened from another return to it when closed.
   * `opts.data` goes to the screen (the shop counter that was used, for example).
   */
  open(name, opts = {}) {
    const Screen = SCREENS[name];
    if (!Screen) throw new Error(`There is no screen called "${name}"`);
    const previous = this.modalName;
    if (this.modal) {
      this.modal.onClose = null;
      this.modal.close();
    }
    if (!previous) this.registry.get('audio')?.play(name === 'map' || name === 'journal' ? 'whoosh' : 'open', { volume: 0.7 });
    this.modalName = name;
    this.modal = new Screen(this, {
      data: opts.data,
      onClose: () => {
        this.registry.get('audio')?.play('close', { volume: 0.6 });
        this.modal = null;
        this.modalName = null;
        this.setBusy();
        if ((name === 'credits' || name === 'start') && previous === 'settings') this.open('settings');
      }
    });
    if (opts.keyboard) this.modal.focus.show();
    this.setBusy();
  }

  closeModal() {
    this.modal?.close();
  }

  /** Show the speech box. `lines` is a list of { speaker, portrait, text }; {name} becomes the player's name. */
  say(lines, onDone) {
    const name = this.session.state.profile.username;
    this.dialogue.show(lines.map((l) => ({ ...l, text: fillBlanks(l.text, { name }) })), onDone);
  }

  /** A sign drops in at the top for a moment: { kind: 'quest' | 'questDone' | 'area' | ..., text }. */
  notify(notice) {
    this.banner.push(notice);
  }

  /** The game world should stand still while a screen or the speech box is open. */
  setBusy() {
    const busy = Boolean(this.modal) || this.dialogue.active;
    this.registry.set('uiBusy', busy);
    this.hud.setHidden(busy);
  }

  onNear(info) {
    this.hud.setNear(info);
  }

  /** The line shown in the goal note. */
  objective() {
    return this.session.rules.objectiveText();
  }

  refreshGoal() {
    this.hud.setGoal(this.objective());
  }

  refreshHud() {
    this.hud.refresh();
  }

  onKey(event) {
    const key = event.key;
    if (this.dialogue.active) {
      if (ACTION_KEYS.has(key) && !event.repeat) this.dialogue.advance();
      else if (key === 'Escape') this.dialogue.close();
      return;
    }
    if (this.modal) {
      if (key === 'Enter' && event.repeat) return;
      this.modal.handleKey(key);
      return;
    }
    if (key === 'Escape') {
      this.open('settings', { keyboard: true });
      return;
    }
    if (ACTION_KEYS.has(key) && !event.repeat) this.game.events.emit('ui-interact');
  }

  update(time, delta) {
    this.dialogue.update(time, delta);
    this.banner.update();
    this.modal?.update?.(time, delta);
  }
}
