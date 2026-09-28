/**
 * QuestManager: Universal data-driven quest and objective engine.
 * Handles:
 * - Quest state tracking (not_started, active, completed)
 * - Objective steps: talk, gatherFollowers, inspectClues, escort, reward
 * - Follower integration for "Help the Baby Ducks Find Mom"
 * - Clue inspection for "Lost in the Forest"
 * - Persistent progress and badge awards
 */

export class QuestManager {
  constructor({ scene, session, followerSystem, saveService, audioService }) {
    this.scene = scene;
    this.session = session;
    this.followerSystem = followerSystem;
    this.saveService = saveService;
    this.audioService = audioService;

    this.quests = {
      quest_help_baby_ducks: {
        id: 'quest_help_baby_ducks',
        title: 'Help the Baby Ducks Find Mom',
        giver: 'npc_mama_duck',
        status: 'not_started', // 'not_started', 'active', 'completed'
        step: 1,
        totalDucklings: 4,
        ducklingsGathered: new Set(),
        badge: 'badge_duck_rescuer',
        badgeTitle: 'Duckling Rescuer Ribbon'
      },
      quest_lost_in_forest: {
        id: 'quest_lost_in_forest',
        title: 'Lost in the Forest',
        giver: 'npc_baker_bun',
        status: 'not_started',
        step: 1,
        requiredClues: ['clue_ribbon', 'clue_pawprints', 'clue_twigs', 'clue_acorn'],
        cluesInspected: new Set(),
        impRescued: false,
        badge: 'badge_forest_navigator',
        badgeTitle: 'Forest Navigator Compass'
      }
    };

    this.restoreFromSession();
  }

  restoreFromSession() {
    const savedQuests = this.session?.getState()?.quests;
    if (savedQuests) {
      if (savedQuests.quest_help_baby_ducks) {
        const sq = savedQuests.quest_help_baby_ducks;
        const q = this.quests.quest_help_baby_ducks;
        q.status = sq.status || 'not_started';
        q.step = sq.step || 1;
        if (Array.isArray(sq.ducklingsGathered)) {
          q.ducklingsGathered = new Set(sq.ducklingsGathered);
        }
      }

      if (savedQuests.quest_lost_in_forest) {
        const sq = savedQuests.quest_lost_in_forest;
        const q = this.quests.quest_lost_in_forest;
        q.status = sq.status || 'not_started';
        q.step = sq.step || 1;
        q.impRescued = sq.impRescued || false;
        if (Array.isArray(sq.cluesInspected)) {
          q.cluesInspected = new Set(sq.cluesInspected);
        }
      }
    }
  }

  restoreFollowers(scene) {
    if (!this.followerSystem || !scene || !scene.player) return;
    const px = scene.player.x;
    const py = scene.player.y;

    const duckQuest = this.quests.quest_help_baby_ducks;
    if (duckQuest.status === 'active' && duckQuest.ducklingsGathered?.size > 0) {
      for (const duckId of duckQuest.ducklingsGathered) {
        if (!this.followerSystem.followers.some(f => f.id === duckId)) {
          const texture = scene.namespace?.namespaceTextureKey('premium_chicken_baby') || 'premium_chicken_baby';
          const container = scene.add.sprite(px, py, texture, 12)
            .setScale(2)
            .setDepth(py + 8);
          container.setSize(24, 24);

          this.followerSystem.addFollower({
            id: duckId,
            name: duckId,
            sprite: container
          });
        }
      }
    }

    const impQuest = this.quests.quest_lost_in_forest;
    if (impQuest.status === 'active' && impQuest.impRescued) {
      if (!this.followerSystem.followers.some(f => f.id === 'rescued_imp')) {
        const tex = scene.namespace ? scene.namespace.namespaceTextureKey('forest_imp') : 'forest_imp';
        const sprite = scene.add.sprite(px, py, tex, 12).setScale(2.5);
        scene.depthOcclusion?.addDepthEntity(sprite, 12);
        this.followerSystem.addFollower({
          id: 'rescued_imp',
          name: 'Rescued Forest Imp',
          sprite: sprite
        });
      }
    }
  }

  saveToSession() {
    if (!this.session) return;
    const questsData = {
      quest_help_baby_ducks: {
        status: this.quests.quest_help_baby_ducks.status,
        step: this.quests.quest_help_baby_ducks.step,
        ducklingsGathered: Array.from(this.quests.quest_help_baby_ducks.ducklingsGathered)
      },
      quest_lost_in_forest: {
        status: this.quests.quest_lost_in_forest.status,
        step: this.quests.quest_lost_in_forest.step,
        impRescued: this.quests.quest_lost_in_forest.impRescued,
        cluesInspected: Array.from(this.quests.quest_lost_in_forest.cluesInspected)
      }
    };

    if (this.session.state) {
      this.session.state.quests = questsData;
    }

    if (this.saveService) {
      this.saveService.saveGame(this.session.state || this.session.getState());
    }
  }

  // --- Duck Quest Handlers ---

  talkToMamaDuck() {
    const q = this.quests.quest_help_baby_ducks;
    if (q.status === 'not_started') {
      q.status = 'active';
      q.step = 2;
      this.saveToSession();
      this.updateHUD();
      return 'Oh, thank goodness! Please look around the meadow, town, and wetlands to find my 4 little ducklings!';
    } else if (q.status === 'active') {
      if (q.ducklingsGathered.size >= q.totalDucklings) {
        q.status = 'completed';
        q.step = 4;
        this.awardBadge(q.badge, q.badgeTitle);
        this.followerSystem?.clearFollowers();
        this.saveToSession();
        this.updateHUD();
        return 'Quack quack! You brought all my babies home safely! Take this Duckling Rescuer Ribbon!';
      } else {
        const remaining = q.totalDucklings - q.ducklingsGathered.size;
        return `You have found ${q.ducklingsGathered.size}/${q.totalDucklings} ducklings so far. ${remaining} more to find!`;
      }
    }
    return 'Thank you so much for bringing my family back together!';
  }

