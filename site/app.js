'use strict';
/* Squeek Wars · live site for Season 2. Every rule and number on screen comes from the contracts (chain.js reads
   them), including GameConfig's editable rule table: units, buildings, research and the economy. This file draws
   them and sends the player's own transactions. Art and layout come from the prototype. */

// ------------------------------------------------------------------ fixed art and layout (the rules live in GameConfig)
const UNIT = 1e6;
const RES = ['wood', 'food', 'stone', 'iron'];
const RES_NAME = { wood: 'Wood', food: 'Food', stone: 'Stone', iron: 'Iron' };
const FIELD_RES = [0, 0, 1, 1, 2, 2, 3, 3];
const FIELD_NAME = ['Forest', 'Forest', 'Sunflower Farm', 'Sunflower Farm', 'Quarry', 'Quarry', 'Iron Mine', 'Iron Mine'];
const FIELD_TYPE = ['Forest', 'Sunflower Farm', 'Quarry', 'Iron Mine'];
const FIELD_SPRITE = ['site_forest', 'site_forest', 'site_sunflower_farm', 'site_sunflower_farm', 'site_quarry', 'site_quarry', 'site_iron_mine', 'site_iron_mine'];
const K = { TH: 0, WALLS: 1, WHEEL: 2, STORE: 3, VAULT: 4, BURROW: 5, BARRACKS: 6, ACADEMY: 7, FORGE: 8, CLAN: 9, MARKET: 10 };
const NKINDS = 16, NUNITS = 16;
// art per building slot: sprite family, width in the scene, plot on the ring (custom slots 14 and 15 have no plot)
const ART = { 2: { s: 'wheelhouse', w: 92, p: 8 }, 3: { s: 'storehouse', w: 110, p: 11 }, 4: { s: 'vault', w: 112, p: 7 }, 5: { s: 'burrow', w: 104, p: 9 }, 6: { s: 'barracks', w: 140, p: 10 }, 7: { s: 'academy', w: 118, p: 0 }, 8: { s: 'forge', w: 112, p: 2 }, 9: { s: 'clan_hall', w: 150, p: 6, one: true }, 10: { s: 'market', w: 120, p: 1 }, 11: { p: 3 }, 12: { p: 4 }, 13: { p: 5 } };
const FX_ART = ['storehouse', 'walls', 'forge', 'wheelhouse', 'storehouse', 'burrow', 'barracks', 'academy', 'market', 'vault'];
const FX_NAME = ['none', 'defense %', 'attack %', 'output %', 'storage', 'troop room', 'training speed %', 'build speed %', 'carry %', 'vault'];
const ROLE_NAME = ['normal', 'scout', 'siege'];
const CORE_ROLE = ['Raises every level cap and opens plots', '+defense per level', "Turns the hamster's daily work into extra output", 'More storage for every resource', 'Keeps resources safe from raids', 'Room for more troops', 'Trains units, faster per level', 'Opens the research tiers', '+attack and defense per level', 'Join a clan, then found one', 'Exchange your own resources'];
const UNIT_SPRITE = ['unit_spearman', 'unit_forager', 'unit_shieldbearer', 'unit_berserker', 'unit_charger', 'unit_catapult', 'villager_young'];
const PLOTS = [[810, 370], [1108, 370], [1290, 512], [1290, 686], [1108, 828], [810, 828], [628, 686], [628, 512], [960, 444], [1148, 600], [960, 756], [772, 600]];
const PLATE_AT = { 8: [-92, -34] };
const TH_POS = [960, 630];
const SITES = [[524, 180, 255, false], [192, 480, 238, true], [1404, 168, 217, false], [1728, 480, 217, true], [200, 874, 214, false], [572, 1176, 204, true], [1732, 858, 204, true], [1336, 1166, 198, false]];
const WALLS_POS = [640, 356];
const MODE = { 1: 'raid', 2: 'scout', 3: 'support', 4: 'return', 5: 'stationed', 6: 'done' };
const CAMP_NAME = ['Small wild camp', 'Wild camp', 'Large wild camp'];
const NAME_A = ['Iron', 'Amber', 'Grey', 'Silent', 'Swift', 'Golden', 'Dusk', 'Stone', 'Copper', 'Night', 'Ember', 'Frost', 'Oak', 'Ash', 'Rust', 'Bright', 'Hollow', 'Moss'];
const NAME_B = ['paw', 'crest', 'burrow', 'tail', 'seed', 'runner', 'claw', 'fang', 'wheel', 'mill', 'ridge', 'grove', 'barrow', 'spark', 'hold', 'thorn'];
const ZERO = '0x0000000000000000000000000000000000000000';

// ------------------------------------------------------------------ utils
const $ = (s, r = document) => r.querySelector(s);
const N = x => (x === null || x === undefined ? 0 : Number(x));
const amt = x => N(x) / UNIT;
const fmt = n => Math.floor(n + 1e-9).toLocaleString('en-US');
const pct = x => `${Math.round(x * 100)}%`;
const cap1 = s => s[0].toUpperCase() + s.slice(1);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const spr = n => `assets/sprites/${n}.webp`;
const icon = r => `<img class="i" src="assets/ic_${r}.png" alt="${r === 'seed' ? 'SEED' : RES_NAME[r]}">`;
const shortAddr = a => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';
const who = (name, addr) => `${esc(name || 'Unknown')} <span class="addr">${shortAddr(addr)}</span>`;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const tileXY = t => [t % 100, Math.floor(t / 100)];
const randomName = () => NAME_A[Math.floor(Math.random() * NAME_A.length)] + cap1(NAME_B[Math.floor(Math.random() * NAME_B.length)]) + (Math.random() < 0.6 ? Math.floor(Math.random() * 150) + 2 : '');
function dur(sec) {
  if (sec <= 0) return '0s';
  const s = Math.round(sec), d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  if (d) return `${d}d ${hh}h`;
  if (hh) return `${hh}h ${String(mm).padStart(2, '0')}m`;
  if (mm) return `${mm}m ${String(ss).padStart(2, '0')}s`;
  return `${ss}s`;
}
function setHTML(el, h) { if (el && el._h !== h) { el.innerHTML = h; el._h = h; } }
function note(msg, kind = '') {
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}
// ethers Result → plain JS (numbers, arrays, objects with field names)
function plain(r) {
  if (typeof r === 'bigint') return Number(r);
  if (Array.isArray(r)) {
    try { const o = r.toObject(); const ks = Object.keys(o); if (ks.length && !ks.every(k => /^\d+$/.test(k))) { const out = {}; for (const k of ks) out[k] = plain(o[k]); return out; } } catch (e) { }
    return [...r].map(plain);
  }
  return r;
}
const grow = (base, g, L) => { let x = base; for (let i = 1; i < L; i++) x = x * g / 100; return x; };
const campTile = id => (7919 * (id * 49 + 48) + 1237) % 10000;           // Army.campTile: every 49th slot from 48
const CAMP_AT = new Map(Array.from({ length: 200 }, (_, id) => [campTile(id), id]));

// ------------------------------------------------------------------ the rule table (GameConfig), cached by version
let CFG = null;
const CFG_KEY = 'sw-cfg-v2-' + (SW.ADDR.config || '');
try { const c = JSON.parse(localStorage.getItem(CFG_KEY)); if (c && c.version) CFG = c; } catch (e) { }
async function loadConfig() {
  const [ver] = await SW.multi([['config', 'version']]);
  if (CFG && N(ver) === CFG.version) return false;
  const r = await SW.multi([['config', 'version'], ['config', 'owner'], ['config', 'economy'], ['config', 'storageRules'], ['config', 'war'], ['config', 'hero'], ['config', 'wild'], ['config', 'social'], ['config', 'fieldCosts'], ['config', 'allUnits'], ['config', 'allBuildings'], ['config', 'allTiers']]);
  const [v, owner, econ, store, war, hero, wild, social, fieldCost, units, buildings, tiers] = r;
  CFG = { version: N(v), owner: String(owner).toLowerCase(), econ: plain(econ), store: plain(store), war: plain(war), hero: plain(hero), wild: plain(wild), social: plain(social), fieldCost: plain(fieldCost) };
  const [ul, un] = [plain(units[0]), [...units[1]]], [bl, bn] = [plain(buildings[0]), [...buildings[1]]];
  CFG.units = ul.map((u, i) => ({ ...u, name: un[i] || `Unit ${i + 1}`, i }));
  CFG.buildings = bl.map((b, i) => ({ ...b, name: bn[i] || `Building ${i + 1}`, i }));
  CFG.tiers = plain(tiers[0]); CFG.tierCount = N(tiers[1]);
  try { localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); } catch (e) { }
  return true;
}
const UN = i => CFG.units[i];
const BK = i => CFG.buildings[i];
const unitSprite = i => { if (i < UNIT_SPRITE.length) return UNIT_SPRITE[i]; const u = UN(i); return u.role === 1 ? 'villager_young' : u.role === 2 ? 'unit_catapult' : u.speed >= 10 ? 'unit_charger' : u.carry >= 100 ? 'unit_forager' : u.defense > u.attack ? 'unit_shieldbearer' : 'unit_berserker'; };
const unitsOn = () => CFG.units.filter(u => u.enabled);
const kindArt = i => ART[i] && ART[i].s ? ART[i] : { s: FX_ART[BK(i).effect] || 'storehouse', w: 112, p: ART[i] ? ART[i].p : undefined };
const plotKinds = () => CFG.buildings.filter(b => b.i >= 2 && b.enabled).map(b => b.i);
const unitValue = i => UN(i).cost.reduce((a, x) => a + x, 0);

// ------------------------------------------------------------------ state
const UI_KEY = 'sw-ui-v2';
const S = (() => { let u = {}; try { u = JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { } return { me: null, view: 'home', sel: { kind: 'th' }, wsel: null, cam: { x: 50, y: 50 }, ui: Object.assign({ min: {}, rk: 'gen' }, u) }; })();
const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(S.ui)); } catch (e) { } };
let skew = 0;
const now = () => Date.now() / 1000 + skew;
const G = { ok: false, day: 0, obsCount: 0, last: null, lastWork: 0, lastCum: 0, coreCum: 0, week: 0, season: 0 };
let ME = null;
const W = { players: new Map(), tiles: new Map(), clans: new Map(), invites: new Map(), moves: new Map(), battles: new Map(), scouts: [], changes: [], chat: [], news: [], hiddenMsg: new Map(), muted: new Map(), ctx: new Map(), clanOf: new Map(), rank: null, target: new Map() };
let busyTx = false, needFull = true, sceneDirty = true;
const dirty = () => { needFull = true; };
const isOwner = () => !!(S.me && CFG && CFG.owner === S.me);

// ------------------------------------------------------------------ loading from the chain
const g = () => SW.ADDR.villages;
async function loadGlobal() {
  const h = await SW.head(); skew = h.time - Date.now() / 1000; G.headBlock = h.number; G.headTime = h.time;
  if (await loadConfig()) { sceneDirty = true; dirty(); }
  const [day, cnt, lw, lcum, core, wk, ss] = await SW.multi([['ledger', 'currentDay'], ['ledger', 'observationCount'], ['ledger', 'lastWork'], ['ledger', 'lastCumulativeWork'], ['core', 'state'], ['clans', 'week'], ['villages', 'seasonStartedAt']]);
  G.day = N(day); G.obsCount = N(cnt); G.lastWork = N(lw); G.lastCum = N(lcum); G.coreCum = core ? N(core.cumulativeWork) : G.lastCum; G.week = N(wk); G.season = N(ss);
  G.last = G.obsCount ? obsOf(await SW.call('ledger', 'observation', [G.obsCount - 1])) : null;
  G.ok = true;
}
const obsOf = o => o && { time: N(o.timestamp), day: N(o.day), work: N(o.work), seedIndex: BigInt(o.seedIndex), xpIndex: N(o.xpIndex) };
async function loadMe() {
  const a = S.me; if (!a) { ME = null; return; }
  const r = await SW.multi([
    ['villages', 'village', [a]], ['villages', 'stock', [a]], ['villages', 'storageCapacity', [a]], ['villages', 'vaultProtection', [a]], ['villages', 'roomCapacity', [a]],
    ['villages', 'buildOrder', [a, 0]], ['villages', 'buildOrder', [a, 1]], ['villages', 'study', [a]], ['villages', 'seedBalance', [a]], ['villages', 'effectiveWalls', [a]],
    ['army', 'home', [g(), a]], ['army', 'training', [g(), a]], ['army', 'champion', [g(), a]], ['army', 'championStats', [g(), a]], ['army', 'championLevel', [g(), a]], ['army', 'allocatedRoom', [g(), a]],
    ['clans', 'clanOf', [g(), a]], ['ledger', 'account', [g(), a]], ['ledger', 'nftBalance', [a]], ['clans', 'counters', [g(), a, false, 0]], ['clans', 'overall', [g(), a, false, 0]], ['villages', 'modsOf', [a]],
  ]);
  const t0 = now();
  const [vr, st, cap, prot, room, o0, o1, sd, seed, ew, home, tr, ch, cs, cl, used, clanId, acct, nft, ctr, ov, mods] = r;
  if (!vr || !vr.name) { ME = { none: true, nft: N(nft) }; return; }
  const v = {
    name: vr.name, tile: N(vr.tile), foundedAt: N(vr.foundedAt), shieldUntil: N(vr.shieldUntil), peaceUsedAt: N(vr.peaceUsedAt), boostUntil: N(vr.boostUntil),
    repairAt: N(vr.repairAt), boostRes: N(vr.boostResource), tier: N(vr.tier), damaged: N(vr.damagedWalls), banner: !!vr.banner,
    fields: [...vr.fields].map(N), b: [...vr.buildings].map(N),
  };
  const ord = o => o && N(o.readyAt) ? { target: N(o.target), level: N(o.level), readyAt: N(o.readyAt), cost: [...o.cost].map(amt), seed: amt(o.seed) } : null;
  const md = plain(mods) || {};
  const m = {
    v, t0, stock: [...st].map(amt), cap: amt(cap), protect: amt(prot), room: N(room), used: N(used), orders: [ord(o0), ord(o1)],
    study: sd && N(sd.readyAt) ? { tier: N(sd.tier), readyAt: N(sd.readyAt) } : null, seed: amt(seed), walls: N(ew),
    home: [...home].map(N), training: tr && N(tr.count) ? { kind: N(tr.kind), count: N(tr.count), readyAt: N(tr.readyAt) } : null,
    champ: { xp: N(ch.xp), might: N(ch.might), attack: N(ch.attack), defense: N(ch.defense), carry: N(ch.carry), away: !!ch.away },
    cstats: { might: N(cs.might), atk: amt(cs.attackBonus), def: amt(cs.defenseBonus), carry: amt(cs.carryBonus) }, clevel: N(cl),
    clanId: N(clanId), acct: { cursor: N(acct.cursor) }, nft: N(nft), mods: { atk: md.attackPct || 0, def: md.defensePct || 0, out: md.outputPct || 0, train: md.trainPct || 0, build: md.buildPct || 0, carry: md.carryPct || 0 },
    counters: ctr && { build: N(ctr.build) / 100 / UNIT, research: N(ctr.research) / 100 / UNIT, attack: N(ctr.attack), defense: N(ctr.defense), loot: amt(ctr.loot) }, overall: N(ov),
  };
  const calls = [], tags = [];
  m.v.fields.forEach((L, i) => { if (L < CFG.econ.fieldMaxLevel) { calls.push(['config', 'fieldQuote', [i, L + 1]]); tags.push(['f', i]); } });
  for (let i = 0; i < NKINDS; i++) { const L = m.v.b[i], b = BK(i); if (b.enabled && L < b.maxLevel) { calls.push(['config', 'buildingQuote', [i, L + 1]]); tags.push(['b', i]); } }
  if (G.obsCount && m.acct.cursor < G.obsCount - 1) { calls.push(['ledger', 'observation', [m.acct.cursor]]); tags.push(['cur']); }
  if (m.clanId) { calls.push(['clans', 'clan', [g(), m.clanId]]); tags.push(['clan']); }
  const mine = [...W.moves.values()].filter(x => x.owner === a || x.target === a);
  mine.forEach(x => { calls.push(['army', 'movement', [g(), x.id]]); tags.push(['mv', x.id]); });
  const r2 = calls.length ? await SW.multi(calls) : [];
  m.next = {}; m.moves = [];
  r2.forEach((x, j) => {
    const [t, i] = tags[j]; if (!x) return;
    if (t === 'f') m.next[i] = { cost: [...x.cost].map(amt), seed: 0, base: N(x.seconds_) };
    if (t === 'b') m.next[8 + i] = { cost: [...x.cost].map(amt), seed: amt(x.seed), base: N(x.seconds_) };
    if (t === 'cur') { const c = obsOf(x); m.claim = G.last ? { seed: Number(G.last.seedIndex - c.seedIndex) / UNIT, xp: G.last.xpIndex - c.xpIndex } : null; }
    if (t === 'clan') m.clan = { id: m.clanId, name: x.name, founder: x.founder.toLowerCase(), capacity: N(x.capacity), members: [...x.members].map(s => s.toLowerCase()) };
    if (t === 'mv') { const mv = { id: i, owner: x.owner.toLowerCase(), target: x.target.toLowerCase(), campId: N(x.campId), mode: N(x.mode), champion: !!x.champion, arriveAt: N(x.arriveAt), travel: N(x.travelTime), units: [...x.units].map(N), loot: [...x.loot].map(amt) }; if (mv.mode !== 6) m.moves.push(mv); }
  });
  ME = m;
}
function processLogs(logs) {
  const gl = g();
  W.players.clear(); W.tiles.clear(); W.clans.clear(); W.invites.clear(); W.moves.clear(); W.battles.clear(); W.scouts = []; W.changes = []; W.chat = []; W.news = []; W.hiddenMsg.clear(); W.muted.clear();
  for (const l of logs) {
    const a = l.a, game = a.game ? String(a.game).toLowerCase() : null;
    if (game && game !== gl) continue;
    if (l.n === 'Founded') { const p = String(a.player).toLowerCase(); W.players.set(p, { addr: p, name: a.name, tile: N(a.tile) }); W.tiles.set(N(a.tile), p); }
    else if (l.n === 'ClanFounded') W.clans.set(N(a.clanId), { id: N(a.clanId), name: a.name, founder: String(a.founder).toLowerCase() });
    else if (l.n === 'Invited') W.invites.set(N(a.clanId) + ':' + String(a.player).toLowerCase(), { clanId: N(a.clanId), player: String(a.player).toLowerCase(), open: !!a.open });
    else if (l.n === 'Joined') W.invites.delete(N(a.clanId) + ':' + String(a.player).toLowerCase());
    else if (l.n === 'MovementSent') W.moves.set(N(a.id), { id: N(a.id), owner: String(a.owner).toLowerCase(), target: String(a.target).toLowerCase(), campId: N(a.campId), mode: N(a.mode), arriveAt: N(a.arriveAt), block: l.b, events: [] });
    else if (l.n === 'MovementResolved') { const m = W.moves.get(N(a.id)); if (m) m.events.push({ mode: N(a.mode), next: N(a.nextArrival), block: l.b }); }
    else if (l.n === 'Battle') W.battles.set(N(a.id), { id: N(a.id), attack: N(a.attack), defense: N(a.defense), aLost: N(a.attackerLost), dLost: N(a.defenderLost), decisive: !!a.decisive, block: l.b });
    else if (l.n === 'Scouted') W.scouts.push({ player: String(a.player).toLowerCase(), target: String(a.target).toLowerCase(), success: !!a.success, until: N(a.until), block: l.b });
    else if (l.c === 'chat') {
      if (l.n === 'Said') W.chat.push({ id: N(a.id), from: String(a.from).toLowerCase(), text: a.text, b: l.b, tx: l.tx });
      else if (l.n === 'Announced') W.news.push({ kind: 'ann', id: N(a.id), title: a.title, text: a.text, b: l.b, i: l.i, tx: l.tx });
      else if (l.n === 'Hidden') W.hiddenMsg.set(N(a.id), !!a.hidden);
      else if (l.n === 'Muted') W.muted.set(String(a.who).toLowerCase(), !!a.muted);
    }
    else if (l.n === 'Changed') W.changes.push({ what: a.what, index: N(a.index), version: N(a.version), block: l.b, tx: l.tx });
  }
}
async function loadWorld() {
  const ps = [...W.players.keys()]; if (!ps.length) return;
  const r = await SW.multi(ps.flatMap(p => [['villages', 'armyContext', [p]], ['clans', 'clanOf', [g(), p]]]));
  ps.forEach((p, i) => {
    const c = r[2 * i]; if (c) W.ctx.set(p, { tile: N(c.tile), th: N(c.townHall), walls: N(c.walls), forge: N(c.forge), tier: N(c.research), shieldUntil: N(c.shieldUntil), defPct: N(c.defensePct) });
    W.clanOf.set(p, N(r[2 * i + 1]));
  });
}
async function loadRanking() {
  const ps = [...W.players.keys()]; if (!ps.length) { W.rank = []; return; }
  const r = await SW.multi(ps.flatMap(p => [['clans', 'counters', [g(), p, false, 0]], ['clans', 'overall', [g(), p, false, 0]], ['clans', 'counters', [g(), p, true, G.week]], ['clans', 'overall', [g(), p, true, G.week]]]));
  const cnt = x => x ? { build: N(x.build) / 100 / UNIT, research: N(x.research) / 100 / UNIT, attack: N(x.attack), defense: N(x.defense), loot: amt(x.loot) } : { build: 0, research: 0, attack: 0, defense: 0, loot: 0 };
  W.rank = ps.map((p, i) => ({ addr: p, season: { ...cnt(r[4 * i]), overall: N(r[4 * i + 1]) }, week: { ...cnt(r[4 * i + 2]), overall: N(r[4 * i + 3]) } }));
  const ids = [...W.clans.keys()];
  if (ids.length) { const c = await SW.multi(ids.map(id => ['clans', 'clan', [g(), id]])); ids.forEach((id, i) => { if (c[i]) Object.assign(W.clans.get(id), { capacity: N(c[i].capacity), members: [...c[i].members].map(s => s.toLowerCase()) }); }); }
}
async function loadTarget(tile) {
  const addr = W.tiles.get(tile);
  if (addr) {
    const r = await SW.multi([['villages', 'armyContext', [addr]], ['army', 'home', [g(), addr]], ['villages', 'stock', [addr]], ['villages', 'vaultProtection', [addr]], ['army', 'championStats', [g(), addr]], ['army', 'champion', [g(), addr]], ['clans', 'clanOf', [g(), addr]], ['villages', 'effectiveWalls', [addr]],
      ...(S.me ? [['army', 'scoutedUntil', [g(), S.me, addr]]] : [])]);
    const [c, home, st, prot, cs, ch, cl, ew, sc] = r;
    W.target.set(tile, { at: Date.now(), addr, th: N(c && c.townHall), forge: N(c && c.forge), walls: N(ew), defPct: N(c && c.defensePct), shieldUntil: N(c && c.shieldUntil), home: home ? [...home].map(N) : Array(NUNITS).fill(0), stock: st ? [...st].map(amt) : [0, 0, 0, 0], protect: amt(prot), might: N(cs && cs.might), def: amt(cs && cs.defenseBonus), away: !!(ch && ch.away), clanId: N(cl), scouted: N(sc) });
  } else if (CAMP_AT.has(tile)) {
    const id = CAMP_AT.get(tile);
    const [cp, c] = await SW.multi([['army', 'campParameters', [id]], ['army', 'camp', [g(), id]]]);
    const full = N(cp && cp[0]), regrow = N(c && c.regrowAt);
    const cur = c && c.initialized && !(regrow && now() >= regrow) ? N(c.defense) : full;
    W.target.set(tile, { at: Date.now(), camp: id, defense: cur, full, hourly: amt(cp && cp[1]), stock: c && c.initialized ? [...c.stock].map(amt) : null, regrowAt: regrow });
  }
  dirty();
}
let loading = false;
async function refresh(full) {
  if (!SW.D) { $('#liveNote').innerHTML = 'Season 2 is not deployed yet.'; return; }
  if (loading) return; loading = true;
  try {
    const logs = await SW.syncLogs(); processLogs(logs);
    await loadGlobal();
    await loadMe();
    if (full || S.view === 'world' || S.view === 'ranking' || !W.ctx.size) await loadWorld();
    if (S.view === 'ranking' || full) await loadRanking();
    if (ME && !ME.none && !S.cam.set) { const [x, y] = tileXY(ME.v.tile); S.cam = { x: x + 0.5, y: y + 0.5, set: true }; }
    $('#liveNote').innerHTML = liveNote(); homeChanges();
  } catch (e) { console.warn(e); note('Could not reach the chain: ' + SW.explain(e), 'bad'); }
  finally { loading = false; sceneDirty = true; dirty(); }
  maybeName(); renderChat(); notifyCheck();
}

