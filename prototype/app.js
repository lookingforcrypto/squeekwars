'use strict';
/* Squeek Wars · browser prototype. Rules follow docs/GAME_DESIGN.md (draft v1). No wallet, no chain:
   the game state lives in this browser and game time runs faster than real time. */

// ------------------------------------------------------------------ data
const RES = ['wood', 'food', 'stone', 'iron'];
const RES_NAME = { wood: 'Wood', food: 'Food', stone: 'Stone', iron: 'Iron' };
const NIGHTS = [11182, 10891, 10587, 13297, 12561, 8505, 8984];      // Squeektoshi's real nights (settled passes)
const PASS_PER_BONUS = 4320;
const FIELD = { base: 8, g: 1.4, cg: 1.6, t1: 0.4, tg: 1.4, cost: [[30, 40, 50, 40], [50, 20, 50, 40], [50, 40, 20, 50], [60, 40, 50, 10]] };
const FIELD_RES = [0, 0, 1, 1, 2, 2, 3, 3];
const FIELD_NAME = ['Forest', 'Forest', 'Sunflower Farm', 'Sunflower Farm', 'Quarry', 'Quarry', 'Iron Mine', 'Iron Mine'];
const FIELD_SPRITE = ['site_forest', 'site_forest', 'site_sunflower_farm', 'site_sunflower_farm', 'site_quarry', 'site_quarry', 'site_iron_mine', 'site_iron_mine'];
const B = {
  townhall:   { name: 'Town Hall',  c: [200, 150, 200, 150], g: 1.75, t1: 0.75, gt: 1.5,  max: 10, seed: [667, 1.5], sprite: 'town_hall' },
  walls:      { name: 'Walls',      c: [150, 0, 250, 100],   g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'walls' },
  wheelhouse: { name: 'Wheelhouse', c: [120, 80, 100, 100],  g: 1.68, t1: 0.6,  gt: 1.45, max: 10, seed: [300, 1.5], sprite: 'wheelhouse', w: 92, multi: 1,
                role: 'Turns the hamster\'s runs into a production bonus' },
  storehouse: { name: 'Storehouse', c: [130, 80, 120, 70],   g: 1.28, t1: 0.45, gt: 1.2,  max: 20, sprite: 'storehouse', w: 110, multi: 99, role: 'More storage for every resource' },
  burrow:     { name: 'Burrow',     c: [100, 60, 80, 40],    g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'burrow', w: 104, multi: 99, role: 'Room and food for more troops' },
  barracks:   { name: 'Barracks',   c: [200, 100, 150, 150], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'barracks', w: 140, multi: 1, role: 'Trains units' },
  academy:    { name: 'Academy',    c: [220, 120, 180, 180], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'academy', w: 118, multi: 1, role: 'Researches units and buildings' },
  vault:      { name: 'Vault',      c: [80, 40, 80, 40],     g: 1.28, t1: 0.45, gt: 1.2,  max: 20, sprite: 'vault', w: 112, multi: 99, unlock: 'vault', role: 'Keeps resources safe from raids' },
  forge:      { name: 'Forge',      c: [180, 80, 140, 250],  g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'forge', w: 112, multi: 1, unlock: 'forge', role: '+2% attack and defense per level' },
  clanhall:   { name: 'Clan Hall',  c: [250, 150, 200, 100], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'clan_hall', w: 150, multi: 1, unlock: 'clanhall', role: 'Clans arrive in phase 2' },
  market:     { name: 'Market',     c: [250, 150, 200, 100], g: 1.62, t1: 0.6,  gt: 1.45, max: 10, sprite: 'market', w: 120, multi: 1, unlock: 'market', role: 'Exchange your own resources' },
};
const PLOT_TYPES = ['wheelhouse', 'storehouse', 'burrow', 'barracks', 'academy', 'vault', 'forge', 'clanhall', 'market'];
const RESEARCH = [
  { id: 'forager', tier: 1, name: 'Forager', d: 'Raider: weak, carries 120' },
  { id: 'vault', tier: 1, name: 'Vault', d: 'Building: protects resources' },
  { id: 'shieldbearer', tier: 2, name: 'Shieldbearer', d: 'Defender: 70 defense' },
  { id: 'berserker', tier: 2, name: 'Berserker', d: 'Attacker: 75 attack' },
  { id: 'forge', tier: 2, name: 'Forge', d: 'Building: +2% power per level' },
  { id: 'clanhall', tier: 2, name: 'Clan Hall', d: 'Building: clans (phase 2)' },
  { id: 'logistics', tier: 2, name: 'Logistics', d: '+20% carry' },
  { id: 'charger', tier: 3, name: 'Charger', d: 'Fast unit, speed 14' },
  { id: 'market', tier: 3, name: 'Market', d: 'Building: resource exchange' },
  { id: 'catapult', tier: 4, name: 'Catapult', d: 'Lowers enemy Walls' },
  { id: 'medicine', tier: 4, name: 'Field Medicine', d: '10% of fallen units return' },
  { id: 'logistics2', tier: 5, name: 'Logistics II', d: '+20% more carry' },
  { id: 'march', tier: 5, name: 'Forced March', d: '+20% army speed' },
];
const U = {
  spearman:     { name: 'Spearman',     a: 40, d: 35, s: 6,  c: 50,  u: 1, cost: [60, 30, 50, 40],    m: 15, r: null,           sprite: 'unit_spearman' },
  forager:      { name: 'Forager',      a: 20, d: 15, s: 8,  c: 120, u: 1, cost: [70, 40, 30, 20],    m: 12, r: 'forager',      sprite: 'unit_forager' },
  shieldbearer: { name: 'Shieldbearer', a: 15, d: 70, s: 5,  c: 20,  u: 1, cost: [80, 30, 60, 50],    m: 18, r: 'shieldbearer', sprite: 'unit_shieldbearer' },
  berserker:    { name: 'Berserker',    a: 75, d: 20, s: 6,  c: 40,  u: 1, cost: [70, 40, 40, 100],   m: 20, r: 'berserker',    sprite: 'unit_berserker' },
  charger:      { name: 'Charger',      a: 90, d: 50, s: 14, c: 80,  u: 2, cost: [150, 80, 90, 180],  m: 35, r: 'charger',      sprite: 'unit_charger' },
  catapult:     { name: 'Catapult',     a: 30, d: 10, s: 3,  c: 0,   u: 4, cost: [400, 100, 300, 150], m: 70, r: 'catapult',    sprite: 'unit_catapult' },
};
const UK = Object.keys(U);
// scene geometry (village_bg.webp is 1920×1200)
const PLOTS = [[810, 370], [1108, 370], [1290, 512], [1290, 686], [1108, 828], [810, 828], [628, 686], [628, 512], [960, 444], [1148, 600], [960, 756], [772, 600]];
const PLOT_OPEN_ORDER = [8, 11, 9, 10, 0, 1, 7, 2, 6, 3, 5, 4];   // inner ring first
const TH_POS = [960, 630];
const SITES = [[524, 180, 255, false], [192, 480, 238, true], [1404, 168, 217, false], [1728, 480, 217, true], [200, 874, 214, false], [572, 1176, 204, true], [1732, 858, 204, true], [1336, 1166, 198, false]];
const WALLS_POS = [640, 356];
const OWN = [46, 70];
const RIVAL = [48, 71];
const NAME_A = ['Iron', 'Amber', 'Grey', 'Silent', 'Swift', 'Golden', 'Dusk', 'Stone', 'Copper', 'Night', 'Ember', 'Frost', 'Oak', 'Ash', 'Rust', 'Bright', 'Hollow', 'Moss'];
const NAME_B = ['paw', 'whisker', 'burrow', 'tail', 'seed', 'runner', 'claw', 'fang', 'wheel', 'mill', 'ridge', 'grove', 'barrow', 'spark', 'cheek', 'thorn'];
const cap1 = s => s[0].toUpperCase() + s.slice(1);
function nameFrom(r1, r2, r3) { return NAME_A[Math.floor(r1 * NAME_A.length)] + cap1(NAME_B[Math.floor(r2 * NAME_B.length)]) + (r3 < 0.6 ? Math.floor(r3 * 150) + 2 : ''); }
const randomName = () => nameFrom(Math.random(), Math.random(), Math.random());
const NPC_CLAN = { tag: 'ASH', name: 'Ashen Paws' };
const SQUEEK_ID = 4821;
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
    v: 1, t: 8, speed: 60, res: [750, 750, 750, 750], seed: 1118, th: 1, walls: 1, fields: [1, 1, 1, 1, 1, 1, 1, 1],
    plots: Array(12).fill(null), slots: [[], []], research: { done: [], cur: null }, units: Object.fromEntries(UK.map(k => [k, 0])),
    training: null, champ: { xp: 0, pts: { might: 0, atk: 0, def: 0, carry: 0 }, inj: 0, home: true },
    moves: [], bots: {}, reports: [], log: [], nights: { 1: 11182 }, nextNight: 13297, shieldUntil: 8 + 7 * 24, nextIncoming: 8 + 7 * 24 + 20,
    seq: 1, sel: { kind: 'th' }, wsel: [...RIVAL], unread: 0, lastReal: Date.now(), cam: { x: OWN[0] + 0.5, y: OWN[1] + 0.5 },
    test: { free: true, instant: true, prod: 1 }, ui: { min: {} }, username: null, clan: null, invites: [], localReports: [],
  };
}
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 1) { if (!s.test) s.test = { free: true, instant: true, prod: 1 }; if (!s.ui) s.ui = { min: {} }; if (s.username === undefined) s.username = null; if (s.clan === undefined) s.clan = null; if (!s.invites) s.invites = []; if (!s.localReports) s.localReports = []; return s; } } } catch (e) { }
  return null;
}
function save() { try { S.lastReal = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }

// ------------------------------------------------------------------ economy
const day = t => Math.floor(t / 24) + 1;
const clock = t => { const h = ((t % 24) + 24) % 24; return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; };
const levelOf = type => S.plots.filter(p => p && p.type === type).reduce((m, p) => Math.max(m, p.lvl), 0);
const plotsOf = type => S.plots.filter(p => p && p.type === type);
const researched = id => S.research.done.includes(id);
const openPlots = () => Math.min(12, 3 + S.th);
const storage = () => 1000 + plotsOf('storehouse').reduce((a, p) => a + (p.lvl ? 1200 * 1.22 ** (p.lvl - 1) : 0), 0);
const protect = () => 150 + plotsOf('vault').reduce((a, p) => a + (p.lvl ? 250 * 1.22 ** (p.lvl - 1) : 0), 0);
const popCap = () => 30 + plotsOf('burrow').reduce((a, p) => a + (p.lvl ? 20 * p.lvl * 1.12 ** (p.lvl - 1) : 0), 0);
const awayUnits = () => { const a = Object.fromEntries(UK.map(k => [k, 0])); for (const m of S.moves) if (m.kind !== 'incoming') for (const k in m.units) a[k] += m.units[k]; return a; };
function upkeep() { const a = awayUnits(); return UK.reduce((s, k) => s + (S.units[k] + a[k]) * U[k].u, 0); }
const upkeepPlanned = () => upkeep() + (S.training ? S.training.n * U[S.training.unit].u : 0);
const fieldBase = L => FIELD.base * FIELD.g ** (L - 1);
const baseRate = r => S.fields.reduce((a, L, i) => a + (FIELD_RES[i] === r ? fieldBase(L) : 0), 0);
const nightKey = t => Math.floor((t - 4) / 24) + 1;
const lastPasses = () => S.nights[nightKey(S.t)] || S.nights[1];
const wheelCap = () => 0.25 * levelOf('wheelhouse');
const wheelBonus = () => Math.min(wheelCap(), lastPasses() / PASS_PER_BONUS);
const rate = r => baseRate(r) * (1 + wheelBonus()) * (S.test.prod || 1);
const forge = () => 0.02 * levelOf('forge');
const thSpeed = () => 1 - 0.03 * (S.th - 1);
function costOf(kind, ref, L) {           // resources to reach level L
  if (kind === 'field') { const c = FIELD.cost[FIELD_RES[ref]]; return { res: c.map(x => x * FIELD.cg ** (L - 1)), seed: 0, h: FIELD.t1 * FIELD.tg ** (L - 1) * thSpeed() }; }
  const b = B[ref];
  return { res: b.c.map(x => x * b.g ** (L - 1)), seed: b.seed ? b.seed[0] * b.seed[1] ** (L - 1) : 0, h: b.t1 * b.gt ** (L - 1) * thSpeed() };
}
const canPay = (res, seed = 0) => S.test.free || (res.every((x, i) => S.res[i] + 1e-6 >= x) && S.seed + 1e-6 >= seed);
function pay(res, seed = 0) { if (S.test.free) return; res.forEach((x, i) => S.res[i] -= x); S.seed -= seed; }
const hlevel = () => Math.min(30, 1 + Math.floor(Math.sqrt(Math.max(0, S.champ.xp) / 100)));
const hfree = () => 4 * hlevel() - Object.values(S.champ.pts).reduce((a, b) => a + b, 0);
const hmight = () => 100 + 100 * S.champ.pts.might;
const hatk = () => Math.min(0.2, 0.008 * S.champ.pts.atk);
const hdef = () => Math.min(0.2, 0.008 * S.champ.pts.def);
const hcarry = () => 0.02 * S.champ.pts.carry;
const champOk = () => S.champ.home && S.t >= S.champ.inj;
const carryBonus = () => (researched('logistics') ? 0.2 : 0) + (researched('logistics2') ? 0.2 : 0);
function defense() {
  const d = UK.reduce((s, k) => s + S.units[k] * U[k].d, 0) * (1 + forge()) + (champOk() ? hmight() : 0);
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
  if (x === RIVAL[0] && y === RIVAL[1]) b = { x, y, id: 777, name: 'Ironpaw', rival: true, lvl0: 5, active: true, npc: false, shield: 0, sp: 60, sb: 20, walls: 4 };
  else if (x >= 0 && y >= 0 && x < WORLD && y < WORLD && !(x === OWN[0] && y === OWN[1]) && hash(x, y, 1) < 0.42) {
    const h = k => hash(x, y, k);
    const active = h(3) > 0.3, lvl = 1 + Math.floor(h(2) * 7);
    b = { x, y, id: 1 + Math.floor(h(9) * 9971), lvl0: lvl, active, npc: h(8) < 0.06, name: nameFrom(h(21), h(22), h(23)), shield: h(7) < 0.08 ? 24 * (1 + Math.floor(h(10) * 6)) : 0,
      sp: Math.round(lvl * (active ? 10 : 3) * (0.5 + h(4))), sb: active && lvl >= 3 ? Math.round(lvl * 6 * h(5)) : 0, walls: active ? Math.max(1, lvl - 1 - Math.floor(h(6) * 2)) : 1 };
  }
  BOT[key] = b; return b;
}
function botLvl(b) { return Math.min(10, b.lvl0 + (b.active && !b.rival ? Math.floor(S.t / 24 / 20) : 0)); }
function botState(b) {
  const k = b.x + ',' + b.y;
  if (!S.bots[k]) { const L = botLvl(b); const r = 2 * fieldBase(L) * (b.active ? 2 : 1); S.bots[k] = { s0: Math.min(botCap(b), r * 48), t0: 8, loss: 0, lossAt: 0, raids: {} }; }
  return S.bots[k];
}
const botCap = b => 1000 + 1200 * 1.22 ** (botLvl(b) - 1) * (b.active ? 2 : 1);
const botProt = b => 150 + (b.active ? 250 * 1.22 ** (botLvl(b) - 1) : 0);
function botStock(b) { const st = botState(b); const r = 2 * fieldBase(botLvl(b)) * (b.active ? 2 : 1); return Math.min(botCap(b), st.s0 + r * (S.t - st.t0)); }
const botLootable = b => 4 * Math.max(0, botStock(b) - botProt(b));
function botTroops(b) {
  const st = botState(b); const keep = 1 - st.loss * Math.max(0, 1 - (S.t - st.lossAt) / (b.rival ? 4 : 20));
  const grow = b.active && !b.rival ? 1 + S.t / 24 / 30 : 1;
  return { spearman: Math.round(b.sp * keep * grow), shieldbearer: Math.round(b.sb * keep * grow) };
}
function botDefense(b) { const tr = botTroops(b); return (tr.spearman * 35 + tr.shieldbearer * 70) * (1 + 0.04 * b.walls) + 40 * botLvl(b); }
const botShielded = b => b.shield && S.t < b.shield + 8;
const myClan = b => !!(b && S.clan && S.clan.members.includes(b.x + ',' + b.y));
const clanHall = () => levelOf('clanhall');
const clanCap = () => 3 * clanHall();
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ------------------------------------------------------------------ simulation
function produce(h) {
  if (h <= 0) return;
  const cap = storage(), up = S.test.free ? 0 : upkeep();
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
  if (S.research.cur && S.research.cur.end <= S.t + eps) { const id = S.research.cur.id; S.research.done.push(id); S.research.cur = null; note(`Research done: ${RESEARCH.find(r => r.id === id).name}`, 'ok'); }
  if (S.training && S.training.end <= S.t + eps) { const tr = S.training; S.units[tr.unit] += tr.n; S.training = null; note(`${tr.n} ${U[tr.unit].name}${tr.n > 1 ? 's' : ''} trained`, 'ok'); }
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
  const yes = b.active && !b.npc && !b.rival && hash(x, y, 31) < 0.8;
  if (yes && S.clan.members.length + 1 < clanCap()) { S.clan.members.push(iv.key); note(`${b.name} joined [${S.clan.tag}]`, 'ok'); logEvt(`${b.name} (${x}|${y}) joined your clan`); }
  else note(`${b.name} declined your clan invite${b.npc ? ` (already in [${NPC_CLAN.tag}])` : b.rival ? ' (rivals never join)' : !b.active ? ' (inactive player)' : yes ? ' (your clan is full)' : ''}`, 'bad');
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
  for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 8; dy++) { const b = bot(OWN[0] + dx, OWN[1] + dy); if (b && b.active && !b.npc && !b.rival && !myClan(b)) out.push([dist(OWN, [b.x, b.y]), b]); }
  return out.sort((p, q) => p[0] - q[0]).slice(0, k).map(p => p[1]);
}
function nightRun(k) {
  const p = Math.round(S.nextNight); S.nights[k] = p;
  const r = rnd(k * 7919 + 13); S.nextNight = NIGHTS[Math.floor(r() * 7)] * (0.85 + r() * 0.3);
  const seed = p / 10; S.seed += seed; S.champ.xp += Math.min(150, p / 100);
  note(`Squeektoshi ran ${fmt(p)} laps tonight: +${fmt(seed)} SEED, wheel bonus up to +${pct(p / PASS_PER_BONUS)}`, 'ok');
  logEvt(`Night ${k}: ${fmt(p)} laps · +${fmt(seed)} SEED`);
}
function finishOrder(o) {
  if (o.kind === 'field') S.fields[o.ref] = o.to;
  else if (o.kind === 'th') S.th = o.to;
  else if (o.kind === 'walls') S.walls = o.to;
  else if (o.kind === 'plot') { const p = S.plots[o.ref]; p.lvl = o.to; p.building = false; }
  if (!S.test.instant) note(`${orderName(o)} reached level ${o.to}`, 'ok'); sceneDirty = true;
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
function upgradeCheck(kind, ref) {
  const L = curLevel(kind, ref), to = L + 1;
  const c = costOf(kind, kind === 'field' ? ref : bkey(kind, ref), to);
  let why = '';
  const max = kind === 'field' ? 10 : B[bkey(kind, ref)].max;
  if (L >= max) why = 'Maximum level reached.';
  else if (pending(kind, ref)) why = 'Already in the build queue.';
  else if (to > capOf(kind, ref)) why = `Needs Town Hall level ${kind !== 'plot' || !['storehouse', 'vault'].includes(S.plots[ref].type) ? to : Math.ceil(to / 2)}.`;
  else if (!S.test.instant && !slotFor()) why = 'Both build slots and their queues are full.';
  else if (!canPay(c.res, c.seed)) why = c.res.every((x, i) => S.res[i] + 1e-6 >= x) ? 'Not enough SEED yet: the hamster pays SEED every night.' : 'Not enough resources yet.';
  return { to, c, why };
}
function slotFor() { const s = [...S.slots].sort((a, b) => a.length - b.length)[0]; return s.length < 2 ? s : null; }
function placeOrder(kind, ref, to, c) {
  if (S.test.instant) { pay(c.res, c.seed); finishOrder({ kind, ref, to }); return; }
  const sl = slotFor(); if (!sl) return;
  const start = sl.length ? sl[sl.length - 1].end : S.t;
  pay(c.res, c.seed); sl.push({ id: S.seq++, kind, ref, to, start, end: start + c.h });
}
function doUpgrade(kind, ref) {
  const u = upgradeCheck(kind, ref); if (u.why) return note(u.why, 'bad');
  placeOrder(kind, ref, u.to, u.c); note(`${kind === 'field' ? FIELD_NAME[ref] : kind === 'th' ? 'Town Hall' : kind === 'walls' ? 'Walls' : B[S.plots[ref].type].name} → level ${u.to}${S.test.instant ? '' : ' ordered'}`, S.test.instant ? 'ok' : ''); sceneDirty = true; dirty();
}
function buildCheck(i, type) {
  const c = costOf('plot', type, 1); let why = '';
  if (B[type].unlock && !researched(B[type].unlock)) why = 'Research it in the Academy first.';
  else if (plotsOf(type).length >= B[type].multi) why = 'You already have one.';
  else if (!S.test.instant && !slotFor()) why = 'Both build slots and their queues are full.';
  else if (!canPay(c.res, c.seed)) why = c.res.every((x, i) => S.res[i] + 1e-6 >= x) ? 'Not enough SEED yet: the hamster pays SEED every night.' : 'Not enough resources yet.';
  return { c, why };
}
function doBuild(i, type) {
  const b = buildCheck(i, type); if (b.why) return note(b.why, 'bad');
  S.plots[i] = { type, lvl: 0, building: true }; placeOrder('plot', i, 1, b.c); S.sel = { kind: 'plot', i }; note(S.test.instant ? `${B[type].name} built` : `${B[type].name} ordered`, S.test.instant ? 'ok' : ''); sceneDirty = true; dirty();
}
function researchCost(t) { const tot = 600 * 2.2 ** (t - 1); return { res: [0.3, 0.2, 0.25, 0.25].map(f => tot * f), seed: 300 * 2 ** (t - 1), h: 2 * 1.8 ** (t - 1) * 0.95 ** (levelOf('academy') - 1) }; }
const tierOpen = () => Math.floor((levelOf('academy') + 1) / 2);
function doResearch(id) {
  const r = RESEARCH.find(x => x.id === id); const c = researchCost(r.tier);
  if (!levelOf('academy')) return note('Build an Academy first.', 'bad');
  if (S.research.cur) return note('The Academy is busy.', 'bad');
  if (r.tier > tierOpen()) return note(`Needs Academy level ${2 * r.tier - 1}.`, 'bad');
  if (!canPay(c.res, c.seed)) return note('Not enough resources yet.', 'bad');
  pay(c.res, c.seed);
  if (S.test.instant) { S.research.done.push(id); note(`Research done: ${r.name}`, 'ok'); dirty(); return; }
  S.research.cur = { id, end: S.t + c.h, start: S.t }; note(`Researching ${r.name}`); dirty();
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
  if (n < 1 || n > trainMax(k)) return note('Not enough resources or Burrow room for that many.', 'bad');
  pay(U[k].cost.map(c => c * n)); const h = n * U[k].m / 60 * 0.9 ** (levelOf('barracks') - 1);
  if (S.test.instant) { S.units[k] += n; note(`${n} ${U[k].name}${n > 1 ? 's' : ''} trained`, 'ok'); dirty(); return; }
  S.training = { unit: k, n, start: S.t, end: S.t + h }; note(`Training ${n} ${U[k].name}${n > 1 ? 's' : ''}`); dirty();
}
function doExchange(from, to, amt) {
  const L = levelOf('market'); if (!L) return note('Build a Market first.', 'bad');
  amt = Math.floor(amt); if (from === to || amt <= 0) return note('Choose two different resources and an amount.', 'bad');
  if (S.res[from] < amt) return note(`Not enough ${RES_NAME[RES[from]]}.`, 'bad');
  const get = amt * MARKET(L) / 100; const room = storage() - S.res[to];
  if (get > room) return note(`Your Storehouse has room for only ${fmt(room)} more ${RES_NAME[RES[to]]}.`, 'bad');
  S.res[from] -= amt; S.res[to] += get; note(`Exchanged ${fmt(amt)} ${RES_NAME[RES[from]]} for ${fmt(get)} ${RES_NAME[RES[to]]}`, 'ok'); dirty();
}
function doPoint(k) { if (hfree() <= 0) return; if ((k === 'atk' || k === 'def') && S.champ.pts[k] >= 25) return note('That bonus is already at its 20% cap.', 'bad'); S.champ.pts[k]++; dirty(); }
function sendAttack(b, units, champ) {
  if (!S.test.free && S.t < S.shieldUntil) return note('Your beginner shield is on: you cannot attack yet.', 'bad');
  if (botShielded(b)) return note('That village is under a beginner shield.', 'bad');
  if (myClan(b)) return note('That village is in your clan.', 'bad');
  const st = botState(b); if ((st.raids[day(S.t)] || 0) >= 3) return note('That village was raided 3 times today already.', 'bad');
  const sent = {}; let any = false;
  for (const k of UK) { const n = Math.min(S.units[k], Math.max(0, Math.floor(units[k] || 0))); if (n) { sent[k] = n; any = true; } }
  if (!any) return note('Choose some units to send.', 'bad');
  if (champ && !champOk()) champ = false;
  const d = S.test.instant ? 0 : dist(OWN, [b.x, b.y]); const spd = Math.min(...Object.keys(sent).map(k => U[k].s)) * (researched('march') ? 1.2 : 1);
  for (const k in sent) S.units[k] -= sent[k];
  if (champ) S.champ.home = false;
  S.moves.push({ id: S.seq++, kind: 'attack', to: [b.x, b.y], units: sent, champ, depart: S.t, arrive: S.t + d / spd, back: d / spd });
  note(S.test.instant ? `Army sent to (${b.x}|${b.y})` : `Army sent to (${b.x}|${b.y}), arrives in ${dur(d / spd)}`); dirty();
}
function arrive(m) {
  if (m.kind === 'attack') return resolveAttack(m);
  if (m.kind === 'return') {
    for (const k in m.units) S.units[k] += m.units[k];
    if (m.champ) S.champ.home = true;
    const cap = storage(); let got = 0;
    m.loot.forEach((x, i) => { const g = Math.min(x, cap - S.res[i]); S.res[i] += Math.max(0, g); got += Math.max(0, g); });
    note(`Army home${got ? ` with ${fmt(got)} loot` : ''}`, 'ok'); return;
  }
  if (m.kind === 'incoming') return resolveIncoming(m);
}
function resolveAttack(m) {
  const b = bot(m.to[0], m.to[1]); const st = botState(b);
  const A = attackPower(m.units, m.champ), D = botDefense(b);
  const fa = Math.min(1, 0.5 * D / A), fd = Math.min(1, 0.5 * A / D), win = A >= 2 * D;
  const back = researched('medicine') ? 0.1 : 0;
  const surv = {}, lost = {};
  for (const k in m.units) { const l = Math.round(m.units[k] * fa); lost[k] = l; surv[k] = m.units[k] - l + Math.floor(l * back); }
  const tr = botTroops(b); const killedCost = (tr.spearman * 180 + tr.shieldbearer * 220) * fd;
  const attRows = Object.keys(m.units).map(k => [U[k].name, m.units[k], lost[k], surv[k]]);
  if (m.champ) attRows.push(['Champion', 1, 0, fa > fd ? '1 (injured)' : 1]);
  const defRows = [['Spearman', tr.spearman], ['Shieldbearer', tr.shieldbearer]].filter(r => r[1] > 0).map(([n, c]) => { const l = Math.round(c * fd); return [n, c, l, c - l]; });
  if (!defRows.length) defRows.push(['No troops', 0, 0, 0]);
  st.loss = Math.min(1, fd); st.lossAt = S.t;
  if (m.champ) { S.champ.xp += killedCost / 20; if (fa > fd) S.champ.inj = S.t + 12; }
  let loot = [0, 0, 0, 0], catapult = '';
  if (win) {
    const stock = botStock(b), prot = botProt(b); let carry = carryOf(surv, m.champ); const per = Math.max(0, stock - prot);
    for (let i = 0; i < 4; i++) { const x = Math.min(per, carry / (4 - i)); loot[i] = x; carry -= x; }
    st.s0 = stock - loot.reduce((a, x) => a + x, 0) / 4; st.t0 = S.t; st.raids[day(S.t)] = (st.raids[day(S.t)] || 0) + 1;
    if ((surv.catapult || 0) >= 20) { const dn = Math.min(2, Math.floor(surv.catapult / 20)); b.walls = Math.max(0, b.walls - dn); catapult = ` Walls lowered by ${dn}.`; }
  }
  const tot = loot.reduce((a, x) => a + x, 0);
  report(win ? 'w' : 'l', `Attack on ${b.name} (${b.x}|${b.y})`,
    [`Your attack ${fmt(A)} vs defense ${fmt(D)}${win ? ' · at least 2×: defenders wiped' : A >= D ? ' · not 2×: no loot' : ''}.`,
     `You lost ${pct(fa)} of your army (${unitList(lost)}). They lost ${pct(fd)} of their defenders.${catapult}`,
     win ? `Loot: ${fmt(tot)} (${loot.map((x, i) => `${fmt(x)} ${RES_NAME[RES[i]]}`).join(', ')})` : 'No loot.'],
    [{ title: 'Your army', rows: attRows }, { title: `Defenders · ${b.name}`, rows: defRows }]);
  const anyLeft = Object.values(surv).some(x => x > 0);
  if (anyLeft || m.champ) S.moves.push({ id: S.seq++, kind: 'return', from: m.to, units: surv, champ: m.champ, loot, depart: S.t, arrive: S.t + m.back });
  note(win ? `Raid won at (${b.x}|${b.y}): ${fmt(tot)} loot on the way home` : `Attack on (${b.x}|${b.y}) failed to break the defense`, win ? 'ok' : 'bad');
}
function spawnIncoming() {
  S.nextIncoming = S.t + 24 + rnd(S.seq * 31)() * 24;
  const r = rnd(Math.floor(S.t * 100)); const cands = [];
  for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 8; dy++) { const b = bot(OWN[0] + dx, OWN[1] + dy); if (b && b.active && !myClan(b) && !botShielded(b)) cands.push(b); }
  if (!cands.length) return;
  const b = cands[Math.floor(r() * cands.length)]; const D = defense();
  const A = Math.max(300, D * (0.5 + r() * 2.1));
  const units = { berserker: Math.round(A * 0.7 / 75), spearman: Math.round(A * 0.3 / 40) };
  const d = dist(OWN, [b.x, b.y]);
  S.moves.push({ id: S.seq++, kind: 'incoming', from: [b.x, b.y], units, A, depart: S.t, arrive: S.t + d / 6 });
  note(`Incoming attack from (${b.x}|${b.y}) in ${dur(d / 6)}!`, 'bad');
}
function resolveIncoming(m) {
  const D = defense(), A = m.A; const fa = Math.min(1, 0.5 * D / A), fd = Math.min(1, 0.5 * A / D), win = A >= 2 * D;
  const back = researched('medicine') ? 0.1 : 0; const lost = {}; const before = { ...S.units };
  for (const k of UK) { const l = Math.round(S.units[k] * fd); lost[k] = l; S.units[k] -= l - Math.floor(l * back); }
  const atkB = bot(m.from[0], m.from[1]);
  const enemyRows = Object.entries(m.units).filter(([, n]) => n > 0).map(([k, n]) => { const l = Math.round(n * fa); return [U[k].name, n, l, n - l]; });
  const myRows = UK.filter(k => before[k] > 0).map(k => [U[k].name, before[k], lost[k], S.units[k]]);
  if (champOk()) myRows.push(['Champion', 1, 0, fd > fa ? '1 (injured)' : 1]);
  if (!myRows.length) myRows.push(['No troops at home', 0, 0, 0]);
  const killedCost = (m.units.berserker * 250 + m.units.spearman * 180) * fa;
  if (champOk()) { S.champ.xp += killedCost / 20; if (fd > fa) S.champ.inj = S.t + 12; }
  let loot = 0;
  if (win) {
    let carry = (m.units.berserker * 40 + m.units.spearman * 50) * (1 - fa); const prot = protect();
    for (let i = 0; i < 4; i++) { const x = Math.min(Math.max(0, S.res[i] - prot), carry / (4 - i)); S.res[i] -= x; carry -= x; loot += x; }
  }
  report(win ? 'l' : 'w', `Defense against ${atkB ? atkB.name : ''} (${m.from[0]}|${m.from[1]})`,
    [`Their attack ${fmt(A)} vs your defense ${fmt(D)}${win ? ' · they had 2×: your defenders fell' : ' · they did not have 2×'}.`,
     `You lost ${pct(fd)} of your defenders (${unitList(lost)}). They lost ${pct(fa)}.`,
     win ? `They took ${fmt(loot)} resources. The Vault kept ${fmt(protect())} of each safe.` : 'Nothing was taken.'],
    [{ title: `Attackers · ${atkB ? atkB.name : 'unknown'}`, rows: enemyRows }, { title: 'Your defenders', rows: myRows }]);
  note(win ? `Your village was raided: ${fmt(loot)} lost` : 'Your defense held!', win ? 'bad' : 'ok');
}
const unitList = u => { const s = Object.entries(u).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${U[k].name}`); return s.length ? s.join(', ') : 'none'; };
function report(res, title, lines, tables) { S.reports.unshift({ id: S.seq++, t: S.t, res, title, lines, tables: tables || [] }); S.reports = S.reports.slice(0, 40); S.unread++; }
function logEvt(s) { S.log.unshift({ t: S.t, s }); S.log = S.log.slice(0, 60); }

// ------------------------------------------------------------------ UI: toasts, routing
function note(msg, kind = '') {
  const el = document.createElement('div'); el.className = `toast ${kind}`; el.textContent = msg;
  const box = $('#toasts'); box.appendChild(el); while (box.children.length > 2) box.firstChild.remove();
  setTimeout(() => el.remove(), 2600);
}
let view = 'home', sceneDirty = true, needFull = true;
const dirty = () => { needFull = true; };
const VIEWS = ['home', 'village', 'world', 'army', 'academy', 'market', 'clan', 'champion', 'reports'];
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
  if (v !== 'home' && !S.username) { const nb = $('#namebox'); nb.hidden = false; const i = $('#nm-in'); i.placeholder = i.placeholder || randomName(); if (innerWidth > 900) setTimeout(() => i.focus(), 50); }
  sceneDirty = true; needFull = true; layout(); render(true);
}

// ------------------------------------------------------------------ UI: top bar
function renderBar() {
  const cap = storage();
  const items = RES.map((r, i) => {
    const net = rate(i) - (i === 1 && !S.test.free ? upkeep() : 0); const full = S.res[i] >= cap - 1;
    return `<div class="r ${full ? 'full' : ''}" title="${RES_NAME[r]}">${icon(r)} <b>${fmt(S.res[i])}</b><s> / ${fmt(cap)}</s><div class="bar"><i style="width:${Math.min(100, S.res[i] / cap * 100).toFixed(0)}%"></i></div><em class="${net < 0 ? 'neg' : net < 60 ? 'low' : ''}">${net >= 0 ? '+' : ''}${fmt(net)}/h${full ? ' · full' : ''}</em></div>`;
  }).join('');
  $('#resbar').innerHTML = items + `<div class="r seedr">${icon('seed')} <b>${fmt(S.seed)}</b><s> SEED</s><em>next run ${clockToNight()}</em></div>`;
  const h = ((S.t % 24) + 24) % 24, running = h < 4;
  const laps = running ? Math.round(S.nextNight * h / 4) : lastPasses();
  const sb = S.test.free || S.test.instant || S.test.prod > 1 ? ` · <b class="gold">TEST:</b> ${[S.test.free && 'free', S.test.instant && 'instant', S.test.prod > 1 && `output ×${S.test.prod}`].filter(Boolean).join(', ')}` : '';
  $('#wheelchip').innerHTML = `<span class="dot ${running ? 'run' : ''}"></span> ${running ? `Squeektoshi running · ${fmt(laps)} laps` : `Squeektoshi resting · ${fmt(lastPasses())} laps last night`} · Wheel bonus <b class="gold">+${pct(wheelBonus())}</b>${levelOf('wheelhouse') ? '' : ' (needs a Wheelhouse)'} · Day ${day(S.t)} ${clock(S.t)} · ×${S.speed}${sb}`;
  const lg = $('#logoHome small'); if (lg) lg.textContent = `${S.username || 'New player'} · Squeek #${SQUEEK_ID}`;
  const rt = $('#tabs a[data-v="reports"]'); rt.innerHTML = 'Reports' + (S.unread ? `<span class="badge">${S.unread}</span>` : '');
  const bh = $('#bar').getBoundingClientRect().height; document.documentElement.style.setProperty('--barh', bh + 'px');
}
function clockToNight() { const h = ((S.t % 24) + 24) % 24; const to = h < 4 ? 4 - h : 28 - h; return `in ${dur(to)}`; }

