'use strict';
/* Squeek Wars · browser prototype. Rules follow docs/GAME_DESIGN.md (draft v1). No wallet, no chain:
   the game state lives in this browser and game time runs faster than real time. */

// ------------------------------------------------------------------ data
const RES = ['wood', 'food', 'stone', 'iron'];
const RES_NAME = { wood: 'Wood', food: 'Food', stone: 'Stone', iron: 'Iron' };
const NIGHTS = [11182, 10891, 10587, 13297, 12561, 8505, 8984];      // Squeektoshi's real nights (settled passes)
const PASS_PER_BONUS = 4320;
const FIELD = { base: 18, g: 1.4, cg: 1.6, t1: 0.4, tg: 1.4, cost: [[30, 50, 45, 40], [45, 20, 50, 45], [45, 45, 20, 50], [50, 45, 45, 10]] };
const FIELD_RES = [0, 0, 1, 1, 2, 2, 3, 3];
const FIELD_NAME = ['Forest', 'Forest', 'Sunflower Farm', 'Sunflower Farm', 'Quarry', 'Quarry', 'Iron Mine', 'Iron Mine'];
const FIELD_SPRITE = ['site_forest', 'site_forest', 'site_sunflower_farm', 'site_sunflower_farm', 'site_quarry', 'site_quarry', 'site_iron_mine', 'site_iron_mine'];
const B = {          // costs lean on all four resources (playtest: Wood starved the game while Food piled up)
  townhall:   { name: 'Town Hall',  c: [180, 170, 180, 170], g: 1.75, t1: 0.75, gt: 1.5,  max: 10, seed: [667, 1.5], sprite: 'town_hall' },
  walls:      { name: 'Walls',      c: [80, 60, 220, 140],   g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'walls' },
  wheelhouse: { name: 'Wheelhouse', c: [100, 110, 90, 100],  g: 1.68, t1: 0.6,  gt: 1.45, max: 10, seed: [300, 1.5], sprite: 'wheelhouse', w: 92, multi: 1,
                role: 'Turns the hamster\'s runs into a production bonus' },
  storehouse: { name: 'Storehouse', c: [110, 100, 100, 90],  g: 1.28, t1: 0.45, gt: 1.2,  max: 20, sprite: 'storehouse', w: 110, multi: 99, role: 'More storage for every resource' },
  burrow:     { name: 'Burrow',     c: [70, 110, 70, 50],    g: 1.55, t1: 0.5,  gt: 1.45, max: 10, sprite: 'burrow', w: 104, multi: 99, role: 'Room for more troops' },
  barracks:   { name: 'Barracks',   c: [150, 150, 130, 170], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'barracks', w: 140, multi: 1, role: 'Trains units' },
  academy:    { name: 'Academy',    c: [160, 160, 170, 210], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'academy', w: 118, multi: 1, role: 'Researches units and buildings' },
  vault:      { name: 'Vault',      c: [70, 60, 80, 50],     g: 1.28, t1: 0.45, gt: 1.2,  max: 20, sprite: 'vault', w: 112, multi: 99, unlock: 'vault', role: 'Keeps resources safe from raids' },
  forge:      { name: 'Forge',      c: [130, 110, 140, 260], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'forge', w: 112, multi: 1, unlock: 'forge', role: '+2% attack and defense per level' },
  clanhall:   { name: 'Clan Hall',  c: [190, 200, 180, 130], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'clan_hall', w: 150, multi: 1, unlock: 'clanhall', role: 'Found or join a clan and send support' },
  market:     { name: 'Market',     c: [150, 200, 150, 150], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'market', w: 120, multi: 1, th: 2, role: 'Exchange your own resources' },
};
const PLOT_TYPES = ['wheelhouse', 'storehouse', 'burrow', 'barracks', 'academy', 'vault', 'forge', 'clanhall', 'market'];
const RESEARCH = [
  { id: 'forager', tier: 1, name: 'Forager', d: 'Raider: weak, carries 120' },
  { id: 'vault', tier: 1, name: 'Vault', d: 'Building: protects resources' },
  { id: 'shieldbearer', tier: 2, name: 'Shieldbearer', d: 'Defender: 70 defense' },
  { id: 'berserker', tier: 2, name: 'Berserker', d: 'Attacker: 75 attack' },
  { id: 'scout', tier: 2, name: 'Scout', d: 'Finds weak spots: +10% attack on that village for 12 h' },
  { id: 'forge', tier: 2, name: 'Forge', d: 'Building: +2% power per level' },
  { id: 'clanhall', tier: 2, name: 'Clan Hall', d: 'Building: clans and support' },
  { id: 'charger', tier: 3, name: 'Charger', d: 'Fast unit, speed 14' },
  { id: 'logistics', tier: 3, name: 'Logistics', d: '+20% carry' },
  { id: 'catapult', tier: 4, name: 'Catapult', d: 'Lowers enemy Walls' },
  { id: 'medicine', tier: 4, name: 'Field Medicine', d: '10% of fallen units return' },
  { id: 'logistics2', tier: 5, name: 'Logistics II', d: '+20% more carry' },
  { id: 'march', tier: 5, name: 'Forced March', d: '+20% army speed' },
];
const TIER_AT = [0, 1, 2, 4, 6, 8];          // Academy level that opens each research tier
const U = {
  spearman:     { name: 'Spearman',     a: 40, d: 35, s: 6,  c: 50,  u: 1, cost: [50, 45, 45, 40],    m: 15, r: null,           sprite: 'unit_spearman' },
  forager:      { name: 'Forager',      a: 20, d: 15, s: 8,  c: 120, u: 1, cost: [55, 55, 30, 20],    m: 12, r: 'forager',      sprite: 'unit_forager' },
  shieldbearer: { name: 'Shieldbearer', a: 15, d: 70, s: 5,  c: 20,  u: 1, cost: [60, 45, 70, 45],    m: 18, r: 'shieldbearer', sprite: 'unit_shieldbearer' },
  berserker:    { name: 'Berserker',    a: 75, d: 20, s: 6,  c: 40,  u: 1, cost: [55, 55, 35, 100],   m: 20, r: 'berserker',    sprite: 'unit_berserker' },
  charger:      { name: 'Charger',      a: 90, d: 50, s: 14, c: 80,  u: 2, cost: [120, 130, 90, 170], m: 35, r: 'charger',      sprite: 'unit_charger' },
  catapult:     { name: 'Catapult',     a: 30, d: 10, s: 3,  c: 0,   u: 4, cost: [320, 140, 300, 170], m: 70, r: 'catapult',    sprite: 'unit_catapult' },
  scout:        { name: 'Scout',        a: 0,  d: 5,  s: 16, c: 0,   u: 1, cost: [30, 40, 20, 40],    m: 8,  r: 'scout',        sprite: 'villager_young' },
};
const UK = Object.keys(U);
const FIGHT = UK.filter(k => k !== 'scout');      // units that can join an attack
const FOOD_PER_ROOM = 0.5;                          // Food each unit of Burrow room eats per hour
const unitValue = k => U[k].cost.reduce((a, x) => a + x, 0);
// scene geometry (village_bg.webp is 1920×1200)
const PLOTS = [[810, 370], [1108, 370], [1290, 512], [1290, 686], [1108, 828], [810, 828], [628, 686], [628, 512], [960, 444], [1148, 600], [960, 756], [772, 600]];
const PLOT_OPEN_ORDER = [8, 11, 9, 10, 0, 1, 7, 2, 6, 3, 5, 4];   // inner ring first
const TH_POS = [960, 630];
const SITES = [[524, 180, 255, false], [192, 480, 238, true], [1404, 168, 217, false], [1728, 480, 217, true], [200, 874, 214, false], [572, 1176, 204, true], [1732, 858, 204, true], [1336, 1166, 198, false]];
const WALLS_POS = [640, 356];
const OWN = [46, 70];
const RIVAL = [48, 71];
const NAME_A = ['Iron', 'Amber', 'Grey', 'Silent', 'Swift', 'Golden', 'Dusk', 'Stone', 'Copper', 'Night', 'Ember', 'Frost', 'Oak', 'Ash', 'Rust', 'Bright', 'Hollow', 'Moss'];
const NAME_B = ['paw', 'crest', 'burrow', 'tail', 'seed', 'runner', 'claw', 'fang', 'wheel', 'mill', 'ridge', 'grove', 'barrow', 'spark', 'hold', 'thorn'];
const cap1 = s => s[0].toUpperCase() + s.slice(1);
function nameFrom(r1, r2, r3) { return NAME_A[Math.floor(r1 * NAME_A.length)] + cap1(NAME_B[Math.floor(r2 * NAME_B.length)]) + (r3 < 0.6 ? Math.floor(r3 * 150) + 2 : ''); }
const shortAddr = a => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '';      // 0x1a2b…9f3c
const addrOf = (x, y) => '0x' + Array.from({ length: 5 }, (_, k) => Math.floor(hash(x, y, 90 + k) * 2 ** 32).toString(16).padStart(8, '0')).join('');
const who = (name, addr) => `${esc(name)} <span class="addr">${shortAddr(addr)}</span>`;
const randomName = () => nameFrom(Math.random(), Math.random(), Math.random());
const NPC_CLAN = { tag: 'ASH', name: 'Ashen Paws' };
const SQUEEK_ID = 4821;          // the demo wallet's first Squeek
const SQUEEK_CHAMP = 1.10;        // a Squeek holder's champion: +10% XP and +10% stats
const DEMO_IDS = [SQUEEK_ID, 1203, 7719, 356, 9012, 2468, 6630, 147, 8080, 5155];
const demoSqueeks = () => DEMO_IDS.map(id => ({ id, xp: id === 1203 ? 1600 : 0, pts: { might: 0, atk: 0, def: 0, carry: 0 }, inj: 0 }));
const MAX_OFFLINE_H = 72;