// ------------------------------------------------------------------ derived numbers (the same formulas as the contracts)
const lv = k => ME && ME.v ? ME.v.b[k] : 0;
const th = () => lv(K.TH);
const fieldRate = L => L ? grow(CFG.econ.fieldRate, CFG.econ.fieldRateGrowth, L) : 0;
const wheelBonus = () => Math.min(G.lastWork / CFG.econ.wheelWorkDiv, CFG.econ.wheelPctPerLevel / 100 * lv(K.WHEEL));
function rates() {
  const out = [0, 0, 0, 0]; if (!ME || !ME.v) return out;
  ME.v.fields.forEach((L, i) => { out[FIELD_RES[i]] += fieldRate(L); });
  const wb = wheelBonus(), t = now(), o = (100 + ME.mods.out) / 100, bp = CFG.econ.boostPct / 100;
  return out.map((x, r) => x * (1 + wb) * (o + (r === ME.v.boostRes && t < ME.v.boostUntil ? bp : 0)));
}
const foodUse = () => ME && ME.v ? CFG.econ.upkeepMilli / 1000 * ME.used : 0;
function stockNow() {
  if (!ME || !ME.v) return [0, 0, 0, 0];
  const h = Math.max(0, now() - ME.t0) / 3600, rt = rates();
  return ME.stock.map((s, r) => clamp(s + (rt[r] - (r === 1 ? foodUse() : 0)) * h, 0, Math.max(s, ME.cap)));
}
const plotsUsed = () => ME.v.b.filter(L => L > 0).length + ME.orders.filter(o => o && o.target >= 8 && o.level === 1).length;
const plotsOpen = () => Math.min(CFG.econ.plotsMax, CFG.econ.plotsBase + th());
const tierOpen = () => { const a = lv(K.ACADEMY); let n = 0; while (n < CFG.tierCount && CFG.tiers[n].academy <= a) n++; return n; };
const targetName = t => t < 8 ? `${FIELD_NAME[t]} ${t % 2 + 1}` : BK(t - 8).name;
const orderOn = t => ME.orders.findIndex(o => o && o.target === t);
const levelOfTarget = t => t < 8 ? ME.v.fields[t] : ME.v.b[t - 8];
const maxOfTarget = t => t < 8 ? CFG.econ.fieldMaxLevel : BK(t - 8).maxLevel;
function capOfTarget(t) {
  if (t < 8) return Math.min(CFG.econ.fieldMaxLevel, th());
  const b = BK(t - 8); return b.thCap ? Math.min(b.maxLevel, b.thCap * th()) : b.maxLevel;
}
function tierBonus(t) { let carry = 0, speed = 0, med = 0; for (let i = 0; i < t && i < CFG.tiers.length; i++) { const x = CFG.tiers[i]; carry += x.carryPct; speed += x.speedPct; med = Math.max(med, x.medicinePct); } return { carry, speed, med: Math.min(100, med) }; }
const canPay = (cost, seed) => { const s = stockNow(); return cost.every((x, i) => s[i] + 1e-6 >= x) && ME.seed + 1e-6 >= (seed || 0); };
function shortMsg(cost, seed) {
  const s = stockNow(), rt = rates(); const parts = []; let wait = 0;
  cost.forEach((x, i) => { if (s[i] + 1e-6 < x) { parts.push(`${fmt(x - s[i])} ${RES_NAME[RES[i]]}`); const net = rt[i] - (i === 1 ? foodUse() : 0); wait = Math.max(wait, net > 0 ? (x - s[i]) / net * 3600 : Infinity); } });
  if (seed && ME.seed + 1e-6 < seed) parts.push(`${fmt(seed - ME.seed)} SEED`);
  if (!parts.length) return '';
  if (cost.some(x => x > ME.cap)) return `Needs ${parts.join(', ')} more, and more than your storage holds: build a Storehouse.`;
  return `Needs ${parts.join(', ')} more${!seed || ME.seed >= seed ? (isFinite(wait) ? ` · ready in about ${dur(wait)}` : '') : ''}.`;
}
function buildSecs(base, thl, nft, work, cutPct) {           // GameConfig.buildDuration, exact integer math
  const e = CFG.econ, Un = 1000000n, n = BigInt(Math.min(nft, 32)), target = BigInt(Math.max(1, e.squeekWorkTarget));
  const wf = BigInt(Math.min(work, e.squeekWorkTarget)) * Un / target;
  const red = BigInt(e.squeekBuildPct) * 10000n * (Un - Un / (1n << n)) / Un * wf / Un;
  const thc = BigInt(Math.min(90, e.thBuildCutPct * (thl - 1))), cut = BigInt(Math.min(90, cutPct || 0));
  const num = BigInt(base) * (100n - thc) * (Un - red) * (100n - cut), den = 10000n * Un;
  return Number(num === 0n ? 0n : (num - 1n) / den + 1n);
}
const squeekCut = (n, work) => n > 0 ? CFG.econ.squeekBuildPct / 100 * (1 - 0.5 ** Math.min(n, 32)) * Math.min(1, work / CFG.econ.squeekWorkTarget) : 0;
function upgradeCheck(t) {
  const L = levelOfTarget(t), to = L + 1, q = ME.next[t];
  if (t >= 8 && !BK(t - 8).enabled) return { to, why: 'Not in this season.', max: true };
  if (L >= maxOfTarget(t) || !q) return { to, why: 'Maximum level reached.', max: true };
  const c = { cost: q.cost, seed: q.seed, secs: buildSecs(q.base, Math.max(1, th()), ME.nft, G.lastWork, ME.mods.build) };
  if (orderOn(t) >= 0) return { to, c, why: 'Already being built.' };
  if (to > capOfTarget(t)) return { to, c, why: t < 8 ? 'Upgrade the Town Hall first: fields cannot pass its level.' : `Upgrade the Town Hall first: ${BK(t - 8).name} cannot pass ${capOfTarget(t)} at Town Hall ${th()}.` };
  if (t >= 8) {
    const b = BK(t - 8);
    if (b.tier && ME.v.tier < b.tier) return { to, c, why: `Needs research tier ${b.tier} in the Academy.` };
    if (L === 0 && plotsUsed() >= plotsOpen()) return { to, c, why: 'No free plot: upgrade the Town Hall to open one.' };
  }
  if (ME.orders.every(Boolean)) return { to, c, why: 'Both build slots are busy.' };
  if (!canPay(c.cost, c.seed)) return { to, c, why: shortMsg(c.cost, c.seed) };
  return { to, c, why: '' };
}
const strength = (units, def) => units.reduce((s, n, k) => s + n * (CFG.units[k] ? (def ? CFG.units[k].defense : CFG.units[k].attack) : 0), 0);
function defenseOf(home, forge, might, defBonus, walls, thl, defPct) {
  const w = CFG.war, d = strength(home, true) * (100 + w.forgePct * forge) / 100 + might;
  return d * (1 + defBonus) * (100 + w.wallsPct * walls + (defPct || 0)) / 100 + w.thGuard * thl;
}
const myDefense = () => ME && ME.v ? defenseOf(ME.home, lv(K.FORGE), ME.champ.away ? 0 : ME.cstats.might, ME.champ.away ? 0 : ME.cstats.def, ME.walls, th(), ME.mods.def) : 0;
function attackOf(units, champ, scouted) {
  const w = CFG.war, a = strength(units, false) * (100 + w.forgePct * lv(K.FORGE) + ME.mods.atk) / 100 * (1 + (champ ? ME.cstats.atk : 0)) + (champ ? ME.cstats.might : 0);
  return a * (scouted ? (100 + w.scoutBonusPct) / 100 : 1);
}
const carryOf = (units, champ) => units.reduce((s, n, k) => s + n * (CFG.units[k] ? CFG.units[k].carry : 0), 0) * (1 + (tierBonus(ME.v.tier).carry + ME.mods.carry) / 100 + (champ ? ME.cstats.carry : 0));
function travelSecs(from, to, speed, tier) {
  const [ax, ay] = tileXY(from), [bx, by] = tileXY(to);
  const d = Math.max(1, Math.ceil(Math.hypot(ax - bx, ay - by) * UNIT) / UNIT);
  let s = Math.ceil(d * 3600 / speed); const f = tierBonus(tier).speed; if (f) s = Math.ceil(s * 100 / (100 + f)); return s;
}
const awayUnits = () => { const a = Array(NUNITS).fill(0); if (ME && ME.moves) for (const m of ME.moves) if (m.owner === S.me) m.units.forEach((n, k) => a[k] += n); return a; };
const nameOf = addr => (W.players.get(addr) || {}).name || shortAddr(addr);
const clanName = id => (W.clans.get(id) || {}).name || (id ? `Clan #${id}` : '');
const clanColor = id => ['#c0392b', '#2f6fd6', '#2e9e5b', '#8e44ad', '#d68910', '#16a085'][id % 6];
const needCheckpoint = () => G.ok && (!G.last || G.last.day < G.day);
const nextDayIn = () => { const t = now(); return (Math.floor((t - 4 * 3600) / 86400) + 1) * 86400 + 4 * 3600 - t; };
const marketRate = L => CFG.econ.marketBase + CFG.econ.marketPerLevel * (L - 1);
const capSum = (base, per, gr, L, mult) => { let t = base; for (let l = 1; l <= L; l++) t += mult ? Math.floor(grow(per * l, gr, l)) : grow(per, gr, l); return t; };

// ------------------------------------------------------------------ transactions
function showTx(label, st, hash, err) {
  const box = $('#txbox'); box.hidden = false;
  const link = hash && !SW.D.local ? ` <a href="https://sepolia.etherscan.io/tx/${hash}" target="_blank" rel="noopener">view</a>` : '';
  const line = { check: 'Checking with the contract…', wallet: 'Confirm it in your wallet…', pending: `Sent. Waiting for a block…${link}`, confirmed: `Done.${link}`, error: esc(err || 'Failed.') }[st];
  box.innerHTML = `<div class="row"><b class="gold" style="font-weight:400">${esc(label)}</b><button class="btn ghost sm" data-act="txclose">✕</button></div><div class="st">${st === 'confirmed' ? '<span class="ok">✓</span>' : st === 'error' ? '<span class="bad">✕</span>' : '<span class="spin"></span>'}<span class="${st === 'error' ? 'bad' : ''}">${line}</span></div>`;
  clearTimeout(showTx.t); if (st === 'confirmed') showTx.t = setTimeout(() => { box.hidden = true; }, 5000);
}
async function act(label, c, fn, args) {
  if (!S.me) { openWallet(); return false; }
  if (busyTx) { note('Wait for the last transaction to finish.', 'bad'); return false; }
  busyTx = true; let ok = false;
  try { await SW.send(c, fn, args, (st, hash) => showTx(label, st, hash)); ok = true; await refresh(); }
  catch (e) { showTx(label, 'error', null, e.message || String(e)); }
  finally { busyTx = false; dirty(); }
  return ok;
}

// ------------------------------------------------------------------ top bar
function renderBar() {
  const hasV = ME && ME.v && CFG;
  if (hasV) {
    const s = stockNow(), rt = rates(), cap = ME.cap;
    const items = RES.map((r, i) => {
      const net = rt[i] - (i === 1 ? foodUse() : 0), full = s[i] >= cap - 1, toFull = net > 0 && !full ? (cap - s[i]) / net * 3600 : Infinity, soon = toFull < 7200;
      return `<div class="r ${full ? 'full' : soon ? 'soon' : ''}" title="${RES_NAME[r]}${full ? ' is full' : ''}">${icon(r)} <b>${fmt(s[i])}</b><s> / ${fmt(cap)}</s><div class="bar"><i style="width:${Math.min(100, s[i] / cap * 100).toFixed(0)}%"></i></div><em class="${net < 0 ? 'neg' : ''}">${full ? 'FULL' : `${net >= 0 ? '+' : ''}${fmt(net)}/h`}</em></div>`;
    }).join('');
    setHTML($('#resbar'), items + `<div class="r seedr">${icon('seed')} <b>${fmt(ME.seed)}</b><s> SEED</s></div>`);
  } else setHTML($('#resbar'), `<div class="muted">${!SW.D ? 'Season 2 is not deployed yet.' : S.me ? (ME && ME.none ? 'No village yet: found one to play.' : 'Loading your village…') : 'Not connected: you are looking around.'}</div>`);
  let h = '';
  if (G.ok && CFG) {
    const today = Math.max(0, G.coreCum - G.lastCum), lw = G.lastWork, e = CFG.econ;
    h += `<span class="dot run"></span> Squeektoshi · ${G.obsCount ? `today so far <b class="gold">${fmt(today)}</b> work` : `work counter <b class="gold">${fmt(G.coreCum)}</b>: the first checkpoint sets the baseline`} · last checkpoint ${G.last ? (G.obsCount > 1 ? `<b>${fmt(lw)}</b> work → <b>${fmt(lw / e.seedWorkDiv)}</b> SEED per village` : 'set the baseline') : 'none yet'} · wheel bonus <b class="gold">+${pct(hasV ? wheelBonus() : lw / e.wheelWorkDiv)}</b>${hasV && !lv(K.WHEEL) ? ' (needs a Wheelhouse)' : ''}`;
    if (ME && ME.nft !== undefined && S.me) h += ` · Squeeks <b>${ME.nft}</b>${ME.nft ? ` (build −${pct(squeekCut(ME.nft, lw))})` : ''}`;
    h += ` · day ${G.day - Math.floor((G.season - 4 * 3600) / 86400)} · next checkpoint in ${dur(nextDayIn())}`;
    const btns = [];
    if (needCheckpoint()) btns.push(`<button class="btn sm go" data-act="checkpoint">Checkpoint today</button>`);
    if (hasV && ME.claim && ME.claim.seed > 0) btns.push(`<button class="btn sm go" data-act="claim">Claim ${fmt(ME.claim.seed)} SEED</button>`);
    if (btns.length) h += `<span class="daily">${btns.join('')}</span>`;
  } else h = SW.D ? 'Reading the chain…' : 'Season 2 opens soon.';
  setHTML($('#wheelchip'), h);
  setHTML($('#walletbtn'), S.me ? `<span class="addr">${shortAddr(S.me)}</span>` : 'Connect');
  setHTML($('#logoSub'), hasV ? `${esc(ME.v.name)} · ${shortAddr(S.me)}` : 'Testnet');
  const inc = hasV ? ME.moves.filter(m => m.target === S.me && m.mode === 1).sort((a, b) => a.arriveAt - b.arriveAt)[0] : null;
  const al = $('#alert');
  if (inc) { al.hidden = false; setHTML(al, `<span>⚔ <b>${esc(nameOf(inc.owner))}</b> attacks in <b>${dur(inc.arriveAt - now())}</b> · your defense at home is about <b>${fmt(myDefense())}</b></span><span class="pbtn"><a class="btn sm" href="#army">Prepare</a></span>`); }
  else al.hidden = true;
  const bh = $('#bar').getBoundingClientRect().height; document.documentElement.style.setProperty('--barh', bh + 'px');
}

