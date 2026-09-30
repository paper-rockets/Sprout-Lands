/**
 * GameRules: the quest, dialogue, follower and lock logic, driven entirely by
 * the content package. It never touches Phaser, so the whole story can be
 * played through in Node tests.
 *
 * Every public method returns an Outcome: { lines, sounds, changed, notices }.
 *  - lines:   dialogue to show, in order ({ speaker, text, portrait })
 *  - sounds:  sound ids to play
 *  - changed: true when saved state changed
 *  - notices: short banners (quest started / step done / reward)
 *  - gained:  prizes handed out ({ stars } / { hearts } / { coins } / { item, count }), so the screen can show them
 *             (a negative count = it left the bag, like a treat given to a friend)
 *  - shared:  only when a friend took a treat: { item, heart } (heart = their first treat, a kindness heart)
 */

import * as Kitchen from './Kitchen.js';

export const STEP_TYPES = ['talk', 'gatherFollowers', 'escort', 'waterPlants', 'gatherHoney', 'inspectClues', 'collect', 'deliver', 'bring', 'reach'];
export const EFFECT_TYPES = ['setFlag', 'clearFlag', 'reward', 'unlock', 'sendHome', 'dismissFollowers', 'say', 'startQuest', 'openChest'];

export function createInitialState(content) {
  const cfg = content.config;
  return {
    schemaVersion: 2,
    gameId: cfg.gameId,
    profile: {
      username: cfg.recipient?.defaultName || 'Adventurer',
      avatarId: cfg.recipient?.avatarId || Object.keys(content.characters)[0],
      ready: false, // becomes true once the player has picked a name on the start screen
      hasPhoto: false // true when the player added a photo (kept on this device only, see PhotoStore)
    },
    player: { area: cfg.world?.startRegion || null, x: null, y: null, facing: 'down' },
    settings: {
      volume: cfg.accessibility?.soundVolume ?? 0.8,
      natureVolume: cfg.accessibility?.natureVolume ?? 0.5,
      musicVolume: cfg.accessibility?.musicVolume ?? 0.5,
      muted: false,
      textSpeed: cfg.accessibility?.textSpeed || 'normal',
      reducedMotion: Boolean(cfg.accessibility?.reducedMotion)
    },
    quests: {},
    tracked: null,
    entities: {},
    followers: [],
    clues: [],
    items: [],
    flags: {},
    rewards: [],
    discovered: [],
    routes: [],
    bag: {}, // how many of each collectible the player has (egg, apple, honey, ...)
    coins: 0,
    hearts: 0, // kindness hearts, earned by being nice to animals and friends
    stars: 0, // one for every finished quest
    collected: [], // one-time treasures already taken, so they do not come back
    fed: {}, // friends who were given a treat: id -> { count, full, loved, chats } (full = chats normally next time; loved = favourites had)
    likes: [], // friends whose favourite treat the player knows (from a hint or sharing it)
    playSeconds: 0,
    endingSeen: false
  };
}

const outcome = () => ({ lines: [], sounds: [], changed: false, notices: [], gained: [] });

function fill(template, vars) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}

export class GameRules {
  constructor(content, state) {
    this.content = content;
    this.state = state;
    this.quests = content.quests;
    this.entities = content.entityIndex; // id -> { entity, region }
  }

  /* ---------------- lookups ---------------- */

  /** Fill in {name} (the player), {title}, {shortTitle}, and {@some-id} (that person's or animal's name). */
  personalise(text) {
    const named = String(text ?? '').replace(/\{@([\w-]+)\}/g, (_, id) => this.entityName(id));
    return fill(named, {
      name: this.state.profile.username,
      title: this.content.config.title,
      shortTitle: this.content.config.shortTitle || this.content.config.title
    });
  }

  /**
   * How a person looks: their own character, or their "alt" look when the player picked
   * the same character as their own friend (so there are never two of the same).
   * e.g. "character": "forest-imp", "alt": { "character": "tabby-cat", "name": "Little Kitty" }
   */
  lookOf(e) {
    if (e?.alt && e.character && e.character === this.state.profile.avatarId) return { ...e, ...e.alt };
    return e;
  }

  entityName(id) {
    const e = this.lookOf(this.entities[id]?.entity);
    if (!e) return id;
    if (e.character && this.content.characters[e.character] && !e.name) return this.content.characters[e.character].name;
    return e.name || id;
  }

