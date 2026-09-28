import { createGame } from './engine/bootstrap/createGame.js';
import gameConfig from './content/starter-adventure/game.config.json';

// Initialize the game engine
async function init() {
  try {
    if (document.fonts) {
      try {
        await document.fonts.load('16px SproutLands');
        await document.fonts.ready;
      } catch (fontErr) {
        console.warn('Font preload warning:', fontErr);
      }
    }
    const engineInstances = await createGame(gameConfig, 'game-container');
    window.__ADVENTURE_ENGINE__ = engineInstances;
    console.log(`[River Ribbon Engine] Successfully started game "${gameConfig.title}" (ID: ${gameConfig.gameId})`);

    // Register PWA service worker
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.log('[PWA] Service worker registration notice:', err.message);
      });
    }
  } catch (err) {
    console.error('Failed to initialize adventure engine:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
