/**
 * WorldAreaRegistry: Complete definition for the connected River Ribbon world.
 * Contains:
 * - 6 Outdoor Connected Regions:
 *   1. West End Meadow & Headwaters (Farmstead, pond, west canal)
 *   2. Central Town Common & School Green (Town square, school, bakery)
 *   3. Pinecrest Forest & Ridge (Dense woods, rocky cliffs, mountain trail)
 *   4. South-Shore Wetlands & Reed Islets (Boardwalks, lily pads, tidal channels)
 *   5. East Pebble Beach & Harbour (Sandy shore, dock, lighthouse)
 *   6. Sanctuary Isle (Secret botanical islet reached by ferry)
 * - 2 Separate Interiors / Caves:
 *   7. Cozy Farmhouse Cottage (Warm wooden interior, rug, bed, fireplace)
 *   8. Whispering Crystal Cave (Underground grotto, crystal outcrops, treasure)
 */

export const WORLD_AREAS = {
  region_west_meadow: {
    id: 'region_west_meadow',
    name: 'West End Meadow & Headwaters',
    description: 'A lush grassy headland where the central river begins its flow toward the sea. Home to a cozy farmhouse cottage and Mama Duck\'s family nest.',
    landmarks: ['Mama Duck Nest', 'Farm Cottage', 'Headwaters Bridge'],
    type: 'outdoor',
    theme: 'meadow',
    bgColor: 0x19354e, // Surrounding water
    groundColor: 0x7eb343,
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_to_town',
        x: 900,
        y: 280,
        width: 32,
        height: 64,
        targetRegionId: 'region_central_town',
        targetX: 80,
        targetY: 280,
        label: 'To Town Common',
        type: 'bridge'
      },
      {
        id: 'portal_to_forest',
        x: 480,
        y: 52,
        width: 64,
        height: 32,
        targetRegionId: 'region_pinecrest_forest',
        targetX: 480,
        targetY: 460,
        label: 'To Pinecrest Forest',
        type: 'trail'
      },
      {
        id: 'portal_to_farmhouse',
        x: 220,
        y: 200,
        width: 32,
        height: 32,
        targetRegionId: 'interior_farmhouse',
        targetX: 480,
        targetY: 420,
        label: 'Enter Cottage',
        type: 'door'
      }
    ],
    river: { startCol: 28, endCol: 31, bridgeRowStart: 16, bridgeRowCount: 4 },
    trees: [
      { x: 160, y: 150 },
      { x: 280, y: 140 },
      { x: 150, y: 350 },
      { x: 320, y: 380 },
      { x: 620, y: 180 },
      { x: 740, y: 220 },
      { x: 680, y: 370 }
    ],
    rocks: [
      { x: 120, y: 260 },
      { x: 600, y: 360 }
    ],
    cottage: { x: 220, y: 190 },
    npcs: [
      {
        id: 'npc_oliver',
        name: 'Gardener Oliver',
        textureKey: 'capybara_gardener',
        x: 380,
        y: 230,
        dialogue: 'Welcome to River Ribbon Island! Check out Mama Duck near the pond to the south, or cross the bridge to visit Town Common!'
      },
      {
        id: 'npc_mama_duck',
        name: 'Mama Duck',
        textureKey: 'capybara_natural',
        x: 270,
        y: 430,
        dialogue: 'Quack! Oh dear, my four little ducklings have wandered away around the island! Could you please help me find them?'
      }
    ],
    signs: [
      {
        id: 'sign_meadow',
        x: 410,
        y: 290,
        title: 'West Meadow Crossing',
        text: 'West Meadow: Home of the Farmstead. East leads across the timber bridge to Town Common.'
      }
    ],
    ducklings: [
      { id: 'duckling_1', name: 'Pippin', x: 210, y: 380 }
    ]
  },

  region_central_town: {
    id: 'region_central_town',
    name: 'Central Town Common & Green',
    description: 'The bustling cultural heart of River Ribbon Island. Cobblestone roads meet at the central square between the Village Schoolhouse and Sweet Crumb Bakery.',
    landmarks: ['Town Square', 'Sweet Crumb Bakery', 'Village Schoolhouse'],
    type: 'outdoor',
    theme: 'town',
    bgColor: 0x19354e,
    groundColor: 0x82b846,
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_back_to_meadow',
        x: 52,
        y: 280,
        width: 32,
        height: 64,
        targetRegionId: 'region_west_meadow',
        targetX: 860,
        targetY: 280,
        label: 'To West Meadow',
        type: 'bridge'
      },
      {
        id: 'portal_to_harbour',
        x: 900,
        y: 280,
        width: 32,
        height: 64,
        targetRegionId: 'region_east_harbour',
        targetX: 80,
        targetY: 280,
        label: 'To East Harbour',
        type: 'bridge'
      },
      {
        id: 'portal_to_wetlands',
        x: 480,
        y: 488,
        width: 80,
        height: 32,
        targetRegionId: 'region_south_wetlands',
        targetX: 480,
        targetY: 70,
        label: 'To South Wetlands',
        type: 'boardwalk'
      }
    ],
    cobblestonePaths: [
      { x: 48, y: 260, w: 864, h: 40 }, // West-East Main Street
      { x: 460, y: 48, w: 40, h: 444 }  // North-South Avenue
    ],
    townBuildings: [
      { x: 260, y: 160, label: 'Village Schoolhouse', color: 0xb5523f },
      { x: 700, y: 160, label: 'Sweet Crumb Bakery', color: 0xd98236 }
    ],
    trees: [
      { x: 160, y: 380 },
      { x: 340, y: 390 },
      { x: 620, y: 380 },
      { x: 800, y: 390 }
    ],
    rocks: [
      { x: 400, y: 140 },
      { x: 560, y: 140 }
    ],
    npcs: [
      {
        id: 'npc_mayor_imp',
        name: 'Mayor Pippin',
        textureKey: 'forest_imp',
        x: 480,
        y: 210,
        dialogue: 'Greetings! Our town sits at the heart of River Ribbon. Feel free to explore the bakery, the wetlands down south, or the harbour to the east!'
      },
      {
        id: 'npc_baker_bun',
        name: 'Baker Barnaby',
        textureKey: 'capybara_baker',
        x: 700,
        y: 220,
        dialogue: 'Fresh warm clover scones! If you are heading up to Pinecrest Forest, watch out—the woods get quite thick!'
      }
    ],
    signs: [
      {
        id: 'sign_town_square',
        x: 520,
        y: 260,
        title: 'Town Square Directory',
        text: 'West: Meadow & Farm. East: Pebble Beach & Harbour. South: Boardwalk Wetlands. North: Pinecrest Ridge.'
      }
    ],
    ducklings: [
      { id: 'duckling_2', name: 'Dottie', x: 360, y: 340 }
    ]
  },

  region_pinecrest_forest: {
    id: 'region_pinecrest_forest',
    name: 'Pinecrest Forest & Ridge',
    description: 'A highland wilderness of towering pine groves and rocky cliffs overlooking the island. Secret footpaths lead to a luminescent crystal cave.',
    landmarks: ['Pine Ridge Trail', 'Rocky Overlook', 'Crystal Cave Entrance'],
    type: 'outdoor',
    theme: 'forest',
    bgColor: 0x14283b,
    groundColor: 0x588732,
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_back_to_meadow',
        x: 480,
        y: 488,
        width: 80,
        height: 32,
        targetRegionId: 'region_west_meadow',
        targetX: 480,
        targetY: 80,
        label: 'Back to Meadow',
        type: 'trail'
      },
      {
        id: 'portal_to_cave',
        x: 780,
        y: 140,
        width: 48,
        height: 48,
        targetRegionId: 'special_crystal_cave',
        targetX: 160,
        targetY: 280,
        label: 'Enter Crystal Cave',
        type: 'cave'
      }
    ],
    cliffs: [
      { x: 650, y: 80, w: 260, h: 90, color: 0x4a4f56 }
    ],
    trees: [
      { x: 140, y: 120 }, { x: 230, y: 150 }, { x: 330, y: 110 }, { x: 440, y: 140 },
      { x: 160, y: 260 }, { x: 270, y: 310 }, { x: 380, y: 270 },
      { x: 550, y: 220 }, { x: 660, y: 280 }, { x: 770, y: 250 },
      { x: 590, y: 380 }, { x: 720, y: 400 }, { x: 840, y: 360 }
    ],
    rocks: [
      { x: 200, y: 200 }, { x: 500, y: 290 }, { x: 640, y: 120 }
    ],
    npcs: [
      {
        id: 'npc_ranger_puppy',
        name: 'Ranger Scout',
        textureKey: 'long_ear_white_puppy',
        x: 420,
        y: 350,
        dialogue: 'Shh! Listen to the pine needles rustling. Someone dropped a trail of clues deeper in the woods!'
      }
    ],
    signs: [
      {
        id: 'sign_cave_warning',
        x: 710,
        y: 160,
        title: 'Crystal Grotto Entrance',
        text: 'Caution: The cavern floor is cool and damp. Watch out for glowing blue crystals!'
      }
    ],
    clues: [
      { id: 'clue_ribbon', name: 'Yellow Silk Ribbon', x: 260, y: 220, hint: 'A bright yellow ribbon caught on a pine branch!' },
      { id: 'clue_pawprints', name: 'Tiny Pawprints', x: 410, y: 260, hint: 'Fresh imp pawprints heading eastward toward the ridge!' },
      { id: 'clue_twigs', name: 'Broken Pine Twigs', x: 620, y: 210, hint: 'Snapped twigs pointing up the rocky trail!' },
      { id: 'clue_acorn', name: 'Berry Basket', x: 750, y: 310, hint: 'A dropped wicker basket full of ripe mountain berries!' }
    ],
    lostImp: {
      id: 'npc_lost_imp',
      name: 'Lost Forest Imp',
      x: 830,
      y: 280
    }
  },

  region_south_wetlands: {
    id: 'region_south_wetlands',
    name: 'South-Shore Wetlands & Reeds',
    description: 'Tranquil freshwater marshes crisscrossed by wooden boardwalks among blooming water lilies and soft reeds.',
    landmarks: ['Main Boardwalk', 'Lilypad Ponds', 'Angler\'s Rest'],
    type: 'outdoor',
    theme: 'wetlands',
    bgColor: 0x19354e,
    groundColor: 0x3f7d4b,
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_back_to_town',
        x: 480,
        y: 52,
        width: 80,
        height: 32,
        targetRegionId: 'region_central_town',
        targetX: 480,
        targetY: 450,
        label: 'Back to Town Common',
        type: 'boardwalk'
      }
    ],
    waterBodies: [
      { x: 120, y: 160, w: 280, h: 260 },
      { x: 560, y: 180, w: 290, h: 240 }
    ],
    boardwalks: [
      { x: 450, y: 48, w: 60, h: 444 }, // North-South Main Boardwalk
      { x: 200, y: 260, w: 300, h: 36 }, // West Branch
      { x: 460, y: 320, w: 320, h: 36 }  // East Branch
    ],
    trees: [
      { x: 160, y: 100 }, { x: 790, y: 110 }, { x: 860, y: 440 }
    ],
    rocks: [
      { x: 260, y: 440 }, { x: 700, y: 440 }
    ],
    npcs: [
      {
        id: 'npc_fisherman_croak',
        name: 'Old Angler Barnaby',
        textureKey: 'sky_puppy',
        x: 230,
        y: 240,
        dialogue: 'Quiet ripples today! I saw a little lost duckling paddling near the eastern reeds!'
      }
    ],
    signs: [
      {
        id: 'sign_wetlands',
        x: 530,
        y: 120,
        title: 'Wetlands Boardwalk',
        text: 'Please stay on the wooden planks. The marsh mud is very soft and full of frogs!'
      }
    ],
    ducklings: [
      { id: 'duckling_3', name: 'Barnaby Jr.', x: 260, y: 320 }
    ]
  },

  region_east_harbour: {
    id: 'region_east_harbour',
    name: 'East Pebble Beach & Harbour',
    description: 'A warm sandy shoreline and wooden boat pier overlooking the open sea. Rowboats and ferries dock here for safe passage to Sanctuary Isle.',
    landmarks: ['Fisherman\'s Pier', 'Pebble Beach', 'Sanctuary Ferry Dock'],
    type: 'outdoor',
    theme: 'beach',
    bgColor: 0x19354e,
    groundColor: 0xe6cd8e, // Sand
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_back_to_town',
        x: 52,
        y: 280,
        width: 32,
        height: 64,
        targetRegionId: 'region_central_town',
        targetX: 860,
        targetY: 280,
        label: 'Back to Town',
        type: 'bridge'
      },
      {
        id: 'portal_ferry_to_sanctuary',
        x: 880,
        y: 270,
        width: 48,
        height: 48,
        targetRegionId: 'region_sanctuary_isle',
        targetX: 120,
        targetY: 270,
        label: 'Take Ferry to Sanctuary Isle',
        type: 'boat'
      }
    ],
    pier: { x: 800, y: 250, w: 120, h: 48 },
    trees: [
      { x: 180, y: 140 }, { x: 280, y: 120 }, { x: 220, y: 410 }
    ],
    rocks: [
      { x: 500, y: 160 }, { x: 620, y: 390 }, { x: 740, y: 410 }
    ],
    npcs: [
      {
        id: 'npc_captain_seal',
        name: 'Captain Finley',
        textureKey: 'capybara_natural',
        x: 770,
        y: 230,
        dialogue: 'Ahoy! The ferry to Sanctuary Isle departs right from this pier! Hop aboard when you are ready to visit the sanctuary.'
      }
    ],
    signs: [
      {
        id: 'sign_pier',
        x: 730,
        y: 270,
        title: 'Harbour Pier',
        text: 'East Pier: Rowboat and ferry dock. Cross the sea passage to reach Sanctuary Isle.'
      }
    ],
    ducklings: [
      { id: 'duckling_4', name: 'Sunny', x: 680, y: 380 }
    ]
  },

  region_sanctuary_isle: {
    id: 'region_sanctuary_isle',
    name: 'Northeast Sanctuary Isle',
    description: 'A quiet, mystical islet resting offshore. Ancient flora and a serene stone shrine offer peace to weary island travelers.',
    landmarks: ['Ancient Shrine', 'Elder Grove', 'Return Ferry'],
    type: 'outdoor',
    theme: 'sanctuary',
    bgColor: 0x19354e,
    groundColor: 0x98d45d, // Lush bright haven
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_ferry_back_to_harbour',
        x: 80,
        y: 270,
        width: 48,
        height: 48,
        targetRegionId: 'region_east_harbour',
        targetX: 820,
        targetY: 270,
        label: 'Take Ferry back to Harbour',
        type: 'boat'
      }
    ],
    sanctuaryShrine: { x: 520, y: 240 },
    trees: [
      { x: 280, y: 160 }, { x: 380, y: 120 }, { x: 660, y: 130 }, { x: 760, y: 180 },
      { x: 320, y: 380 }, { x: 720, y: 370 }
    ],
    rocks: [
      { x: 440, y: 360 }, { x: 600, y: 360 }
    ],
    npcs: [
      {
        id: 'npc_elder_owl',
        name: 'Elder Capybara',
        textureKey: 'capybara_baker',
        x: 520,
        y: 190,
        dialogue: 'You have journeyed from the far west meadow all the way across River Ribbon Island to this quiet sanctuary. Rest well, brave adventurer!'
      }
    ],
    signs: [
      {
        id: 'sign_sanctuary',
        x: 420,
        y: 260,
        title: 'Sanctuary Isle',
        text: 'A quiet haven at the tip of the island. Congratulations on crossing River Ribbon!'
      }
    ]
  },

  interior_farmhouse: {
    id: 'interior_farmhouse',
    name: 'Cozy Farmstead Cottage',
    description: 'A cozy timber farmhouse with a warm stone fireplace, patterned wool rugs, and freshly steeped tea.',
    landmarks: ['Stone Fireplace', 'Tea Table', 'Feather Bed'],
    type: 'interior',
    theme: 'indoor',
    bgColor: 0x1e1510,
    groundColor: 0xb5804c, // Wood floor
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_exit_cottage',
        x: 480,
        y: 470,
        width: 64,
        height: 32,
        targetRegionId: 'region_west_meadow',
        targetX: 220,
        targetY: 240,
        label: 'Step Outside',
        type: 'door'
      }
    ],
    walls: { x: 260, y: 80, w: 440, h: 380 },
    furniture: [
      { x: 360, y: 180, w: 60, h: 40, label: 'Table & Tea', color: 0x7a4925 },
      { x: 600, y: 160, w: 50, h: 70, label: 'Feather Bed', color: 0xd65b45 },
      { x: 480, y: 130, w: 60, h: 30, label: 'Stone Fireplace', color: 0x615852 }
    ],
    rug: { x: 480, y: 280, w: 140, h: 90, color: 0x8a3c3c },
    npcs: [],
    signs: [
      {
        id: 'sign_cottage_hearth',
        x: 480,
        y: 155,
        title: 'Warm Hearth',
        text: 'A crackling stone fire warms the cozy room with comforting cedar scent.'
      }
    ]
  },

  special_crystal_cave: {
    id: 'special_crystal_cave',
    name: 'Whispering Crystal Grotto',
    description: 'An underground grotto illuminated by the gentle cyan pulse of mineral crystal formations.',
    landmarks: ['Glowing Crystal Pillar', 'Underground Stream', 'Subterranean Cavern'],
    type: 'cave',
    theme: 'cave',
    bgColor: 0x0a1017,
    groundColor: 0x223242,
    width: 960,
    height: 540,
    portals: [
      {
        id: 'portal_exit_cave',
        x: 140,
        y: 280,
        width: 32,
        height: 64,
        targetRegionId: 'region_pinecrest_forest',
        targetX: 740,
        targetY: 170,
        label: 'Exit to Forest',
        type: 'cave'
      }
    ],
    cavernBounds: { x: 100, y: 80, w: 760, h: 380 },
    crystals: [
      { x: 300, y: 160, color: 0x4dd0e1 },
      { x: 450, y: 130, color: 0x80deea },
      { x: 650, y: 180, color: 0x26c6da },
      { x: 750, y: 320, color: 0x4dd0e1 },
      { x: 350, y: 380, color: 0x80deea }
    ],
    rocks: [
      { x: 260, y: 220 }, { x: 550, y: 340 }
    ],
    npcs: [
      {
        id: 'npc_glow_sprite',
        name: 'Grotto Sprite',
        textureKey: 'sky_puppy',
        x: 620,
        y: 250,
        dialogue: 'Welcome to the deep grotto! Listen closely—the water droplets make music against the crystal stone.'
      }
    ],
    signs: [
      {
        id: 'sign_crystal',
        x: 480,
        y: 200,
        title: 'Glowing Crystal Pillar',
        text: 'A towering cyan crystal hums with gentle, ancient energy.'
      }
    ]
  }
};