  speakerFor(id) {
    if (!id) return { speaker: '', portrait: null };
    const e = this.lookOf(this.entities[id]?.entity);
    return { speaker: this.entityName(id), portrait: e?.portrait || e?.character || e?.sprite || null };
  }

  line(speakerId, text) {
    // A thing (a picture from art.json objects, like a picnic blanket) does not talk: no name over its lines.
    const who = this.speakerFor(this.entities[speakerId]?.entity?.object ? null : speakerId);
    return { speaker: who.speaker, portrait: who.portrait, text: this.personalise(text) };
  }

  entityStatus(id) {
    return this.state.entities[id]?.status || 'wild';
  }

  setEntityStatus(id, status) {
    this.state.entities[id] = { ...(this.state.entities[id] || {}), status };
  }

  followersWithTag(tag) {
    return this.state.followers.filter((id) => (this.entities[id]?.entity?.tags || []).includes(tag));
  }

  questState(id) {
    return this.state.quests[id] || { status: 'not_started', step: 0 };
  }

  /* ---------------- conditions ---------------- */

  check(cond) {
    if (!cond) return true;
    if (Array.isArray(cond)) return cond.every((c) => this.check(c));
    if (cond.all) return cond.all.every((c) => this.check(c));
    if (cond.any) return cond.any.some((c) => this.check(c));
    if (cond.not) return !this.check(cond.not);
    if (cond.flag) return Boolean(this.state.flags[cond.flag]);
    if (cond.notFlag) return !this.state.flags[cond.notFlag];
    if (cond.questActive) return this.questState(cond.questActive).status === 'active';
    if (cond.questCompleted) return this.questState(cond.questCompleted).status === 'completed';
    if (cond.questNotStarted) return this.questState(cond.questNotStarted).status === 'not_started';
    if (cond.questsCompleted) return cond.questsCompleted.every((q) => this.questState(q).status === 'completed');
    if (cond.questStep) {
      const q = this.questState(cond.questStep.quest);
      const step = this.quests[cond.questStep.quest]?.steps[q.step];
      return q.status === 'active' && step?.id === cond.questStep.step;
    }
    if (cond.hasFollowers) return this.followersWithTag(cond.hasFollowers.tag).length >= (cond.hasFollowers.count || 1);
    if (cond.hasClues) return cond.hasClues.every((c) => this.state.clues.includes(c));
    if (cond.hasItem) return this.state.items.includes(cond.hasItem);
    if (cond.route) return this.isRouteOpen(cond.route);
    if (cond.entityStatus) return this.entityStatus(cond.entityStatus.id) === cond.entityStatus.status;
    return true;
  }

  isRouteOpen(routeId) {
    if (this.state.routes.includes(routeId)) return true;
    const route = this.content.world.routes?.[routeId];
    if (!route) return true;
    return route.requires ? this.check(route.requires) : false;
  }

  /** Is an entity or object currently in the world? */
  isPresent(def) {
    if (!def) return false;
    if (def.visibleWhen && !this.check(def.visibleWhen)) return false;
    if (def.hiddenWhen && this.check(def.hiddenWhen)) return false;
    if (def.id) {
      const status = this.entityStatus(def.id);
      if (status === 'gone' || status === 'collected') return false;
    }
    return true;
  }

  /* ---------------- effects ---------------- */