// ------------------------------------------------------------------ village scene (prototype art)
let vscale = 0.5;
const pan = { x: 0, y: 0, init: false };
function zoomLimits() { const st = $('#vstage'); const w = st.clientWidth, h = st.clientHeight; return { fit: Math.min(w / 1920, h / 1200), cover: Math.max(w / 1920, h / 1200), max: Math.max(1, Math.max(w / 1920, h / 1200)) }; }
function layout() {
  if (S.view === 'village') {
    const st = $('#vstage'); if (!st.clientWidth) return; const z = zoomLimits();
    if (!pan.init) { const mobile = innerWidth <= 900; vscale = S.ui.vz ? clamp(S.ui.vz, z.fit, z.max) : mobile ? z.fit : z.cover; pan.x = (st.clientWidth - 1920 * vscale) / 2; pan.y = (st.clientHeight - 1200 * vscale) / 2; pan.init = true; }
    else vscale = clamp(vscale, z.fit, z.max);
    clampPan(); applyPan();
  }
  if (S.view === 'world') sizeCanvas();
}
function zoomAt(f, cx, cy) { const z = zoomLimits(), s1 = vscale, s2 = clamp(s1 * f, z.fit, z.max); if (Math.abs(s2 - s1) < 1e-4) return; pan.x = cx - (cx - pan.x) * s2 / s1; pan.y = cy - (cy - pan.y) * s2 / s1; vscale = s2; S.ui.vz = s2; saveUI(); clampPan(); applyPan(); }
function clampPan() { const st = $('#vstage'); const W_ = 1920 * vscale, H = 1200 * vscale, sw = st.clientWidth, sh = st.clientHeight; pan.x = W_ <= sw ? (sw - W_) / 2 : Math.min(0, Math.max(sw - W_, pan.x)); pan.y = H <= sh ? (sh - H) / 2 : Math.min(0, Math.max(sh - H, pan.y)); }
function applyPan() { $('#scene').style.transform = `translate(${pan.x}px,${pan.y}px) scale(${vscale})`; }
function stageDrag(stage, onMove, onTap, onPinch) {
  const pts = new Map(); let moved = false, last = null, pinchD = 0;
  stage.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { stage.setPointerCapture(e.pointerId); } catch (er) { } if (pts.size === 1) { moved = false; last = { x: e.clientX, y: e.clientY }; } else if (pts.size === 2) { moved = true; const [a, b] = [...pts.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); } });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) { if (!onPinch) return; const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = stage.getBoundingClientRect(); if (pinchD) onPinch(d / pinchD, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); pinchD = d; return; }
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; stage.classList.add('drag'); }
    if (moved) { onMove(dx, dy); last = { x: e.clientX, y: e.clientY }; }
  });
  const up = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (!pts.size) { if (!moved) onTap(e); stage.classList.remove('drag'); } else { const p = [...pts.values()][0]; last = { x: p.x, y: p.y }; pinchD = 0; } };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', e => { pts.delete(e.pointerId); if (!pts.size) stage.classList.remove('drag'); });
}
const LAMPS = [[880, 509], [1044, 509], [864, 607], [1060, 607]];
const arc = (a0, a1) => Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (a0 + i * (a1 - a0) / 12); return [960 + 273 * Math.cos(a), 601 + 205 * Math.sin(a)]; });
const PATHS = [[[560, 285], [627, 333], [870, 548]], [[1345, 310], [1287, 340], [1050, 548]], [[545, 915], [627, 840], [867, 640]], [[1360, 905], [1293, 840], [1053, 640]], arc(1.05, 1.95), arc(0.08, 0.92), [[627, 333], [870, 548], [1053, 640], [1293, 840]]];
const VILLAGERS = ['villager_farmer', 'villager_baker', 'villager_merchant', 'villager_elder', 'villager_plain', 'villager_innkeeper', 'villager_young', 'villager_crowned'];
const WHEEL_GEO = { wheelhouse_1: { w: 161, h: 300, cx: 41.25, cy: 221.25, rx: 33.0, ry: 43.25, rot: -0.401 }, wheelhouse_2: { w: 159, h: 300, cx: 36.0, cy: 223.75, rx: 32.0, ry: 42.0, rot: -0.384 }, wheelhouse_3: { w: 159, h: 300, cx: 35.25, cy: 223.5, rx: 31.5, ry: 41.75, rot: -0.384 }, wheelhouse_4: { w: 161, h: 300, cx: 36.0, cy: 224.0, rx: 31.5, ry: 41.75, rot: -0.384 }, wheelhouse_5: { w: 162, h: 300, cx: 37.0, cy: 223.5, rx: 31.5, ry: 41.0, rot: -0.384 } };
const CHIMNEY = { barracks_3: { w: 229, h: 300, x: 73, y: 14.5 }, barracks_4: { w: 219, h: 300, x: 65.5, y: 9.5 }, town_hall_2: { w: 208, h: 300, x: 156.5, y: 57.5 }, town_hall_3: { w: 205, h: 300, x: 157.5, y: 53.5 }, town_hall_4: { w: 209, h: 300, x: 158, y: 58 }, storehouse_3: { w: 198, h: 300, x: 54.5, y: 19.5 }, storehouse_4: { w: 195, h: 300, x: 53, y: 21.5 }, burrow_1: { w: 246, h: 294, x: 90, y: 24 }, burrow_4: { w: 216, h: 300, x: 157.5, y: 43.5 }, burrow_5: { w: 202, h: 300, x: 151, y: 30 }, academy_1: { w: 218, h: 300, x: 62, y: 85 }, academy_2: { w: 203, h: 300, x: 61, y: 86 }, academy_3: { w: 205, h: 300, x: 62, y: 87 }, academy_4: { w: 202, h: 300, x: 61.5, y: 85 }, academy_5: { w: 193, h: 300, x: 53.5, y: 91.5 }, market_3: { w: 235, h: 300, x: 68, y: 29 }, market_4: { w: 265, h: 300, x: 67, y: 5 } };
function nightness() { const d = new Date(now() * 1000), h = d.getUTCHours() + d.getUTCMinutes() / 60; return h >= 21 || h < 5 ? 1 : h >= 18 ? (h - 18) / 3 : h < 7 ? (7 - h) / 2 : 0; }
function spriteBox(name, x, yb, w) { const gg = WHEEL_GEO[name] || CHIMNEY[name]; if (!gg) return null; const k = w / gg.w; return { k, left: x - w / 2, top: yb - gg.h * k }; }
function smoke(name, x, yb, w, add) { const gg = CHIMNEY[name]; if (!gg) return; const bx = spriteBox(name, x, yb, w); add(`<span class="smoke" style="left:${(bx.left + gg.x * bx.k).toFixed(1)}px;top:${(bx.top + gg.y * bx.k).toFixed(1)}px"><i></i><i></i><i></i></span>`); }
function wheelSpin(name, x, yb, w, add) { const gg = WHEEL_GEO[name]; if (!gg) return; const bx = spriteBox(name, x, yb, w), k = bx.k; add(`<span class="wspin" style="left:${(bx.left + gg.cx * k).toFixed(1)}px;top:${(bx.top + gg.cy * k).toFixed(1)}px;width:${(2 * gg.rx * k).toFixed(1)}px;height:${(2 * gg.ry * k).toFixed(1)}px;transform:translate(-50%,-50%) rotate(${gg.rot}rad)"><i style="width:${(2 * Math.max(gg.rx, gg.ry) * k).toFixed(1)}px;height:${(2 * Math.max(gg.rx, gg.ry) * k).toFixed(1)}px"></i></span>`); }
const stageOf = (i, L) => clamp(Math.ceil(Math.max(1, L) * 5 / Math.max(1, BK(i).maxLevel)), 1, 5);
const spriteOf = (i, L) => { const a = kindArt(i); return a.one ? a.s : `${a.s}_${stageOf(i, L)}`; };
// the player picks the plot of each building; the chain only knows levels, so the layout lives in this browser
const PLOT_OPEN_ORDER = [8, 11, 9, 10, 0, 1, 7, 2, 6, 3, 5, 4];
let LAYOUT = null, moveFrom = null;
const layoutKey = () => `sw-layout-v2-${SW.ADDR.villages}-${S.me}`;
function saveLayout() { try { localStorage.setItem(layoutKey(), JSON.stringify(LAYOUT)); } catch (e) { } }
const openPlotCount = () => clamp(plotsOpen() - 2, 0, PLOTS.length);            // the Town Hall and the Walls hold two plots
const plotOpensAt = j => j + 3 - CFG.econ.plotsBase;                              // Town Hall level that opens position j
function plotMap() {
  if (!LAYOUT || LAYOUT._me !== S.me) { try { LAYOUT = JSON.parse(localStorage.getItem(layoutKey())) || {}; } catch (e) { LAYOUT = {}; } LAYOUT._me = S.me; }
  const byPlot = {}, byKind = {}, present = plotKinds().filter(i => ME.v.b[i] > 0 || orderOn(8 + i) >= 0);
  for (const k of present) { const p = LAYOUT[k]; if (p !== undefined && byPlot[p] === undefined) { byPlot[p] = k; byKind[k] = p; } }
  let changed = false;
  for (const k of present) if (byKind[k] === undefined) { const p = PLOT_OPEN_ORDER.find(q => byPlot[q] === undefined); if (p !== undefined) { byPlot[p] = k; byKind[k] = p; LAYOUT[k] = p; changed = true; } }
  if (changed) saveLayout();
  return { byPlot, byKind };
}
function renderSceneBase() {
  const sc = $('#scene'); let h = ''; const z = y => `z-index:${Math.round(y)}`;
  const hasV = ME && ME.v && CFG;
  sc.style.backgroundImage = `url(assets/village_bg_w${hasV ? Math.max(1, Math.ceil(ME.walls * 5 / Math.max(1, BK(K.WALLS).maxLevel))) : 1}.webp)`;
  SITES.forEach(([x, yb, w, flip], i) => h += `<img class="spr" src="${spr(FIELD_SPRITE[i])}" style="left:${x}px;top:${yb}px;width:${w}px;transform:translate(-50%,-100%)${flip ? ' scaleX(-1)' : ''};${z(yb)}" alt="">`);
  const glows = [];
  if (hasV) {
    const ths = stageOf(K.TH, th());
    h += `<img class="spr" src="${spr('town_hall_' + ths)}" style="left:${TH_POS[0]}px;top:${TH_POS[1]}px;width:132px;transform:translate(-50%,-100%);${z(TH_POS[1])}" alt="">`;
    if (orderOn(8) >= 0) h += `<img class="spr scaf" src="${spr('scaffold')}" style="left:${TH_POS[0]}px;top:${TH_POS[1] + 2}px;width:124px;transform:translate(-50%,-100%);${z(TH_POS[1] + 1)}" alt="">`;
    smoke('town_hall_' + ths, TH_POS[0], TH_POS[1], 132, a => h += a); glows.push([TH_POS[0], TH_POS[1] - 50, 1.3]);
    const pm = plotMap();
    for (const [pk, i] of Object.entries(pm.byPlot)) {
      const art = kindArt(i), L = ME.v.b[i], o = orderOn(8 + i);
      const [x, y] = PLOTS[+pk], w = art.w || 112, sname = spriteOf(i, L);
      h += `<img class="spr ${L === 0 ? 'build' : ''}" src="${spr(sname)}" style="left:${x}px;top:${y + 22}px;width:${w}px;transform:translate(-50%,-100%);${z(y + 22)}" alt="">`;
      if (o >= 0) h += `<img class="spr scaf" src="${spr('scaffold')}" style="left:${x}px;top:${y + 24}px;width:${Math.round(w * 0.92)}px;transform:translate(-50%,-100%);${z(y + 23)}" alt="">`;
      if (i === K.CLAN && L >= 3 && ME.clanId) for (let n = 0; n < (L >= 5 ? 2 : 1); n++) h += `<span class="banner ${L >= 7 ? 'gold' : ''}" style="left:${x + (n ? 82 : -82)}px;top:${y + 26}px;--c:${clanColor(ME.clanId)};${z(y + 26)}"></span>`;
      if (i === K.WHEEL && L) wheelSpin(sname, x, y + 22, w, a => h += a);
      if (L) { smoke(sname, x, y + 22, w, a => h += a); glows.push([x, y - 20, 1]); }
    }
  }
  LAMPS.forEach(([x, y]) => glows.push([x, y, 0.45]));
  h += `<div class="nightfx"></div>` + glows.map(([x, y, k]) => `<span class="glow" style="left:${x}px;top:${y}px;width:${Math.round(170 * k)}px;height:${Math.round(150 * k)}px"></span>`).join('');
  setHTML($('#sbase'), h); if (!$('#life').children.length) buildLife();
  sceneFx(true);
}
function plate(x, y, label, t) {
  const o = t !== undefined ? orderOn(t) : -1, od = o >= 0 ? ME.orders[o] : null, ready = od && now() >= od.readyAt;
  return `<span class="plate ${od ? (ready ? 'ready' : 'busy') : ''}" style="left:${x}px;top:${y}px">${label}${od ? (ready ? ' ✓ Finish' : ` ▲ ${dur(od.readyAt - now())}`) : ''}</span>`;
}
function scenePlates() {
  if (!ME || !ME.v || !CFG) return '';
  let h = ''; const sel = S.sel, pm = plotMap(), openN = openPlotCount();
  PLOT_OPEN_ORDER.forEach((p, j) => {
    const [x, y] = PLOTS[p], i = pm.byPlot[p];
    if (i !== undefined) {
      const L = ME.v.b[i], on = sel.kind === 'b' && sel.k === i;
      h += `<button class="hit ${on ? 'sel' : ''}" data-hit="b" data-k="${i}" style="left:${x}px;top:${y - 40}px;width:140px;height:150px" aria-label="${esc(BK(i).name)}"></button>`;
      const [px, py] = PLATE_AT[p] ? [x + PLATE_AT[p][0], y + PLATE_AT[p][1]] : [x, y + 26];
      h += plate(px, py, L || 'new', 8 + i);
    } else if (j < openN) {
      const on = sel.kind === 'plot' && sel.p === p;
      h += `<button class="hit empty ${on ? 'sel' : ''}" data-hit="plot" data-p="${p}" style="left:${x}px;top:${y}px;width:124px;height:78px" aria-label="Empty plot"></button><span class="plusmark ${moveFrom !== null ? 'tgt' : ''}" style="left:${x}px;top:${y}px">${moveFrom !== null ? '↓' : '+'}</span>`;
    } else {
      const on = sel.kind === 'plot' && sel.p === p, need = plotOpensAt(j);
      h += `<button class="hit locked ${on ? 'sel' : ''}" data-hit="plot" data-p="${p}" style="left:${x}px;top:${y}px;width:124px;height:78px" aria-label="Locked plot"></button><span class="plate lockp" style="left:${x}px;top:${y - 22}px">${need <= BK(K.TH).maxLevel && j < CFG.econ.plotsMax - 2 ? `Opens at<br>Town Hall ${need}` : 'Locked'}</span>`;
    }
  });
  SITES.forEach(([x, yb, w], i) => { h += `<button class="hit ${sel.kind === 'field' && sel.i === i ? 'sel' : ''}" data-hit="field" data-i="${i}" style="left:${x}px;top:${yb - 70}px;width:${w * 0.8}px;height:150px" aria-label="${FIELD_NAME[i]}"></button>` + plate(x, yb + 4, ME.v.fields[i], i); });
  h += `<button class="hit ${sel.kind === 'th' ? 'sel' : ''}" data-hit="th" style="left:${TH_POS[0]}px;top:${TH_POS[1] - 60}px;width:150px;height:170px" aria-label="Town Hall"></button>` + plate(TH_POS[0], TH_POS[1] + 4, th(), 8);
  h += `<button class="hit ${sel.kind === 'walls' ? 'sel' : ''}" data-hit="walls" style="left:${WALLS_POS[0]}px;top:${WALLS_POS[1]}px;width:90px;height:90px" aria-label="Walls"></button>` + plate(WALLS_POS[0], WALLS_POS[1] + 30, `Walls ${lv(K.WALLS)}${ME.walls < lv(K.WALLS) ? ` (${ME.walls} now)` : ''}`, 9);
  return h;
}
let LIFE = [];
function buildLife() {
  const box = $('#life'); box.innerHTML = ''; LIFE = [];
  for (let i = 0; i < 8; i++) {
    const path = PATHS[i % PATHS.length], segs = []; let len = 0;
    for (let j = 1; j < path.length; j++) { const l = Math.hypot(path[j][0] - path[j - 1][0], path[j][1] - path[j - 1][1]); segs.push(l); len += l; }
    const el = document.createElement('img'); el.className = 'walker'; el.src = spr(VILLAGERS[i]); el.alt = ''; box.appendChild(el);
    LIFE.push({ el, path, segs, len, off: (i * 0.37 % 1) * 2 * len, spd: 20 + (i * 7) % 13, owl: i < 2 });
  }
}
function sceneFx(force) {
  const sc = $('#scene'); const n = nightness();
  if (force || sc._n === undefined || Math.abs(sc._n - n) > 0.01) { sc.style.setProperty('--night', n.toFixed(3)); sc._n = n; }
  sc.classList.toggle('running', true);
  const tsec = performance.now() / 1000;
  for (const w of LIFE) {
    const show = n < 0.55 || w.owl; if (w.el.hidden !== !show) w.el.hidden = !show; if (!show) continue;
    let d = (w.off + tsec * w.spd) % (2 * w.len); const back = d > w.len; if (back) d = 2 * w.len - d;
    let j = 0; while (j < w.segs.length - 1 && d > w.segs[j]) { d -= w.segs[j]; j++; }
    const a = w.path[j], b = w.path[j + 1], f = Math.min(1, d / w.segs[j]);
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, left = (b[0] - a[0]) * (back ? -1 : 1) < 0, bob = Math.abs(Math.sin(tsec * 7 + w.off)) * 3;
    w.el.style.transform = `translate(${(x - 16).toFixed(1)}px,${(y - 48 - bob).toFixed(1)}px) scaleX(${left ? -1 : 1})`; w.el.style.zIndex = Math.round(y);
  }
}

