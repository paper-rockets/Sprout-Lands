/**
 * Background music: one tune for each place (art.json "music.places"), which fades into the next tune
 * when the player walks somewhere else (a region name, a room style, "room" for any other room, or
 * "default"). Tunes stream as they play (nothing is downloaded up front) and loop by fading the end
 * of the tune into its own beginning. The Music slider in Settings sets the volume; the Sound
 * "muted" setting silences it; it pauses while the game is in a hidden tab. Browsers only allow
 * sound after the player's first tap or key press, so the first tune starts then.
 *
 * `setMood('title')` plays that place's tune instead of the world's (the start screen); `setMood(null)` ends it.
 * The game scene calls update() every frame with the names of the place the player is in.
 */
export class MusicPlayer {
  constructor(config, getSettings) {
    this.config = config || { places: {} };
    this.getSettings = getSettings;
    this.voices = []; // tunes that are playing or fading: { id, audio, gain, target, looped }
    this.wanted = null;
    this.mood = null;
    this.unlocked = false;
    this.started = false;
  }

  /** Wait for the player's first tap or key press. */
  start() {
    if (this.started) return;
    this.started = true;
    const begin = () => {
      window.removeEventListener('pointerdown', begin, true);
      window.removeEventListener('keydown', begin, true);
      this.unlocked = true;
    };
    window.addEventListener('pointerdown', begin, true);
    window.addEventListener('keydown', begin, true);
    document.addEventListener('visibilitychange', () => {
      for (const v of this.voices) {
        if (document.hidden) v.audio.pause();
        else v.audio.play().catch(() => {});
      }
    });
  }

  level() {
    const s = this.getSettings();
    if (s.muted) return 0;
    return (s.musicVolume ?? 0.5) * (this.config.volume ?? 0.7);
  }

  /** The volume changed in Settings. */
  refresh() {
    for (const v of this.voices) v.audio.volume = Math.min(1, this.level() * v.gain);
  }

  setMood(id) {
    this.mood = id;
  }

  /** Which tune plays in a place: the first of `names` the config knows, else "default". */
  pick(names) {
    if (this.mood && this.config.places?.[this.mood]) return this.config.places[this.mood];
    const places = this.config.places || {};
    for (const n of names) if (n && places[n]) return places[n];
    return places.default || null;
  }

  update(delta, names) {
    if (!this.unlocked) return;
    const id = this.pick(names);
    if (id !== this.wanted) {
      this.wanted = id;
      for (const v of this.voices) v.target = 0;
      if (id) this.begin(id, this.voices.length ? this.config.fade ?? 2.5 : 1.2);
    }
    const dt = Math.min(delta, 100) / 1000;
    const loopFade = this.config.loopFade ?? 4;
    for (const v of this.voices.slice()) {
      const rate = dt / (v.fadeTime || 2.5);
      v.gain = v.gain < v.target ? Math.min(v.target, v.gain + rate) : Math.max(v.target, v.gain - rate);
      v.audio.volume = Math.min(1, Math.max(0, this.level() * v.gain));
      if (v.target === 0 && v.gain === 0) this.end(v);
      else if (v.target === 1 && !v.looped && v.audio.duration && v.audio.currentTime > v.audio.duration - loopFade) {
        v.looped = true; // the tune's end fades into its beginning
        v.target = 0;
        v.fadeTime = loopFade;
        this.begin(v.id, loopFade);
      }
    }
  }

  begin(id, fadeTime) {
    const audio = new Audio(`assets/music/${id}.ogg`);
    audio.preload = 'auto';
    audio.volume = 0;
    const voice = { id, audio, gain: 0, target: 1, looped: false, fadeTime };
    audio.addEventListener('error', () => this.end(voice)); // a tune that cannot load never silences the game
    this.voices.push(voice);
    audio.play().catch(() => {});
  }

  end(voice) {
    voice.audio.pause();
    voice.audio.removeAttribute('src');
    voice.audio.load();
    const i = this.voices.indexOf(voice);
    if (i >= 0) this.voices.splice(i, 1);
  }
}