  applyEffects(effects, out, speakerId = null) {
    for (const effect of effects || []) {
      switch (effect.type) {
        case 'setFlag':
          this.state.flags[effect.flag] = true;
          break;
        case 'clearFlag':
          delete this.state.flags[effect.flag];
          break;
        case 'reward': {
          if (!this.state.rewards.includes(effect.id)) {
            this.state.rewards.push(effect.id);
            const reward = this.content.rewards[effect.id];
            out.notices.push({ kind: 'reward', text: reward ? reward.title : effect.id, icon: reward?.icon || 'star' });
            out.sounds.push('fanfare');
          }
          break;
        }
        case 'unlock':
          if (!this.state.routes.includes(effect.route)) this.state.routes.push(effect.route);
          if (effect.notice) out.notices.push({ kind: 'unlock', text: this.personalise(effect.notice), icon: 'enter' });
          break;
        case 'sendHome':
          for (const id of [...this.followersWithTag(effect.tag)]) {
            this.state.followers = this.state.followers.filter((f) => f !== id);
            this.setEntityStatus(id, 'home');
          }
          break;
        case 'dismissFollowers':
          for (const id of [...this.followersWithTag(effect.tag)]) {
            this.state.followers = this.state.followers.filter((f) => f !== id);
            this.setEntityStatus(id, effect.status || 'gone');
          }
          break;
        case 'say':
          for (const text of effect.lines || []) out.lines.push(this.line(effect.speaker || speakerId, text));
          break;
        case 'startQuest':
          this.startQuest(effect.quest, out);
          break;
        case 'openChest':
          this.setEntityStatus(effect.id, 'opened');
          break;
        default:
          throw new Error(`Unknown effect type "${effect.type}"`);
      }
    }
    out.changed = true;
  }

  /* ---------------- quests ---------------- */

  startQuest(questId, out = outcome()) {
    const quest = this.quests[questId];
    if (!quest) throw new Error(`Unknown quest "${questId}"`);
    if (this.questState(questId).status !== 'not_started') return out;
    if (quest.requires && !this.check(quest.requires)) return out;
    this.state.quests[questId] = { status: 'active', step: 0, startedAt: Date.now() };
    this.state.tracked = questId;
    out.notices.push({ kind: 'quest', text: quest.title, icon: 'alert' });
    out.sounds.push('quest-new');
    out.changed = true;
    return out;
  }

  currentStep(questId) {
    const q = this.questState(questId);
    if (q.status !== 'active') return null;
    return this.quests[questId].steps[q.step] || null;
  }

  /** True when a non-conversation step's goal is already met. */
  stepSatisfied(step, ctx = {}) {
    switch (step.type) {
      case 'gatherFollowers':
        return this.followersWithTag(step.tag).length >= step.count;
      case 'inspectClues':
        return step.clues.every((c) => this.state.clues.includes(c));
      case 'waterPlants':
        return (this.state.quests[ctx.questId]?.watered || []).length >= step.count;
      case 'gatherHoney':
        return Boolean(this.state.quests[ctx.questId]?.honey);
      case 'collect':
        return this.stepItems(step).every((i) => this.state.items.includes(i));
      case 'reach':
        return ctx.area === step.area;
      case 'escort': {
        if (this.followersWithTag(step.tag).length < (step.count || 1)) return false;
        if (step.area && ctx.area !== step.area) return false;
        if (step.to) {
          const target = this.entities[step.to];
          if (!target || !ctx.tile) return false;
          const tx = target.region.ox + target.entity.at[0];
          const ty = target.region.oy + target.entity.at[1];
          return Math.hypot(ctx.tile.x - tx, ctx.tile.y - ty) <= (step.radius || 3);
        }
        return true;
      }
      default:
        return false;
    }
  }

  completeStep(questId, out) {
    const quest = this.quests[questId];
    const q = this.state.quests[questId];
    const step = quest.steps[q.step];
    if (step.say) for (const text of step.say) out.lines.push(this.line(step.speaker || step.target || step.to, text));
    this.applyEffects(step.effects, out, step.speaker || step.target || step.to);
    q.step += 1;
    out.changed = true;
    if (q.step >= quest.steps.length) {
      q.status = 'completed';
      q.completedAt = Date.now();
      const done = quest.complete || {};
      if (done.say) for (const text of done.say) out.lines.push(this.line(done.speaker || quest.giver, text));
      this.applyEffects(done.effects, out, done.speaker || quest.giver);
      this.grant(quest.reward, out);
      out.notices.push({ kind: 'questDone', text: quest.title, icon: 'trophy', quest: questId });
      out.sounds.push('fanfare');
      if (this.state.tracked === questId) {
        this.state.tracked = Object.keys(this.state.quests).find((id) => this.state.quests[id].status === 'active') || null;
      }
    } else {
      out.sounds.push('tune');
      this.state.tracked = questId;
    }
  }

