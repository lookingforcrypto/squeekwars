// usage: node tools/rules-launch.js <ganache module dir> <site dir> <out.json>
// The rule table a GameConfig starts with (its constructor defaults), for the deployment in <site dir>/deployment.js.
// The website replays every rule change from this table to show "old → new" lines in the announcements.
// It deploys the same GameConfig bytecode on an in-process chain and reads every group, so it works for any season.
const path = require('path'), fs = require('fs');
const [GANACHE, SITE, OUT] = process.argv.slice(2);
const ganache = require(path.resolve(GANACHE));
const E = require(path.resolve(SITE, 'vendor/ethers.umd.min.js'));
const load = (f, k) => { const window = {}; eval(fs.readFileSync(path.resolve(SITE, f), 'utf8')); return window[k]; };
const ABI = load('abi.js', 'SW_ABI'), BC = load('deploy-artifacts.js', 'SW_BYTECODE'), DEP = load('deployment.js', 'SW_DEPLOY');
const plain = r => {
  if (typeof r === 'bigint') return Number(r);
  if (Array.isArray(r)) { try { const o = r.toObject(); const ks = Object.keys(o); if (ks.length && !ks.every(k => /^\d+$/.test(k))) { const out = {}; for (const k of ks) out[k] = plain(o[k]); return out; } } catch (e) { } return [...r].map(plain); }
  return r;
};
(async () => {
  const P = new E.BrowserProvider(ganache.provider({ logging: { quiet: true }, chain: { hardfork: 'shanghai' }, miner: { blockGasLimit: 300_000_000 } }));
  const s = await P.getSigner(0);
  const f = new E.ContractFactory(ABI.GameConfig, BC.GameConfig, s);
  const c = await f.deploy(await s.getAddress(), { gasLimit: 30_000_000n }); await c.waitForDeployment();
  const [units, buildings, tiers] = [await c.allUnits(), await c.allBuildings(), await c.allTiers()];
  const out = {
    config: DEP.addresses.config.toLowerCase(), version: Number(await c.version()),
    econ: plain(await c.economy()), store: plain(await c.storageRules()), war: plain(await c.war()), hero: plain(await c.hero()), wild: plain(await c.wild()), social: plain(await c.social()), fieldCost: plain(await c.fieldCosts()),
    units: plain(units[0]).map((u, i) => ({ ...u, name: units[1][i] })), buildings: plain(buildings[0]).map((b, i) => ({ ...b, name: buildings[1][i] })), tiers: plain(tiers[0]), tierCount: Number(tiers[1]),
  };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log('rule table at launch for config', out.config, '→', OUT, `(${fs.statSync(OUT).size} bytes)`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
