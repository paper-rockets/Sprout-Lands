import { Modal } from './Modal.js';
import { UiButton, UiSlider, UiToggle, uiText } from './widgets.js';
import { words } from './theme.js';

const SPEEDS = ['slow', 'normal', 'fast'];

/** Sound volume, text speed, less-motion switch, and the credits. */
export class SettingsPanel extends Modal {
  constructor(ui, opts = {}) {
    super(ui, {
      width: 230,
      height: 178,
      title: words(ui, 'settings.title'),
      mascots: [{ kind: 'hen', color: 0, x: 24, y: 3 }, { kind: 'chick', color: 2, x: 42, y: 3, flip: true }, { kind: 'chick', color: 1, x: 204, y: 3 }],
      ...opts
    });
    const session = ui.session;
    const settings = session.settings;
    const audio = ui.registry.get('audio');
    const add = (o) => {
      this.root.add(o);
      return o;
    };

    // Sound
    add(uiText(ui, 14, 29, words(ui, 'settings.sound')));
    this.slider = add(new UiSlider(ui, 92, 26, 124, settings.volume, (v) => {
      session.change((s) => { s.settings.volume = v; });
      audio?.refreshNature();
      audio?.refreshMusic();
      audio?.play('tap');
    }));

    // Nature sounds (birds, breeze, crickets)
    add(uiText(ui, 14, 49, words(ui, 'settings.nature')));
    this.natureSlider = add(new UiSlider(ui, 92, 46, 124, settings.natureVolume ?? 0.5, (v) => {
      session.change((s) => { s.settings.natureVolume = v; });
      audio?.refreshNature();
    }));

    // Music
    add(uiText(ui, 14, 69, words(ui, 'settings.music')));
    this.musicSlider = add(new UiSlider(ui, 92, 66, 124, settings.musicVolume ?? 0.5, (v) => {
      session.change((s) => { s.settings.musicVolume = v; });
      audio?.refreshMusic();
    }));

    // Text speed
    add(uiText(ui, 14, 90, words(ui, 'settings.textSpeed')));
    this.speedButtons = SPEEDS.map((id, i) => {
      const b = new UiButton(ui, 0, 100, {
        label: words(ui, `settings.${id}`),
        selected: settings.textSpeed === id,
        onPress: () => {
          session.change((s) => { s.settings.textSpeed = id; });
          this.speedButtons.forEach((other, j) => other.setSelected(j === i));
        }
      });
      return add(b);
    });
    let x = 14;
    this.speedButtons.forEach((b) => {
      b.setX(x);
      x += b.bw + 4;
    });

    // Less motion
    add(uiText(ui, 14, 133, words(ui, 'settings.lessMotion')));
    this.motion = add(new UiToggle(ui, 230 - 14 - 22, 125, settings.reducedMotion, (on) => {
      session.change((s) => { s.settings.reducedMotion = on; });
      ui.registry.get('audio')?.play('toggle');
    }));

    // Credits and OK
    this.credits = add(new UiButton(ui, 14, 152, { label: words(ui, 'menu.credits'), selectedMark: false, onPress: () => ui.open('credits') }));
    this.friend = add(new UiButton(ui, 0, 152, { label: words(ui, 'settings.friend'), selectedMark: false, onPress: () => ui.open('start') }));
    this.friend.setX(14 + this.credits.bw + 4);
    this.ok = add(new UiButton(ui, 0, 152, { label: words(ui, 'settings.close'), selectedMark: false, onPress: () => this.close() }));
    this.ok.setX(230 - 14 - this.ok.bw);

    this.setFocusRows([[this.slider], [this.natureSlider], [this.musicSlider], this.speedButtons, [this.motion], [this.credits, this.ok]]);
  }
}