  /** Hand out a quest's prize: { stars, hearts, coins, items: { itemId: count } }. */
  grant(reward, out) {
    if (!reward) return;
    const s = this.state;
    for (const key of ['stars', 'hearts', 'coins']) {
      if (!reward[key]) continue;
      s[key] = (s[key] || 0) + reward[key];
      out.gained.push({ [key]: reward[key] });
    }
    for (const [item, count] of Object.entries(reward.items || {})) {
      s.bag[item] = (s.bag[item] || 0) + count;
      out.gained.push({ item, count });
    }
    out.changed = true;
  }

  /** Advance every active quest as far as its goals allow. */
  evaluate(ctx = {}, out = outcome()) {
    let progressed = true;
    let guard = 0;
    while (progressed && guard < 50) {
      progressed = false;
      guard += 1;
      for (const questId of Object.keys(this.state.quests)) {
        const step = this.currentStep(questId);
        if (step && step.type !== 'talk' && step.type !== 'deliver' && this.stepSatisfied(step, { ...ctx, questId })) {
          this.completeStep(questId, out);
          progressed = true;
        }
      }
    }
    return out;
  }

  objectiveText() {
    const questId = this.state.tracked && this.questState(this.state.tracked).status === 'active'
      ? this.state.tracked
      : Object.keys(this.state.quests).find((id) => this.state.quests[id].status === 'active');
    if (!questId) {
      const s = this.content.strings;
      if (this.allQuestsComplete()) return this.personalise(s.objectiveAllDone);
      // Someone is waiting with a quest: point the player to them.
      const waiting = Object.entries(this.quests).find(([id, q]) => q.giver && this.questState(id).status === 'not_started' && this.check(q.requires));
      if (waiting && s.objectiveMeet) return this.personalise(fill(s.objectiveMeet, { who: this.entityName(waiting[1].giver) }));
      return this.personalise(s.objectiveExplore);
    }
    return this.stepText(this.currentStep(questId), this.quests[questId].title);
  }

  /** How far along a step is: how many the player has, and how many are needed. */
  stepProgress(step) {
    if (step?.type === 'bring') {
      const wanted = Object.entries(step.bag || {});
      return {
        have: wanted.reduce((sum, [id, n]) => sum + Math.min(n, this.state.bag[id] || 0), 0),
        need: wanted.reduce((sum, [, n]) => sum + n, 0)
      };
    }
    if (step?.type === 'collect' || step?.type === 'deliver') {
      const wanted = this.stepItems(step);
      return { have: wanted.filter((i) => this.state.items.includes(i)).length, need: wanted.length };
    }
    if (step?.type === 'waterPlants') {
      const questId = Object.keys(this.quests).find((id) => this.quests[id].steps.includes(step));
      return { have: Math.min(step.count, (this.state.quests[questId]?.watered || []).length), need: step.count };
    }
    const have = step?.tag ? this.followersWithTag(step.tag).length : step?.clues ? step.clues.filter((c) => this.state.clues.includes(c)).length : 0;
    const need = step?.count || step?.clues?.length || 0;
    return { have, need };
  }

  /** The wording of a step's goal, with the counts filled in, like "Find the chicks (1 of 3)". */
  stepText(step, fallback = '') {
    return this.personalise(fill(step?.objective || fallback, this.stepProgress(step)));
  }

  /**
   * What the quest journal shows: every quest the player has started, with the
   * steps reached so far. Steps still to come are not shown, so nothing is spoiled.
   * Each entry carries what the screen needs to draw pictures: who gave the quest, the
   * reward, and for each step its icon and progress. The quest being followed comes first.
   */
  journal() {
    const entries = [];
    for (const [id, quest] of Object.entries(this.quests)) {
      const q = this.questState(id);
      if (q.status === 'not_started') continue;
      const done = q.status === 'completed';
      const steps = [];
      quest.steps.forEach((step, i) => {
        if (!done && i > q.step) return;
        const state = done || i < q.step ? 'done' : 'current';
        const progress = this.stepProgress(step);
        steps.push({ text: this.stepText(step, quest.title), state, icon: step.icon || null, have: state === 'done' ? progress.need : progress.have, need: progress.need, icons: this.stepIcons(step, state === 'done') });
      });
      const giver = quest.giver ? this.speakerFor(quest.giver) : { speaker: '', portrait: null };
      entries.push({
        id,
        title: this.personalise(quest.title),
        done,
        tracked: this.state.tracked === id,
        giver: { name: giver.speaker, portrait: giver.portrait },
        icon: quest.icon || null,
        reward: quest.reward || null,
        steps
      });
    }
    entries.sort((a, b) => Number(a.done) - Number(b.done) || Number(b.tracked) - Number(a.tracked));
    return entries;
  }