// ------------------------------------------------------------------ utils
const $ = (s, r = document) => r.querySelector(s);
const fmt = n => Math.floor(n + 1e-9).toLocaleString('en-US');
const pct = x => `${Math.round(x * 100)}%`;
function dur(h) {
  if (h <= 0) return '0s';
  const s = Math.round(h * 3600), d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  if (d) return `${d}d ${hh}h`;
  if (hh) return `${hh}h ${String(mm).padStart(2, '0')}m`;
  if (mm) return `${mm}m ${String(ss).padStart(2, '0')}s`;
  return `${ss}s`;
}
function rnd(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
function hash(x, y, k) { let h = Math.imul(x * 374761393 + y * 668265263 + k * 1442695041, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const spr = n => `assets/sprites/${n}.webp`;
const icon = r => `<img class="i" src="assets/ic_${r}.png" alt="${r === 'seed' ? 'SEED' : RES_NAME[r]}">`;

// ------------------------------------------------------------------ state
const SAVE_KEY = 'squeekwars-demo-v1';
let S;
function newGame() {
  return {
    v: 1, t: 8, speed: 60, res: [750, 750, 750, 750], seed: 1500, th: 1, walls: 1, fields: [1, 1, 1, 1, 1, 1, 1, 1],
    plots: Array(12).fill(null), slots: [[], []], research: { done: [], cur: null }, units: Object.fromEntries(UK.map(k => [k, 0])),
    training: null, champ: { xp: 0, pts: { might: 0, atk: 0, def: 0, carry: 0 }, inj: 0, home: true },
    moves: [], bots: {}, reports: [], log: [], nights: { 1: 11182 }, nextNight: 13297, shieldUntil: 8 + 7 * 24, nextIncoming: 8 + 7 * 24 + 20,
    seq: 1, sel: { kind: 'th' }, wsel: [...RIVAL], unread: 0, lastReal: Date.now(), cam: { x: OWN[0] + 0.5, y: OWN[1] + 0.5 },
    test: { free: true, instant: true, prod: 1, squeeks: 3 }, ui: { min: {} }, wallet: null, username: null, clan: null, invites: [], localReports: [],
    stats: { atk: 0, def: 0, loot: 0, wins: 0, scouts: 0, wk: {} }, intel: {}, quests: [], abroad: [], helpers: [],
    peaceUntil: 0, peaceNext: 0, boost: [0, 0, 0, 0], banner: '#f2c14e',
    // one village per wallet; the demo wallet holds three Squeeks and #4821 leads (champion XP belongs to each Squeek)
    squeeks: demoSqueeks(),
  };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
    const s = JSON.parse(raw); if (!s || s.v !== 1) return null;
    const d = newGame(); for (const k in d) if (s[k] === undefined) s[k] = d[k];      // older saves: fill new fields
    for (const k in d.stats) if (s.stats[k] === undefined) s.stats[k] = d.stats[k];
    if (!s.ui) s.ui = { min: {} };
    if (!Array.isArray(s.boost)) s.boost = [0, 0, 0, 0];
    if (s.test.squeeks === undefined) s.test.squeeks = s.test.noSqueek ? 0 : 3;
    for (const q of demoSqueeks()) if (!s.squeeks.some(x => x.id === q.id)) s.squeeks.push(q);
    return s;
  } catch (e) { return null; }
}
const TAB_ID = Math.random().toString(36).slice(2);
let stale = false;                      // another browser tab took over this save
function save() { if (stale) return; try { S.lastReal = Date.now(); S.tabId = TAB_ID; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }

// ------------------------------------------------------------------ economy
const day = t => Math.floor(t / 24) + 1;
const clock = t => { const h = ((t % 24) + 24) % 24; return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; };
const levelOf = type => S.plots.filter(p => p && p.type === type).reduce((m, p) => Math.max(m, p.lvl), 0);
const plotsOf = type => S.plots.filter(p => p && p.type === type);
const researched = id => S.research.done.includes(id);
const openPlots = () => Math.min(12, 3 + S.th);
const STORE = { base: 1500, per: 1800 }, VAULT = { base: 300, per: 500 };      // v9: storage x1.5 and the Vault x2 with the higher output
const storage = () => STORE.base + plotsOf('storehouse').reduce((a, p) => a + (p.lvl ? STORE.per * 1.22 ** (p.lvl - 1) : 0), 0);
const protect = () => VAULT.base + plotsOf('vault').reduce((a, p) => a + (p.lvl ? VAULT.per * 1.22 ** (p.lvl - 1) : 0), 0);
const popCap = () => 30 + plotsOf('burrow').reduce((a, p) => a + (p.lvl ? 20 * p.lvl * 1.12 ** (p.lvl - 1) : 0), 0);
const awayUnits = () => {            // own troops on the move or stationed with clan members
  const a = Object.fromEntries(UK.map(k => [k, 0]));
  for (const m of S.moves) if (m.kind !== 'incoming' && m.kind !== 'help') for (const k in m.units) a[k] += m.units[k];
  for (const st of S.abroad) for (const k in st.units) a[k] += st.units[k];
  return a;
};
function upkeep() { const a = awayUnits(); return UK.reduce((s, k) => s + (S.units[k] + a[k]) * U[k].u, 0); }      // Burrow room used
const upkeepPlanned = () => upkeep() + (S.training ? S.training.n * U[S.training.unit].u : 0);
const foodUse = () => S.test.free ? 0 : upkeep() * FOOD_PER_ROOM;
const fieldBase = L => FIELD.base * FIELD.g ** (L - 1);
const baseRate = r => S.fields.reduce((a, L, i) => a + (FIELD_RES[i] === r ? fieldBase(L) : 0), 0);
const nightKey = t => Math.floor((t - 4) / 24) + 1;
const lastPasses = () => S.nights[nightKey(S.t)] || S.nights[1];
const wheelCap = () => 0.25 * levelOf('wheelhouse');
const held = () => S.squeeks.slice(0, S.test.squeeks);              // Squeeks in the wallet (test control: 0 to 10)
const holder = () => held().length > 0;                                 // one Squeek is enough; more add nothing to the champion
const champBoost = () => holder() ? SQUEEK_CHAMP : 1;
const addXP = x => { S.champ.xp += x * champBoost(); };
const wheelBonus = () => Math.min(wheelCap(), lastPasses() / PASS_PER_BONUS);
// Squeek holders build faster after a good run; each extra Squeek adds half as much as the one before (max 30%)
const squeekBuildFor = (n, laps) => n > 0 ? 0.3 * (1 - 0.5 ** n) * Math.min(1, laps / 11000) : 0;
const squeekBuild = () => squeekBuildFor(held().length, lastPasses());
const BOOST = 0.25, BOOST_SEED = 500, BOOST_H = 24;     // SEED buys +25% of one resource for 24 h
const boosted = r => S.t < (S.boost || [])[r];
const rate = r => baseRate(r) * (1 + wheelBonus()) * (1 + (boosted(r) ? BOOST : 0)) * (S.test.prod || 1);
const netRate = r => rate(r) - (r === 1 ? foodUse() : 0);
const forge = () => 0.02 * levelOf('forge');
const thSpeed = () => (1 - 0.03 * (S.th - 1)) * (1 - squeekBuild());
function costOf(kind, ref, L) {           // resources to reach level L
  if (kind === 'field') { const c = FIELD.cost[FIELD_RES[ref]]; return { res: c.map(x => x * FIELD.cg ** (L - 1)), seed: 0, h: FIELD.t1 * FIELD.tg ** (L - 1) * thSpeed() }; }
  const b = B[ref];
  return { res: b.c.map(x => x * b.g ** (L - 1)), seed: b.seed ? b.seed[0] * b.seed[1] ** (L - 1) : 0, h: b.t1 * b.gt ** (L - 1) * thSpeed() };
}
const canPay = (res, seed = 0) => S.test.free || (res.every((x, i) => S.res[i] + 1e-6 >= x) && S.seed + 1e-6 >= seed);
function pay(res, seed = 0) { if (S.test.free) return; res.forEach((x, i) => S.res[i] -= x); S.seed -= seed; }
const hlevel = () => Math.min(30, 1 + Math.floor(Math.sqrt(Math.max(0, S.champ.xp) / 100)));
const hfree = () => 4 * hlevel() - Object.values(S.champ.pts).reduce((a, b) => a + b, 0);
const hmight = () => (50 + 25 * S.champ.pts.might) * champBoost();          // a modest champion in every village
const hatk = () => Math.min(0.1, 0.005 * S.champ.pts.atk) * champBoost();
const hdef = () => Math.min(0.1, 0.005 * S.champ.pts.def) * champBoost();
const hcarry = () => Math.min(0.2, 0.01 * S.champ.pts.carry) * champBoost();
const champOk = () => S.champ.home && S.t >= S.champ.inj;           // every village has a champion
const carryBonus = () => (researched('logistics') ? 0.2 : 0) + (researched('logistics2') ? 0.2 : 0);
const helpPower = () => S.helpers.reduce((s, hp) => s + Object.entries(hp.units).reduce((a, [k, n]) => a + n * U[k].d, 0), 0);
function defense() {
  const d = UK.reduce((s, k) => s + S.units[k] * U[k].d, 0) * (1 + forge()) + helpPower() + (champOk() ? hmight() : 0);
  return d * (1 + (champOk() ? hdef() : 0)) * (1 + 0.04 * S.walls) + 40 * S.th;
}
function attackPower(units, champ) { return UK.reduce((s, k) => s + (units[k] || 0) * U[k].a, 0) * (1 + forge()) * (1 + (champ ? hatk() : 0)) + (champ ? hmight() : 0); }
function carryOf(units, champ) { return UK.reduce((s, k) => s + (units[k] || 0) * U[k].c, 0) * (1 + carryBonus() + (champ ? hcarry() : 0)); }
const MARKET = L => L >= 10 ? 75 : 25 + 5 * (L - 1);

// ------------------------------------------------------------------ world (bots)
const WORLD = 100;
const BOT = {};
function bot(x, y) {
  const key = x + ',' + y;
  if (BOT[key] !== undefined) return BOT[key];
  let b = null;
  if (x === RIVAL[0] && y === RIVAL[1]) b = { x, y, id: 777, holder: true, name: 'Ironpaw', addr: addrOf(x, y), rival: true, lvl0: 5, active: true, npc: false, shield: 0, sp: 60, sb: 20, walls: 4 };
  else if (x >= 0 && y >= 0 && x < WORLD && y < WORLD && !(x === OWN[0] && y === OWN[1]) && hash(x, y, 1) < 0.42) {
    const h = k => hash(x, y, k);
    const active = h(3) > 0.3, lvl = 1 + Math.floor(h(2) * 7);
    b = { x, y, id: 1 + Math.floor(h(9) * 9971), holder: active && h(13) < 0.55, lvl0: lvl, active, npc: h(8) < 0.06, name: nameFrom(h(21), h(22), h(23)), addr: addrOf(x, y), shield: h(7) < 0.08 ? 24 * (1 + Math.floor(h(10) * 6)) : 0,
      sp: Math.round(lvl * (active ? 10 : 3) * (0.5 + h(4))), sb: active && lvl >= 3 ? Math.round(lvl * 6 * h(5)) : 0, walls: active ? Math.max(1, lvl - 1 - Math.floor(h(6) * 2)) : 1 };
  }
  else if (x >= 0 && y >= 0 && x < WORLD && y < WORLD && !(x === OWN[0] && y === OWN[1]) && hash(x, y, 1) < 0.44) {     // about 1 tile in 50: a wild camp
    const kind = Math.floor(hash(x, y, 14) * 3);
    b = { x, y, camp: true, kind, id: 0, name: CAMP_NAME[kind], addr: '', active: false, holder: false, npc: false, shield: 0, sp: 0, sb: 0, walls: 0, lvl0: 1 };
  }
  BOT[key] = b; return b;
}
// Wild camps (PvE): never attack, never join clans, not ranked. They grow with the season, but gently.
const CAMP_NAME = ['Small Wild Camp', 'Wild Camp', 'Large Wild Camp'], CAMP_SIZE = [0.6, 1, 1.5];
const seasonDay = () => Math.max(0, (S.t - 8) / 24);
const campDef = b => CAMP_SIZE[b.kind] * Math.min(4000, 150 + 40 * seasonDay());      // target defense
const campRegen = b => CAMP_SIZE[b.kind] * (20 + 2 * seasonDay());                     // per resource per hour
const CLANS = [{ tag: 'IRV', name: 'Iron Vanguard' }, { tag: 'DSK', name: 'Dusk Runners' }, { tag: 'OAK', name: 'Oakshield' }, { tag: 'EMB', name: 'Ember Pact' }];
function botClan(b) {                // which clan a bot belongs to (null = none)
  if (!b) return null; if (myClan(b)) return { tag: S.clan.tag, name: S.clan.name, mine: true };
  if (b.npc) return NPC_CLAN; if (b.rival || !b.active) return null;
  return hash(b.x, b.y, 50) < 0.3 ? CLANS[Math.floor(hash(b.x, b.y, 51) * CLANS.length)] : null;
}
function botLvl(b) { return Math.min(10, b.lvl0 + (b.active && !b.rival ? Math.floor(S.t / 24 / 20) : 0)); }
function botState(b) {
  const k = b.x + ',' + b.y;
  if (!S.bots[k]) { const L = botLvl(b); const r = botRegen(b); S.bots[k] = { s0: Math.min(botCap(b), r * 48), t0: 8, loss: 0, lossAt: 0, raids: {} }; }
  return S.bots[k];
}
const botRegen = b => b.camp ? campRegen(b) : 2 * fieldBase(botLvl(b)) * (b.active ? 1 : 0.5);      // other raiders share every village's stock
const botCap = b => b.camp ? 24 * campRegen(b) : STORE.base + STORE.per * 1.22 ** (botLvl(b) - 1) * (b.active ? 1.5 : 0.6);
const botProt = b => b.camp ? 0 : VAULT.base + (b.active ? VAULT.per * 1.22 ** (botLvl(b) - 1) : 0);
function botStock(b) { const st = botState(b); const r = botRegen(b); return Math.min(botCap(b), st.s0 + r * (S.t - st.t0)); }
const botLootable = b => 4 * Math.max(0, botStock(b) - botProt(b));
function botTroops(b) {
  const st = botState(b);
  if (b.camp) { const keep = 1 - st.loss * Math.max(0, 1 - (S.t - st.lossAt) / 24), D = campDef(b) * keep; return { spearman: Math.round(0.4 * D / 35), shieldbearer: Math.round(0.6 * D / 70) }; } const keep = 1 - st.loss * Math.max(0, 1 - (S.t - st.lossAt) / (b.rival ? 4 : 20));
  const grow = b.active && !b.rival ? 1 + S.t / 24 / 30 : 1;
  return { spearman: Math.round(b.sp * keep * grow), shieldbearer: Math.round(b.sb * keep * grow) };
}
function botWalls(b) {               // catapult damage is saved; bots rebuild one level every 12 h
  const st = botState(b); if (st.walls === undefined) return b.walls;
  return Math.min(b.walls, st.walls + Math.floor((S.t - st.wallAt) / 12));
}
function botDefense(b) { const tr = botTroops(b); return (tr.spearman * 35 + tr.shieldbearer * 70) * (1 + 0.04 * botWalls(b)) + (b.camp ? 0 : 40 * botLvl(b)); }
function botArmy(b) {                // the troops a neighbour sends when it raids you
  const st = botState(b); const keep = 1 - (st.aloss || 0) * Math.max(0, 1 - (S.t - (st.alossAt || 0)) / 24);
  const grow = b.rival ? 1 : 1 + S.t / 24 / 30;
  const bers = Math.round((b.rival ? 45 : botLvl(b) * 5 * (0.4 + hash(b.x, b.y, 12))) * grow * keep);
  return { berserker: bers, spearman: Math.round(botTroops(b).spearman * 0.5 * keep) };
}
const botAtk = u => (u.berserker || 0) * U.berserker.a + (u.spearman || 0) * U.spearman.a;
const SCOUT_BONUS = 0.1, SCOUT_HOURS = 12;      // contract state is public, so scouting gives an edge instead of secrets
function scoutLeft(b) { const it = S.intel[b.x + ',' + b.y]; return it ? Math.max(0, it.t + SCOUT_HOURS - S.t) : 0; }
const scoutBonus = b => scoutLeft(b) > 0 ? SCOUT_BONUS : 0;
const botShielded = b => b.shield && S.t < b.shield + 8;
const myClan = b => !!(b && S.clan && S.clan.members.includes(b.x + ',' + b.y));
const clanHall = () => levelOf('clanhall');
const clanCap = () => 3 * clanHall();
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ------------------------------------------------------------------ simulation
function produce(h) {
  if (h <= 0) return;
  const cap = storage(), up = foodUse();
  for (let r = 0; r < 4; r++) {
    let v = S.res[r] + rate(r) * h - (r === 1 ? up * h : 0);
    if (r === 1 && v < 0) {          // starvation: lose troops at home
      const frac = Math.min(1, -v / Math.max(1e-9, up * h));
      for (const k of UK) S.units[k] = Math.floor(S.units[k] * (1 - frac));
      v = 0; if (!S.starveNoteAt || S.t - S.starveNoteAt > 12) { S.starveNoteAt = S.t; note('Food ran out: hungry troops are leaving. Raise Food output or train fewer units.', 'bad'); logEvt('Food ran out: troops left the village'); }
    }
    S.res[r] = Math.min(cap, Math.max(0, v));
  }
}
function nextEventTime() {
  let n = Infinity;
  for (const sl of S.slots) if (sl.length) n = Math.min(n, sl[0].end);
  if (S.research.cur) n = Math.min(n, S.research.cur.end);
  if (S.training) n = Math.min(n, S.training.end);
  for (const m of S.moves) n = Math.min(n, m.arrive);
  for (const iv of S.invites) n = Math.min(n, iv.at);
  for (const hp of S.helpers) n = Math.min(n, hp.until);
  n = Math.min(n, (Math.floor((S.t - 4) / 24) + 1) * 24 + 4);      // next 04:00, end of the night run
  n = Math.min(n, Math.max(S.nextIncoming, S.shieldUntil));
  return n;
}
function advance(to) {
  let guard = 0;
  while (S.t < to - 1e-9 && guard++ < 5000) {
    const n = Math.min(to, nextEventTime());
    produce(n - S.t); S.t = n;
    handleEvents();
  }
}
function handleEvents() {
  const eps = 1e-9;
  for (const sl of S.slots) while (sl.length && sl[0].end <= S.t + eps) finishOrder(sl.shift());
  if (S.research.cur && S.research.cur.end <= S.t + eps) { const id = S.research.cur.id; S.research.done.push(id); S.research.cur = null; const m = `Research done: ${RESEARCH.find(r => r.id === id).name}`; note(m, 'ok'); sfx('ok'); notify(m); }
  if (S.training && S.training.end <= S.t + eps) { const tr = S.training; S.units[tr.unit] += tr.n; S.training = null; const m = `${tr.n} ${U[tr.unit].name}${tr.n > 1 ? 's' : ''} trained`; note(m, 'ok'); sfx('ok'); notify(m); }
  const gone = S.helpers.filter(hp => hp.until <= S.t + eps); S.helpers = S.helpers.filter(hp => hp.until > S.t + eps);
  for (const hp of gone) note(`${hp.name}'s support went home`);
  const due = S.moves.filter(m => m.arrive <= S.t + eps).sort((a, b) => a.arrive - b.arrive);
  for (const m of due) { S.moves = S.moves.filter(x => x !== m); arrive(m); }
  const nk = nightKey(S.t);
  if (!S.nights[nk] && Math.abs(((S.t - 4) % 24 + 24) % 24) < 1e-6) nightRun(nk);
  if (S.t >= S.nextIncoming && S.t >= S.shieldUntil) spawnIncoming();
  const dueIv = S.invites.filter(iv => iv.at <= S.t + eps); S.invites = S.invites.filter(iv => iv.at > S.t + eps);
  for (const iv of dueIv) answerInvite(iv);
}
function answerInvite(iv) {
  const [x, y] = iv.key.split(',').map(Number); const b = bot(x, y); if (!b || !S.clan) return;
  const other = botClan(b) && !myClan(b) ? botClan(b) : null;
  const yes = b.active && !other && !b.rival && hash(x, y, 31) < 0.8;
  if (yes && S.clan.members.length + 1 < clanCap()) { S.clan.members.push(iv.key); note(`${b.name} joined [${S.clan.tag}]`, 'ok'); logEvt(`${b.name} (${x}|${y}) joined your clan`); }
  else note(`${b.name} declined your clan invite${other ? ` (already in [${other.tag}])` : b.rival ? ' (rivals never join)' : !b.active ? ' (inactive player)' : yes ? ' (your clan is full)' : ''}`, 'bad');
  dirty();
}
function sendInvite(b) {
  if (!S.clan) return note('Found a clan first (Clan Hall level 3).', 'bad');
  if (!b) return note('No player found.', 'bad');
  const key = b.x + ',' + b.y;
  if (S.clan.members.includes(key)) return note(`${b.name} is already in your clan.`, 'bad');
  if (S.invites.some(iv => iv.key === key)) return note(`You already invited ${b.name}.`, 'bad');
  if (S.clan.members.length + 1 + S.invites.length >= clanCap()) return note(`Your clan is full: ${clanCap()} members at Clan Hall level ${clanHall()}.`, 'bad');
  S.invites.push({ key, name: b.name, at: S.t + (S.test.instant ? 0 : 1 + hash(b.x, b.y, 32) * 3) }); note(`Clan invite sent to ${b.name}`); dirty();
}
function findPlayer(name) {
  const n = name.trim().toLowerCase(); if (!n) return null;
  for (let r = 0; r <= 30; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const b = bot(OWN[0] + dx, OWN[1] + dy); if (b && b.name.toLowerCase() === n) return b;
  }
  return null;
}
function nearbyPlayers(k) {
  const out = [];
  for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 8; dy++) { const b = bot(OWN[0] + dx, OWN[1] + dy); if (b && b.active && !botClan(b) && !b.rival) out.push([dist(OWN, [b.x, b.y]), b]); }
  return out.sort((p, q) => p[0] - q[0]).slice(0, k).map(p => p[1]);
}
function nightRun(k) {
  const p = Math.round(S.nextNight); S.nights[k] = p;
  const r = rnd(k * 7919 + 13); S.nextNight = NIGHTS[Math.floor(r() * 7)] * (0.85 + r() * 0.3);
  const seed = p / 10; S.seed += seed; addXP(Math.min(150, p / 100));
  note(`Squeektoshi ran ${fmt(p)} laps tonight: +${fmt(seed)} SEED, wheel bonus up to +${pct(p / PASS_PER_BONUS)}`, 'ok');
  logEvt(`Night ${k}: ${fmt(p)} laps · +${fmt(seed)} SEED`);
  if (!catching) { sfx('night'); showNight(p, seed); }
}
function finishOrder(o) {
  if (o.kind === 'field') S.fields[o.ref] = o.to;
  else if (o.kind === 'th') S.th = o.to;
  else if (o.kind === 'walls') S.walls = o.to;
  else if (o.kind === 'plot') { const p = S.plots[o.ref]; p.lvl = o.to; p.building = false; }
  if (!S.test.instant) { const m = `${orderName(o)} reached level ${o.to}`; note(m, 'ok'); sfx('build'); notify(m); } sceneDirty = true;
}
const orderName = o => o.kind === 'field' ? FIELD_NAME[o.ref] : o.kind === 'th' ? 'Town Hall' : o.kind === 'walls' ? 'Walls' : B[S.plots[o.ref].type].name;
const pending = (kind, ref) => S.slots.some(sl => sl.some(o => o.kind === kind && o.ref === ref));

// ------------------------------------------------------------------ actions
function curLevel(kind, ref) { return kind === 'field' ? S.fields[ref] : kind === 'th' ? S.th : kind === 'walls' ? S.walls : (S.plots[ref] ? S.plots[ref].lvl : 0); }
function capOf(kind, ref) {
  if (kind === 'th') return 10;
  if (kind === 'field' || kind === 'walls') return Math.min(10, S.th);
  const t = S.plots[ref].type; return t === 'storehouse' || t === 'vault' ? Math.min(20, 2 * S.th) : Math.min(B[t].max, S.th);
}
function bkey(kind, ref) { return kind === 'th' ? 'townhall' : kind === 'walls' ? 'walls' : kind === 'plot' ? S.plots[ref].type : null; }
function shortMsg(res, seed = 0) {      // what is missing, and roughly when it will be there
  const cap = storage();
  const over = res.findIndex(x => x > cap + 1e-6);
  if (over >= 0) return `Your Storehouse holds only ${fmt(cap)} ${RES_NAME[RES[over]]}: this needs ${fmt(res[over])}. Upgrade or build a Storehouse first.`;
  const parts = [], miss = res.map((x, i) => Math.max(0, x - S.res[i]));
  let eta = 0, never = '';
  miss.forEach((m, i) => { if (m < 0.5) return; parts.push(`${fmt(Math.ceil(m))} ${RES_NAME[RES[i]]}`); const net = netRate(i); if (net <= 0) never = RES_NAME[RES[i]]; else eta = Math.max(eta, m / net); });
  let out = parts.length ? `Needs ${parts.join(', ')} more` + (never ? ` · ${never} output is not positive` : ` · ready in about ${dur(eta)}`) : '';
  if (seed && S.seed + 1e-6 < seed) out += `${out ? '. Also needs' : 'Needs'} ${fmt(Math.ceil(seed - S.seed))} more SEED: the hamster pays it every night (next run ${clockToNight()})`;
  return out + '.';
}
function upgradeCheck(kind, ref) {
  const L = curLevel(kind, ref), to = L + 1;
  const c = costOf(kind, kind === 'field' ? ref : bkey(kind, ref), to);
  let why = '';
  const max = kind === 'field' ? 10 : B[bkey(kind, ref)].max;
  if (L >= max) why = 'Maximum level reached.';
  else if (pending(kind, ref)) why = 'Already in the build queue.';
  else if (to > capOf(kind, ref)) why = `Needs Town Hall level ${kind !== 'plot' || !['storehouse', 'vault'].includes(S.plots[ref].type) ? to : Math.ceil(to / 2)}.`;
  else if (!S.test.instant && !slotFor()) why = 'Both build slots and their queues are full.';
  else if (!canPay(c.res, c.seed)) why = shortMsg(c.res, c.seed);
  return { to, c, why };
}
function slotFor() { const s = [...S.slots].sort((a, b) => a.length - b.length)[0]; return s.length < 2 ? s : null; }
function placeOrder(kind, ref, to, c) {
  if (S.test.instant) { pay(c.res, c.seed); finishOrder({ kind, ref, to }); return; }
  const sl = slotFor(); if (!sl) return;
  const start = sl.length ? sl[sl.length - 1].end : S.t;
  pay(c.res, c.seed); sl.push({ id: S.seq++, kind, ref, to, start, end: start + c.h, paid: S.test.free ? null : { res: c.res, seed: c.seed } });
}
function doUpgrade(kind, ref) {
  const u = upgradeCheck(kind, ref); if (u.why) return note(u.why, 'bad');
  placeOrder(kind, ref, u.to, u.c); note(`${kind === 'field' ? FIELD_NAME[ref] : kind === 'th' ? 'Town Hall' : kind === 'walls' ? 'Walls' : B[S.plots[ref].type].name} → level ${u.to}${S.test.instant ? '' : ' ordered'}`, S.test.instant ? 'ok' : ''); sceneDirty = true; dirty();
}
function buildCheck(i, type) {
  const c = costOf('plot', type, 1); let why = '';
  if (B[type].unlock && !researched(B[type].unlock)) why = 'Research it in the Academy first.';
  else if (B[type].th && S.th < B[type].th) why = `Needs Town Hall level ${B[type].th}.`;
  else if (plotsOf(type).length >= B[type].multi) why = 'You already have one.';
  else if (!S.test.instant && !slotFor()) why = 'Both build slots and their queues are full.';
  else if (!canPay(c.res, c.seed)) why = shortMsg(c.res, c.seed);
  return { c, why };
}
function doBuild(i, type) {
  const b = buildCheck(i, type); if (b.why) return note(b.why, 'bad');
  S.plots[i] = { type, lvl: 0, building: true }; placeOrder('plot', i, 1, b.c); S.sel = { kind: 'plot', i }; note(S.test.instant ? `${B[type].name} built` : `${B[type].name} ordered`, S.test.instant ? 'ok' : ''); sceneDirty = true; dirty();
}
function researchCost(t) { const tot = 600 * 2.2 ** (t - 1); return { res: [0.25, 0.25, 0.25, 0.25].map(f => tot * f), seed: 300 * 2 ** (t - 1), h: 2 * 1.8 ** (t - 1) * 0.95 ** (levelOf('academy') - 1) }; }
const tierOpen = () => { const L = levelOf('academy'); let t = 0; while (t < 5 && TIER_AT[t + 1] <= L) t++; return t; };
function doResearch(id) {
  const r = RESEARCH.find(x => x.id === id); const c = researchCost(r.tier);
  if (!levelOf('academy')) return note('Build an Academy first.', 'bad');
  if (S.research.cur) return note('The Academy is busy.', 'bad');
  if (r.tier > tierOpen()) return note(`Needs Academy level ${TIER_AT[r.tier]}.`, 'bad');
  if (!canPay(c.res, c.seed)) return note(shortMsg(c.res, c.seed), 'bad');
  pay(c.res, c.seed);
  if (S.test.instant) { S.research.done.push(id); note(`Research done: ${r.name}`, 'ok'); dirty(); return; }
  S.research.cur = { id, end: S.t + c.h, start: S.t, paid: S.test.free ? null : { res: c.res, seed: c.seed } }; note(`Researching ${r.name}`); dirty();
}
const unitOpen = k => !U[k].r || researched(U[k].r);
function trainMax(k) {
  const room = popCap() - upkeepPlanned(); const byRoom = Math.floor(room / U[k].u);
  const byRes = S.test.free ? Infinity : Math.min(...U[k].cost.map((c, i) => Math.floor(S.res[i] / c)));
  return Math.max(0, Math.min(byRoom, byRes));
}
function doTrain(k, n) {
  n = Math.floor(n);
  if (!levelOf('barracks')) return note('Build Barracks first.', 'bad');
  if (S.training) return note('The Barracks are already training.', 'bad');
  if (!unitOpen(k)) return note('Research this unit first.', 'bad');
  if (n < 1) return note('Choose how many to train.', 'bad');
  const room = Math.floor((popCap() - upkeepPlanned()) / U[k].u);
  if (n > room) return note(`Burrow room for only ${Math.max(0, room)} more ${U[k].name}${room === 1 ? '' : 's'}: build or upgrade Burrows.`, 'bad');
  const cost = U[k].cost.map(c => c * n);
  if (!canPay(cost)) return note(shortMsg(cost), 'bad');
  pay(cost); const h = n * U[k].m / 60 * 0.9 ** (levelOf('barracks') - 1);
  if (S.test.instant) { S.units[k] += n; note(`${n} ${U[k].name}${n > 1 ? 's' : ''} trained`, 'ok'); dirty(); return; }
  S.training = { unit: k, n, start: S.t, end: S.t + h, paid: S.test.free ? null : cost }; note(`Training ${n} ${U[k].name}${n > 1 ? 's' : ''}`); dirty();
}
function doExchange(from, to, amt) {          // from 0-3 = a resource, 4 = SEED (one way: SEED never comes back out)
  const L = levelOf('market'); if (!L) return note('Build a Market first.', 'bad');
  amt = Math.floor(amt); if (from === to || amt <= 0 || to > 3) return note('Choose what to give, a resource to get and an amount.', 'bad');
  const seed = from === 4, name = seed ? 'SEED' : RES_NAME[RES[from]];
  if ((seed ? S.seed : S.res[from]) < amt) return note(`Not enough ${name}.`, 'bad');
  const get = amt * MARKET(L) / 100; const room = storage() - S.res[to];
  if (get > room) return note(`Your Storehouse has room for only ${fmt(room)} more ${RES_NAME[RES[to]]}.`, 'bad');
  if (seed) S.seed -= amt; else S.res[from] -= amt;
  S.res[to] += get; note(`Exchanged ${fmt(amt)} ${name} for ${fmt(get)} ${RES_NAME[RES[to]]}`, 'ok'); dirty();
}
function doPoint(k) { if (hfree() <= 0) return; if (k !== 'might' && S.champ.pts[k] >= 20) return note('That bonus is already at its cap.', 'bad'); S.champ.pts[k]++; dirty(); }
const week = t => Math.floor((day(t) - 1) / 7) + 1;
function addStat(k, v) { S.stats[k] += v; const w = week(S.t); S.stats.wk[w] = S.stats.wk[w] || { atk: 0, def: 0, loot: 0 }; if (k in S.stats.wk[w]) S.stats.wk[w][k] += v; }
const gapLow = b => !b.camp && S.th - botLvl(b) >= 3;          // target 3+ Town Hall levels below you: half loot, no points
function pickUnits(units, keys) { const out = {}; for (const k of keys) { const n = Math.min(S.units[k], Math.max(0, Math.floor(units[k] || 0))); if (n) out[k] = n; } return out; }
function travel(b, sent) { const d = S.test.instant ? 0 : dist(OWN, [b.x, b.y]); const spd = Math.min(...Object.keys(sent).map(k => U[k].s)) * (researched('march') ? 1.2 : 1); return d / spd; }
function sendAttack(b, units, champ) {
  if (!S.test.free && S.t < S.shieldUntil) return note('Your beginner shield is on: you cannot attack yet.', 'bad');
  if (botShielded(b)) return note('That village is under a beginner shield.', 'bad');
  if (myClan(b)) return note('That village is in your clan.', 'bad');
  const st = botState(b); if ((st.raids[day(S.t)] || 0) >= 3) return note('That village was raided 3 times today already.', 'bad');
  const sent = pickUnits(units, FIGHT);
  if (!Object.keys(sent).length) return note('Choose some units to send.', 'bad');
  if (champ && !champOk()) champ = false;
  if (S.t < S.peaceUntil) { S.peaceUntil = 0; note('Your peace shield ended because you attacked.', 'bad'); }
  const tt = travel(b, sent);
  for (const k in sent) S.units[k] -= sent[k];
  if (champ) S.champ.home = false;
  S.moves.push({ id: S.seq++, kind: 'attack', to: [b.x, b.y], units: sent, champ, depart: S.t, arrive: S.t + tt, back: tt });
  note(S.test.instant ? `Army sent to (${b.x}|${b.y})` : `Army sent to (${b.x}|${b.y}), arrives in ${dur(tt)}`); dirty();
}
function sendScout(b, n) {
  n = Math.min(S.units.scout, Math.floor(n || 0)); if (n < 1) return note('Train Scouts at the Barracks first (research them in the Academy).', 'bad');
  if (myClan(b)) return note('That village is in your clan: you already see it.', 'bad');
  const tt = travel(b, { scout: n }); S.units.scout -= n;
  S.moves.push({ id: S.seq++, kind: 'scout', to: [b.x, b.y], units: { scout: n }, depart: S.t, arrive: S.t + tt, back: tt });
  note(S.test.instant ? `Scouts sent to (${b.x}|${b.y})` : `Scouts on the way to (${b.x}|${b.y}), back with a report in ${dur(2 * tt)}`); dirty();
}
function sendSupport(b, units) {
  if (!myClan(b)) return note('You can only support members of your clan.', 'bad');
  const sent = pickUnits(units, UK); if (!Object.keys(sent).length) return note('Choose some units to send.', 'bad');
  const tt = travel(b, sent); for (const k in sent) S.units[k] -= sent[k];
  S.moves.push({ id: S.seq++, kind: 'support', to: [b.x, b.y], units: sent, depart: S.t, arrive: S.t + tt, back: tt });
  note(`Support sent to ${b.name}${S.test.instant ? '' : `, arrives in ${dur(tt)}`}`); dirty();
}
function recall(i) {
  const st = S.abroad[i]; if (!st) return; S.abroad.splice(i, 1); const [x, y] = st.key.split(',').map(Number);
  const tt = travel({ x, y }, st.units);
  S.moves.push({ id: S.seq++, kind: 'return', from: [x, y], units: st.units, champ: false, loot: [0, 0, 0, 0], depart: S.t, arrive: S.t + tt });
  note(`Support recalled from (${x}|${y})`); dirty();
}
function refund(paid, f = 0.8) { if (!paid) return 0; const cap = storage(); let tot = 0; (paid.res || paid).forEach((x, i) => { const g = Math.min(x * f, cap - S.res[i]); S.res[i] += Math.max(0, g); tot += x * f; }); if (paid.seed) S.seed += paid.seed * f; return tot; }
function cancelOrder(si, oi) {
  const sl = S.slots[si], o = sl && sl[oi]; if (!o) return;
  sl.splice(oi, 1); refund(o.paid);
  if (oi === 0 && sl.length) { const d = sl[0].end - sl[0].start; sl[0].start = S.t; sl[0].end = S.t + d; }
  if (o.kind === 'plot' && S.plots[o.ref] && S.plots[o.ref].building && o.to === 1) S.plots[o.ref] = null;
  note(`${o.kind === 'plot' && !S.plots[o.ref] ? 'Building' : orderName(o) + ' → ' + o.to} cancelled${o.paid ? ': 80% refunded' : ''}`); sceneDirty = true; dirty();
}
function cancelResearch() { const r = S.research.cur; if (!r) return; refund(r.paid); S.research.cur = null; note(`Research cancelled${r.paid ? ': 80% refunded' : ''}`); dirty(); }
function cancelTraining() { const tr = S.training; if (!tr) return; refund(tr.paid); S.training = null; note(`Training cancelled${tr.paid ? ': 80% refunded' : ''}`); dirty(); }
function dismiss(k, n) { n = Math.min(S.units[k], Math.floor(n || 0)); if (n < 1) return note('Choose how many to dismiss.', 'bad'); S.units[k] -= n; note(`${n} ${U[k].name}${n > 1 ? 's' : ''} dismissed`); dirty(); }
function arrive(m) {
  if (m.kind === 'attack') return resolveAttack(m);
  if (m.kind === 'scout') return resolveScout(m);
  if (m.kind === 'support') { const b = bot(m.to[0], m.to[1]); if (b && myClan(b)) { S.abroad.push({ key: m.to.join(','), name: b.name, units: m.units, since: S.t }); note(`Your support reached ${b.name}`, 'ok'); } else { S.moves.push({ id: S.seq++, kind: 'return', from: m.to, units: m.units, champ: false, loot: [0, 0, 0, 0], depart: S.t, arrive: S.t + m.back }); note('That village left your clan: your support is coming back', 'bad'); } return; }
  if (m.kind === 'help') { S.helpers.push({ key: m.from.join(','), name: m.name, units: m.units, until: m.stay }); note(`${m.name} arrived to help defend`, 'ok'); return; }
  if (m.kind === 'return') {
    for (const k in m.units) S.units[k] += m.units[k];
    if (m.champ) S.champ.home = true;
    const cap = storage(); let got = 0;
    m.loot.forEach((x, i) => { const g = Math.min(x, cap - S.res[i]); S.res[i] += Math.max(0, g); got += Math.max(0, g); });
    const lost = m.loot.reduce((a, x) => a + x, 0) - got;
    note(`Army home${got ? ` with ${fmt(got)} loot` : ''}${lost > 1 ? ` (${fmt(lost)} did not fit in the Storehouse)` : ''}`, 'ok'); return;
  }
  if (m.kind === 'incoming') return resolveIncoming(m);
}
function resolveScout(m) {
  const b = bot(m.to[0], m.to[1]); const key = m.to.join(',');
  const tr = botTroops(b), w = botWalls(b), stock = botStock(b), D = botDefense(b);
  S.intel[key] = { t: S.t }; addStat('scouts', 1);
  report('s', `Scouting ${b.name}${b.addr ? ' · ' + shortAddr(b.addr) : ''} (${b.x}|${b.y})`,
    [`Weak spots found: your attacks on this village get +${pct(SCOUT_BONUS)} attack for the next ${SCOUT_HOURS} h.`, b.camp ? `Defense ${fmt(D)} · a wild camp: no Walls, no Vault.` : `Defense ${fmt(D)} · Walls level ${w} (+${4 * w}%) · Town Hall ${botLvl(b)}.`, `About ${fmt(botLootable(b))} can be looted (stock ${fmt(stock)} of each${b.camp ? '' : `, ${fmt(botProt(b))} of each is in the Vault`}).`, `${botClan(b) ? `Clan [${botClan(b).tag}]. ` : ''}Your scouts were not seen.`],
    [{ title: `Defenders · ${b.name}`, rows: [['Spearman', tr.spearman, 0, tr.spearman], ['Shieldbearer', tr.shieldbearer, 0, tr.shieldbearer]].filter(r => r[1] > 0) }], { kind: 'scout', target: m.to });
  S.moves.push({ id: S.seq++, kind: 'return', from: m.to, units: m.units, champ: false, loot: [0, 0, 0, 0], depart: S.t, arrive: S.t + m.back });
  note(`Scout report from (${b.x}|${b.y})`, 'ok');
}
function resolveAttack(m) {
  const b = bot(m.to[0], m.to[1]); const st = botState(b);
  const sb = scoutBonus(b), A = attackPower(m.units, m.champ) * (1 + sb), D = botDefense(b);
  const fa = Math.min(1, 0.5 * D / A), fd = Math.min(1, 0.5 * A / D), win = A >= 2 * D;
  const back = researched('medicine') ? 0.1 : 0;
  const surv = {}, lost = {};
  for (const k in m.units) { const l = Math.round(m.units[k] * fa); lost[k] = l; surv[k] = m.units[k] - l + Math.floor(l * back); }
  const tr = botTroops(b); const killedCost = (tr.spearman * unitValue('spearman') + tr.shieldbearer * unitValue('shieldbearer')) * fd;
  const low = gapLow(b);
  const attRows = Object.keys(m.units).map(k => [U[k].name, m.units[k], lost[k], surv[k]]);
  if (m.champ) attRows.push(['Champion', 1, 0, fa > fd ? '1 (injured)' : 1]);
  const defRows = [['Spearman', tr.spearman], ['Shieldbearer', tr.shieldbearer]].filter(r => r[1] > 0).map(([n, c]) => { const l = Math.round(c * fd); return [n, c, l, c - l]; });
  if (!defRows.length) defRows.push(['No troops', 0, 0, 0]);
  st.loss = Math.min(1, fd); st.lossAt = S.t;
  if (b.active && botAtk(botArmy(b)) >= 0.9 * defense()) { st.grudgeUntil = S.t + 48; S.nextIncoming = Math.min(S.nextIncoming, S.t + 4 + hash(b.x, b.y, Math.floor(S.t)) * 10); }     // they can strike back
  if (!low) { if (!b.camp) addStat('atk', killedCost); if (m.champ) addXP(killedCost / 20); }
  if (m.champ && fa > fd) S.champ.inj = S.t + 12;
  let loot = [0, 0, 0, 0], catapult = '';
  if (win) {
    const stock = botStock(b), prot = botProt(b); let carry = carryOf(surv, m.champ); const per = Math.max(0, stock - prot) * (low ? 0.5 : 1);
    for (let i = 0; i < 4; i++) { const x = Math.min(per, carry / (4 - i)); loot[i] = x; carry -= x; }
    st.s0 = stock - loot.reduce((a, x) => a + x, 0) / 4; st.t0 = S.t; st.raids[day(S.t)] = (st.raids[day(S.t)] || 0) + 1;
    if ((surv.catapult || 0) >= 20 && botWalls(b) > 0) { const dn = Math.min(2, Math.floor(surv.catapult / 20)); const w0 = botWalls(b); st.walls = Math.max(0, w0 - dn); st.wallAt = S.t; catapult = ` Walls lowered from ${w0} to ${st.walls} (they rebuild one level every 12 h).`; }
    addStat('wins', 1); if (!b.camp) addStat('loot', loot.reduce((a, x) => a + x, 0));
  }
  const tot = loot.reduce((a, x) => a + x, 0);
  report(win ? 'w' : 'l', `Attack on ${b.name}${b.addr ? ' · ' + shortAddr(b.addr) : ''} (${b.x}|${b.y})`,
    [`Your attack ${fmt(A)}${sb ? ` (with +${pct(sb)} from scouting)` : ''} vs defense ${fmt(D)}${win ? ' · at least 2×: defenders wiped' : A >= D ? ' · not 2×: no loot' : ''}.`,
     `You lost ${pct(fa)} of your army (${unitList(lost)}). They lost ${pct(fd)} of their defenders.${catapult}`,
     win ? `Loot: ${fmt(tot)} (${loot.map((x, i) => `${fmt(x)} ${RES_NAME[RES[i]]}`).join(', ')})${low ? '. Town Hall 3+ levels below yours: half loot and no attack points.' : ''}` : 'No loot.'],
    [{ title: 'Your army', rows: attRows }, { title: `Defenders · ${b.name}`, rows: defRows }], { kind: 'atk', target: m.to, sent: m.units });
  const anyLeft = Object.values(surv).some(x => x > 0);
  if (anyLeft || m.champ) S.moves.push({ id: S.seq++, kind: 'return', from: m.to, units: surv, champ: m.champ, loot, depart: S.t, arrive: S.t + m.back });
  note(win ? `Raid won at (${b.x}|${b.y}): ${fmt(tot)} loot on the way home` : `Attack on (${b.x}|${b.y}) failed to break the defense`, win ? 'ok' : 'bad');
}
function spawnIncoming() {
  // A real neighbour decides to raid you: it must think it can win (2x your defense, judged roughly),
  // or hold a grudge because you raided it. A strong defense and a full Vault keep raiders away.
  S.nextIncoming = S.t + 18 + rnd(S.seq * 31)() * 24;
  if (S.t < S.peaceUntil) return;
  const D = defense(), lootable = S.res.reduce((a, x) => a + Math.max(0, x - protect()), 0);
  const cands = [];
  for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 8; dy++) {
    const b = bot(OWN[0] + dx, OWN[1] + dy); if (!b || !b.active || myClan(b) || botShielded(b)) continue;
    const st = botState(b), grudge = (st.grudgeUntil || 0) > S.t; if (b.rival && !grudge) continue;
    if (S.moves.some(m => m.kind === 'incoming' && m.from[0] === b.x && m.from[1] === b.y) || S.t - (st.raidedYou || -99) < 48) continue;     // one raid per neighbour every 2 days
    const units = botArmy(b), A = botAtk(units); const est = D * (0.75 + 0.5 * hash(b.x, b.y, Math.floor(S.t * 10)));
    if (A < (grudge ? 1.2 : 2) * est) continue;
    if (!grudge && lootable < 300) continue;
    cands.push({ b, units, A, w: grudge ? 5 : 1 });
  }
  if (!cands.length) return;
  const r = rnd(Math.floor(S.t * 100) + 7)(); let acc = 0, tot = cands.reduce((a, c) => a + c.w, 0), pick = cands[0];
  for (const c of cands) { acc += c.w / tot; if (r <= acc) { pick = c; break; } }
  const { b, units, A } = pick; const st = botState(b); const grudge = (st.grudgeUntil || 0) > S.t; st.grudgeUntil = 0; st.raidedYou = S.t;
  const tt = dist(OWN, [b.x, b.y]) / 6;
  S.moves.push({ id: S.seq++, kind: 'incoming', from: [b.x, b.y], name: b.name, units, A, depart: S.t, arrive: S.t + tt, revenge: grudge });
  note(`${grudge ? 'Revenge! ' : ''}${b.name} (${b.x}|${b.y}) is attacking you: arrives in ${dur(tt)}`, 'bad'); sfx('alarm'); notify(`Incoming attack from ${b.name}`, `Arrives in ${dur(tt)}`);
  clanHelp(S.t + tt);
}
function clanHelp(at) {             // clan members near you may send defenders
  if (!S.clan) return;
  for (const key of S.clan.members) {
    const [x, y] = key.split(',').map(Number); const b = bot(x, y); if (!b || !b.active) continue;
    const d = dist(OWN, [x, y]), tt = d / 5; if (S.t + tt > at || hash(x, y, Math.floor(S.t)) > 0.6) continue;
    if (S.moves.some(m => m.kind === 'help' && m.from[0] === x && m.from[1] === y) || S.helpers.some(hp => hp.key === key)) continue;
    const tr = botTroops(b); const units = { shieldbearer: Math.max(4, Math.round(tr.shieldbearer * 0.4)), spearman: Math.round(tr.spearman * 0.3) };
    S.moves.push({ id: S.seq++, kind: 'help', from: [x, y], name: b.name, units, depart: S.t, arrive: S.t + tt, stay: at + 6 });
    note(`${b.name} [${S.clan.tag}] is sending ${unitList(units)} to help you`, 'ok');
  }
}
function resolveIncoming(m) {
  const D = defense(), A = m.A; const fa = Math.min(1, 0.5 * D / A), fd = Math.min(1, 0.5 * A / D), win = A >= 2 * D;
  const back = researched('medicine') ? 0.1 : 0; const lost = {}; const before = { ...S.units };
  for (const k of UK) { const l = Math.round(S.units[k] * fd); lost[k] = l; S.units[k] -= l - Math.floor(l * back); }
  const helpRows = [];
  for (const hp of S.helpers) for (const k in hp.units) { const n = hp.units[k]; const l = Math.round(n * fd); hp.units[k] = n - l; helpRows.push([`${U[k].name} (${hp.name})`, n, l, n - l]); }
  const atkB = bot(m.from[0], m.from[1]); if (atkB) { const st = botState(atkB); st.aloss = fa; st.alossAt = S.t; }
  const enemyRows = Object.entries(m.units).filter(([, n]) => n > 0).map(([k, n]) => { const l = Math.round(n * fa); return [U[k].name, n, l, n - l]; });
  const myRows = UK.filter(k => before[k] > 0).map(k => [U[k].name, before[k], lost[k], S.units[k]]).concat(helpRows);
  if (champOk()) myRows.push(['Champion', 1, 0, fd > fa ? '1 (injured)' : 1]);
  if (!myRows.length) myRows.push(['No troops at home', 0, 0, 0]);
  const killedCost = ((m.units.berserker || 0) * unitValue('berserker') + (m.units.spearman || 0) * unitValue('spearman')) * fa;
  addStat('def', killedCost);
  if (champOk()) { addXP(killedCost / 20); if (fd > fa) S.champ.inj = S.t + 12; }
  let loot = 0;
  if (win) {
    let carry = ((m.units.berserker || 0) * U.berserker.c + (m.units.spearman || 0) * U.spearman.c) * (1 - fa); const prot = protect();
    for (let i = 0; i < 4; i++) { const x = Math.min(Math.max(0, S.res[i] - prot), carry / (4 - i)); S.res[i] -= x; carry -= x; loot += x; }
  }
  const nm = m.name || (atkB ? atkB.name : '');
  report(win ? 'l' : 'w', `Defense against ${nm}${atkB ? ' · ' + shortAddr(atkB.addr) : ''} (${m.from[0]}|${m.from[1]})${m.revenge ? ' · revenge' : ''}`,
    [`Their attack ${fmt(A)} vs your defense ${fmt(D)}${win ? ' · they had 2×: your defenders fell' : ' · they did not have 2×'}.`,
     `You lost ${pct(fd)} of your defenders (${unitList(lost)}). They lost ${pct(fa)}.`,
     win ? `They took ${fmt(loot)} resources. The Vault kept ${fmt(protect())} of each safe.` : 'Nothing was taken.'],
    [{ title: `Attackers · ${nm || 'unknown'}`, rows: enemyRows }, { title: 'Your defenders', rows: myRows }], { kind: 'def', target: m.from });
  note(win ? `Your village was raided: ${fmt(loot)} lost` : 'Your defense held!', win ? 'bad' : 'ok'); sfx('battle');
}
const unitList = u => { const s = Object.entries(u).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${U[k].name}`); return s.length ? s.join(', ') : 'none'; };
function report(res, title, lines, tables, extra) { S.reports.unshift({ id: S.seq++, t: S.t, res, title, lines, tables: tables || [], ...(extra || {}) }); S.reports = S.reports.slice(0, 40); S.unread++; if (!catching && res !== 's') notify(title, lines[0]); }
function logEvt(s) { S.log.unshift({ t: S.t, s }); S.log = S.log.slice(0, 60); }

// ------------------------------------------------------------------ UI: toasts, routing
function note(msg, kind = '') {
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => el.remove(), 2600);
}
let view = 'home', sceneDirty = true, needFull = true;
const dirty = () => { needFull = true; };
const VIEWS = ['home', 'village', 'world', 'army', 'academy', 'market', 'clan', 'champion', 'ranking', 'reports'];
function route() {
  const h = location.hash.slice(1);
  const SECT = ['how', 'wheel', 'units', 'rules', 'report', 'faq'];
  const v = VIEWS.includes(h) ? h : 'home';
  view = v;
  $('#home').classList.toggle('on', v === 'home');
  $('#game').hidden = v === 'home';
  for (const id of VIEWS.slice(1)) $('#' + id).classList.toggle('on', id === v);
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  if (v === 'reports') S.unread = 0;
  if (v === 'home' && SECT.includes(h)) document.getElementById(h)?.scrollIntoView();
  if (v !== 'home' && !S.ui.net) { $('#netbox').hidden = false; }
  else if (v !== 'home' && !S.wallet) { $('#walletbox').hidden = false; $('#wb-msg').textContent = window.ethereum ? '' : 'No wallet extension found in this browser. The prototype can use a demo wallet instead.'; }
  else if (v !== 'home' && !S.username) { $('#nm-wallet').textContent = shortAddr(S.wallet); const nb = $('#namebox'); nb.hidden = false; const i = $('#nm-in'); i.placeholder = i.placeholder || randomName(); if (innerWidth > 900) setTimeout(() => i.focus(), 50); }
  sceneDirty = true; needFull = true; layout(); render(true);
}

// ------------------------------------------------------------------ UI: top bar
function renderBar() {
  const cap = storage();
  const items = RES.map((r, i) => {
    const net = netRate(i), full = S.res[i] >= cap - 1, toFull = net > 0 && !full ? (cap - S.res[i]) / net : Infinity, soon = toFull < 2;
    const tip = full ? `${RES_NAME[r]} is full: production is lost until you spend some or build storage` : soon ? `${RES_NAME[r]} full in ${dur(toFull)}` : RES_NAME[r];
    return `<div class="r ${full ? 'full' : soon ? 'soon' : ''}" title="${tip}">${icon(r)} <b>${fmt(S.res[i])}</b><s> / ${fmt(cap)}</s><div class="bar"><i style="width:${Math.min(100, S.res[i] / cap * 100).toFixed(0)}%"></i></div><em class="${net < 0 ? 'neg' : net < 60 ? 'low' : ''}">${full ? 'FULL' : `${net >= 0 ? '+' : ''}${fmt(net)}/h${soon ? ` · full ${dur(toFull)}` : ''}`}</em></div>`;
  }).join('');
  setHTML($('#resbar'), items + `<div class="r seedr">${icon('seed')} <b>${fmt(S.seed)}</b><s> SEED</s><em>run ${clockToNight()}</em></div>`);
  const h = ((S.t % 24) + 24) % 24, running = h < 4;
  const laps = running ? Math.round(S.nextNight * h / 4) : lastPasses();
  const sb = S.test.free || S.test.instant || S.test.prod > 1 ? ` · <b class="gold">TEST:</b> ${[S.test.free && 'free', S.test.instant && 'instant', S.test.prod > 1 && `output ×${S.test.prod}`].filter(Boolean).join(', ')}` : '';
  const extra = [RES.map((r, i) => boosted(i) ? `<b class="ok">${RES_NAME[r]} +25%</b> ${dur(S.boost[i] - S.t)}` : '').filter(Boolean).join(' · '), S.t < S.peaceUntil ? `<b class="ok">Peace shield</b> ${dur(S.peaceUntil - S.t)}` : ''].filter(Boolean).join(' · ');
  setHTML($('#wheelchip'), `<span class="dot ${running ? 'run' : ''}"></span> ${running ? `Squeektoshi running · ${fmt(laps)} laps` : `Squeektoshi resting · ${fmt(lastPasses())} laps last night`} · Wheel bonus <b class="gold">+${pct(wheelBonus())}</b>${levelOf('wheelhouse') ? '' : ' (needs a Wheelhouse)'}${squeekBuild() ? ` · ${held().length} Squeek${held().length > 1 ? 's' : ''}: build −${pct(squeekBuild())}` : ''}${extra ? ' · ' + extra : ''} · Day ${day(S.t)} ${clock(S.t)} · ×${S.speed}${sb}`);
  const lg = $('#logoHome small'); if (lg) lg.textContent = `${S.username || 'New player'} · ${shortAddr(S.wallet)} · ${held().length ? `${held().length} Squeek${held().length > 1 ? 's' : ''}` : 'no Squeek'}`;
  const rt = $('#tabs a[data-v="reports"]'); setHTML(rt, 'Reports' + (S.unread ? `<span class="badge">${S.unread}</span>` : ''));
  // incoming attack banner
  const inc = S.moves.filter(m => m.kind === 'incoming').sort((a, b) => a.arrive - b.arrive)[0];
  const al = $('#alert');
  if (inc) { al.hidden = false; setHTML(al, `<span>⚔ <b>${esc(inc.name || 'A neighbour')}</b> (${inc.from[0]}|${inc.from[1]}) attacks in <b>${dur(inc.arrive - S.t)}</b> · ~${fmt(inc.A)} attack vs your <b>${fmt(defense())}</b> defense${inc.A >= 2 * defense() ? ' · <b>they will break through</b>' : ''}${S.moves.filter(m => m.kind === 'incoming').length > 1 ? ` · ${S.moves.filter(m => m.kind === 'incoming').length} attacks coming` : ''}</span><span class="pbtn"><a class="btn sm" href="#army">Prepare</a><button class="btn ghost sm" data-act="showatk" data-x="${inc.from[0]}" data-y="${inc.from[1]}">On map</button></span>`); }
  else al.hidden = true;
  const bh = $('#bar').getBoundingClientRect().height; document.documentElement.style.setProperty('--barh', bh + 'px');
}
function clockToNight() { const h = ((S.t % 24) + 24) % 24; const to = h < 4 ? 4 - h : 28 - h; return `in ${dur(to)}`; }

// ------------------------------------------------------------------ UI: village scene
let vscale = 0.5;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
function zoomLimits() { const st = $('#vstage'); const w = st.clientWidth, h = st.clientHeight; return { fit: Math.min(w / 1920, h / 1200), cover: Math.max(w / 1920, h / 1200), max: Math.max(1, Math.max(w / 1920, h / 1200)) }; }
function layout() {
  if (view === 'village') {
    const st = $('#vstage'); if (!st.clientWidth) return; const z = zoomLimits();
    if (!pan.init) {
      const mobile = innerWidth <= 900;
      vscale = S.ui.vz ? clamp(S.ui.vz, z.fit, z.max) : mobile ? z.fit : z.cover;     // phones open on the whole village
      if (mobile && !S.ui.vz) setTimeout(() => note('Pinch or tap + to zoom in'), 700);
      pan.x = (st.clientWidth - 1920 * vscale) / 2; pan.y = (st.clientHeight - 1200 * vscale) / 2; pan.init = true;
    } else vscale = clamp(vscale, z.fit, z.max);
    clampPan(); applyPan();
  }
  if (view === 'world') sizeCanvas();
}
const pan = { x: 0, y: 0, init: false };
function zoomAt(f, cx, cy) {
  const z = zoomLimits(), s1 = vscale, s2 = clamp(s1 * f, z.fit, z.max); if (Math.abs(s2 - s1) < 1e-4) return;
  pan.x = cx - (cx - pan.x) * s2 / s1; pan.y = cy - (cy - pan.y) * s2 / s1; vscale = s2; S.ui.vz = s2; clampPan(); applyPan();
}
function clampPan() {
  const st = $('#vstage'); const W = 1920 * vscale, H = 1200 * vscale, sw = st.clientWidth, sh = st.clientHeight;
  pan.x = W <= sw ? (sw - W) / 2 : Math.min(0, Math.max(sw - W, pan.x));
  pan.y = H <= sh ? (sh - H) / 2 : Math.min(0, Math.max(sh - H, pan.y));
}
function applyPan() { $('#scene').style.transform = `translate(${pan.x}px,${pan.y}px) scale(${vscale})`; }
function stageDrag(stage, onMove, onTap, onPinch) {     // drag to pan, tap to select, two fingers to zoom
  const pts = new Map(); let moved = false, last = null, pinchD = 0;
  stage.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { stage.setPointerCapture(e.pointerId); } catch (er) { }
    if (pts.size === 1) { moved = false; last = { x: e.clientX, y: e.clientY }; }
    else if (pts.size === 2) { moved = true; const [a, b] = [...pts.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) { if (!onPinch) return; const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = stage.getBoundingClientRect(); if (pinchD) onPinch(d / pinchD, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); pinchD = d; return; }
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    if (!moved && Math.hypot(dx, dy) > 6) { moved = true; stage.classList.add('drag'); }
    if (moved) { onMove(dx, dy); last = { x: e.clientX, y: e.clientY }; }
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (!pts.size) { if (!moved) onTap(e); stage.classList.remove('drag'); } else { const p = [...pts.values()][0]; last = { x: p.x, y: p.y }; pinchD = 0; }
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', e => { pts.delete(e.pointerId); if (!pts.size) stage.classList.remove('drag'); });
}
// scene furniture (scene pixels, village_bg is 1920×1200)
const LAMPS = [[880, 509], [1044, 509], [864, 607], [1060, 607]];
const arc = (a0, a1) => Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (a0 + i * (a1 - a0) / 12); return [960 + 273 * Math.cos(a), 601 + 205 * Math.sin(a)]; });
const PATHS = [[[560, 285], [627, 333], [870, 548]], [[1345, 310], [1287, 340], [1050, 548]], [[545, 915], [627, 840], [867, 640]], [[1360, 905], [1293, 840], [1053, 640]], arc(1.05, 1.95), arc(0.08, 0.92), [[627, 333], [870, 548], [1053, 640], [1293, 840]]];
const VILLAGERS = ['villager_farmer', 'villager_baker', 'villager_merchant', 'villager_elder', 'villager_plain', 'villager_innkeeper', 'villager_young', 'villager_crowned'];
// measured on the sprites (pixels of the .webp): the wheel's front ring, and where smoke leaves each chimney.
// Forge and Clan Hall have smoke painted into the art, so they get none here.
const WHEEL_GEO = {wheelhouse_1:{w:161,h:300,cx:41.25,cy:221.25,rx:33.0,ry:43.25,rot:-0.401},wheelhouse_2:{w:159,h:300,cx:36.0,cy:223.75,rx:32.0,ry:42.0,rot:-0.384},wheelhouse_3:{w:159,h:300,cx:35.25,cy:223.5,rx:31.5,ry:41.75,rot:-0.384},wheelhouse_4:{w:161,h:300,cx:36.0,cy:224.0,rx:31.5,ry:41.75,rot:-0.384},wheelhouse_5:{w:162,h:300,cx:37.0,cy:223.5,rx:31.5,ry:41.0,rot:-0.384}};
const CHIMNEY = {barracks_3:{w:229,h:300,x:73,y:14.5},barracks_4:{w:219,h:300,x:65.5,y:9.5},town_hall_2:{w:208,h:300,x:156.5,y:57.5},town_hall_3:{w:205,h:300,x:157.5,y:53.5},town_hall_4:{w:209,h:300,x:158,y:58},storehouse_3:{w:198,h:300,x:54.5,y:19.5},storehouse_4:{w:195,h:300,x:53,y:21.5},burrow_1:{w:246,h:294,x:90,y:24},burrow_4:{w:216,h:300,x:157.5,y:43.5},burrow_5:{w:202,h:300,x:151,y:30},academy_1:{w:218,h:300,x:62,y:85},academy_2:{w:203,h:300,x:61,y:86},academy_3:{w:205,h:300,x:62,y:87},academy_4:{w:202,h:300,x:61.5,y:85},academy_5:{w:193,h:300,x:53.5,y:91.5},market_3:{w:235,h:300,x:68,y:29},market_4:{w:265,h:300,x:67,y:5}};
function nightness(t = S.t) { const h = ((t % 24) + 24) % 24; return h >= 21 || h < 5 ? 1 : h >= 18 ? (h - 18) / 3 : h < 7 ? (7 - h) / 2 : 0; }
const clanColor = tag => { const c = ['#c0392b', '#2f6fd6', '#2e9e5b', '#8e44ad', '#d68910', '#16a085']; let h = 0; for (const ch of tag || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0; return c[h % c.length]; };
let moveFrom = null, confirmDemo = null;
function orderOf(kind, ref) { for (const sl of S.slots) for (let j = 0; j < sl.length; j++) if (sl[j].kind === kind && sl[j].ref === ref) return { o: sl[j], active: j === 0 }; return null; }
function renderScene(platesOnly) {
  if (!platesOnly) renderSceneBase();
  setHTML($('#splates'), scenePlates());
}
function renderSceneBase() {          // sprites and effects: rebuilt only when something in the village changed
  const sc = $('#scene'); let h = '';
  sc.style.backgroundImage = `url(assets/village_bg_w${Math.max(1, Math.ceil(S.walls / 2))}.webp)`;
  const z = y => `z-index:${Math.round(y)}`;
  SITES.forEach(([x, yb, w, flip], i) => h += `<img class="spr" src="${spr(FIELD_SPRITE[i])}" style="left:${x}px;top:${yb}px;width:${w}px;transform:translate(-50%,-100%)${flip ? ' scaleX(-1)' : ''};${z(yb)}" alt="">`);
  const thStage = Math.ceil(S.th / 2);
  h += `<img class="spr" src="${spr('town_hall_' + thStage)}" style="left:${TH_POS[0]}px;top:${TH_POS[1]}px;width:132px;transform:translate(-50%,-100%);${z(TH_POS[1])}" alt="">`;
  const glows = [];
  if (pending('th')) h += `<img class="spr scaf" src="${spr('scaffold')}" style="left:${TH_POS[0]}px;top:${TH_POS[1] + 2}px;width:124px;transform:translate(-50%,-100%);${z(TH_POS[1] + 1)}" alt="">`;
  smoke('town_hall_' + thStage, TH_POS[0], TH_POS[1], 132, a => h += a);
  glows.push([TH_POS[0], TH_POS[1] - 50, 1.3]);
  S.plots.forEach((p, i) => {
    if (!p) return; const [x, y] = PLOTS[i]; const b = B[p.type];
    const lv = Math.max(1, p.lvl); const sname = p.type === 'clanhall' ? 'clan_hall' : b.sprite + '_' + (b.max === 20 ? Math.ceil(lv / 4) : Math.ceil(lv / 2));
    h += `<img class="spr ${p.lvl === 0 ? 'build' : ''}" src="${spr(sname)}" style="left:${x}px;top:${y + 22}px;width:${b.w}px;transform:translate(-50%,-100%);${z(y + 22)}" alt="">`;
    if (p.building || pending('plot', i)) h += `<img class="spr scaf" src="${spr('scaffold')}" style="left:${x}px;top:${y + 24}px;width:${Math.round(b.w * 0.92)}px;transform:translate(-50%,-100%);${z(y + 23)}" alt="">`;
    if (p.type === 'clanhall' && p.lvl >= 3) {
      const col = S.clan ? clanColor(S.clan.tag) : '#a3473b', n = p.lvl >= 5 ? 2 : 1, gold = p.lvl >= 7 ? 'gold' : '';
      for (let k = 0; k < n; k++) h += `<span class="banner ${gold}" style="left:${x + (k ? 82 : -82)}px;top:${y + 26}px;--c:${col};${z(y + 26)}"></span>`;
    }
    if (p.type === 'wheelhouse') wheelSpin(sname, x, y + 22, b.w, a => h += a);
    if (p.lvl) { smoke(sname, x, y + 22, b.w, a => h += a); glows.push([x, y - 20, 1]); }
  });
  LAMPS.forEach(([x, y]) => glows.push([x, y, 0.45]));
  h += `<div class="nightfx"></div>` + glows.map(([x, y, k]) => `<span class="glow" style="left:${x}px;top:${y}px;width:${Math.round(170 * k)}px;height:${Math.round(150 * k)}px"></span>`).join('');
  setHTML($('#sbase'), h); if (!$('#life').children.length) buildLife();
  sceneFx(true);
}
function scenePlates() {              // hit areas, level plates and timers: refreshed every second
  let h = '';
  const open = new Set(PLOT_OPEN_ORDER.slice(0, openPlots()));
  PLOTS.forEach(([x, y], i) => {
    const p = S.plots[i]; const sel = S.sel.kind === 'plot' && S.sel.i === i;
    if (!open.has(i) && !p) { h += `<button class="hit locked ${sel ? 'sel' : ''}" data-hit="plot" data-i="${i}" style="left:${x}px;top:${y}px;width:124px;height:78px" aria-label="Locked plot"></button><span class="plate lockp" style="left:${x}px;top:${y - 22}px">Opens at<br>Town Hall ${PLOT_OPEN_ORDER.indexOf(i) - 2}</span>`; return; }
    h += `<button class="hit ${p ? '' : 'empty'} ${sel ? 'sel' : ''}" data-hit="plot" data-i="${i}" style="left:${x}px;top:${y - (p ? 40 : 0)}px;width:${p ? 140 : 124}px;height:${p ? 150 : 78}px" aria-label="${p ? B[p.type].name : 'Empty plot'}"></button>`;
    if (!p) h += `<span class="plusmark ${moveFrom !== null ? 'tgt' : ''}" style="left:${x}px;top:${y}px">${moveFrom !== null ? '↓' : '+'}</span>`;
    else { const [px, py] = PLATE_AT[i] ? [x + PLATE_AT[i][0], y + PLATE_AT[i][1]] : [x, y + 26]; h += plate(px, py, p.lvl, orderOf('plot', i), p.lvl >= capMax('plot', i)); }
  });
  SITES.forEach(([x, yb, w], i) => {
    const sel = S.sel.kind === 'field' && S.sel.i === i;
    h += `<button class="hit ${sel ? 'sel' : ''}" data-hit="field" data-i="${i}" style="left:${x}px;top:${yb - 70}px;width:${w * 0.8}px;height:150px" aria-label="${FIELD_NAME[i]}"></button>` + plate(x, yb + 4, S.fields[i], orderOf('field', i), S.fields[i] >= 10);
  });
  h += `<button class="hit ${S.sel.kind === 'th' ? 'sel' : ''}" data-hit="th" style="left:${TH_POS[0]}px;top:${TH_POS[1] - 60}px;width:150px;height:170px" aria-label="Town Hall"></button>` + plate(TH_POS[0], TH_POS[1] + 4, S.th, orderOf('th', null), S.th >= 10);
  const wo = orderOf('walls', null);
  h += `<button class="hit ${S.sel.kind === 'walls' ? 'sel' : ''}" data-hit="walls" style="left:${WALLS_POS[0]}px;top:${WALLS_POS[1]}px;width:90px;height:90px" aria-label="Walls"></button><span class="plate ${wo ? 'busy' : ''}" style="left:${WALLS_POS[0]}px;top:${WALLS_POS[1] + 30}px">Walls ${S.walls}${wo ? ' ▲' : ''}</span>`;
  return h;
}
const PLATE_AT = { 8: [-92, -34] };         // the inner north plot sits on the Town Hall roof: put its plate on the left
function capMax(kind, i) { const p = S.plots[i]; return p ? B[p.type].max : 10; }
const plate = (x, y, L, ord, max) => `<span class="plate ${ord ? 'busy' : ''} ${max ? 'max' : ''}" style="left:${x}px;top:${y}px">${L}${ord ? ` ▲${ord.active ? ' ' + dur(ord.o.end - S.t) : ''}` : ''}</span>`;
function spriteBox(name, x, yb, w) { const g = WHEEL_GEO[name] || CHIMNEY[name]; if (!g) return null; const k = w / g.w; return { k, left: x - w / 2, top: yb - g.h * k }; }
function smoke(name, x, yb, w, add) {
  const g = CHIMNEY[name]; if (!g) return; const bx = spriteBox(name, x, yb, w); const k = bx.k;
  add(`<span class="smoke" style="left:${(bx.left + g.x * k).toFixed(1)}px;top:${(bx.top + g.y * k).toFixed(1)}px"><i></i><i></i><i></i></span>`);
}
function wheelSpin(name, x, yb, w, add) {
  const g = WHEEL_GEO[name]; if (!g) return; const bx = spriteBox(name, x, yb, w); const k = bx.k;
  add(`<span class="wspin" style="left:${(bx.left + g.cx * k).toFixed(1)}px;top:${(bx.top + g.cy * k).toFixed(1)}px;width:${(2 * g.rx * k).toFixed(1)}px;height:${(2 * g.ry * k).toFixed(1)}px;transform:translate(-50%,-50%) rotate(${g.rot}rad)"><i style="width:${(2 * Math.max(g.rx, g.ry) * k).toFixed(1)}px;height:${(2 * Math.max(g.rx, g.ry) * k).toFixed(1)}px"></i></span>`);
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
function sceneFx(force) {        // runs every frame in the village: night light, walkers, the running wheel
  const sc = $('#scene'); const n = nightness(); const run = ((S.t % 24) + 24) % 24 < 4;
  if (force || sc._n === undefined || Math.abs(sc._n - n) > 0.01) { sc.style.setProperty('--night', n.toFixed(3)); sc._n = n; }
  sc.classList.toggle('running', run);
  const tsec = performance.now() / 1000;
  for (const w of LIFE) {
    const show = n < 0.55 || w.owl; if (w.el.hidden !== !show) w.el.hidden = !show; if (!show) continue;
    let d = (w.off + tsec * w.spd) % (2 * w.len); const back = d > w.len; if (back) d = 2 * w.len - d;
    let j = 0; while (j < w.segs.length - 1 && d > w.segs[j]) { d -= w.segs[j]; j++; }
    const a = w.path[j], b = w.path[j + 1], f = Math.min(1, d / w.segs[j]);
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, left = (b[0] - a[0]) * (back ? -1 : 1) < 0;
    const bob = Math.abs(Math.sin(tsec * 7 + w.off)) * 3;
    w.el.style.transform = `translate(${(x - 16).toFixed(1)}px,${(y - 48 - bob).toFixed(1)}px) scaleX(${left ? -1 : 1})`; w.el.style.zIndex = Math.round(y);
  }
}

// ------------------------------------------------------------------ UI: village panels
function costHtml(c) {
  const sh = (have, need) => !S.test.free && have + 1e-6 < need ? 'short' : '';
  return `<div class="cost">${c.res.map((x, i) => `<span class="${sh(S.res[i], x)}">${icon(RES[i])} ${fmt(x)}</span>`).join('')}${c.seed ? `<span class="${sh(S.seed, c.seed)}">${icon('seed')} ${fmt(c.seed)} SEED</span>` : ''}<span>⏱ ${S.test.instant ? 'instant (test)' : dur(c.h)}</span></div>`;
}
function effects(kind, ref, L, to) {
  const rows = [];
  const t = kind === 'th' ? 'townhall' : kind === 'walls' ? 'walls' : kind === 'field' ? 'field' : S.plots[ref].type;
  const F = (label, fn) => rows.push([label, fn(L), to ? fn(to) : '–']);
  if (t === 'townhall') { F('Building plots', l => Math.min(12, 3 + l)); F('Building level cap', l => l); F('Storehouse / Vault cap', l => Math.min(20, 2 * l)); F('Construction speed', l => `-${3 * (l - 1)}%`); F('Village guard', l => fmt(40 * l)); }
  if (t === 'walls') F('Defense bonus', l => `+${4 * l}%`);
  if (t === 'field') F(`${RES_NAME[RES[FIELD_RES[ref]]]} base / h`, l => fieldBase(l).toFixed(1));
  if (t === 'wheelhouse') F('Wheel bonus cap', l => `+${25 * l}%`);
  if (t === 'storehouse') F('Adds storage', l => l ? fmt(STORE.per * 1.22 ** (l - 1)) : 0);
  if (t === 'vault') F('Protects (each)', l => l ? fmt(VAULT.per * 1.22 ** (l - 1)) : 0);
  if (t === 'burrow') F('Troop room', l => l ? fmt(20 * l * 1.12 ** (l - 1)) : 0);
  if (t === 'barracks') F('Training time', l => l ? `×${(0.9 ** (l - 1)).toFixed(2)}` : '–');
  if (t === 'academy') F('Research tiers open', l => { let n = 0; while (n < 5 && TIER_AT[n + 1] <= l) n++; return n; });
  if (t === 'forge') F('Unit power', l => `+${2 * l}%`);
  if (t === 'market') F('Exchange 100 →', l => l ? MARKET(l) : '–');
  if (t === 'clanhall') { F('Clan', l => l >= 3 ? 'found' : l ? 'join' : '–'); F('Member cap', l => 3 * l); }
  return `<table class="kv">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="up">${r[2]}</td></tr>`).join('')}</table>`;
}
function looks(kind, ref, L, to) {
  if (kind === 'field') return `<div class="thumbs"><img src="${spr(FIELD_SPRITE[ref])}" alt=""></div>`;
  const key = kind === 'th' ? 'townhall' : kind === 'walls' ? 'walls' : S.plots[ref].type; const bb = B[key];
  if (key === 'clanhall') return `<div class="thumbs"><img src="${spr('clan_hall')}" alt=""></div><p class="muted" style="font-size:17px;margin:4px 0">Banners appear at level 3, 5 and 7 in your clan's colour.</p>`;
  const st = l => bb.max === 20 ? Math.ceil(Math.max(1, l) / 4) : Math.ceil(Math.max(1, l) / 2);
  const a = st(L), b = to ? st(to) : a;
  return `<div class="thumbs"><img src="${spr(bb.sprite + '_' + a)}" alt="">${b !== a ? `<span class="arrow">▶</span><img src="${spr(bb.sprite + '_' + b)}" alt="">` : ''}</div>`;
}
const SEED_SHOP = [
  ...RES.map((r, i) => ({ id: 'boost' + i, r: i, name: `${RES_NAME[r]} boost`, d: `+25% ${RES_NAME[r]} output for 24 h`, seed: BOOST_SEED })),
  { id: 'peace', name: 'Peace shield', d: 'No one attacks you for 12 h. Ends if you attack. Once every 3 days.', seed: 4000 },
  { id: 'banner', name: 'Village banner colour', d: 'Your flag colour on the World Map and in the rankings', seed: 1000 },
];
const BANNERS = ['#f2c14e', '#e0533f', '#4f9de0', '#5cc46a', '#b07ae0', '#f08ac0', '#f3e6c8'];
function treasuryHtml() {
  let h = `<h3 style="margin-top:14px">Treasury · spend SEED</h3><div class="opts">`;
  for (const it of SEED_SHOP) {
    let why = !S.test.free && S.seed < it.seed ? `Needs ${fmt(it.seed - S.seed)} more SEED.` : '';
    if (it.r !== undefined && boosted(it.r)) why = `Running: ${dur(S.boost[it.r] - S.t)} left.`;
    if (it.id === 'peace' && S.t < S.peaceUntil) why = `Active: ${dur(S.peaceUntil - S.t)} left.`;
    else if (it.id === 'peace' && S.t < S.peaceNext) why = `Available again in ${dur(S.peaceNext - S.t)}.`;
    h += `<div class="opt shop"><div><div class="row"><span class="n">${it.name}</span>${it.id === 'banner' ? '' : `<button class="btn sm" data-act="shop" data-k="${it.id}" ${why ? 'disabled' : ''}>Buy</button>`}</div><div class="d">${it.d}</div><div class="c">${icon('seed')} ${fmt(it.seed)} SEED</div>${it.id === 'banner' ? `<div class="swatches">${BANNERS.map(c => `<button class="sw ${S.banner === c ? 'on' : ''}" style="--c:${c}" data-act="banner" data-c="${c}" aria-label="Banner colour ${c}" ${S.banner === c ? 'disabled' : ''}></button>`).join('')}</div>` : ''}${why && it.id !== 'banner' ? `<div class="why">${why}</div>` : ''}</div></div>`;
  }
  return h + '</div>';
}
function detailPanel() {
  const sel = S.sel; let h = '<button class="btn ghost sm sheet-close" data-act="close">Close</button>';
  if (sel.kind === 'plot' && !S.plots[sel.i]) {
    const open = PLOT_OPEN_ORDER.slice(0, openPlots()).includes(sel.i);
    if (!open) return h + `<h3>Locked plot</h3><p class="muted">Opens at Town Hall level ${PLOT_OPEN_ORDER.indexOf(sel.i) - 2}. Every Town Hall level opens one more plot.</p>`;
    h += `<h3>Empty plot</h3><div class="opts">`;
    for (const t of PLOT_TYPES) {
      const bc = buildCheck(sel.i, t); const c = bc.c;
      if (B[t].multi === 1 && plotsOf(t).length) continue;
      h += `<div class="opt"><img src="${spr(B[t].sprite + (t === 'clanhall' ? '' : '_1'))}" alt=""><div><div class="row"><span class="n">${B[t].name}</span><button class="btn sm" data-act="build" data-t="${t}" ${bc.why ? 'disabled' : ''}>Build</button></div><div class="d">${B[t].role}</div><div class="c">${c.res.map((x, i) => `<span class="${!S.test.free && S.res[i] < x ? 'bad' : ''}">${icon(RES[i])}${fmt(x)}</span>`).join(' ')}${c.seed ? ` <span class="${!S.test.free && S.seed < c.seed ? 'bad' : ''}">${icon('seed')}${fmt(c.seed)}</span>` : ''} · ${S.test.instant ? 'instant' : dur(c.h)}</div>${bc.why ? `<div class="why">${bc.why}</div>` : ''}</div></div>`;
    }
    return h + '</div>';
  }
  const kind = sel.kind === 'plot' ? 'plot' : sel.kind; const ref = sel.kind === 'th' || sel.kind === 'walls' ? null : sel.i;
  const L = curLevel(kind, ref);
  const name = kind === 'field' ? FIELD_NAME[ref] : kind === 'th' ? 'Town Hall' : kind === 'walls' ? 'Walls' : B[S.plots[ref].type].name;
  const u = upgradeCheck(kind, ref); const atMax = u.why === 'Maximum level reached.';
  h += `<h3>${name} · Level ${L}${kind === 'plot' && S.plots[ref].building ? ' (building)' : ''}</h3>` + looks(kind, ref, L, atMax ? 0 : u.to) + effects(kind, ref, L, atMax ? 0 : u.to);
  if (!atMax) h += `<div class="muted">Upgrade to level ${u.to}</div>` + costHtml(u.c) + `<button class="btn" style="width:100%;font-size:17px;padding:10px" data-act="upgrade" ${u.why ? 'disabled' : ''}>Upgrade</button>${u.why ? `<div class="why">${u.why}</div>` : ''}`;
  if (kind === 'plot' && !S.plots[ref].building) {
    const nm = B[S.plots[ref].type].name, busy = demoBlock(ref);
    if (moveFrom === ref) h += `<div class="pred">Tap an empty plot to move the ${nm} there. <button class="btn ghost sm" data-act="movecancel">Cancel</button></div>`;
    else if (confirmDemo === ref) h += `<div class="pred"><b class="bad" style="font-weight:400">Demolish ${nm} level ${L}?</b> The plot becomes empty and nothing is refunded.<div class="row" style="justify-content:flex-start;margin-top:6px"><button class="btn sm" data-act="demoyes">Demolish</button><button class="btn ghost sm" data-act="demono">Keep it</button></div></div>`;
    else h += `<div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn ghost sm" data-act="move" ${busy ? 'disabled' : ''}>Move</button><button class="btn ghost sm" data-act="demo" ${busy ? 'disabled' : ''}>Demolish</button></div>${busy ? `<div class="why">${busy}</div>` : ''}`;
  }
  if (kind === 'plot') {
    const t = S.plots[ref].type;
    if (t === 'clanhall' && L) h += `<p><a class="btn alt sm" href="#clan" style="text-decoration:none">Open clan</a></p>`;
    if (t === 'barracks' && L) h += `<p><a class="btn alt sm" href="#army" style="text-decoration:none">Train units</a></p>`;
    if (t === 'academy' && L) h += `<p><a class="btn alt sm" href="#academy" style="text-decoration:none">Open research</a></p>`;
    if (t === 'market' && L) h += `<p><a class="btn alt sm" href="#market" style="text-decoration:none">Exchange resources</a></p>`;
  }
  if (kind === 'th') h += treasuryHtml();
  return h;
}
function demoBlock(i) {
  const p = S.plots[i]; if (!p) return 'Empty plot.';
  if (pending('plot', i)) return 'It has an order in the build queue.';
  if (p.type === 'barracks' && S.training) return 'The Barracks are training.';
  if (p.type === 'academy' && S.research.cur) return 'The Academy is researching.';
  if (p.type === 'clanhall' && S.clan) return 'Leave or disband your clan first.';
  return '';
}
function slotsHtml() {
  const n = held().length;
  let h = `<h3>Construction</h3><div class="muted" style="font-size:16px;margin:-4px 0 6px">${n ? `${n} Squeek${n > 1 ? 's' : ''} in your wallet: build time −${pct(squeekBuild())} after last night's run` : 'Hold a Squeek to build faster after good runs'}</div><div class="list">`;
  S.slots.forEach((sl, i) => {
    if (!sl.length) { h += `<div class="slot"><div class="t"><span class="muted">Slot ${i + 1} is free</span></div><div class="q">Tap a building or an empty plot</div></div>`; return; }
    const o = sl[0], p = Math.min(1, (S.t - o.start) / (o.end - o.start));
    h += `<div class="slot"><div class="t"><span>${orderName(o)} → ${o.to}</span><span>${dur(o.end - S.t)} <button class="x" data-act="cancel" data-s="${i}" data-o="0" title="Cancel: 80% back" aria-label="Cancel ${orderName(o)}">✕</button></span></div><div class="prog"><i style="width:${(p * 100).toFixed(0)}%"></i></div><div class="q">${sl[1] ? `Next: ${orderName(sl[1])} → ${sl[1].to} <button class="x" data-act="cancel" data-s="${i}" data-o="1" title="Cancel: 80% back" aria-label="Cancel ${orderName(sl[1])}">✕</button>` : 'Next: free (1 more order fits)'}</div></div>`;
  });
  return h + '</div>';
}
function moveLabel(m) {
  const at = c => `(${c[0]}|${c[1]})`;
  if (m.kind === 'incoming') return `<span class="bad">⚔ ${esc(m.name || 'Attack')} from ${at(m.from)}</span>`;
  if (m.kind === 'help') return `<span class="ok">⛨ ${esc(m.name)} coming to help</span>`;
  if (m.kind === 'attack') return `→ Attack on ${at(m.to)}`;
  if (m.kind === 'scout') return `👁 Scouts to ${at(m.to)}`;
  if (m.kind === 'support') return `⛨ Support to ${at(m.to)}`;
  return `↩ Returning from ${at(m.from)}`;
}
function movesHtml() {
  if (!S.moves.length) return `<p class="muted">${S.t < S.shieldUntil ? `Beginner shield: ${dur(S.shieldUntil - S.t)} left. No one can attack you, and you cannot attack yet.` : 'No armies on the move.'}</p>`;
  return S.moves.slice().sort((a, b) => a.arrive - b.arrive).map(m => `<div class="card">${moveLabel(m)}<div class="row"><span class="muted">${m.kind === 'incoming' ? `~${fmt(m.A)} attack` : unitList(m.units)}</span><b style="font-weight:400">${dur(m.arrive - S.t)}</b></div></div>`).join('');
}
const QUESTS = [
  { id: 'wheel', t: 'Build a Wheelhouse', d: 'It turns the hamster\'s nightly laps into extra output.', ok: () => levelOf('wheelhouse') >= 1, rw: 150, go: 'b:wheelhouse' },
  { id: 'field2', t: 'Upgrade a production site to level 2', d: 'Tap a forest, farm, quarry or mine outside the ring.', ok: () => S.fields.some(l => l >= 2), rw: 120, go: 'field' },
  { id: 'store', t: 'Build a Storehouse', d: 'Bigger storage, so nothing goes to waste.', ok: () => levelOf('storehouse') >= 1, rw: 150, go: 'b:storehouse' },
  { id: 'th2', t: 'Upgrade the Town Hall to level 2', d: 'Opens a plot and raises every level cap.', ok: () => S.th >= 2, rw: 200, go: 'th' },
  { id: 'academy', t: 'Build an Academy', d: 'Research new units and buildings there.', ok: () => levelOf('academy') >= 1, rw: 200, go: 'b:academy' },
  { id: 'research', t: 'Finish your first research', d: 'Foragers carry the most loot; the Vault keeps resources safe.', ok: () => S.research.done.length >= 1, rw: 200, go: 'tab:academy' },
  { id: 'barracks', t: 'Build Barracks', d: 'Every unit is trained there.', ok: () => levelOf('barracks') >= 1, rw: 250, go: 'b:barracks' },
  { id: 'train', t: 'Have 10 units at home', d: 'Spearmen attack and defend equally well.', ok: () => UK.reduce((a, k) => a + S.units[k], 0) >= 10, rw: 250, go: 'tab:army' },
  { id: 'walls2', t: 'Raise the Walls to level 2', d: 'Every Walls level adds 4% defense.', ok: () => S.walls >= 2, rw: 250, go: 'walls' },
  { id: 'vault', t: 'Build a Vault', d: 'Raiders cannot touch what sits in it.', ok: () => levelOf('vault') >= 1, rw: 300, go: 'b:vault' },
  { id: 'scout', t: 'Scout a village', d: 'Research Scouts, train a few and send them from the World Map: +10% attack on that village for 12 h.', ok: () => S.stats.scouts >= 1, rw: 300, go: 'tab:world' },
  { id: 'raid', t: 'Win a raid', d: 'Attack with at least twice the defense of your target.', ok: () => S.stats.wins >= 1, rw: 400, go: 'tab:world' },
  { id: 'th4', t: 'Reach Town Hall level 4', d: 'More plots, higher caps, faster building.', ok: () => S.th >= 4, rw: 500, go: 'th' },
  { id: 'clan', t: 'Found or join a clan', d: 'Clan Hall level 3 founds one. Members defend each other.', ok: () => !!S.clan, rw: 500, go: 'tab:clan' },
];
function questHtml() {
  const open = QUESTS.filter(q => !S.quests.includes(q.id)).slice(0, 2); if (!open.length) return '';
  return `<h3>First steps · ${S.quests.length} of ${QUESTS.length}</h3><div class="list" style="margin-bottom:12px">` + open.map(q => { const ok = q.ok(); return `<div class="quest ${ok ? 'done' : ''}"><b>${q.t}</b><div class="muted">${q.d}</div><div class="row"><span class="muted">Reward ${fmt(q.rw)} of each</span>${ok ? `<button class="btn sm" data-act="qclaim" data-q="${q.id}">Claim</button>` : `<button class="btn ghost sm" data-act="qgo" data-q="${q.id}">Show me</button>`}</div></div>`; }).join('') + '</div>';
}
function villageLeft() {
  let h = questHtml() + slotsHtml();
  const act = [];
  if (S.research.cur) { const r = S.research.cur; act.push(`Research: ${RESEARCH.find(x => x.id === r.id).name} · ${dur(r.end - S.t)} <button class="x" data-act="cancelres" title="Cancel: 80% back" aria-label="Cancel research">✕</button>`); }
  if (S.training) act.push(`Training: ${S.training.n} ${U[S.training.unit].name} · ${dur(S.training.end - S.t)} <button class="x" data-act="canceltr" title="Cancel: 80% back" aria-label="Cancel training">✕</button>`);
  if (act.length) h += `<h3 style="margin-top:12px">Busy</h3><div class="muted">${act.join('<br>')}</div>`;
  h += `<h3 style="margin-top:12px">Armies</h3><div class="list">${movesHtml()}</div>`;
  h += `<button class="btn ghost sm" style="margin-top:12px" data-act="ovtoggle" aria-expanded="${!!S.ui.ovOpen}">${S.ui.ovOpen ? 'Hide' : 'Show'} all buildings</button>`;
  if (S.ui.ovOpen) {
    h += `<div class="ov" style="margin-top:6px">`;
    const ov = [['th', null, 'Town Hall', S.th], ['walls', null, 'Walls', S.walls]];
    S.fields.forEach((L, i) => ov.push(['field', i, `${FIELD_NAME[i]} ${i % 2 + 1}`, L]));
    S.plots.forEach((p, i) => p && ov.push(['plot', i, B[p.type].name, p.lvl]));
    h += ov.map(([k, i, n, L]) => `<button data-sel="${k}" data-i="${i ?? ''}"><span>${n}</span><span>Lv ${L}${pending(k === 'plot' ? 'plot' : k, i) ? ' ▲' : ''}</span></button>`).join('') + '</div>';
  }
  return h;
}

// ------------------------------------------------------------------ UI: world map
const wcam = { ts: 72 };
let wctx = null, cvW = 0, cvH = 0, grassImg = null;
const IMG = {};
function img(n) { if (!IMG[n]) { const i = new Image(); i.src = spr(n); i.onload = () => { if (view === 'world') drawWorld(); }; IMG[n] = i; } return IMG[n]; }
function sizeCanvas() {
  const cv = $('#worldcv'); const st = $('#wstage'); const dpr = Math.min(2, devicePixelRatio || 1);
  cvW = st.clientWidth; cvH = st.clientHeight; cv.width = cvW * dpr; cv.height = cvH * dpr;
  wctx = cv.getContext('2d'); wctx.setTransform(dpr, 0, 0, dpr, 0, 0); wctx.imageSmoothingEnabled = true;
  wcam.ts = innerWidth <= 900 ? 60 : 76; drawWorld();
}
function w2s(x, y) { return [cvW / 2 + (x - S.cam.x) * wcam.ts, cvH / 2 + (y - S.cam.y) * wcam.ts]; }
function flag(c, sx, sy, ts, col) { c.fillStyle = '#222'; c.fillRect(sx + ts * 0.8, sy + ts * 0.1, 3, ts * 0.38); c.fillStyle = col; c.fillRect(sx + ts * 0.8 + 3, sy + ts * 0.1, ts * 0.2, ts * 0.13); }
function drawWorld() {
  if (!wctx) return; const c = wctx, ts = wcam.ts;
  if (!grassImg) { grassImg = new Image(); grassImg.src = 'assets/grass.webp'; grassImg.onload = drawWorld; }
  c.fillStyle = '#4f8a3a'; c.fillRect(0, 0, cvW, cvH);
  if (grassImg.complete && grassImg.naturalWidth) {
    const pat = c.createPattern(grassImg, 'repeat'); const s = ts / 160; const ox = (cvW / 2 - S.cam.x * ts), oy = (cvH / 2 - S.cam.y * ts);
    c.save(); c.translate(ox, oy); c.scale(s, s); c.imageSmoothingEnabled = false; c.fillStyle = pat; c.fillRect(-ox / s, -oy / s, cvW / s, cvH / s); c.restore();
  }
  const x0 = Math.floor(S.cam.x - cvW / 2 / ts) - 1, x1 = Math.ceil(S.cam.x + cvW / 2 / ts) + 1, y0 = Math.floor(S.cam.y - cvH / 2 / ts) - 1, y1 = Math.ceil(S.cam.y + cvH / 2 / ts) + 1;
  c.strokeStyle = 'rgba(15,30,10,.28)'; c.lineWidth = 1;
  for (let x = x0; x <= x1; x++) { const [sx] = w2s(x, 0); c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, cvH); c.stroke(); }
  for (let y = y0; y <= y1; y++) { const [, sy] = w2s(0, y); c.beginPath(); c.moveTo(0, sy); c.lineTo(cvW, sy); c.stroke(); }
  const forest = img('site_forest');
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) { const [sx, sy] = w2s(x, y); c.fillStyle = '#1a2a14'; c.fillRect(sx, sy, ts + 1, ts + 1); continue; }
    const [sx, sy] = w2s(x, y); const own = x === OWN[0] && y === OWN[1]; const b = own ? null : bot(x, y);
    if (!own && !b) { if (hash(x, y, 4) < 0.33 && forest.complete) drawImg(forest, sx + ts / 2, sy + ts * 0.92, ts * 0.95, hash(x, y, 5) < 0.5); continue; }
    if (b && b.camp) {         // wild camp: a ring of earth, a burrow, a red pennant and a "C" plate
      c.fillStyle = '#7a5a34'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.68, ts * 0.38, ts * 0.19, 0, 0, 7); c.fill();
      drawImg(img(b.kind === 2 ? 'burrow_2' : 'burrow_1'), sx + ts / 2, sy + ts * 0.8, ts * (0.4 + 0.08 * b.kind));
      c.fillStyle = '#222'; c.fillRect(sx + ts * 0.78, sy + ts * 0.12, 3, ts * 0.36); c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(sx + ts * 0.78 + 3, sy + ts * 0.12); c.lineTo(sx + ts * 0.98, sy + ts * 0.19); c.lineTo(sx + ts * 0.78 + 3, sy + ts * 0.26); c.fill();
      if (scoutLeft(b) > 0) { c.fillStyle = '#0b0806cc'; c.fillRect(sx + 3, sy + 3, ts * 0.2, ts * 0.2); c.fillStyle = '#8fd16a'; c.font = `${Math.round(ts * 0.2)}px VT323, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('i', sx + 3 + ts * 0.1, sy + 3 + ts * 0.1); }
      const pw = ts * 0.3, ph = ts * 0.22; c.fillStyle = 'rgba(40,10,8,.92)'; c.strokeStyle = '#c0392b'; c.lineWidth = 2; c.fillRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph); c.strokeRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph);
      c.fillStyle = '#ffb3a8'; c.font = `${Math.round(ts * 0.24)}px VT323, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C', sx + ts / 2, sy + ts - ph / 2 - 1);
      continue;
    }
    const L = own ? S.th : botLvl(b); const st = Math.ceil(L / 2);
    c.fillStyle = '#9c7a4a'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.42, ts * 0.22, 0, 0, 7); c.fill();
    c.fillStyle = '#b8966a'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.36, ts * 0.17, 0, 0, 7); c.fill();
    if (L >= 4) drawImg(img('burrow_' + st), sx + ts * 0.24, sy + ts * 0.8, ts * 0.32);
    drawImg(img('town_hall_' + st), sx + ts / 2, sy + ts * 0.78, ts * 0.5);
    if (L >= 7) drawImg(img('storehouse_' + st), sx + ts * 0.78, sy + ts * 0.82, ts * 0.3);
    if (b && botShielded(b)) { c.fillStyle = 'rgba(150,205,255,.22)'; c.strokeStyle = 'rgba(170,215,255,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.5, ts * 0.46, ts * 0.42, 0, 0, 7); c.fill(); c.stroke(); }
    if (b && b.rival) { c.fillStyle = '#222'; c.fillRect(sx + ts * 0.82, sy + ts * 0.06, 3, ts * 0.42); c.fillStyle = '#ff5a4a'; c.fillRect(sx + ts * 0.82 + 3, sy + ts * 0.06, ts * 0.22, ts * 0.15); c.font = `${Math.round(ts * 0.22)}px VT323, monospace`; c.textAlign = 'center'; c.fillStyle = '#0b0806'; c.fillRect(sx + ts * 0.12, sy + 1, ts * 0.62, ts * 0.22); c.fillStyle = '#ff8a7a'; c.textBaseline = 'middle'; c.fillText('RIVAL', sx + ts * 0.43, sy + ts * 0.12); }
    const cl = b && botClan(b); if (cl) flag(c, sx, sy, ts, cl.mine ? '#6aa8ff' : cl === NPC_CLAN ? '#a07ad8' : clanColor(cl.tag));
    if (own) flag(c, sx, sy, ts, S.banner);
    if (b && scoutLeft(b) > 0) { c.fillStyle = '#0b0806cc'; c.fillRect(sx + 3, sy + 3, ts * 0.2, ts * 0.2); c.fillStyle = '#8fd16a'; c.font = `${Math.round(ts * 0.2)}px VT323, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('i', sx + 3 + ts * 0.1, sy + 3 + ts * 0.1); }
    c.fillStyle = 'rgba(20,15,10,.92)'; c.strokeStyle = own ? S.banner : '#6b4a2b'; c.lineWidth = 2;
    const pw = ts * 0.3, ph = ts * 0.22; c.fillRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph); c.strokeRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph);
    c.fillStyle = own ? S.banner : '#f3e6c8'; c.font = `${Math.round(ts * 0.24)}px VT323, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(L, sx + ts / 2, sy + ts - ph / 2 - 1);
    if (own) { c.strokeStyle = S.banner; c.lineWidth = 3; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.47, ts * 0.26, 0, 0, 7); c.stroke(); }
  }
  for (const m of S.moves) {
    const from = m.kind === 'return' || m.kind === 'incoming' || m.kind === 'help' ? m.from : OWN, to = m.kind === 'return' || m.kind === 'incoming' || m.kind === 'help' ? OWN : m.to;
    const [ax, ay] = w2s(from[0] + 0.5, from[1] + 0.6), [bx, by] = w2s(to[0] + 0.5, to[1] + 0.6);
    const col = { incoming: '#ff6a58', attack: '#f2c14e', scout: '#e8e8e8', support: '#6aa8ff', help: '#6aa8ff' }[m.kind] || '#8fd16a';
    c.setLineDash([10, 7]); c.lineWidth = 6; c.strokeStyle = '#0b0806'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    c.lineWidth = 3; c.strokeStyle = col; c.stroke(); c.setLineDash([]);
    const f = Math.min(1, Math.max(0, (S.t - m.depart) / Math.max(1e-9, m.arrive - m.depart))); const px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
    c.fillStyle = col; c.strokeStyle = '#0b0806'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill(); c.stroke();
  }
  if (S.wsel) { const [sx, sy] = w2s(S.wsel[0], S.wsel[1]); c.strokeStyle = '#000'; c.lineWidth = 6; c.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4); c.strokeStyle = '#f2c14e'; c.lineWidth = 3; c.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4); }
  c.fillStyle = 'rgba(11,8,6,.82)'; c.fillRect(0, 0, cvW, 22); c.font = '18px VT323, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f3e6c8';
  for (let x = x0; x <= x1; x++) if (x >= 0 && x < WORLD) { const [sx] = w2s(x + 0.5, 0); c.fillText(x, sx, 11); }
  c.fillStyle = 'rgba(11,8,6,.82)'; c.fillRect(0, 22, 30, cvH); c.fillStyle = '#f3e6c8';
  for (let y = y0; y <= y1; y++) if (y >= 0 && y < WORLD) { const [, sy] = w2s(0, y + 0.5); c.fillText(y, 15, sy); }
}
function drawImg(im, cx, by, w, flip) { if (!im.complete || !im.naturalWidth) return; const h = w * im.naturalHeight / im.naturalWidth; if (flip) { wctx.save(); wctx.translate(cx, 0); wctx.scale(-1, 1); wctx.drawImage(im, -w / 2, by - h, w, h); wctx.restore(); } else wctx.drawImage(im, cx - w / 2, by - h, w, h); }
let miniCache = null;
function drawMini() {
  const cv = $('#minimap'); if (!cv) return; const c = cv.getContext('2d');
  if (!miniCache) { miniCache = document.createElement('canvas'); miniCache.width = 100; miniCache.height = 100; const m = miniCache.getContext('2d'); m.fillStyle = '#3b6a2e'; m.fillRect(0, 0, 100, 100); m.fillStyle = '#e8c88a'; for (let x = 0; x < 100; x++) for (let y = 0; y < 100; y++) if (bot(x, y)) m.fillRect(x, y, 1, 1); m.strokeStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i <= 100; i += 10) { m.beginPath(); m.moveTo(i, 0); m.lineTo(i, 100); m.moveTo(0, i); m.lineTo(100, i); m.stroke(); } }
  c.imageSmoothingEnabled = false; c.drawImage(miniCache, 0, 0, 180, 180);
  const k = 1.8, vw = cvW / wcam.ts, vh = cvH / wcam.ts;
  c.strokeStyle = '#f2c14e'; c.lineWidth = 2; c.strokeRect((S.cam.x - vw / 2) * k, (S.cam.y - vh / 2) * k, vw * k, vh * k);
  c.fillStyle = S.banner; c.fillRect(OWN[0] * k - 2, OWN[1] * k - 2, 5, 5);
}
function goTo(x, y) { S.cam = { x: x + 0.5, y: y + 0.5 }; S.wsel = [x, y]; S.ui.min.wright = false; openSheet('#wright'); drawWorld(); drawMini(); dirty(); }
function worldLeft() {
  return `<h3>World map</h3><canvas id="minimap" class="mm" width="180" height="180"></canvas>
  <div class="mkt goto"><label>Go to<input id="goto" maxlength="24" placeholder="x|y, a name or 0x… wallet" autocomplete="off"></label><button class="btn sm" data-act="goto">Go</button></div>
  <div class="row" style="margin-top:8px;justify-content:flex-start;flex-wrap:wrap"><button class="btn sm" data-act="home">My village</button><button class="btn sm alt" data-act="rival">Rival (${RIVAL[0]}|${RIVAL[1]})</button></div>
  <h3 style="margin-top:12px">Armies</h3><div class="list">${movesHtml()}</div>
  <h3 style="margin-top:12px">Legend</h3><div class="muted" style="font-size:17px">100 × 100 tiles, one village per wallet. Drag to move, tap a tile. Plate = Town Hall level · your flag = you · blue flag = your clan · other flags = other clans · bubble = beginner shield · red C = wild camp (never attacks, loot and XP but no ranking points) · green i = scouting bonus active · dashed lines: gold attack, white scouts, blue support, green return, red incoming</div>`;
}
function picker(keys, prefix) {
  return `<div class="unitsel">${keys.map(k => `<img src="${spr(U[k].sprite)}" alt=""><span>${U[k].name} <button class="btn ghost sm" data-act="amax" data-u="${k}">all ${S.units[k]}</button></span><input type="number" min="0" max="${S.units[k]}" value="0" id="${prefix}-${k}" data-u="${k}" inputmode="numeric">`).join('')}</div><div class="row" style="justify-content:flex-start;margin-top:6px"><button class="btn ghost sm" data-act="aall">Everyone</button><button class="btn ghost sm" data-act="anone">Clear</button></div>`;
}
function worldRight() {
  const sel = S.wsel; let h = '<button class="btn ghost sm sheet-close" data-act="close">Close</button>';
  if (!sel) return h + `<h3>Pick a tile</h3><p class="muted">Tap a village to see what you know about it and to send troops.</p>`;
  const [x, y] = sel;
  if (x === OWN[0] && y === OWN[1]) return h + `<h3>Your village (${x}|${y})</h3><p class="muted">${who(S.username || '', S.wallet)} · ${holder() ? `${held().length} Squeek${held().length > 1 ? 's' : ''}` : 'no Squeek'} · Town Hall ${S.th} · Walls ${S.walls}<br>Defense now: ${fmt(defense())}${S.helpers.length ? ` (with clan support)` : ''}</p><a class="btn sm" href="#village" style="text-decoration:none">Open village</a>`;
  const b = bot(x, y);
  if (!b) return h + `<h3>Empty tile (${x}|${y})</h3><p class="muted">Free land. New villages are placed here as more wallets join.</p>`;
  const L = botLvl(b), d = dist(OWN, [x, y]), cl = botClan(b), key = x + ',' + y, sl = scoutLeft(b);
  if (b.camp) {
    const tr = botTroops(b);
    h += `<h3>${esc(b.name)} (${x}|${y})</h3><div class="vhead"><img src="${spr(b.kind === 2 ? 'burrow_2' : 'burrow_1')}" alt=""><div class="muted">Wild camp · ${d.toFixed(1)} tiles away<br>It never attacks and joins no clan. Raids give loot and champion XP, but no ranking points.</div></div>
    <table class="kv"><tr><td>Spearmen</td><td>${tr.spearman}</td></tr><tr><td>Shieldbearers</td><td>${tr.shieldbearer}</td></tr><tr><td>Defense</td><td>${fmt(botDefense(b))}</td></tr><tr><td>Lootable now</td><td>~${fmt(botLootable(b))}</td></tr><tr><td>Defenders regrow</td><td>in 24 h</td></tr><tr><td>Scouting bonus</td><td>${sl ? `<span class="ok">+${pct(SCOUT_BONUS)} · ${dur(sl)} left</span>` : '<span class="muted">none</span>'}</td></tr></table>`;
  } else {
  h += `<h3>${esc(b.name)} (${x}|${y})</h3><div class="addr big">${b.addr}</div><div class="vhead"><img src="${spr('town_hall_' + Math.ceil(L / 2))}" alt=""><div class="muted">${b.holder ? 'Squeek champion' : 'Champion without a Squeek'}${b.rival ? ' · <span class="bad">rival</span>' : ''}<br>Town Hall ${L} · ${d.toFixed(1)} tiles away<br>${cl ? `[${esc(cl.tag)}] ${esc(cl.name)}${cl.mine ? ' (yours)' : ''}` : 'No clan'} · ${botShielded(b) ? 'beginner shield' : b.active ? 'active' : 'inactive'}</div></div>`;
  { const tr = botTroops(b), w = botWalls(b); h += `<table class="kv"><tr><td>Defenders</td><td>${tr.spearman} Spearmen${tr.shieldbearer ? `, ${tr.shieldbearer} Shieldbearers` : ''}</td></tr><tr><td>Walls</td><td>Lv ${w} (+${4 * w}%)${w < b.walls ? ' · rebuilding' : ''}</td></tr><tr><td>Defense</td><td>${fmt(botDefense(b))}</td></tr><tr><td>Lootable now</td><td>~${fmt(botLootable(b) * (gapLow(b) ? 0.5 : 1))}</td></tr><tr><td>Scouting bonus</td><td>${sl ? `<span class="ok">+${pct(SCOUT_BONUS)} · ${dur(sl)} left</span>` : '<span class="muted">none</span>'}</td></tr></table>`; }
  if (gapLow(b)) h += `<p class="why">Town Hall ${L} is 3+ levels below yours: raids here give half loot and no attack points.</p>`;
  }
  if (S.clan && !cl && !b.camp) h += `<div class="row" style="margin:8px 0;justify-content:flex-start"><button class="btn sm alt" data-act="invite" ${S.invites.some(iv => iv.key === key) ? 'disabled' : ''}>${S.invites.some(iv => iv.key === key) ? 'Invite sent' : `Invite to [${esc(S.clan.tag)}]`}</button></div>`;
  if (myClan(b)) {
    const here = S.abroad.map((st, i) => [st, i]).filter(([st]) => st.key === key);
    h += `<p class="muted">A member of your clan: you cannot attack them, but you can send troops to defend them. Members near you send help when you are attacked.</p>`;
    if (here.length) h += here.map(([st, i]) => `<div class="card row"><span>Your ${unitList(st.units)} are here</span><button class="btn ghost sm" data-act="recall" data-i="${i}">Recall</button></div>`).join('');
    const ready = UK.filter(k => S.units[k] > 0);
    if (!ready.length) return h + `<p class="muted">No troops at home to send.</p>`;
    return h + `<h3 style="margin-top:10px">Send support</h3>${picker(ready, 'atk')}<div class="stickgo"><button class="btn alt" style="width:100%" data-act="support" id="atk-go">Send support</button></div>`;
  }
  if (botShielded(b)) return h + `<p class="muted">Under a beginner shield: you cannot attack yet.</p>`;
  if (!sl) h += `<p class="muted" style="font-size:17px">${researched('scout') ? 'Send Scouts to find weak spots' : 'Scouts (Academy tier 2) find weak spots'}: +${pct(SCOUT_BONUS)} attack on this village for ${SCOUT_HOURS} h.</p>`;
  if (researched('scout')) h += `<div class="row card" style="margin:8px 0"><span>Scouts at home: ${S.units.scout}</span><span class="pbtn"><input type="number" id="sc-n" min="1" max="${S.units.scout}" value="${Math.min(3, S.units.scout)}" style="width:56px" inputmode="numeric"><button class="btn sm alt" data-act="scout" ${S.units.scout ? '' : 'disabled'}>Scout</button></span></div>`;
  const ready = FIGHT.filter(k => S.units[k] > 0);
  if (!ready.length) return h + `<p class="muted">You have no troops at home. Train units in the Army tab.</p>` + travelBox(d);
  h += `<h3 style="margin-top:10px">Choose troops to send</h3>${picker(ready, 'atk')}
  <label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="atk-champ" ${champOk() ? 'checked' : 'disabled'}> Champion joins (Might ${fmt(hmight())})</label>
  <div class="pred" id="pred"></div><div class="stickgo"><button class="btn" style="width:100%" data-act="attack" id="atk-go" disabled>Attack</button></div>`;
  return h + travelBox(d);
}
function travelBox(d) {
  return `<button class="btn ghost sm" style="margin-top:10px" data-act="traveltoggle" aria-expanded="${!!S.ui.travelOpen}">${S.ui.travelOpen ? 'Hide' : 'Show'} travel times</button>` + (S.ui.travelOpen ? `<table class="kv">${UK.map(k => `<tr><td>${U[k].name}</td><td>${U[k].s}/h</td><td>${dur(d / (U[k].s * (researched('march') ? 1.2 : 1)))}</td></tr>`).join('')}</table>` : '');
}
function updatePrediction() {
  const box = $('#pred'); if (!box || !S.wsel) return; const b = bot(S.wsel[0], S.wsel[1]); if (!b) return;
  const units = {}; document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => units[i.dataset.u] = Math.min(S.units[i.dataset.u], +i.value || 0));
  const champ = $('#atk-champ')?.checked && champOk(); const sb = scoutBonus(b), A = attackPower(units, champ) * (1 + sb), D = botDefense(b);
  const nSel = Object.values(units).reduce((s, n) => s + n, 0); const go = $('#atk-go'); if (go) go.disabled = nSel < 1;
  if (nSel < 1) { box.innerHTML = `Their defense is <b>${fmt(D)}</b>: you need <b>${fmt(2 * D)}</b> attack to win${sb ? ` (your scouting adds +${pct(sb)})` : ''}.`; return; }
  const fa = Math.min(1, 0.5 * D / Math.max(1, A)), fd = Math.min(1, 0.5 * A / D), win = A >= 2 * D;
  const surv = {}; for (const k in units) surv[k] = Math.round(units[k] * (1 - fa));
  const spd = Object.keys(units).filter(k => units[k] > 0).map(k => U[k].s); const tt = spd.length ? dist(OWN, [b.x, b.y]) / (Math.min(...spd) * (researched('march') ? 1.2 : 1)) : 0;
  const late = sb && tt > scoutLeft(b) && !S.test.instant ? `<br><span class="gold">The scouting bonus runs out before your army arrives.</span>` : '';
  box.innerHTML = `Attack <b>${fmt(A)}</b>${sb ? ` (+${pct(sb)} scouted)` : ''} vs defense <b>${fmt(D)}</b><br>You lose ~${pct(fa)} · they lose ${pct(fd)}<br>${win ? `<span class="ok">Win · loot ~${fmt(Math.min(botLootable(b) * (gapLow(b) ? 0.5 : 1), carryOf(surv, champ)))}</span>` : `<span class="bad">No win: under 2× their defense</span>`} · ${S.test.instant ? 'arrives instantly' : `arrives in ${dur(tt)}`}${late}`;
}
function tileTip(x, y) {
  if (x === OWN[0] && y === OWN[1]) return `<b>${who(S.username || 'You', S.wallet)}</b> · your village<br>Town Hall ${S.th}`;
  const b = bot(x, y); if (!b) return `(${x}|${y}) · empty`;
  const cl = botClan(b), sl = scoutLeft(b);
  if (b.camp) return `<b>${esc(b.name)}</b> · (${x}|${y})<br>${dist(OWN, [x, y]).toFixed(1)} tiles · never attacks · no ranking points<br>Defense ${fmt(botDefense(b))} · loot ~${fmt(botLootable(b))}${sl ? `<br><span class="ok">Scouted: +${pct(SCOUT_BONUS)} attack, ${dur(sl)} left</span>` : ''}`;
  return `<b>${who(b.name, b.addr)}</b>${cl ? ` [${esc(cl.tag)}]` : ''} · (${x}|${y})<br>Town Hall ${botLvl(b)} · ${dist(OWN, [x, y]).toFixed(1)} tiles · ${botShielded(b) ? 'shield' : b.active ? 'active' : 'inactive'}<br>Defense ${fmt(botDefense(b))} · loot ~${fmt(botLootable(b))}${sl ? `<br><span class="ok">Scouted: +${pct(SCOUT_BONUS)} attack, ${dur(sl)} left</span>` : ''}`;
}