// ------------------------------------------------------------------ village panels
function costHtml(c) {
  const s = stockNow(); const sh = (have, need) => have + 1e-6 < need ? 'short' : '';
  return `<div class="cost">${c.cost.map((x, i) => `<span class="${sh(s[i], x)}">${icon(RES[i])} ${fmt(x)}</span>`).join('')}${c.seed ? `<span class="${sh(ME.seed, c.seed)}">${icon('seed')} ${fmt(c.seed)} SEED</span>` : ''}<span>⏱ ${dur(c.secs)}</span></div>`;
}
function effects(t, L, to) {
  const rows = []; const F = (label, fn) => rows.push([label, fn(L), to ? fn(to) : '–']);
  const e = CFG.econ, st = CFG.store, w = CFG.war;
  if (t < 8) F(`${RES_NAME[RES[FIELD_RES[t]]]} per hour (base)`, l => l ? fieldRate(l).toFixed(1) : 0);
  else {
    const k = t - 8, b = BK(k);
    if (k === K.TH) { F('Building plots', l => Math.min(e.plotsMax, e.plotsBase + l)); F('Level cap', l => l); F('Build time', l => `−${Math.min(90, e.thBuildCutPct * (l - 1))}%`); F('Village guard', l => fmt(w.thGuard * l)); }
    if (k === K.WALLS) F('Defense bonus', l => `+${w.wallsPct * l}%`);
    if (k === K.WHEEL) F('Wheel bonus cap', l => `+${e.wheelPctPerLevel * l}%`);
    if (k === K.STORE) F('Storage each', l => fmt(capSum(st.storeBase, st.storePer, st.storeGrowth, l)));
    if (k === K.VAULT) F('Protected each', l => fmt(capSum(st.vaultBase, st.vaultPer, st.vaultGrowth, l)));
    if (k === K.BURROW) F('Troop room', l => fmt(capSum(st.roomBase, st.roomPer, st.roomGrowth, l, true)));
    if (k === K.BARRACKS) F('Training time', l => l ? `×${((e.barracksTimePct / 100) ** (l - 1)).toFixed(2)}` : '–');
    if (k === K.ACADEMY) F('Research tiers open', l => { let n = 0; while (n < CFG.tierCount && CFG.tiers[n].academy <= l) n++; return n; });
    if (k === K.FORGE) F('Unit power', l => `+${w.forgePct * l}%`);
    if (k === K.MARKET) F('Exchange 100 →', l => l ? marketRate(l) : '–');
    if (k === K.CLAN) { const so = CFG.social; F('Clan', l => l >= so.foundHall ? 'found' : l >= so.joinHall ? 'join' : '–'); F('Member cap', l => Math.min(so.maxMembers, so.capPerHall * l)); }
    if (b.effect) F(cap1(FX_NAME[b.effect]), l => `+${fmt(b.effectPerLevel * l)}${/%/.test(FX_NAME[b.effect]) ? '%' : ''}`);
  }
  return `<table class="kv">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="up">${r[2]}</td></tr>`).join('')}</table>`;
}
function looks(t, L, to) {
  if (t < 8) return `<div class="thumbs"><img src="${spr(FIELD_SPRITE[t])}" alt=""></div>`;
  const k = t - 8; if (k === K.WALLS) return '';
  if (k === K.TH) { const a = stageOf(k, L), b = to ? stageOf(k, to) : a; return `<div class="thumbs"><img src="${spr('town_hall_' + a)}" alt="">${b !== a ? `<span class="arrow">▶</span><img src="${spr('town_hall_' + b)}" alt="">` : ''}</div>`; }
  const art = kindArt(k); if (art.one) return `<div class="thumbs"><img src="${spr(art.s)}" alt=""></div>`;
  const a = stageOf(k, L), b = to ? stageOf(k, to) : a;
  return `<div class="thumbs"><img src="${spr(art.s + '_' + a)}" alt="">${b !== a ? `<span class="arrow">▶</span><img src="${spr(art.s + '_' + b)}" alt="">` : ''}</div>`;
}
const selTarget = sel => sel.kind === 'field' ? sel.i : sel.kind === 'th' ? 8 : sel.kind === 'walls' ? 9 : 8 + sel.k;
function orderBox(t) {
  const o = orderOn(t); if (o < 0) return '';
  const od = ME.orders[o], ready = now() >= od.readyAt;
  return `<div class="slot" style="margin:8px 0"><div class="t"><span>Building level ${od.level}</span><span>${ready ? 'ready' : dur(od.readyAt - now())}</span></div><div class="row" style="justify-content:flex-start;margin-top:6px">${ready ? `<button class="btn sm go" data-act="finish" data-s="${o}">Finish</button>` : `<button class="btn ghost sm" data-act="cancel" data-s="${o}">Cancel (${CFG.econ.cancelRefundPct}% back)</button>`}</div></div>`;
}
function detailPanel() {
  let h = '<button class="btn ghost sm sheet-close" data-act="close">Close</button>';
  if (!ME || !ME.v || !CFG) return h + `<h3>Your village</h3><p class="muted">${S.me ? 'Found a village to start building.' : 'Connect a wallet to open your village.'}</p>`;
  if (S.sel.kind === 'plot') { const k = plotMap().byPlot[S.sel.p]; if (k === undefined) return h + plotPanel(S.sel.p); S.sel = { kind: 'b', k }; }
  const t = selTarget(S.sel), L = levelOfTarget(t), name = t < 8 ? `${FIELD_NAME[t]} ${t % 2 + 1}` : BK(t - 8).name;
  const u = upgradeCheck(t);
  h += `<h3>${esc(name)} · ${L ? `Level ${L}` : 'not built'}</h3>` + (t >= 8 ? `<p class="muted" style="margin:0 0 6px">${t - 8 < CORE_ROLE.length ? CORE_ROLE[t - 8] : `Gives ${FX_NAME[BK(t - 8).effect]} per level`}</p>` : '') + looks(t, L, u.max ? 0 : u.to) + effects(t, L, u.max ? 0 : u.to) + orderBox(t);
  if (!u.max && orderOn(t) < 0) h += `<div class="muted">${L ? `Upgrade to level ${u.to}` : 'Build it'}</div>` + costHtml(u.c) + `<button class="btn" style="width:100%;font-size:17px;padding:10px" data-act="upgrade" data-t="${t}" ${u.why ? 'disabled' : ''}>${L ? 'Upgrade' : 'Build'}</button>${u.why ? `<div class="why">${u.why}</div>` : ''}`;
  if (t >= 8) {
    const k = t - 8;
    if (k === K.CLAN && L) h += `<p><a class="btn alt sm" href="#clan" style="text-decoration:none">Open clan</a></p>`;
    if (k === K.BARRACKS && L) h += `<p><a class="btn alt sm" href="#army" style="text-decoration:none">Train units</a></p>`;
    if (k === K.ACADEMY && L) h += `<p><a class="btn alt sm" href="#academy" style="text-decoration:none">Open research</a></p>`;
    if (k === K.MARKET && L) h += `<p><a class="btn alt sm" href="#market" style="text-decoration:none">Exchange resources</a></p>`;
    if (k === K.TH) h += treasuryHtml() + `<div class="row" style="justify-content:flex-start;margin-top:10px"><a class="btn ghost sm" style="text-decoration:none" href="#visit=${encodeURIComponent(ME.v.name)}">Share your village</a></div>`;
    if (k >= 2 && plotMap().byKind[k] !== undefined) h += moveFrom === k ? `<div class="pred">Tap an empty plot to move the ${esc(BK(k).name)} there. <button class="btn ghost sm" data-act="movecancel">Cancel</button></div>` : `<div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn ghost sm" data-act="move" data-k="${k}">Move</button></div>`;
  }
  return h;
}
function plotPanel(p) {
  const j = PLOT_OPEN_ORDER.indexOf(p);
  if (j >= openPlotCount()) { const need = plotOpensAt(j); return `<h3>Locked plot</h3><p class="muted">${need <= BK(K.TH).maxLevel && j < CFG.econ.plotsMax - 2 ? `Opens at Town Hall level ${need}.` : 'This plot does not open this season.'} Every Town Hall level opens one more plot.</p>`; }
  const free = plotsUsed() < plotsOpen(), list = plotKinds().filter(k => !ME.v.b[k] && orderOn(8 + k) < 0);
  let h = `<h3>Empty plot</h3><p class="muted" style="margin:0 0 6px">Pick a building for this plot. ${free ? '' : '<span class="bad">No free plot: upgrade the Town Hall first.</span>'}</p>`;
  if (!list.length) return h + `<p class="muted">Every building is already in your village.</p>`;
  h += `<div class="opts">`;
  for (const k of list) {
    const b = BK(k), u = upgradeCheck(8 + k), art = kindArt(k);
    h += `<div class="opt"><img src="${spr(art.one ? art.s : art.s + '_1')}" alt=""><div><div class="row"><span class="n">${esc(b.name)}</span><button class="btn sm" data-act="buildat" data-k="${k}" data-p="${p}" ${u.why ? 'disabled' : ''}>Build</button></div><div class="d">${k < CORE_ROLE.length ? CORE_ROLE[k] : `Gives ${FX_NAME[b.effect]} per level`}</div>${u.c ? `<div class="c">${u.c.cost.map((x, i) => `${icon(RES[i])}${fmt(x)}`).join(' ')}${u.c.seed ? ` ${icon('seed')}${fmt(u.c.seed)}` : ''} · ${dur(u.c.secs)}</div>` : ''}${u.why ? `<div class="why">${u.why}</div>` : ''}</div></div>`;
  }
  return h + '</div>';
}
function treasuryHtml() {
  const v = ME.v, t = now(), e = CFG.econ, boostOn = t < v.boostUntil;
  const cool = e.peaceCooldownHours * 3600, peaceWait = v.peaceUsedAt && t < v.peaceUsedAt + cool ? v.peaceUsedAt + cool - t : 0, shieldLeft = Math.max(0, v.shieldUntil - t);
  let h = `<h3 style="margin-top:14px">Treasury · spend SEED</h3><div class="opts">`;
  h += `<div class="opt shop"><div><div class="row"><span class="n">Output boost</span></div><div class="d">+${e.boostPct}% output of one resource for ${e.boostHours} h</div><div class="c">${icon('seed')} ${fmt(e.boostSeed)} SEED</div>${boostOn ? `<div class="why">${RES_NAME[RES[v.boostRes]]} boost running: ${dur(v.boostUntil - t)} left.</div>` : `<div class="row" style="justify-content:flex-start;gap:4px;flex-wrap:wrap;margin-top:4px">${RES.map((r, i) => `<button class="btn sm" data-act="boost" data-r="${i}" ${ME.seed < e.boostSeed ? 'disabled' : ''}>${RES_NAME[r]}</button>`).join('')}</div>`}</div></div>`;
  const pw = peaceWait ? `Available again in ${dur(peaceWait)}.` : shieldLeft >= e.peaceHours * 3600 ? `Your shield already lasts ${dur(shieldLeft)}.` : ME.seed < e.peaceSeed ? `Needs ${fmt(e.peaceSeed - ME.seed)} more SEED.` : '';
  h += `<div class="opt shop"><div><div class="row"><span class="n">Peace shield</span><button class="btn sm" data-act="peace" ${pw ? 'disabled' : ''}>Buy</button></div><div class="d">No one can attack you for ${e.peaceHours} h. Attacking or scouting ends it. Once every ${dur(cool)}.</div><div class="c">${icon('seed')} ${fmt(e.peaceSeed)} SEED</div>${pw ? `<div class="why">${pw}</div>` : ''}</div></div>`;
  h += `<div class="opt shop"><div><div class="row"><span class="n">Village banner</span><button class="btn sm" data-act="banner" ${v.banner || ME.seed < e.bannerSeed ? 'disabled' : ''}>${v.banner ? 'Owned' : 'Buy'}</button></div><div class="d">A banner over your village, forever. Purely for show.</div><div class="c">${icon('seed')} ${fmt(e.bannerSeed)} SEED</div></div></div>`;
  return h + '</div>';
}
function slotsHtml() {
  const n = ME.nft;
  let h = `<h3>Construction</h3><div class="muted" style="font-size:16px;margin:-4px 0 6px">${n ? `${n} Squeek${n > 1 ? 's' : ''} in your wallet: build time −${pct(squeekCut(n, G.lastWork))} after the last recorded day` : 'Hold a Squeek to build faster after a good day of work'}</div><div class="list">`;
  ME.orders.forEach((o, i) => {
    if (!o) { h += `<div class="slot"><div class="t"><span class="muted">Slot ${i + 1} is free</span></div><div class="q">Tap a building, a field or a + plot</div></div>`; return; }
    const ready = now() >= o.readyAt;
    h += `<div class="slot"><div class="t"><span>${esc(targetName(o.target))} → ${o.level}</span><span>${ready ? '<span class="ok">ready</span>' : dur(o.readyAt - now())}</span></div><div class="row" style="justify-content:flex-start;margin-top:4px">${ready ? `<button class="btn sm go" data-act="finish" data-s="${i}">Finish</button>` : `<button class="btn ghost sm" data-act="cancel" data-s="${i}">Cancel (${CFG.econ.cancelRefundPct}% back)</button>`}</div></div>`;
  });
  return h + '</div>';
}
const unitList = units => units.map((n, k) => n ? `${n} ${esc(UN(k).name)}` : '').filter(Boolean).join(', ');
function moveLine(m) {
  const t = now(), arrived = t >= m.arriveAt, mineM = m.owner === S.me;
  const dest = m.target === ZERO ? `${CAMP_NAME[m.campId % 3]} #${m.campId}` : esc(nameOf(m.target));
  const label = !mineM ? (m.mode === 5 ? `⛨ ${esc(nameOf(m.owner))}'s support is here` : m.mode === 3 ? `⛨ ${esc(nameOf(m.owner))} sends support` : `<span class="bad">⚔ ${esc(nameOf(m.owner))} attacks you</span>`)
    : m.mode === 1 ? `→ Raid on ${dest}` : m.mode === 2 ? `👁 Scouts to ${dest}` : m.mode === 3 ? `⛨ Support to ${dest}` : m.mode === 4 ? `↩ Back from ${dest}` : `⛨ Supporting ${dest}`;
  const units = unitList(m.units) + (m.champion ? ' + champion' : '');
  const btn = m.mode === 5 ? (mineM || m.target === S.me ? `<button class="btn ghost sm" data-act="recall" data-id="${m.id}">Recall</button>` : '') : arrived ? `<button class="btn sm go" data-act="resolve" data-id="${m.id}">Resolve</button>` : `<b style="font-weight:400">${dur(m.arriveAt - t)}</b>`;
  return `<div class="card">${label}<div class="row"><span class="muted">${mineM ? units : ''}</span>${btn}</div></div>`;
}
function movesHtml() {
  if (!ME || !ME.v) return '';
  if (!ME.moves.length) return `<p class="muted">${now() < ME.v.shieldUntil ? `Beginner shield: ${dur(ME.v.shieldUntil - now())} left. Attacking or scouting ends it.` : 'No armies on the move.'}</p>`;
  return ME.moves.slice().sort((a, b) => a.arriveAt - b.arriveAt).map(moveLine).join('');
}
function villageLeft() {
  if (!SW.D) return `<h3>Season 2</h3><p class="muted">The Season 2 contracts are not deployed yet.</p>`;
  if (!S.me) return `<h3>Welcome</h3><p class="muted">Connect a wallet to found your village. You can look at the map and the ranking without one.</p><button class="btn" data-act="wb-open">Connect wallet</button>`;
  if (!ME || !CFG) return `<h3>Your village</h3><p class="muted">Reading the chain…</p>`;
  if (ME.none) return `<h3>No village yet</h3><p class="muted">This wallet has no village. Founding one is a single transaction: pick a name that stays forever.</p><button class="btn" data-act="nm-open">Found a village</button>`;
  let h = slotsHtml();
  const act = [];
  if (ME.study) { const r = ME.study, ready = now() >= r.readyAt; act.push(`Research tier ${r.tier} · ${ready ? `<button class="btn sm go" data-act="resfinish">Finish</button>` : dur(r.readyAt - now())}`); }
  if (ME.training) { const tr = ME.training, ready = now() >= tr.readyAt; act.push(`Training ${tr.count} ${esc(UN(tr.kind).name)} · ${ready ? `<button class="btn sm go" data-act="trfinish">Finish</button>` : dur(tr.readyAt - now())}`); }
  if (act.length) h += `<h3 style="margin-top:12px">Busy</h3><div class="muted">${act.join('<br>')}</div>`;
  h += `<h3 style="margin-top:12px">Armies</h3><div class="list">${movesHtml()}</div>`;
  h += `<button class="btn ghost sm" style="margin-top:12px" data-act="ovtoggle" aria-expanded="${!!S.ui.ovOpen}">${S.ui.ovOpen ? 'Hide' : 'Show'} all buildings</button>`;
  if (S.ui.ovOpen) {
    const ov = [['th', '', 'Town Hall', th()], ['walls', '', 'Walls', lv(K.WALLS)]];
    ME.v.fields.forEach((L, i) => ov.push(['field', i, `${FIELD_NAME[i]} ${i % 2 + 1}`, L]));
    plotKinds().forEach(i => ov.push(['b', i, BK(i).name, lv(i)]));
    h += `<div class="ov" style="margin-top:6px">` + ov.map(([k, i, n, L]) => `<button data-sel="${k}" data-i="${i}"><span>${esc(n)}</span><span>${L ? 'Lv ' + L : '–'}</span></button>`).join('') + '</div>';
  }
  return h;
}