  gatherDuckling(ducklingId, ducklingName, ducklingSprite) {
    const q = this.quests.quest_help_baby_ducks;
    if (q.status === 'not_started') {
      q.status = 'active';
      q.step = 2;
    }

    if (!q.ducklingsGathered.has(ducklingId)) {
      q.ducklingsGathered.add(ducklingId);

      // Add to follower trail behind player
      this.followerSystem?.addFollower({
        id: ducklingId,
        name: ducklingName,
        sprite: ducklingSprite
      });

      if (q.ducklingsGathered.size >= q.totalDucklings) {
        q.step = 3; // Escort back to Mama
      }

      this.audioService?.playDucklingQuack();
      this.saveToSession();
      this.updateHUD();
      return true;
    }
    return false;
  }

  // --- Lost in the Forest Quest Handlers ---

  talkToBaker() {
    const q = this.quests.quest_lost_in_forest;
    if (q.status === 'not_started') {
      q.status = 'active';
      q.step = 2;
      this.saveToSession();
      this.updateHUD();
      return 'My friend the Forest Imp went up to Pinecrest Ridge to gather berries and hasn\'t returned! Could you search the forest paths for clues?';
    } else if (q.status === 'active') {
      if (q.impRescued) {
        q.status = 'completed';
        q.step = 5;
        this.awardBadge(q.badge, q.badgeTitle);
        this.followerSystem?.removeFollower('rescued_imp');
        this.saveToSession();
        this.updateHUD();
        return 'You found the Forest Imp! Thank you so much! Here is your Forest Navigator Compass!';
      } else if (q.cluesInspected.size >= q.requiredClues.length) {
        return 'You found all 4 clues! They lead deeper into the pine glade near the crystal cave!';
      } else {
        return `Please keep searching! You have uncovered ${q.cluesInspected.size}/${q.requiredClues.length} forest clues.`;
      }
    }
    return 'The bakery is warm and everyone is safe thanks to you!';
  }

  inspectClue(clueId, clueName) {
    const q = this.quests.quest_lost_in_forest;
    if (q.status === 'not_started') {
      q.status = 'active';
      q.step = 2;
    }

    if (!q.cluesInspected.has(clueId)) {
      q.cluesInspected.add(clueId);

      if (q.cluesInspected.size >= q.requiredClues.length) {
        q.step = 3; // All clues found, locate the imp
      }

      this.audioService?.playClueCollect();
      this.saveToSession();
      this.updateHUD();
      return true;
    }
    return false;
  }

  rescueImp(impSprite) {
    const q = this.quests.quest_lost_in_forest;
    if (!q.impRescued) {
      q.impRescued = true;
      q.step = 4; // Escort back to town

      this.followerSystem?.addFollower({
        id: 'rescued_imp',
        name: 'Forest Imp',
        sprite: impSprite
      });

      this.audioService?.playClueCollect();
      this.saveToSession();
      this.updateHUD();
      return 'Thank goodness! I lost my way among the tall pines. Please guide me back to the town bakery!';
    }
    return 'Let\'s head back to town together!';
  }

  awardBadge(badgeId, badgeTitle) {
    this.audioService?.playQuestFanfare();
    if (this.session && this.session.state) {
      this.session.state.badges = this.session.state.badges || [];
      if (!this.session.state.badges.includes(badgeId)) {
        this.session.state.badges.push(badgeId);
      }
      if (this.session.state.player) {
        this.session.state.player.rewards = this.session.state.player.rewards || [];
        if (!this.session.state.player.rewards.includes(badgeId)) {
          this.session.state.player.rewards.push(badgeId);
        }
      }
      if (this.saveService) {
        this.saveService.saveGame(this.session.state);
      }
    }
  }

  getActiveObjectiveText() {
    const duckQ = this.quests.quest_help_baby_ducks;
    const forestQ = this.quests.quest_lost_in_forest;

    if (duckQ.status === 'active') {
      if (duckQ.step === 2) {
        return `Baby Ducks: ${duckQ.ducklingsGathered.size}/${duckQ.totalDucklings} found`;
      } else if (duckQ.step === 3) {
        return 'Lead all 4 ducklings back to Mama Duck!';
      }
    }

    if (forestQ.status === 'active') {
      if (forestQ.step === 2) {
        return `Forest Clues: ${forestQ.cluesInspected.size}/${forestQ.requiredClues.length} inspected`;
      } else if (forestQ.step === 3) {
        return 'Search the secret glade to find the lost friend!';
      } else if (forestQ.step === 4) {
        return 'Escort the Forest Imp back to Town Bakery!';
      }
    }

    if (duckQ.status === 'completed' && forestQ.status === 'completed') {
      return 'All Island Quests Completed! Visit Sanctuary Isle!';
    }

    return 'Explore the island and talk to villagers.';
  }

  updateHUD() {
    const uiScene = this.scene?.scene?.get('UIScene');
    if (uiScene?.updateQuestObjective) {
      uiScene.updateQuestObjective(this.getActiveObjectiveText());
    }
  }
}
