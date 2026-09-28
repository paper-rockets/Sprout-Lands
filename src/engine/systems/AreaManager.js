/**
 * AreaManager: Handles dynamic area loading, collision grids,
 * transitions, interactive portals, and objects from WorldAreaRegistry.
 */

import { WORLD_AREAS } from './WorldAreaRegistry.js';

export class AreaManager {
  constructor({ scene, navigationService, depthOcclusion, interactionSystem, namespace, session, questManager, followerSystem, audioService }) {
    this.scene = scene;
    this.nav = navigationService;
    this.depthOcclusion = depthOcclusion;
    this.interaction = interactionSystem;
    this.namespace = namespace;
    this.session = session;
    this.questManager = questManager;
    this.followerSystem = followerSystem;
    this.audioService = audioService;

    this.currentAreaId = null;
    this.areaObjects = [];
    this.portals = [];
    this.isTransitioning = false;
  }

  loadArea(areaId = 'region_west_meadow', spawnX = null, spawnY = null) {
    const area = WORLD_AREAS[areaId] || WORLD_AREAS.region_west_meadow;
    this.currentAreaId = area.id;

    // 1. Clear previous area
    this.cleanupCurrentArea();

    const { width, height } = this.scene.scale;
    const tileSize = 16;
    const gridCols = Math.ceil(width / tileSize);
    const gridRows = Math.ceil(height / tileSize);

    // Reset navigation collision grid
    this.nav.grid = Array.from({ length: gridRows }, () => new Uint8Array(gridCols));

    // 2. Render Base Background & Ground
    const bg = this.scene.add.rectangle(0, 0, width, height, area.bgColor).setOrigin(0);
    bg.setDepth(-100);
    this.areaObjects.push(bg);

    if (area.type === 'outdoor') {
      const surroundingWater = this.scene.add.tileSprite(0, 0, width, height, this.assetKey('env_water_tiles'))
        .setOrigin(0)
        .setDepth(-99);
      this.areaObjects.push(surroundingWater);
    }

    if (area.type === 'outdoor') {
      this.buildOutdoorTerrain(area, width, height, tileSize, gridCols, gridRows);
    } else if (area.type === 'interior') {
      this.buildInteriorRoom(area, width, height, tileSize, gridCols, gridRows);
    } else if (area.type === 'cave') {
      this.buildCaveGrotto(area, width, height, tileSize, gridCols, gridRows);
    }

    // 3. Portals / Region Exits
    for (const portal of area.portals || []) {
      this.createPortal(portal);
    }

    // 4. Objects, Trees, Rocks
    for (const tree of area.trees || []) {
      this.createTree(tree.x, tree.y);
    }

    for (const rock of area.rocks || []) {
      this.createRock(rock.x, rock.y);
    }

    // 5. NPCs
    for (const npc of area.npcs || []) {
      this.createNPC(npc.id, npc.name, npc.textureKey, npc.x, npc.y, npc.dialogue);
    }

    // 6. Signposts
    for (const sign of area.signs || []) {
      this.createSignpost(sign.id, sign.x, sign.y, sign.title, sign.text);
    }

    // 7. Ducklings (Help the Baby Ducks Find Mom)
    for (const duck of area.ducklings || []) {
      const q = this.questManager?.quests?.quest_help_baby_ducks;
      if (!q?.ducklingsGathered?.has(duck.id) && q?.status !== 'completed') {
        this.createDuckling(duck);
      }
    }

    // 8. Forest Clues (Lost in the Forest)
    for (const clue of area.clues || []) {
      const q = this.questManager?.quests?.quest_lost_in_forest;
      if (!q?.cluesInspected?.has(clue.id) && q?.status !== 'completed') {
        this.createClue(clue);
      }
    }

    // 9. Lost Forest Imp
    if (area.lostImp) {
      const q = this.questManager?.quests?.quest_lost_in_forest;
      if (!q?.impRescued && q?.status !== 'completed') {
        this.createLostImp(area.lostImp);
      }
    }

    // 7. Update HUD Region Plaque & dismiss open dialogue
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene?.playerTitleText) {
      uiScene.playerTitleText.setText(area.name);
    }
    uiScene?.hideDialogueBox?.();

