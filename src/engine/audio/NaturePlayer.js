/**
 * Nature sounds: a quiet sound that loops under everything (a breeze, crickets, the hum of a cave)
 * and calls that play now and then (birds, an owl, a friendly ghost, water dripping).
 * Which ones depends on where the player is: art.json "ambience.places" has one entry per
 * room style, region or "room" (any other room), and "default" for everywhere else.
 * The Nature slider in Settings sets the volume; the Sound "muted" setting silences it.
 * The game scene calls update() every frame with the name of the place.
 */
export class NaturePlayer {
  constructor(game, config, getSettings) {
    this.game = game;
    this.config = config || { places: {} };
    this.getSettings = getSettings;
    this.placeName = null;
    this.place = null;
    this.bed = null;
    this.wait = 3000; // the first call comes soon after the game starts
  }

  level() {
    const s = this.getSettings();
    if (s.muted) return 0;
    return (s.natureVolume ?? 0.5) * (this.config.volume ?? 0.5) * (s.volume ?? 1);
  }

  /** Where the player is: a room style (the cave), "room", a region name, or "default". */
  pick(names) {
    const places = this.config.places || {};
    for (const n of names) if (n && places[n]) return n;
    return 'default';
  }

  update(delta, names) {
    if (this.game.sound.locked) return; // browsers only allow sound after the first tap
    const name = this.pick(names);
    if (name !== this.placeName) this.enter(name);
    if (!this.place) return;
    this.wait -= delta;
    if (this.wait > 0) return;
    const [lo, hi] = this.place.every || [8, 16];
    this.wait = (lo + Math.random() * (hi - lo)) * 1000;
    const calls = this.place.calls || [];
    const level = this.level() * (this.place.callVolume ?? 0.4);
    if (!calls.length || level <= 0) return;
    const id = calls[Math.floor(Math.random() * calls.length)];
    const key = `sfx-${id}`;
    if (this.game.cache.audio.exists(key)) this.game.sound.play(key, { volume: level, rate: 0.9 + Math.random() * 0.2 });
  }

  enter(name) {
    this.placeName = name;
    this.place = this.config.places?.[name] || null;
    const bedId = this.place?.bed || null;
    if (this.bed && this.bed.bedId === bedId) return;
    this.bed?.stop();
    this.bed?.destroy();
    this.bed = null;
    const key = `sfx-${bedId}`;
    if (!bedId || !this.game.cache.audio.exists(key)) return;
    this.bed = this.game.sound.add(key, { loop: true, volume: this.bedLevel() });
    this.bed.bedId = bedId;
    this.bed.play();
  }

  bedLevel() {
    return this.level() * (this.place?.bedVolume ?? 0.3);
  }

  /** The volume changed in Settings. */
  refresh() {
    this.bed?.setVolume(this.bedLevel());
  }
}
