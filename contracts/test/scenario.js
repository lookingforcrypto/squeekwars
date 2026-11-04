'use strict';
/* End-to-end scenarios for the Squeek Wars V2 contracts on a local chain (ganache, Shanghai rules).
   usage: node test/scenario.js <artifacts.json> <ganache module dir> <ethers umd path> */
const assert = require('assert');
const path = require('path');
const [ART, GANACHE, ETHERS] = process.argv.slice(2);
const A = require(path.resolve(ART));
const ganache = require(path.resolve(GANACHE));
const E = require(path.resolve(ETHERS));
const U = 10n ** 6n;
const ZERO = '0x0000000000000000000000000000000000000000';

const provider = ganache.provider({ logging: { quiet: true }, chain: { hardfork: 'shanghai', vmErrorsOnRPCResponse: true }, miner: { blockGasLimit: 300_000_000 }, wallet: { totalAccounts: 6, defaultBalance: 1_000_000 } });
const P = new E.BrowserProvider(provider);
// ganache under-estimates calls that forward a fixed gas stipend (the Squeek reads); send with a roomy limit instead
P.estimateGas = async () => 20_000_000n;
let passed = 0;
const ok = (name) => { passed++; console.log('  ✓', name); };
const errIface = new E.Interface(Object.values(A).flatMap(c => c.abi.filter(f => f.type === 'error')).filter((f, i, all) => all.findIndex(g => g.name === f.name) === i));
function findHex(x, depth = 0) {
  if (!x || depth > 6) return null;
  if (typeof x === 'string') return /^0x[0-9a-f]{8,}$/i.test(x) ? x : null;
  if (typeof x !== 'object') return null;
  for (const k of ['data', 'result', 'error', 'info', 'payload']) { const h = findHex(x[k], depth + 1); if (h) return h; }
  return null;
}
function errName(e) {
  const hex = findHex(e);
  if (hex && hex.length >= 10) { try { return errIface.parseError(hex).name; } catch (x) { } }
  return (e && (e.shortMessage || e.message)) || String(e);
}
async function reverts(p, name) { try { await (await p).wait?.(); } catch (e) { const n = errName(e); if (process.env.DEBUG && !n.includes(name)) console.log(JSON.stringify(e.error || e.info || {}, null, 1).slice(0, 1500)); assert(n.includes(name), `expected ${name}, got ${n}`); return; } assert.fail(`expected revert ${name}`); }
function plain(r) {
  if (Array.isArray(r)) {
    try { const o = r.toObject(); const ks = Object.keys(o); if (ks.length && !ks.every(k => /^\d+$/.test(k))) { for (const k of ks) o[k] = plain(o[k]); return o; } } catch (e) { }
    return [...r].map(plain);
  }
  return r;
}
async function travel(sec) { await provider.request({ method: 'evm_increaseTime', params: [sec] }); await provider.request({ method: 'evm_mine', params: [] }); }
async function now() { return (await P.getBlock('latest')).timestamp; }
async function deploy(name, signer, ...args) { const f = new E.ContractFactory(A[name].abi, A[name].bytecode, signer); const c = await f.deploy(...args); await c.waitForDeployment(); return c; }
const tx = async p => (await p).wait();
const units = (o = {}) => Array.from({ length: 16 }, (_, i) => o[i] || 0);
const tile = slot => (slot * 7919 + 1237) % 10000;