    // 8. Place player at spawn point
    const player = this.scene.player;
    if (player) {
      const finalX = spawnX !== null ? spawnX : (area.portals?.[0]?.targetX || 480);
      const finalY = spawnY !== null ? spawnY : (area.portals?.[0]?.targetY || 300);
      player.setPosition(finalX, finalY);
      if (this.scene.playerController) {
        this.scene.playerController.stopNavigation();
      }
      if (this.followerSystem) {
        this.followerSystem.snapToPlayer(finalX, finalY);
      }
    }

    // Save current area in persistent session
    if (this.session && this.session.state && this.session.state.player) {
      this.session.state.player.currentAreaId = area.id;
      this.session.state.player.x = player?.x || 480;
      this.session.state.player.y = player?.y || 300;
    }

    return area;
  }

  cleanupCurrentArea() {
    for (const obj of this.areaObjects) {
      if (obj.destroy) {
        obj.destroy();
      }
    }
    this.areaObjects = [];

    // Clear depth entities and occluders
    this.depthOcclusion.depthEntities.clear();
    if (this.scene.player) {
      this.depthOcclusion.addDepthEntity(this.scene.player, 12);
    }
    this.depthOcclusion.occluders = [];

    // Clear interactables
    this.interaction.interactables.clear();
    this.interaction.hidePrompt();
    this.portals = [];
  }

  assetKey(key) {
    return this.namespace.namespaceTextureKey(key);
  }

  /**
   * Place a precise region from a curated source sheet without introducing a
   * second, hand-drawn visual language. Source coordinates are deliberately
   * kept here so the runtime only ships the few Premium sheets it uses.
   */
  addAssetCrop(key, x, y, crop, { scale = 1, depth = 0, originX = 0, originY = 0 } = {}) {
    const image = this.scene.add.image(x, y, this.assetKey(key))
      .setOrigin(originX, originY)
      .setCrop(crop.x, crop.y, crop.width, crop.height)
      .setScale(scale)
      .setDepth(depth);

    this.areaObjects.push(image);
    return image;
  }

  addTile(key, x, y, { depth = 0, flipX = false, flipY = false, alpha = 1 } = {}) {
    const tile = this.scene.add.image(x, y, this.assetKey(key))
      .setOrigin(0, 0)
      .setFlip(flipX, flipY)
      .setAlpha(alpha)
      .setDepth(depth);
    this.areaObjects.push(tile);
    return tile;
  }

  buildPremiumGrassIsland(pad, width, height) {
    const size = 16;
    const innerWidth = width - pad * 2;
    const innerHeight = height - pad * 2;
    const base = this.scene.add.tileSprite(pad, pad, innerWidth, innerHeight, this.assetKey('grass_mid'))
      .setOrigin(0)
      .setDepth(-89);
    this.areaObjects.push(base);

    // The supplied loose-cut tiles give the coastline an authored silhouette
    // while leaving the data-driven navigation grid untouched.
    for (let x = pad + size; x < width - pad - size; x += size) {
      this.addTile('grass_flat_north', x, pad, { depth: -88 });
      this.addTile('grass_flat_south', x, height - pad - size, { depth: -88 });
    }
    for (let y = pad + size; y < height - pad - size; y += size) {
      this.addTile('grass_flat_west', pad, y, { depth: -88 });
      this.addTile('grass_flat_west', width - pad - size, y, { depth: -88, flipX: true });
    }

    this.addTile('grass_corner_nw', pad, pad, { depth: -88 });
    this.addTile('grass_corner_ne', width - pad - size, pad, { depth: -88 });
    this.addTile('grass_corner_sw', pad, height - pad - size, { depth: -88 });
    this.addTile('grass_corner_se', width - pad - size, height - pad - size, { depth: -88 });

    const accents = [
      'grass_flowers_1', 'grass_flowers_2', 'grass_grass_1', 'grass_grass_2',
      'grass_moss_1', 'grass_moss_2', 'grass_moss_3', 'grass_moss_4',
      'grass_sprouts_1', 'grass_sprouts_2', 'grass_sprouts_3', 'grass_sprouts_4'
    ];
    for (let y = pad + 48, row = 0; y < height - pad - 32; y += 64, row += 1) {
      for (let x = pad + 32, col = 0; x < width - pad - 32; x += 80, col += 1) {
        const key = accents[(row * 5 + col * 3) % accents.length];
        this.addTile(key, x, y + ((row + col) % 3) * 8, { depth: -87 });
      }
    }

    const thickets = [
      [pad + 32, pad + 22], [pad + 130, pad + 18], [pad + 250, pad + 28],
      [width - pad - 140, pad + 22], [width - pad - 52, pad + 42],
      [pad + 38, height - pad - 50], [pad + 160, height - pad - 38],
      [width - pad - 190, height - pad - 42], [width - pad - 72, height - pad - 54]
    ];
    for (let i = 0; i < thickets.length; i += 1) {
      const [x, y] = thickets[i];
      this.addAssetCrop('env_trees', x, y, {
        x: (i % 4) * 32,
        y: 48,
        width: 32,
        height: 32
      }, { scale: 1.65, depth: y + 36 });
    }
  }

  addMeadowDetails(area, pad, width, height) {
    // A calm, deterministic scatter prevents the playable ground from feeling
    // like an empty colour field while keeping routes easy to read.
    const seed = [...area.id].reduce((total, char) => total + char.charCodeAt(0), 0);
    const flowerCrops = [
      { x: 0, y: 16, width: 16, height: 16 },
      { x: 16, y: 16, width: 16, height: 16 },
      { x: 32, y: 16, width: 16, height: 16 },
      { x: 48, y: 16, width: 16, height: 16 }
    ];

    for (let column = pad + 28, index = 0; column < width - pad - 18; column += 86, index += 1) {
      const row = pad + 36 + ((seed + index * 37) % Math.max(80, height - pad * 2 - 72));
      const crop = flowerCrops[(seed + index) % flowerCrops.length];
      this.addAssetCrop('env_meadow_objects', column, row, crop, { scale: 1.4, depth: -84 });
    }
  }

  buildOutdoorTerrain(area, width, height, tileSize, gridCols, gridRows) {
    const pad = 48;
    const ground = this.scene.add.rectangle(pad, pad, width - pad * 2, height - pad * 2, area.groundColor).setOrigin(0);
    ground.setDepth(-90);
    this.areaObjects.push(ground);
    this.buildPremiumGrassIsland(pad, width, height);
    this.addMeadowDetails(area, pad, width, height);

    // Block boundary water
    const startTileX = Math.floor(pad / tileSize);
    const startTileY = Math.floor(pad / tileSize);
    const endTileX = Math.floor((width - pad) / tileSize);
    const endTileY = Math.floor((height - pad) / tileSize);

    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        if (x < startTileX || x >= endTileX || y < startTileY || y >= endTileY) {
          this.nav.setCollision(x, y, true);
        }
      }
    }

    // Specific outdoor features
    if (area.river) {
      const r = area.river;
      const rx = r.startCol * tileSize;
      const rw = (r.endCol - r.startCol + 1) * tileSize;
      const riverG = this.scene.add.tileSprite(rx, pad, rw, height - pad * 2, this.assetKey('env_water_tiles')).setOrigin(0);
      riverG.setDepth(-80);
      this.areaObjects.push(riverG);
      const westBank = this.scene.add.tileSprite(rx - 16, pad, 16, height - pad * 2, this.assetKey('grass_flat_west'))
        .setOrigin(0)
        .setDepth(-79);
      const eastBank = this.scene.add.tileSprite(rx + rw, pad, 16, height - pad * 2, this.assetKey('grass_flat_west'))
        .setOrigin(0)
        .setFlipX(true)
        .setDepth(-79);
      this.areaObjects.push(westBank, eastBank);

      for (let y = pad + 24, index = 0; y < height - pad - 18; y += 64, index += 1) {
        this.addAssetCrop('env_water_objects', rx + 4 + ((index % 2) * 12), y, {
          x: 16,
          y: 16,
          width: 16,
          height: 16
        }, { scale: 1.1, depth: -79 });
      }

      for (let y = startTileY; y < endTileY; y++) {
        for (let x = r.startCol; x <= r.endCol; x++) {
          this.nav.setCollision(x, y, true);
        }
      }

      // Wooden Bridge
      const by = r.bridgeRowStart * tileSize;
      const bh = r.bridgeRowCount * tileSize;
      this.addAssetCrop('env_wooden_bridge', rx - 8, by - 8, {
        x: 0,
        y: 0,
        width: 48,
        height: 32
      }, { scale: Math.max(1.1, Math.min(2, (rw + 16) / 48)), depth: -70 });

      for (let y = r.bridgeRowStart; y < r.bridgeRowStart + r.bridgeRowCount; y++) {
        for (let x = r.startCol; x <= r.endCol; x++) {
          this.nav.setCollision(x, y, false);
        }
      }
    }

    // Cobblestone Roads
    for (const path of area.cobblestonePaths || []) {
      const road = this.scene.add.rectangle(path.x, path.y, path.w, path.h, 0xe7c98f).setOrigin(0);
      road.setDepth(-85);
      this.areaObjects.push(road);

      const pathTexture = this.addAssetCrop('env_soil_tiles', path.x, path.y, {
        x: 0,
        y: 64,
        width: 80,
        height: 48
      }, { depth: -84 });
      pathTexture.setDisplaySize(path.w, path.h).setAlpha(0.7);
    }

    // Town Buildings
    for (const bld of area.townBuildings || []) {
      this.createBuilding(bld.x, bld.y, bld.label, bld.color);
    }

    // Wetlands Boardwalks & Water
    for (const wb of area.waterBodies || []) {
      const water = this.scene.add.rectangle(wb.x, wb.y, wb.w, wb.h, 0x2b6b82).setOrigin(0);
      water.setDepth(-88);
      water.setStrokeStyle(2, 0x1f4e5f);
      this.areaObjects.push(water);
      const waterTexture = this.scene.add.tileSprite(wb.x, wb.y, wb.w, wb.h, this.assetKey('env_water_tiles'))
        .setOrigin(0)
        .setAlpha(0.82)
        .setDepth(-87);
      this.areaObjects.push(waterTexture);

      for (let x = wb.x + 16, index = 0; x < wb.x + wb.w - 16; x += 56, index += 1) {
        this.addAssetCrop('env_water_objects', x, wb.y + 12 + ((index % 2) * 18), {
          x: 16,
          y: 16,
          width: 16,
          height: 16
        }, { scale: 1.15, depth: -87 });
      }

      const tLeft = Math.floor(wb.x / tileSize);
      const tTop = Math.floor(wb.y / tileSize);
      const tRight = Math.floor((wb.x + wb.w) / tileSize);
      const tBottom = Math.floor((wb.y + wb.h) / tileSize);
      for (let y = tTop; y < tBottom; y++) {
        for (let x = tLeft; x < tRight; x++) {
          this.nav.setCollision(x, y, true);
        }
      }
    }

    for (const bw of area.boardwalks || []) {
      const boardwalk = this.addAssetCrop('env_wooden_bridge', bw.x, bw.y, {
        x: 0,
        y: 0,
        width: 48,
        height: 32
      }, { scale: Math.max(0.8, bw.w / 48), depth: -75 });
      boardwalk.setDisplaySize(bw.w, Math.max(bw.h, 24));

      const tLeft = Math.floor(bw.x / tileSize);
      const tTop = Math.floor(bw.y / tileSize);
      const tRight = Math.floor((bw.x + bw.w) / tileSize);
      const tBottom = Math.floor((bw.y + bw.h) / tileSize);
      for (let y = tTop; y < tBottom; y++) {
        for (let x = tLeft; x < tRight; x++) {
          this.nav.setCollision(x, y, false); // Boardwalks are walkable!
        }
      }
    }

    // Pier at Harbour
    if (area.pier) {
      const p = area.pier;
      const pier = this.addAssetCrop('env_wooden_bridge', p.x, p.y, {
        x: 0,
        y: 0,
        width: 48,
        height: 32
      }, { scale: Math.max(0.8, p.w / 48), depth: -75 });
      pier.setDisplaySize(p.w, Math.max(p.h, 24));
    }

    // Cottage Structure
    if (area.cottage) {
      this.createBuilding(area.cottage.x, area.cottage.y, 'Farm Cottage', 0xc27a42);
      this.addAssetCrop('env_fences', area.cottage.x - 92, area.cottage.y + 34, {
        x: 0,
        y: 0,
        width: 64,
        height: 32
      }, { scale: 1.15, depth: area.cottage.y + 42 });
      this.addAssetCrop('env_picnic_blanket', area.cottage.x + 62, area.cottage.y + 28, {
        x: 0,
        y: 0,
        width: 48,
        height: 48
      }, { scale: 0.85, depth: area.cottage.y + 40 });
      this.addAssetCrop('env_picnic_basket', area.cottage.x + 76, area.cottage.y + 38, {
        x: 0,
        y: 0,
        width: 16,
        height: 16
      }, { scale: 1.5, depth: area.cottage.y + 52 });
      this.addAssetCrop('env_chest', area.cottage.x + 12, area.cottage.y + 56, {
        x: 0,
        y: 0,
        width: 32,
        height: 32
      }, { scale: 1.2, depth: area.cottage.y + 62 });
    }
  }

  buildInteriorRoom(area, width, height, tileSize, gridCols, gridRows) {
    const w = area.walls;
    const room = this.scene.add.rectangle(w.x, w.y, w.w, w.h, area.groundColor).setOrigin(0);
    room.setDepth(-90);
    room.setStrokeStyle(6, 0x4a2a16);
    this.areaObjects.push(room);

    // Block outside of room
    const tLeft = Math.floor(w.x / tileSize);
    const tTop = Math.floor(w.y / tileSize);
    const tRight = Math.floor((w.x + w.w) / tileSize);
    const tBottom = Math.floor((w.y + w.h) / tileSize);

    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        if (x < tLeft || x >= tRight || y < tTop || y >= tBottom) {
          this.nav.setCollision(x, y, true);
        }
      }
    }

    // Rug
    if (area.rug) {
      const r = area.rug;
      const rugG = this.scene.add.rectangle(r.x, r.y, r.w, r.h, r.color).setOrigin(0.5);
      rugG.setDepth(-85);
      rugG.setStrokeStyle(2, 0x5a2323);
      this.areaObjects.push(rugG);
    }

    // Furniture
    for (const f of area.furniture || []) {
      const furn = this.scene.add.rectangle(f.x, f.y, f.w, f.h, f.color).setOrigin(0.5);
      furn.setDepth(f.y);
      furn.setStrokeStyle(2, 0x2e180d);
      this.areaObjects.push(furn);

      const fLeft = Math.floor((f.x - f.w / 2) / tileSize);
      const fTop = Math.floor((f.y - f.h / 2) / tileSize);
      const fRight = Math.ceil((f.x + f.w / 2) / tileSize);
      const fBottom = Math.ceil((f.y + f.h / 2) / tileSize);
      for (let y = fTop; y < fBottom; y++) {
        for (let x = fLeft; x < fRight; x++) {
          this.nav.setCollision(x, y, true);
        }
      }
    }
  }

  buildCaveGrotto(area, width, height, tileSize, gridCols, gridRows) {
    const c = area.cavernBounds;
    const cave = this.scene.add.rectangle(c.x, c.y, c.w, c.h, area.groundColor).setOrigin(0);
    cave.setDepth(-90);
    cave.setStrokeStyle(8, 0x141e28);
    this.areaObjects.push(cave);

    // Block outside of cave
    const tLeft = Math.floor(c.x / tileSize);
    const tTop = Math.floor(c.y / tileSize);
    const tRight = Math.floor((c.x + c.w) / tileSize);
    const tBottom = Math.floor((c.y + c.h) / tileSize);

    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        if (x < tLeft || x >= tRight || y < tTop || y >= tBottom) {
          this.nav.setCollision(x, y, true);
        }
      }
    }

    // Glowing Crystals
    for (const cry of area.crystals || []) {
      const crystal = this.scene.add.polygon(cry.x, cry.y, [
        0, -18,
        10, -6,
        8, 14,
        -8, 14,
        -10, -6
      ], cry.color);
      crystal.setStrokeStyle(2, 0xffffff, 0.8);
      crystal.setDepth(cry.y + 12);
      this.areaObjects.push(crystal);

      // Light glow pulse
      this.scene.tweens.add({
        targets: crystal,
        alpha: 0.6,
        duration: 800 + Math.random() * 400,
        yoyo: true,
        repeat: -1
      });

      const tile = this.nav.worldToTile(cry.x, cry.y + 10);
      this.nav.setCollision(tile.x, tile.y, true);
    }
  }

  createBuilding(x, y, label, roofColor) {
    const bld = this.scene.add.container(x, y);

    // Assemble the cottage from supplied Premium tiles rather than drawing
    // geometric stand-ins. The soft green roof tint makes its entrance easy
    // to find without changing the source pixels.
    const wall = this.scene.add.image(-24, -4, this.assetKey('env_house_walls'))
      .setOrigin(0, 0)
      .setCrop(0, 0, 32, 48)
      .setScale(2);
    const roof = this.scene.add.image(-48, -58, this.assetKey('env_house_roof'))
      .setOrigin(0, 0)
      .setCrop(0, 0, 48, 48)
      .setScale(2)
      .setTint(roofColor || 0xffffff);

    // Sign/label
    const sign = this.scene.add.text(0, -6, label, {
      fontFamily: 'SproutLands',
      fontSize: '9px',
      color: '#432c21',
      backgroundColor: '#f1dcba'
    }).setOrigin(0.5);

    bld.add([wall, roof, sign]);
    bld.setDepth(y + 35);
    this.areaObjects.push(bld);

    // Block building base
    const baseTile = this.nav.worldToTile(x, y + 26);
    this.nav.setRectCollision(baseTile.x - 2, baseTile.y - 1, 5, 2, true);
    // Unblock the door entrance tile
    this.nav.setCollision(baseTile.x, baseTile.y + 1, false);

    // Register roof occluder
    this.depthOcclusion.registerOccluder(
      bld,
      { x: x - 50, y: y - 58, width: 100, height: 60 },
      y + 35
    );
  }

  createTree(x, y) {
    const variants = [0, 32, 64, 96, 128, 160];
    const variantX = variants[Math.abs(Math.round(x + y)) % variants.length];
    const tree = this.addAssetCrop('env_trees', x - 28, y - 74, {
      x: variantX,
      y: 0,
      width: 32,
      height: 48
    }, { scale: 1.7, depth: y + 22 });
    const footY = y + 22;

    this.depthOcclusion.registerOccluder(
      tree,
      { x: x - 40, y: y - 68, width: 80, height: 68 },
      footY
    );

    const baseTile = this.nav.worldToTile(x, footY);
    this.nav.setCollision(baseTile.x, baseTile.y, true);
    this.nav.setCollision(baseTile.x - 1, baseTile.y, true);
    this.nav.setCollision(baseTile.x + 1, baseTile.y, true);
  }

  createRock(x, y) {
    const rock = this.addAssetCrop('env_meadow_objects', x - 12, y - 10, {
      x: 112,
      y: 0,
      width: 16,
      height: 16
    }, { scale: 1.6, depth: y + 8 });

    const footY = y + 8;
    this.depthOcclusion.addDepthEntity(rock, 8);

    const tile = this.nav.worldToTile(x, footY);
    this.nav.setCollision(tile.x, tile.y, true);
  }

  createNPC(id, name, textureKey, x, y, dialogue) {
    const tex = this.namespace.namespaceTextureKey(textureKey);
    const sprite = this.scene.add.sprite(x, y, tex, 12).setScale(2.5);

    const animKey = `walk-down-${tex}`;
    if (this.scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }

    this.depthOcclusion.addDepthEntity(sprite, 12);

    const tile = this.nav.worldToTile(x, y + 10);
    this.nav.setCollision(tile.x, tile.y, true);

    const interactFn = () => {
      let msg = dialogue;
      if (id === 'npc_mama_duck' && this.questManager) {
        msg = this.questManager.talkToMamaDuck();
      } else if (id === 'npc_baker_bun' && this.questManager) {
        msg = this.questManager.talkToBaker();
      }
      this.showDialogue(name, msg);
    };

    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      const dist = Math.hypot(this.scene.player.x - x, this.scene.player.y - y);
      if (dist <= 72) {
        interactFn();
      } else if (this.scene.playerController) {
        this.scene.playerController.navigateTo(x, y + 24);
      }
    });

    this.interaction.registerInteractable({
      id,
      name,
      type: 'npc',
      x,
      y,
      radius: 60,
      label: 'TALK',
      onInteract: interactFn
    });

    this.areaObjects.push(sprite);
  }

  createDuckling(duck) {
    // The Premium animal sheet gives the quest companions the same crafted
    // pixel language as the world rather than an improvised vector mascot.
    const container = this.scene.add.sprite(duck.x, duck.y, this.assetKey('premium_chicken_baby'), 12)
      .setScale(2)
      .setDepth(duck.y + 8);
    container.setSize(24, 24);

    this.scene.tweens.add({
      targets: container,
      y: duck.y - 4,
      duration: 350 + Math.random() * 150,
      yoyo: true,
      repeat: -1
    });

    const gatherFn = () => {
      if (this.questManager) {
        this.scene.tweens.killTweensOf(container);
        const idx = this.areaObjects.indexOf(container);
        if (idx !== -1) {
          this.areaObjects.splice(idx, 1);
        }
        this.questManager.gatherDuckling(duck.id, duck.name, container);
        this.interaction.unregisterInteractable(duck.id);
        this.showDialogue(duck.name, `*Cheep cheep!* ${duck.name} is so happy to see you and waddles right behind you!`);
      }
    };

    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      const dist = Math.hypot(this.scene.player.x - duck.x, this.scene.player.y - duck.y);
      if (dist <= 72) {
        gatherFn();
      } else if (this.scene.playerController) {
        this.scene.playerController.navigateTo(duck.x, duck.y);
      }
    });

    this.interaction.registerInteractable({
      id: duck.id,
      name: duck.name,
      type: 'duckling',
      x: duck.x,
      y: duck.y,
      radius: 54,
      label: 'QUACK',
      onInteract: gatherFn
    });

    this.areaObjects.push(container);
  }

  createClue(clue) {
    const container = this.scene.add.container(clue.x, clue.y);

    const marker = this.scene.add.circle(0, 0, 8, 0xffd54f, 0.7);
    marker.setStrokeStyle(1.5, 0xb87a4a);
    const star = this.scene.add.text(0, -1, '★', {
      fontSize: '10px',
      color: '#432c21'
    }).setOrigin(0.5);

    container.add([marker, star]);
    container.setDepth(clue.y);
    container.setSize(28, 28);

    this.scene.tweens.add({
      targets: container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    const inspectFn = () => {
      if (this.questManager) {
        this.questManager.inspectClue(clue.id, clue.name);
        this.interaction.unregisterInteractable(clue.id);
        container.destroy();
        this.showDialogue('Woodland Clue', `Found: ${clue.name}! ${clue.hint}`);
      }
    };

    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      const dist = Math.hypot(this.scene.player.x - clue.x, this.scene.player.y - clue.y);
      if (dist <= 72) {
        inspectFn();
      } else if (this.scene.playerController) {
        this.scene.playerController.navigateTo(clue.x, clue.y);
      }
    });

    this.interaction.registerInteractable({
      id: clue.id,
      name: clue.name,
      type: 'clue',
      x: clue.x,
      y: clue.y,
      radius: 54,
      label: 'INSPECT',
      onInteract: inspectFn
    });

    this.areaObjects.push(container);
  }

  createLostImp(imp) {
    const tex = this.namespace.namespaceTextureKey('forest_imp');
    const sprite = this.scene.add.sprite(imp.x, imp.y, tex, 12).setScale(2.5);

    this.depthOcclusion.addDepthEntity(sprite, 12);

    const rescueFn = () => {
      if (this.questManager) {
        const idx = this.areaObjects.indexOf(sprite);
        if (idx !== -1) {
          this.areaObjects.splice(idx, 1);
        }
        const msg = this.questManager.rescueImp(sprite);
        this.interaction.unregisterInteractable(imp.id);
        this.showDialogue(imp.name, msg);
      }
    };

    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      const dist = Math.hypot(this.scene.player.x - imp.x, this.scene.player.y - imp.y);
      if (dist <= 72) {
        rescueFn();
      } else if (this.scene.playerController) {
        this.scene.playerController.navigateTo(imp.x, imp.y);
      }
    });

    this.interaction.registerInteractable({
      id: imp.id,
      name: imp.name,
      type: 'lost_imp',
      x: imp.x,
      y: imp.y,
      radius: 60,
      label: 'RESCUE',
      onInteract: rescueFn
    });

    this.areaObjects.push(sprite);
  }

  createSignpost(id, x, y, title, text) {
    const sign = this.addAssetCrop('env_signs', x - 16, y - 32, {
      x: 0,
      y: 0,
      width: 16,
      height: 32
    }, { scale: 2, depth: y + 10 });
    sign.setSize(32, 48);
    this.depthOcclusion.addDepthEntity(sign, 10);

    const tile = this.nav.worldToTile(x, y + 8);
    this.nav.setCollision(tile.x, tile.y, true);

    const readFn = () => this.showDialogue(title, text);

    sign.setInteractive({ useHandCursor: true });
    sign.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      const dist = Math.hypot(this.scene.player.x - x, this.scene.player.y - y);
      if (dist <= 72) {
        readFn();
      } else if (this.scene.playerController) {
        this.scene.playerController.navigateTo(x, y + 16);
      }
    });

    this.interaction.registerInteractable({
      id,
      name: title,
      type: 'sign',
      x,
      y,
      radius: 54,
      label: 'READ',
      onInteract: readFn
    });

  }

  createPortal(portal) {
    // Portal visuals
    const marker = this.scene.add.container(portal.x, portal.y);
    marker.setDepth(-40);

    const pill = this.scene.add.rectangle(0, 0, portal.width, portal.height, 0xffd54f, 0.4);
    pill.setStrokeStyle(2, 0xffb300, 0.8);
    marker.add(pill);

    // Gentle glow tween
    this.scene.tweens.add({
      targets: pill,
      alpha: 0.8,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    this.areaObjects.push(marker);
    this.portals.push(portal);

    // Register portal as an interactable as well (so player can tap it or walk into it)
    this.interaction.registerInteractable({
      id: portal.id,
      name: portal.label,
      type: 'portal',
      x: portal.x,
      y: portal.y,
      radius: 36,
      label: portal.type === 'door' ? 'ENTER' : (portal.type === 'boat' ? 'FERRY' : 'TRAVEL'),
      onInteract: () => {
        this.transitionToArea(portal.targetRegionId, portal.targetX, portal.targetY);
      }
    });
  }

  update(delta) {
    if (this.isTransitioning || !this.scene.player) return;

    const px = this.scene.player.x;
    const py = this.scene.player.y;

    // Check if player walked into any portal trigger zone
    for (const p of this.portals) {
      if (Math.abs(px - p.x) <= p.width / 2 && Math.abs(py - p.y) <= p.height / 2) {
        this.transitionToArea(p.targetRegionId, p.targetX, p.targetY);
        break;
      }
    }
  }

  transitionToArea(targetRegionId, targetX, targetY) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.audioService?.playPortalSwoosh();

    if (this.scene.playerController) {
      this.scene.playerController.stopNavigation();
    }

    // Camera fade out
    this.scene.cameras.main.fade(200, 10, 16, 24);
    this.scene.time.delayedCall(200, () => {
      this.loadArea(targetRegionId, targetX, targetY);
      this.scene.cameras.main.fadeIn(200, 10, 16, 24);
      this.isTransitioning = false;
    });
  }

  showDialogue(speaker, message) {
    this.audioService?.playDialoguePing();
    const uiScene = this.scene.scene.get('UIScene');
    if (uiScene?.showDialogueBox) {
      uiScene.showDialogueBox(speaker, message);
    } else {
      console.log(`[Dialogue] ${speaker}: "${message}"`);
    }
  }
}
