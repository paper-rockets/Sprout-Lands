/**
 * Core event names and payload contracts for the Sprout Lands Adventure Engine.
 * Serializable event payloads decouple gameplay systems from Phaser internals.
 */

export const EngineEvents = {
  // Lifecycle
  ENGINE_READY: 'engine.ready',
  SCENE_LOADED: 'scene.loaded',
  
  // Navigation & Movement
  PLAYER_MOVED: 'player.moved',
  AREA_ENTERED: 'area.entered',
  TRANSITION_REQUESTED: 'transition.requested',
  
  // Interactions & Discovery
  ENTITY_INTERACTED: 'entity.interacted',
  CLUE_INSPECTED: 'clue.inspected',
  ITEM_COLLECTED: 'item.collected',
  
  // Followers & Quests
  FOLLOWER_JOINED: 'follower.joined',
  FOLLOWER_DISMISSED: 'follower.dismissed',
  QUEST_STARTED: 'quest.started',
  QUEST_UPDATED: 'quest.updated',
  QUEST_COMPLETED: 'quest.completed',
  REWARD_UNLOCKED: 'reward.unlocked',
  
  // Persistence & Settings
  SAVE_REQUESTED: 'save.requested',
  SETTINGS_CHANGED: 'settings.changed'
};

export class GameEvent {
  constructor(type, payload = {}) {
    this.type = type;
    this.payload = payload;
    this.timestamp = Date.now();
  }

  toJSON() {
    return {
      type: this.type,
      payload: this.payload,
      timestamp: this.timestamp
    };
  }
}