// ------------------------------------------------------------------ UI: pages
function armyPage() {
  const cap = popCap(), used = upkeepPlanned(), bl = levelOf('barracks'), room = Math.max(0, Math.floor(cap - used));
  const net = netRate(1), byFood = S.test.free ? Infinity : Math.max(0, Math.floor(net / FOOD_PER_ROOM));
  let h = `<h2>Army</h2><p class="sub">Each unit needs Burrow room and eats ${FOOD_PER_ROOM} Food per hour per room. Defense at home now: <b class="gold">${fmt(defense())}</b> (Walls +${4 * S.walls}%, Forge +${Math.round(forge() * 100)}%${S.helpers.length ? ', clan support' : ''}).</p>`;
  const limit = byFood < room ? `<span class="bad">Food is your limit:</span> it feeds about ${fmt(byFood)} more room before it runs out (Burrows have ${fmt(room)}). Upgrade farms or dismiss units.` : `Burrow room left: <b>${fmt(room)}</b>${isFinite(byFood) ? ` · Food would feed about ${fmt(byFood)} more` : ''}.`;
  h += `<div class="px box" style="margin-bottom:14px"><p style="margin:0">${limit}</p><p class="muted" style="margin:4px 0 0">Room used ${fmt(used)} of ${fmt(cap)} · Food ${fmt(rate(1))}/h grown, ${fmt(foodUse())}/h eaten</p></div><div class="grid2">`;
  h += `<div class="px box wide"><h3>Your units</h3><div class="tblwrap"><table class="tbl utbl"><thead><tr><th>Unit</th><th>Home</th><th>Away</th><th>Atk / Def</th><th>Speed</th><th>Carry</th><th>Dismiss</th></tr></thead><tbody>`;
  const away = awayUnits();
  h += UK.map(k => `<tr><td class="un"><img src="${spr(U[k].sprite)}" alt="">${U[k].name}${unitOpen(k) ? '' : ' <span class="muted">(locked)</span>'}</td><td class="r">${S.units[k]}</td><td class="r">${away[k]}</td><td class="r">${U[k].a} / ${U[k].d}</td><td class="r">${U[k].s}</td><td class="r">${U[k].c}</td><td>${S.units[k] ? `<span class="pbtn"><input type="number" id="ds-${k}" min="1" max="${S.units[k]}" value="1" inputmode="numeric"><button class="btn ghost sm" data-act="dismiss" data-u="${k}">✕</button></span>` : ''}</td></tr>`).join('');
  h += `</tbody></table></div><p class="muted">Dismissed units leave for good; nothing is refunded.</p></div>`;
  h += `<div class="px box"><h3>Train at the Barracks</h3>`;
  if (!bl) h += `<p class="muted">Build Barracks on a plot in your village first.</p>`;
  else if (S.training) { const tr = S.training, p = (S.t - tr.start) / (tr.end - tr.start); h += `<div class="slot"><div class="t"><span>${tr.n} ${U[tr.unit].name}</span><span>${dur(tr.end - S.t)} <button class="x" data-act="canceltr" title="Cancel: 80% back" aria-label="Cancel training">✕</button></span></div><div class="prog"><i style="width:${(p * 100).toFixed(0)}%"></i></div></div><p class="muted">One batch at a time.</p>`; }
  else {
    h += `<div class="opts">` + UK.filter(unitOpen).map(k => { const mx = trainMax(k); return `<div class="opt"><img src="${spr(U[k].sprite)}" alt=""><div><div class="row"><span class="n">${U[k].name}</span><span class="muted">max ${mx}</span></div><div class="c">${U[k].cost.map((c, i) => `${icon(RES[i])}${c}`).join(' ')} · ${dur(U[k].m / 60 * 0.9 ** (bl - 1))} each</div><div class="row" style="justify-content:flex-start;margin-top:4px"><input type="number" id="tr-${k}" min="1" max="${Math.max(1, mx)}" value="${Math.max(1, Math.min(mx, 10))}" class="numin"><button class="btn sm" data-act="train" data-u="${k}">Train</button></div></div></div>`; }).join('') + `</div>`;
    if (room < 1) h += `<p class="bad">No room for more troops: build or upgrade Burrows.</p>`;
    const locked = UK.filter(k => !unitOpen(k)); if (locked.length) h += `<p class="muted">Locked until researched: ${locked.map(k => U[k].name).join(', ')}.</p>`;
  }
  h += `</div><div class="px box"><h3>On the move</h3><div class="list">${movesHtml()}</div><p class="muted">Pick a target on the World Map to attack, or to scout it first for +10% attack.</p>`;
  if (S.abroad.length) h += `<h3 style="margin-top:12px">Supporting clan members</h3><div class="list">${S.abroad.map((st, i) => `<div class="card row"><span>${unitList(st.units)} at ${esc(st.name)}</span><button class="btn ghost sm" data-act="recall" data-i="${i}">Recall</button></div>`).join('')}</div>`;
  if (S.helpers.length) h += `<h3 style="margin-top:12px">Clan support in your village</h3><div class="list">${S.helpers.map(hp => `<div class="card">${unitList(hp.units)} from ${esc(hp.name)} · leaves in ${dur(hp.until - S.t)}</div>`).join('')}</div>`;
  return h + `</div></div>`;
}
function academyPage() {
  const ak = levelOf('academy'); const open = tierOpen();
  let h = `<h2>Academy</h2><p class="sub">${ak ? `Academy level ${ak}: ${open ? `tiers 1–${open} open` : 'no tier open yet'}. One research at a time; it costs resources and SEED.` : 'Build an Academy on a plot to start research.'}</p>`;
  if (S.research.cur) { const r = S.research.cur; h += `<div class="px box" style="margin-bottom:14px"><div class="slot"><div class="t"><span>Researching ${RESEARCH.find(x => x.id === r.id).name}</span><span>${dur(r.end - S.t)} <button class="x" data-act="cancelres" title="Cancel: 80% back" aria-label="Cancel research">✕</button></span></div><div class="prog"><i style="width:${((S.t - r.start) / (r.end - r.start) * 100).toFixed(0)}%"></i></div></div></div>`; }
  for (let t = 1; t <= 5; t++) {
    const c = researchCost(t);
    h += `<div class="tier"><h4>TIER ${t} · Academy level ${TIER_AT[t]} · ${c.res.map((x, i) => `${icon(RES[i])}${fmt(x)}`).join(' ')} ${icon('seed')}${fmt(c.seed)} · ${dur(c.h)}</h4><div class="rsrch">`;
    h += RESEARCH.filter(r => r.tier === t).map(r => {
      const done = researched(r.id), cur = S.research.cur && S.research.cur.id === r.id, lock = t > open || !ak;
      const pay = canPay(c.res, c.seed), can = !done && !cur && !lock && !S.research.cur && pay;
      return `<div class="rs ${done ? 'done' : cur ? 'cur' : lock ? 'lock' : ''}"><b>${r.name}</b><div class="muted" style="font-size:17px">${r.d}</div><div style="margin-top:6px">${done ? '<span class="ok">Done</span>' : cur ? '<span class="gold">In progress</span>' : lock ? `<span class="muted">Needs Academy ${TIER_AT[t]}</span>` : `<button class="btn sm" data-act="research" data-r="${r.id}" ${can ? '' : 'disabled'}>Research</button>${!pay && !S.research.cur ? `<div class="why">${shortMsg(c.res, c.seed)}</div>` : ''}`}</div></div>`;
    }).join('');
    h += `</div></div>`;
  }
  return h;
}
function marketPage() {
  const L = levelOf('market');
  let h = `<h2>Market</h2><p class="sub">No trading between players. The Market exchanges your own resources: give 100 of one, get 25 to 75 of another, depending on its level${L ? ` (yours gives ${MARKET(L)})` : ''}. SEED can be given at the same rate, but no resource ever turns back into SEED.</p>`;
  if (!L) return h + `<div class="px box"><p class="muted">${S.th >= 2 ? 'Build a Market on a plot in your village.' : 'The Market opens at Town Hall level 2: upgrade the Town Hall, then build it on a plot.'}</p></div>`;
  h += `<div class="px box"><h3>Exchange · Market level ${L} · 100 → ${MARKET(L)}</h3><div class="mkt">
    <label>Give<select id="mk-from">${RES.map((r, i) => `<option value="${i}">${RES_NAME[r]} (${fmt(S.res[i])})</option>`).join('')}<option value="4">SEED (${fmt(S.seed)}), one way</option></select></label>
    <label>Get<select id="mk-to">${RES.map((r, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${RES_NAME[r]}</option>`).join('')}</select></label>
    <label>Amount<input type="number" id="mk-amt" min="0" step="100" value="1000"></label>
    <button class="btn" data-act="exchange">Exchange</button></div><p class="muted" id="mk-out"></p></div>`;
  h += `<div class="px box" style="margin-top:14px"><h3>Rates by level</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Level</th>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => `<th>${l}</th>`).join('')}</tr></thead><tbody><tr><td>100 →</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => `<td class="r ${l === L ? 'gold' : ''}">${MARKET(l)}</td>`).join('')}</tr></tbody></table></div></div>`;
  return h;
}
function champPage() {
  const n = held().length, laps = lastPasses(), sq = holder();
  const intro = `<h2>Champion</h2><p class="sub">Every village has a champion. It joins your attacks or defends at home, earns XP from battles and from Squeektoshi's runs, and reaches level 30. If your wallet holds a Squeek, it becomes a Squeek champion: +10% XP and +10% to every stat, with a golden glow. One Squeek is enough; more Squeeks only speed up construction.</p>`;
  const curve = [1, 2, 3, 5, 10].map(k => `<td class="r ${k === n ? 'gold' : ''}">−${pct(squeekBuildFor(k, laps))}</td>`).join('');
  const speed = `<div class="px box" style="margin-top:14px"><h3>Build speed from your Squeeks</h3><p style="margin:0">${n ? `${n} Squeek${n > 1 ? 's' : ''} and last night's ${fmt(laps)} laps: <b class="gold" style="font-weight:400">−${pct(squeekBuild())}</b> construction time.` : 'No Squeek in this wallet: construction runs at the normal speed.'}</p><div class="tblwrap"><table class="tbl" style="max-width:520px;margin-top:8px"><thead><tr><th>Squeeks</th><th>1</th><th>2</th><th>3</th><th>5</th><th>10</th></tr></thead><tbody><tr><td>Build time</td>${curve}</tr></tbody></table></div><p class="muted" style="margin:6px 0 0">Each extra Squeek adds half as much as the one before, so it never passes −30%. A weak night lowers it: the full effect needs 11,000 laps.</p></div>`;
  const L = hlevel(), next = 100 * L * L, prev = 100 * (L - 1) * (L - 1), free = hfree(), rank = L >= 30 ? 4 : L >= 20 ? 3 : L >= 10 ? 2 : 1;
  const st = S.champ.home ? (S.t < S.champ.inj ? `injured for ${dur(S.champ.inj - S.t)}` : 'at home, defending') : 'with an army';
  const tag = sq ? `<span class="sqtag">Squeek champion · +10% XP and stats</span>` : `<span class="muted" style="font-size:17px">Hold a Squeek for +10% XP and stats</span>`;
  return intro + `<div class="px box champ"><img src="${spr('champion_' + rank + (sq ? '_sq' : ''))}" alt="${sq ? 'Squeek champion' : 'Champion'}"><div><div class="disp" style="font-size:22px">${sq ? 'Squeek champion' : 'Champion'} · Level ${L}</div>${tag}<div class="muted">${fmt(S.champ.xp)} XP${L < 30 ? ` · next level at ${fmt(next)}` : ' · max level'}</div><div class="prog" style="max-width:360px"><i style="width:${L < 30 ? ((S.champ.xp - prev) / (next - prev) * 100).toFixed(0) : 100}%"></i></div><p class="muted">Status: ${st}</p>
  <h3 style="margin-top:10px">Points to spend: <span class="num">${free}</span></h3><div class="pts">
  <span>Might · own power</span><b style="font-weight:400">${fmt(hmight())}</b><button class="btn sm" data-act="pt" data-k="might" ${free ? '' : 'disabled'}>+1</button>
  <span>Attack bonus (max ${sq ? 11 : 10}%)</span><b style="font-weight:400">+${(hatk() * 100).toFixed(1)}%</b><button class="btn sm" data-act="pt" data-k="atk" ${free && S.champ.pts.atk < 20 ? '' : 'disabled'}>+1</button>
  <span>Defense bonus (max ${sq ? 11 : 10}%)</span><b style="font-weight:400">+${(hdef() * 100).toFixed(1)}%</b><button class="btn sm" data-act="pt" data-k="def" ${free && S.champ.pts.def < 20 ? '' : 'disabled'}>+1</button>
  <span>Carry bonus (max ${sq ? 22 : 20}%)</span><b style="font-weight:400">+${(hcarry() * 100).toFixed(0)}%</b><button class="btn sm" data-act="pt" data-k="carry" ${free && S.champ.pts.carry < 20 ? '' : 'disabled'}>+1</button></div></div></div>` + speed;
}
function reportKind(r) { return r.kind || (r.title.startsWith('Attack') ? 'atk' : r.title.startsWith('Defense') ? 'def' : r.title.startsWith('Scout') ? 'scout' : 'atk'); }
function reportsPage() {
  const f = S.ui.rf || 'all', list = S.reports.filter(r => f === 'all' || reportKind(r) === f);
  let h = `<h2>Reports</h2><p class="sub">Battles and scouting. The hamster's nightly runs are in the log at the bottom.</p>`;
  h += `<div class="filters" role="tablist">${[['all', 'All'], ['atk', 'Attacks'], ['def', 'Defenses'], ['scout', 'Scouting']].map(([k, n]) => `<button class="btn sm ${f === k ? '' : 'ghost'}" data-act="rf" data-f="${k}" aria-pressed="${f === k}">${n} (${k === 'all' ? S.reports.length : S.reports.filter(r => reportKind(r) === k).length})</button>`).join('')}</div>`;
  if (!list.length) h += `<div class="px box"><p class="muted">${S.reports.length ? 'Nothing in this filter yet.' : 'No battles yet. After your beginner shield ends, neighbours may attack you, and you can raid villages that are less than half your attack power.'}</p></div>`;
  h += list.map(r => {
    const k = reportKind(r), lab = r.res === 's' ? 'Scouted' : r.res === 'w' ? 'Victory' : 'Defeat';
    const btn = r.target ? (k === 'atk' && r.sent ? `<button class="btn sm" data-act="again" data-id="${r.id}">Attack again</button>` : k === 'def' ? `<button class="btn sm" data-act="strike" data-id="${r.id}">Strike back</button>` : `<button class="btn sm" data-act="strike" data-id="${r.id}">Open on map</button>`) : '';
    return `<div class="px report"><div class="h"><span>${esc(r.title)}</span><span class="${r.res}">${lab} · Day ${day(r.t)} ${clock(r.t)}</span></div>${r.lines.map(l => `<p>${esc(l)}</p>`).join('')}${(r.tables || []).map(tb => `<div class="tblwrap"><table class="tbl rtbl"><thead><tr><th>${esc(tb.title)}</th><th>${r.res === 's' ? 'Seen' : 'Sent'}</th><th>Lost</th><th>Left</th></tr></thead><tbody>${tb.rows.map(row => `<tr><td>${esc(row[0])}</td><td class="r">${row[1]}</td><td class="r ${row[2] ? 'bad' : ''}">${row[2]}</td><td class="r">${row[3]}</td></tr>`).join('')}</tbody></table></div>`).join('')}${btn ? `<div class="row" style="justify-content:flex-start;margin-top:8px">${btn}</div>` : ''}</div>`;
  }).join('');
  h += `<div class="px box" style="margin-top:14px" id="report-box"><h3>Report a problem</h3><p class="muted">Found a bug, or a player breaking the rules? Tell us here.</p>${reportForm('g')}</div>` + inboxHtml();
  if (S.log.length) h += `<div class="px box" style="margin-top:14px"><h3>Hamster log</h3>${S.log.map(l => `<div class="muted">Day ${day(l.t)} · ${esc(l.s)}</div>`).join('')}</div>`;
  return h;
}
function clanPage() {
  const L = clanHall();
  let h = `<h2>Clan</h2><p class="sub">Clan members cannot attack each other and see each other on the map. Send troops to defend a member from the World Map; members near you send help when you are attacked.</p>`;
  if (!L) return h + `<div class="px box"><p class="muted">${researched('clanhall') ? 'Build a Clan Hall on a plot in your village.' : 'Research the Clan Hall in the Academy (tier 2), then build it.'} Level 1 lets you join a clan, level 3 lets you found one.</p></div>`;
  if (!S.clan) {
    if (L < 3) return h + `<div class="px box"><p class="muted">Clan Hall level ${L}. Upgrade it to level 3 to found your own clan. Invites from other players would arrive here.</p></div>`;
    return h + `<div class="px box"><h3>Found a clan</h3><div class="mkt"><label>Clan name<input id="cl-name" maxlength="24" placeholder="The Night Wheel"></label><label>Tag<input id="cl-tag" maxlength="4" placeholder="NW"></label><button class="btn" data-act="found">Found clan</button></div><p class="muted">Up to ${clanCap()} members at Clan Hall level ${L} (3 per level).</p></div>`;
  }
  const members = [`<tr><td><b class="gold" style="font-weight:400">${who(S.username || 'You', S.wallet)}</b> (founder)</td><td>(${OWN[0]}|${OWN[1]})</td><td class="r">${S.th}</td><td class="r">0.0</td><td></td></tr>`]
    .concat(S.clan.members.map(k => { const [x, y] = k.split(',').map(Number); const b = bot(x, y); const sup = S.abroad.filter(st => st.key === k).length; return `<tr><td>${who(b.name, b.addr)}${sup ? ' <span class="ok">⛨</span>' : ''}</td><td><button class="lnk" data-act="goclan" data-k="${k}">(${x}|${y})</button></td><td class="r">${botLvl(b)}</td><td class="r">${dist(OWN, [x, y]).toFixed(1)}</td><td class="r"><button class="btn ghost sm" data-act="kick" data-k="${k}">Remove</button></td></tr>`; }));
  h += `<div class="grid2"><div class="px box"><h3>[${esc(S.clan.tag)}] ${esc(S.clan.name)} · ${S.clan.members.length + 1} / ${clanCap()}</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Player</th><th>Village</th><th>TH</th><th>Tiles</th><th></th></tr></thead><tbody>${members.join('')}</tbody></table></div>
  <p class="muted">Tap a member's village to send support. ⛨ = your troops are there.</p><p style="margin-top:12px"><button class="btn ghost sm" data-act="disband">Disband clan</button></p></div>`;
  h += `<div class="px box"><h3>Invite a player</h3><div class="mkt"><label>Player name<input id="cl-inv" maxlength="20" placeholder="e.g. ${esc((nearbyPlayers(1)[0] || {}).name || 'AmberPaw42')}"></label><button class="btn" data-act="invname">Send invite</button></div>
  <p class="muted">You can also open a village on the World Map and tap "Invite". Players already in another clan decline.</p><h3 style="margin-top:10px">Active players nearby</h3><div class="list">${nearbyPlayers(6).map(b => `<div class="row card"><span>${esc(b.name)} <span class="muted">(${b.x}|${b.y}) · TH ${botLvl(b)}</span></span><button class="btn sm alt" data-act="invnear" data-k="${b.x},${b.y}" ${S.invites.some(iv => iv.key === b.x + ',' + b.y) ? 'disabled' : ''}>Invite</button></div>`).join('')}</div>
  ${S.invites.length ? `<h3 style="margin-top:10px">Waiting for an answer</h3>${S.invites.map(iv => `<div class="muted">${esc(iv.name)} · answers in ${dur(iv.at - S.t)}</div>`).join('')}` : ''}</div></div>`;
  return h;
}
// ---- ranking: village (build) points = resources spent on buildings ÷ 100; attack / defense points = value of the troops you killed
const sumCost = (kind, ref, L) => { let t = 0; for (let l = 1; l <= L; l++) t += costOf(kind, ref, l).res.reduce((a, x) => a + x, 0); return t; };
function villagePoints() {
  let t = sumCost('th', 'townhall', S.th) + sumCost('walls', 'walls', S.walls);
  S.fields.forEach((L, i) => t += sumCost('field', i, L)); S.plots.forEach(p => { if (p && p.lvl) t += sumCost('plot', p.type, p.lvl); });
  return Math.round(t / 100);
}
const PTS_CACHE = {};
function botPoints(b) {
  const L = botLvl(b), k = L + ':' + b.walls + ':' + (b.active ? 1 : 0);
  if (!PTS_CACHE[k]) { let t = sumCost('th', 'townhall', L) + sumCost('walls', 'walls', b.walls); for (let i = 0; i < 8; i++) t += sumCost('field', i, Math.max(1, L - (i % 3 === 0 ? 1 : 0))); for (const ty of ['wheelhouse', 'storehouse', 'burrow', 'barracks', 'academy', 'vault'].slice(0, 2 + Math.min(4, L))) t += sumCost('plot', ty, Math.max(1, L - 1)); PTS_CACHE[k] = t / 100; }
  return Math.round(PTS_CACHE[k] * (b.active ? 0.9 + 0.2 * hash(b.x, b.y, 40) : 0.7));
}
// Overall = village points + research points + combat points; combat = (attack + defense points) ÷ 200, never more than the village points
const researchPoints = () => Math.round(S.research.done.reduce((a, id) => a + researchCost(RESEARCH.find(r => r.id === id).tier).res.reduce((x, y) => x + y, 0), 0) / 100);
const overallOf = (v, r, atk, def) => { const c = Math.round(Math.min(v, (atk + def) / 200)); return { v, r, c, total: v + r + c }; };
const myOverall = () => overallOf(villagePoints(), researchPoints(), S.stats.atk, S.stats.def);
function botOverall(b) {
  const v = botPoints(b), ak = Math.max(1, botLvl(b) - 1); let t = 0; while (t < 5 && TIER_AT[t + 1] <= ak) t++;
  let r = 0; for (let k = 1; k <= t; k++) r += 2 * 6 * 2.2 ** (k - 1);
  return overallOf(v, Math.round(r * (b.active ? 1 : 0.7)), botStat(b, 'atk'), botStat(b, 'def'));
}
function botStat(b, k, wk) {         // bots' battle stats, deterministic per week
  if (!b.active) return 0; const L = botLvl(b), base = { atk: 900, def: 700, loot: 2600 }[k];
  const weekly = w => Math.round(base * L * L / 8 * hash(b.x, b.y, 70 + w * 3 + ['atk', 'def', 'loot'].indexOf(k)) * (hash(b.x, b.y, 69) < 0.5 ? 0.3 : 1));
  if (wk) return weekly(wk);
  let s = 0; for (let w = 1; w <= week(S.t); w++) s += weekly(w) * (w === week(S.t) ? ((day(S.t) - 1) % 7 + 1) / 7 : 1); return Math.round(s);
}
function rankRows(cat, wk) {
  const rows = [];
  for (let dx = -15; dx <= 15; dx++) for (let dy = -15; dy <= 15; dy++) {
    const b = bot(OWN[0] + dx, OWN[1] + dy); if (!b || b.camp) continue; const cl = botClan(b);
    const o = cat === 'gen' ? botOverall(b) : null;
    rows.push({ name: b.name, addr: b.addr, at: [b.x, b.y], clan: cl ? cl.tag : '', v: o ? o.total : cat === 'pts' ? botPoints(b) : botStat(b, cat, wk), o });
  }
  const mo = cat === 'gen' ? myOverall() : null;
  const mine = mo ? mo.total : cat === 'pts' ? villagePoints() : wk ? (S.stats.wk[wk] || {})[cat] || 0 : S.stats[cat];
  rows.push({ name: S.username || 'You', addr: S.wallet, at: OWN, clan: S.clan ? S.clan.tag : '', v: Math.round(mine), o: mo, me: true });
  return rows.sort((a, b) => b.v - a.v || (a.me ? -1 : 1));
}
function clanRows() {
  const m = {};
  const add = (tag, name, pts, me) => { m[tag] = m[tag] || { tag, name, pts: 0, n: 0, me }; m[tag].pts += pts; m[tag].n++; };
  for (let dx = -15; dx <= 15; dx++) for (let dy = -15; dy <= 15; dy++) { const b = bot(OWN[0] + dx, OWN[1] + dy); const cl = b && botClan(b); if (cl) add(cl.tag, cl.name, botOverall(b).total, !!cl.mine); }
  if (S.clan) add(S.clan.tag, S.clan.name, myOverall().total, true);
  return Object.values(m).sort((a, b) => b.pts - a.pts);
}
function rankingPage() {
  const cat = S.ui.rk || 'gen', wk = S.ui.rkw && cat !== 'gen' && cat !== 'pts' ? week(S.t) : 0;
  const CATS = [['gen', 'Overall'], ['pts', 'Villages'], ['atk', 'Attackers'], ['def', 'Defenders'], ['loot', 'Raiders'], ['clan', 'Clans']];
  let h = `<h2>Ranking</h2><p class="sub">Every village within 15 tiles. <b>Overall = Build + Research + Combat</b>. Season 1 resets everything.</p>
  <details class="how"><summary>How points are counted</summary><ul><li><b>Build</b>: resources spent on buildings and sites ÷ 100 (the Villages tab).</li><li><b>Research</b>: resources spent on research ÷ 100.</li><li><b>Combat</b>: (attack + defense points) ÷ 200, never more than Build.</li><li><b>Attack / defense points</b>: resource value of the troops you killed. Raids on villages 3+ Town Hall levels below you and on wild camps give none.</li><li><b>Clans</b>: the sum of their members' Overall.</li></ul></details>`;
  h += `<div class="filters">${CATS.map(([k, n]) => `<button class="btn sm ${cat === k ? '' : 'ghost'}" data-act="rk" data-k="${k}" aria-pressed="${cat === k}">${n}</button>`).join('')}${['atk', 'def', 'loot'].includes(cat) ? `<button class="btn sm alt" data-act="rkw">${wk ? 'This week' : 'Whole season'} ⇄</button>` : ''}</div>`;
  const last = week(S.t) - 1;
  if (last >= 1) { const t = ['atk', 'def', 'loot'].map(k => [k, rankRows(k, last)[0]]); h += `<div class="px box" style="margin-bottom:14px"><h3>Titles of week ${last}</h3><div class="titles">${t.map(([k, r]) => `<div><b class="gold" style="font-weight:400">${{ atk: 'Top Attacker', def: 'Top Defender', loot: 'Top Raider' }[k]}</b><br>${r.me ? `<b>${esc(r.name)} (you!)</b>` : esc(r.name)} · ${fmt(r.v)}</div>`).join('')}</div></div>`; }
  if (cat === 'clan') {
    const rows = clanRows();
    return h + `<div class="px box"><div class="tblwrap"><table class="tbl rank"><thead><tr><th>#</th><th>Clan</th><th>Members here</th><th>Overall</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>[${esc(r.tag)}] ${esc(r.name)}</td><td class="r">${r.n}</td><td class="r">${fmt(r.pts)}</td></tr>`).join('')}</tbody></table></div>${S.clan ? '' : '<p class="muted">Found or join a clan to appear here.</p>'}</div>`;
  }
  const rows = rankRows(cat, wk), me = rows.findIndex(r => r.me), top = rows.slice(0, 20);
  const row = (r, i) => `<tr class="${r.me ? 'me' : ''}"><td>${i + 1}</td><td>${r.me ? `<span class="swdot" style="--c:${S.banner}"></span>` : ''}${who(r.name, r.addr)}${r.clan ? ` <span class="muted">[${esc(r.clan)}]</span>` : ''}</td><td><button class="lnk" data-act="gorank" data-x="${r.at[0]}" data-y="${r.at[1]}">(${r.at[0]}|${r.at[1]})</button></td><td class="r">${fmt(r.v)}</td>${r.o ? `<td class="r muted">${fmt(r.o.v)}</td><td class="r muted">${fmt(r.o.r)}</td><td class="r muted">${fmt(r.o.c)}</td>` : ''}</tr>`;
  h += `<div class="px box"><div class="tblwrap"><table class="tbl rank"><thead><tr><th>#</th><th>Player</th><th>Village</th><th>${{ gen: 'Overall', pts: 'Points', atk: 'Attack pts', def: 'Defense pts', loot: 'Looted' }[cat]}</th>${cat === 'gen' ? '<th>Build</th><th>Research</th><th>Combat</th>' : ''}</tr></thead><tbody>${top.map(row).join('')}${me >= 20 ? `<tr><td colspan="${cat === 'gen' ? 7 : 4}" class="muted">…</td></tr>${row(rows[me], me)}` : ''}</tbody></table></div><p class="muted">You are #${me + 1} of ${rows.length}.</p></div>`;
  return h;
}
function reportForm(sfx) {
  return `<div class="mkt rpf"><label>What happened<select id="rp-type${sfx}"><option>Bug</option><option>Player breaking the rules</option><option>Idea</option><option>Other</option></select></label>
  <label>Player name or village (x|y), optional<input id="rp-who${sfx}" maxlength="60" placeholder="e.g. IronClaw (48|71)"></label></div>
  <label class="rpt">Details<textarea id="rp-text${sfx}" rows="4" maxlength="2000" placeholder="What did you do, what did you expect, what happened?"></textarea></label>
  <div class="row" style="justify-content:flex-start;margin-top:8px"><button class="btn" data-act="rp-send" data-s="${sfx}">Send report</button><span class="muted" id="rp-st${sfx}"></span></div>`;
}
let INBOX = null;
function inboxHtml() {
  if (!canAdmin) return '';
  let h = `<div class="px box" style="margin-top:14px"><div class="row"><h3 style="margin:0">Reports received (owner only)</h3><button class="btn ghost sm" data-act="inbox">Refresh</button></div>`;
  if (!INBOX) return h + `<p class="muted">Tap Refresh to load the reports players sent.</p></div>`;
  if (!INBOX.length) return h + `<p class="muted">No reports yet.</p></div>`;
  return h + INBOX.map(r => `<div class="card" style="margin-top:6px"><div class="row"><b style="font-weight:400" class="gold">${esc(r.type)}</b><span class="muted">${esc((r.at || '').slice(0, 16).replace('T', ' '))}</span></div><div>${esc(r.text)}</div><div class="muted">${r.who ? `About: ${esc(r.who)} · ` : ''}from ${esc(r.player || 'unknown player')} · game day ${r.gameDay}</div></div>`).join('') + '</div>';
}
function testPanel() {
  const tg = (act, on, label) => `<button class="btn sm ${on ? '' : 'ghost'}" data-act="${act}" aria-pressed="${on}">${on ? 'On' : 'Off'} · ${label}</button>`;
  const perm = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
  return `<div class="row"><h3 style="margin:0">Settings</h3><button class="btn ghost sm" data-act="closetest">Close</button></div>
  <div class="row card" style="margin-top:8px"><span>${who(S.username || '', S.wallet)}</span><button class="btn ghost sm" data-act="wb-off">Disconnect</button></div>
  <div class="list" style="margin:8px 0 12px">${tg('set-sound', S.ui.sound !== false, 'Sound')}${tg('set-night', S.ui.replay !== false, 'Show the night run')}${tg('set-notify', !!S.ui.notify && perm === 'granted', perm === 'unsupported' ? 'Notifications (not supported here)' : perm === 'denied' ? 'Notifications (blocked in browser)' : 'Notify me when something finishes')}</div>
  <h3 style="margin:0 0 6px">Prototype test controls</h3>
  <div class="list" style="margin:0 0 8px">${tg('tg-free', S.test.free, 'Free: nothing costs resources')}${tg('tg-instant', S.test.instant, 'Instant: no build, research, training or travel time')}${tg('tg-prod', S.test.prod > 1, 'Production ×1000')}</div>
  <div class="muted" style="font-size:17px;margin-bottom:6px">Squeeks in your wallet</div><div class="speeds">${[0, 1, 2, 3, 5, 10].map(n => `<button class="btn sm ${S.test.squeeks === n ? 'on' : ''}" data-act="sqn" data-n="${n}">${n}</button>`).join('')}</div>
  <div class="muted" style="font-size:17px;margin-bottom:6px">Game speed (game time per real time)</div><div class="speeds">${[1, 60, 600, 1000, 3600].map(s => `<button class="btn sm ${S.speed === s ? 'on' : ''}" data-act="speed" data-s="${s}">×${s}</button>`).join('')}</div>
  <div class="list"><button class="btn sm alt" data-act="cheat-res">+10,000 each resource</button><button class="btn sm alt" data-act="cheat-seed">+10,000 SEED</button><button class="btn sm alt" data-act="shield" ${S.t < S.shieldUntil ? '' : 'disabled'}>End my beginner shield</button><button class="btn sm alt" data-act="night-now">Play the night run now</button><button class="btn sm ghost" data-act="reset">Restart the demo</button></div><p class="muted" style="font-size:16px">Your demo village is saved in this browser.</p>`;
}
// ---- sound, notifications, the night run, other tabs
let AC = null, catching = false, nightShownAt = -1e9;
function sfx(kind) {
  if (S.ui.sound === false || view === 'home' || catching) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime + 0.01;
    if (kind === 'battle') { const len = 0.35, buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2; const src = AC.createBufferSource(), g = AC.createGain(); g.gain.value = 0.18; src.buffer = buf; src.connect(g).connect(AC.destination); src.start(t0); return; }
    const seq = { build: [[523, 0.08], [784, 0.14]], ok: [[660, 0.07], [880, 0.1]], alarm: [[880, 0.12], [620, 0.12], [880, 0.12], [620, 0.16]], night: [[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.22]] }[kind]; if (!seq) return;
    let t = t0; for (const [f, d] of seq) { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); t += d * 0.9; }
  } catch (e) { }
}
function notify(title, body) {
  if (!S.ui.notify || catching || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return;
  try { new Notification('Squeek Wars · ' + title, { body: body || '', icon: 'assets/ic_seed.png' }); } catch (e) { }
}
function showNight(p, seed) {
  if (S.ui.replay === false || view === 'home' || performance.now() - nightShownAt < 90000) return;
  nightShownAt = performance.now(); const box = $('#nightbox'); box.hidden = false;
  const bonus = Math.min(wheelCap(), p / PASS_PER_BONUS), t0 = performance.now(), dur0 = 2600;
  $('#nb-cap').textContent = levelOf('wheelhouse') ? `Your Wheelhouse level ${levelOf('wheelhouse')} caps the bonus at +${pct(wheelCap())}.` : 'Build a Wheelhouse to turn the laps into a production bonus.';
  const step = () => { if (box.hidden) return; const f = Math.min(1, (performance.now() - t0) / dur0), e = 1 - (1 - f) ** 3;
    $('#nb-laps').textContent = fmt(p * e); $('#nb-seed').textContent = '+' + fmt(seed * e); $('#nb-bonus').textContent = '+' + pct(bonus * e);
    if (f < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
let BC = null;
function staleGuard() {           // the newest tab plays; an older tab of the same village pauses
  try { BC = new BroadcastChannel('squeekwars'); } catch (e) { return; }
  BC.onmessage = e => { if (e.data && e.data.hello && e.data.hello !== TAB_ID && !stale) { stale = true; $('#tabbox').hidden = false; } };
  BC.postMessage({ hello: TAB_ID });
}

// ------------------------------------------------------------------ render loop
let lastFull = 0, lastBar = 0, pdown = false;
addEventListener('pointerdown', () => { pdown = true; }, true);
addEventListener('pointerup', () => { setTimeout(() => { pdown = false; }, 0); }, true);
addEventListener('pointercancel', () => { pdown = false; }, true);
function panel(id, html, closable) {
  html = html.replace('<button class="btn ghost sm sheet-close" data-act="close">Close</button>', '');
  const m = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/); const title = m ? m[1] : ''; const body = m ? html.replace(m[0], '') : html;
  const min = S.ui.min[id];
  return `<div class="ph"><h3>${title}</h3><span class="pbtn">${closable ? '<button class="btn ghost sm sheet-close" data-act="close">Close</button>' : ''}<button class="btn ghost sm" data-act="min" data-p="${id}" aria-expanded="${!min}">${min ? 'Show' : 'Hide'}</button></span></div>${min ? '' : body}`;
}
function setHTML(el, h) { if (el && el._h !== h) { el.innerHTML = h; el._h = h; } }
function render(force) {
  if (view === 'home') return;
  const now = performance.now();
  if (force || now - lastBar > 200) { renderBar(); lastBar = now; }
  const active = document.activeElement;
  const typing = (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) || (pdown && !force);
  const full = force || needFull || now - lastFull > 1000;
  if (view === 'village') {
    if (sceneDirty) { renderScene(); sceneDirty = false; renderScene.at = now; }
    else if (full && now - (renderScene.at || 0) > 1000) { renderScene(true); renderScene.at = now; }
    if (full && !typing) { setHTML($('#vleft'), panel('vleft', villageLeft(), false)); setHTML($('#vright'), panel('vright', detailPanel(), true)); }
  }
  if (view === 'world') {
    drawWorld();
    if (full && !typing) {
      const wl = $('#wleft'); setHTML(wl, panel('wleft', worldLeft(), false)); drawMini();
      const keep = {}; document.querySelectorAll('#wright input').forEach(i => keep[i.id] = i.type === 'checkbox' ? i.checked : i.value);
      setHTML($('#wright'), panel('wright', worldRight(), true));
      for (const id in keep) { const el = document.getElementById(id); if (el) el.type === 'checkbox' ? el.checked = keep[id] : el.value = keep[id]; }
      if (S.ui.prefill) { for (const k in S.ui.prefill) { const el = $('#atk-' + k); if (el) el.value = Math.min(S.units[k], S.ui.prefill[k]); } S.ui.prefill = null; }
      updatePrediction();
    }
  }
  if (full && !typing) {
    if (view === 'army') setHTML($('#army'), armyPage());
    if (view === 'academy') setHTML($('#academy'), academyPage());
    if (view === 'market') { setHTML($('#market'), marketPage()); mkPreview(); }
    if (view === 'champion') setHTML($('#champion'), champPage());
    if (view === 'clan') setHTML($('#clan'), clanPage());
    if (view === 'ranking') setHTML($('#ranking'), rankingPage());
    if (view === 'reports') { setHTML($('#reports'), reportsPage()); S.unread = 0; }
  }
  if (!$('#testpanel').hidden && full && !typing) setHTML($('#testpanel'), testPanel());
  if (full && !typing) { needFull = false; lastFull = now; }
}
function mkPreview() { const o = $('#mk-out'); if (!o) return; const L = levelOf('market'); const a = +$('#mk-amt').value || 0; o.textContent = `You get ${fmt(a * MARKET(L) / 100)} ${RES_NAME[RES[+$('#mk-to').value]]}.`; }
let lastTick = performance.now(), saveAt = 0;
function tick() {
  const now = performance.now(); const dt = Math.min(1, (now - lastTick) / 1000); lastTick = now;
  if (view !== 'home' && !stale) { advance(S.t + dt * S.speed / 3600); render(false); if (view === 'village') sceneFx(false); }
  if (now - saveAt > 4000) { save(); saveAt = now; }
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ events
const selectPlotFor = type => { let i = S.plots.findIndex(p => p && p.type === type); if (i < 0) i = PLOT_OPEN_ORDER.slice(0, openPlots()).find(j => !S.plots[j]); return i; };
function questGo(q) {
  const g = q.go; if (g.startsWith('tab:')) { location.hash = g.slice(4); return; }
  if (location.hash !== '#village') location.hash = 'village';
  if (g.startsWith('b:')) { const i = selectPlotFor(g.slice(2)); if (i === undefined) return note('No free plot: upgrade the Town Hall to open one.', 'bad'); S.sel = { kind: 'plot', i }; }
  else if (g === 'field') S.sel = { kind: 'field', i: S.fields.indexOf(Math.min(...S.fields)) };
  else S.sel = { kind: g };
  S.ui.min.vright = false; openSheet('#vright'); sceneDirty = true; dirty();
}
function claimQuest(id) {
  const q = QUESTS.find(x => x.id === id); if (!q || S.quests.includes(id) || !q.ok()) return;
  S.quests.push(id); const cap = storage(); let lost = 0; S.res = S.res.map(x => { const v = x + q.rw; lost += Math.max(0, v - cap); return Math.min(cap, v); });
  note(`Reward: +${fmt(q.rw)} of each resource${lost > 1 ? ' (some did not fit in the Storehouse)' : ''}`, 'ok'); sfx('ok'); dirty();
}
function buyShop(k) {
  const it = SEED_SHOP.find(x => x.id === k); if (!it) return;
  if (!S.test.free && S.seed < it.seed) return note(`Needs ${fmt(it.seed - S.seed)} more SEED.`, 'bad');
  if (it.r !== undefined) { if (boosted(it.r)) return note(`The ${RES_NAME[RES[it.r]]} boost is already running.`, 'bad'); S.boost[it.r] = S.t + BOOST_H; note(`${RES_NAME[RES[it.r]]} +25% for 24 h`, 'ok'); }
  if (k === 'peace') { if (S.t < S.peaceNext) return note(`Available again in ${dur(S.peaceNext - S.t)}.`, 'bad'); S.peaceUntil = S.t + 12; S.peaceNext = S.t + 72; S.moves = S.moves.filter(m => m.kind !== 'incoming'); note('Peace shield up for 12 h: attacks on the way turned back', 'ok'); }
  if (!S.test.free) S.seed -= it.seed; sfx('ok'); dirty();
}
function onClick(e) {
  const t = e.target.closest('[data-act],[data-sel],[data-hit]'); if (!t) return;
  if (t.dataset.hit) { if (e.detail === 0) selectHit(t); return; }
  if (t.dataset.sel) { S.sel = t.dataset.sel === 'th' || t.dataset.sel === 'walls' ? { kind: t.dataset.sel } : { kind: t.dataset.sel, i: +t.dataset.i }; openSheet('#vright'); sceneDirty = true; dirty(); return; }
  const a = t.dataset.act; const wb = () => bot(S.wsel[0], S.wsel[1]);
  const pickIn = () => { const u = {}; document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => u[i.dataset.u] = +i.value || 0); return u; };
  if (a === 'close') { t.closest('.right').classList.add('closed'); return; }
  if (a === 'build') return doBuild(S.sel.i, t.dataset.t);
  if (a === 'upgrade') { const k = S.sel.kind; return doUpgrade(k === 'plot' ? 'plot' : k, k === 'th' || k === 'walls' ? null : S.sel.i); }
  if (a === 'research') return doResearch(t.dataset.r);
  if (a === 'train') return doTrain(t.dataset.u, +$('#tr-' + t.dataset.u).value);
  if (a === 'exchange') return doExchange(+$('#mk-from').value, +$('#mk-to').value, +$('#mk-amt').value);
  if (a === 'pt') return doPoint(t.dataset.k);
  if (a === 'home') return goTo(OWN[0], OWN[1]);
  if (a === 'rival') return goTo(RIVAL[0], RIVAL[1]);
  if (a === 'attack') return sendAttack(wb(), pickIn(), $('#atk-champ')?.checked);
  if (a === 'support') return sendSupport(wb(), pickIn());
  if (a === 'scout') return sendScout(wb(), +$('#sc-n').value);
  if (a === 'recall') return recall(+t.dataset.i);
  if (a === 'cancel') return cancelOrder(+t.dataset.s, +t.dataset.o);
  if (a === 'cancelres') return cancelResearch();
  if (a === 'canceltr') return cancelTraining();
  if (a === 'dismiss') return dismiss(t.dataset.u, +$('#ds-' + t.dataset.u).value);
  if (a === 'goto') { const v = $('#goto').value.trim(); const m = v.match(/^\(?\s*(\d{1,2})\s*[|,; ]\s*(\d{1,2})\s*\)?$/); if (m) return goTo(+m[1], +m[2]); if (/^0x[0-9a-f]{4,}$/i.test(v)) { for (let r = 0; r <= 30; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const bb = bot(OWN[0] + dx, OWN[1] + dy); if (bb && bb.addr.startsWith(v.toLowerCase())) return goTo(bb.x, bb.y); } } const b = findPlayer(v); if (b) return goTo(b.x, b.y); return note(v ? `No village at "${v}". Use x|y like 48|71, or a player name.` : 'Type x|y or a player name.', 'bad'); }
  if (a === 'showatk') { location.hash = 'world'; return goTo(+t.dataset.x, +t.dataset.y); }
  if (a === 'gorank' || a === 'goclan') { const [x, y] = a === 'goclan' ? t.dataset.k.split(',').map(Number) : [+t.dataset.x, +t.dataset.y]; location.hash = 'world'; return goTo(x, y); }
  if (a === 'again' || a === 'strike') { const r = S.reports.find(x => x.id === +t.dataset.id); if (!r || !r.target) return; if (a === 'again') S.ui.prefill = r.sent; location.hash = 'world'; return goTo(r.target[0], r.target[1]); }
  if (a === 'qclaim') return claimQuest(t.dataset.q);
  if (a === 'qgo') return questGo(QUESTS.find(q => q.id === t.dataset.q));
  if (a === 'ovtoggle') { S.ui.ovOpen = !S.ui.ovOpen; dirty(); return; }
  if (a === 'traveltoggle') { S.ui.travelOpen = !S.ui.travelOpen; dirty(); return; }
  if (a === 'shop') return buyShop(t.dataset.k);
  if (a === 'banner') { if (!S.test.free && S.seed < 1000) return note('Needs 1,000 SEED.', 'bad'); if (!S.test.free) S.seed -= 1000; S.banner = t.dataset.c; note('New banner colour raised', 'ok'); dirty(); return; }
  if (a === 'rf') { S.ui.rf = t.dataset.f; dirty(); return; }
  if (a === 'rk') { S.ui.rk = t.dataset.k; dirty(); return; }
  if (a === 'rkw') { S.ui.rkw = !S.ui.rkw; dirty(); return; }
  if (a === 'zin' || a === 'zout') { const st = $('#vstage'); return zoomAt(a === 'zin' ? 1.25 : 0.8, st.clientWidth / 2, st.clientHeight / 2); }
  if (a === 'zfit') { const z = zoomLimits(); vscale = Math.abs(vscale - z.fit) < 0.01 ? (innerWidth <= 900 ? 0.5 : z.cover) : z.fit; S.ui.vz = vscale; clampPan(); applyPan(); return; }
  if (a === 'nb-close') { $('#nightbox').hidden = true; if ($('#nb-again') && !$('#nb-again').checked) { S.ui.replay = false; dirty(); } return; }
  if (a === 'tab-here') { const s = load(); if (s) S = s; stale = false; $('#tabbox').hidden = true; if (BC) BC.postMessage({ hello: TAB_ID }); save(); sceneDirty = true; dirty(); return; }
  if (a === 'set-sound') { S.ui.sound = S.ui.sound === false; if (S.ui.sound) sfx('ok'); dirty(); return; }
  if (a === 'set-night') { S.ui.replay = S.ui.replay === false; dirty(); return; }
  if (a === 'set-notify') { if (typeof Notification === 'undefined') return note('This browser has no notifications.', 'bad'); if (S.ui.notify && Notification.permission === 'granted') { S.ui.notify = false; dirty(); return; } Notification.requestPermission().then(p => { S.ui.notify = p === 'granted'; note(p === 'granted' ? 'Notifications on: you hear from us when this tab is in the background' : 'Notifications are blocked in your browser settings', p === 'granted' ? 'ok' : 'bad'); dirty(); }).catch(() => { }); return; }
  if (a === 'night-now') { nightShownAt = -1e9; const p = lastPasses(); sfx('night'); showNight(p, p / 10); return; }
  if (a === 'closetest') { $('#testpanel').hidden = true; return; }
  if (a === 'move') { moveFrom = S.sel.i; confirmDemo = null; note('Tap an empty plot to move it there'); sceneDirty = true; dirty(); return; }
  if (a === 'movecancel') { moveFrom = null; sceneDirty = true; dirty(); return; }
  if (a === 'demo') { confirmDemo = S.sel.i; dirty(); return; }
  if (a === 'demono') { confirmDemo = null; dirty(); return; }
  if (a === 'demoyes') { const i = S.sel.i, why = demoBlock(i); if (why) return note(why, 'bad'); const nm = B[S.plots[i].type].name; S.plots[i] = null; confirmDemo = null; const cap = storage(); S.res = S.res.map(x => Math.min(cap, x)); note(`${nm} demolished`); sceneDirty = true; dirty(); return; }
  if (a === 'amax') { const i = $('#atk-' + t.dataset.u); if (i) { i.value = S.units[t.dataset.u]; updatePrediction(); } return; }
  if (a === 'aall') { document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => i.value = S.units[i.dataset.u]); updatePrediction(); return; }
  if (a === 'anone') { document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => i.value = 0); updatePrediction(); return; }
  if (a === 'invite') return sendInvite(wb());
  if (a === 'invname') { const nm = $('#cl-inv').value; const b = findPlayer(nm); if (!b) return note(`No player called "${nm}" near your village.`, 'bad'); $('#cl-inv').value = ''; return sendInvite(b); }
  if (a === 'invnear') { const [x, y] = t.dataset.k.split(',').map(Number); return sendInvite(bot(x, y)); }
  if (a === 'found') { const nm = $('#cl-name').value.trim(), tag = $('#cl-tag').value.trim().toUpperCase(); if (nm.length < 3 || nm.length > 24) return note('Clan name: 3 to 24 characters.', 'bad'); if (!/^[A-Z0-9]{2,4}$/.test(tag)) return note('Clan tag: 2 to 4 letters or digits.', 'bad'); if ([NPC_CLAN, ...CLANS].some(c => c.tag === tag)) return note(`[${tag}] is taken by another clan.`, 'bad'); S.clan = { name: nm, tag, members: [], founded: S.t }; note(`Clan [${tag}] ${nm} founded`, 'ok'); sceneDirty = true; dirty(); return; }
  if (a === 'kick') { const k = t.dataset.k; S.clan.members = S.clan.members.filter(x => x !== k); S.abroad.filter(st => st.key === k).forEach(() => recall(S.abroad.findIndex(st => st.key === k))); note('Member removed'); dirty(); return; }
  if (a === 'disband') { while (S.abroad.length) recall(0); S.clan = null; S.invites = []; S.helpers = []; note('Clan disbanded'); sceneDirty = true; dirty(); return; }
  if (a === 'wb-connect') {
    if (!window.ethereum) { $('#wb-msg').textContent = 'No wallet extension found in this browser. Use a demo wallet to try the prototype.'; return; }
    $('#wb-msg').textContent = 'Waiting for your wallet…';
    window.ethereum.request({ method: 'eth_requestAccounts' }).then(acc => { if (!acc || !acc[0]) throw new Error('no account'); S.wallet = acc[0].toLowerCase(); $('#walletbox').hidden = true; note(`Wallet ${shortAddr(S.wallet)} connected`, 'ok'); route(); })
      .catch(e => { $('#wb-msg').textContent = `Not connected (${(e && e.message || 'refused').slice(0, 60)}).`; });
    return;
  }
  if (a === 'wb-demo') { S.wallet = addrOf(OWN[0], OWN[1]); $('#walletbox').hidden = true; note(`Demo wallet ${shortAddr(S.wallet)} connected`, 'ok'); route(); return; }
  if (a === 'wb-off') { S.wallet = null; $('#testpanel').hidden = true; note('Wallet disconnected'); route(); return; }
  if (a === 'net-test') { S.ui.net = 'testnet'; $('#netbox').hidden = true; if (view === 'home') { location.hash = 'village'; return; } route(); return; }
  if (a === 'nm-ok') { const v = $('#nm-in').value.trim(); if (!/^[A-Za-z0-9_]{3,16}$/.test(v)) { $('#nm-why').textContent = 'Use 3 to 16 letters, digits or _.'; return; } S.username = v; $('#namebox').hidden = true; scrollTo(0, 0); note(`Welcome, ${v}!`, 'ok'); dirty(); return; }
  if (a === 'nm-rand') { S.username = $('#nm-in').placeholder || randomName(); $('#namebox').hidden = true; scrollTo(0, 0); note(`Welcome, ${S.username}!`, 'ok'); dirty(); return; }
  if (a === 'rp-send') return submitReport(t.dataset.s);
  if (a === 'inbox') return loadInbox();
  if (a === 'min') { S.ui.min[t.dataset.p] = !S.ui.min[t.dataset.p]; dirty(); return; }
  if (a === 'tg-free') { S.test.free = !S.test.free; note(S.test.free ? 'Test: everything is free' : 'Test: normal costs'); dirty(); return; }
  if (a === 'tg-instant') { S.test.instant = !S.test.instant; note(S.test.instant ? 'Test: everything is instant' : 'Test: normal build and travel times'); dirty(); return; }
  if (a === 'sqn') { S.test.squeeks = +t.dataset.n; note(`Test: ${S.test.squeeks} Squeek${S.test.squeeks === 1 ? '' : 's'} in your wallet`); dirty(); return; }
  if (a === 'tg-prod') { S.test.prod = S.test.prod > 1 ? 1 : 1000; note(`Test: production ×${S.test.prod}`); dirty(); return; }
  if (a === 'speed') { S.speed = +t.dataset.s; dirty(); return; }
  if (a === 'cheat-res') { const cap = storage(); S.res = S.res.map(x => Math.min(cap, x + 10000)); note(`Resources topped up (Storehouse holds ${fmt(cap)} each)`); dirty(); return; }
  if (a === 'cheat-seed') { S.seed += 10000; dirty(); return; }
  if (a === 'shield') { S.shieldUntil = S.t; S.nextIncoming = S.t + 6; note('Beginner shield ended. Neighbours can attack you now.', 'bad'); dirty(); return; }
  if (a === 'reset') { S = newGame(); for (const k in BOT) delete BOT[k]; miniCache = null; pan.init = false; $('#life').innerHTML = ''; LIFE = []; save(); note('Demo restarted'); route(); return; }
}
function selectHit(hit) {
  if (moveFrom !== null) {
    const i = +hit.dataset.i, open = PLOT_OPEN_ORDER.slice(0, openPlots()).includes(i);
    if (hit.dataset.hit === 'plot' && !S.plots[i] && open) { const nm = B[S.plots[moveFrom].type].name; S.plots[i] = S.plots[moveFrom]; S.plots[moveFrom] = null; moveFrom = null; S.sel = { kind: 'plot', i }; note(`${nm} moved`, 'ok'); sceneDirty = true; dirty(); return; }
    moveFrom = null; note('Move cancelled'); sceneDirty = true; dirty();
  }
  confirmDemo = null;
  const k = hit.dataset.hit; S.sel = k === 'th' || k === 'walls' ? { kind: k } : { kind: k, i: +hit.dataset.i }; S.ui.min.vright = false; openSheet('#vright'); sceneDirty = true; dirty(); }
let DB = null, USER = null, myId = null, canAdmin = false;
async function initCaps() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    DB = db; USER = user;
    if (USER) { myId = await USER.id(); canAdmin = await USER.canEdit(); }
    dirty(); renderHomeReport();
  } catch (e) { }
}
async function submitReport(sfx_) {
  const st = $('#rp-st' + sfx_), type = $('#rp-type' + sfx_).value, who = $('#rp-who' + sfx_).value.trim(), text = $('#rp-text' + sfx_).value.trim();
  if (text.length < 5) { st.textContent = 'Please describe it in a few words.'; return; }
  const rec = { type, who: who.slice(0, 60), text: text.slice(0, 2000), player: S.username || '', wallet: S.wallet || '', squeeks: held().length, gameDay: day(S.t), view, at: new Date().toISOString(), v: 'prototype-4' };
  st.textContent = 'Sending…';
  if (DB && myId) {
    try {
      await DB.doc('reports/' + myId).set({ updatedAt: rec.at, player: rec.player });
      await DB.collection('reports/' + myId + '/items').add(rec);
      st.textContent = 'Sent. Thank you!'; $('#rp-text' + sfx_).value = ''; $('#rp-who' + sfx_).value = ''; return;
    } catch (e) { st.textContent = `Could not send (${e && e.code || 'error'}). Saved on this device instead.`; }
  } else st.textContent = 'Saved on this device. Reports are sent when you play on claude.ai while signed in.';
  S.localReports.push(rec); S.localReports = S.localReports.slice(-30); save(); $('#rp-text' + sfx_).value = '';
}
async function loadInbox() {
  if (!DB || !canAdmin) return;
  try {
    const users = await DB.collection('reports').get(); const all = [];
    for (const u of users.docs) { const items = await DB.collection('reports/' + u.id + '/items').orderBy('at', 'desc').limit(50).get(); for (const d of items.docs) all.push(d.data()); }
    INBOX = all.sort((p, q) => (q.at || '').localeCompare(p.at || '')); dirty();
  } catch (e) { note(`Could not load reports (${e && e.code || 'error'})`, 'bad'); }
}
function renderHomeReport() { const el = $('#reportForm'); if (el && !el.dataset.done) { el.innerHTML = reportForm('h'); el.dataset.done = '1'; } }
function openSheet(sel) { $(sel).classList.remove('closed'); }
function init() {
  S = load() || newGame();
  const away = (Date.now() - (S.lastReal || Date.now())) / 1000 * S.speed / 3600;
  if (away > 0.01) { catching = true; advance(S.t + Math.min(MAX_OFFLINE_H, away)); catching = false; }
  $('#unitCards').innerHTML = UK.map(k => `<div class="unit px"><img src="${spr(U[k].sprite)}" alt="${U[k].name}"><b>${U[k].name}</b><span>${U[k].a} attack · ${U[k].d} defense<br>speed ${U[k].s} · carry ${U[k].c}</span></div>`).join('');
  $('#connectBtn').addEventListener('click', () => { location.hash = 'village'; });
  $('#logoHome').addEventListener('click', () => { location.hash = 'home'; });
  document.addEventListener('click', onClick);
  document.addEventListener('input', e => { if (e.target.matches('#wright input')) updatePrediction(); if (e.target.matches('#mk-amt,#mk-to,#mk-from')) mkPreview(); });
  document.addEventListener('change', e => { if (e.target.matches('#atk-champ')) updatePrediction(); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'goto') { e.preventDefault(); $('[data-act="goto"]').click(); } });
  $('#nm-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-act="nm-ok"]').click(); } });
  $('#testbtn').addEventListener('click', () => { const p = $('#testpanel'); p.hidden = !p.hidden; if (!p.hidden) setHTML(p, testPanel()); });
  const vst = $('#vstage');
  stageDrag(vst, (dx, dy) => { pan.x += dx; pan.y += dy; clampPan(); applyPan(); }, e => {
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.dataset && el.dataset.hit); if (hit) selectHit(hit);
  }, (f, cx, cy) => zoomAt(f, cx, cy));
  vst.addEventListener('wheel', e => { e.preventDefault(); const r = vst.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const wst = $('#wstage'), tip = $('#wtip');
  stageDrag(wst, (dx, dy) => { tip.hidden = true; S.cam.x = Math.min(WORLD, Math.max(0, S.cam.x - dx / wcam.ts)); S.cam.y = Math.min(WORLD, Math.max(0, S.cam.y - dy / wcam.ts)); drawWorld(); drawMini(); }, e => {
    const r = $('#worldcv').getBoundingClientRect(); const x = Math.floor(S.cam.x + (e.clientX - r.left - cvW / 2) / wcam.ts), y = Math.floor(S.cam.y + (e.clientY - r.top - cvH / 2) / wcam.ts);
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return; S.wsel = [x, y]; S.ui.min.wright = false; openSheet('#wright'); dirty();
  });
  if (matchMedia('(hover: hover)').matches) {
    wst.addEventListener('pointermove', e => {
      if (e.buttons) return; const r = $('#worldcv').getBoundingClientRect(); const x = Math.floor(S.cam.x + (e.clientX - r.left - cvW / 2) / wcam.ts), y = Math.floor(S.cam.y + (e.clientY - r.top - cvH / 2) / wcam.ts);
      if (x < 0 || y < 0 || x >= WORLD || y >= WORLD || e.clientY - r.top < 22 || e.clientX - r.left < 30) { tip.hidden = true; return; }
      const k = x + ',' + y; if (tip._k !== k) { tip.innerHTML = tileTip(x, y); tip._k = k; } tip.hidden = false;
      tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 16) + 'px'; tip.style.top = Math.min(innerHeight - tip.offsetHeight - 8, e.clientY + 16) + 'px';
    });
    wst.addEventListener('pointerleave', () => { tip.hidden = true; });
  }
  document.addEventListener('click', e => { if (e.target.id === 'minimap') { const r = e.target.getBoundingClientRect(); S.cam.x = (e.clientX - r.left) / r.width * 100; S.cam.y = (e.clientY - r.top) / r.height * 100; drawWorld(); drawMini(); } });
  addEventListener('resize', () => { layout(); });
  addEventListener('hashchange', route);
  staleGuard();
  $('#vright').classList.add('closed');
  if (innerWidth <= 900) $('#wright').classList.add('closed');
  renderHomeReport(); initCaps();
  route(); requestAnimationFrame(tick);
}
init();