// ------------------------------------------------------------------ world map
const wcam = { ts: 72 };
let wctx = null, cvW = 0, cvH = 0, grassImg = null;
const IMG = {};
function img(n) { if (!IMG[n]) { const i = new Image(); i.src = spr(n); i.onload = () => { if (S.view === 'world') drawWorld(); }; IMG[n] = i; } return IMG[n]; }
function sizeCanvas() { const cv = $('#worldcv'), st = $('#wstage'), dpr = Math.min(2, devicePixelRatio || 1); cvW = st.clientWidth; cvH = st.clientHeight; cv.width = cvW * dpr; cv.height = cvH * dpr; wctx = cv.getContext('2d'); wctx.setTransform(dpr, 0, 0, dpr, 0, 0); wcam.ts = innerWidth <= 900 ? 56 : 72; drawWorld(); }
function w2s(x, y) { return [cvW / 2 + (x - S.cam.x) * wcam.ts, cvH / 2 + (y - S.cam.y) * wcam.ts]; }
function drawImg(im, cx, by, w, flip) { if (!im.complete || !im.naturalWidth) return; const h = w * im.naturalHeight / im.naturalWidth; if (flip) { wctx.save(); wctx.translate(cx, 0); wctx.scale(-1, 1); wctx.drawImage(im, -w / 2, by - h, w, h); wctx.restore(); } else wctx.drawImage(im, cx - w / 2, by - h, w, h); }
function hash(x, y, k) { let h = Math.imul(x * 374761393 + y * 668265263 + k * 1442695041, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function drawWorld() {
  if (!wctx) return; const c = wctx, ts = wcam.ts, t = now();
  if (!grassImg) { grassImg = new Image(); grassImg.src = 'assets/grass.webp'; grassImg.onload = drawWorld; }
  c.fillStyle = '#4f8a3a'; c.fillRect(0, 0, cvW, cvH);
  if (grassImg.complete && grassImg.naturalWidth) { const pat = c.createPattern(grassImg, 'repeat'), s = ts / 160, ox = cvW / 2 - S.cam.x * ts, oy = cvH / 2 - S.cam.y * ts; c.save(); c.translate(ox, oy); c.scale(s, s); c.fillStyle = pat; c.fillRect(-ox / s, -oy / s, cvW / s, cvH / s); c.restore(); }
  const x0 = Math.floor(S.cam.x - cvW / 2 / ts) - 1, x1 = Math.ceil(S.cam.x + cvW / 2 / ts) + 1, y0 = Math.floor(S.cam.y - cvH / 2 / ts) - 1, y1 = Math.ceil(S.cam.y + cvH / 2 / ts) + 1;
  c.strokeStyle = 'rgba(15,30,10,.28)'; c.lineWidth = 1;
  for (let x = x0; x <= x1; x++) { const [sx] = w2s(x, 0); c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, cvH); c.stroke(); }
  for (let y = y0; y <= y1; y++) { const [, sy] = w2s(0, y); c.beginPath(); c.moveTo(0, sy); c.lineTo(cvW, sy); c.stroke(); }
  const forest = img('site_forest'), myClan = ME && ME.clanId;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const [sx, sy] = w2s(x, y);
    if (x < 0 || y < 0 || x >= 100 || y >= 100) { c.fillStyle = '#1a2a14'; c.fillRect(sx, sy, ts + 1, ts + 1); continue; }
    const tile = y * 100 + x, p = W.tiles.get(tile);
    if (CAMP_AT.has(tile)) {
      const id = CAMP_AT.get(tile), kind = id % 3;
      c.fillStyle = '#7a5a34'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.68, ts * 0.38, ts * 0.19, 0, 0, 7); c.fill();
      drawImg(img(kind === 2 ? 'burrow_2' : 'burrow_1'), sx + ts / 2, sy + ts * 0.8, ts * (0.4 + 0.08 * kind));
      c.fillStyle = '#222'; c.fillRect(sx + ts * 0.78, sy + ts * 0.12, 3, ts * 0.36); c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(sx + ts * 0.78 + 3, sy + ts * 0.12); c.lineTo(sx + ts * 0.98, sy + ts * 0.19); c.lineTo(sx + ts * 0.78 + 3, sy + ts * 0.26); c.fill();
      const pw = ts * 0.3, ph = ts * 0.22; c.fillStyle = 'rgba(40,10,8,.92)'; c.strokeStyle = '#c0392b'; c.lineWidth = 2; c.fillRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph); c.strokeRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph);
      c.fillStyle = '#ffb3a8'; c.font = `${Math.round(ts * 0.24)}px VT323, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C', sx + ts / 2, sy + ts - ph / 2 - 1);
      continue;
    }
    if (!p) { if (hash(x, y, 4) < 0.25 && forest.complete) drawImg(forest, sx + ts / 2, sy + ts * 0.92, ts * 0.9, hash(x, y, 5) < 0.5); continue; }
    const cx = W.ctx.get(p) || { th: 1, shieldUntil: 0 }, L = Math.max(1, cx.th), st = clamp(Math.ceil(L / 2), 1, 5), own = p === S.me, cl = W.clanOf.get(p) || 0;
    c.fillStyle = '#9c7a4a'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.42, ts * 0.22, 0, 0, 7); c.fill();
    c.fillStyle = '#b8966a'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.36, ts * 0.17, 0, 0, 7); c.fill();
    if (L >= 4) drawImg(img('burrow_' + st), sx + ts * 0.24, sy + ts * 0.8, ts * 0.32);
    drawImg(img('town_hall_' + st), sx + ts / 2, sy + ts * 0.78, ts * 0.5);
    if (cx.shieldUntil > t) { c.fillStyle = 'rgba(150,205,255,.22)'; c.strokeStyle = 'rgba(170,215,255,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.5, ts * 0.46, ts * 0.42, 0, 0, 7); c.fill(); c.stroke(); }
    if (cl) { const col = myClan && cl === myClan ? '#6aa8ff' : clanColor(cl); c.fillStyle = '#222'; c.fillRect(sx + ts * 0.8, sy + ts * 0.1, 3, ts * 0.38); c.fillStyle = col; c.fillRect(sx + ts * 0.8 + 3, sy + ts * 0.1, ts * 0.2, ts * 0.13); }
    c.fillStyle = 'rgba(20,15,10,.92)'; c.strokeStyle = own ? '#f2c14e' : '#6b4a2b'; c.lineWidth = 2;
    const pw = ts * 0.3, ph = ts * 0.22; c.fillRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph); c.strokeRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph);
    c.fillStyle = own ? '#f2c14e' : '#f3e6c8'; c.font = `${Math.round(ts * 0.24)}px VT323, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(L, sx + ts / 2, sy + ts - ph / 2 - 1);
    if (ts >= 50) { const nm = (W.players.get(p) || {}).name || ''; c.font = `${Math.round(ts * 0.2)}px VT323, monospace`; c.fillStyle = 'rgba(11,8,6,.75)'; const tw = c.measureText(nm).width + 6; c.fillRect(sx + ts / 2 - tw / 2, sy + 1, tw, ts * 0.2); c.fillStyle = own ? '#f2c14e' : '#f3e6c8'; c.fillText(nm, sx + ts / 2, sy + 1 + ts * 0.1); }
    if (own) { c.strokeStyle = '#f2c14e'; c.lineWidth = 3; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.47, ts * 0.26, 0, 0, 7); c.stroke(); }
  }
  if (ME && ME.moves) for (const m of ME.moves) {
    if (m.mode === 5) continue;
    const from = (W.players.get(m.owner) || {}).tile, to = m.target === ZERO ? campTile(m.campId) : (W.players.get(m.target) || {}).tile;
    if (from === undefined || to === undefined) continue;
    const [fa, fb] = m.mode === 4 ? [to, from] : [from, to];
    const [ax, ay] = w2s(fa % 100 + 0.5, Math.floor(fa / 100) + 0.6), [bx, by] = w2s(fb % 100 + 0.5, Math.floor(fb / 100) + 0.6);
    const col = m.owner !== S.me ? (m.mode === 1 ? '#ff6a58' : '#6aa8ff') : { 1: '#f2c14e', 2: '#e8e8e8', 3: '#6aa8ff', 4: '#8fd16a' }[m.mode];
    c.setLineDash([10, 7]); c.lineWidth = 6; c.strokeStyle = '#0b0806'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); c.lineWidth = 3; c.strokeStyle = col; c.stroke(); c.setLineDash([]);
    const f = m.travel ? clamp(1 - (m.arriveAt - t) / m.travel, 0, 1) : 1, px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
    c.fillStyle = col; c.strokeStyle = '#0b0806'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill(); c.stroke();
  }
  if (S.wsel !== null) { const [sx, sy] = w2s(S.wsel % 100, Math.floor(S.wsel / 100)); c.strokeStyle = '#000'; c.lineWidth = 6; c.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4); c.strokeStyle = '#f2c14e'; c.lineWidth = 3; c.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4); }
  c.fillStyle = 'rgba(11,8,6,.82)'; c.fillRect(0, 0, cvW, 22); c.font = '18px VT323, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f3e6c8';
  for (let x = x0; x <= x1; x++) if (x >= 0 && x < 100) { const [sx] = w2s(x + 0.5, 0); c.fillText(x, sx, 11); }
  c.fillStyle = 'rgba(11,8,6,.82)'; c.fillRect(0, 22, 30, cvH); c.fillStyle = '#f3e6c8';
  for (let y = y0; y <= y1; y++) if (y >= 0 && y < 100) { const [, sy] = w2s(0, y + 0.5); c.fillText(y, 15, sy); }
}
let miniCache = null;
function drawMini() {
  const cv = $('#minimap'); if (!cv) return; const c = cv.getContext('2d');
  if (!miniCache || miniCache._n !== W.tiles.size) {
    miniCache = document.createElement('canvas'); miniCache.width = 100; miniCache.height = 100; miniCache._n = W.tiles.size; const m = miniCache.getContext('2d');
    m.fillStyle = '#3b6a2e'; m.fillRect(0, 0, 100, 100); m.fillStyle = '#c0392b'; for (const tl of CAMP_AT.keys()) m.fillRect(tl % 100, Math.floor(tl / 100), 1, 1);
    m.fillStyle = '#e8c88a'; for (const tl of W.tiles.keys()) m.fillRect(tl % 100, Math.floor(tl / 100), 1, 1);
    m.strokeStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i <= 100; i += 10) { m.beginPath(); m.moveTo(i, 0); m.lineTo(i, 100); m.moveTo(0, i); m.lineTo(100, i); m.stroke(); }
  }
  c.imageSmoothingEnabled = false; c.drawImage(miniCache, 0, 0, 180, 180);
  const k = 1.8, vw = cvW / wcam.ts, vh = cvH / wcam.ts; c.strokeStyle = '#f2c14e'; c.lineWidth = 2; c.strokeRect((S.cam.x - vw / 2) * k, (S.cam.y - vh / 2) * k, vw * k, vh * k);
  if (ME && ME.v) { c.fillStyle = '#f2c14e'; c.fillRect((ME.v.tile % 100) * k - 2, Math.floor(ME.v.tile / 100) * k - 2, 5, 5); }
}
function goTo(tile) { S.cam = { x: tile % 100 + 0.5, y: Math.floor(tile / 100) + 0.5, set: true }; S.wsel = tile; S.ui.min.wright = false; $('#wright').classList.remove('closed'); loadTarget(tile).catch(() => { }); drawWorld(); drawMini(); dirty(); }
function worldLeft() {
  return `<h3>World map</h3><canvas id="minimap" class="mm" width="180" height="180"></canvas>
  <div class="mkt goto"><label>Go to<input id="goto" maxlength="42" placeholder="x|y, a name or 0x… wallet" autocomplete="off"></label><button class="btn sm" data-act="goto">Go</button></div>
  ${ME && ME.v ? `<div class="row" style="margin-top:8px;justify-content:flex-start"><button class="btn sm" data-act="home">My village</button></div>` : ''}
  <h3 style="margin-top:12px">${W.players.size} villages · 200 wild camps</h3>${ME && ME.v ? `<h3 style="margin-top:12px">Armies</h3><div class="list">${movesHtml()}</div>` : ''}
  <h3 style="margin-top:12px">Legend</h3><div class="muted" style="font-size:17px">100 × 100 tiles. Drag to move, tap a tile. Plate = Town Hall level · gold ring = you · blue flag = your clan · other flags = other clans · bubble = shield · red C = wild camp · dashed lines: gold raid, white scouts, blue support, green return, red incoming.</div>`;
}
function picker(keys) { return `<div class="unitsel">${keys.map(k => `<img src="${spr(unitSprite(k))}" alt=""><span>${esc(UN(k).name)} <button class="btn ghost sm" data-act="amax" data-u="${k}">all ${ME.home[k]}</button></span><input type="number" min="0" max="${ME.home[k]}" value="0" id="atk-${k}" data-u="${k}" inputmode="numeric">`).join('')}</div><div class="row" style="justify-content:flex-start;margin-top:6px"><button class="btn ghost sm" data-act="aall">Everyone</button><button class="btn ghost sm" data-act="anone">Clear</button></div>`; }
const fighters = () => CFG.units.filter(u => u.role !== 1 && ME.home[u.i] > 0).map(u => u.i);
const scoutsHome = () => CFG.units.filter(u => u.role === 1).reduce((s, u) => s + ME.home[u.i], 0);
function worldRight() {
  let h = '<button class="btn ghost sm sheet-close" data-act="close">Close</button>';
  if (S.wsel === null) return h + `<h3>Pick a tile</h3><p class="muted">Tap a village or a wild camp to see it and send troops.</p>`;
  const tile = S.wsel, [x, y] = tileXY(tile), p = W.tiles.get(tile), T = W.target.get(tile), t = now(), myTile = ME && ME.v ? ME.v.tile : null;
  const dist = myTile !== null ? Math.hypot(x - myTile % 100, y - Math.floor(myTile / 100)) : null;
  if (p && p === S.me) return h + `<h3>Your village (${x}|${y})</h3><p class="muted">${who(ME.v.name, S.me)} · Town Hall ${th()} · Walls ${ME.walls}<br>Defense at home about ${fmt(myDefense())}</p><a class="btn sm" href="#village" style="text-decoration:none">Open village</a>`;
  if (!p && !CAMP_AT.has(tile)) return h + `<h3>Empty tile (${x}|${y})</h3><p class="muted">Free land. New villages fill the map in a fixed order as wallets join.</p>`;
  if (!T || !CFG) return h + `<h3>${p ? esc(nameOf(p)) : CAMP_NAME[CAMP_AT.get(tile) % 3]} (${x}|${y})</h3><p class="muted">Reading…</p>`;
  const units = ME && ME.v ? ME.home : null, scouted = T.scouted > t;
  if (T.camp !== undefined) {
    h += `<h3>${CAMP_NAME[T.camp % 3]} #${T.camp} (${x}|${y})</h3><div class="vhead"><img src="${spr(T.camp % 3 === 2 ? 'burrow_2' : 'burrow_1')}" alt=""><div class="muted">Wild camp${dist !== null ? ` · ${dist.toFixed(1)} tiles away` : ''}<br>It never attacks and has no Walls or Vault. Raids give loot and champion XP, but no ranking points.</div></div>
    <table class="kv"><tr><td>Defense now</td><td>${fmt(T.defense)}${T.defense < T.full ? ` of ${fmt(T.full)}` : ''}</td></tr><tr><td>Grows</td><td>${fmt(T.hourly)} of each resource per hour, up to ${CFG.wild.stockHours} h</td></tr>${T.stock ? `<tr><td>Stock at last raid</td><td>${T.stock.map(fmt).join(' / ')}</td></tr>` : ''}${T.regrowAt > t ? `<tr><td>Defenders regrow</td><td>in ${dur(T.regrowAt - t)}</td></tr>` : ''}</table>`;
    if (!units) return h;
    return h + attackForm(T.defense, tile, false, true);
  }
  const cl = T.clanId, same = ME && ME.clanId && cl === ME.clanId;
  const D = defenseOf(T.home, T.forge, T.away ? 0 : T.might, T.away ? 0 : T.def, T.walls, T.th, T.defPct);
  const lootable = T.stock.map(s => Math.max(0, s - T.protect));
  h += `<h3>${esc(nameOf(p))} (${x}|${y})</h3><div class="addr big">${p}</div><a class="lnk" href="#visit=${encodeURIComponent(nameOf(p))}">Village page</a><div class="vhead"><img src="${spr('town_hall_' + clamp(Math.ceil(Math.max(1, T.th) / 2), 1, 5))}" alt=""><div class="muted">Town Hall ${T.th} · Walls ${T.walls}${dist !== null ? ` · ${dist.toFixed(1)} tiles away` : ''}<br>${cl ? `${esc(clanName(cl))}${same ? ' (your clan)' : ''}` : 'No clan'}${T.shieldUntil > t ? ` · shield ${dur(T.shieldUntil - t)}` : ''}</div></div>
  <table class="kv"><tr><td>Troops at home</td><td>${T.home.some(Boolean) ? unitList(T.home) : 'none'}</td></tr><tr><td>Defense</td><td>about ${fmt(D)}${T.away ? ' (champion away)' : ''}, plus any clan support</td></tr><tr><td>Above the Vault</td><td>${lootable.map((v, i) => `${icon(RES[i])}${fmt(v)}`).join(' ')}</td></tr><tr><td>Scouting bonus</td><td>${scouted ? `<span class="ok">+${CFG.war.scoutBonusPct}% · ${dur(T.scouted - t)} left</span>` : '<span class="muted">none</span>'}</td></tr></table>`;
  if (!units) return h + `<p class="muted">Connect a wallet with a village to send troops.</p>`;
  if (ME.clan && ME.clan.founder === S.me && !cl) { const inv = W.invites.get(ME.clanId + ':' + p); h += `<div class="row" style="margin:8px 0;justify-content:flex-start"><button class="btn sm alt" data-act="invite" data-a="${p}" ${inv && inv.open ? 'disabled' : ''}>${inv && inv.open ? 'Invited' : `Invite to ${esc(ME.clan.name)}`}</button></div>`; }
  if (same) {
    const ready = fighters();
    if (lv(K.CLAN) < 1) return h + `<p class="muted">A clanmate: send support once you have a Clan Hall.</p>`;
    if (!ready.length) return h + `<p class="muted">A clanmate. No troops at home to send as support.</p>`;
    return h + `<h3 style="margin-top:10px">Send support</h3>${picker(ready)}<div class="stickgo"><button class="btn alt" style="width:100%" data-act="support">Send support</button></div>`;
  }
  if (T.shieldUntil > t) return h + `<p class="muted">Shielded: you cannot attack this village for ${dur(T.shieldUntil - t)}.</p>`;
  if (T.th + CFG.war.weakGap <= th()) h += `<p class="why">Town Hall ${T.th} is ${CFG.war.weakGap}+ levels below yours: raids here give ${CFG.war.weakLootPct}% loot and no points.</p>`;
  return h + attackForm(D, tile, scouted, false);
}
function attackForm(D, tile, scouted, camp) {
  let h = '';
  const sc = scoutsHome(), scoutOpen = CFG.units.some(u => u.role === 1 && u.enabled && ME.v.tier >= u.tier);
  if (!camp && scoutOpen) h += `<div class="row card" style="margin:8px 0"><span>Scouts at home: ${sc}</span><span class="pbtn"><input type="number" id="sc-n" min="1" max="${sc}" value="${Math.min(3, sc)}" style="width:56px" inputmode="numeric"><button class="btn sm alt" data-act="scout" ${sc ? '' : 'disabled'}>Scout</button></span></div>`;
  else if (!camp) h += `<p class="muted" style="font-size:17px">Scouts give +${CFG.war.scoutBonusPct}% attack on a village for ${CFG.war.scoutHours} h.</p>`;
  const ready = fighters();
  if (!ready.length) return h + `<p class="muted">No troops at home. Train units in the Army tab.</p>`;
  return h + `<h3 style="margin-top:10px">Choose troops to send</h3>${picker(ready)}<label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="atk-champ" ${ME.champ.away ? 'disabled' : 'checked'}> Champion joins (Might ${fmt(ME.cstats.might)})</label>
  <div class="pred" id="pred" data-d="${D}" data-scouted="${scouted ? 1 : 0}" data-tile="${tile}"></div><div class="stickgo"><button class="btn" style="width:100%" data-act="attack" id="atk-go" disabled>Attack</button></div>`;
}
const pickIn = () => { const u = Array(NUNITS).fill(0); document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => { const k = +i.dataset.u; u[k] = clamp(Math.floor(+i.value || 0), 0, ME.home[k]); }); return u; };
function updatePrediction() {
  const box = $('#pred'); if (!box || !ME || !ME.v || !CFG) return;
  const D = +box.dataset.d, sc = box.dataset.scouted === '1', tile = +box.dataset.tile, units = pickIn(), champ = !!($('#atk-champ') && $('#atk-champ').checked && !ME.champ.away), w = CFG.war;
  const n = units.reduce((a, b) => a + b, 0), go = $('#atk-go'); if (go) go.disabled = n < 1;
  if (n < 1) { box.innerHTML = `Their defense is about <b>${fmt(D)}</b>: you need <b>${fmt(D * w.winRatioPct / 100)}</b> attack to win${sc ? ` (your scouting adds +${w.scoutBonusPct}%)` : ''}.`; return; }
  const A = attackOf(units, champ, sc), fa = Math.min(1, w.lossPct / 100 * D / Math.max(1, A)), fd = D ? Math.min(1, w.lossPct / 100 * A / D) : 1, win = A > 0 && A * 100 >= D * w.winRatioPct;
  const surv = units.map(x => Math.round(x * (1 - fa))), speed = Math.min(...units.map((x, k) => x ? UN(k).speed : 999));
  const tt = travelSecs(ME.v.tile, tile, speed, ME.v.tier);
  box.innerHTML = `Attack about <b>${fmt(A)}</b>${sc ? ` (+${w.scoutBonusPct}% scouted)` : ''} vs defense <b>${fmt(D)}</b><br>You lose about ${pct(fa)} · they lose ${pct(fd)}<br>${win ? `<span class="ok">Win · you can carry ${fmt(carryOf(surv, champ))}</span>` : `<span class="bad">No win: under ${w.winRatioPct}% of their defense</span>`} · arrives in ${dur(tt)}`;
}

