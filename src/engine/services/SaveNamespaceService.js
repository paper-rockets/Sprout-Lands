/**
 * Save and Storage Namespace Isolation Service.
 * Ensures that different personalized game editions cannot overwrite each other's
 * save data, profile images, service-worker caches, or texture keys.
 */

export class SaveNamespaceService {
  constructor(gameId) {
    if (!gameId || typeof gameId !== 'string') {
      throw new Error(`SaveNamespaceService: A non-empty string gameId is required (got ${gameId})`);
    }
    this.gameId = gameId.trim().toLowerCase();
  }

  // LocalStorage progress key
  getSaveKey(version = 'v1') {
    return `personal-adventure:${this.gameId}:save:${version}`;
  }

  // Settings key
  getSettingsKey() {
    return `personal-adventure:${this.gameId}:settings:v1`;
  }

  // Profile image IndexedDB name
  getProfileDbName() {
    return `personal-adventure-profile-${this.gameId}`;
  }

  // Service worker cache prefix
  getCachePrefix(cacheVersion = 'v1') {
    return `pwa-${this.gameId}-${cacheVersion}`;
  }

  // Texture key namespace to prevent Phaser texture cache collisions
  namespaceTextureKey(key) {
    return `${this.gameId}::${key}`;
  }

  // PWA manifest identity
  getManifestIdentity() {
    return `/${this.gameId}/`;
  }
}
