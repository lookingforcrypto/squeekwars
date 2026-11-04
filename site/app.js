'use strict';
/* Squeek Wars · live site. Every number on screen comes from the contracts on Sepolia (chain.js reads them);
   this file draws them and sends the player's own transactions. Art and layout come from the prototype. */

// ------------------------------------------------------------------ tables (display only: the contracts hold the rules)
const UNIT = 1e6;
const RES = ['wood', 'food', 'stone', 'iron'];
const RES_NAME = { wood: 'Wood', food: 'Food', stone: 'Stone', iron: 'Iron' };
const FIELD_RES = [0, 0, 1, 1, 2, 2, 3, 3];
const FIELD_NAME = ['Forest', 'Forest', 'Sunflower Farm', 'Sunflower Farm', 'Quarry', 'Quarry', 'Iron Mine', 'Iron Mine'];
const FIELD_SPRITE = ['site_forest', 'site_forest', 'site_sunflower_farm', 'site_sunflower_farm', 'site_quarry', 'site_quarry', 'site_iron_mine', 'site_iron_mine'];
const KINDS = ['townhall', 'walls', 'wheelhouse', 'storehouse', 'vault', 'burrow', 'barracks', 'academy', 'forge', 'clanhall', 'market'];   // contract building index
const B = {
  townhall: { name: 'Town Hall', sprite: 'town_hall', max: 10, role: 'Raises every level cap and opens plots' },
  walls: { name: 'Walls', sprite: 'walls', max: 10, role: '+4% defense per level' },
  wheelhouse: { name: 'Wheelhouse', sprite: 'wheelhouse', w: 92, max: 10, role: "Turns the hamster's daily work into extra output" },
  storehouse: { name: 'Storehouse', sprite: 'storehouse', w: 110, max: 20, role: 'More storage for every resource' },
  vault: { name: 'Vault', sprite: 'vault', w: 112, max: 20, tier: 1, role: 'Keeps resources safe from raids' },
  burrow: { name: 'Burrow', sprite: 'burrow', w: 104, max: 10, role: 'Room for more troops' },
  barracks: { name: 'Barracks', sprite: 'barracks', w: 140, max: 10, role: 'Trains units, 10% faster per level' },
  academy: { name: 'Academy', sprite: 'academy', w: 118, max: 10, role: 'Opens the research tiers' },
  forge: { name: 'Forge', sprite: 'forge', w: 112, max: 10, tier: 2, role: '+2% attack and defense per level' },
  clanhall: { name: 'Clan Hall', sprite: 'clan_hall', w: 150, max: 10, tier: 2, role: 'Join a clan at 1, found one at 3' },
  market: { name: 'Market', sprite: 'market', w: 120, max: 10, role: 'Exchange your own resources' },
};
const PLOT_KINDS = ['wheelhouse', 'storehouse', 'burrow', 'barracks', 'academy', 'market', 'vault', 'forge', 'clanhall'];
// scene geometry (village_bg.webp is 1920×1200); every building type has its own spot
const PLOTS = [[810, 370], [1108, 370], [1290, 512], [1290, 686], [1108, 828], [810, 828], [628, 686], [628, 512], [960, 444], [1148, 600], [960, 756], [772, 600]];
const PLOT_OF = { wheelhouse: 8, storehouse: 11, burrow: 9, barracks: 10, academy: 0, market: 1, vault: 7, forge: 2, clanhall: 6 };
const PLATE_AT = { 8: [-92, -34] };
const TH_POS = [960, 630];
const SITES = [[524, 180, 255, false], [192, 480, 238, true], [1404, 168, 217, false], [1728, 480, 217, true], [200, 874, 214, false], [572, 1176, 204, true], [1732, 858, 204, true], [1336, 1166, 198, false]];
const WALLS_POS = [640, 356];
const U = [
  { key: 'spearman', name: 'Spearman', a: 40, d: 35, s: 6, c: 50, u: 1, cost: [50, 45, 45, 40], m: 15, tier: 0, sprite: 'unit_spearman' },
  { key: 'forager', name: 'Forager', a: 20, d: 15, s: 8, c: 120, u: 1, cost: [55, 55, 30, 20], m: 12, tier: 1, sprite: 'unit_forager' },
  { key: 'shieldbearer', name: 'Shieldbearer', a: 15, d: 70, s: 5, c: 20, u: 1, cost: [60, 45, 70, 45], m: 18, tier: 2, sprite: 'unit_shieldbearer' },
  { key: 'berserker', name: 'Berserker', a: 75, d: 20, s: 6, c: 40, u: 1, cost: [55, 55, 35, 100], m: 20, tier: 2, sprite: 'unit_berserker' },
  { key: 'charger', name: 'Charger', a: 90, d: 50, s: 14, c: 80, u: 2, cost: [120, 130, 90, 170], m: 35, tier: 3, sprite: 'unit_charger' },
  { key: 'catapult', name: 'Catapult', a: 30, d: 10, s: 3, c: 0, u: 4, cost: [320, 140, 300, 170], m: 70, tier: 4, sprite: 'unit_catapult' },
  { key: 'scout', name: 'Scout', a: 0, d: 5, s: 16, c: 0, u: 1, cost: [30, 40, 20, 40], m: 8, tier: 2, sprite: 'villager_young' },
];
const TIER_AT = [0, 1, 2, 4, 6, 8];
const TIERS = ['', 'Forager, Vault', 'Shieldbearer, Berserker, Scout, Forge, Clan Hall', 'Charger, Logistics (+20% carry)', 'Catapult, Field Medicine (10% of fallen units return)', 'Logistics II (+20% carry), Forced March (+20% speed)'];
const MODE = { 1: 'raid', 2: 'scout', 3: 'support', 4: 'return', 5: 'stationed', 6: 'done' };
const CAMP_SIZE = [0.6, 1, 1.5], CAMP_NAME = ['Small wild camp', 'Wild camp', 'Large wild camp'];
const NAME_A = ['Iron', 'Amber', 'Grey', 'Silent', 'Swift', 'Golden', 'Dusk', 'Stone', 'Copper', 'Night', 'Ember', 'Frost', 'Oak', 'Ash', 'Rust', 'Bright', 'Hollow', 'Moss'];
const NAME_B = ['paw', 'crest', 'burrow', 'tail', 'seed', 'runner', 'claw', 'fang', 'wheel', 'mill', 'ridge', 'grove', 'barrow', 'spark', 'hold', 'thorn'];

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
const campTile = id => (7919 * (id * 50 + 49) + 1237) % 10000;           // GameTypes.tile(campId * 50 + 49)
const CAMP_AT = new Map(Array.from({ length: 200 }, (_, id) => [campTile(id), id]));
function travelSecs(from, to, speed, tier) {        // Army.travelTime, then Forced March at tier 5
  const [ax, ay] = tileXY(from), [bx, by] = tileXY(to);
  const d = Math.max(1, Math.ceil(Math.hypot(ax - bx, ay - by) * UNIT) / UNIT);
  let s = Math.ceil(d * 3600 / speed); if (tier >= 5) s = Math.ceil(s * 100 / 120); return s;
}
function buildSecs(base, th, nft, work) {           // GameRules.buildDuration, exact integer math
  const Un = 1000000n, n = BigInt(Math.min(nft, 32)), wf = BigInt(Math.min(work, 11000)) * Un / 11000n;
  const red = 300000n * (Un - Un / (1n << n)) / Un * wf / Un;
  const num = BigInt(base) * BigInt(100 - 3 * (th - 1)) * (Un - red), den = 100n * Un;
  return Number(num === 0n ? 0n : (num - 1n) / den + 1n);
}
const squeekCut = (n, work) => n > 0 ? 0.3 * (1 - 0.5 ** Math.min(n, 32)) * Math.min(1, work / 11000) : 0;

// ------------------------------------------------------------------ state
const UI_KEY = 'sw-ui-v1';
const S = (() => { let u = {}; try { u = JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (e) { } return { me: null, view: 'home', sel: { kind: 'th' }, wsel: null, cam: { x: 50, y: 50 }, ui: Object.assign({ min: {}, rk: 'gen' }, u) }; })();
const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify(S.ui)); } catch (e) { } };
let skew = 0;                                   // chain time minus this device's clock
const now = () => Date.now() / 1000 + skew;
const G = { ok: false, day: 0, obsCount: 0, last: null, lastWork: 0, lastCum: 0, coreCum: 0, week: 0, season: 0 };
let ME = null;                                   // my village and everything around it; { none: true } before founding
const Q = { research: [], unit: [] };            // quotes from GameRules
const W = { players: new Map(), tiles: new Map(), clans: new Map(), invites: new Map(), moves: new Map(), battles: new Map(), scouts: [], ctx: new Map(), clanOf: new Map(), rank: null, target: new Map() };
let busyTx = false, needFull = true, sceneDirty = true;
const dirty = () => { needFull = true; };

