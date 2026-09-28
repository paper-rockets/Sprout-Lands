/**
 * Versioned Save & Persistence Service.
 * Manages player profile, settings, quest states, and world progress with
 * corrupt-save recovery, schema migrations, and in-memory storage fallback.
 */

export class SaveService {
  constructor(namespaceService, schemaVersion = '1.0.0') {
    this.namespace = namespaceService;
    this.currentSchemaVersion = schemaVersion;
    this.fallbackStorage = new Map();
    this.isStorageAvailable = this.checkStorageAvailability();
  }

  checkStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('[SaveService] localStorage is unavailable, falling back to in-memory store.');
      return false;
    }
  }

  getSaveKey() {
    return this.namespace.getSaveKey('v1');
  }

  loadSave(defaultState = {}) {
    const key = this.getSaveKey();
    let raw = null;

    try {
      if (this.isStorageAvailable) {
        raw = window.localStorage.getItem(key);
      } else {
        raw = this.fallbackStorage.get(key) || null;
      }
    } catch (err) {
      console.error('[SaveService] Failed to read from storage:', err);
    }

    if (!raw) {
      return { isNew: true, state: defaultState };
    }

    try {
      const parsed = JSON.parse(raw);
      const migrated = this.migrate(parsed, defaultState);
      return { isNew: false, state: migrated };
    } catch (err) {
      console.warn('[SaveService] Corrupt save detected! Safely recovering to default state.', err);
      return { isNew: true, state: defaultState, recoveredFromCorruption: true };
    }
  }

  saveGame(state) {
    const key = this.getSaveKey();
    const payload = {
      ...state,
      schemaVersion: this.currentSchemaVersion,
      savedAt: Date.now()
    };

    try {
      const json = JSON.stringify(payload);
      if (this.isStorageAvailable) {
        window.localStorage.setItem(key, json);
      } else {
        this.fallbackStorage.set(key, json);
      }
      return true;
    } catch (err) {
      console.error('[SaveService] Failed to write save state:', err);
      // Fallback to memory
      this.fallbackStorage.set(key, JSON.stringify(payload));
      return false;
    }
  }

  migrate(savedData, defaultState) {
    if (!savedData || typeof savedData !== 'object') {
      return defaultState;
    }

    // Merge missing default fields if new features were added
    const merged = { ...defaultState, ...savedData };

    // Schema version checks and transformations
    if (savedData.schemaVersion !== this.currentSchemaVersion) {
      console.log(`[SaveService] Migrating save from ${savedData.schemaVersion || '0.0.0'} to ${this.currentSchemaVersion}`);
      merged.schemaVersion = this.currentSchemaVersion;
    }

    return merged;
  }

  resetSave() {
    const key = this.getSaveKey();
    try {
      if (this.isStorageAvailable) {
        window.localStorage.removeItem(key);
      }
      this.fallbackStorage.delete(key);
      return true;
    } catch (err) {
      console.error('[SaveService] Failed to clear save:', err);
      return false;
    }
  }
}
