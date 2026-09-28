/**
 * Local Profile Picture Storage Service using IndexedDB.
 * Stores resized avatar images strictly on the local device without network upload,
 * keeping player photos 100% private.
 */

export class ProfileImageService {
  constructor(namespaceService) {
    this.dbName = namespaceService.getProfileDbName();
    this.storeName = 'profile_photos';
    this.dbPromise = null;
  }

  async getDb() {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('[ProfileImageService] IndexedDB is not supported in this environment.');
      return null;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => {
        console.error('[ProfileImageService] IndexedDB error:', event.target.error);
        resolve(null);
      };
    });

    return this.dbPromise;
  }

  /**
   * Resizes an image File/Blob to a square thumbnail (e.g. 128x128) using HTML Canvas.
   */
  async resizeImage(file, targetSize = 128) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        // Draw cropped/centered square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for resizing'));
      };

      img.src = url;
    });
  }

  async savePhoto(blob) {
    const db = await this.getDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.put(blob, 'current_avatar_photo');

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (err) {
        console.error('[ProfileImageService] Failed to save photo:', err);
        resolve(false);
      }
    });
  }

  async loadPhoto() {
    const db = await this.getDb();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.storeName], 'readonly');
        const store = tx.objectStore(this.storeName);
        const request = store.get('current_avatar_photo');

        request.onsuccess = (event) => {
          const blob = event.target.result;
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      } catch (err) {
        console.error('[ProfileImageService] Failed to load photo:', err);
        resolve(null);
      }
    });
  }

  async clearPhoto() {
    const db = await this.getDb();
    if (!db) return false;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction([this.storeName], 'readwrite');
        const store = tx.objectStore(this.storeName);
        const request = store.delete('current_avatar_photo');
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  }
}
