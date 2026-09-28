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
 */

export const STEP_TYPES = ['talk', 'gatherFollowers', 'escort', 'inspectClues', 'collect', 'deliver', 'reach'];
export const EFFECT_TYPES = ['setFlag', 'clearFlag', 'reward', 'unlock', 'sendHome', 'dismissFollowers', 'say', 'startQuest', 'openChest'];

export function createInitialState(content) {
  const cfg = content.config;
  return {
    schemaVersion: 2,
    gameId: cfg.gameId,
    profile: {
      username: cfg.recipient?.defaultName || 'Adventurer',
      avatarId: cfg.recipient?.avatarId || Object.keys(content.characters)[0]
    },
    player: { area: cfg.world?.startRegion || null, x: null, y: null, facing: 'down' },
    settings: {
      volume: cfg.accessibility?.soundVolume ?? 0.8,
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
    playSeconds: 0,
    endingSeen: false
  };
}

const outcome = () => ({ lines: [], sounds: [], changed: false, notices: [] });

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

  personalise(text) {
    return fill(text, {
      name: this.state.profile.username,
      title: this.content.config.title,
      shortTitle: this.content.config.shortTitle || this.content.config.title
    });
  }

  entityName(id) {
    const e = this.entities[id]?.entity;
    if (!e) return id;
    if (e.character && this.content.characters[e.character] && !e.name) return this.content.characters[e.character].name;
    return e.name || id;
  }

  speakerFor(id) {
    if (!id) return { speaker: '', portrait: null };
    const e = this.entities[id]?.entity;
    return { speaker: this.entityName(id), portrait: e?.portrait || e?.character || e?.sprite || null };
  }

  line(speakerId, text) {
    const who = this.speakerFor(speakerId);
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
      case 'collect':
        return (step.items || [step.item]).every((i) => this.state.items.includes(i));
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
      out.notices.push({ kind: 'questDone', text: quest.title, icon: 'trophy' });
      out.sounds.push('fanfare');
      if (this.state.tracked === questId) {
        this.state.tracked = Object.keys(this.state.quests).find((id) => this.state.quests[id].status === 'active') || null;
      }
    } else {
      out.sounds.push('tune');
      this.state.tracked = questId;
    }
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
        if (step && step.type !== 'talk' && step.type !== 'deliver' && this.stepSatisfied(step, ctx)) {
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
      const allDone = Object.keys(this.quests).every((id) => this.questState(id).status === 'completed');
      const s = this.content.strings;
      return allDone ? this.personalise(s.objectiveAllDone) : this.personalise(s.objectiveExplore);
    }
    const step = this.currentStep(questId);
    const have = step?.tag ? this.followersWithTag(step.tag).length : step?.clues ? step.clues.filter((c) => this.state.clues.includes(c)).length : 0;
    const need = step?.count || step?.clues?.length || 0;
    return this.personalise(fill(step?.objective || this.quests[questId].title, { have, need }));
  }

  /* ---------------- interactions ---------------- */

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
      if (step.type === 'deliver' && step.target === entityId && this.state.items.includes(step.item)) {
        this.state.items = this.state.items.filter((i) => i !== step.item);
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
      default:
        break;
    }

    // 4. Quest hints, then the entity's own lines.
    for (const questId of Object.keys(this.state.quests)) {
      const step = this.currentStep(questId);
      const hint = step?.hints?.[entityId];
      if (hint) {
        for (const text of [].concat(hint)) out.lines.push(this.line(entityId, fill(text, { have: this.followersWithTag(step.tag || '').length, need: step.count || 0 })));
        out.sounds.push('talk');
        return out;
      }
    }
    this.sayDefault(entityId, e, out);
    return out;
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
      return this.sayDefault(id, e, out);
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

  allQuestsComplete() {
    return Object.keys(this.quests).every((id) => this.questState(id).status === 'completed');
  }
}