  /** The things a "collect" or "deliver" step is about: "items" (several) or "item" (one). */
  stepItems(step) {
    return step.items || (step.item ? [step.item] : []);
  }

  /** For a "bring" step: one small picture per thing to bring, and whether the player has it yet. */
  stepIcons(step, done) {
    if (step.type !== 'bring') return null;
    const icons = [];
    for (const [id, n] of Object.entries(step.bag || {})) {
      const have = done ? n : Math.min(n, this.state.bag[id] || 0);
      for (let i = 0; i < n; i += 1) icons.push({ icon: id, got: i < have });
    }
    return icons;
  }

  /** True when the bag holds everything a "bring" step asks for. */
  hasBag(bag) {
    return Object.entries(bag || {}).every(([id, n]) => (this.state.bag[id] || 0) >= n);
  }

  /* ---------------- cooking and shops (the rules are in Kitchen.js) ---------------- */

  /** Cook a recipe at the oven. The food goes in the bag. */
  cook(recipeId) {
    const out = outcome();
    const done = Kitchen.cook(this.content, this.state, recipeId);
    out.result = done;
    if (!done.ok) {
      out.sounds.push('locked');
      return out;
    }
    out.changed = true;
    out.sounds.push('cook');
    out.gained.push({ item: done.made, count: done.count });
    return out;
  }

  /** Buy one of an item from a shop (only with enough coins). */
  buy(shopId, item) {
    const out = outcome();
    const done = Kitchen.buy(this.content, this.state, shopId, item);
    out.result = done;
    if (!done.ok) {
      out.sounds.push('locked');
      return out;
    }
    out.changed = true;
    out.sounds.push('cash');
    out.gained.push({ item, count: 1 });
    return out;
  }

  /** Sell one of an item to a shop, for coins. */
  sell(shopId, item) {
    const out = outcome();
    const done = Kitchen.sell(this.content, this.state, shopId, item);
    out.result = done;
    if (!done.ok) {
      out.sounds.push('locked');
      return out;
    }
    out.changed = true;
    out.sounds.push('cash');
    out.gained.push({ coins: done.price });
    return out;
  }

  /* ---------------- interactions ---------------- */

  /** A plant was watered. Counts towards a "water plants" step (each plant once). */
  plantWatered(plantId, ctx = {}) {
    const out = outcome();
    for (const questId of Object.keys(this.state.quests)) {
      const step = this.currentStep(questId);
      if (step?.type !== 'waterPlants') continue;
      const q = this.state.quests[questId];
      q.watered = q.watered || [];
      if (q.watered.includes(plantId)) continue;
      q.watered.push(plantId);
      out.changed = true;
      out.sounds.push('found');
      this.evaluate(ctx, out);
    }
    return out;
  }

  /** True while a quest is waiting for honey from the hive (the hive then ignores its rest time). */
  wantsHoney() {
    return Object.keys(this.state.quests).some((id) => this.currentStep(id)?.type === 'gatherHoney');
  }

  /** Honey was collected from a hive. */
  honeyGathered(ctx = {}) {
    const out = outcome();
    for (const questId of Object.keys(this.state.quests)) {
      if (this.currentStep(questId)?.type !== 'gatherHoney') continue;
      this.state.quests[questId].honey = true;
      out.changed = true;
      this.evaluate(ctx, out);
    }
    return out;
  }

