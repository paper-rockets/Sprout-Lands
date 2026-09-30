/**
 * Cooking and shops: the rules only, no pictures, so they run in Node tests too.
 *
 * The content package's cooking.json lists them:
 *   "recipes": [{ "id": "bun", "makes": "food-bun", "count": 1,
 *                 "needs": [{ "item": "veg-wheat" }, { "group": "eggs", "count": 1 }] }]
 *     A need is one exact item ("item") or any items of a bag group ("group": eggs, fruit, ...).
 *     Exact items are set aside first, so "a wheat and any vegetable" never uses the same wheat twice.
 *   "shops": { "bakery": { "name", "keeper", "sells": [{ "item", "price" }],
 *                          "buys": [{ "item" or "group", "price" }] } }
 *
 * Everything works on the saved state: state.bag (item id -> how many) and state.coins.
 * Coins never go below zero: buying something you cannot afford does nothing.
 */

const cookingOf = (content) => content.cooking || { recipes: [], shops: {} };

export function recipes(content) {
  return cookingOf(content).recipes || [];
}

export function recipe(content, id) {
  return recipes(content).find((r) => r.id === id) || null;
}

export function shop(content, id) {
  return cookingOf(content).shops?.[id] || null;
}

/** Items of a bag group, in the order art.json lists them. */
function groupItems(content, group) {
  return Object.entries(content.art?.items || {}).filter(([, def]) => def?.group === group).map(([id]) => id);
}

/**
 * Which bag items a recipe would use. Returns { ok, take: { itemId: n }, parts: [{ need, have, count }] }:
 * one part per need (have = how many of it the bag can give, up to count).
 */
export function plan(content, bag, rec) {
  const left = { ...bag };
  const take = {};
  const use = (id, n) => {
    left[id] -= n;
    take[id] = (take[id] || 0) + n;
  };
  const needs = rec.needs || [];
  const parts = needs.map((need) => ({ need, have: 0, count: need.count || 1 }));
  // Exact items first, then groups from what is left (the item you have most of goes first).
  needs.forEach((need, i) => {
    if (!need.item) return;
    const n = Math.min(parts[i].count, left[need.item] || 0);
    if (n) use(need.item, n);
    parts[i].have = n;
  });
  needs.forEach((need, i) => {
    if (!need.group) return;
    let wanted = parts[i].count;
    const options = groupItems(content, need.group).filter((id) => (left[id] || 0) > 0).sort((a, b) => left[b] - left[a]);
    for (const id of options) {
      if (!wanted) break;
      const n = Math.min(wanted, left[id]);
      use(id, n);
      wanted -= n;
      parts[i].have += n;
    }
  });
  return { ok: parts.every((p) => p.have >= p.count), take, parts };
}

function removeFromBag(state, id, n) {
  state.bag[id] = (state.bag[id] || 0) - n;
  if (state.bag[id] <= 0) delete state.bag[id];
}

/** Cook a recipe: uses up what it needs and puts the food in the bag. Returns { ok, made, count, took }. */
export function cook(content, state, id) {
  const rec = recipe(content, id);
  if (!rec) return { ok: false, reason: 'unknown' };
  const p = plan(content, state.bag, rec);
  if (!p.ok) return { ok: false, reason: 'missing', parts: p.parts };
  for (const [item, n] of Object.entries(p.take)) removeFromBag(state, item, n);
  const count = rec.count || 1;
  state.bag[rec.makes] = (state.bag[rec.makes] || 0) + count;
  return { ok: true, made: rec.makes, count, took: p.take };
}

/** The price a shop asks for an item, or null when it does not sell it. */
export function sellingPrice(content, shopId, item) {
  const entry = shop(content, shopId)?.sells?.find((s) => s.item === item);
  return entry ? entry.price : null;
}

/** What a shop pays for one of an item (an exact entry wins over a group one), or null when it does not buy it. */
export function buyingPrice(content, shopId, item) {
  const buys = shop(content, shopId)?.buys || [];
  const exact = buys.find((b) => b.item === item);
  if (exact) return exact.price;
  const group = content.art?.items?.[item]?.group;
  const byGroup = group ? buys.find((b) => b.group === group) : null;
  return byGroup ? byGroup.price : null;
}

/** Every item in the bag the shop would buy: [{ item, price, have }], in bag order. */
export function sellable(content, state, shopId) {
  return Object.entries(state.bag)
    .filter(([id, n]) => n > 0 && buyingPrice(content, shopId, id) !== null)
    .map(([id, n]) => ({ item: id, price: buyingPrice(content, shopId, id), have: n }));
}

/** The player buys one of an item. Needs enough coins; coins never go below zero. */
export function buy(content, state, shopId, item) {
  const price = sellingPrice(content, shopId, item);
  if (price === null) return { ok: false, reason: 'unknown' };
  if ((state.coins || 0) < price) return { ok: false, reason: 'coins', price };
  state.coins = Math.max(0, (state.coins || 0) - price);
  state.bag[item] = (state.bag[item] || 0) + 1;
  return { ok: true, price };
}

/** The player sells one of an item to the shop. */
export function sell(content, state, shopId, item) {
  const price = buyingPrice(content, shopId, item);
  if (price === null) return { ok: false, reason: 'unknown' };
  if (!(state.bag[item] > 0)) return { ok: false, reason: 'none', price };
  removeFromBag(state, item, 1);
  state.coins = (state.coins || 0) + price;
  return { ok: true, price };
}
