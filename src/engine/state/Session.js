import Phaser from 'phaser';
import { GameRules } from '../rules/GameRules.js';

/**
 * The running game's shared state: what the player has done, and their settings.
 * Every change is saved straight away, so closing the browser never loses progress.
 */
export class Session {
  constructor(content, store) {
    this.content = content;
    this.store = store;
    this.firstRun = !store.exists();
    this.state = store.load();
    this.rules = new GameRules(content, this.state);
    this.events = new Phaser.Events.EventEmitter();
  }

  get settings() {
    return this.state.settings;
  }

  /** The picture key of the character the player chose. */
  playerTexture() {
    const chars = this.content.characters;
    const chosen = chars[this.state.profile.avatarId] || Object.values(chars)[0];
    return chosen?.texture;
  }

  /** Add collectibles to the bag. `oneTimeId` marks a treasure as taken so it never comes back. */
  collect(itemId, count = 1, oneTimeId = null) {
    this.change((s) => {
      s.bag[itemId] = (s.bag[itemId] || 0) + count;
      if (oneTimeId && !s.collected.includes(oneTimeId)) s.collected.push(oneTimeId);
    });
    this.events.emit('gained', { item: itemId, count });
  }

  addCoins(count) {
    this.change((s) => { s.coins += count; });
    this.events.emit('gained', { coins: count });
  }

  addHearts(count) {
    this.change((s) => { s.hearts += count; });
    this.events.emit('gained', { hearts: count });
  }

  addStars(count) {
    this.change((s) => { s.stars += count; });
    this.events.emit('gained', { stars: count });
  }

  hasCollected(id) {
    return this.state.collected.includes(id);
  }

  /** How many of a group of collectibles (eggs, fruit, ...) the player has in total. */
  groupCount(group) {
    const items = this.content.art.items;
    return Object.entries(this.state.bag).reduce((sum, [id, n]) => sum + (items[id]?.group === group ? n : 0), 0);
  }

  save() {
    return this.store.save(this.state);
  }

  /** Change the state, save it, and tell listeners. */
  change(mutator) {
    mutator(this.state);
    this.save();
    this.events.emit('changed', this.state);
  }
}
