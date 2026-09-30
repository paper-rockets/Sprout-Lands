/**
 * Puts the content package's files together into the one object the game uses.
 * Shared by the game (loadContent.js, which gets the files through Vite) and by the
 * Node checks (scripts/tools/node-content.mjs, which reads them from disk), so both
 * always see exactly the same content.
 *
 * `files` = { config, art, world, strings, characterList,
 *             regionFiles, roomFiles, questFiles, dialogueFiles, rewardFiles, cookingFiles }
 * where each *Files is { "file name": parsed JSON }.
 */

function byId(files, what) {
  const out = {};
  for (const [file, data] of Object.entries(files || {})) {
    if (!data.id) throw new Error(`${file} needs an "id"`);
    if (out[data.id]) throw new Error(`Two ${what} files use the id "${data.id}"`);
    out[data.id] = data;
  }
  return out;
}

/** Every person, animal and thing you can use, by id, with the region it stands in (`person`: listed under "npcs"). */
function indexEntities(regions, rooms) {
  const index = {};
  for (const region of [...Object.values(regions), ...Object.values(rooms)]) {
    const people = new Set(region.npcs || []);
    for (const entity of [...(region.npcs || []), ...(region.entities || [])]) {
      if (!entity.id) throw new Error(`${region.id}: a person or thing has no "id"`);
      if (index[entity.id]) throw new Error(`Two people or things share the id "${entity.id}"`);
      index[entity.id] = { entity, region, person: people.has(entity) };
    }
  }
  return index;
}

export function assembleContent(files) {
  const { config, art, world, strings, characterList } = files;
  const characters = {};
  for (const c of characterList.characters || []) characters[c.id] = c;
  const regions = byId(files.regionFiles, 'region');
  const rooms = byId(files.roomFiles, 'room');
  // Rules that need to know where things stand (escort goals) use these offsets.
  for (const placement of world.regions || []) if (regions[placement.id]) Object.assign(regions[placement.id], { ox: placement.at[0], oy: placement.at[1] });
  for (const placement of world.rooms || []) if (rooms[placement.id]) Object.assign(rooms[placement.id], { ox: placement.at[0], oy: placement.at[1] });
  return {
    config,
    art,
    world,
    strings,
    characters,
    regions,
    rooms,
    quests: byId(files.questFiles, 'quest'),
    dialogue: Object.assign({}, ...Object.values(files.dialogueFiles || {})),
    rewards: Object.assign({}, ...Object.values(files.rewardFiles || {})),
    cooking: Object.assign({ recipes: [], shops: {} }, ...Object.values(files.cookingFiles || {})), // recipes and shops (engine/rules/Kitchen.js)
    entityIndex: indexEntities(regions, rooms)
  };
}