  /** The player talked to / used an entity. */
  interact(entityId, ctx = {}) {
    const out = outcome();
    const ref = this.entities[entityId];
    if (!ref) return out;
    const e = ref.entity;

    // 1. A conversation a quest is waiting for.
    for (const questId of Object.keys(this.state.quests)) {
      const step = this.currentStep(questId);
      if (!step) continue;
      if (step.type === 'talk' && step.target === entityId) {
        this.completeStep(questId, out);
        this.evaluate(ctx, out);
        out.sounds.unshift('talk');
        return out;
      }
      if (step.type === 'deliver' && step.target === entityId && this.stepItems(step).every((i) => this.state.items.includes(i))) {
        // Hand over the found things ("item": one, or "items": several, like three crystals).
        const given = this.stepItems(step);
        this.state.items = this.state.items.filter((i) => !given.includes(i));
        this.completeStep(questId, out);
        this.evaluate(ctx, out);
        return out;
      }
      if (step.type === 'bring' && step.target === entityId && this.hasBag(step.bag)) {
        // Everything is here: take it out of the bag and put it down.
        for (const [id, n] of Object.entries(step.bag)) {
          this.state.bag[id] -= n;
          if (this.state.bag[id] <= 0) delete this.state.bag[id];
        }
        this.completeStep(questId, out);
        this.evaluate(ctx, out);
        return out;
      }
    }

    // 2. Starting a quest with its giver.
    for (const questId of Object.keys(this.quests)) {
      const quest = this.quests[questId];
      if (quest.giver !== entityId || this.questState(questId).status !== 'not_started') continue;
      if (quest.requires && !this.check(quest.requires)) continue;
      this.startQuest(questId, out);
      const first = quest.steps[0];
      if (first?.type === 'talk' && first.target === entityId) this.completeStep(questId, out);
      this.evaluate(ctx, out);
      out.sounds.unshift('talk');
      return out;
    }

    // 3. Things that do something when used.
    switch (e.kind) {
      case 'follower':
        return this.interactFollower(entityId, e, ctx, out);
      case 'clue':
        return this.interactClue(entityId, e, ctx, out);
      case 'item':
        return this.interactItem(entityId, e, ctx, out);
      case 'chest':
        return this.interactChest(entityId, e, ctx, out);
      case 'blocker':
        // Something in the way (a log on a bridge): it says why, until the story moves it.
        for (const text of [].concat(e.say || [])) out.lines.push(this.line(null, text));
        out.sounds.push('locked');
        return out;
      default:
        break;
    }

    // 4. Quest hints, then the entity's own lines.
    for (const questId of Object.keys(this.state.quests)) {
      const step = this.currentStep(questId);
      const hint = step?.hints?.[entityId];
      if (hint) {
        for (const text of [].concat(hint)) out.lines.push(this.line(entityId, fill(text, this.stepProgress(step))));
        out.sounds.push('talk');
        return out;
      }
    }
    // 5. A friend who sees a treat in your bag takes one (then chats normally the next time).
    if (this.shareTreat(entityId, e, out)) return out;
    this.sayDefault(entityId, e, out);
    this.hintFavourite(entityId, e, out);
    return out;
  }

  /**
   * The treats in the bag a friend may have, most spare first. Food a quest still needs
   * (a "bring" step not done yet, even in a quest not started) is never offered.
   */
  spareTreats() {
    const group = this.content.cooking?.share?.group;
    if (!group) return [];
    const keep = {};
    for (const [questId, quest] of Object.entries(this.quests)) {
      const q = this.questState(questId);
      if (q.status === 'completed') continue;
      for (const step of quest.steps.slice(q.status === 'active' ? q.step : 0)) {
        for (const [id, n] of Object.entries(step.bag || {})) keep[id] = (keep[id] || 0) + n;
      }
    }
    const items = this.content.art.items;
    return Object.entries(this.state.bag)
      .filter(([id]) => items[id]?.group === group)
      .map(([item, n]) => ({ item, spare: n - (keep[item] || 0) }))
      .filter((t) => t.spare > 0)
      .sort((a, b) => b.spare - a.spare);
  }

  /**
   * Who a person counts as for treats: themselves, or the friend named in "sameFriend"
   * (the picnic Bun is the same Baker Bun, so they share one favourite and one gift).
   */
  friendFor(entityId) {
    const e = this.entities[entityId]?.entity;
    return e?.sameFriend && this.entities[e.sameFriend] ? e.sameFriend : entityId;
  }

  /** A friend's favourite treat: { treat, say, hint, gift, giftSay } from their own entry, or null. */
  favouriteOf(entityId) {
    return this.entities[this.friendFor(entityId)]?.entity?.favourite || null;
  }

