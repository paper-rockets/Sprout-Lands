/**
 * Saves the game in the browser (localStorage), under a key that belongs to
 * this gift game only: personal-adventure:<gameId>:save:v1.
 * Two different gift games never read or overwrite each other's save.
 */

import { createInitialState } from '../rules/GameRules.js';

export const SAVE_SCHEMA = 2;

export function saveKey(gameId) {
  return `personal-adventure:${gameId}:save:v1`;
}

export class SaveStore {
  constructor(content, storage = globalThis.localStorage) {
    this.content = content;
    this.storage = storage;
    this.key = saveKey(content.config.gameId);
  }

  /** Is there any saved game yet? */
  exists() {
    try {
      return this.storage?.getItem(this.key) != null;
    } catch {
      return false;
    }
  }

  /** The saved game, or a fresh one. Never throws. */
  load() {
    const fresh = createInitialState(this.content);
    let saved = null;
    try {
      const raw = this.storage?.getItem(this.key);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
    if (!saved || typeof saved !== 'object') return fresh;
    if (saved.schemaVersion !== SAVE_SCHEMA) {
      // A save from the old version: keep only the player's name and avatar.
      const name = saved.player?.username || saved.profile?.username;
      if (name) fresh.profile.username = String(name).slice(0, 16);
      return fresh;
    }
    const profile = { ...fresh.profile, ...saved.profile };
    // The former default avatar was replaced by the floppy puppy. Keep older
    // players' progress while showing the new playable character.
    if (profile.avatarId === 'capybara') profile.avatarId = 'floppy-pup';
    return {
      ...fresh,
      ...saved,
      profile,
      player: { ...fresh.player, ...saved.player },
      settings: { ...fresh.settings, ...saved.settings }
    };
  }

  /** Returns false when the browser refuses to store (private mode, full storage). */
  save(state) {
    try {
      this.storage?.setItem(this.key, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // nothing to clear
    }
  }
}
