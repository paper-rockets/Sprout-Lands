/**
 * Profile Setup and Settings Modal UI.
 * Handles username validation, 6 avatar choices, optional local profile picture,
 * and game settings (volume, text speed, reduced motion).
 */

export class ProfileSetupModal {
  constructor({ containerId = 'app', session, saveService, profileImageService, characters, onSave } = {}) {
    this.container = typeof document !== 'undefined' ? document.getElementById(containerId) : null;
    this.session = session;
    this.saveService = saveService;
    this.profileImageService = profileImageService;
    this.characters = characters || [];
    this.onSave = onSave;
    this.selectedAvatarId = this.session?.state?.player?.avatarId || 'char_capybara_natural';
    this.customPhotoUrl = null;
    this.isOpen = false;
  }

  async init() {
    if (this.profileImageService) {
      this.customPhotoUrl = await this.profileImageService.loadPhoto();
    }
    if (typeof document !== 'undefined') {
      this.render();
    }
  }

  validateUsername(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      return { valid: false, message: 'Please enter a name.' };
    }
    if (trimmed.length > 16) {
      return { valid: false, message: 'Name must be 16 characters or less.' };
    }
    const regex = /^[a-zA-Z0-9\s-_]+$/;
    if (!regex.test(trimmed)) {
      return { valid: false, message: 'Only letters, numbers, spaces, and hyphens allowed.' };
    }
    return { valid: true, message: '' };
  }

  show(isFirstRun = false) {
    if (typeof document === 'undefined') return;
    this.isOpen = true;
    const modalEl = document.getElementById('profile-modal-overlay');
    if (modalEl) {
      modalEl.style.display = 'flex';
      const titleEl = document.getElementById('profile-modal-title');
      if (titleEl) {
        titleEl.textContent = isFirstRun ? 'Create Your Adventurer Profile' : 'Edit Profile & Settings';
      }
    }
  }

  hide() {
    if (typeof document === 'undefined') return;
    this.isOpen = false;
    const modalEl = document.getElementById('profile-modal-overlay');
    if (modalEl) {
      modalEl.style.display = 'none';
    }
  }

  render() {
    if (typeof document === 'undefined' || !this.container) return;

    let overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'profile-modal-overlay';
      overlay.className = 'modal-overlay';
      this.container.appendChild(overlay);
    }

    const state = this.session?.getState ? this.session.getState() : { player: {} };
    const currentName = state.player.username || 'Adventurer';

    overlay.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 id="profile-modal-title" class="modal-title">Adventurer Profile & Settings</h2>
          <button id="btn-close-modal" class="btn-pixel-icon btn-x" aria-label="Close"></button>
        </div>

        <div class="modal-body">
          <!-- Name Input -->
          <div class="form-group">
            <label for="input-username" class="form-label">Adventurer Name:</label>
            <input type="text" id="input-username" class="form-input" value="${currentName}" maxlength="16" autocomplete="off" />
            <div id="username-feedback" class="form-feedback"></div>
          </div>

          <!-- Avatar Picker -->
          <div class="form-group">
            <label class="form-label">Choose Your Character:</label>
            <div class="avatar-grid" id="avatar-grid">
              ${this.characters.map(char => `
                <div class="avatar-card ${char.id === this.selectedAvatarId ? 'active' : ''}" data-avatar-id="${char.id}">
                  <div class="avatar-frame">
                    <div class="avatar-sprite" style="background-image: url('${char.sheetPath}');"></div>
                  </div>
                  <span class="avatar-name">${char.name}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Optional Local Photo -->
          <div class="form-group">
            <label class="form-label">Optional Photo (Stored 100% locally on this device):</label>
            <div class="photo-row">
              <div class="photo-preview-circle" id="photo-preview-circle">
                ${this.customPhotoUrl ? `<img src="${this.customPhotoUrl}" alt="Profile Photo" />` : `<span>No Photo</span>`}
              </div>
              <div class="photo-buttons">
                <label class="btn-file-upload">
                  Choose Picture
                  <input type="file" id="input-profile-file" accept="image/*" style="display:none;" />
                </label>
                ${this.customPhotoUrl ? `<button type="button" id="btn-clear-photo" class="btn-secondary">Remove</button>` : ''}
              </div>
            </div>
          </div>

          <!-- Settings -->
          <div class="form-group settings-section">
            <label class="form-label">Game Settings:</label>
            <div class="setting-row">
              <span>Sound Volume:</span>
              <input type="range" id="setting-volume" min="0" max="100" value="80" class="slider" />
            </div>
            <div class="setting-row">
              <span>Text Speed:</span>
              <select id="setting-text-speed" class="form-select">
                <option value="slow">Gentle</option>
                <option value="normal" selected>Normal</option>
                <option value="fast">Swift</option>
              </select>
            </div>
            <div class="setting-row">
              <span>Reduced Motion:</span>
              <label class="toggle-switch">
                <input type="checkbox" id="setting-reduced-motion" />
                <span class="slider-toggle"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-save-profile" class="btn-sprout-wood">
            <span class="btn-check-icon"></span>
            <span>Save & Continue</span>
          </button>
        </div>
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    if (typeof document === 'undefined') return;

    const inputName = document.getElementById('input-username');
    const feedback = document.getElementById('username-feedback');
    const btnSave = document.getElementById('btn-save-profile');
    const btnClose = document.getElementById('btn-close-modal');
    const fileInput = document.getElementById('input-profile-file');
    const btnClearPhoto = document.getElementById('btn-clear-photo');

    // Live validation
    if (inputName && feedback && btnSave) {
      inputName.addEventListener('input', () => {
        const res = this.validateUsername(inputName.value);
        if (!res.valid) {
          feedback.textContent = res.message;
          feedback.className = 'form-feedback error';
          btnSave.disabled = true;
        } else {
          feedback.textContent = '';
          feedback.className = 'form-feedback';
          btnSave.disabled = false;
        }
      });
    }

    // Avatar selection
    const avatarCards = document.querySelectorAll('.avatar-card');
    avatarCards.forEach(card => {
      card.addEventListener('click', () => {
        avatarCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedAvatarId = card.getAttribute('data-avatar-id');
      });
    });

    // Photo upload & resize
    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const resizedBlob = await this.profileImageService.resizeImage(file, 128);
            await this.profileImageService.savePhoto(resizedBlob);
            this.customPhotoUrl = await this.profileImageService.loadPhoto();
            this.render();
          } catch (err) {
            console.error('Failed to process avatar photo:', err);
          }
        }
      });
    }

    if (btnClearPhoto) {
      btnClearPhoto.addEventListener('click', async () => {
        await this.profileImageService.clearPhoto();
        this.customPhotoUrl = null;
        this.render();
      });
    }

    // Close button
    if (btnClose) {
      btnClose.addEventListener('click', () => this.hide());
    }

    // Save button
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const name = inputName.value.trim();
        const validation = this.validateUsername(name);
        if (!validation.valid) {
          feedback.textContent = validation.message;
          feedback.className = 'form-feedback error';
          return;
        }

        const volume = document.getElementById('setting-volume')?.value || 80;
        const textSpeed = document.getElementById('setting-text-speed')?.value || 'normal';
        const reducedMotion = document.getElementById('setting-reduced-motion')?.checked || false;

        // Update session
        if (this.session) {
          await this.session.dispatchAction('UPDATE_PROFILE', {
            username: name,
            avatarId: this.selectedAvatarId
          });

          // Save to persistent storage
          const currentState = this.session.getState();
          currentState.settings = {
            volume: parseInt(volume, 10) / 100,
            textSpeed,
            reducedMotion
          };
          if (this.saveService) {
            this.saveService.saveGame(currentState);
          }

          this.hide();
          if (this.onSave) {
            this.onSave({ username: name, avatarId: this.selectedAvatarId, settings: currentState.settings });
          }
        }
      });
    }
  }
}
