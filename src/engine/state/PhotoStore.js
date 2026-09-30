/**
 * The optional profile photo. It never leaves the device: the picture is cropped to a small round
 * avatar, stored in this browser's IndexedDB under a name made from the game's `gameId` (so two
 * gift games never share a photo), and turned into a texture for the menus to show.
 */
import Phaser from 'phaser';

const STORE = 'photos';
const KEY = 'profile';
const SIZE = 64; // pixels: the avatar is stored this big and shown much smaller

export class PhotoStore {
  constructor(gameId) {
    this.dbName = `personal-adventure:${gameId}:photos`;
    this.textureKey = `${gameId}:profile-photo`;
    this.opening = null;
  }

  db() {
    this.opening ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.opening;
  }

  async run(mode, work) {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  save(blob) {
    return this.run('readwrite', (store) => store.put(blob, KEY));
  }

  async load() {
    return (await this.run('readonly', (store) => store.get(KEY))) || null;
  }

  clear() {
    return this.run('readwrite', (store) => store.delete(KEY));
  }

  /** Read the saved photo (if any) and make it a texture in `scene`. Resolves to true when there is one. */
  async loadTexture(scene) {
    let blob = null;
    try {
      blob = await this.load();
    } catch {
      return false;
    }
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        if (scene.textures.exists(this.textureKey)) scene.textures.remove(this.textureKey);
        scene.textures.addImage(this.textureKey, image);
        scene.textures.get(this.textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR); // smooth when shrunk
        URL.revokeObjectURL(url);
        resolve();
      };
      image.onerror = resolve;
      image.src = url;
    });
    return scene.textures.exists(this.textureKey);
  }

  removeTexture(scene) {
    if (scene.textures.exists(this.textureKey)) scene.textures.remove(this.textureKey);
  }
}

/** A picked photo file -> a small round PNG (cropped from the middle, with a thin brown ring). */
export async function makeAvatar(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 3, 3, SIZE - 6, SIZE - 6);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 3, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#6b4b5b';
  ctx.stroke();
  bitmap.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('could not make the photo'))), 'image/png'));
}