(async () => {
  const [owner, alice, bob, carol] = await Promise.all([0, 1, 2, 3].map(i => P.getSigner(i)));
  const [aA, bA] = [await alice.getAddress(), await bob.getAddress()];
  console.log('deploy');
  const core = await deploy('MockCore', owner), nft = await deploy('MockNFT', owner);
  const cfg = await deploy('GameConfig', owner, await owner.getAddress());
  const ledger = await deploy('SeedLedger', owner, await cfg.getAddress(), await core.getAddress(), await nft.getAddress());
  const clans = await deploy('Clans', owner, await cfg.getAddress());
  const army = await deploy('Army', owner, await cfg.getAddress(), await ledger.getAddress(), await clans.getAddress());
  const v = await deploy('Villages', owner, await cfg.getAddress(), await ledger.getAddress(), await clans.getAddress(), await army.getAddress());
  const G = await v.getAddress();
  for (const [n, c] of [['GameConfig', cfg], ['SeedLedger', ledger], ['Clans', clans], ['Army', army], ['Villages', v]]) {
    const code = await P.getCode(await c.getAddress()); assert((code.length - 2) / 2 < 24576, n + ' too big');
  }
  ok('five contracts deploy under the size limit');
  const V = s => v.connect(s);

  console.log('founding');
  await tx(V(alice).found('Alice_1'));
  await reverts(V(bob).found.staticCall('alice_1'), 'NameTaken');
  const va = await v.village(aA);
  assert.equal(va.tile, tile(0)); assert.equal(va.buildings[0], 1n); assert.equal(va.buildings[1], 1n);
  assert.equal((await v.stock(aA))[0], 750n * U); assert.equal(await v.seedBalance(aA), 1500n * U);
  assert(Number(va.shieldUntil) - Number(va.foundedAt) === 168 * 3600);
  ok('found: name, tile, 750 each, 1,500 SEED, 7-day shield; names are unique ignoring case');
  await tx(V(bob).found('Bob_2'));
  assert.equal((await v.village(bA)).tile, tile(1));
  ok('second village takes map slot 1');

  console.log('production and building');
  await travel(3600);
  const s1 = await v.stock(aA);
  assert(s1[0] >= 785n * U && s1[0] <= 787n * U, 'one hour of two level-1 forests is 36 wood: ' + s1[0]);
  ok('fields produce 18 per hour each');
  await tx(V(alice).orderBuild(8, 0));                       // Town Hall → 2
  const o = await v.buildOrder(aA, 0);
  assert.equal(o.level, 2n); assert.equal(o.cost[0], 315n * U); assert.equal(o.seed, 1000500000n);
  assert.equal(Number(o.readyAt) - await now(), 4050);
  await reverts(V(alice).completeBuild.staticCall(aA, 0), 'NotReady');
  await reverts(V(alice).orderBuild.staticCall(0, 1), 'FieldCappedByTownHall');
  await travel(4050);
  await tx(V(bob).completeBuild(aA, 0));                     // anyone may finish
  assert.equal((await v.village(aA)).buildings[0], 2n);
  const c0 = await clans.counters(G, aA, false, 0); assert.equal(c0.build, 315n * U + 297500000n + 315n * U + 297500000n + 1000500000n);
  ok('Town Hall 2: GameConfig cost and time, Finish by anyone, build counter');
  await tx(V(alice).orderBuild(0, 0)); await tx(V(alice).orderBuild(8 + 2, 1));   // Forest 1 → 2, Wheelhouse
  await reverts(V(alice).orderBuild.staticCall(8 + 6, 0), 'InvalidBuildSlot');
  await travel(3 * 3600);
  await tx(V(alice).completeBuild(aA, 0)); await tx(V(alice).completeBuild(aA, 1));
  assert.equal((await v.village(aA)).fields[0], 2n); assert.equal((await v.village(aA)).buildings[2], 1n);
  ok('two build slots, field level 2, Wheelhouse');

  console.log('checkpoint, SEED and the wheel');
  await travel(24 * 3600);
  await tx(core.setWork(100_000 + 8640));
  await tx(ledger.checkpoint());
  await reverts(ledger.checkpoint.staticCall(), 'AlreadyCheckpointed');
  const before = await v.seedBalance(aA);
  await tx(V(alice).claimSeed());
  assert.equal(await v.seedBalance(aA) - before, 864n * U);
  await reverts(V(alice).claimSeed.staticCall(), 'NoClaim');
  ok('checkpoint records 8,640 work; claim pays work ÷ 10 = 864 SEED once');
  await tx(V(alice).orderBuild(8 + 3, 0));                    // Storehouse: spends wood so the stock is below the cap
  const w0 = (await v.stock(aA))[0]; await travel(3600); const w1 = (await v.stock(aA))[0];
  await travel(3600); await tx(V(alice).completeBuild(aA, 0));
  const gain = Number(w1 - w0) / 1e6;     // forests 25.2 + 18 = 43.2/h, wheel bonus min(8640/4320, 25%) = +25%
  assert(gain > 53 && gain < 55, 'wheel-boosted wood per hour ' + gain);
  ok('Wheelhouse 1 caps the wheel bonus at +25%: ' + gain.toFixed(1) + ' wood/h');

  console.log('config: the owner edits the table');
  await reverts(cfg.connect(alice).setEconomy.staticCall(plain(await cfg.economy())), 'NotOwner');
  const econ = plain((await cfg.economy())); econ.seedWorkDiv = 5n; econ.marketBase = 40n; econ.plotsBase = 10n;
  await tx(cfg.setEconomy(econ));
  assert.equal((await cfg.economy()).seedWorkDiv, 5n); assert.equal(await cfg.version(), 2n);
  await travel(24 * 3600); await tx(core.setWork(100_000 + 8640 + 1000)); await tx(ledger.checkpoint());
  const b2 = await v.seedBalance(aA); await tx(V(alice).claimSeed()); assert.equal(await v.seedBalance(aA) - b2, 200n * U);
  ok('only the owner edits; SEED rate change applies to the next checkpoint (1,000 work ÷ 5 = 200)');

  console.log('research, barracks, training');
  await travel(30 * 3600);
  const bld = async (s, who, t) => { const slot = (await v.buildOrder(who, 0)).readyAt === 0n ? 0 : 1; await tx(V(s).orderBuild(t, slot)); const r = (await v.buildOrder(who, slot)).readyAt; const n = await now(); if (r > n) await travel(Number(r) - n); await tx(V(s).completeBuild(who, slot)); };
  await bld(alice, aA, 8 + 7);   // Academy
  await bld(alice, aA, 8 + 6);   // Barracks
  await bld(alice, aA, 8 + 5);   // Burrow
  await tx(V(alice).orderResearch());
  await reverts(V(alice).completeResearch.staticCall(aA), 'NotReady');
  await travel(7200); await tx(V(alice).completeResearch(aA));
  assert.equal((await v.village(aA)).tier, 1n);
  ok('Academy, research tier 1 from the tier table');
  await reverts(V(alice).train.staticCall(2, 1), 'ResearchRequired');
  await tx(V(alice).train(0, 10));
  assert.equal(await army.allocatedRoom(G, aA), 10n);
  await reverts(V(alice).train.staticCall(0, 1), 'TrainingBusyOrMissingVillage');
  await travel(10 * 900); await tx(army.completeTraining(G, aA));
  assert.equal((await army.home(G, aA))[0], 10n);
  ok('train 10 Spearmen: room, one batch at a time, Finish');

  console.log('a new unit and a new building from the table');
  await travel(30 * 3600);
  const archer = { enabled: true, tier: 0, role: 0, attack: 55, defense: 25, speed: 7, carry: 35, room: 1, seconds_: 600, cost: [40, 30, 20, 50] };
  await tx(cfg.setUnit(7, archer, 'Archer'));
  const [u7, n7] = await cfg.unit(7); assert.equal(n7, 'Archer'); assert.equal(u7.attack, 55n);
  await tx(V(alice).train(7, 5)); await travel(5 * 600); await tx(army.completeTraining(G, aA));
  assert.equal((await army.home(G, aA))[7], 5n);
  ok('unit slot 8 "Archer" added by the owner and trained');
  const tower = { enabled: true, maxLevel: 10, thCap: 1, tier: 0, effect: 1, effectPerLevel: 5, costGrowth: 150, seedGrowth: 0, timeGrowth: 140, seed: 0, seconds_: 600, cost: [50, 50, 50, 50] };
  await tx(cfg.setBuilding(11, tower, 'Watchtower'));
  await bld(alice, aA, 8 + 11);
  assert.equal((await v.armyContext(aA)).defensePct, 5n);
  await reverts(V(alice).orderBuild.staticCall(8 + 12, 0), 'BuildingDisabled');
  ok('building slot 12 "Watchtower" (+5% defense per level) added and built; unused slots stay closed');

  console.log('war: a wild camp, then a village');
  const camp = 0, ct = await v.campTile(camp); assert.equal(ct, tile(48));
  const t0 = await now();
  const sent = await tx(V(alice).send(ZERO, camp, units({ 0: 10, 7: 5 }), true, 1));
  assert.equal((await v.village(aA)).shieldUntil, BigInt((await P.getBlock(sent.blockNumber)).timestamp), 'raiding ends the shield');
  const m = await army.movement(G, 1); await travel(Number(m.arriveAt) - await now());
  const rc = await tx(army.resolve(G, 1));
  const battle = rc.logs.map(l => { try { return army.interface.parseLog(l); } catch (e) { return null; } }).find(x => x && x.name === 'Battle');
  assert(battle && battle.args.decisive, 'camp raid wins'); const rep = await army.report(G, 1);
  assert(rep.loot.some(x => x > 0n), 'camp raid loots');
  ok(`camp raid: attack ${battle.args.attack} vs defense ${battle.args.defense}, loot ${rep.loot.map(x => x / U).join('/')}`);
  const back = await army.movement(G, 1); await travel(Number(back.arriveAt) - await now()); await tx(army.resolve(G, 1));
  assert.equal((await army.movement(G, 1)).mode, 6n); assert((await army.champion(G, aA)).away === false);
  ok('the army and champion return home with the loot');
  await travel(8 * 24 * 3600);       // Bob's shield ends
  await tx(V(alice).send(bA, 0, units({ 0: 6 }), false, 1));
  const m2 = await army.movement(G, 2); await travel(Number(m2.arriveAt) - await now());
  await tx(army.resolve(G, 2));
  const r2 = await army.report(G, 2); assert(r2.resolvedAt > 0n);
  ok(`village raid: attack ${r2.attack} vs defense ${r2.defense}, decisive ${r2.decisive}`);
  const c1 = await clans.counters(G, aA, false, 0); assert(c1.loot > 0n);
  ok('loot and kill counters feed the ranking');

  console.log('war rules from the table');
  const war = plain((await cfg.war())); war.raidsPerDay = 0n; await tx(cfg.setWar(war));
  await reverts(V(alice).send.staticCall(bA, 0, units({ 0: 1 }), false, 1), 'DailyRaidLimit');
  ok('raids per day set to 0 by the owner: raids are refused');

  console.log('clans');
  const hall = plain((await cfg.building(9))[0]); hall.tier = 0n; await tx(cfg.setBuilding(9, hall, 'Clan Hall'));
  const soc = plain((await cfg.social())); soc.foundHall = 1n; await tx(cfg.setSocial(soc));
  await travel(30 * 3600); await bld(alice, aA, 8 + 9); await bld(bob, bA, 8 + 9);   // Clan Hall for both
  await tx(V(alice).foundClan('Night_Wheel'));
  await reverts(V(bob).joinClan.staticCall(1), 'NotInvited');
  await tx(V(alice).inviteToClan(bA, true)); await tx(V(bob).joinClan(1));
  assert(await clans.sameClan(G, aA, bA));
  await reverts(V(alice).send.staticCall(bA, 0, units({ 0: 1 }), false, 1), 'TargetProtected');
  ok('clan founded at the configured Clan Hall level; invite, join, clanmates cannot raid');

  console.log('Squeeks');
  await tx(nft.setBalance(aA, 2));
  const [might] = await army.championStats(G, aA); assert.equal(might, 55n);
  ok('a Squeek holder\'s champion gets +10% (Might 55)');
  console.log('chat');
  const chat = await deploy('Chat', owner, await cfg.getAddress(), G);
  const C = s => chat.connect(s);
  const said = async p => { const r = await tx(p); const l = r.logs.map(x => { try { return chat.interface.parseLog(x); } catch (e) { return null; } }).find(Boolean); return l && { name: l.name, id: l.args[0], a: [...l.args] }; };
  await reverts(C(carol).say.staticCall('hi'), 'NoVillage');
  let ev = await said(C(alice).say('Hello, burrow!'));
  assert.equal(ev.name, 'Said'); assert.equal(ev.id, 1n); assert.equal(ev.a[1], aA); assert.equal(ev.a[2], 'Hello, burrow!');
  await reverts(C(alice).say.staticCall('again'), 'TooSoon');
  await reverts(C(bob).say.staticCall(''), 'BadLength');
  await reverts(C(bob).say.staticCall('x'.repeat(281)), 'BadLength');
  ev = await said(C(bob).say('é'.repeat(140)));   // 280 bytes of UTF-8
  assert.equal(ev.id, 2n);
  await travel(16); ev = await said(C(alice).say('second')); assert.equal(ev.id, 3n);
  ok('village holders talk: 1-280 bytes, 15 s cooldown, no village no chat');
  await reverts(C(bob).announce.staticCall('Hi', 'x'), 'NotOwner');
  await reverts(C(owner).announce.staticCall('', 'x'), 'BadLength');
  ev = await said(C(owner).announce('Season 2 is open', 'Found your village.'));
  assert.equal(ev.name, 'Announced'); assert.equal(ev.id, 4n); assert.equal(ev.a[1], 'Season 2 is open');
  await reverts(C(bob).hide.staticCall(1, true), 'NotOwner');
  await reverts(C(owner).hide.staticCall(99, true), 'BadId');
  ev = await said(C(owner).hide(2, true)); assert.equal(ev.name, 'Hidden'); assert.equal(ev.id, 2n);
  await tx(C(owner).mute(bA, true)); await travel(16);
  await reverts(C(bob).say.staticCall('let me talk'), 'WalletMuted');
  await tx(C(owner).mute(bA, false)); ev = await said(C(bob).say('thanks')); assert.equal(ev.id, 5n);
  await reverts(C(owner).setCooldown.staticCall(86401), 'BadCooldown');
  await tx(C(owner).setCooldown(0)); await tx(C(alice).say('a')); await tx(C(alice).say('b'));
  ok('the rule-table owner announces, hides, mutes and sets the cooldown; nobody else can');
  await tx(cfg.connect(owner).transferOwnership(aA));
  await reverts(C(owner).announce.staticCall('old', 'x'), 'NotOwner');
  ev = await said(C(alice).announce('New owner', '')); assert.equal(ev.name, 'Announced');
  ok('chat follows a hand-over of the rule table');
  console.log(`\n${passed} checks passed`);
  process.exit(0);
})().catch(e => { console.error('FAILED:', errName(e)); console.error(e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e); process.exit(1); });