  /**
   * Talking to a friend (anyone under "npcs" but the ones who follow you) with a spare treat:
   * they take one and say thank you. The first treat for each friend is worth a kindness heart.
   * Lines come from cooking.json "share" ({treat} = its name), or the friend's own "treatSay".
   * If their favourite treat is spare they pick that one: their own "favourite.say" line, a bigger
   * heart burst, and the first time only, their "favourite.gift" (coins or bag items, like a quest prize).
   */
  shareTreat(entityId, e, out) {
    const share = this.content.cooking?.share;
    if (!share || !this.entities[entityId]?.person || e.kind === 'follower' || e.treats === false) return false;
    const friend = this.friendFor(entityId);
    this.state.fed = this.state.fed || {};
    const fed = this.state.fed[friend] || { count: 0, full: false };
    if (fed.full) {
      this.state.fed[friend] = { ...fed, full: false };
      out.changed = true;
      return false;
    }
    const spare = this.spareTreats();
    const fav = this.favouriteOf(entityId);
    const treat = spare.find((t) => t.item === fav?.treat) || spare[0];
    if (!treat) return false;
    const { item } = treat;
    const loved = item === fav?.treat;
    this.state.bag[item] -= 1;
    if (this.state.bag[item] <= 0) delete this.state.bag[item];
    this.state.fed[friend] = { ...fed, count: fed.count + 1, full: true };
    const says = loved && fav.say ? [].concat(fav.say) : [].concat(e.treatSay || share.say || []);
    const name = String(this.content.art.items[item]?.name || item).toUpperCase();
    const turn = loved ? fed.loved || 0 : fed.count;
    if (says.length) out.lines.push(this.line(entityId, fill(says[turn % says.length], { treat: name })));
    if (loved) this.state.fed[friend].loved = (fed.loved || 0) + 1;
    out.sounds.push('munch');
    out.gained.push({ item, count: -1 });
    out.shared = { item, heart: false };
    const key = `treat:${friend}`;
    if (!this.state.collected.includes(key)) {
      this.state.collected.push(key);
      this.state.hearts += 1;
      out.gained.push({ hearts: 1 });
      out.shared.heart = true;
    }
    if (loved) {
      out.shared.favourite = true;
      out.sounds.push('sparkle');
      this.learnFavourite(friend);
      const giftKey = `favourite:${friend}`;
      if (fav.gift && !this.state.collected.includes(giftKey)) {
        this.state.collected.push(giftKey);
        this.grant(fav.gift, out);
        for (const text of [].concat(fav.giftSay || [])) out.lines.push(this.line(entityId, text));
        out.shared.gift = fav.gift;
      }
    }
    out.changed = true;
    return true;
  }

  /** Remember that the player knows a friend's favourite (it shows in the journal's treats page). */
  learnFavourite(friend) {
    this.state.likes = this.state.likes || [];
    if (!this.state.likes.includes(friend)) this.state.likes.push(friend);
  }

  /**
   * After a normal chat, a friend who has not had their favourite yet hints at it every other
   * time (the first chat, the third...), and the journal's treats page then shows it.
   */
  hintFavourite(entityId, e, out) {
    const fav = this.favouriteOf(entityId);
    if (!fav?.hint || !this.entities[entityId]?.person || e.kind === 'follower' || e.treats === false) return;
    const friend = this.friendFor(entityId);
    this.state.fed = this.state.fed || {};
    const fed = this.state.fed[friend] || { count: 0, full: false };
    if (fed.loved) return;
    const chats = (fed.chats || 0) + 1;
    this.state.fed[friend] = { ...fed, chats };
    out.changed = true;
    if (chats % 2 === 0) return;
    const hints = [].concat(fav.hint);
    out.lines.push(this.line(entityId, hints[Math.floor(chats / 2) % hints.length]));
    if (!out.sounds.includes('talk')) out.sounds.push('talk');
    this.learnFavourite(friend);
  }

  /**
   * Everyone with a favourite treat, for the journal: name, face, their treat (null until the
   * player has heard a hint or shared it), and whether they have had it.
   */
  favourites() {
    const likes = this.state.likes || [];
    const list = [];
    for (const [id, ref] of Object.entries(this.entities)) {
      const fav = ref.entity.favourite;
      if (!fav || !ref.person) continue;
      const who = this.speakerFor(id);
      const known = likes.includes(id);
      list.push({ id, name: who.speaker, portrait: who.portrait, treat: known ? fav.treat : null, had: Boolean(this.state.fed?.[id]?.loved) });
    }
    return list;
  }