// ------------------------------------------------------------------ pages
function needVillage(title) {
  if (!SW.D) return `<h2>${title}</h2><div class="px box"><p class="muted">Season 2 is not deployed yet.</p></div>`;
  if (!S.me) return `<h2>${title}</h2><div class="px box"><p class="muted">Connect a wallet to play.</p><button class="btn" data-act="wb-open">Connect wallet</button></div>`;
  if (!ME || !CFG) return `<h2>${title}</h2><div class="px box"><p class="muted">Reading the chain…</p></div>`;
  if (ME.none) return `<h2>${title}</h2><div class="px box"><p class="muted">Found a village first.</p><button class="btn" data-act="nm-open">Found a village</button></div>`;
  return '';
}
function armyPage() {
  const nv = needVillage('Army'); if (nv) return nv;
  const bl = lv(K.BARRACKS), room = Math.max(0, ME.room - ME.used), away = awayUnits(), rt = rates(), w = CFG.war;
  let h = `<h2>Army</h2><p class="sub">Each unit needs troop room and eats ${CFG.econ.upkeepMilli / 1000} Food per room per hour, at home or away. Defense at home now: about <b class="gold">${fmt(myDefense())}</b> (Walls +${w.wallsPct * ME.walls}%, Forge +${w.forgePct * lv(K.FORGE)}%${ME.mods.def ? `, buildings +${ME.mods.def}%` : ''}, champion ${ME.champ.away ? 'away' : 'home'}).</p>`;
  h += `<div class="px box" style="margin-bottom:14px"><p style="margin:0">Room used <b>${fmt(ME.used)}</b> of <b>${fmt(ME.room)}</b> · Food ${fmt(rt[1])}/h grown, ${fmt(foodUse())}/h eaten${rt[1] < foodUse() ? ' · <span class="bad">Food runs out: troops do not starve, but nothing is left to build with</span>' : ''}</p></div><div class="grid2">`;
  h += `<div class="px box wide"><h3>Your units</h3><div class="tblwrap"><table class="tbl utbl"><thead><tr><th>Unit</th><th>Home</th><th>Away</th><th>Atk / Def</th><th>Speed</th><th>Carry</th><th>Room</th></tr></thead><tbody>`;
  h += unitsOn().map(u => `<tr><td class="un"><img src="${spr(unitSprite(u.i))}" alt="">${esc(u.name)}${u.role ? ` <span class="muted">(${ROLE_NAME[u.role]})</span>` : ''}${ME.v.tier >= u.tier ? '' : ` <span class="muted">(tier ${u.tier})</span>`}</td><td class="r">${ME.home[u.i]}</td><td class="r">${away[u.i]}</td><td class="r">${u.attack} / ${u.defense}</td><td class="r">${u.speed}</td><td class="r">${u.carry}</td><td class="r">${u.room}</td></tr>`).join('');
  h += `</tbody></table></div></div><div class="px box"><h3>Train at the Barracks</h3>`;
  if (!bl) h += `<p class="muted">Build Barracks in your village first.</p>`;
  else if (ME.training) { const tr = ME.training, ready = now() >= tr.readyAt; h += `<div class="slot"><div class="t"><span>${tr.count} ${esc(UN(tr.kind).name)}</span><span>${ready ? '<span class="ok">ready</span>' : dur(tr.readyAt - now())}</span></div>${ready ? `<button class="btn sm go" style="margin-top:6px" data-act="trfinish">Finish training</button>` : ''}</div><p class="muted">One batch at a time. Training cannot be cancelled.</p>`; }
  else {
    const s = stockNow(), each = u => u.seconds_ * (CFG.econ.barracksTimePct / 100) ** Math.min(20, bl - 1) * (100 - Math.min(90, ME.mods.train)) / 100;
    h += `<div class="opts">` + unitsOn().filter(u => ME.v.tier >= u.tier).map(u => {
      const mx = Math.max(0, Math.min(Math.floor(room / u.room), ...u.cost.map((c, i) => c ? Math.floor(s[i] / c) : Infinity)));
      return `<div class="opt"><img src="${spr(unitSprite(u.i))}" alt=""><div><div class="row"><span class="n">${esc(u.name)}</span><span class="muted">max ${mx}</span></div><div class="c">${u.cost.map((c, i) => `${icon(RES[i])}${c}`).join(' ')} · ${dur(each(u))} each</div><div class="row" style="justify-content:flex-start;margin-top:4px"><input type="number" id="tr-${u.i}" min="1" max="${Math.max(1, mx)}" value="${Math.max(1, Math.min(mx, 10))}" class="numin"><button class="btn sm" data-act="train" data-u="${u.i}" ${mx ? '' : 'disabled'}>Train</button></div></div></div>`;
    }).join('') + `</div>`;
    if (room < 1) h += `<p class="bad">No room for more troops: build or upgrade the Burrow.</p>`;
  }
  h += `</div><div class="px box"><h3>On the move</h3><div class="list">${movesHtml()}</div><p class="muted">Pick a target on the World Map. Anyone can press Resolve once an army has arrived.</p></div></div>`;
  return h;
}
function tierUnlocks(t) {
  const u = CFG.units.filter(x => x.enabled && x.tier === t).map(x => x.name), b = CFG.buildings.filter(x => x.enabled && x.tier === t).map(x => x.name), x = CFG.tiers[t - 1], extra = [];
  if (x.carryPct) extra.push(`+${x.carryPct}% carry`); if (x.speedPct) extra.push(`+${x.speedPct}% army speed`); if (x.medicinePct) extra.push(`${x.medicinePct}% of fallen units return`);
  return [...u, ...b, ...extra].join(', ') || 'Nothing yet';
}
function academyPage() {
  const nv = needVillage('Academy'); if (nv) return nv;
  const ak = lv(K.ACADEMY), done = ME.v.tier;
  let h = `<h2>Academy</h2><p class="sub">${ak ? `Academy level ${ak}. Research runs one tier at a time, in order. It costs resources and SEED, and has no speed bonus.` : 'Build an Academy in your village to start research.'}</p>`;
  if (ME.study) { const r = ME.study, ready = now() >= r.readyAt; h += `<div class="px box" style="margin-bottom:14px"><div class="slot"><div class="t"><span>Researching tier ${r.tier}</span><span>${ready ? '<span class="ok">ready</span>' : dur(r.readyAt - now())}</span></div>${ready ? `<button class="btn sm go" style="margin-top:6px" data-act="resfinish">Finish research</button>` : ''}</div></div>`; }
  for (let t = 1; t <= CFG.tierCount; t++) {
    const x = CFG.tiers[t - 1], q = { cost: [0, 1, 2, 3].map(() => x.costEachUnit / UNIT), seed: x.seedUnit / UNIT, secs: x.seconds_, academy: x.academy };
    const cur = ME.study && ME.study.tier === t, isDone = t <= done, next = t === done + 1;
    const why = isDone || cur ? '' : !next ? `After tier ${t - 1}.` : ak < q.academy ? `Needs Academy ${q.academy}.` : ME.study ? 'Research is busy.' : !canPay(q.cost, q.seed) ? shortMsg(q.cost, q.seed) : '';
    h += `<div class="tier"><h4>TIER ${t} · Academy ${q.academy} · ${q.cost.map((c, i) => `${icon(RES[i])}${fmt(c)}`).join(' ')} ${icon('seed')}${fmt(q.seed)} · ${dur(q.secs)}</h4><div class="rsrch"><div class="rs ${isDone ? 'done' : cur ? 'cur' : !next ? 'lock' : ''}"><b>Unlocks</b><div class="muted" style="font-size:17px">${esc(tierUnlocks(t))}</div><div style="margin-top:6px">${isDone ? '<span class="ok">Done</span>' : cur ? '<span class="gold">In progress</span>' : `<button class="btn sm" data-act="research" ${why ? 'disabled' : ''}>Research tier ${t}</button>${why ? `<div class="why">${why}</div>` : ''}`}</div></div></div></div>`;
  }
  return h;
}
function marketPage() {
  const nv = needVillage('Market'); if (nv) return nv;
  const L = lv(K.MARKET), s = stockNow();
  let h = `<h2>Market</h2><p class="sub">No trading between players. The Market exchanges your own resources: give 100 of one, get ${L ? marketRate(L) : `${marketRate(1)} or more`} of another. SEED can be given at the same rate, but no resource ever turns back into SEED.</p>`;
  if (!L) return h + `<div class="px box"><p class="muted">Build a Market in your village.</p></div>`;
  h += `<div class="px box"><h3>Exchange · Market level ${L} · 100 → ${marketRate(L)}</h3><div class="mkt">
    <label>Give<select id="mk-from">${RES.map((r, i) => `<option value="${i}">${RES_NAME[r]} (${fmt(s[i])})</option>`).join('')}<option value="4">SEED (${fmt(ME.seed)}), one way</option></select></label>
    <label>Get<select id="mk-to">${RES.map((r, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${RES_NAME[r]}</option>`).join('')}</select></label>
    <label>Amount<input type="number" id="mk-amt" min="100" step="100" value="500"></label>
    <button class="btn" data-act="exchange">Exchange</button></div><p class="muted" id="mk-out"></p></div>`;
  return h + `<div class="px box" style="margin-top:14px"><h3>Treasury</h3><p class="muted">The output boost, peace shield and banner are in the Town Hall panel of your village.</p></div>`;
}
function mkPreview() { const o = $('#mk-out'); if (!o || !CFG) return; const L = lv(K.MARKET), a = Math.floor((+$('#mk-amt').value || 0) / 100); o.textContent = `${fmt(a * 100)} given → ${fmt(a * marketRate(L))} ${RES_NAME[RES[+$('#mk-to').value]]}. Amounts go in lots of 100.`; }
let pending = null;
function champPage() {
  const nv = needVillage('Champion'); if (nv) return nv;
  const c = ME.champ, L = ME.clevel, sq = ME.nft > 0, hr = CFG.hero, spent = c.might + c.attack + c.defense + c.carry, total = hr.pointsPerLevel * (L - 1);
  const p = pending || { might: c.might, attack: c.attack, defense: c.defense, carry: c.carry }, used = p.might + p.attack + p.defense + p.carry, free = total - used;
  const next = hr.xpPerLevel * L * L, prev = hr.xpPerLevel * (L - 1) * (L - 1), rank = L >= 30 ? 4 : L >= 20 ? 3 : L >= 10 ? 2 : 1, k = sq ? hr.squeekPct / 100 : 1;
  const row = (key, label, val, capped) => `<span>${label}</span><b style="font-weight:400">${val}</b><button class="btn sm" data-act="pt" data-k="${key}" ${free > 0 && !capped ? '' : 'disabled'}>+1</button>`;
  let h = `<h2>Champion</h2><p class="sub">Every village has a champion. It joins your attacks or defends at home, earns XP from battles and from each claimed day, and reaches level ${hr.maxLevel}. Holding a Squeek makes it a Squeek champion: +${hr.squeekPct - 100}% XP and stats.</p>`;
  h += `<div class="px box champ"><img src="${spr('champion_' + rank + (sq ? '_sq' : ''))}" alt=""><div><div class="disp" style="font-size:22px">${sq ? 'Squeek champion' : 'Champion'} · Level ${L}</div>${sq ? `<span class="sqtag">Squeek champion · +${hr.squeekPct - 100}% XP and stats</span>` : `<span class="muted" style="font-size:17px">Hold a Squeek for +${hr.squeekPct - 100}% XP and stats</span>`}<div class="muted">${fmt(c.xp)} XP${L < hr.maxLevel ? ` · next level at ${fmt(next)}` : ' · max level'}</div><div class="prog" style="max-width:360px"><i style="width:${L < hr.maxLevel ? clamp((c.xp - prev) / Math.max(1, next - prev) * 100, 0, 100).toFixed(0) : 100}%"></i></div><p class="muted">Status: ${c.away ? 'with an army' : 'at home, defending'}</p>
  <h3 style="margin-top:10px">Points to spend: <span class="num">${free}</span></h3><div class="pts">
  ${row('might', 'Might · own power', fmt((hr.mightBase + hr.mightPerPoint * p.might) * k), false)}${row('attack', `Attack bonus (max ${hr.statCap} points)`, `+${(p.attack * hr.attackPerPointMilli / 1e4 * k).toFixed(1)}%`, p.attack >= hr.statCap)}${row('defense', `Defense bonus (max ${hr.statCap} points)`, `+${(p.defense * hr.defensePerPointMilli / 1e4 * k).toFixed(1)}%`, p.defense >= hr.statCap)}${row('carry', `Carry bonus (max ${hr.statCap} points)`, `+${(p.carry * hr.carryPerPointMilli / 1e4 * k).toFixed(0)}%`, p.carry >= hr.statCap)}</div>
  ${used > spent ? `<div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn go" data-act="ptsave">Save ${used - spent} point${used - spent > 1 ? 's' : ''}</button><button class="btn ghost sm" data-act="ptreset">Undo</button></div><p class="muted">Points cannot be moved once saved.</p>` : ''}</div></div>`;
  return h;
}
function clanPage() {
  const nv = needVillage('Clan'); if (nv) return nv;
  const L = lv(K.CLAN), so = CFG.social, hall = BK(K.CLAN);
  let h = `<h2>Clan</h2><p class="sub">Clanmates cannot attack each other and can send troops to defend each other. You join by the founder's invitation.</p>`;
  if (!ME.clanId) {
    const inv = [...W.invites.values()].filter(i => i.player === S.me && i.open);
    if (!L) h += `<div class="px box"><p class="muted">${ME.v.tier >= hall.tier ? 'Build a Clan Hall in your village.' : `Research tier ${hall.tier} in the Academy, then build a Clan Hall.`} Level ${so.joinHall} lets you join a clan, level ${so.foundHall} lets you found one.</p></div>`;
    if (inv.length) h += `<div class="px box" style="margin-top:10px"><h3>Invitations</h3>${inv.map(i => `<div class="row card"><span>${esc(clanName(i.clanId))}</span><button class="btn sm" data-act="join" data-id="${i.clanId}" ${L >= so.joinHall ? '' : 'disabled'}>Join</button></div>`).join('')}${L >= so.joinHall ? '' : `<p class="why">Clan Hall ${so.joinHall} is needed to accept.</p>`}</div>`;
    else if (L) h += `<div class="px box" style="margin-top:10px"><p class="muted">No invitations yet. Ask a clan founder to invite <span class="addr">${S.me}</span>.</p></div>`;
    if (L >= so.foundHall) h += `<div class="px box" style="margin-top:10px"><h3>Found a clan</h3><div class="mkt"><label>Clan name<input id="cl-name" maxlength="24" placeholder="The_Night_Wheel"></label><button class="btn" data-act="found">Found clan</button></div><p class="muted">3 to 24 letters, digits or _. Up to ${Math.min(so.maxMembers, so.capPerHall * L)} members at Clan Hall ${L}.</p></div>`;
    else if (L) h += `<p class="muted">Clan Hall level ${so.foundHall} lets you found your own clan.</p>`;
    return h;
  }
  const c = ME.clan || { name: clanName(ME.clanId), members: [], capacity: 0, founder: '' }, founder = c.founder === S.me;
  h += `<div class="grid2"><div class="px box"><h3>${esc(c.name)} · ${c.members.length} / ${c.capacity}</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Player</th><th>Village</th></tr></thead><tbody>${c.members.map(m => { const pl = W.players.get(m) || {}; const [x, y] = tileXY(pl.tile || 0); return `<tr><td>${who(pl.name, m)}${m === c.founder ? ' <span class="muted">(founder)</span>' : ''}</td><td><button class="lnk" data-act="gotile" data-t="${pl.tile}">(${x}|${y})</button></td></tr>`; }).join('')}</tbody></table></div>
  <div class="row" style="justify-content:flex-start;margin-top:10px;flex-wrap:wrap">${founder ? `<button class="btn sm alt" data-act="raisecap">Raise cap to Clan Hall level</button>` : ''}<button class="btn ghost sm" data-act="leave">${founder && c.members.length > 1 ? 'Leave (founder leaves last)' : 'Leave clan'}</button></div></div>`;
  if (founder) {
    const open = [...W.invites.values()].filter(i => i.clanId === ME.clanId && i.open);
    h += `<div class="px box"><h3>Invite a player</h3><div class="mkt"><label>Village name or 0x address<input id="cl-inv" maxlength="42" placeholder="e.g. AmberPaw42"></label><button class="btn" data-act="invname">Invite</button></div><p class="muted">They join from their Clan page. You can also invite from the World Map.</p>${open.length ? `<h3 style="margin-top:10px">Open invitations</h3>${open.map(i => `<div class="row card"><span>${who(nameOf(i.player), i.player)}</span><button class="btn ghost sm" data-act="uninvite" data-a="${i.player}">Withdraw</button></div>`).join('')}` : ''}</div>`;
  }
  return h + '</div>';
}
function rankingPage() {
  if (!SW.D) return `<h2>Ranking</h2><div class="px box"><p class="muted">Season 2 is not deployed yet.</p></div>`;
  const cat = S.ui.rk || 'gen', wk = !!S.ui.rkw;
  const CATS = [['gen', 'Overall'], ['atk', 'Attackers'], ['def', 'Defenders'], ['loot', 'Raiders'], ['clan', 'Clans']];
  let h = `<h2>Ranking</h2><p class="sub">Every village, straight from the contract counters. <b>Overall = Build + Research + Combat</b>, where Combat = (attack + defense points) ÷ 200, never more than Build.</p>
  <details class="how"><summary>How points are counted</summary><ul><li><b>Build</b>: resources and SEED spent on finished buildings and fields ÷ 100.</li><li><b>Research</b>: resources and SEED spent on finished research ÷ 100.</li><li><b>Attack / defense points</b>: resource value of the troops you killed. Raids on much weaker villages and wild camps give none.</li><li><b>Clans</b>: the sum of their members' Overall.</li></ul></details>`;
  h += `<div class="filters">${CATS.map(([k, n]) => `<button class="btn sm ${cat === k ? '' : 'ghost'}" data-act="rk" data-k="${k}" aria-pressed="${cat === k}">${n}</button>`).join('')}<button class="btn sm alt" data-act="rkw">${wk ? `Week ${G.week + 1}` : 'Whole season'} ⇄</button></div>`;
  if (!W.rank) return h + `<div class="px box"><p class="muted">Reading the counters…</p></div>`;
  const per = r => wk ? r.week : r.season;
  if (cat === 'clan') {
    const rows = [...W.clans.values()].map(c => ({ c, pts: (c.members || []).reduce((s, m) => { const r = W.rank.find(x => x.addr === m); return s + (r ? per(r).overall : 0); }, 0) })).sort((a, b) => b.pts - a.pts);
    return h + `<div class="px box"><div class="tblwrap"><table class="tbl rank"><thead><tr><th>#</th><th>Clan</th><th>Members</th><th>Overall</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${ME && r.c.id === ME.clanId ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.c.name)}</td><td class="r">${(r.c.members || []).length}</td><td class="r">${fmt(r.pts)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No clans yet.</td></tr>'}</tbody></table></div></div>`;
  }
  const val = r => { const x = per(r); return cat === 'gen' ? x.overall : cat === 'atk' ? x.attack : cat === 'def' ? x.defense : x.loot; };
  const rows = W.rank.slice().sort((a, b) => val(b) - val(a) || (a.addr === S.me ? -1 : 1));
  const row = (r, i) => { const x = per(r), pl = W.players.get(r.addr) || {}, [tx, ty] = tileXY(pl.tile || 0), cl = W.clanOf.get(r.addr); const b = Math.floor(x.build), rs = Math.floor(x.research);
    return `<tr class="${r.addr === S.me ? 'me' : ''}"><td>${i + 1}</td><td>${who(pl.name, r.addr)}${cl ? ` <span class="muted">[${esc(clanName(cl))}]</span>` : ''}</td><td><button class="lnk" data-act="gotile" data-t="${pl.tile}">(${tx}|${ty})</button></td><td class="r">${fmt(val(r))}</td>${cat === 'gen' ? `<td class="r muted">${fmt(b)}</td><td class="r muted">${fmt(rs)}</td><td class="r muted">${fmt(Math.max(0, x.overall - b - rs))}</td>` : ''}</tr>`; };
  const me = rows.findIndex(r => r.addr === S.me), top = rows.slice(0, 50);
  h += `<div class="px box"><div class="tblwrap"><table class="tbl rank"><thead><tr><th>#</th><th>Player</th><th>Village</th><th>${{ gen: 'Overall', atk: 'Attack pts', def: 'Defense pts', loot: 'Looted' }[cat]}</th>${cat === 'gen' ? '<th>Build</th><th>Research</th><th>Combat</th>' : ''}</tr></thead><tbody>${top.map(row).join('')}${me >= 50 ? `<tr><td colspan="7" class="muted">…</td></tr>${row(rows[me], me)}` : ''}</tbody></table></div><p class="muted">${me >= 0 ? `You are #${me + 1} of ${rows.length}.` : `${rows.length} villages.`}</p></div>`;
  return h;
}
function reportsPage() {
  if (!S.me) return `<h2>Reports</h2><div class="px box"><p class="muted">Connect a wallet to see your battles.</p></div>`;
  const mine = [...W.moves.values()].filter(m => m.owner === S.me || m.target === S.me).sort((a, b) => b.block - a.block);
  let h = `<h2>Reports</h2><p class="sub">Your raids, defenses, scouting and support, read from the contract events.</p>`;
  if (!mine.length) return h + `<div class="px box"><p class="muted">No battles yet. When your shield ends, neighbours may attack; you can raid wild camps and villages when your attack beats their defense by enough.</p></div>`;
  h += mine.slice(0, 60).map(m => {
    const atk = m.owner === S.me, other = atk ? (m.target === ZERO ? `${CAMP_NAME[m.campId % 3]} #${m.campId}` : nameOf(m.target)) : nameOf(m.owner);
    const b = W.battles.get(m.id), sc = m.mode === 2 ? W.scouts.find(s => s.player === m.owner && s.block >= m.block) : null;
    const title = m.mode === 2 ? `Scouting ${atk ? 'of' : 'by'} ${other}` : m.mode === 3 ? `Support ${atk ? 'to' : 'from'} ${other}` : `${atk ? 'Raid on' : 'Defense against'} ${other}`;
    let res = 'Under way', cls = '', lines = [];
    if (b) { const won = atk ? b.decisive : !b.decisive; res = b.decisive ? (atk ? 'Victory' : 'Defeat') : 'Repelled'; cls = won ? 'w' : 'l'; lines.push(`Attack ${fmt(b.attack)} vs defense ${fmt(b.defense)}${b.decisive ? ' · decisive' : ''}`, `Attacker lost troops worth ${fmt(b.aLost)} · defender lost ${fmt(b.dLost)}`); }
    else if (sc) { res = sc.success ? 'Scouted' : 'Scouts lost'; cls = 's'; if (sc.success) lines.push(`+${CFG ? CFG.war.scoutBonusPct : 10}% attack on this village until ${new Date(sc.until * 1000).toUTCString().slice(5, 22)} UTC`); }
    else if (m.events.length) { res = m.events.some(e => e.mode === 6) ? 'Back home' : 'Resolved'; cls = 's'; }
    return `<div class="px report"><div class="h"><span>${esc(title)}</span><span class="${cls}">${res} · ${new Date(m.arriveAt * 1000).toUTCString().slice(5, 22)} UTC</span></div>${lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  }).join('');
  return h;
}

// ------------------------------------------------------------------ public rule change log (the editor lives in owner.html)
// ------------------------------------------------------------------ village page (#visit=Name), for sharing
const visitData = new Map();
async function loadVisit(addr) {
  const r = await SW.multi([['villages', 'village', [addr]], ['army', 'championLevel', [g(), addr]], ['clans', 'clanOf', [g(), addr]], ['ledger', 'nftBalance', [addr]], ['villages', 'effectiveWalls', [addr]]]);
  const [v, cl, clanId, nft, walls] = r;
  visitData.set(addr, { at: Date.now(), v: v && { name: v.name, tile: N(v.tile), foundedAt: N(v.foundedAt), tier: N(v.tier), fields: [...v.fields].map(N), b: [...v.buildings].map(N), shieldUntil: N(v.shieldUntil) }, level: N(cl), clanId: N(clanId), nft: N(nft), walls: N(walls) });
  dirty();
}
const siteUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
function visitPage() {
  const name = S.visit || '', key = name.toLowerCase();
  if (!SW.D) return '<h2>Village</h2><div class="px box"><p class="muted">Season 2 is not deployed yet.</p></div>';
  const p = [...W.players.values()].find(x => x.name.toLowerCase() === key);
  if (!p) return `<h2>${esc(name)}</h2><div class="px box"><p class="muted">${W.players.size ? `There is no village called "${esc(name)}" in this season.` : 'Reading the map…'}</p><a class="btn sm" style="text-decoration:none" href="#village">Play Squeek Wars</a></div>`;
  const d = visitData.get(p.addr);
  if (!d || Date.now() - d.at > 60000) loadVisit(p.addr).catch(() => { });
  if (!d || !d.v || !CFG) return `<h2>${esc(p.name)}</h2><div class="px box"><p class="muted">Reading the village…</p></div>`;
  const v = d.v, [x, y] = tileXY(v.tile), mine = p.addr === S.me, url = `${siteUrl()}#visit=${encodeURIComponent(p.name)}`;
  const ranked = W.rank ? W.rank.slice().sort((a, b) => b.season.overall - a.season.overall) : null, place = ranked ? ranked.findIndex(r => r.addr === p.addr) + 1 : 0;
  const built = [];
  for (let i = 0; i < NKINDS; i++) if (v.b[i] > 0 && BK(i).enabled) built.push(i);
  const fig = i => { const L = v.b[i], art = i === K.TH ? { s: 'town_hall' } : i === K.WALLS ? { s: 'walls' } : kindArt(i), sname = art.one ? art.s : `${art.s}_${clamp(Math.ceil(Math.max(1, L) * 5 / Math.max(1, BK(i).maxLevel)), 1, 5)}`; return `<figure><img src="${spr(sname)}" alt="" loading="lazy"><figcaption>${esc(BK(i).name)} · ${L}</figcaption></figure>`; };
  const text = mine ? `My hamster village ${p.name} in Squeek Wars: Town Hall ${v.b[K.TH]}, champion level ${d.level}${place ? `, #${place} in the ranking` : ''}. Come and raid me if you can.` : `${p.name}'s hamster village in Squeek Wars`;
  const stat = (k, val) => `<div class="vs px"><span>${k}</span><b>${val}</b></div>`;
  let h = `<h2>${esc(p.name)}${mine ? ' <span class="tag gold">your village</span>' : ''}</h2><p class="sub">A hamster village on the Squeek Wars map at (${x}|${y}) · <span class="addr">${shortAddr(p.addr)}</span> · founded ${new Date(v.foundedAt * 1000).toISOString().slice(0, 10)}</p>`;
  h += `<div class="vstats">${stat('Town Hall', v.b[K.TH])}${stat('Walls', d.walls)}${stat('Buildings', built.length)}${stat('Research tier', v.tier)}${stat(d.nft ? 'Squeek champion' : 'Champion', `level ${d.level}`)}${stat('Clan', d.clanId ? esc(clanName(d.clanId)) : '–')}${stat('Ranking', place ? `#${place} of ${ranked.length}` : '…')}${stat('Fields', v.fields.reduce((a, b) => a + b, 0) + ' levels')}</div>`;
  h += `<div class="px box"><h3>Buildings</h3><div class="looks vlooks">${built.map(fig).join('')}</div></div>`;
  h += `<div class="px box share"><h3>${mine ? 'Share your village' : 'Share this village'}</h3><div class="mkt"><input readonly value="${esc(url)}" onclick="this.select()"><button class="btn sm" data-act="copylink" data-u="${esc(url)}" type="button">Copy link</button><a class="btn sm alt" style="text-decoration:none" target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}">Post on X</a></div></div>`;
  h += `<div class="row" style="justify-content:flex-start;gap:8px;margin-top:12px"><button class="btn ghost sm" data-act="gotile" data-t="${v.tile}" type="button">See it on the world map</button>${mine ? '<a class="btn ghost sm" style="text-decoration:none" href="#village">Back to my village</a>' : `<a class="btn sm" style="text-decoration:none" href="#village">${S.me && ME && ME.v ? 'Back to my village' : 'Play Squeek Wars'}</a>`}</div>`;
  return h;
}

// ------------------------------------------------------------------ browser notifications (while a Squeek Wars tab is open)
const NT_KEY = 'sw-notified-v1';
const NT = { seen: new Set((() => { try { return JSON.parse(localStorage.getItem(NT_KEY)) || []; } catch (e) { return []; } })()), primedFor: undefined };
const notifOn = () => !!S.ui.notif && 'Notification' in window && Notification.permission === 'granted';
const saveNT = () => { try { localStorage.setItem(NT_KEY, JSON.stringify([...NT.seen].slice(-400))); } catch (e) { } };
function updNotifBtn() { const b = $('#wm-notif'); if (b) b.textContent = `Notifications: ${notifOn() ? 'on' : 'off'}`; }
function toggleNotif() {
  if (!('Notification' in window)) return note('This browser cannot show notifications here.', 'bad');
  if (notifOn()) { S.ui.notif = false; saveUI(); updNotifBtn(); return note('Notifications off'); }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') { S.ui.notif = true; saveUI(); note('Notifications on while a Squeek Wars tab is open', 'ok'); try { new Notification('Squeek Wars', { body: 'Notifications are on.', icon: 'assets/favicon-64.png' }); } catch (e) { } }
    else note('The browser blocked notifications for this site. Allow them in the site settings.', 'bad');
    updNotifBtn();
  });
}
function notifyEvents() {
  const ev = [], t = now(), me = S.me;
  if (ME && ME.v) {
    ME.orders.forEach(o => { if (o && o.readyAt <= t) ev.push([`o:${me}:${o.target}:${o.level}`, `${targetName(o.target)} level ${o.level} is ready`, 'Open your village to finish it.', 'village']); });
    if (ME.study && ME.study.readyAt <= t) ev.push([`s:${me}:${ME.study.tier}`, `Research tier ${ME.study.tier} is done`, 'Finish it in the Academy.', 'academy']);
    if (ME.training && ME.training.readyAt <= t) ev.push([`t:${me}:${ME.training.readyAt}`, `${fmt(ME.training.count)} ${UN(ME.training.kind).name} trained`, 'They are ready in the Army tab.', 'army']);
    ME.moves.forEach(m => {
      if (m.target === me && m.owner !== me && (m.mode === 1 || m.mode === 2) && m.arriveAt > t) ev.push([`in:${m.id}`, `Incoming ${m.mode === 2 ? 'scouts' : 'raid'} from ${nameOf(m.owner)}`, `It arrives in ${dur(m.arriveAt - t)}.`, 'army']);
      if (m.owner === me && m.mode === 4 && m.arriveAt <= t) ev.push([`back:${m.id}`, 'Your troops are back', m.campId ? 'From a wild camp.' : `From ${nameOf(m.target)}.`, 'army']);
    });
    if (ME.claim && ME.claim.seed > 0) ev.push([`claim:${me}:${G.obsCount}`, `Claim ${fmt(ME.claim.seed)} SEED`, "The hamster's day is recorded.", 'village']);
  }
  if (G.ok && needCheckpoint()) ev.push([`cp:${G.day}`, 'A new day in Squeek Wars', "Press Checkpoint to record the hamster's work for every village.", 'village']);
  if (chatOn()) {
    newsList().slice(0, 5).forEach(n => ev.push([`n:${n.key}`, n.kind === 'rule' ? `Rule change: ${ruleText(n.c)}` : n.title, n.kind === 'rule' ? `The rule table is now at version ${n.c.version}.` : (n.text || 'New announcement').slice(0, 140), 'news']));
    if (ME && ME.v) { const at = '@' + ME.v.name.toLowerCase(); W.chat.slice(-30).forEach(m => { if (m.from !== me && !W.hiddenMsg.get(m.id) && m.text.toLowerCase().includes(at)) ev.push([`c:${m.id}`, `${nameOf(m.from)} mentioned you`, m.text.slice(0, 140), 'chat']); }); }
  }
  return ev;
}
function notifyCheck() {
  if (!G.ok || (S.me && !ME)) return;                        // wait for the first full read
  const ev = notifyEvents();
  if (NT.primedFor !== S.me) { ev.forEach(e => NT.seen.add(e[0])); NT.primedFor = S.me; saveNT(); return; }   // what is already true on load is not news
  let changed = false;
  for (const [k, title, body, go] of ev) {
    if (NT.seen.has(k)) continue; NT.seen.add(k); changed = true;
    if (!notifOn()) continue;
    if (document.hidden) {
      try { const n = new Notification(title, { body, icon: 'assets/favicon-64.png', tag: k }); n.onclick = () => { window.focus(); if (go === 'news' || go === 'chat') openChat(go); else location.hash = go; n.close(); }; } catch (e) { }
    } else note(title, 'ok');
  }
  if (changed) saveNT();
}

