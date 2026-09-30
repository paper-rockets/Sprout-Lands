import Phaser from 'phaser';
import { AudioService } from '../audio/AudioService.js';
import { PhotoStore } from '../state/PhotoStore.js';
import { LoadScene } from '../scenes/LoadScene.js';
import { OverworldScene } from '../scenes/OverworldScene.js';
import { UIScene } from '../scenes/UIScene.js';
import { SaveStore } from '../state/SaveStore.js';
import { Session } from '../state/Session.js';

/** Starts Phaser in WebGL, filling the page, with crisp pixel art. */
export function startGame(content, parent) {
  const store = new SaveStore(content);
  const session = new Session(content, store);
  return new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#9bd4c3',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%'
    },
    scene: [LoadScene, OverworldScene, UIScene],
    callbacks: {
      preBoot: (game) => {
        game.registry.set('content', content);
        game.registry.set('session', session);
        const audio = new AudioService(game, () => session.settings);
        game.registry.set('audio', audio);
        game.registry.set('photos', new PhotoStore(content.config.gameId));
        audio.startNature(content.art.ambience);
        audio.startMusic(content.art.music);
        game.registry.set('uiBusy', false);
      }
    }
  });
}
