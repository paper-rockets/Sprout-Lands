import { MusicPlayer } from './MusicPlayer.js';
import { NaturePlayer } from './NaturePlayer.js';

/**
 * Plays the short sound effects listed under "sounds" in art.json,
 * at the volume the player chose in Settings. The sounds are made by
 * scripts/tools/make-sounds.py.
 */
export class AudioService {
  constructor(game, getSettings) {
    this.game = game;
    this.getSettings = getSettings;
    this.played = []; // the last sounds asked for (the checks read this)
  }

  /**
   * Play a sound. `vary` (0 to 1) nudges the pitch a little at random each time,
   * so sounds that repeat a lot (footsteps, blips) never sound like a machine.
   */
  play(id, { volume = 1, rate = 1, vary = 0, delay = 0 } = {}) {
    this.played.push(id);
    if (this.played.length > 40) this.played.shift();
    const settings = this.getSettings();
    const level = settings.muted ? 0 : settings.volume * volume;
    if (level <= 0) return;
    const key = `sfx-${id}`;
    if (!this.game.cache.audio.exists(key)) return;
    const r = rate * (1 + (Math.random() * 2 - 1) * vary * 0.15);
    this.game.sound.play(key, { volume: level, rate: r, delay });
  }

  /** Start the nature sounds (birds, breeze, crickets, cave drips; see NaturePlayer). */
  startNature(config) {
    this.nature = new NaturePlayer(this.game, config, this.getSettings);
  }

  /** Start the background music (one tune for each place; see MusicPlayer). */
  startMusic(config) {
    this.music = new MusicPlayer(config, this.getSettings);
    this.music.start();
  }

  /** The music volume or mute setting changed. */
  refreshMusic() {
    this.music?.refresh();
  }

  /** The nature volume or mute setting changed. */
  refreshNature() {
    this.nature?.refresh();
  }
}