  sayDefault(entityId, e, out) {
    const options = e.dialogue ? this.content.dialogue[e.dialogue] || [] : [];
    const chosen = options.find((opt) => this.check(opt.when)) || null;
    const lines = chosen ? chosen.say : e.say ? [].concat(e.say) : [];
    for (const text of lines) out.lines.push(this.line(entityId, text));
    if (chosen?.effects) this.applyEffects(chosen.effects, out, entityId);
    if (lines.length) out.sounds.push('talk');
    return out;
  }

  interactFollower(id, e, ctx, out) {
    const status = this.entityStatus(id);
    if (status === 'following' || status === 'home') {
      const lines = status === 'home' ? e.homeSay : e.followSay;
      if (!lines) return this.sayDefault(id, e, out);
      for (const text of [].concat(lines)) out.lines.push(this.line(id, text));
      out.sounds.push(e.joinSound || 'peep');
      return out;
    }
    if (e.joinsWhen && !this.check(e.joinsWhen)) {
      for (const text of [].concat(e.notYetSay || [])) out.lines.push(this.line(id, text));
      return out;
    }
    this.setEntityStatus(id, 'following');
    if (!this.state.followers.includes(id)) this.state.followers.push(id);
    for (const text of [].concat(e.joinSay || [])) out.lines.push(this.line(id, text));
    out.sounds.push(e.joinSound || 'peep');
    out.changed = true;
    this.evaluate(ctx, out);
    return out;
  }

  interactClue(id, e, ctx, out) {
    if (!this.state.clues.includes(id)) {
      this.state.clues.push(id);
      this.setEntityStatus(id, 'found');
      out.sounds.push('found');
      out.changed = true;
      for (const text of [].concat(e.foundSay || e.say || [])) out.lines.push(this.line(null, text));
      this.evaluate(ctx, out);
    } else {
      for (const text of [].concat(e.againSay || e.foundSay || [])) out.lines.push(this.line(null, text));
    }
    return out;
  }

  interactItem(id, e, ctx, out) {
    if (this.state.items.includes(id)) return out;
    this.state.items.push(id);
    this.setEntityStatus(id, 'collected');
    for (const text of [].concat(e.pickupSay || [])) out.lines.push(this.line(null, text));
    out.sounds.push('found');
    out.changed = true;
    this.evaluate(ctx, out);
    return out;
  }

  interactChest(id, e, ctx, out) {
    if (this.entityStatus(id) === 'opened') {
      for (const text of [].concat(e.emptySay || [])) out.lines.push(this.line(null, text));
      return out;
    }
    if (e.opensWhen && !this.check(e.opensWhen)) {
      for (const text of [].concat(e.lockedSay || [])) out.lines.push(this.line(null, text));
      out.sounds.push('locked');
      return out;
    }
    this.setEntityStatus(id, 'opened');
    for (const text of [].concat(e.openSay || [])) out.lines.push(this.line(null, text));
    this.applyEffects(e.effects, out, null);
    out.sounds.push('found');
    out.changed = true;
    return out;
  }

  /** The player tried to use a locked route (door, ferry or gate). */
  routeBlocked(routeId, speakerId = null) {
    const out = outcome();
    const route = this.content.world.routes?.[routeId];
    for (const text of [].concat(route?.lockedSay || this.content.strings.routeLocked)) out.lines.push(this.line(speakerId || route?.speaker || null, text));
    out.sounds.push('locked');
    return out;
  }

  /** Called when the player enters a region. */
  enterArea(areaId, ctx = {}) {
    const out = outcome();
    if (areaId && !this.state.discovered.includes(areaId)) {
      this.state.discovered.push(areaId);
      out.changed = true;
      const region = this.content.regions[areaId] || this.content.rooms[areaId];
      if (region && !region.quiet) out.notices.push({ kind: 'area', text: region.name, icon: 'sprout' });
    }
    this.state.player.area = areaId;
    this.evaluate({ ...ctx, area: areaId }, out);
    return out;
  }

  /** Called every so often while walking, for escort goals. */
  playerMoved(ctx) {
    return this.evaluate(ctx);
  }

  /** True once every quest in the game is finished (never true when the game has no quests). */
  allQuestsComplete() {
    const ids = Object.keys(this.quests);
    return ids.length > 0 && ids.every((id) => this.questState(id).status === 'completed');
  }
}
