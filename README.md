# Sprout Lands Adventure

A cosy single-player adventure for kids, built with Phaser 4 (WebGL) and Vite. A new gift game is a copy of
`src/content/starter-adventure/` with its own title, characters, maps, quests and dialogue (see `EDITING-GUIDE.md`).

**Play it:** https://paper-rockets.github.io/Sprout-Lands/ (install it from the browser menu to play offline; `npm run deploy` publishes a new build).

```
npm install
npm run dev        # http://localhost:8190
npm test           # rules, quests, saves, content
npm run build      # checks, then builds an installable, offline-capable copy into dist/
```

## Credits and licences

**Some or all of the pictures in this game are made by Cup Nooble.**

- Art and fonts: *Sprout Lands* (Premium sprites and UI packs) by **Cup Nooble**, https://cupnooble.itch.io/sprout-lands-asset-pack
  (paid Premium licence: use in commercial and non-commercial projects, modification allowed, open-source projects allowed
  with this note, credit required, **no redistribution or resale of the asset packs themselves**, no NFTs, no AI training).
  The original packs are **not** in this repository; only the pictures this game uses, inside `public/assets`.
  If you want to use these pictures in your own project, buy the packs from Cup Nooble.
- A few extras come from Cup Nooble's free *Sorry* pack: see `CREDITS-AND-LICENSES.md` for the terms and what to check before selling.
- Sound effects and music: made for this game from scratch by `scripts/tools/make-sounds.py`, `make-music.py` and `synth.py`.
  No recordings and no borrowed tunes.
- Some character and Halloween pictures were made with image generation and cleaned up by the scripts in `scripts/tools`.
  Some character designs resemble well-known characters: fine for a private gift, change them before selling.

Every file's source is listed in `CREDITS-AND-LICENSES.md`.