// ------------------------------------------------------------------ UI: village scene
let vscale = 0.5;
function layout() {
  if (view === 'village') {
    const st = $('#vstage'); const w = st.clientWidth, h = st.clientHeight; if (!w) return;
    const mobile = innerWidth <= 900;
    vscale = mobile ? Math.max(0.5, w / 1920) : Math.max(w / 1920, h / 1200);
    const sc = $('#scene'); sc.style.transform = `translate(${pan.x}px,${pan.y}px) scale(${vscale})`;
    if (!pan.init) { centerScene(); pan.init = true; }
  }
  if (view === 'world') sizeCanvas();
}
const pan = { x: 0, y: 0, init: false };
function centerScene() { const st = $('#vstage'); pan.x = (st.clientWidth - 1920 * vscale) / 2; pan.y = (st.clientHeight - 1200 * vscale) / 2 + (innerWidth <= 900 ? 0 : 20); clampPan(); applyPan(); }
function clampPan() { const st = $('#vstage'); const W = 1920 * vscale, H = 1200 * vscale; pan.x = Math.min(0, Math.max(st.clientWidth - W, pan.x)); pan.y = Math.min(Math.max(0, (st.clientHeight - H) / 2), Math.max(st.clientHeight - H, pan.y)); if (W < st.clientWidth) pan.x = (st.clientWidth - W) / 2; }
function applyPan() { $('#scene').style.transform = `translate(${pan.x}px,${pan.y}px) scale(${vscale})`; }
function stageDrag(stage, onMove, onTap) {
  let down = null, moved = false;
  stage.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; moved = false; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!moved && Math.hypot(dx, dy) > 6) { moved = true; stage.classList.add('drag'); } if (moved) { onMove(dx, dy); down = { x: e.clientX, y: e.clientY }; } });
  const up = e => { if (down && !moved) onTap(e); down = null; stage.classList.remove('drag'); };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', () => { down = null; stage.classList.remove('drag'); });
}
let moveFrom = null, confirmDemo = null;
function renderScene() {
  const sc = $('#scene'); let h = '';
  sc.style.backgroundImage = `url(assets/village_bg_w${Math.max(1, Math.ceil(S.walls / 2))}.webp)`;
  const items = [];
  SITES.forEach(([x, yb, w, flip], i) => items.push({ yb, html: `<img class="spr" src="${spr(FIELD_SPRITE[i])}" style="left:${x}px;top:${yb}px;width:${w}px;transform:translate(-50%,-100%)${flip ? ' scaleX(-1)' : ''}" alt="">` }));
  const thStage = Math.ceil(S.th / 2);
  items.push({ yb: TH_POS[1], html: `<img class="spr" src="${spr('town_hall_' + thStage)}" style="left:${TH_POS[0]}px;top:${TH_POS[1]}px;width:132px;transform:translate(-50%,-100%)" alt="">` });
  S.plots.forEach((p, i) => {
    if (!p) return; const [x, y] = PLOTS[i]; const b = B[p.type];
    const lv = Math.max(1, p.lvl); const stage = p.type === 'clanhall' ? '' : '_' + (b.max === 20 ? Math.ceil(lv / 4) : Math.ceil(lv / 2));
    items.push({ yb: y + 22, html: `<img class="spr ${p.lvl === 0 ? 'build' : ''}" src="${spr(b.sprite + stage)}" style="left:${x}px;top:${y + 22}px;width:${b.w}px;transform:translate(-50%,-100%)" alt="">` });
  });
  items.sort((a, b) => a.yb - b.yb); h += items.map(i => i.html).join('');
  // hit areas and plates
  const open = new Set(PLOT_OPEN_ORDER.slice(0, openPlots()));
  PLOTS.forEach(([x, y], i) => {
    const p = S.plots[i]; const sel = S.sel.kind === 'plot' && S.sel.i === i;
    if (!open.has(i) && !p) { h += `<button class="hit locked ${sel ? 'sel' : ''}" data-hit="plot" data-i="${i}" style="left:${x}px;top:${y}px;width:124px;height:78px" aria-label="Locked plot"></button><span class="plate" style="left:${x}px;top:${y - 14}px;font-size:20px">Town Hall ${PLOT_OPEN_ORDER.indexOf(i) - 2}</span>`; return; }
    h += `<button class="hit ${p ? '' : 'empty'} ${sel ? 'sel' : ''}" data-hit="plot" data-i="${i}" style="left:${x}px;top:${y - (p ? 40 : 0)}px;width:${p ? 140 : 124}px;height:${p ? 150 : 78}px" aria-label="${p ? B[p.type].name : 'Empty plot'}"></button>`;
    if (!p) h += `<span class="plusmark ${moveFrom !== null ? 'tgt' : ''}" style="left:${x}px;top:${y}px">${moveFrom !== null ? '↓' : '+'}</span>`;
    else h += plate(x, y + 26, p.lvl, pending('plot', i), p.lvl >= capMax('plot', i));
  });
  SITES.forEach(([x, yb, w], i) => {
    const sel = S.sel.kind === 'field' && S.sel.i === i;
    h += `<button class="hit ${sel ? 'sel' : ''}" data-hit="field" data-i="${i}" style="left:${x}px;top:${yb - 70}px;width:${w * 0.8}px;height:150px" aria-label="${FIELD_NAME[i]}"></button>` + plate(x, yb + 4, S.fields[i], pending('field', i), S.fields[i] >= 10);
  });
  h += `<button class="hit ${S.sel.kind === 'th' ? 'sel' : ''}" data-hit="th" style="left:${TH_POS[0]}px;top:${TH_POS[1] - 60}px;width:150px;height:170px" aria-label="Town Hall"></button>` + plate(TH_POS[0], TH_POS[1] + 4, S.th, pending('th'), S.th >= 10);
  h += `<button class="hit ${S.sel.kind === 'walls' ? 'sel' : ''}" data-hit="walls" style="left:${WALLS_POS[0]}px;top:${WALLS_POS[1]}px;width:90px;height:90px" aria-label="Walls"></button><span class="plate ${pending('walls') ? 'busy' : ''}" style="left:${WALLS_POS[0]}px;top:${WALLS_POS[1] + 30}px">Walls ${S.walls}</span>`;
  sc.innerHTML = h;
}
function capMax(kind, i) { const p = S.plots[i]; return p ? B[p.type].max : 10; }
const plate = (x, y, L, busy, max) => `<span class="plate ${busy ? 'busy' : ''} ${max ? 'max' : ''}" style="left:${x}px;top:${y}px">${L}${busy ? ' ▲' : ''}</span>`;