// ------------------------------------------------------------------ chat and announcements (Chat contract, add-on)
const CHAT_KEY = 'sw-chat-seen-v1';
const CH = { open: false, tab: 'chat', seen: (() => { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch (e) { return {}; } })(), formKey: '', listKey: '', poll: 0 };
const saveSeen = () => { try { localStorage.setItem(CHAT_KEY, JSON.stringify(CH.seen)); } catch (e) { } };
const WHAT_NAME = { economy: 'Economy', storage: 'Storage, Vault and Burrow', war: 'War', hero: 'Champion', wild: 'Wild camps', social: 'Clans', fieldCosts: 'Field costs', unit: 'Unit', building: 'Building', tier: 'Research tier', tierCount: 'Research tiers in play' };
const chatOn = () => !!SW.ADDR.chat;
const blockTime = b => G.headBlock ? G.headTime - (G.headBlock - b) * 12 : 0;          // Sepolia makes a block every 12 s
function ago(t) { if (!t) return ''; const d = Math.max(0, now() - t); return d < 60 ? 'now' : d < 3600 ? `${Math.floor(d / 60)}m` : d < 86400 ? `${Math.floor(d / 3600)}h` : `${Math.floor(d / 86400)}d`; }
const bytesOf = t => new TextEncoder().encode(t).length;
const linkify = h => h.replace(/https:\/\/[^\s<]+[^\s<.,;:!?)]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
function newsList() {
  const rules = W.changes.map((c, k) => ({ kind: 'rule', key: `r${c.version}`, b: c.block, i: k, c }));
  return W.news.filter(n => !W.hiddenMsg.get(n.id) || isOwner()).map(n => ({ ...n, key: `a${n.id}` })).concat(rules).sort((x, y) => y.b - x.b || y.i - x.i);
}
const newsMark = n => n.b * 100000 + n.i;
function chatUnread() {
  const lastChat = CH.seen.chat || 0, lastNews = CH.seen.news || 0;
  const c = W.chat.filter(m => m.id > lastChat && m.from !== S.me && !W.hiddenMsg.get(m.id)).length;
  const n = newsList().filter(x => newsMark(x) > lastNews).length;
  return { c, n };
}
function markSeen() {
  if (!CH.open) return;
  if (CH.tab === 'chat' && W.chat.length) CH.seen.chat = Math.max(CH.seen.chat || 0, W.chat[W.chat.length - 1].id);
  if (CH.tab === 'news') { const l = newsList(); if (l.length) CH.seen.news = Math.max(CH.seen.news || 0, newsMark(l[0])); }
  saveSeen();
}
function ruleText(c) {
  const nm = WHAT_NAME[c.what] || c.what, x = c.what === 'unit' && CFG ? ` ${c.index + 1} · ${UN(c.index).name}` : c.what === 'building' && CFG ? ` ${c.index + 1} · ${BK(c.index).name}` : c.what === 'tier' ? ` ${c.index}` : c.what === 'tierCount' ? `: ${c.index}` : '';
  return `${nm}${x}`;
}
function chatItems() {
  const own = isOwner(), team = CFG && CFG.owner;
  if (CH.tab === 'news') {
    const l = newsList();
    if (!l.length) return '<p class="muted cm-empty">No announcements yet. Rule changes appear here by themselves.</p>';
    return l.map(n => n.kind === 'rule'
      ? `<div class="an rule"><div class="an-h"><span class="tag">Rule change</span><b>${esc(ruleText(n.c))}</b><span class="t">${ago(blockTime(n.b))}</span></div><div class="an-t">The rule table is now at version ${n.c.version}. ${SW.D && !SW.D.local ? `<a href="https://sepolia.etherscan.io/tx/${n.c.tx}" target="_blank" rel="noopener">See the change</a>` : ''}</div></div>`
      : `<div class="an ${W.hiddenMsg.get(n.id) ? 'hid' : ''}"><div class="an-h"><span class="tag gold">Announcement</span><b>${esc(n.title)}</b><span class="t">${ago(blockTime(n.b))}</span>${own ? `<button class="lnk" data-act="chide" data-id="${n.id}" data-h="${W.hiddenMsg.get(n.id) ? 0 : 1}">${W.hiddenMsg.get(n.id) ? 'Show' : 'Hide'}</button>` : ''}</div>${n.text ? `<div class="an-t">${linkify(esc(n.text)).replace(/\n/g, '<br>')}</div>` : ''}</div>`).join('');
  }
  const l = W.chat.filter(m => own || !W.hiddenMsg.get(m.id)).slice(-200);
  if (!l.length) return '<p class="muted cm-empty">No messages yet. Say hello to the other villages.</p>';
  return l.map(m => {
    const p = W.players.get(m.from), hid = W.hiddenMsg.get(m.id), mut = W.muted.get(m.from);
    const tools = own ? `<button class="lnk" data-act="chide" data-id="${m.id}" data-h="${hid ? 0 : 1}">${hid ? 'Show' : 'Hide'}</button><button class="lnk" data-act="cmute" data-a="${m.from}" data-m="${mut ? 0 : 1}">${mut ? 'Unmute' : 'Mute'}</button>` : '';
    return `<div class="cm ${m.from === S.me ? 'me' : ''} ${hid ? 'hid' : ''}"><div class="cm-h"><b>${p ? `<a href="#visit=${encodeURIComponent(p.name)}">${esc(p.name)}</a>` : shortAddr(m.from)}</b>${m.from === team ? '<span class="tag gold">team</span>' : ''}<span class="t">${ago(blockTime(m.b))}</span>${tools}</div><div class="cm-t">${linkify(esc(m.text))}</div></div>`;
  }).join('');
}
function chatForm() {
  if (CH.tab === 'news') return isOwner() ? `<input id="an-title" maxlength="80" placeholder="Title" autocomplete="off"><textarea id="an-text" rows="3" placeholder="Announcement for every player (links allowed)"></textarea><div class="row"><span class="muted cnt" id="an-cnt"></span><button class="btn sm" data-act="annsend" type="button">Post announcement</button></div>` : '';
  if (!S.me) return `<p class="muted">Connect a wallet to talk.</p><button class="btn sm" data-act="wb-open" type="button">Connect wallet</button>`;
  if (!ME || ME.none) return `<p class="muted">Found a village to talk in the chat.</p><button class="btn sm" data-act="nm-open" type="button">Found village</button>`;
  if (W.muted.get(S.me)) return '<p class="muted">This wallet is muted in the chat.</p>';
  return `<textarea id="chat-in" rows="2" placeholder="Say something to every village…" autocomplete="off"></textarea><div class="row"><span class="muted cnt" id="chat-cnt">280 left · each message is a Sepolia transaction</span><button class="btn sm" data-act="chatsend" type="button">Send</button></div>`;
}
function renderChat() {
  const btn = $('#chatbtn'); if (!btn) return;
  btn.hidden = !chatOn();
  if (!chatOn()) return;
  const u = chatUnread(), total = u.c + u.n;
  const b = $('#chatbadge'); b.hidden = CH.open || !total; b.textContent = total > 99 ? '99+' : total;
  const nb = $('#newsbadge'); nb.hidden = !u.n || CH.tab === 'news'; nb.textContent = u.n;
  const cb = $('#chatbadge2'); cb.hidden = !u.c || CH.tab === 'chat'; cb.textContent = u.c;
  $('#chatbox').hidden = !CH.open;
  if (!CH.open) return;
  document.querySelectorAll('#chatbox .chat-tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === CH.tab));
  const fk = `${CH.tab}:${S.me}:${ME && !ME.none}:${isOwner()}:${W.muted.get(S.me)}`;
  if (fk !== CH.formKey) { $('#chatform').innerHTML = chatForm(); CH.formKey = fk; }
  const list = $('#chatlist'), html = chatItems();
  if (html !== CH.listKey) {
    const atEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 40 || !CH.listKey;
    list.innerHTML = html; CH.listKey = html;
    if (CH.tab === 'chat' && atEnd) list.scrollTop = list.scrollHeight; else if (CH.tab === 'news' && !CH.keepScroll) list.scrollTop = 0;
  }
  markSeen();
}
function openChat(tab) { CH.open = true; if (tab) CH.tab = tab; CH.listKey = ''; renderChat(); pollChat(); }
async function pollChat() {
  if (!chatOn() || CH.polling) return; CH.polling = true;
  try { processLogs(await SW.syncLogs()); } catch (e) { } finally { CH.polling = false; }
  renderChat();
}
async function sendChat() {
  const i = $('#chat-in'); if (!i) return; const text = i.value.trim();
  if (!text) return; const n = bytesOf(text); if (n > 280) return note(`That is ${n} bytes: 280 at most.`, 'bad');
  if (await act('Send message', 'chat', 'say', [text])) { const j = $('#chat-in'); if (j) j.value = ''; chatCount(); await pollChat(); }
}
async function sendAnnouncement() {
  const t = $('#an-title').value.trim(), x = $('#an-text').value.trim();
  if (!t) return note('Give the announcement a title.', 'bad');
  if (bytesOf(t) > 80 || bytesOf(x) > 2000) return note('Title up to 80 bytes, text up to 2,000.', 'bad');
  if (await act('Post announcement', 'chat', 'announce', [t, x])) { $('#an-title').value = ''; $('#an-text').value = ''; chatCount(); await pollChat(); }
}
function chatCount() {
  const i = $('#chat-in'), c = $('#chat-cnt'); if (i && c) { const left = 280 - bytesOf(i.value); c.textContent = `${left} left · each message is a Sepolia transaction`; c.classList.toggle('bad', left < 0); }
  const a = $('#an-text'), ac = $('#an-cnt'); if (a && ac) { const left = 2000 - bytesOf(a.value); ac.textContent = `${left} left`; ac.classList.toggle('bad', left < 0); }
}
function chatInit() {
  if (!$('#chatbtn')) return;
  $('#chatbtn').addEventListener('click', () => { if (CH.open) { CH.open = false; renderChat(); } else openChat(); });
  document.addEventListener('input', e => { if (e.target.id === 'chat-in' || e.target.id === 'an-text') chatCount(); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'chat-in') { e.preventDefault(); sendChat(); } });
  setInterval(() => { if (CH.open && !document.hidden) pollChat(); else renderChat(); }, 8000);
  renderChat();
}
function changeLog() {
  const list = W.changes.slice().reverse();
  return `<div class="px box" style="margin-top:14px"><h3>Rule change log</h3>${list.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Version</th><th>What</th><th>Block</th></tr></thead><tbody>${list.map(c => `<tr><td>${c.version}</td><td>${esc(c.what)}${c.what === 'unit' ? ` ${c.index + 1} (${esc(CFG ? UN(c.index).name : '')})` : c.what === 'building' ? ` ${c.index + 1} (${esc(CFG ? BK(c.index).name : '')})` : c.what === 'tier' || c.what === 'tierCount' ? ` ${c.index}` : ''}</td><td>${SW.D && !SW.D.local ? `<a href="https://sepolia.etherscan.io/tx/${c.tx}" target="_blank" rel="noopener">${c.block}</a>` : c.block}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No changes since the season started: the rules are the launch defaults.</p>'}</div>`;
}
// ------------------------------------------------------------------ routing and render loop
const VIEWS = ['home', 'village', 'world', 'army', 'academy', 'market', 'clan', 'champion', 'ranking', 'reports', 'visit'];
function route() {
  let h = location.hash.slice(1);
  if (/^visit=/.test(h)) { S.visit = decodeURIComponent(h.slice(6)); h = 'visit'; } else if (h === 'visit') h = '';
  const v = VIEWS.includes(h) ? h : 'home';
  S.view = v;
  $('#home').classList.toggle('on', v === 'home'); $('#game').hidden = v === 'home';
  for (const id of VIEWS.slice(1)) $('#' + id).classList.toggle('on', id === v);
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  if (v === 'home' && h) document.getElementById(h)?.scrollIntoView();
  if (v !== 'home' && !S.ui.net) $('#netbox').hidden = false;
  else if (v !== 'home' && SW.D && !S.me && !S.ui.look && !['world', 'ranking', 'visit'].includes(v)) openWallet();
  if ((v === 'ranking' || v === 'visit') && !W.rank && SW.D) loadRanking().then(dirty).catch(() => { });
  if (v === 'world' && S.wsel !== null) loadTarget(S.wsel).catch(() => { });
  sceneDirty = true; needFull = true; layout(); render(true);
}
function panel(id, html, closable) {
  html = html.replace('<button class="btn ghost sm sheet-close" data-act="close">Close</button>', '');
  const m = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/); const title = m ? m[1] : ''; const body = m ? html.replace(m[0], '') : html;
  const min = S.ui.min[id];
  return `<div class="ph"><h3>${title}</h3><span class="pbtn">${closable ? '<button class="btn ghost sm sheet-close" data-act="close">Close</button>' : ''}<button class="btn ghost sm" data-act="min" data-p="${id}" aria-expanded="${!min}">${min ? 'Show' : 'Hide'}</button></span></div>${min ? '' : body}`;
}
let lastFull = 0, lastBar = 0, pdown = false;
addEventListener('pointerdown', () => { pdown = true; }, true);
addEventListener('pointerup', () => { setTimeout(() => { pdown = false; }, 0); }, true);
function render(force) {
  if (S.view === 'home') return;
  const t = performance.now();
  if (force || t - lastBar > 500) { renderBar(); lastBar = t; }
  const a = document.activeElement, typing = (a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA')) || (pdown && !force);
  const full = force || needFull || t - lastFull > 1000;
  if (S.view === 'village') {
    if (sceneDirty) { renderSceneBase(); setHTML($('#splates'), scenePlates()); sceneDirty = false; }
    else if (full) setHTML($('#splates'), scenePlates());
    if (full && !typing) { setHTML($('#vleft'), panel('vleft', villageLeft(), false)); setHTML($('#vright'), panel('vright', detailPanel(), true)); }
  }
  if (S.view === 'world') {
    drawWorld();
    if (full && !typing) {
      setHTML($('#wleft'), panel('wleft', worldLeft(), false)); drawMini();
      const keep = {}; document.querySelectorAll('#wright input').forEach(i => keep[i.id] = i.type === 'checkbox' ? i.checked : i.value);
      setHTML($('#wright'), panel('wright', worldRight(), true));
      for (const id in keep) { const el = document.getElementById(id); if (el) el.type === 'checkbox' ? el.checked = keep[id] : el.value = keep[id]; }
      updatePrediction();
    }
  }
  if (full && !typing) {
    if (S.view === 'army') setHTML($('#army'), armyPage());
    if (S.view === 'academy') setHTML($('#academy'), academyPage());
    if (S.view === 'market') { setHTML($('#market'), marketPage()); mkPreview(); }
    if (S.view === 'champion') setHTML($('#champion'), champPage());
    if (S.view === 'clan') setHTML($('#clan'), clanPage());
    if (S.view === 'ranking') setHTML($('#ranking'), rankingPage());
    if (S.view === 'reports') setHTML($('#reports'), reportsPage());
    if (S.view === 'visit') setHTML($('#visit'), visitPage());
    needFull = false; lastFull = t;
  }
}
function tick() { if (S.view !== 'home' && !document.hidden) { render(false); if (S.view === 'village') sceneFx(false); } requestAnimationFrame(tick); }

// ------------------------------------------------------------------ wallet, founding
function openWallet() { const b = $('#walletbox'); b.hidden = false; $('#wb-msg').textContent = SW.hasWallet() ? '' : 'No wallet found in this browser. Install MetaMask or Rabby, or open this page in your wallet app.'; }
function maybeName() { if (S.me && ME && ME.none && !['home', 'world', 'ranking', 'visit'].includes(S.view) && !S.ui.lookName) openName(); }
function openName() { $('#nm-wallet').textContent = shortAddr(S.me); const nb = $('#namebox'); nb.hidden = false; const i = $('#nm-in'); i.placeholder = i.placeholder || randomName(); if (CFG) $('#nm-gift').textContent = `Founding gives ${fmt(CFG.econ.startResources)} of each resource, ${fmt(CFG.econ.startSeed)} SEED and a ${dur(CFG.econ.shieldHours * 3600)} shield.`; }
async function foundVillage(name) {
  const why = $('#nm-why');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) { why.textContent = 'Use 3 to 16 letters, digits or _.'; return; }
  why.textContent = 'Checking the name…';
  try { const owner = await SW.call('villages', 'nameOwner', [SW.nameKey(name)]); if (!/^0x0{40}$/i.test(owner)) { why.textContent = `"${name}" is taken. Try another.`; return; } }
  catch (e) { why.textContent = SW.explain(e); return; }
  why.textContent = '';
  $('#namebox').hidden = true;
  await act(`Found ${name}`, 'villages', 'found', [name]);
  if (ME && ME.none) $('#namebox').hidden = false;
  else { note(`Welcome to Squeek Wars, ${name}!`, 'ok'); S.cam.set = false; await refresh(true); }
}
async function connectWallet() {
  $('#wb-msg').textContent = 'Waiting for your wallet…';
  try { S.me = await SW.connect(); S.ui.off = false; saveUI(); $('#walletbox').hidden = true; note(`Wallet ${shortAddr(S.me)} connected`, 'ok'); ME = null; await refresh(true); route(); }
  catch (e) { $('#wb-msg').textContent = e.message || String(e); }
}

