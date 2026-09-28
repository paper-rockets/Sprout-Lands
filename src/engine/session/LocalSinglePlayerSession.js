import { SessionAdapter } from './SessionAdapter.js';
import { EngineEvents } from '../events/events.js';

/**
 * Concrete single-player session implementation.
 * Maintains local game state and processes actions directly on the client.
 */
export class LocalSinglePlayerSession extends SessionAdapter {
  constructor(gameConfig) {
    super(gameConfig);
    this.state = {
      gameId: gameConfig.gameId,
      player: {
        username: gameConfig.recipient?.defaultName || 'Adventurer',
        avatarId: gameConfig.recipient?.avatarId || 'char_capybara_natural',
        x: 0,
        y: 0,
        currentRegionId: gameConfig.world?.startRegionId || 'region_west_meadow'
      },
      followers: [],
      activeQuests: {},
      completedQuests: [],
      inventory: [],
      unlockedRoutes: []
    };
  }

  async dispatchAction(actionType, payload) {
    switch (actionType) {
      case 'PLAYER_MOVE':
        this.state.player.x = payload.x;
        this.state.player.y = payload.y;
        this.emit(EngineEvents.PLAYER_MOVED, { ...this.state.player });
        break;

      case 'CHANGE_REGION':
        this.state.player.currentRegionId = payload.regionId;
        this.emit(EngineEvents.AREA_ENTERED, { regionId: payload.regionId });
        break;

      case 'UPDATE_PROFILE':
        if (payload.username) this.state.player.username = payload.username;
        if (payload.avatarId) this.state.player.avatarId = payload.avatarId;
        this.emit(EngineEvents.SETTINGS_CHANGED, { ...this.state.player });
        break;

      case 'ADD_FOLLOWER':
        if (!this.state.followers.includes(payload.followerId)) {
          this.state.followers.push(payload.followerId);
          this.emit(EngineEvents.FOLLOWER_JOINED, { followerId: payload.followerId });
        }
        break;

      case 'COMPLETE_QUEST':
        if (!this.state.completedQuests.includes(payload.questId)) {
          this.state.completedQuests.push(payload.questId);
          delete this.state.activeQuests[payload.questId];
          this.emit(EngineEvents.QUEST_COMPLETED, { questId: payload.questId });
        }
        break;

      default:
        console.warn(`LocalSinglePlayerSession: Unknown action type "${actionType}"`);
    }

    return { success: true, state: this.getState() };
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
}