// ------------------------------------------------------------------ loading from the chain
const g = () => SW.ADDR.villages;
async function loadGlobal() {
  const h = await SW.head(); skew = h.time - Date.now() / 1000;
  const [day, cnt, lw, lcum, core, wk, ss] = await SW.multi([['ledger', 'currentDay'], ['ledger', 'observationCount'], ['ledger', 'lastWork'], ['ledger', 'lastCumulativeWork'], ['core', 'state'], ['clans', 'week'], ['villages', 'seasonStartedAt']]);
  G.day = N(day); G.obsCount = N(cnt); G.lastWork = N(lw); G.lastCum = N(lcum); G.coreCum = core ? N(core.cumulativeWork) : G.lastCum; G.week = N(wk); G.season = N(ss);
  G.last = G.obsCount ? obsOf(await SW.call('ledger', 'observation', [G.obsCount - 1])) : null;
  if (!Q.research.length) {
    const r = await SW.multi([1, 2, 3, 4, 5].map(t => ['rules', 'researchQuote', [t]]));
    Q.research = r.map(x => x && { cost: [...x.cost].map(amt), seed: amt(x.seed), secs: N(x.seconds_), academy: N(x.academy) });
  }
  G.ok = true;
}
const obsOf = o => o && { time: N(o.timestamp), day: N(o.day), work: N(o.work), seedIndex: BigInt(o.seedIndex), xpIndex: N(o.xpIndex) };
async function loadMe() {
  const a = S.me; if (!a) { ME = null; return; }
  const r = await SW.multi([
    ['villages', 'village', [a]], ['villages', 'stock', [a]], ['villages', 'storageCapacity', [a]], ['villages', 'vaultProtection', [a]], ['villages', 'roomCapacity', [a]],
    ['villages', 'buildOrder', [a, 0]], ['villages', 'buildOrder', [a, 1]], ['villages', 'study', [a]], ['villages', 'seedBalance', [a]], ['villages', 'effectiveWalls', [a]],
    ['army', 'home', [g(), a]], ['army', 'training', [g(), a]], ['army', 'champion', [g(), a]], ['army', 'championStats', [g(), a]], ['army', 'championLevel', [g(), a]], ['army', 'allocatedRoom', [g(), a]],
    ['clans', 'clanOf', [g(), a]], ['ledger', 'account', [g(), a]], ['ledger', 'nftBalance', [a]], ['clans', 'counters', [g(), a, false, 0]], ['clans', 'overall', [g(), a, false, 0]],
  ]);
  const t0 = now();
  const [vr, st, cap, prot, room, o0, o1, sd, seed, ew, home, tr, ch, cs, cl, used, clanId, acct, nft, ctr, ov] = r;
  if (!vr || !vr.name) { ME = { none: true, nft: N(nft) }; return; }
  const v = {
    name: vr.name, tile: N(vr.tile), foundedAt: N(vr.foundedAt), shieldUntil: N(vr.shieldUntil), peaceUsedAt: N(vr.peaceUsedAt), boostUntil: N(vr.boostUntil),
    repairAt: N(vr.repairAt), boostRes: N(vr.boostResource), tier: N(vr.tier), damaged: N(vr.damagedWalls), banner: !!vr.banner,
    fields: [...vr.fields].map(N), b: [...vr.buildings].map(N),
  };
  const ord = o => o && N(o.readyAt) ? { target: N(o.target), level: N(o.level), readyAt: N(o.readyAt), cost: [...o.cost].map(amt), seed: amt(o.seed) } : null;
  const m = {
    v, t0, stock: [...st].map(amt), cap: amt(cap), protect: amt(prot), room: N(room), used: N(used), orders: [ord(o0), ord(o1)],
    study: sd && N(sd.readyAt) ? { tier: N(sd.tier), readyAt: N(sd.readyAt) } : null, seed: amt(seed), walls: N(ew),
    home: [...home].map(N), training: tr && N(tr.count) ? { kind: N(tr.kind), count: N(tr.count), readyAt: N(tr.readyAt) } : null,
    champ: { xp: N(ch.xp), might: N(ch.might), attack: N(ch.attack), defense: N(ch.defense), carry: N(ch.carry), away: !!ch.away },
    cstats: { might: N(cs.might), atk: amt(cs.attackBonus), def: amt(cs.defenseBonus), carry: amt(cs.carryBonus) }, clevel: N(cl),
    clanId: N(clanId), acct: { cursor: N(acct.cursor) }, nft: N(nft),
    counters: ctr && { build: N(ctr.build) / 100 / UNIT, research: N(ctr.research) / 100 / UNIT, attack: N(ctr.attack), defense: N(ctr.defense), loot: amt(ctr.loot) }, overall: N(ov),
  };
  // second round: next-level quotes, the claim, the clan and my movements
  const calls = [], tags = [];
  m.v.fields.forEach((L, i) => { if (L < 10) { calls.push(['rules', 'fieldQuote', [i, L + 1]]); tags.push(['f', i]); } });
  KINDS.forEach((k, i) => { const L = m.v.b[i]; if (L < B[k].max) { calls.push(['rules', 'buildingQuote', [i, L + 1]]); tags.push(['b', i]); } });
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
  W.players.clear(); W.tiles.clear(); W.clans.clear(); W.invites.clear(); W.moves.clear(); W.battles.clear(); W.scouts = [];
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
  }
}
async function loadWorld() {          // every village's context and clan, for the map and the ranking
  const ps = [...W.players.keys()]; if (!ps.length) return;
  const r = await SW.multi(ps.flatMap(p => [['villages', 'armyContext', [p]], ['clans', 'clanOf', [g(), p]]]));
  ps.forEach((p, i) => {
    const c = r[2 * i]; if (c) W.ctx.set(p, { tile: N(c.tile), th: N(c.townHall), walls: N(c.walls), forge: N(c.forge), tier: N(c.research), shieldUntil: N(c.shieldUntil) });
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
async function loadTarget(tile) {     // details for the map's right panel
  const addr = W.tiles.get(tile), key = tile;
  if (addr) {
    const r = await SW.multi([['villages', 'armyContext', [addr]], ['army', 'home', [g(), addr]], ['villages', 'stock', [addr]], ['villages', 'vaultProtection', [addr]], ['army', 'championStats', [g(), addr]], ['army', 'champion', [g(), addr]], ['clans', 'clanOf', [g(), addr]], ['villages', 'effectiveWalls', [addr]],
      ...(S.me ? [['army', 'scoutedUntil', [g(), S.me, addr]]] : [])]);
    const [c, home, st, prot, cs, ch, cl, ew, sc] = r;
    W.target.set(key, { at: Date.now(), addr, th: N(c && c.townHall), forge: N(c && c.forge), walls: N(ew), shieldUntil: N(c && c.shieldUntil), home: home ? [...home].map(N) : [0, 0, 0, 0, 0, 0, 0], stock: st ? [...st].map(amt) : [0, 0, 0, 0], protect: amt(prot), might: N(cs && cs.might), def: amt(cs && cs.defenseBonus), away: !!(ch && ch.away), clanId: N(cl), scouted: N(sc) });
  } else if (CAMP_AT.has(tile)) {
    const id = CAMP_AT.get(tile);
    const [cp, c, sc] = await SW.multi([['army', 'campParameters', [id]], ['army', 'camp', [g(), id]], ...(S.me ? [['army', 'scoutedUntil', [g(), S.me, '0x0000000000000000000000000000000000000000']]] : [])]);
    const full = N(cp && cp[0]), regrow = N(c && c.regrowAt);
    const cur = c && c.initialized && !(regrow && now() >= regrow) ? N(c.defense) : full;
    W.target.set(key, { at: Date.now(), camp: id, defense: cur, full, hourly: amt(cp && cp[1]), stock: c && c.initialized ? [...c.stock].map(amt) : null, regrowAt: regrow });
  }
  dirty();
}
let loading = false;
async function refresh(full) {
  if (loading) return; loading = true;
  try {
    const logs = await SW.syncLogs(); processLogs(logs);
    await loadGlobal();
    await loadMe();
    if (full || S.view === 'world' || S.view === 'ranking' || !W.ctx.size) await loadWorld();
    if (S.view === 'ranking' || full) await loadRanking();
    if (ME && !ME.none && !S.cam.set) { const [x, y] = tileXY(ME.v.tile); S.cam = { x: x + 0.5, y: y + 0.5, set: true }; }
    $('#liveNote').innerHTML = liveNote();
  } catch (e) { console.warn(e); note('Could not reach Sepolia: ' + SW.explain(e), 'bad'); }
  finally { loading = false; sceneDirty = true; dirty(); }
  maybeName();
}

// ------------------------------------------------------------------ derived numbers (mirror the contracts for live ticking)
const lv = k => ME && ME.v ? ME.v.b[KINDS.indexOf(k)] : 0;
const th = () => lv('townhall');
const fieldRate = L => 18 * 1.4 ** (L - 1);
const wheelBonus = () => Math.min(G.lastWork / 4320, 0.25 * lv('wheelhouse'));
function rates() {
  const out = [0, 0, 0, 0]; if (!ME || !ME.v) return out;
  ME.v.fields.forEach((L, i) => { if (L) out[FIELD_RES[i]] += fieldRate(L); });
  const wb = wheelBonus(), t = now();
  return out.map((x, r) => x * (1 + wb) * (r === ME.v.boostRes && t < ME.v.boostUntil ? 1.25 : 1));
}
const foodUse = () => ME && ME.v ? 0.5 * ME.used : 0;
function stockNow() {
  if (!ME || !ME.v) return [0, 0, 0, 0];
  const h = Math.max(0, now() - ME.t0) / 3600, rt = rates();
  return ME.stock.map((s, r) => clamp(s + (rt[r] - (r === 1 ? foodUse() : 0)) * h, 0, Math.max(s, ME.cap)));
}
const plotsUsed = () => ME.v.b.filter(L => L > 0).length + ME.orders.filter(o => o && o.target >= 8 && o.level === 1).length;
const plotsOpen = () => Math.min(12, 3 + th());
const tierOpen = () => { const a = lv('academy'); let n = 0; while (n < 5 && TIER_AT[n + 1] <= a) n++; return n; };
const targetName = t => t < 8 ? `${FIELD_NAME[t]} ${t % 2 + 1}` : B[KINDS[t - 8]].name;
const orderOn = t => ME.orders.findIndex(o => o && o.target === t);
const levelOfTarget = t => t < 8 ? ME.v.fields[t] : ME.v.b[t - 8];
const maxOfTarget = t => t < 8 ? 10 : B[KINDS[t - 8]].max;
function capOfTarget(t) {
  if (t < 8) return Math.min(10, th());
  const k = KINDS[t - 8]; if (k === 'townhall') return 10;
  return Math.min(B[k].max, (k === 'storehouse' || k === 'vault') ? 2 * th() : th());
}
const canPay = (cost, seed) => { const s = stockNow(); return cost.every((x, i) => s[i] + 1e-6 >= x) && ME.seed + 1e-6 >= (seed || 0); };
function shortMsg(cost, seed) {
  const s = stockNow(), rt = rates(); const parts = []; let wait = 0;
  cost.forEach((x, i) => { if (s[i] + 1e-6 < x) { parts.push(`${fmt(x - s[i])} ${RES_NAME[RES[i]]}`); const net = rt[i] - (i === 1 ? foodUse() : 0); wait = Math.max(wait, net > 0 ? (x - s[i]) / net * 3600 : Infinity); } });
  if (seed && ME.seed + 1e-6 < seed) parts.push(`${fmt(seed - ME.seed)} SEED`);
  if (!parts.length) return '';
  return `Needs ${parts.join(', ')} more${!seed || ME.seed >= seed ? (isFinite(wait) ? ` · ready in about ${dur(wait)}` : '') : ''}.`;
}
function upgradeCheck(t) {
  const L = levelOfTarget(t), to = L + 1, q = ME.next[t];
  if (L >= maxOfTarget(t) || !q) return { to, why: 'Maximum level reached.', max: true };
  const secs = buildSecs(q.base, Math.max(1, th()), ME.nft, G.lastWork);
  const c = { cost: q.cost, seed: q.seed, secs };
  if (orderOn(t) >= 0) return { to, c, why: 'Already being built.' };
  if (to > capOfTarget(t)) return { to, c, why: t < 8 ? 'Upgrade the Town Hall first: fields cannot pass its level.' : `Upgrade the Town Hall first: ${B[KINDS[t - 8]].name} cannot pass ${capOfTarget(t)} at Town Hall ${th()}.` };
  if (t >= 8) {
    const k = KINDS[t - 8];
    if (B[k].tier && ME.v.tier < B[k].tier) return { to, c, why: `Needs research tier ${B[k].tier} in the Academy.` };
    if (L === 0 && plotsUsed() >= plotsOpen()) return { to, c, why: 'No free plot: upgrade the Town Hall to open one.' };
  }
  if (ME.orders.every(Boolean)) return { to, c, why: 'Both build slots are busy.' };
  if (!canPay(c.cost, c.seed)) return { to, c, why: shortMsg(c.cost, c.seed) };
  return { to, c, why: '' };
}
function defenseOf(home, forge, might, defBonus, walls, thl) {
  const d = home.reduce((s, n, k) => s + n * U[k].d, 0) * (1 + 0.02 * forge) + might;
  return d * (1 + defBonus) * (1 + 0.04 * walls) + 40 * thl;
}
const myDefense = () => ME && ME.v ? defenseOf(ME.home, lv('forge'), ME.champ.away ? 0 : ME.cstats.might, ME.champ.away ? 0 : ME.cstats.def, ME.walls, th()) : 0;
function attackOf(units, champ, scouted) {
  const a = units.reduce((s, n, k) => s + n * U[k].a, 0) * (1 + 0.02 * lv('forge')) * (1 + (champ ? ME.cstats.atk : 0)) + (champ ? ME.cstats.might : 0);
  return a * (scouted ? 1.1 : 1);
}
const carryOf = (units, champ) => units.reduce((s, n, k) => s + n * U[k].c, 0) * (1 + (ME.v.tier >= 3 ? 0.2 : 0) + (ME.v.tier >= 5 ? 0.2 : 0) + (champ ? ME.cstats.carry : 0));
const awayUnits = () => { const a = [0, 0, 0, 0, 0, 0, 0]; if (ME && ME.moves) for (const m of ME.moves) if (m.owner === S.me) m.units.forEach((n, k) => a[k] += n); return a; };
const nameOf = addr => (W.players.get(addr) || {}).name || shortAddr(addr);
const clanName = id => (W.clans.get(id) || {}).name || (id ? `Clan #${id}` : '');
const clanColor = id => ['#c0392b', '#2f6fd6', '#2e9e5b', '#8e44ad', '#d68910', '#16a085'][id % 6];
const needCheckpoint = () => G.ok && (!G.last || G.last.day < G.day);
const nextDayIn = () => { const t = now(); return (Math.floor((t - 4 * 3600) / 86400) + 1) * 86400 + 4 * 3600 - t; };

// ------------------------------------------------------------------ transactions
function showTx(label, st, hash, err) {
  const box = $('#txbox'); box.hidden = false;
  const link = hash ? ` <a href="https://sepolia.etherscan.io/tx/${hash}" target="_blank" rel="noopener">view</a>` : '';
  const line = { check: 'Checking with the contract…', wallet: 'Confirm it in your wallet…', pending: `Sent. Waiting for a block…${link}`, confirmed: `Done.${link}`, error: esc(err || 'Failed.') }[st];
  box.innerHTML = `<div class="row"><b class="gold" style="font-weight:400">${esc(label)}</b><button class="btn ghost sm" data-act="txclose">✕</button></div><div class="st">${st === 'confirmed' ? '<span class="ok">✓</span>' : st === 'error' ? '<span class="bad">✕</span>' : '<span class="spin"></span>'}<span class="${st === 'error' ? 'bad' : ''}">${line}</span></div>`;
  clearTimeout(showTx.t); if (st === 'confirmed') showTx.t = setTimeout(() => { box.hidden = true; }, 5000);
}
async function act(label, c, fn, args) {
  if (!S.me) { openWallet(); return; }
  if (busyTx) return note('Wait for the last transaction to finish.', 'bad');
  busyTx = true;
  try { await SW.send(c, fn, args, (st, hash) => showTx(label, st, hash)); await refresh(); }
  catch (e) { showTx(label, 'error', null, e.message || String(e)); }
  finally { busyTx = false; dirty(); }
}

// ------------------------------------------------------------------ top bar
function renderBar() {
  const hasV = ME && ME.v;
  if (hasV) {
    const s = stockNow(), rt = rates(), cap = ME.cap;
    const items = RES.map((r, i) => {
      const net = rt[i] - (i === 1 ? foodUse() : 0), full = s[i] >= cap - 1, toFull = net > 0 && !full ? (cap - s[i]) / net * 3600 : Infinity, soon = toFull < 7200;
      return `<div class="r ${full ? 'full' : soon ? 'soon' : ''}" title="${RES_NAME[r]}${full ? ' is full' : ''}">${icon(r)} <b>${fmt(s[i])}</b><s> / ${fmt(cap)}</s><div class="bar"><i style="width:${Math.min(100, s[i] / cap * 100).toFixed(0)}%"></i></div><em class="${net < 0 ? 'neg' : ''}">${full ? 'FULL' : `${net >= 0 ? '+' : ''}${fmt(net)}/h`}</em></div>`;
    }).join('');
    setHTML($('#resbar'), items + `<div class="r seedr">${icon('seed')} <b>${fmt(ME.seed)}</b><s> SEED</s></div>`);
  } else setHTML($('#resbar'), `<div class="muted">${S.me ? (ME && ME.none ? 'No village yet: found one to play.' : 'Loading your village…') : 'Not connected: you are looking around.'}</div>`);
  // Squeektoshi panel
  let h = '';
  if (G.ok) {
    const today = Math.max(0, G.coreCum - G.lastCum), lw = G.lastWork;
    h += `<span class="dot run"></span> Squeektoshi · today so far <b class="gold">${fmt(today)}</b> work · last checkpoint ${G.last ? (G.last.work || G.obsCount > 1 ? `<b>${fmt(lw)}</b> work → <b>${fmt(lw / 10)}</b> SEED per village` : 'set the baseline') : 'none yet'} · wheel bonus <b class="gold">+${pct(hasV ? wheelBonus() : Math.min(lw / 4320, 2.5))}</b>${hasV && !lv('wheelhouse') ? ' (needs a Wheelhouse)' : ''}`;
    if (ME && ME.nft !== undefined && S.me) h += ` · Squeeks <b>${ME.nft}</b>${ME.nft ? ` (build −${pct(squeekCut(ME.nft, lw))})` : ''}`;
    h += ` · day ${G.day - Math.floor((G.season - 4 * 3600) / 86400)} · next checkpoint in ${dur(nextDayIn())}`;
    const btns = [];
    if (needCheckpoint()) btns.push(`<button class="btn sm go" data-act="checkpoint">Checkpoint today</button>`);
    if (hasV && ME.claim && ME.claim.seed > 0) btns.push(`<button class="btn sm go" data-act="claim">Claim ${fmt(ME.claim.seed)} SEED</button>`);
    if (btns.length) h += `<span class="daily">${btns.join('')}</span>`;
  } else h = 'Reading Sepolia…';
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
const stageOf = (k, L) => B[k].max === 20 ? Math.ceil(Math.max(1, L) / 4) : Math.ceil(Math.max(1, L) / 2);
const spriteOf = (k, L) => k === 'clanhall' ? 'clan_hall' : `${B[k].sprite}_${stageOf(k, L)}`;
function renderSceneBase() {
  const sc = $('#scene'); let h = ''; const z = y => `z-index:${Math.round(y)}`;
  const hasV = ME && ME.v;
  sc.style.backgroundImage = `url(assets/village_bg_w${hasV ? Math.max(1, Math.ceil(ME.walls / 2)) : 1}.webp)`;
  SITES.forEach(([x, yb, w, flip], i) => h += `<img class="spr" src="${spr(FIELD_SPRITE[i])}" style="left:${x}px;top:${yb}px;width:${w}px;transform:translate(-50%,-100%)${flip ? ' scaleX(-1)' : ''};${z(yb)}" alt="">`);
  const glows = [];
  if (hasV) {
    const ths = Math.ceil(Math.max(1, th()) / 2);
    h += `<img class="spr" src="${spr('town_hall_' + ths)}" style="left:${TH_POS[0]}px;top:${TH_POS[1]}px;width:132px;transform:translate(-50%,-100%);${z(TH_POS[1])}" alt="">`;
    if (orderOn(8) >= 0) h += `<img class="spr scaf" src="${spr('scaffold')}" style="left:${TH_POS[0]}px;top:${TH_POS[1] + 2}px;width:124px;transform:translate(-50%,-100%);${z(TH_POS[1] + 1)}" alt="">`;
    smoke('town_hall_' + ths, TH_POS[0], TH_POS[1], 132, a => h += a); glows.push([TH_POS[0], TH_POS[1] - 50, 1.3]);
    for (const k of PLOT_KINDS) {
      const i = KINDS.indexOf(k), L = ME.v.b[i], o = orderOn(8 + i); if (!L && o < 0) continue;
      const [x, y] = PLOTS[PLOT_OF[k]], b = B[k], sname = spriteOf(k, L);
      h += `<img class="spr ${L === 0 ? 'build' : ''}" src="${spr(sname)}" style="left:${x}px;top:${y + 22}px;width:${b.w}px;transform:translate(-50%,-100%);${z(y + 22)}" alt="">`;
      if (o >= 0) h += `<img class="spr scaf" src="${spr('scaffold')}" style="left:${x}px;top:${y + 24}px;width:${Math.round(b.w * 0.92)}px;transform:translate(-50%,-100%);${z(y + 23)}" alt="">`;
      if (k === 'clanhall' && L >= 3 && ME.clanId) for (let n = 0; n < (L >= 5 ? 2 : 1); n++) h += `<span class="banner ${L >= 7 ? 'gold' : ''}" style="left:${x + (n ? 82 : -82)}px;top:${y + 26}px;--c:${clanColor(ME.clanId)};${z(y + 26)}"></span>`;
      if (k === 'wheelhouse' && L) wheelSpin(sname, x, y + 22, b.w, a => h += a);
      if (L) { smoke(sname, x, y + 22, b.w, a => h += a); glows.push([x, y - 20, 1]); }
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
  if (!ME || !ME.v) return '';
  let h = ''; const sel = S.sel, free = plotsUsed() < plotsOpen();
  for (const k of PLOT_KINDS) {
    const i = KINDS.indexOf(k), L = ME.v.b[i], o = orderOn(8 + i), [x, y] = PLOTS[PLOT_OF[k]], on = sel.kind === 'b' && sel.k === k;
    if (L || o >= 0) {
      h += `<button class="hit ${on ? 'sel' : ''}" data-hit="b" data-k="${k}" style="left:${x}px;top:${y - 40}px;width:140px;height:150px" aria-label="${B[k].name}"></button>`;
      const [px, py] = PLATE_AT[PLOT_OF[k]] ? [x + PLATE_AT[PLOT_OF[k]][0], y + PLATE_AT[PLOT_OF[k]][1]] : [x, y + 26];
      h += plate(px, py, L || 'new', 8 + i);
    } else {
      const ok = !B[k].tier || ME.v.tier >= B[k].tier;
      h += `<button class="hit empty ${on ? 'sel' : ''}" data-hit="b" data-k="${k}" style="left:${x}px;top:${y}px;width:124px;height:78px" aria-label="Build ${B[k].name}"></button><span class="plusmark ${ok && free ? '' : 'lock'}" style="left:${x}px;top:${y}px">+</span><span class="plate lockp" style="left:${x}px;top:${y - 22}px">${B[k].name}</span>`;
    }
  }
  SITES.forEach(([x, yb, w], i) => { h += `<button class="hit ${sel.kind === 'field' && sel.i === i ? 'sel' : ''}" data-hit="field" data-i="${i}" style="left:${x}px;top:${yb - 70}px;width:${w * 0.8}px;height:150px" aria-label="${FIELD_NAME[i]}"></button>` + plate(x, yb + 4, ME.v.fields[i], i); });
  h += `<button class="hit ${sel.kind === 'th' ? 'sel' : ''}" data-hit="th" style="left:${TH_POS[0]}px;top:${TH_POS[1] - 60}px;width:150px;height:170px" aria-label="Town Hall"></button>` + plate(TH_POS[0], TH_POS[1] + 4, th(), 8);
  h += `<button class="hit ${sel.kind === 'walls' ? 'sel' : ''}" data-hit="walls" style="left:${WALLS_POS[0]}px;top:${WALLS_POS[1]}px;width:90px;height:90px" aria-label="Walls"></button>` + plate(WALLS_POS[0], WALLS_POS[1] + 30, `Walls ${lv('walls')}${ME.walls < lv('walls') ? ` (${ME.walls} now)` : ''}`, 9);
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
  if (t < 8) F(`${RES_NAME[RES[FIELD_RES[t]]]} per hour (base)`, l => l ? fieldRate(l).toFixed(1) : 0);
  else {
    const k = KINDS[t - 8];
    if (k === 'townhall') { F('Building plots', l => Math.min(12, 3 + l)); F('Level cap', l => l); F('Storehouse / Vault cap', l => Math.min(20, 2 * l)); F('Build time', l => `−${3 * (l - 1)}%`); F('Village guard', l => fmt(40 * l)); }
    if (k === 'walls') F('Defense bonus', l => `+${4 * l}%`);
    if (k === 'wheelhouse') F('Wheel bonus cap', l => `+${25 * l}%`);
    if (k === 'storehouse') F('Storage each', l => fmt(1500 + Array.from({ length: l }, (_, j) => 1800 * 1.22 ** j).reduce((a, x) => a + x, 0)));
    if (k === 'vault') F('Protected each', l => fmt(300 + Array.from({ length: l }, (_, j) => 500 * 1.22 ** j).reduce((a, x) => a + x, 0)));
    if (k === 'burrow') F('Troop room', l => fmt(30 + Array.from({ length: l }, (_, j) => Math.floor(20 * (j + 1) * 1.12 ** j)).reduce((a, x) => a + x, 0)));
    if (k === 'barracks') F('Training time', l => l ? `×${(0.9 ** (l - 1)).toFixed(2)}` : '–');
    if (k === 'academy') F('Research tiers open', l => { let n = 0; while (n < 5 && TIER_AT[n + 1] <= l) n++; return n; });
    if (k === 'forge') F('Unit power', l => `+${2 * l}%`);
    if (k === 'market') F('Exchange 100 →', l => l ? 25 + 5 * (l - 1) : '–');
    if (k === 'clanhall') { F('Clan', l => l >= 3 ? 'found' : l ? 'join' : '–'); F('Member cap', l => Math.min(30, 3 * l)); }
  }
  return `<table class="kv">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="up">${r[2]}</td></tr>`).join('')}</table>`;
}
function looks(t, L, to) {
  if (t < 8) return `<div class="thumbs"><img src="${spr(FIELD_SPRITE[t])}" alt=""></div>`;
  const k = KINDS[t - 8];
  if (k === 'clanhall') return `<div class="thumbs"><img src="${spr('clan_hall')}" alt=""></div>`;
  if (k === 'walls') return '';
  const a = stageOf(k, L), b = to ? stageOf(k, to) : a;
  return `<div class="thumbs"><img src="${spr(B[k].sprite + '_' + a)}" alt="">${b !== a ? `<span class="arrow">▶</span><img src="${spr(B[k].sprite + '_' + b)}" alt="">` : ''}</div>`;
}
const selTarget = sel => sel.kind === 'field' ? sel.i : sel.kind === 'th' ? 8 : sel.kind === 'walls' ? 9 : 8 + KINDS.indexOf(sel.k);
function orderBox(t) {
  const o = orderOn(t); if (o < 0) return '';
  const od = ME.orders[o], ready = now() >= od.readyAt;
  return `<div class="slot" style="margin:8px 0"><div class="t"><span>Building level ${od.level}</span><span>${ready ? 'ready' : dur(od.readyAt - now())}</span></div><div class="row" style="justify-content:flex-start;margin-top:6px">${ready ? `<button class="btn sm go" data-act="finish" data-s="${o}">Finish</button>` : `<button class="btn ghost sm" data-act="cancel" data-s="${o}">Cancel (80% back)</button>`}</div></div>`;
}
function detailPanel() {
  let h = '<button class="btn ghost sm sheet-close" data-act="close">Close</button>';
  if (!ME || !ME.v) return h + `<h3>Your village</h3><p class="muted">${S.me ? 'Found a village to start building.' : 'Connect a wallet to open your village.'}</p>`;
  const t = selTarget(S.sel), L = levelOfTarget(t), name = t < 8 ? `${FIELD_NAME[t]} ${t % 2 + 1}` : B[KINDS[t - 8]].name;
  const u = upgradeCheck(t);
  h += `<h3>${name} · ${L ? `Level ${L}` : 'not built'}</h3>` + (t >= 8 ? `<p class="muted" style="margin:0 0 6px">${B[KINDS[t - 8]].role}</p>` : '') + looks(t, L, u.max ? 0 : u.to) + effects(t, L, u.max ? 0 : u.to) + orderBox(t);
  if (!u.max && orderOn(t) < 0) h += `<div class="muted">${L ? `Upgrade to level ${u.to}` : 'Build it'}</div>` + costHtml(u.c) + `<button class="btn" style="width:100%;font-size:17px;padding:10px" data-act="upgrade" data-t="${t}" ${u.why ? 'disabled' : ''}>${L ? 'Upgrade' : 'Build'}</button>${u.why ? `<div class="why">${u.why}</div>` : ''}`;
  if (t >= 8) {
    const k = KINDS[t - 8];
    if (k === 'clanhall' && L) h += `<p><a class="btn alt sm" href="#clan" style="text-decoration:none">Open clan</a></p>`;
    if (k === 'barracks' && L) h += `<p><a class="btn alt sm" href="#army" style="text-decoration:none">Train units</a></p>`;
    if (k === 'academy' && L) h += `<p><a class="btn alt sm" href="#academy" style="text-decoration:none">Open research</a></p>`;
    if (k === 'market' && L) h += `<p><a class="btn alt sm" href="#market" style="text-decoration:none">Exchange resources</a></p>`;
    if (k === 'townhall') h += treasuryHtml();
  }
  return h;
}
function treasuryHtml() {
  const v = ME.v, t = now(), boostOn = t < v.boostUntil;
  const peaceWait = v.peaceUsedAt && t < v.peaceUsedAt + 3 * 86400 ? v.peaceUsedAt + 3 * 86400 - t : 0, shieldLeft = Math.max(0, v.shieldUntil - t);
  let h = `<h3 style="margin-top:14px">Treasury · spend SEED</h3><div class="opts">`;
  h += `<div class="opt shop"><div><div class="row"><span class="n">Output boost</span></div><div class="d">+25% output of one resource for 24 h</div><div class="c">${icon('seed')} 500 SEED</div>${boostOn ? `<div class="why">${RES_NAME[RES[v.boostRes]]} boost running: ${dur(v.boostUntil - t)} left.</div>` : `<div class="row" style="justify-content:flex-start;gap:4px;flex-wrap:wrap;margin-top:4px">${RES.map((r, i) => `<button class="btn sm" data-act="boost" data-r="${i}" ${ME.seed < 500 ? 'disabled' : ''}>${RES_NAME[r]}</button>`).join('')}</div>`}</div></div>`;
  const pw = peaceWait ? `Available again in ${dur(peaceWait)}.` : shieldLeft >= 12 * 3600 ? `Your shield already lasts ${dur(shieldLeft)}.` : ME.seed < 4000 ? `Needs ${fmt(4000 - ME.seed)} more SEED.` : '';
  h += `<div class="opt shop"><div><div class="row"><span class="n">Peace shield</span><button class="btn sm" data-act="peace" ${pw ? 'disabled' : ''}>Buy</button></div><div class="d">No one can attack you for 12 h. Attacking or scouting ends it. Once every 3 days.</div><div class="c">${icon('seed')} 4,000 SEED</div>${pw ? `<div class="why">${pw}</div>` : ''}</div></div>`;
  h += `<div class="opt shop"><div><div class="row"><span class="n">Village banner</span><button class="btn sm" data-act="banner" ${v.banner || ME.seed < 1000 ? 'disabled' : ''}>${v.banner ? 'Owned' : 'Buy'}</button></div><div class="d">A banner over your village, forever. Purely for show.</div><div class="c">${icon('seed')} 1,000 SEED</div></div></div>`;
  return h + '</div>';
}
function slotsHtml() {
  const n = ME.nft;
  let h = `<h3>Construction</h3><div class="muted" style="font-size:16px;margin:-4px 0 6px">${n ? `${n} Squeek${n > 1 ? 's' : ''} in your wallet: build time −${pct(squeekCut(n, G.lastWork))} after the last recorded day` : 'Hold a Squeek to build faster after a good day of work'}</div><div class="list">`;
  ME.orders.forEach((o, i) => {
    if (!o) { h += `<div class="slot"><div class="t"><span class="muted">Slot ${i + 1} is free</span></div><div class="q">Tap a building, a field or a + plot</div></div>`; return; }
    const ready = now() >= o.readyAt;
    h += `<div class="slot"><div class="t"><span>${targetName(o.target)} → ${o.level}</span><span>${ready ? '<span class="ok">ready</span>' : dur(o.readyAt - now())}</span></div><div class="row" style="justify-content:flex-start;margin-top:4px">${ready ? `<button class="btn sm go" data-act="finish" data-s="${i}">Finish</button>` : `<button class="btn ghost sm" data-act="cancel" data-s="${i}">Cancel (80% back)</button>`}</div></div>`;
  });
  return h + '</div>';
}
function moveLine(m) {
  const t = now(), arrived = t >= m.arriveAt, mineM = m.owner === S.me;
  const dest = m.target === '0x0000000000000000000000000000000000000000' ? `${CAMP_NAME[m.campId % 3]} #${m.campId}` : esc(nameOf(m.target));
  const label = !mineM ? (m.mode === 5 ? `⛨ ${esc(nameOf(m.owner))}'s support is here` : m.mode === 3 ? `⛨ ${esc(nameOf(m.owner))} sends support` : `<span class="bad">⚔ ${esc(nameOf(m.owner))} attacks you</span>`)
    : m.mode === 1 ? `→ Raid on ${dest}` : m.mode === 2 ? `👁 Scouts to ${dest}` : m.mode === 3 ? `⛨ Support to ${dest}` : m.mode === 4 ? `↩ Back from ${dest}` : `⛨ Supporting ${dest}`;
  const units = m.units.map((n, k) => n ? `${n} ${U[k].name}` : '').filter(Boolean).join(', ') + (m.champion ? ' + champion' : '');
  const btn = m.mode === 5 ? (mineM || m.target === S.me ? `<button class="btn ghost sm" data-act="recall" data-id="${m.id}">Recall</button>` : '') : arrived ? `<button class="btn sm go" data-act="resolve" data-id="${m.id}">Resolve</button>` : `<b style="font-weight:400">${dur(m.arriveAt - t)}</b>`;
  return `<div class="card">${label}<div class="row"><span class="muted">${mineM ? units : ''}</span>${btn}</div></div>`;
}
function movesHtml() {
  if (!ME || !ME.v) return '';
  if (!ME.moves.length) return `<p class="muted">${now() < ME.v.shieldUntil ? `Beginner shield: ${dur(ME.v.shieldUntil - now())} left. Attacking or scouting ends it.` : 'No armies on the move.'}</p>`;
  return ME.moves.slice().sort((a, b) => a.arriveAt - b.arriveAt).map(moveLine).join('');
}
function villageLeft() {
  if (!S.me) return `<h3>Welcome</h3><p class="muted">Connect a wallet to found your village. You can look at the map and the ranking without one.</p><button class="btn" data-act="wb-open">Connect wallet</button>`;
  if (!ME) return `<h3>Your village</h3><p class="muted">Reading Sepolia…</p>`;
  if (ME.none) return `<h3>No village yet</h3><p class="muted">This wallet has no village. Founding one is a single transaction: pick a name that stays forever.</p><button class="btn" data-act="nm-open">Found a village</button>`;
  let h = slotsHtml();
  const act = [];
  if (ME.study) { const r = ME.study, ready = now() >= r.readyAt; act.push(`Research tier ${r.tier} · ${ready ? `<button class="btn sm go" data-act="resfinish">Finish</button>` : dur(r.readyAt - now())}`); }
  if (ME.training) { const tr = ME.training, ready = now() >= tr.readyAt; act.push(`Training ${tr.count} ${U[tr.kind].name} · ${ready ? `<button class="btn sm go" data-act="trfinish">Finish</button>` : dur(tr.readyAt - now())}`); }
  if (act.length) h += `<h3 style="margin-top:12px">Busy</h3><div class="muted">${act.join('<br>')}</div>`;
  h += `<h3 style="margin-top:12px">Armies</h3><div class="list">${movesHtml()}</div>`;
  h += `<button class="btn ghost sm" style="margin-top:12px" data-act="ovtoggle" aria-expanded="${!!S.ui.ovOpen}">${S.ui.ovOpen ? 'Hide' : 'Show'} all buildings</button>`;
  if (S.ui.ovOpen) {
    const ov = [['th', null, 'Town Hall', th()], ['walls', null, 'Walls', lv('walls')]];
    ME.v.fields.forEach((L, i) => ov.push(['field', i, `${FIELD_NAME[i]} ${i % 2 + 1}`, L]));
    PLOT_KINDS.forEach(k => ov.push(['b', k, B[k].name, lv(k)]));
    h += `<div class="ov" style="margin-top:6px">` + ov.map(([k, i, n, L]) => `<button data-sel="${k}" data-i="${i ?? ''}"><span>${n}</span><span>${L ? 'Lv ' + L : '–'}</span></button>`).join('') + '</div>';
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
    const cx = W.ctx.get(p) || { th: 1, shieldUntil: 0 }, L = Math.max(1, cx.th), st = Math.ceil(L / 2), own = p === S.me, cl = W.clanOf.get(p) || 0;
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
    const from = (W.players.get(m.owner) || {}).tile, to = m.target === '0x0000000000000000000000000000000000000000' ? campTile(m.campId) : (W.players.get(m.target) || {}).tile;
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
function picker(keys) { return `<div class="unitsel">${keys.map(k => `<img src="${spr(U[k].sprite)}" alt=""><span>${U[k].name} <button class="btn ghost sm" data-act="amax" data-u="${k}">all ${ME.home[k]}</button></span><input type="number" min="0" max="${ME.home[k]}" value="0" id="atk-${k}" data-u="${k}" inputmode="numeric">`).join('')}</div><div class="row" style="justify-content:flex-start;margin-top:6px"><button class="btn ghost sm" data-act="aall">Everyone</button><button class="btn ghost sm" data-act="anone">Clear</button></div>`; }
function worldRight() {
  let h = '<button class="btn ghost sm sheet-close" data-act="close">Close</button>';
  if (S.wsel === null) return h + `<h3>Pick a tile</h3><p class="muted">Tap a village or a wild camp to see it and send troops.</p>`;
  const tile = S.wsel, [x, y] = tileXY(tile), p = W.tiles.get(tile), T = W.target.get(tile), t = now(), myTile = ME && ME.v ? ME.v.tile : null;
  const dist = myTile !== null ? Math.hypot(x - myTile % 100, y - Math.floor(myTile / 100)) : null;
  if (p && p === S.me) return h + `<h3>Your village (${x}|${y})</h3><p class="muted">${who(ME.v.name, S.me)} · Town Hall ${th()} · Walls ${ME.walls}<br>Defense at home about ${fmt(myDefense())}</p><a class="btn sm" href="#village" style="text-decoration:none">Open village</a>`;
  if (!p && !CAMP_AT.has(tile)) return h + `<h3>Empty tile (${x}|${y})</h3><p class="muted">Free land. New villages fill the map in a fixed order as wallets join.</p>`;
  if (!T) return h + `<h3>${p ? esc(nameOf(p)) : CAMP_NAME[CAMP_AT.get(tile) % 3]} (${x}|${y})</h3><p class="muted">Reading…</p>`;
  const units = ME && ME.v ? ME.home : null, scouted = T.scouted > t;
  if (T.camp !== undefined) {
    h += `<h3>${CAMP_NAME[T.camp % 3]} #${T.camp} (${x}|${y})</h3><div class="vhead"><img src="${spr(T.camp % 3 === 2 ? 'burrow_2' : 'burrow_1')}" alt=""><div class="muted">Wild camp${dist !== null ? ` · ${dist.toFixed(1)} tiles away` : ''}<br>It never attacks and has no Walls or Vault. Raids give loot and champion XP, but no ranking points.</div></div>
    <table class="kv"><tr><td>Defense now</td><td>${fmt(T.defense)}${T.defense < T.full ? ` of ${fmt(T.full)}` : ''}</td></tr><tr><td>Grows</td><td>${fmt(T.hourly)} of each resource per hour, up to 24 h</td></tr>${T.stock ? `<tr><td>Stock at last raid</td><td>${T.stock.map(fmt).join(' / ')}</td></tr>` : ''}${T.regrowAt > t ? `<tr><td>Defenders regrow</td><td>in ${dur(T.regrowAt - t)}</td></tr>` : ''}</table>`;
    if (!units) return h;
    return h + attackForm(T.defense, dist, tile, scouted, true);
  }
  const cl = T.clanId, same = ME && ME.clanId && cl === ME.clanId;
  const D = defenseOf(T.home, T.forge, T.away ? 0 : T.might, T.away ? 0 : T.def, T.walls, T.th);
  const lootable = T.stock.map(s => Math.max(0, s - T.protect));
  h += `<h3>${esc(nameOf(p))} (${x}|${y})</h3><div class="addr big">${p}</div><div class="vhead"><img src="${spr('town_hall_' + Math.ceil(Math.max(1, T.th) / 2))}" alt=""><div class="muted">Town Hall ${T.th} · Walls ${T.walls}${dist !== null ? ` · ${dist.toFixed(1)} tiles away` : ''}<br>${cl ? `${esc(clanName(cl))}${same ? ' (your clan)' : ''}` : 'No clan'}${T.shieldUntil > t ? ` · shield ${dur(T.shieldUntil - t)}` : ''}</div></div>
  <table class="kv"><tr><td>Troops at home</td><td>${T.home.some(Boolean) ? T.home.map((n, k) => n ? `${n} ${U[k].name}` : '').filter(Boolean).join(', ') : 'none'}</td></tr><tr><td>Defense</td><td>about ${fmt(D)}${T.away ? ' (champion away)' : ''}, plus any clan support</td></tr><tr><td>Above the Vault</td><td>${lootable.map((v, i) => `${icon(RES[i])}${fmt(v)}`).join(' ')}</td></tr><tr><td>Scouting bonus</td><td>${scouted ? `<span class="ok">+10% · ${dur(T.scouted - t)} left</span>` : '<span class="muted">none</span>'}</td></tr></table>`;
  if (!units) return h + `<p class="muted">Connect a wallet with a village to send troops.</p>`;
  if (ME.clan && ME.clan.founder === S.me && !cl) { const inv = W.invites.get(ME.clanId + ':' + p); h += `<div class="row" style="margin:8px 0;justify-content:flex-start"><button class="btn sm alt" data-act="invite" data-a="${p}" ${inv && inv.open ? 'disabled' : ''}>${inv && inv.open ? 'Invited' : `Invite to ${esc(ME.clan.name)}`}</button></div>`; }
  if (same) {
    const ready = [0, 1, 2, 3, 4, 5].filter(k => ME.home[k] > 0);
    if (ME.v.b[9] < 1) return h + `<p class="muted">A clanmate: send support once you have a Clan Hall.</p>`;
    if (!ready.length) return h + `<p class="muted">A clanmate. No troops at home to send as support.</p>`;
    return h + `<h3 style="margin-top:10px">Send support</h3>${picker(ready)}<div class="stickgo"><button class="btn alt" style="width:100%" data-act="support">Send support</button></div>`;
  }
  if (T.shieldUntil > t) return h + `<p class="muted">Shielded: you cannot attack this village for ${dur(T.shieldUntil - t)}.</p>`;
  if (T.th + 3 <= th()) h += `<p class="why">Town Hall ${T.th} is 3+ levels below yours: raids here give half loot and no points.</p>`;
  return h + attackForm(D, dist, tile, scouted, false);
}
function attackForm(D, dist, tile, scouted, camp) {
  let h = '';
  if (!camp && ME.v.tier >= 2) h += `<div class="row card" style="margin:8px 0"><span>Scouts at home: ${ME.home[6]}</span><span class="pbtn"><input type="number" id="sc-n" min="1" max="${ME.home[6]}" value="${Math.min(3, ME.home[6])}" style="width:56px" inputmode="numeric"><button class="btn sm alt" data-act="scout" ${ME.home[6] ? '' : 'disabled'}>Scout</button></span></div>`;
  else if (!camp) h += `<p class="muted" style="font-size:17px">Scouts (research tier 2) give +10% attack on a village for 12 h.</p>`;
  const ready = [0, 1, 2, 3, 4, 5].filter(k => ME.home[k] > 0);
  if (!ready.length) return h + `<p class="muted">No troops at home. Train units in the Army tab.</p>`;
  return h + `<h3 style="margin-top:10px">Choose troops to send</h3>${picker(ready)}<label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="atk-champ" ${ME.champ.away ? 'disabled' : 'checked'}> Champion joins (Might ${fmt(ME.cstats.might)})</label>
  <div class="pred" id="pred" data-d="${D}" data-scouted="${scouted ? 1 : 0}" data-tile="${tile}"></div><div class="stickgo"><button class="btn" style="width:100%" data-act="attack" id="atk-go" disabled>Attack</button></div>`;
}
const pickIn = () => { const u = [0, 0, 0, 0, 0, 0, 0]; document.querySelectorAll('#wright input[id^="atk-"][data-u]').forEach(i => { const k = +i.dataset.u; u[k] = clamp(Math.floor(+i.value || 0), 0, ME.home[k]); }); return u; };
function updatePrediction() {
  const box = $('#pred'); if (!box || !ME || !ME.v) return;
  const D = +box.dataset.d, sc = box.dataset.scouted === '1', tile = +box.dataset.tile, units = pickIn(), champ = !!($('#atk-champ') && $('#atk-champ').checked && !ME.champ.away);
  const n = units.reduce((a, b) => a + b, 0), go = $('#atk-go'); if (go) go.disabled = n < 1;
  if (n < 1) { box.innerHTML = `Their defense is about <b>${fmt(D)}</b>: you need <b>${fmt(2 * D)}</b> attack to win${sc ? ' (your scouting adds +10%)' : ''}.`; return; }
  const A = attackOf(units, champ, sc), fa = Math.min(1, 0.5 * D / Math.max(1, A)), fd = D ? Math.min(1, 0.5 * A / D) : 1, win = A >= 2 * D && A > 0;
  const surv = units.map(x => Math.round(x * (1 - (win ? fa : fa)))), speed = Math.min(...units.map((x, k) => x ? U[k].s : 99));
  const tt = travelSecs(ME.v.tile, tile, speed, ME.v.tier);
  box.innerHTML = `Attack about <b>${fmt(A)}</b>${sc ? ' (+10% scouted)' : ''} vs defense <b>${fmt(D)}</b><br>You lose about ${pct(fa)} · they lose ${pct(fd)}<br>${win ? `<span class="ok">Win · you can carry ${fmt(carryOf(surv, champ))}</span>` : '<span class="bad">No win: under twice their defense</span>'} · arrives in ${dur(tt)}`;
}

// ------------------------------------------------------------------ pages
function needVillage(title) {
  if (!S.me) return `<h2>${title}</h2><div class="px box"><p class="muted">Connect a wallet to play.</p><button class="btn" data-act="wb-open">Connect wallet</button></div>`;
  if (!ME) return `<h2>${title}</h2><div class="px box"><p class="muted">Reading Sepolia…</p></div>`;
  if (ME.none) return `<h2>${title}</h2><div class="px box"><p class="muted">Found a village first.</p><button class="btn" data-act="nm-open">Found a village</button></div>`;
  return '';
}
function armyPage() {
  const nv = needVillage('Army'); if (nv) return nv;
  const bl = lv('barracks'), room = Math.max(0, ME.room - ME.used), away = awayUnits(), rt = rates();
  let h = `<h2>Army</h2><p class="sub">Each unit needs Burrow room and eats 0.5 Food per room per hour, at home or away. Defense at home now: about <b class="gold">${fmt(myDefense())}</b> (Walls +${4 * ME.walls}%, Forge +${2 * lv('forge')}%, champion ${ME.champ.away ? 'away' : 'home'}).</p>`;
  h += `<div class="px box" style="margin-bottom:14px"><p style="margin:0">Room used <b>${fmt(ME.used)}</b> of <b>${fmt(ME.room)}</b> · Food ${fmt(rt[1])}/h grown, ${fmt(foodUse())}/h eaten${rt[1] < foodUse() ? ' · <span class="bad">Food runs out: troops do not starve, but nothing is left to build with</span>' : ''}</p></div><div class="grid2">`;
  h += `<div class="px box wide"><h3>Your units</h3><div class="tblwrap"><table class="tbl utbl"><thead><tr><th>Unit</th><th>Home</th><th>Away</th><th>Atk / Def</th><th>Speed</th><th>Carry</th><th>Room</th></tr></thead><tbody>`;
  h += U.map((u, k) => `<tr><td class="un"><img src="${spr(u.sprite)}" alt="">${u.name}${ME.v.tier >= u.tier ? '' : ` <span class="muted">(tier ${u.tier})</span>`}</td><td class="r">${ME.home[k]}</td><td class="r">${away[k]}</td><td class="r">${u.a} / ${u.d}</td><td class="r">${u.s}</td><td class="r">${u.c}</td><td class="r">${u.u}</td></tr>`).join('');
  h += `</tbody></table></div></div><div class="px box"><h3>Train at the Barracks</h3>`;
  if (!bl) h += `<p class="muted">Build Barracks in your village first.</p>`;
  else if (ME.training) { const tr = ME.training, ready = now() >= tr.readyAt; h += `<div class="slot"><div class="t"><span>${tr.count} ${U[tr.kind].name}</span><span>${ready ? '<span class="ok">ready</span>' : dur(tr.readyAt - now())}</span></div>${ready ? `<button class="btn sm go" style="margin-top:6px" data-act="trfinish">Finish training</button>` : ''}</div><p class="muted">One batch at a time. Training cannot be cancelled.</p>`; }
  else {
    const s = stockNow();
    h += `<div class="opts">` + U.map((u, k) => [u, k]).filter(([u]) => ME.v.tier >= u.tier).map(([u, k]) => {
      const mx = Math.max(0, Math.min(Math.floor(room / u.u), ...u.cost.map((c, i) => Math.floor(s[i] / c))));
      return `<div class="opt"><img src="${spr(u.sprite)}" alt=""><div><div class="row"><span class="n">${u.name}</span><span class="muted">max ${mx}</span></div><div class="c">${u.cost.map((c, i) => `${icon(RES[i])}${c}`).join(' ')} · ${dur(u.m * 60 * 0.9 ** (bl - 1))} each</div><div class="row" style="justify-content:flex-start;margin-top:4px"><input type="number" id="tr-${k}" min="1" max="${Math.max(1, mx)}" value="${Math.max(1, Math.min(mx, 10))}" class="numin"><button class="btn sm" data-act="train" data-u="${k}" ${mx ? '' : 'disabled'}>Train</button></div></div></div>`;
    }).join('') + `</div>`;
    if (room < 1) h += `<p class="bad">No room for more troops: build or upgrade the Burrow.</p>`;
  }
  h += `</div><div class="px box"><h3>On the move</h3><div class="list">${movesHtml()}</div><p class="muted">Pick a target on the World Map. Anyone can press Resolve once an army has arrived.</p></div></div>`;
  return h;
}
function academyPage() {
  const nv = needVillage('Academy'); if (nv) return nv;
  const ak = lv('academy'), done = ME.v.tier;
  let h = `<h2>Academy</h2><p class="sub">${ak ? `Academy level ${ak}. Research runs one tier at a time, in order. It costs resources and SEED, and has no speed bonus.` : 'Build an Academy in your village to start research.'}</p>`;
  if (ME.study) { const r = ME.study, ready = now() >= r.readyAt; h += `<div class="px box" style="margin-bottom:14px"><div class="slot"><div class="t"><span>Researching tier ${r.tier}</span><span>${ready ? '<span class="ok">ready</span>' : dur(r.readyAt - now())}</span></div>${ready ? `<button class="btn sm go" style="margin-top:6px" data-act="resfinish">Finish research</button>` : ''}</div></div>`; }
  for (let t = 1; t <= 5; t++) {
    const q = Q.research[t - 1]; if (!q) continue;
    const cur = ME.study && ME.study.tier === t, isDone = t <= done, next = t === done + 1;
    const why = isDone || cur ? '' : !next ? `After tier ${t - 1}.` : ak < q.academy ? `Needs Academy ${q.academy}.` : ME.study ? 'Research is busy.' : !canPay(q.cost, q.seed) ? shortMsg(q.cost, q.seed) : '';
    h += `<div class="tier"><h4>TIER ${t} · Academy ${q.academy} · ${q.cost.map((x, i) => `${icon(RES[i])}${fmt(x)}`).join(' ')} ${icon('seed')}${fmt(q.seed)} · ${dur(q.secs)}</h4><div class="rsrch"><div class="rs ${isDone ? 'done' : cur ? 'cur' : !next ? 'lock' : ''}"><b>Unlocks</b><div class="muted" style="font-size:17px">${TIERS[t]}</div><div style="margin-top:6px">${isDone ? '<span class="ok">Done</span>' : cur ? '<span class="gold">In progress</span>' : `<button class="btn sm" data-act="research" ${why ? 'disabled' : ''}>Research tier ${t}</button>${why ? `<div class="why">${why}</div>` : ''}`}</div></div></div></div>`;
  }
  return h;
}
function marketPage() {
  const nv = needVillage('Market'); if (nv) return nv;
  const L = lv('market'), rateL = 25 + 5 * (L - 1), s = stockNow();
  let h = `<h2>Market</h2><p class="sub">No trading between players. The Market exchanges your own resources: give 100 of one, get ${L ? rateL : '25 to 70'} of another. SEED can be given at the same rate, but no resource ever turns back into SEED.</p>`;
  if (!L) return h + `<div class="px box"><p class="muted">Build a Market in your village.</p></div>`;
  h += `<div class="px box"><h3>Exchange · Market level ${L} · 100 → ${rateL}</h3><div class="mkt">
    <label>Give<select id="mk-from">${RES.map((r, i) => `<option value="${i}">${RES_NAME[r]} (${fmt(s[i])})</option>`).join('')}<option value="4">SEED (${fmt(ME.seed)}), one way</option></select></label>
    <label>Get<select id="mk-to">${RES.map((r, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${RES_NAME[r]}</option>`).join('')}</select></label>
    <label>Amount<input type="number" id="mk-amt" min="100" step="100" value="500"></label>
    <button class="btn" data-act="exchange">Exchange</button></div><p class="muted" id="mk-out"></p></div>`;
  return h + `<div class="px box" style="margin-top:14px"><h3>Treasury</h3><p class="muted">The output boost, peace shield and banner are in the Town Hall panel of your village.</p></div>`;
}
function mkPreview() { const o = $('#mk-out'); if (!o) return; const L = lv('market'), a = Math.floor((+$('#mk-amt').value || 0) / 100); o.textContent = `${fmt(a * 100)} given → ${fmt(a * (25 + 5 * (L - 1)))} ${RES_NAME[RES[+$('#mk-to').value]]}. Amounts go in lots of 100.`; }
let pending = null;      // champion points chosen but not saved yet
function champPage() {
  const nv = needVillage('Champion'); if (nv) return nv;
  const c = ME.champ, L = ME.clevel, sq = ME.nft > 0, spent = c.might + c.attack + c.defense + c.carry, total = 4 * (L - 1);
  const p = pending || { might: c.might, attack: c.attack, defense: c.defense, carry: c.carry }, used = p.might + p.attack + p.defense + p.carry, free = total - used;
  const next = 100 * L * L, prev = 100 * (L - 1) * (L - 1), rank = L >= 30 ? 4 : L >= 20 ? 3 : L >= 10 ? 2 : 1, k = sq ? 1.1 : 1;
  const row = (key, label, val, capped) => `<span>${label}</span><b style="font-weight:400">${val}</b><button class="btn sm" data-act="pt" data-k="${key}" ${free > 0 && !capped ? '' : 'disabled'}>+1</button>`;
  let h = `<h2>Champion</h2><p class="sub">Every village has a champion. It joins your attacks or defends at home, earns XP from battles and from each claimed day, and reaches level 30. Holding a Squeek makes it a Squeek champion: +10% XP and +10% to every stat.</p>`;
  h += `<div class="px box champ"><img src="${spr('champion_' + rank + (sq ? '_sq' : ''))}" alt=""><div><div class="disp" style="font-size:22px">${sq ? 'Squeek champion' : 'Champion'} · Level ${L}</div>${sq ? '<span class="sqtag">Squeek champion · +10% XP and stats</span>' : '<span class="muted" style="font-size:17px">Hold a Squeek for +10% XP and stats</span>'}<div class="muted">${fmt(c.xp)} XP${L < 30 ? ` · next level at ${fmt(next)}` : ' · max level'}</div><div class="prog" style="max-width:360px"><i style="width:${L < 30 ? clamp((c.xp - prev) / (next - prev) * 100, 0, 100).toFixed(0) : 100}%"></i></div><p class="muted">Status: ${c.away ? 'with an army' : 'at home, defending'}</p>
  <h3 style="margin-top:10px">Points to spend: <span class="num">${free}</span></h3><div class="pts">
  ${row('might', 'Might · own power', fmt((50 + 25 * p.might) * k), false)}${row('attack', 'Attack bonus (max 10%)', `+${(p.attack * 0.5 * k).toFixed(1)}%`, p.attack >= 20)}${row('defense', 'Defense bonus (max 10%)', `+${(p.defense * 0.5 * k).toFixed(1)}%`, p.defense >= 20)}${row('carry', 'Carry bonus (max 20%)', `+${(p.carry * k).toFixed(0)}%`, p.carry >= 20)}</div>
  ${used > spent ? `<div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn go" data-act="ptsave">Save ${used - spent} point${used - spent > 1 ? 's' : ''}</button><button class="btn ghost sm" data-act="ptreset">Undo</button></div><p class="muted">Points cannot be moved once saved.</p>` : ''}</div></div>`;
  return h;
}
function clanPage() {
  const nv = needVillage('Clan'); if (nv) return nv;
  const L = lv('clanhall');
  let h = `<h2>Clan</h2><p class="sub">Clanmates cannot attack each other and can send troops to defend each other. You join by the founder's invitation.</p>`;
  if (!ME.clanId) {
    const inv = [...W.invites.values()].filter(i => i.player === S.me && i.open);
    if (!L) h += `<div class="px box"><p class="muted">${ME.v.tier >= 2 ? 'Build a Clan Hall in your village.' : 'Research tier 2 in the Academy, then build a Clan Hall.'} Level 1 lets you join a clan, level 3 lets you found one.</p></div>`;
    if (inv.length) h += `<div class="px box" style="margin-top:10px"><h3>Invitations</h3>${inv.map(i => `<div class="row card"><span>${esc(clanName(i.clanId))}</span><button class="btn sm" data-act="join" data-id="${i.clanId}" ${L ? '' : 'disabled'}>Join</button></div>`).join('')}${L ? '' : '<p class="why">Build a Clan Hall to accept.</p>'}</div>`;
    else if (L) h += `<div class="px box" style="margin-top:10px"><p class="muted">No invitations yet. Ask a clan founder to invite <span class="addr">${S.me}</span>.</p></div>`;
    if (L >= 3) h += `<div class="px box" style="margin-top:10px"><h3>Found a clan</h3><div class="mkt"><label>Clan name<input id="cl-name" maxlength="24" placeholder="The_Night_Wheel"></label><button class="btn" data-act="found">Found clan</button></div><p class="muted">3 to 24 letters, digits or _. Up to ${Math.min(30, 3 * L)} members at Clan Hall ${L}.</p></div>`;
    else if (L) h += `<p class="muted">Clan Hall level 3 lets you found your own clan.</p>`;
    return h;
  }
  const c = ME.clan || { name: clanName(ME.clanId), members: [], capacity: 0, founder: '' }, founder = c.founder === S.me;
  h += `<div class="grid2"><div class="px box"><h3>${esc(c.name)} · ${c.members.length} / ${c.capacity}</h3><div class="tblwrap"><table class="tbl"><thead><tr><th>Player</th><th>Village</th><th></th></tr></thead><tbody>${c.members.map(m => { const pl = W.players.get(m) || {}; const [x, y] = tileXY(pl.tile || 0); return `<tr><td>${who(pl.name, m)}${m === c.founder ? ' <span class="muted">(founder)</span>' : ''}</td><td><button class="lnk" data-act="gotile" data-t="${pl.tile}">(${x}|${y})</button></td><td></td></tr>`; }).join('')}</tbody></table></div>
  <div class="row" style="justify-content:flex-start;margin-top:10px;flex-wrap:wrap">${founder ? `<button class="btn sm alt" data-act="raisecap">Raise cap to Clan Hall level</button>` : ''}<button class="btn ghost sm" data-act="leave">${founder && c.members.length > 1 ? 'Leave (founder leaves last)' : 'Leave clan'}</button></div></div>`;
  if (founder) {
    const open = [...W.invites.values()].filter(i => i.clanId === ME.clanId && i.open);
    h += `<div class="px box"><h3>Invite a player</h3><div class="mkt"><label>Village name or 0x address<input id="cl-inv" maxlength="42" placeholder="e.g. AmberPaw42"></label><button class="btn" data-act="invname">Invite</button></div><p class="muted">They join from their Clan page. You can also invite from the World Map.</p>${open.length ? `<h3 style="margin-top:10px">Open invitations</h3>${open.map(i => `<div class="row card"><span>${who(nameOf(i.player), i.player)}</span><button class="btn ghost sm" data-act="uninvite" data-a="${i.player}">Withdraw</button></div>`).join('')}` : ''}</div>`;
  }
  return h + '</div>';
}
function rankingPage() {
  const cat = S.ui.rk || 'gen', wk = !!S.ui.rkw;
  const CATS = [['gen', 'Overall'], ['atk', 'Attackers'], ['def', 'Defenders'], ['loot', 'Raiders'], ['clan', 'Clans']];
  let h = `<h2>Ranking</h2><p class="sub">Every village, straight from the contract counters. <b>Overall = Build + Research + Combat</b>, where Combat = (attack + defense points) ÷ 200, never more than Build.</p>
  <details class="how"><summary>How points are counted</summary><ul><li><b>Build</b>: resources and SEED spent on finished buildings and fields ÷ 100.</li><li><b>Research</b>: resources and SEED spent on finished research ÷ 100.</li><li><b>Attack / defense points</b>: resource value of the troops you killed. Raids 3+ Town Hall levels down and wild camps give none.</li><li><b>Clans</b>: the sum of their members' Overall.</li></ul></details>`;
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
  if (!mine.length) return h + `<div class="px box"><p class="muted">No battles yet. When your shield ends, neighbours may attack; you can raid wild camps and villages any time your attack is twice their defense.</p></div>`;
  h += mine.slice(0, 60).map(m => {
    const atk = m.owner === S.me, other = atk ? (m.target === '0x0000000000000000000000000000000000000000' ? `${CAMP_NAME[m.campId % 3]} #${m.campId}` : nameOf(m.target)) : nameOf(m.owner);
    const b = W.battles.get(m.id), sc = m.mode === 2 ? W.scouts.find(s => s.player === m.owner && s.block >= m.block) : null;
    const title = m.mode === 2 ? `Scouting ${atk ? 'of' : 'by'} ${other}` : m.mode === 3 ? `Support ${atk ? 'to' : 'from'} ${other}` : `${atk ? 'Raid on' : 'Defense against'} ${other}`;
    let res = 'Under way', cls = '', lines = [];
    if (b) { const won = atk ? b.decisive : !b.decisive; res = b.decisive ? (atk ? 'Victory' : 'Defeat') : 'Repelled'; cls = won ? 'w' : 'l'; lines.push(`Attack ${fmt(b.attack)} vs defense ${fmt(b.defense)}${b.decisive ? ' · decisive' : ''}`, `Attacker lost troops worth ${fmt(b.aLost)} · defender lost ${fmt(b.dLost)}`); }
    else if (sc) { res = sc.success ? 'Scouted' : 'Scouts lost'; cls = 's'; if (sc.success) lines.push(`+10% attack on this village until ${new Date(sc.until * 1000).toUTCString().slice(5, 22)} UTC`); }
    else if (m.events.length) { res = m.events.some(e => e.mode === 6) ? 'Back home' : 'Resolved'; cls = 's'; }
    return `<div class="px report"><div class="h"><span>${esc(title)}</span><span class="${cls}">${res} · ${new Date(m.arriveAt * 1000).toUTCString().slice(5, 22)} UTC</span></div>${lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`;
  }).join('');
  return h;
}

// ------------------------------------------------------------------ routing and render loop
const VIEWS = ['home', 'village', 'world', 'army', 'academy', 'market', 'clan', 'champion', 'ranking', 'reports'];
function route() {
  const h = location.hash.slice(1), v = VIEWS.includes(h) ? h : 'home';
  S.view = v;
  $('#home').classList.toggle('on', v === 'home'); $('#game').hidden = v === 'home';
  for (const id of VIEWS.slice(1)) $('#' + id).classList.toggle('on', id === v);
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  if (v === 'home' && h) document.getElementById(h)?.scrollIntoView();
  if (v !== 'home' && !S.ui.net) $('#netbox').hidden = false;
  else if (v !== 'home' && !S.me && !S.ui.look && v !== 'world' && v !== 'ranking') openWallet();
  if (v === 'ranking' && !W.rank) loadRanking().then(dirty).catch(() => { });
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
    needFull = false; lastFull = t;
  }
}
function tick() { if (S.view !== 'home' && !document.hidden) { render(false); if (S.view === 'village') sceneFx(false); } requestAnimationFrame(tick); }

// ------------------------------------------------------------------ wallet, founding
function openWallet() { const b = $('#walletbox'); b.hidden = false; $('#wb-msg').textContent = SW.hasWallet() ? '' : 'No wallet found in this browser. Install MetaMask or Rabby, or open this page in your wallet app.'; }
function maybeName() {
  if (S.me && ME && ME.none && S.view !== 'home' && !S.ui.lookName) openName();
}
function openName() { $('#nm-wallet').textContent = shortAddr(S.me); const nb = $('#namebox'); nb.hidden = false; const i = $('#nm-in'); i.placeholder = i.placeholder || randomName(); }
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
  try { S.me = await SW.connect(); $('#walletbox').hidden = true; note(`Wallet ${shortAddr(S.me)} connected`, 'ok'); ME = null; await refresh(true); route(); }
  catch (e) { $('#wb-msg').textContent = e.message || String(e); }
}

// ------------------------------------------------------------------ clicks
function onClick(e) {
  const t = e.target.closest('[data-act],[data-sel],[data-hit]'); if (!t) return;
  if (t.dataset.hit) { if (e.detail === 0) selectHit(t); return; }
  if (t.dataset.sel) { const k = t.dataset.sel; S.sel = k === 'th' || k === 'walls' ? { kind: k } : k === 'field' ? { kind: 'field', i: +t.dataset.i } : { kind: 'b', k: t.dataset.i }; $('#vright').classList.remove('closed'); sceneDirty = true; dirty(); return; }
  const a = t.dataset.act;
  if (a === 'close') { t.closest('.right').classList.add('closed'); return; }
  if (a === 'min') { S.ui.min[t.dataset.p] = !S.ui.min[t.dataset.p]; saveUI(); dirty(); return; }
  if (a === 'txclose') { $('#txbox').hidden = true; return; }
  if (a === 'net-test') { S.ui.net = 'testnet'; saveUI(); $('#netbox').hidden = true; if (S.view === 'home') { location.hash = 'village'; return; } route(); return; }
  if (a === 'wb-connect') return connectWallet();
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
  // transactions
  const me = S.me;
  if (a === 'checkpoint') return act('Checkpoint today', 'ledger', 'checkpoint', []);
  if (a === 'claim') return act('Claim SEED', 'villages', 'claimSeed', []);
  if (a === 'upgrade') { const tg = +t.dataset.t, slot = ME.orders[0] ? 1 : 0; return act(`${levelOfTarget(tg) ? 'Upgrade' : 'Build'} ${targetName(tg)}`, 'villages', 'orderBuild', [tg, slot]); }
  if (a === 'finish') return act(`Finish ${targetName(ME.orders[+t.dataset.s].target)}`, 'villages', 'completeBuild', [me, +t.dataset.s]);
  if (a === 'cancel') return act(`Cancel ${targetName(ME.orders[+t.dataset.s].target)}`, 'villages', 'cancelBuild', [+t.dataset.s]);
  if (a === 'research') return act(`Research tier ${ME.v.tier + 1}`, 'villages', 'orderResearch', []);
  if (a === 'resfinish') return act('Finish research', 'villages', 'completeResearch', [me]);
  if (a === 'train') { const k = +t.dataset.u, n = Math.floor(+$('#tr-' + k).value || 0); if (n < 1) return note('Choose how many.', 'bad'); return act(`Train ${n} ${U[k].name}`, 'villages', 'train', [k, n]); }
  if (a === 'trfinish') return act('Finish training', 'army', 'completeTraining', [g(), me]);
  if (a === 'resolve') return act('Resolve movement', 'army', 'resolve', [g(), +t.dataset.id]);
  if (a === 'recall') return act('Recall support', 'villages', 'recall', [+t.dataset.id]);
  if (a === 'boost') return act(`${RES_NAME[RES[+t.dataset.r]]} boost`, 'villages', 'treasury', [0, +t.dataset.r]);
  if (a === 'peace') return act('Peace shield', 'villages', 'treasury', [1, 0]);
  if (a === 'banner') return act('Village banner', 'villages', 'treasury', [2, 0]);
  if (a === 'exchange') { const lots = Math.floor((+$('#mk-amt').value || 0) / 100); if (lots < 1) return note('Exchange at least 100.', 'bad'); return act('Exchange', 'villages', 'exchange', [+$('#mk-from').value, +$('#mk-to').value, lots]); }
  if (a === 'ptsave') { const p = pending; pending = null; return act('Champion points', 'villages', 'allocateChampion', [p.might, p.attack, p.defense, p.carry]); }
  if (a === 'attack' || a === 'support' || a === 'scout') {
    const tile = S.wsel, target = W.tiles.get(tile) || '0x0000000000000000000000000000000000000000', camp = CAMP_AT.has(tile) ? CAMP_AT.get(tile) : 0;
    let units = pickIn(), champ = false, mode = 1;
    if (a === 'scout') { const n = clamp(Math.floor(+$('#sc-n').value || 0), 0, ME.home[6]); if (n < 1) return note('Choose how many Scouts.', 'bad'); units = [0, 0, 0, 0, 0, 0, n]; mode = 2; }
    else { if (!units.some(Boolean)) return note('Choose troops to send.', 'bad'); champ = a === 'attack' && !!($('#atk-champ') && $('#atk-champ').checked); mode = a === 'support' ? 3 : 1; }
    return act(a === 'scout' ? 'Send Scouts' : a === 'support' ? 'Send support' : 'Send raid', 'villages', 'send', [target, camp, units, champ, mode]);
  }
  if (a === 'found') { const n = $('#cl-name').value.trim(); if (!/^[A-Za-z0-9_]{3,24}$/.test(n)) return note('Clan names: 3 to 24 letters, digits or _.', 'bad'); return act(`Found ${n}`, 'villages', 'foundClan', [n]); }
  if (a === 'join') return act(`Join ${clanName(+t.dataset.id)}`, 'villages', 'joinClan', [+t.dataset.id]);
  if (a === 'leave') return act('Leave clan', 'villages', 'leaveClan', []);
  if (a === 'raisecap') return act('Raise clan cap', 'villages', 'raiseClanCapacity', []);
  if (a === 'invite') return act(`Invite ${nameOf(t.dataset.a)}`, 'villages', 'inviteToClan', [t.dataset.a, true]);
  if (a === 'uninvite') return act(`Withdraw invitation`, 'villages', 'inviteToClan', [t.dataset.a, false]);
  if (a === 'invname') { const v = $('#cl-inv').value.trim().toLowerCase(), p = /^0x[0-9a-f]{40}$/.test(v) ? v : ([...W.players.values()].find(x => x.name.toLowerCase() === v) || {}).addr; if (!p || !W.players.has(p)) return note(`No village called "${v}".`, 'bad'); return act(`Invite ${nameOf(p)}`, 'villages', 'inviteToClan', [p, true]); }
}
function selectHit(hit) { const k = hit.dataset.hit; S.sel = k === 'th' || k === 'walls' ? { kind: k } : k === 'field' ? { kind: 'field', i: +hit.dataset.i } : { kind: 'b', k: hit.dataset.k }; S.ui.min.vright = false; $('#vright').classList.remove('closed'); sceneDirty = true; dirty(); }

// ------------------------------------------------------------------ home page bits
function liveNote() {
  if (!G.ok) return '';
  return `Live on Sepolia: <b>${W.players.size}</b> village${W.players.size === 1 ? '' : 's'} · hamster work counter <b>${fmt(G.coreCum)}</b> · ${G.last && G.obsCount > 1 ? `last checkpoint <b>${fmt(G.lastWork)}</b> work = <b>${fmt(G.lastWork / 10)}</b> SEED per village` : 'first checkpoint recorded the baseline'} · next checkpoint in ${dur(nextDayIn())}`;
}
function homeInit() {
  $('#unitCards').innerHTML = U.map(u => `<div class="unit px"><img src="${spr(u.sprite)}" alt="${u.name}"><b>${u.name}</b><span>${u.a} attack · ${u.d} defense<br>speed ${u.s} · carry ${u.c}${u.tier ? ` · tier ${u.tier}` : ''}</span></div>`).join('');
  const rows = [['Villages', SW.ADDR.villages, 'The game: every player action'], ['Army', SW.ADDR.army, 'Troops, movements, battles, champions, camps'], ['Clans', SW.ADDR.clans, 'Clans and ranking counters'], ['SeedLedger', SW.ADDR.ledger, 'Daily checkpoint and SEED'], ['GameRules', SW.ADDR.rules, 'Costs, times and tables'], ['SqueekCore', SW.ADDR.core, "Squeekchain: the hamster's work (read only)"], ['Squeek NFT', SW.ADDR.squeek, 'Squeekchain: Squeeks held (read only)']];
  $('#contractList').innerHTML = `<table class="ctbl">${rows.map(([n, ad, r]) => `<tr><td><b>${n}</b></td><td><a href="https://sepolia.etherscan.io/address/${ad}" target="_blank" rel="noopener">${ad}</a></td><td class="muted">${r}</td></tr>`).join('')}</table>`;
}

// ------------------------------------------------------------------ start
async function init() {
  homeInit();
  document.addEventListener('click', onClick);
  document.addEventListener('input', e => { if (e.target.matches('#wright input')) updatePrediction(); if (e.target.matches('#mk-amt,#mk-to,#mk-from')) mkPreview(); });
  document.addEventListener('change', e => { if (e.target.matches('#atk-champ')) updatePrediction(); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'goto') { e.preventDefault(); $('[data-act="goto"]').click(); } if (e.key === 'Enter' && e.target.id === 'nm-in') { e.preventDefault(); $('[data-act="nm-ok"]').click(); } });
  $('#logoHome').addEventListener('click', () => { location.hash = ''; });
  $('#walletbtn').addEventListener('click', () => { if (!S.me) openWallet(); else window.open(`https://sepolia.etherscan.io/address/${S.me}`, '_blank', 'noopener'); });
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
      const tile = y * 100 + x, p = W.tiles.get(tile), k = tile;
      if (tip._k !== k) { tip.innerHTML = p ? `<b>${who(nameOf(p), p)}</b><br>(${x}|${y}) · Town Hall ${(W.ctx.get(p) || {}).th || '?'}${W.clanOf.get(p) ? ` · ${esc(clanName(W.clanOf.get(p)))}` : ''}` : CAMP_AT.has(tile) ? `<b>${CAMP_NAME[CAMP_AT.get(tile) % 3]} #${CAMP_AT.get(tile)}</b><br>(${x}|${y}) · never attacks` : `(${x}|${y}) · empty`; tip._k = k; }
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
  S.me = await SW.silent();
  route(); requestAnimationFrame(tick);
  await refresh(true);
  route();
  setInterval(() => { if (!document.hidden) refresh(); }, 20000);
}
init();
