/**
 * PocketAtlasJournalModal: Authentic Sprout Lands Modal for Island Atlas (Map)
 * and Quest Journal / Badges.
 */

import { WORLD_AREAS } from '../engine/systems/WorldAreaRegistry.js';

export class PocketAtlasJournalModal {
  constructor({ containerId = 'app', session, questManager } = {}) {
    this.container = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
    this.session = session;
    this.questManager = questManager;
    this.activeTab = 'atlas'; // 'atlas' | 'journal'
    this.selectedRegionId = null;
    this.isOpen = false;
  }

  init() {
    if (typeof document === 'undefined') return;
    this.render();
    this.setupKeyboardShortcuts();
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'm' || e.key === 'M') {
        if (this.isOpen && this.activeTab === 'atlas') {
          this.hide();
        } else {
          this.show('atlas');
        }
      } else if (e.key === 'j' || e.key === 'J') {
        if (this.isOpen && this.activeTab === 'journal') {
          this.hide();
        } else {
          this.show('journal');
        }
      } else if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    });
  }

  show(tab = 'atlas') {
    if (typeof document === 'undefined') return;
    this.activeTab = tab;
    this.isOpen = true;

    const currentAreaId = this.session?.state?.player?.currentAreaId || this.session?.getState()?.player?.currentAreaId || 'region_west_meadow';
    this.selectedRegionId = currentAreaId;

    this.updateContent();

    const overlay = document.getElementById('atlas-journal-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  hide() {
    if (typeof document === 'undefined') return;
    this.isOpen = false;
    const overlay = document.getElementById('atlas-journal-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  render() {
    if (!this.container) return;

    let overlay = document.getElementById('atlas-journal-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'atlas-journal-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="modal-dialog atlas-modal-dialog">
        <div class="modal-header">
          <div class="atlas-tabs-header">
            <button id="atlas-tab-btn" class="atlas-tab-btn active">Pocket Atlas</button>
            <button id="journal-tab-btn" class="atlas-tab-btn">Quest Journal</button>
          </div>
          <button id="atlas-close-btn" class="btn-pixel-icon btn-x" aria-label="Close"></button>
        </div>
        <div class="modal-body atlas-modal-body" id="atlas-modal-body">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;

    this.container.appendChild(overlay);

    // Event Listeners
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    document.getElementById('atlas-close-btn')?.addEventListener('click', () => this.hide());

    document.getElementById('atlas-tab-btn')?.addEventListener('click', () => {
      this.activeTab = 'atlas';
      this.updateContent();
    });

    document.getElementById('journal-tab-btn')?.addEventListener('click', () => {
      this.activeTab = 'journal';
      this.updateContent();
    });
  }

  updateContent() {
    const body = document.getElementById('atlas-modal-body');
    const atlasBtn = document.getElementById('atlas-tab-btn');
    const journalBtn = document.getElementById('journal-tab-btn');

    if (!body || !atlasBtn || !journalBtn) return;

    if (this.activeTab === 'atlas') {
      atlasBtn.classList.add('active');
      journalBtn.classList.remove('active');
      body.innerHTML = this.renderAtlasView();
      this.bindAtlasEvents();
    } else {
      journalBtn.classList.add('active');
      atlasBtn.classList.remove('active');
      body.innerHTML = this.renderJournalView();
    }
  }

  renderAtlasView() {
    const currentAreaId = this.session?.state?.player?.currentAreaId || this.session?.getState()?.player?.currentAreaId || 'region_west_meadow';
    const currentArea = WORLD_AREAS[currentAreaId] || WORLD_AREAS.region_west_meadow;

    const regions = [
      { id: 'region_west_meadow', name: 'West End Meadow', sub: 'Mama Duck Nest & River Cut' },
      { id: 'region_pinecrest_forest', name: 'Pinecrest Ridge', sub: 'High Pines & Secret Cave' },
      { id: 'region_central_town', name: 'Central Town Common', sub: 'Bakery, Square & Farm' },
      { id: 'region_south_wetlands', name: 'South Wetlands', sub: 'Boardwalks & Lilypads' },
      { id: 'region_east_harbour', name: 'East Harbour', sub: 'Sands & Pier to Sanctuary' },
      { id: 'region_sanctuary_isle', name: 'Sanctuary Isle', sub: 'Ancient Island Obelisk' }
    ];

    const selectedArea = WORLD_AREAS[this.selectedRegionId] || currentArea;

    return `
      <div class="atlas-container">
        <div class="atlas-location-banner">
          <span class="atlas-pin-icon">📍</span>
          <span>CURRENT LOCATION: <strong>${currentArea.name}</strong></span>
        </div>

        <div class="atlas-map-grid">
          ${regions.map(r => {
            const isCurrent = r.id === currentAreaId;
            const isSelected = r.id === this.selectedRegionId;
            return `
              <div class="atlas-region-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'here' : ''}" data-region-id="${r.id}">
                <div class="atlas-region-header">
                  <span class="atlas-region-title">${r.name}</span>
                  ${isCurrent ? '<span class="atlas-here-pill">YOU ARE HERE</span>' : ''}
                </div>
                <div class="atlas-region-sub">${r.sub}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="atlas-detail-card">
          <div class="atlas-detail-title">${selectedArea.name}</div>
          <div class="atlas-detail-desc">${selectedArea.description}</div>
          <div class="atlas-detail-meta">
            <div><strong>Points of Interest:</strong> ${selectedArea.landmarks?.join(' • ') || 'None noted'}</div>
            <div><strong>Exits:</strong> ${selectedArea.portals?.map(p => p.label).join(' • ') || 'Ferry / Paths'}</div>
          </div>
        </div>
      </div>
    `;
  }

  bindAtlasEvents() {
    const cards = document.querySelectorAll('.atlas-region-card');
    cards.forEach(c => {
      c.addEventListener('click', () => {
        this.selectedRegionId = c.getAttribute('data-region-id');
        this.updateContent();
      });
    });
  }

  renderJournalView() {
    const liveWorld = typeof window !== 'undefined' ? window.__ADVENTURE_ENGINE__?.game?.scene?.getScene('WorldScene') : null;
    const liveQM = liveWorld?.questManager;

    const state = this.session?.state || this.session?.getState() || {};
    const rewards = state.player?.rewards || [];

    const duckQ = liveQM?.quests?.quest_help_baby_ducks ? {
      status: liveQM.quests.quest_help_baby_ducks.status,
      ducklingsGathered: Array.from(liveQM.quests.quest_help_baby_ducks.ducklingsGathered)
    } : (state.quests?.quest_help_baby_ducks || { status: 'not_started', ducklingsGathered: [] });

    const forestQ = liveQM?.quests?.quest_lost_in_forest ? {
      status: liveQM.quests.quest_lost_in_forest.status,
      cluesInspected: Array.from(liveQM.quests.quest_lost_in_forest.cluesInspected),
      impRescued: liveQM.quests.quest_lost_in_forest.impRescued
    } : (state.quests?.quest_lost_in_forest || { status: 'not_started', cluesInspected: [], impRescued: false });

    const hasDuckBadge = rewards.includes('badge_duck_rescuer') || state.badges?.includes('badge_duck_rescuer') || duckQ.status === 'completed';
    const hasForestBadge = rewards.includes('badge_forest_navigator') || state.badges?.includes('badge_forest_navigator') || forestQ.status === 'completed';

    const ducklingsList = [
      { ids: ['duckling_1', 'duckling_pip'], name: 'Pip', loc: 'West End Meadow' },
      { ids: ['duckling_2', 'duckling_dottie'], name: 'Dottie', loc: 'Central Town Common' },
      { ids: ['duckling_3', 'duckling_splash'], name: 'Splash', loc: 'South Wetlands' },
      { ids: ['duckling_4', 'duckling_barnaby', 'duckling_sunny'], name: 'Barnaby', loc: 'East Harbour' }
    ];

    const cluesList = [
      { id: 'clue_ribbon', name: 'Silk Ribbon', loc: 'Pinecrest Forest Glade' },
      { id: 'clue_pawprints', name: 'Small Pawprints', loc: 'Pinecrest Ridge Trail' },
      { id: 'clue_twigs', name: 'Broken Twigs', loc: 'Deep Pines' },
      { id: 'clue_acorn', name: 'Polished Acorn', loc: 'Crystal Cave Path' }
    ];

    return `
      <div class="journal-container">
        <!-- Storyline 1: Duck Quest -->
        <div class="journal-quest-card">
          <div class="journal-quest-header">
            <span class="journal-quest-title">Help the Baby Ducks Find Mom</span>
            <span class="journal-status-pill status-${duckQ.status}">
              ${duckQ.status === 'completed' ? 'COMPLETED' : (duckQ.status === 'active' ? 'IN PROGRESS' : 'AVAILABLE')}
            </span>
          </div>
          <div class="journal-quest-desc">
            Mama Duck is distressed! Her 4 adventurous ducklings have scattered across River Ribbon Island. Find them all and guide them home.
          </div>
          <div class="journal-checklist">
            ${ducklingsList.map(d => {
              const gathered = d.ids.some(id => duckQ.ducklingsGathered?.includes(id)) || duckQ.status === 'completed';
              return `
                <div class="journal-checklist-item ${gathered ? 'checked' : ''}">
                  <span class="journal-check-box">${gathered ? '✓' : '○'}</span>
                  <span><strong>${d.name}</strong> (${d.loc})</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Storyline 2: Forest Quest -->
        <div class="journal-quest-card">
          <div class="journal-quest-header">
            <span class="journal-quest-title">Lost in the Forest</span>
            <span class="journal-status-pill status-${forestQ.status}">
              ${forestQ.status === 'completed' ? 'COMPLETED' : (forestQ.status === 'active' ? 'IN PROGRESS' : 'AVAILABLE')}
            </span>
          </div>
          <div class="journal-quest-desc">
            Baker Bun's friend, the Forest Imp, got lost on Pinecrest Ridge gathering wild berries. Follow the trail of clues and guide them back!
          </div>
          <div class="journal-checklist">
            ${cluesList.map(c => {
              const found = forestQ.cluesInspected?.includes(c.id) || forestQ.status === 'completed';
              return `
                <div class="journal-checklist-item ${found ? 'checked' : ''}">
                  <span class="journal-check-box">${found ? '✓' : '○'}</span>
                  <span><strong>${c.name}</strong> (${c.loc})</span>
                </div>
              `;
            }).join('')}
            <div class="journal-checklist-item ${forestQ.impRescued || forestQ.status === 'completed' ? 'checked' : ''}">
              <span class="journal-check-box">${forestQ.impRescued || forestQ.status === 'completed' ? '✓' : '○'}</span>
              <span><strong>Rescue Forest Imp</strong> & Guide to Bakery</span>
            </div>
          </div>
        </div>

        <!-- Badges & Honors Showcase -->
        <div class="journal-badges-shelf">
          <div class="journal-shelf-title">Honors & Badges Earned</div>
          <div class="journal-badges-grid">
            <div class="journal-badge-item ${hasDuckBadge ? 'unlocked' : 'locked'}">
              <div class="badge-icon">🎀</div>
              <div class="badge-title">Duckling Rescuer Ribbon</div>
              <div class="badge-sub">${hasDuckBadge ? 'Awarded by Mama Duck' : 'Reunite all 4 ducklings'}</div>
            </div>
            <div class="journal-badge-item ${hasForestBadge ? 'unlocked' : 'locked'}">
              <div class="badge-icon">🧭</div>
              <div class="badge-title">Forest Navigator Compass</div>
              <div class="badge-sub">${hasForestBadge ? 'Awarded by Baker Bun' : 'Find clues & rescue Imp'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