// ------------------------------------------------------------------ UI: village panels
function costHtml(c) {
  const sh = (have, need) => !S.test.free && have + 1e-6 < need ? 'short' : '';
  return `<div class="cost">${c.res.map((x, i) => `<span class="${sh(S.res[i], x)}">${icon(RES[i])} ${fmt(x)}</span>`).join('')}${c.seed ? `<span class="${sh(S.seed, c.seed)}">${icon('seed')} ${fmt(c.seed)} SEED</span>` : ''}<span>⏱ ${S.test.instant ? 'instant (test)' : dur(c.h)}</span></div>`;
}
function effects(kind, ref, L, to) {
  const rows = [];
  const t = kind === 'th' ? 'townhall' : kind === 'walls' ? 'walls' : kind === 'field' ? 'field' : S.plots[ref].type;
  const F = (label, fn) => rows.push([label, fn(L), to ? fn(to) : '–']);
  if (t === 'townhall') { F('Building plots', l => Math.min(12, 3 + l), x => x); F('Building level cap', l => l, x => x); F('Storehouse / Vault cap', l => Math.min(20, 2 * l), x => x); F('Construction speed', l => `-${3 * (l - 1)}%`, x => x); F('Village guard', l => fmt(40 * l), x => x); }
  if (t === 'walls') F('Defense bonus', l => `+${4 * l}%`, x => x);
  if (t === 'field') F(`${RES_NAME[RES[FIELD_RES[ref]]]} base / h`, l => fieldBase(l).toFixed(1), x => x);
  if (t === 'wheelhouse') F('Wheel bonus cap', l => `+${25 * l}%`, x => x);
  if (t === 'storehouse') F('Adds storage', l => l ? fmt(1200 * 1.22 ** (l - 1)) : 0, x => x);
  if (t === 'vault') F('Protects (each)', l => l ? fmt(250 * 1.22 ** (l - 1)) : 0, x => x);
  if (t === 'burrow') F('Upkeep room', l => l ? fmt(20 * l * 1.12 ** (l - 1)) : 0, x => x);
  if (t === 'barracks') F('Training time', l => l ? `×${(0.9 ** (l - 1)).toFixed(2)}` : '–', x => x);
  if (t === 'academy') F('Research tier', l => Math.floor((l + 1) / 2), x => x);
  if (t === 'forge') F('Unit power', l => `+${2 * l}%`, x => x);
  if (t === 'market') F('Exchange 100 →', l => l ? MARKET(l) : '–', x => x);
  if (t === 'clanhall') { F('Clan', l => l >= 3 ? 'found' : l ? 'join' : '–', x => x); F('Member cap', l => 3 * l, x => x); }
  return `<table class="kv">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="up">${r[2]}</td></tr>`).join('')}</table>`;
}
function looks(kind, ref, L, to) {
  let a, b;
  if (kind === 'field') return `<div class="thumbs"><img src="${spr(FIELD_SPRITE[ref])}" alt=""></div>`;
  const key = kind === 'th' ? 'townhall' : kind === 'walls' ? 'walls' : S.plots[ref].type; const bb = B[key];
  if (key === 'clanhall') return `<div class="thumbs"><img src="${spr('clan_hall')}" alt=""></div>`;
  const st = l => bb.max === 20 ? Math.ceil(Math.max(1, l) / 4) : Math.ceil(Math.max(1, l) / 2);
  a = st(L); b = to ? st(to) : a;
  return `<div class="thumbs"><img src="${spr(bb.sprite + '_' + a)}" alt="">${b !== a ? `<span class="arrow">▶</span><img src="${spr(bb.sprite + '_' + b)}" alt="">` : ''}</div>`;
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
      h += `<div class="opt"><img src="${spr(B[t].sprite + (t === 'clanhall' ? '' : '_1'))}" alt=""><div><div class="row"><span class="n">${B[t].name}</span><button class="btn sm" data-act="build" data-t="${t}" ${bc.why ? 'disabled' : ''}>Build</button></div><div class="d">${B[t].role}</div><div class="c">${c.res.map((x, i) => `<span class="${!S.test.free && S.res[i] < x ? 'bad' : ''}">${icon(RES[i])}${fmt(x)}</span>`).join(' ')}${c.seed ? ` <span class="${!S.test.free && S.seed < c.seed ? 'bad' : ''}">${icon('seed')}${fmt(c.seed)}</span>` : ''} · ${S.test.instant ? 'instant' : dur(c.h)}</div>${bc.why ? `<div class="why">${bc.why === 'Not enough resources yet.' ? (c.seed && S.seed < c.seed ? 'Not enough SEED yet.' : 'Not enough resources yet.') : bc.why}</div>` : ''}</div></div>`;
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
  let h = '<h3>Construction</h3><div class="list">';
  S.slots.forEach((sl, i) => {
    if (!sl.length) { h += `<div class="slot"><div class="t"><span class="muted">Slot ${i + 1} is free</span></div><div class="q">Tap a building or an empty plot</div></div>`; return; }
    const o = sl[0], p = Math.min(1, (S.t - o.start) / (o.end - o.start));
    h += `<div class="slot"><div class="t"><span>${orderName(o)} → ${o.to}</span><span>${dur(o.end - S.t)}</span></div><div class="prog"><i style="width:${(p * 100).toFixed(0)}%"></i></div><div class="q">${sl[1] ? `Next: ${orderName(sl[1])} → ${sl[1].to}` : 'Next: free (1 more order fits)'}</div></div>`;
  });
  return h + '</div>';
}
function movesHtml() {
  if (!S.moves.length) return `<p class="muted">${S.t < S.shieldUntil ? `Beginner shield: ${dur(S.shieldUntil - S.t)} left. No one can attack you, and you cannot attack yet.` : 'No armies on the move.'}</p>`;
  return S.moves.slice().sort((a, b) => a.arrive - b.arrive).map(m => {
    const tag = m.kind === 'incoming' ? `<span class="bad">⚔ Incoming from (${m.from[0]}|${m.from[1]})</span>` : m.kind === 'attack' ? `→ Attack on (${m.to[0]}|${m.to[1]})` : `↩ Returning from (${m.from[0]}|${m.from[1]})`;
    return `<div class="card">${tag}<div class="row"><span class="muted">${m.kind === 'incoming' ? `~${fmt(m.A)} attack` : unitList(m.units)}</span><b style="font-weight:400">${dur(m.arrive - S.t)}</b></div></div>`;
  }).join('');
}
function villageLeft() {
  let h = slotsHtml();
  const act = [];
  if (S.research.cur) { const r = S.research.cur; act.push(`Research: ${RESEARCH.find(x => x.id === r.id).name} · ${dur(r.end - S.t)}`); }
  if (S.training) act.push(`Training: ${S.training.n} ${U[S.training.unit].name} · ${dur(S.training.end - S.t)}`);
  if (act.length) h += `<h3 style="margin-top:12px">Busy</h3><div class="muted">${act.join('<br>')}</div>`;
  h += `<h3 style="margin-top:12px">Armies</h3><div class="list">${movesHtml()}</div>`;
  h += `<h3 style="margin-top:12px">Village</h3><div class="ov">`;
  const ov = [['th', null, 'Town Hall', S.th], ['walls', null, 'Walls', S.walls]];
  S.fields.forEach((L, i) => ov.push(['field', i, `${FIELD_NAME[i]} ${i % 2 + 1}`, L]));
  S.plots.forEach((p, i) => p && ov.push(['plot', i, B[p.type].name, p.lvl]));
  h += ov.map(([k, i, n, L]) => `<button data-sel="${k}" data-i="${i ?? ''}"><span>${n}</span><span>Lv ${L}${pending(k === 'plot' ? 'plot' : k, i) ? ' ▲' : ''}</span></button>`).join('');
  return h + '</div>';
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
  c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, cvW, 0);
  const forest = img('site_forest');
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) { const [sx, sy] = w2s(x, y); c.fillStyle = '#1a2a14'; c.fillRect(sx, sy, ts + 1, ts + 1); continue; }
    const [sx, sy] = w2s(x, y); const own = x === OWN[0] && y === OWN[1]; const b = own ? null : bot(x, y);
    if (!own && !b) { if (hash(x, y, 4) < 0.33 && forest.complete) drawImg(forest, sx + ts / 2, sy + ts * 0.92, ts * 0.95, hash(x, y, 5) < 0.5); continue; }
    const L = own ? S.th : botLvl(b); const st = Math.ceil(L / 2);
    c.fillStyle = '#9c7a4a'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.42, ts * 0.22, 0, 0, 7); c.fill();
    c.fillStyle = '#b8966a'; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.36, ts * 0.17, 0, 0, 7); c.fill();
    if (L >= 4) drawImg(img('burrow_' + st), sx + ts * 0.24, sy + ts * 0.8, ts * 0.32);
    drawImg(img('town_hall_' + st), sx + ts / 2, sy + ts * 0.78, ts * 0.5);
    if (L >= 7) drawImg(img('storehouse_' + st), sx + ts * 0.78, sy + ts * 0.82, ts * 0.3);
    if (b && botShielded(b)) { c.fillStyle = 'rgba(150,205,255,.22)'; c.strokeStyle = 'rgba(170,215,255,.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.5, ts * 0.46, ts * 0.42, 0, 0, 7); c.fill(); c.stroke(); }
    if (b && b.rival) { c.fillStyle = '#222'; c.fillRect(sx + ts * 0.82, sy + ts * 0.06, 3, ts * 0.42); c.fillStyle = '#ff5a4a'; c.fillRect(sx + ts * 0.82 + 3, sy + ts * 0.06, ts * 0.22, ts * 0.15); c.font = `${Math.round(ts * 0.22)}px VT323, monospace`; c.textAlign = 'center'; c.fillStyle = '#0b0806'; c.fillRect(sx + ts * 0.12, sy + 1, ts * 0.62, ts * 0.22); c.fillStyle = '#ff8a7a'; c.textBaseline = 'middle'; c.fillText('RIVAL', sx + ts * 0.43, sy + ts * 0.12); }
    if (b && (myClan(b) || b.npc)) { c.fillStyle = '#222'; c.fillRect(sx + ts * 0.8, sy + ts * 0.1, 3, ts * 0.38); c.fillStyle = myClan(b) ? '#6aa8ff' : '#a07ad8'; c.fillRect(sx + ts * 0.8 + 3, sy + ts * 0.1, ts * 0.2, ts * 0.13); }
    c.fillStyle = 'rgba(20,15,10,.92)'; c.strokeStyle = own ? '#f2c14e' : '#6b4a2b'; c.lineWidth = 2;
    const pw = ts * 0.3, ph = ts * 0.22; c.fillRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph); c.strokeRect(sx + ts / 2 - pw / 2, sy + ts - ph - 2, pw, ph);
    c.fillStyle = own ? '#f2c14e' : '#f3e6c8'; c.font = `${Math.round(ts * 0.24)}px VT323, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(L, sx + ts / 2, sy + ts - ph / 2 - 1);
    if (own) { c.strokeStyle = '#f2c14e'; c.lineWidth = 3; c.beginPath(); c.ellipse(sx + ts / 2, sy + ts * 0.66, ts * 0.47, ts * 0.26, 0, 0, 7); c.stroke(); }
  }
  for (const m of S.moves) {
    const a = m.kind === 'incoming' ? m.from : OWN, bpt = m.kind === 'attack' ? m.to : m.kind === 'return' ? m.from : OWN;
    const from = m.kind === 'return' ? m.from : a, to = m.kind === 'return' ? OWN : bpt;
    const [ax, ay] = w2s(from[0] + 0.5, from[1] + 0.6), [bx, by] = w2s(to[0] + 0.5, to[1] + 0.6);
    const col = m.kind === 'incoming' ? '#ff6a58' : m.kind === 'attack' ? '#f2c14e' : '#8fd16a';
    c.setLineDash([10, 7]); c.lineWidth = 6; c.strokeStyle = '#0b0806'; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
    c.lineWidth = 3; c.strokeStyle = col; c.stroke(); c.setLineDash([]);
    const f = Math.min(1, Math.max(0, (S.t - m.depart) / (m.arrive - m.depart))); const px = ax + (bx - ax) * f, py = ay + (by - ay) * f;
    c.fillStyle = col; c.strokeStyle = '#0b0806'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill(); c.stroke();
  }
  if (S.wsel) { const [sx, sy] = w2s(S.wsel[0], S.wsel[1]); c.strokeStyle = '#000'; c.lineWidth = 6; c.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4); c.strokeStyle = '#f2c14e'; c.lineWidth = 3; c.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4); }
  // coordinate ruler
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
  c.fillStyle = '#f2c14e'; c.fillRect(OWN[0] * k - 2, OWN[1] * k - 2, 5, 5);
}
function worldLeft() {
  return `<h3>World map</h3><canvas id="minimap" class="mm" width="180" height="180"></canvas>
  <div class="muted" style="font-size:17px">100 × 100 tiles, one per Squeek. Drag to move, tap a tile. Your village is at (${OWN[0]}|${OWN[1]}).</div>
  <div class="row" style="margin-top:8px;justify-content:flex-start;flex-wrap:wrap"><button class="btn sm" data-act="home">My village</button><button class="btn sm alt" data-act="rival">Rival (${RIVAL[0]}|${RIVAL[1]})</button></div>
  <h3 style="margin-top:12px">Armies</h3><div class="list">${movesHtml()}</div>
  <h3 style="margin-top:12px">Legend</h3><div class="muted" style="font-size:17px">Plate = Town Hall level · gold ring = you · blue flag = clan · bubble = beginner shield · empty tile = Squeek not settled yet · dashed lines: gold attack, green return, red incoming</div>`;
}
function worldRight() {
  const sel = S.wsel; let h = '<button class="btn ghost sm sheet-close" data-act="close">Close</button>';
  if (!sel) return h + `<h3>Pick a tile</h3><p class="muted">Tap a village to see its defense, its lootable stock and how long your army needs to get there.</p>`;
  const [x, y] = sel;
  if (x === OWN[0] && y === OWN[1]) return h + `<h3>Your village (${x}|${y})</h3><p class="muted">Squeek #${SQUEEK_ID} · Town Hall ${S.th} · Walls ${S.walls}<br>Defense now: ${fmt(defense())}</p><a class="btn sm" href="#village" style="text-decoration:none">Open village</a>`;
  const b = bot(x, y);
  if (!b) return h + `<h3>Empty tile (${x}|${y})</h3><p class="muted">Squeek #${1 + Math.floor(hash(x, y, 9) * 9971)} has not founded a village yet. Only its owner can settle here.</p>`;
  const L = botLvl(b), D = botDefense(b), tr = botTroops(b), d = dist(OWN, [x, y]);
  h += `<h3>${b.rival ? `${b.name} · Squeek #${b.id} · rival` : `Village of Squeek #${b.id}`}</h3><div class="thumbs" style="min-height:90px"><img src="${spr('town_hall_' + Math.ceil(L / 2))}" alt=""></div>
  <table class="kv"><tr><td>Player</td><td>${esc(b.name)}</td></tr><tr><td>Position</td><td>(${x}|${y}) · ${d.toFixed(1)} tiles</td></tr><tr><td>Town Hall</td><td>${L}</td></tr><tr><td>Clan</td><td>${myClan(b) ? `[${esc(S.clan.tag)}] yours` : b.npc ? `[${NPC_CLAN.tag}] ${NPC_CLAN.name}` : 'none'}</td></tr><tr><td>Status</td><td>${botShielded(b) ? 'beginner shield' : b.active ? 'active' : 'inactive'}</td></tr>
  <tr><td>Defenders at home</td><td>${tr.spearman} Spearmen${tr.shieldbearer ? `, ${tr.shieldbearer} Shieldbearers` : ''}</td></tr><tr><td>Walls</td><td>Lv ${b.walls} (+${4 * b.walls}%)</td></tr>
  <tr><td>Defense power</td><td>${fmt(D)}</td></tr><tr><td>Lootable now</td><td>~${fmt(botLootable(b))}</td></tr></table>`;
  const ready = UK.filter(k => S.units[k] > 0);
  if (S.clan && !myClan(b)) h += `<div class="row" style="margin:8px 0;justify-content:flex-start"><button class="btn sm alt" data-act="invite" ${S.invites.some(iv => iv.key === x + ',' + y) ? 'disabled' : ''}>${S.invites.some(iv => iv.key === x + ',' + y) ? 'Invite sent' : `Invite to [${esc(S.clan.tag)}]`}</button></div>`;
  if (myClan(b) || botShielded(b)) return h + `<p class="muted">${myClan(b) ? 'A member of your clan: you cannot attack them.' : 'Under a beginner shield: you cannot attack yet.'}</p>`;
  if (!ready.length) return h + `<p class="muted">You have no troops at home. Train units in the Army tab.</p>` + travelTable(d);
  h += `<h3 style="margin-top:10px">Choose troops to send</h3><div class="unitsel">${ready.map(k => `<img src="${spr(U[k].sprite)}" alt=""><span>${U[k].name} <button class="btn ghost sm" data-act="amax" data-u="${k}">all ${S.units[k]}</button></span><input type="number" min="0" max="${S.units[k]}" value="0" id="atk-${k}" data-u="${k}" inputmode="numeric">`).join('')}</div><div class="row" style="justify-content:flex-start;margin-top:6px"><button class="btn ghost sm" data-act="aall">Send everyone</button><button class="btn ghost sm" data-act="anone">Clear</button></div>
  <label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="atk-champ" ${champOk() ? 'checked' : 'disabled'}> Champion joins (Might ${fmt(hmight())})</label>
  <div class="pred" id="pred"></div><button class="btn" style="width:100%" data-act="attack" id="atk-go" disabled>Attack</button>`;
  return h + travelTable(d);
}
function travelTable(d) { return `<h3 style="margin-top:10px">Travel time</h3><table class="kv">${UK.map(k => `<tr><td>${U[k].name}</td><td>${U[k].s}/h</td><td>${dur(d / (U[k].s * (researched('march') ? 1.2 : 1)))}</td></tr>`).join('')}</table>`; }
function updatePrediction() {
  const box = $('#pred'); if (!box || !S.wsel) return; const b = bot(S.wsel[0], S.wsel[1]); if (!b) return;
  const units = {}; document.querySelectorAll('#wright input[data-u]').forEach(i => units[i.dataset.u] = Math.min(S.units[i.dataset.u], +i.value || 0));
  const champ = $('#atk-champ')?.checked && champOk(); const A = attackPower(units, champ), D = botDefense(b);
  const nSel = Object.values(units).reduce((s, n) => s + n, 0); const go = $('#atk-go'); if (go) go.disabled = nSel < 1;
  if (nSel < 1) { box.innerHTML = `Pick how many of each unit to send. Their defense is <b>${fmt(D)}</b>: you need <b>${fmt(2 * D)}</b> attack to win.`; return; }
  const fa = Math.min(1, 0.5 * D / Math.max(1, A)), fd = Math.min(1, 0.5 * A / D), win = A >= 2 * D;
  const surv = {}; for (const k in units) surv[k] = Math.round(units[k] * (1 - fa));
  const loot = win ? Math.min(botLootable(b), carryOf(surv, champ)) : 0;
  const spd = Object.keys(units).filter(k => units[k] > 0).map(k => U[k].s); const tt = spd.length ? dist(OWN, [b.x, b.y]) / (Math.min(...spd) * (researched('march') ? 1.2 : 1)) : 0;
  box.innerHTML = `Attack <b>${fmt(A)}</b> vs defense <b>${fmt(D)}</b> · need ${fmt(2 * D)} to win<br>You lose ~${pct(fa)} · they lose ${pct(fd)}<br>${win ? `<span class="ok">Win · loot ~${fmt(loot)}</span>` : `<span class="bad">No win: under 2× the defense</span>`} · ${S.test.instant ? 'arrives instantly' : `arrives in ${dur(tt)}`}`;
}

// ------------------------------------------------------------------ UI: pages
function armyPage() {
  const cap = popCap(), up = upkeep(), bl = levelOf('barracks');
  let h = `<h2>Army</h2><p class="sub">Troops eat Food every hour and need Burrow room. Defense at home now: <b class="gold">${fmt(defense())}</b> (Walls +${4 * S.walls}%, Forge +${Math.round(forge() * 100)}%).</p><div class="grid2">`;
  h += `<div class="px box"><h3>Your units</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Unit</th><th>Home</th><th>Away</th><th>Atk / Def</th><th>Speed</th><th>Carry</th></tr></thead><tbody>`;
  const away = awayUnits();
  h += UK.map(k => `<tr><td><img src="${spr(U[k].sprite)}" alt="" style="width:30px;vertical-align:middle"> ${U[k].name}${unitOpen(k) ? '' : ' <span class="muted">(locked)</span>'}</td><td class="r">${S.units[k]}</td><td class="r">${away[k]}</td><td class="r">${U[k].a} / ${U[k].d}</td><td class="r">${U[k].s}</td><td class="r">${U[k].c}</td></tr>`).join('');
  h += `</tbody></table></div><p class="muted">Upkeep ${fmt(up)} of ${fmt(cap)} Burrow room · Food ${fmt(rate(1))}/h produced, ${fmt(up)}/h eaten</p></div>`;
  h += `<div class="px box"><h3>Train at the Barracks</h3>`;
  if (!bl) h += `<p class="muted">Build Barracks on a plot in your village first.</p>`;
  else if (S.training) { const tr = S.training, p = (S.t - tr.start) / (tr.end - tr.start); h += `<div class="slot"><div class="t"><span>${tr.n} ${U[tr.unit].name}</span><span>${dur(tr.end - S.t)}</span></div><div class="prog"><i style="width:${(p * 100).toFixed(0)}%"></i></div></div><p class="muted">One batch at a time.</p>`; }
  else {
    h += `<div class="opts">` + UK.filter(unitOpen).map(k => { const mx = trainMax(k); return `<div class="opt"><img src="${spr(U[k].sprite)}" alt=""><div><div class="row"><span class="n">${U[k].name}</span><span class="muted">max ${mx}</span></div><div class="c">${U[k].cost.map((c, i) => `${icon(RES[i])}${c}`).join(' ')} · ${dur(U[k].m / 60 * 0.9 ** (bl - 1))} each</div><div class="row" style="justify-content:flex-start;margin-top:4px"><input type="number" id="tr-${k}" min="1" max="${mx}" value="${Math.min(mx, 10)}" style="width:80px;background:var(--well);border:2px solid var(--line);color:var(--ink);font:inherit;padding:1px 4px"><button class="btn sm" data-act="train" data-u="${k}" ${mx < 1 ? 'disabled' : ''}>Train</button></div></div></div>`; }).join('') + `</div>`;
    if (popCap() - upkeepPlanned() < 1) h += `<p class="bad">No room for more troops: build or upgrade Burrows.</p>`;
    const locked = UK.filter(k => !unitOpen(k)); if (locked.length) h += `<p class="muted">Locked until researched: ${locked.map(k => U[k].name).join(', ')}.</p>`;
  }
  h += `</div><div class="px box"><h3>On the move</h3><div class="list">${movesHtml()}</div><p class="muted">Pick a target on the World Map to attack.</p></div></div>`;
  return h;
}
function academyPage() {
  const ak = levelOf('academy'); const open = tierOpen();
  let h = `<h2>Academy</h2><p class="sub">${ak ? `Academy level ${ak}: tiers 1–${open} open. One research at a time; it costs resources and SEED.` : 'Build an Academy on a plot to start research.'}</p>`;
  if (S.research.cur) { const r = S.research.cur; h += `<div class="px box" style="margin-bottom:14px"><div class="slot"><div class="t"><span>Researching ${RESEARCH.find(x => x.id === r.id).name}</span><span>${dur(r.end - S.t)}</span></div><div class="prog"><i style="width:${((S.t - r.start) / (r.end - r.start) * 100).toFixed(0)}%"></i></div></div></div>`; }
  for (let t = 1; t <= 5; t++) {
    const c = researchCost(t);
    h += `<div class="tier"><h4>TIER ${t} · Academy level ${2 * t - 1} · ${c.res.map((x, i) => `${icon(RES[i])}${fmt(x)}`).join(' ')} ${icon('seed')}${fmt(c.seed)} · ${dur(c.h)}</h4><div class="rsrch">`;
    h += RESEARCH.filter(r => r.tier === t).map(r => {
      const done = researched(r.id), cur = S.research.cur && S.research.cur.id === r.id, lock = t > open || !ak;
      const can = !done && !cur && !lock && !S.research.cur && canPay(c.res, c.seed);
      return `<div class="rs ${done ? 'done' : cur ? 'cur' : lock ? 'lock' : ''}"><b>${r.name}</b><div class="muted" style="font-size:17px">${r.d}</div><div style="margin-top:6px">${done ? '<span class="ok">Done</span>' : cur ? '<span class="gold">In progress</span>' : lock ? `<span class="muted">Needs Academy ${2 * t - 1}</span>` : `<button class="btn sm" data-act="research" data-r="${r.id}" ${can ? '' : 'disabled'}>Research</button>`}</div></div>`;
    }).join('');
    h += `</div></div>`;
  }
  return h;
}
function marketPage() {
  const L = levelOf('market');
  let h = `<h2>Market</h2><p class="sub">No trading between players. The Market exchanges your own resources: give 100 of one, get ${L ? MARKET(L) : 25}–75 of another depending on its level.</p>`;
  if (!L) return h + `<div class="px box"><p class="muted">${researched('market') ? 'Build a Market on a plot first.' : 'Research the Market in the Academy (tier 3), then build it.'}</p></div>`;
  h += `<div class="px box"><h3>Exchange · Market level ${L} · 100 → ${MARKET(L)}</h3><div class="mkt">
    <label>Give<select id="mk-from">${RES.map((r, i) => `<option value="${i}">${RES_NAME[r]} (${fmt(S.res[i])})</option>`).join('')}</select></label>
    <label>Get<select id="mk-to">${RES.map((r, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${RES_NAME[r]}</option>`).join('')}</select></label>
    <label>Amount<input type="number" id="mk-amt" min="0" step="100" value="1000"></label>
    <button class="btn" data-act="exchange">Exchange</button></div><p class="muted" id="mk-out"></p></div>`;
  h += `<div class="px box" style="margin-top:14px"><h3>Rates by level</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Level</th>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => `<th>${l}</th>`).join('')}</tr></thead><tbody><tr><td>100 →</td>${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(l => `<td class="r ${l === L ? 'gold' : ''}">${MARKET(l)}</td>`).join('')}</tr></tbody></table></div></div>`;
  return h;
}
function champPage() {
  const L = hlevel(), next = 100 * L * L, prev = 100 * (L - 1) * (L - 1), free = hfree(), rank = L >= 30 ? 4 : L >= 20 ? 3 : L >= 10 ? 2 : 1;
  const st = S.champ.home ? (S.t < S.champ.inj ? `injured for ${dur(S.champ.inj - S.t)}` : 'at home, defending') : 'with an army';
  let h = `<h2>Champion · Squeek #${SQUEEK_ID}</h2><p class="sub">Your NFT leads your armies. It earns XP from battles and from Squeektoshi's runs, up to level 30.</p>
  <div class="px box champ"><img src="${spr('champion_' + rank)}" alt="Champion"><div><div class="disp" style="font-size:22px">Level ${L}</div><div class="muted">${fmt(S.champ.xp)} XP${L < 30 ? ` · next level at ${fmt(next)}` : ' · max level'}</div><div class="prog" style="max-width:360px"><i style="width:${L < 30 ? ((S.champ.xp - prev) / (next - prev) * 100).toFixed(0) : 100}%"></i></div><p class="muted">Status: ${st}</p>
  <h3 style="margin-top:10px">Points to spend: ${free}</h3><div class="pts">
  <span>Might · own power</span><b style="font-weight:400">${fmt(hmight())}</b><button class="btn sm" data-act="pt" data-k="might" ${free ? '' : 'disabled'}>+1</button>
  <span>Attack bonus (max 20%)</span><b style="font-weight:400">+${(hatk() * 100).toFixed(1)}%</b><button class="btn sm" data-act="pt" data-k="atk" ${free && S.champ.pts.atk < 25 ? '' : 'disabled'}>+1</button>
  <span>Defense bonus (max 20%)</span><b style="font-weight:400">+${(hdef() * 100).toFixed(1)}%</b><button class="btn sm" data-act="pt" data-k="def" ${free && S.champ.pts.def < 25 ? '' : 'disabled'}>+1</button>
  <span>Carry bonus</span><b style="font-weight:400">+${(hcarry() * 100).toFixed(0)}%</b><button class="btn sm" data-act="pt" data-k="carry" ${free ? '' : 'disabled'}>+1</button></div></div></div>`;
  return h;
}
function reportsPage() {
  let h = `<h2>Reports</h2><p class="sub">Battles and the hamster's nightly runs.</p>`;
  if (!S.reports.length) h += `<div class="px box"><p class="muted">No battles yet. After your beginner shield ends, neighbours may attack you, and you can raid villages that are less than half your attack power.</p></div>`;
  h += S.reports.map(r => `<div class="px report"><div class="h"><span>${esc(r.title)}</span><span class="${r.res}">${r.res === 'w' ? 'Victory' : 'Defeat'} · Day ${day(r.t)} ${clock(r.t)}</span></div>${r.lines.map(l => `<p>${esc(l)}</p>`).join('')}${(r.tables || []).map(tb => `<div class="tblwrap"><table class="tbl rtbl"><thead><tr><th>${esc(tb.title)}</th><th>Sent</th><th>Lost</th><th>Left</th></tr></thead><tbody>${tb.rows.map(row => `<tr><td>${esc(row[0])}</td><td class="r">${row[1]}</td><td class="r ${row[2] ? 'bad' : ''}">${row[2]}</td><td class="r">${row[3]}</td></tr>`).join('')}</tbody></table></div>`).join('')}</div>`).join('');
  h += `<div class="px box" style="margin-top:14px" id="report-box"><h3>Report a problem</h3><p class="muted">Found a bug, or a player breaking the rules? Tell us here.</p>${reportForm('g')}</div>` + inboxHtml();
  if (S.log.length) h += `<div class="px box" style="margin-top:14px"><h3>Hamster log</h3>${S.log.map(l => `<div class="muted">Day ${day(l.t)} · ${esc(l.s)}</div>`).join('')}</div>`;
  return h;
}
function clanPage() {
  const L = clanHall();
  let h = `<h2>Clan</h2><p class="sub">Clan members cannot attack each other and see each other on the map. Sending troops to defend a member comes in phase 2.</p>`;
  if (!L) return h + `<div class="px box"><p class="muted">${researched('clanhall') ? 'Build a Clan Hall on a plot in your village.' : 'Research the Clan Hall in the Academy (tier 2), then build it.'} Level 1 lets you join a clan, level 3 lets you found one.</p></div>`;
  if (!S.clan) {
    if (L < 3) return h + `<div class="px box"><p class="muted">Clan Hall level ${L}. Upgrade it to level 3 to found your own clan. Invites from other players would arrive here.</p></div>`;
    return h + `<div class="px box"><h3>Found a clan</h3><div class="mkt"><label>Clan name<input id="cl-name" maxlength="24" placeholder="The Night Wheel"></label><label>Tag<input id="cl-tag" maxlength="4" placeholder="NW"></label><button class="btn" data-act="found">Found clan</button></div><p class="muted">Up to ${clanCap()} members at Clan Hall level ${L} (3 per level).</p></div>`;
  }
  const members = [`<tr><td><b class="gold" style="font-weight:400">${esc(S.username || 'You')}</b> (founder)</td><td>(${OWN[0]}|${OWN[1]})</td><td class="r">${S.th}</td><td class="r">0.0</td><td></td></tr>`]
    .concat(S.clan.members.map(k => { const [x, y] = k.split(',').map(Number); const b = bot(x, y); return `<tr><td>${esc(b.name)}</td><td>(${x}|${y})</td><td class="r">${botLvl(b)}</td><td class="r">${dist(OWN, [x, y]).toFixed(1)}</td><td class="r"><button class="btn ghost sm" data-act="kick" data-k="${k}">Remove</button></td></tr>`; }));
  h += `<div class="grid2"><div class="px box"><h3>[${esc(S.clan.tag)}] ${esc(S.clan.name)} · ${S.clan.members.length + 1} / ${clanCap()}</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Player</th><th>Village</th><th>TH</th><th>Tiles</th><th></th></tr></thead><tbody>${members.join('')}</tbody></table></div>
  <p style="margin-top:12px"><button class="btn ghost sm" data-act="disband">Disband clan</button></p></div>`;
  h += `<div class="px box"><h3>Invite a player</h3><div class="mkt"><label>Player name<input id="cl-inv" maxlength="20" placeholder="e.g. ${esc((nearbyPlayers(1)[0] || {}).name || 'AmberPaw42')}"></label><button class="btn" data-act="invname">Send invite</button></div>
  <p class="muted">You can also open a village on the World Map and tap "Invite".</p><h3 style="margin-top:10px">Active players nearby</h3><div class="list">${nearbyPlayers(6).map(b => `<div class="row card"><span>${esc(b.name)} <span class="muted">(${b.x}|${b.y}) · TH ${botLvl(b)}</span></span><button class="btn sm alt" data-act="invnear" data-k="${b.x},${b.y}" ${S.invites.some(iv => iv.key === b.x + ',' + b.y) ? 'disabled' : ''}>Invite</button></div>`).join('')}</div>
  ${S.invites.length ? `<h3 style="margin-top:10px">Waiting for an answer</h3>${S.invites.map(iv => `<div class="muted">${esc(iv.name)} · answers in ${dur(iv.at - S.t)}</div>`).join('')}` : ''}</div></div>`;
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
  return `<div class="row"><h3 style="margin:0">Prototype test controls</h3><button class="btn ghost sm" data-act="closetest">Close</button></div>
  <div class="list" style="margin:8px 0">${tg('tg-free', S.test.free, 'Free: nothing costs resources')}${tg('tg-instant', S.test.instant, 'Instant: no build, research, training or travel time')}${tg('tg-prod', S.test.prod > 1, 'Production ×1000')}</div>
  <div class="muted" style="font-size:17px;margin-bottom:6px">Game speed (game time per real time)</div><div class="speeds">${[1, 60, 600, 1000, 3600].map(s => `<button class="btn sm ${S.speed === s ? 'on' : ''}" data-act="speed" data-s="${s}">×${s}</button>`).join('')}</div>
  <div class="list"><button class="btn sm alt" data-act="cheat-res">+10,000 each resource</button><button class="btn sm alt" data-act="cheat-seed">+10,000 SEED</button><button class="btn sm alt" data-act="shield" ${S.t < S.shieldUntil ? '' : 'disabled'}>End my beginner shield</button><button class="btn sm ghost" data-act="reset">Restart the demo</button></div><p class="muted" style="font-size:16px">Your demo village is saved in this browser.</p>`;
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
    if (sceneDirty) { renderScene(); sceneDirty = false; }
    if (full && !typing) { setHTML($('#vleft'), panel('vleft', villageLeft(), false)); setHTML($('#vright'), panel('vright', detailPanel(), true)); }
  }
  if (view === 'world') {
    drawWorld();
    if (full && !typing) { const wl = $('#wleft'); const before = wl._h; setHTML(wl, panel('wleft', worldLeft(), false)); drawMini(); const keep = {}; document.querySelectorAll('#wright input').forEach(i => keep[i.id] = i.type === 'checkbox' ? i.checked : i.value); setHTML($('#wright'), panel('wright', worldRight(), true)); for (const id in keep) { const el = document.getElementById(id); if (el) el.type === 'checkbox' ? el.checked = keep[id] : el.value = keep[id]; } updatePrediction(); }
  }
  if (full && !typing) {
    if (view === 'army') setHTML($('#army'), armyPage());
    if (view === 'academy') setHTML($('#academy'), academyPage());
    if (view === 'market') { setHTML($('#market'), marketPage()); mkPreview(); }
    if (view === 'champion') setHTML($('#champion'), champPage());
    if (view === 'clan') setHTML($('#clan'), clanPage());
    if (view === 'reports') { setHTML($('#reports'), reportsPage()); S.unread = 0; }
  }
  if (!$('#testpanel').hidden && full) setHTML($('#testpanel'), testPanel());
  if (full && !typing) { needFull = false; lastFull = now; }
}
function mkPreview() { const o = $('#mk-out'); if (!o) return; const L = levelOf('market'); const a = +$('#mk-amt').value || 0; o.textContent = `You get ${fmt(a * MARKET(L) / 100)} ${RES_NAME[RES[+$('#mk-to').value]]}.`; }
let lastTick = performance.now(), saveAt = 0;
function tick() {
  const now = performance.now(); const dt = Math.min(1, (now - lastTick) / 1000); lastTick = now;
  if (view !== 'home') { advance(S.t + dt * S.speed / 3600); render(false); }
  if (now - saveAt > 4000) { save(); saveAt = now; }
  requestAnimationFrame(tick);
}

// ------------------------------------------------------------------ events
function onClick(e) {
  const t = e.target.closest('[data-act],[data-sel],[data-hit]'); if (!t) return;
  if (t.dataset.hit) { if (e.detail === 0) selectHit(t); return; }
  if (t.dataset.sel) { S.sel = t.dataset.sel === 'th' || t.dataset.sel === 'walls' ? { kind: t.dataset.sel } : { kind: t.dataset.sel, i: +t.dataset.i }; openSheet('#vright'); sceneDirty = true; dirty(); return; }
  const a = t.dataset.act;
  if (a === 'close') { t.closest('.right').classList.add('closed'); return; }
  if (a === 'build') return doBuild(S.sel.i, t.dataset.t);
  if (a === 'upgrade') { const k = S.sel.kind; return doUpgrade(k === 'plot' ? 'plot' : k, k === 'th' || k === 'walls' ? null : S.sel.i); }
  if (a === 'research') return doResearch(t.dataset.r);
  if (a === 'train') return doTrain(t.dataset.u, +$('#tr-' + t.dataset.u).value);
  if (a === 'exchange') return doExchange(+$('#mk-from').value, +$('#mk-to').value, +$('#mk-amt').value);
  if (a === 'pt') return doPoint(t.dataset.k);
  if (a === 'home') { S.cam = { x: OWN[0] + 0.5, y: OWN[1] + 0.5 }; S.wsel = [...OWN]; openSheet('#wright'); dirty(); return; }
  if (a === 'attack') { const units = {}; document.querySelectorAll('#wright input[data-u]').forEach(i => units[i.dataset.u] = +i.value || 0); return sendAttack(bot(S.wsel[0], S.wsel[1]), units, $('#atk-champ')?.checked); }
  if (a === 'closetest') { $('#testpanel').hidden = true; return; }
  if (a === 'move') { moveFrom = S.sel.i; confirmDemo = null; note('Tap an empty plot to move it there'); sceneDirty = true; dirty(); return; }
  if (a === 'movecancel') { moveFrom = null; sceneDirty = true; dirty(); return; }
  if (a === 'demo') { confirmDemo = S.sel.i; dirty(); return; }
  if (a === 'demono') { confirmDemo = null; dirty(); return; }
  if (a === 'demoyes') { const i = S.sel.i, why = demoBlock(i); if (why) return note(why, 'bad'); const nm = B[S.plots[i].type].name; S.plots[i] = null; confirmDemo = null; const cap = storage(); S.res = S.res.map(x => Math.min(cap, x)); note(`${nm} demolished`); sceneDirty = true; dirty(); return; }
  if (a === 'amax') { const i = $('#atk-' + t.dataset.u); if (i) { i.value = S.units[t.dataset.u]; updatePrediction(); } return; }
  if (a === 'aall') { document.querySelectorAll('#wright input[data-u]').forEach(i => i.value = S.units[i.dataset.u]); updatePrediction(); return; }
  if (a === 'anone') { document.querySelectorAll('#wright input[data-u]').forEach(i => i.value = 0); updatePrediction(); return; }
  if (a === 'invite') return sendInvite(bot(S.wsel[0], S.wsel[1]));
  if (a === 'invname') { const nm = $('#cl-inv').value; const b = findPlayer(nm); if (!b) return note(`No player called "${nm}" near your village.`, 'bad'); $('#cl-inv').value = ''; return sendInvite(b); }
  if (a === 'invnear') { const [x, y] = t.dataset.k.split(',').map(Number); return sendInvite(bot(x, y)); }
  if (a === 'found') { const nm = $('#cl-name').value.trim(), tag = $('#cl-tag').value.trim().toUpperCase(); if (nm.length < 3 || nm.length > 24) return note('Clan name: 3 to 24 characters.', 'bad'); if (!/^[A-Z0-9]{2,4}$/.test(tag)) return note('Clan tag: 2 to 4 letters or digits.', 'bad'); S.clan = { name: nm, tag, members: [], founded: S.t }; note(`Clan [${tag}] ${nm} founded`, 'ok'); dirty(); return; }
  if (a === 'kick') { S.clan.members = S.clan.members.filter(k => k !== t.dataset.k); note('Member removed'); dirty(); return; }
  if (a === 'disband') { S.clan = null; S.invites = []; note('Clan disbanded'); dirty(); return; }
  if (a === 'nm-ok') { const v = $('#nm-in').value.trim(); if (!/^[A-Za-z0-9_]{3,16}$/.test(v)) { $('#nm-why').textContent = 'Use 3 to 16 letters, digits or _.'; return; } S.username = v; $('#namebox').hidden = true; scrollTo(0, 0); note(`Welcome, ${v}!`, 'ok'); dirty(); return; }
  if (a === 'nm-rand') { S.username = $('#nm-in').placeholder || randomName(); $('#namebox').hidden = true; scrollTo(0, 0); note(`Welcome, ${S.username}!`, 'ok'); dirty(); return; }
  if (a === 'rp-send') return submitReport(t.dataset.s);
  if (a === 'inbox') return loadInbox();
  if (a === 'min') { S.ui.min[t.dataset.p] = !S.ui.min[t.dataset.p]; dirty(); return; }
  if (a === 'tg-free') { S.test.free = !S.test.free; note(S.test.free ? 'Test: everything is free' : 'Test: normal costs'); dirty(); return; }
  if (a === 'tg-instant') { S.test.instant = !S.test.instant; note(S.test.instant ? 'Test: everything is instant' : 'Test: normal build and travel times'); dirty(); return; }
  if (a === 'tg-prod') { S.test.prod = S.test.prod > 1 ? 1 : 1000; note(`Test: production ×${S.test.prod}`); dirty(); return; }
  if (a === 'rival') { S.cam = { x: RIVAL[0] + 0.5, y: RIVAL[1] + 0.5 }; S.wsel = [...RIVAL]; S.ui.min.wright = false; openSheet('#wright'); dirty(); return; }
  if (a === 'speed') { S.speed = +t.dataset.s; dirty(); return; }
  if (a === 'cheat-res') { const cap = storage(); S.res = S.res.map(x => Math.min(cap, x + 10000)); note(`Resources topped up (Storehouse holds ${fmt(cap)} each)`); dirty(); return; }
  if (a === 'cheat-seed') { S.seed += 10000; dirty(); return; }
  if (a === 'shield') { S.shieldUntil = S.t; S.nextIncoming = S.t + 6; note('Beginner shield ended. Neighbours can attack you now.', 'bad'); dirty(); return; }
  if (a === 'reset') { S = newGame(); for (const k in BOT) delete BOT[k]; miniCache = null; pan.init = false; save(); note('Demo restarted'); route(); return; }
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
async function submitReport(sfx) {
  const st = $('#rp-st' + sfx), type = $('#rp-type' + sfx).value, who = $('#rp-who' + sfx).value.trim(), text = $('#rp-text' + sfx).value.trim();
  if (text.length < 5) { st.textContent = 'Please describe it in a few words.'; return; }
  const rec = { type, who: who.slice(0, 60), text: text.slice(0, 2000), player: S.username || '', squeek: SQUEEK_ID, gameDay: day(S.t), view, at: new Date().toISOString(), v: 'prototype-3' };
  st.textContent = 'Sending…';
  if (DB && myId) {
    try {
      await DB.doc('reports/' + myId).set({ updatedAt: rec.at, player: rec.player });
      await DB.collection('reports/' + myId + '/items').add(rec);
      st.textContent = 'Sent. Thank you!'; $('#rp-text' + sfx).value = ''; $('#rp-who' + sfx).value = ''; return;
    } catch (e) { st.textContent = `Could not send (${e && e.code || 'error'}). Saved on this device instead.`; }
  } else st.textContent = 'Saved on this device. Reports are sent when you play on claude.ai while signed in.';
  S.localReports.push(rec); S.localReports = S.localReports.slice(-30); save(); $('#rp-text' + sfx).value = '';
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
  if (away > 0.01) { advance(S.t + Math.min(MAX_OFFLINE_H, away)); }
  $('#unitCards').innerHTML = UK.map(k => `<div class="unit px"><img src="${spr(U[k].sprite)}" alt="${U[k].name}"><b>${U[k].name}</b><span>${U[k].a} attack · ${U[k].d} defense<br>speed ${U[k].s} · carry ${U[k].c}</span></div>`).join('');
  $('#connectBtn').addEventListener('click', () => { $('#walletNote').hidden = false; });
  $('#logoHome').addEventListener('click', () => { location.hash = 'home'; });
  document.addEventListener('click', onClick);
  document.addEventListener('input', e => { if (e.target.matches('#wright input')) updatePrediction(); if (e.target.matches('#mk-amt,#mk-to,#mk-from')) mkPreview(); });
  document.addEventListener('change', e => { if (e.target.matches('#atk-champ')) updatePrediction(); });
  $('#nm-in').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-act="nm-ok"]').click(); } });
  $('#testbtn').addEventListener('click', () => { const p = $('#testpanel'); p.hidden = !p.hidden; if (!p.hidden) p.innerHTML = testPanel(); });
  stageDrag($('#vstage'), (dx, dy) => { pan.x += dx; pan.y += dy; clampPan(); applyPan(); }, e => {
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.dataset && el.dataset.hit); if (hit) selectHit(hit);
  });
  stageDrag($('#wstage'), (dx, dy) => { S.cam.x = Math.min(WORLD, Math.max(0, S.cam.x - dx / wcam.ts)); S.cam.y = Math.min(WORLD, Math.max(0, S.cam.y - dy / wcam.ts)); drawWorld(); drawMini(); }, e => {
    const r = $('#worldcv').getBoundingClientRect(); const x = Math.floor(S.cam.x + (e.clientX - r.left - cvW / 2) / wcam.ts), y = Math.floor(S.cam.y + (e.clientY - r.top - cvH / 2) / wcam.ts);
    if (x < 0 || y < 0 || x >= WORLD || y >= WORLD) return; S.wsel = [x, y]; S.ui.min.wright = false; openSheet('#wright'); dirty();
  });
  document.addEventListener('click', e => { if (e.target.id === 'minimap') { const r = e.target.getBoundingClientRect(); S.cam.x = (e.clientX - r.left) / r.width * 100; S.cam.y = (e.clientY - r.top) / r.height * 100; drawWorld(); drawMini(); } });
  addEventListener('resize', () => { layout(); });
  addEventListener('hashchange', route);
  if (innerWidth <= 900) { $('#vright').classList.add('closed'); $('#wright').classList.add('closed'); }
  renderHomeReport(); initCaps();
  route(); requestAnimationFrame(tick);
}
init();