// ------------------------------------------------------------------ clicks
function onClick(e) {
  const t = e.target.closest('[data-act],[data-sel],[data-hit]'); if (!t) return;
  if (t.dataset.hit) { if (e.detail === 0) selectHit(t); return; }
  if (t.dataset.sel) { const k = t.dataset.sel; S.sel = k === 'th' || k === 'walls' ? { kind: k } : k === 'field' ? { kind: 'field', i: +t.dataset.i } : { kind: 'b', k: +t.dataset.i }; $('#vright').classList.remove('closed'); sceneDirty = true; dirty(); return; }
  const a = t.dataset.act;
  if (a === 'close') { t.closest('.right').classList.add('closed'); return; }
  if (a === 'min') { S.ui.min[t.dataset.p] = !S.ui.min[t.dataset.p]; saveUI(); dirty(); return; }
  if (a === 'txclose') { $('#txbox').hidden = true; return; }
  if (a === 'ct') { CH.tab = t.dataset.t; CH.listKey = ''; renderChat(); return; }
  if (a === 'chatclose') { CH.open = false; renderChat(); return; }
  if (a === 'chatsend') return sendChat();
  if (a === 'annsend') return sendAnnouncement();
  if (a === 'chide') return act(t.dataset.h === '1' ? 'Hide message' : 'Show message', 'chat', 'hide', [+t.dataset.id, t.dataset.h === '1']).then(pollChat);
  if (a === 'cmute') { const w = t.dataset.a; if (t.dataset.m === '1' && !confirm(`Mute ${nameOf(w)}? They cannot post until you unmute them.`)) return; return act(t.dataset.m === '1' ? 'Mute wallet' : 'Unmute wallet', 'chat', 'mute', [w, t.dataset.m === '1']).then(pollChat); }
  if (a === 'net-test') { S.ui.net = 'testnet'; saveUI(); $('#netbox').hidden = true; if (S.view === 'home') { location.hash = 'village'; return; } route(); return; }
  if (a === 'wb-connect') return connectWallet();
  if (a === 'wm-scan') { $('#walletmenu').hidden = true; if (SW.D && !SW.D.local) window.open(`https://sepolia.etherscan.io/address/${S.me}`, '_blank', 'noopener'); return; }
  if (a === 'wm-switch') { $('#walletmenu').hidden = true; SW.switchAccount().then(acc => { S.me = acc; S.ui.off = false; saveUI(); ME = null; pending = null; S.cam.set = false; note(`Wallet ${shortAddr(acc)} connected`, 'ok'); return refresh(true); }).then(route).catch(err => note(err.message || String(err), 'bad')); return; }
  if (a === 'wm-notif') { toggleNotif(); return; }
  if (a === 'wm-share') { $('#walletmenu').hidden = true; return; }
  if (a === 'copylink') { const u = t.dataset.u; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => note('Link copied', 'ok')).catch(() => { prompt('Copy this link:', u); }); return; }
  if (a === 'wm-off') { $('#walletmenu').hidden = true; SW.disconnect().then(() => { S.me = null; ME = null; pending = null; S.ui.off = true; S.ui.look = false; saveUI(); note('Wallet disconnected'); dirty(); route(); }); return; }
  if (a === 'wb-open') return openWallet();
  if (a === 'wb-look') { S.ui.look = true; saveUI(); $('#walletbox').hidden = true; if (S.view !== 'world' && S.view !== 'ranking') location.hash = 'world'; return; }
  if (a === 'nm-open') { S.ui.lookName = false; saveUI(); return openName(); }
  if (a === 'nm-ok') return foundVillage($('#nm-in').value.trim());
  if (a === 'nm-rand') { $('#nm-in').value = randomName(); return; }
  if (a === 'nm-later') { S.ui.lookName = true; saveUI(); $('#namebox').hidden = true; return; }
  if (a === 'zin' || a === 'zout') { const st = $('#vstage'); return zoomAt(a === 'zin' ? 1.25 : 0.8, st.clientWidth / 2, st.clientHeight / 2); }
  if (a === 'zfit') { const z = zoomLimits(); vscale = Math.abs(vscale - z.fit) < 0.01 ? (innerWidth <= 900 ? 0.5 : z.cover) : z.fit; S.ui.vz = vscale; saveUI(); clampPan(); applyPan(); return; }
  if (a === 'ovtoggle') { S.ui.ovOpen = !S.ui.ovOpen; saveUI(); dirty(); return; }
  if (a === 'rk') { S.ui.rk = t.dataset.k; saveUI(); dirty(); return; }
  if (a === 'rkw') { S.ui.rkw = !S.ui.rkw; saveUI(); dirty(); return; }
  if (a === 'home' && ME && ME.v) return goTo(ME.v.tile);
  if (a === 'gotile') { location.hash = 'world'; return goTo(+t.dataset.t); }
  if (a === 'goto') { const v = $('#goto').value.trim(), m = v.match(/^\(?\s*(\d{1,2})\s*[|,; ]\s*(\d{1,2})\s*\)?$/); if (m) return goTo(+m[2] * 100 + +m[1]); const low = v.toLowerCase(); const p = [...W.players.values()].find(x => x.name.toLowerCase() === low || x.addr === low); if (p) return goTo(p.tile); return note(v ? `No village called "${v}".` : 'Type x|y or a name.', 'bad'); }
  if (a === 'amax') { const i = $('#atk-' + t.dataset.u); if (i) { i.value = ME.home[+t.dataset.u]; updatePrediction(); } return; }
  if (a === 'aall') { document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => i.value = ME.home[+i.dataset.u]); updatePrediction(); return; }
  if (a === 'anone') { document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => i.value = 0); updatePrediction(); return; }
  if (a === 'pt') { const c = ME.champ; pending = pending || { might: c.might, attack: c.attack, defense: c.defense, carry: c.carry }; pending[t.dataset.k]++; dirty(); return; }
  if (a === 'ptreset') { pending = null; dirty(); return; }
  if (a === 'move') { moveFrom = +t.dataset.k; note('Tap an empty plot'); sceneDirty = true; dirty(); return; }
  if (a === 'movecancel') { moveFrom = null; sceneDirty = true; dirty(); return; }
  if (a === 'buildat') { const k = +t.dataset.k, p = +t.dataset.p; plotMap(); LAYOUT[k] = p; saveLayout(); const slot = ME.orders[0] ? 1 : 0; return act(`Build ${BK(k).name}`, 'villages', 'orderBuild', [8 + k, slot]).then(ok => { if (ok) { S.sel = { kind: 'b', k }; sceneDirty = true; dirty(); } }); }
  const me = S.me;
  if (a === 'checkpoint') return act('Checkpoint today', 'ledger', 'checkpoint', []);
  if (a === 'claim') return act('Claim SEED', 'villages', 'claimSeed', []);
  if (a === 'upgrade') { const tg = +t.dataset.t, slot = ME.orders[0] ? 1 : 0; return act(`${levelOfTarget(tg) ? 'Upgrade' : 'Build'} ${targetName(tg)}`, 'villages', 'orderBuild', [tg, slot]); }
  if (a === 'finish') return act(`Finish ${targetName(ME.orders[+t.dataset.s].target)}`, 'villages', 'completeBuild', [me, +t.dataset.s]);
  if (a === 'cancel') return act(`Cancel ${targetName(ME.orders[+t.dataset.s].target)}`, 'villages', 'cancelBuild', [+t.dataset.s]);
  if (a === 'research') return act(`Research tier ${ME.v.tier + 1}`, 'villages', 'orderResearch', []);
  if (a === 'resfinish') return act('Finish research', 'villages', 'completeResearch', [me]);
  if (a === 'train') { const k = +t.dataset.u, n = Math.floor(+$('#tr-' + k).value || 0); if (n < 1) return note('Choose how many.', 'bad'); return act(`Train ${n} ${UN(k).name}`, 'villages', 'train', [k, n]); }
  if (a === 'trfinish') return act('Finish training', 'army', 'completeTraining', [g(), me]);
  if (a === 'resolve') return act('Resolve movement', 'army', 'resolve', [g(), +t.dataset.id]);
  if (a === 'recall') return act('Recall support', 'villages', 'recall', [+t.dataset.id]);
  if (a === 'boost') return act(`${RES_NAME[RES[+t.dataset.r]]} boost`, 'villages', 'treasury', [0, +t.dataset.r]);
  if (a === 'peace') return act('Peace shield', 'villages', 'treasury', [1, 0]);
  if (a === 'banner') return act('Village banner', 'villages', 'treasury', [2, 0]);
  if (a === 'exchange') { const lots = Math.floor((+$('#mk-amt').value || 0) / 100); if (lots < 1) return note('Exchange at least 100.', 'bad'); return act('Exchange', 'villages', 'exchange', [+$('#mk-from').value, +$('#mk-to').value, lots]); }
  if (a === 'ptsave') { const p = pending; pending = null; return act('Champion points', 'villages', 'allocateChampion', [p.might, p.attack, p.defense, p.carry]); }
  if (a === 'attack' || a === 'support' || a === 'scout') {
    const tile = S.wsel, target = W.tiles.get(tile) || ZERO, camp = CAMP_AT.has(tile) ? CAMP_AT.get(tile) : 0;
    let units = pickIn(), champ = false, mode = 1;
    if (a === 'scout') {
      let n = clamp(Math.floor(+$('#sc-n').value || 0), 0, scoutsHome()); if (n < 1) return note('Choose how many Scouts.', 'bad');
      units = Array(NUNITS).fill(0); for (const u of CFG.units) if (u.role === 1 && n > 0) { const x = Math.min(n, ME.home[u.i]); units[u.i] = x; n -= x; } mode = 2;
    } else { if (!units.some(Boolean)) return note('Choose troops to send.', 'bad'); champ = a === 'attack' && !!($('#atk-champ') && $('#atk-champ').checked); mode = a === 'support' ? 3 : 1; }
    return act(a === 'scout' ? 'Send Scouts' : a === 'support' ? 'Send support' : 'Send raid', 'villages', 'send', [target, camp, units, champ, mode]);
  }
  if (a === 'found') { const n = $('#cl-name').value.trim(); if (!/^[A-Za-z0-9_]{3,24}$/.test(n)) return note('Clan names: 3 to 24 letters, digits or _.', 'bad'); return act(`Found ${n}`, 'villages', 'foundClan', [n]); }
  if (a === 'join') return act(`Join ${clanName(+t.dataset.id)}`, 'villages', 'joinClan', [+t.dataset.id]);
  if (a === 'leave') return act('Leave clan', 'villages', 'leaveClan', []);
  if (a === 'raisecap') return act('Raise clan cap', 'villages', 'raiseClanCapacity', []);
  if (a === 'invite') return act(`Invite ${nameOf(t.dataset.a)}`, 'villages', 'inviteToClan', [t.dataset.a, true]);
  if (a === 'uninvite') return act('Withdraw invitation', 'villages', 'inviteToClan', [t.dataset.a, false]);
  if (a === 'invname') { const v = $('#cl-inv').value.trim().toLowerCase(), p = /^0x[0-9a-f]{40}$/.test(v) ? v : ([...W.players.values()].find(x => x.name.toLowerCase() === v) || {}).addr; if (!p || !W.players.has(p)) return note(`No village called "${v}".`, 'bad'); return act(`Invite ${nameOf(p)}`, 'villages', 'inviteToClan', [p, true]); }
}
function selectHit(hit) {
  const k = hit.dataset.hit;
  if (moveFrom !== null) {
    const p = +hit.dataset.p, pm = plotMap(), j = PLOT_OPEN_ORDER.indexOf(p);
    if (k === 'plot' && pm.byPlot[p] === undefined && j < openPlotCount()) { LAYOUT[moveFrom] = p; saveLayout(); S.sel = { kind: 'b', k: moveFrom }; note(`${BK(moveFrom).name} moved`, 'ok'); moveFrom = null; sceneDirty = true; dirty(); return; }
    moveFrom = null; note('Move cancelled');
  }
  S.sel = k === 'th' || k === 'walls' ? { kind: k } : k === 'field' ? { kind: 'field', i: +hit.dataset.i } : k === 'plot' ? { kind: 'plot', p: +hit.dataset.p } : { kind: 'b', k: +hit.dataset.k };
  S.ui.min.vright = false; $('#vright').classList.remove('closed'); sceneDirty = true; dirty();
}

// ------------------------------------------------------------------ home page bits
function liveNote() {
  if (!G.ok || !CFG) return '';
  return `Live on Sepolia: <b>${W.players.size}</b> village${W.players.size === 1 ? '' : 's'} · hamster work counter <b>${fmt(G.coreCum)}</b> · ${G.last && G.obsCount > 1 ? `last checkpoint <b>${fmt(G.lastWork)}</b> work = <b>${fmt(G.lastWork / CFG.econ.seedWorkDiv)}</b> SEED per village` : 'the first checkpoint set the baseline'} · next checkpoint in ${dur(nextDayIn())} · rules version ${CFG.version}`;
}
function homeChanges() { const el = $('#ruleLog'); if (el) setHTML(el, changeLog()); }
function homeInit() {
  const units = CFG ? unitsOn() : [];
  $('#unitCards').innerHTML = units.length ? units.map(u => `<div class="unit px"><img src="${spr(unitSprite(u.i))}" alt="${esc(u.name)}"><b>${esc(u.name)}</b><span>${u.attack} attack · ${u.defense} defense<br>speed ${u.speed} · carry ${u.carry}${u.tier ? ` · tier ${u.tier}` : ''}</span></div>`).join('') : '<p class="muted">The unit list loads from the rule table.</p>';
  const A_ = SW.ADDR, link = ad => SW.D && !SW.D.local ? `<a href="https://sepolia.etherscan.io/address/${ad}" target="_blank" rel="noopener">${ad}</a>` : ad;
  const rows = SW.D ? [['Villages', A_.villages, 'The game: every player action'], ['Army', A_.army, 'Troops, movements, battles, champions, camps'], ['Clans', A_.clans, 'Clans and ranking counters'], ['SeedLedger', A_.ledger, 'Daily checkpoint and SEED'], ['GameConfig', A_.config, 'The rule table: every number of the season'], ['SqueekCore', A_.core, "Squeekchain: the hamster's work (read only)"], ['Squeek NFT', A_.squeek, 'Squeekchain: Squeeks held (read only)']] : [];
  const src = ad => SW.D && !SW.D.local ? `<a href="https://repo.sourcify.dev/${SW.D.chainId}/${SW.E.getAddress(ad)}" target="_blank" rel="noopener">source ✓</a>` : '';
  $('#contractList').innerHTML = rows.length ? `<table class="ctbl">${rows.map(([n, ad, r], i) => `<tr><td><b>${n}</b></td><td>${link(ad)}</td><td class="muted">${r}</td><td>${i < 5 ? src(ad) : ''}</td></tr>`).join('')}</table><p class="muted" style="font-size:17px;margin:8px 0 0">The five game contracts have verified source code (Sourcify): the code that runs on chain is the MIT code in the <a href="https://github.com/lookingforcrypto/squeekwars/tree/v2/contracts" target="_blank" rel="noopener">GitHub repository</a>.</p>` : '<p class="muted">Season 2 is not deployed yet.</p>';
}

// ------------------------------------------------------------------ start
async function init() {
  homeInit();
  chatInit();
  document.addEventListener('click', onClick);
  document.addEventListener('input', e => { if (e.target.matches('#wright input')) updatePrediction(); if (e.target.matches('#mk-amt,#mk-to,#mk-from')) mkPreview(); });
  document.addEventListener('change', e => { if (e.target.matches('#atk-champ')) updatePrediction(); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'goto') { e.preventDefault(); $('[data-act="goto"]').click(); } if (e.key === 'Enter' && e.target.id === 'nm-in') { e.preventDefault(); $('[data-act="nm-ok"]').click(); } });
  $('#logoHome').addEventListener('click', () => { location.hash = ''; });
  $('#walletbtn').addEventListener('click', e => { e.stopPropagation(); if (!S.me) { openWallet(); return; } const m = $('#walletmenu'); m.hidden = !m.hidden; if (!m.hidden) { $('#wm-addr').textContent = S.me; updNotifBtn(); $('#wm-share').href = ME && ME.v ? `#visit=${encodeURIComponent(ME.v.name)}` : '#village'; } });
  document.addEventListener('click', e => { const m = $('#walletmenu'); if (!m.hidden && !m.contains(e.target)) m.hidden = true; });
  const vst = $('#vstage');
  stageDrag(vst, (dx, dy) => { pan.x += dx; pan.y += dy; clampPan(); applyPan(); }, e => { const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.dataset && el.dataset.hit); if (hit) selectHit(hit); }, (f, cx, cy) => zoomAt(f, cx, cy));
  vst.addEventListener('wheel', e => { e.preventDefault(); const r = vst.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const wst = $('#wstage'), tip = $('#wtip');
  stageDrag(wst, (dx, dy) => { tip.hidden = true; S.cam.x = clamp(S.cam.x - dx / wcam.ts, 0, 100); S.cam.y = clamp(S.cam.y - dy / wcam.ts, 0, 100); S.cam.set = true; drawWorld(); drawMini(); }, e => {
    const r = $('#worldcv').getBoundingClientRect(), x = Math.floor(S.cam.x + (e.clientX - r.left - cvW / 2) / wcam.ts), y = Math.floor(S.cam.y + (e.clientY - r.top - cvH / 2) / wcam.ts);
    if (x < 0 || y < 0 || x >= 100 || y >= 100) return; S.wsel = y * 100 + x; S.ui.min.wright = false; $('#wright').classList.remove('closed'); loadTarget(S.wsel).catch(() => { }); dirty();
  });
  if (matchMedia('(hover: hover)').matches) {
    wst.addEventListener('pointermove', e => {
      if (e.buttons) return; const r = $('#worldcv').getBoundingClientRect(), x = Math.floor(S.cam.x + (e.clientX - r.left - cvW / 2) / wcam.ts), y = Math.floor(S.cam.y + (e.clientY - r.top - cvH / 2) / wcam.ts);
      if (x < 0 || y < 0 || x >= 100 || y >= 100 || e.clientY - r.top < 22 || e.clientX - r.left < 30) { tip.hidden = true; return; }
      const tile = y * 100 + x, p = W.tiles.get(tile);
      if (tip._k !== tile) { tip.innerHTML = p ? `<b>${who(nameOf(p), p)}</b><br>(${x}|${y}) · Town Hall ${(W.ctx.get(p) || {}).th || '?'}${W.clanOf.get(p) ? ` · ${esc(clanName(W.clanOf.get(p)))}` : ''}` : CAMP_AT.has(tile) ? `<b>${CAMP_NAME[CAMP_AT.get(tile) % 3]} #${CAMP_AT.get(tile)}</b><br>(${x}|${y}) · never attacks` : `(${x}|${y}) · empty`; tip._k = tile; }
      tip.hidden = false; tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - tip.offsetHeight - 8, e.clientY + 16) + 'px';
    });
    wst.addEventListener('pointerleave', () => { tip.hidden = true; });
  }
  document.addEventListener('click', e => { if (e.target.id === 'minimap') { const r = e.target.getBoundingClientRect(); S.cam.x = (e.clientX - r.left) / r.width * 100; S.cam.y = (e.clientY - r.top) / r.height * 100; S.cam.set = true; drawWorld(); drawMini(); } });
  addEventListener('resize', layout);
  addEventListener('hashchange', route);
  $('#vright').classList.add('closed');
  if (innerWidth <= 900) $('#wright').classList.add('closed');
  SW.onAccounts(acc => { S.me = acc; ME = null; pending = null; S.cam.set = false; refresh(true).then(route); });
  S.me = S.ui.off ? null : await SW.silent();      // after Disconnect, wait for the player to press Connect
  route(); requestAnimationFrame(tick);
  await refresh(true);
  homeInit(); route();
  let bg = 0; setInterval(() => { if (!document.hidden) refresh(); else if (notifOn() && ++bg % 3 === 0) refresh(); }, 20000);
  setInterval(notifyCheck, 5000);
}
if (window.SW_PAGE !== 'owner') init();
