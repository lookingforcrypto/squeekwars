'use strict';
// Squeek Wars · the owner's rule table (owner.html). Uses the helpers of app.js, which skips the game on this page.
// Only the GameConfig owner can save: the contracts refuse every other wallet, whatever this page shows.
const LABEL = {
  startResources: 'Starting resources (each)', startSeed: 'Starting SEED', shieldHours: 'Beginner shield (hours)', fieldRate: 'Field output per hour at level 1', fieldRateGrowth: 'Field output growth per level (%)', fieldCostGrowth: 'Field cost growth per level (%)', fieldSeconds: 'Field build time at level 1 (s)', fieldTimeGrowth: 'Field time growth per level (%)', fieldMaxLevel: 'Field max level (≤ 20)', thBuildCutPct: 'Build time cut per Town Hall level (%)', plotsBase: 'Plots = this + Town Hall level', plotsMax: 'Most plots', cancelRefundPct: 'Cancel refund (%)', upkeepMilli: 'Food per troop room per hour (thousandths)', barracksTimePct: 'Training time × this % per Barracks level', marketBase: 'Market: 100 gives (level 1)', marketPerLevel: 'Market: extra per level', boostSeed: 'Output boost price (SEED)', boostPct: 'Output boost (%)', boostHours: 'Output boost length (hours)', peaceSeed: 'Peace shield price (SEED)', peaceHours: 'Peace shield length (hours)', peaceCooldownHours: 'Peace shield cooldown (hours)', bannerSeed: 'Banner price (SEED)', squeekBuildPct: 'Most build time Squeeks cut (%)', squeekWorkTarget: 'Day work for the full Squeek cut', seedWorkDiv: 'SEED per village = day work ÷', wheelWorkDiv: 'Wheel bonus = day work ÷', wheelPctPerLevel: 'Wheel bonus cap per Wheelhouse level (%)', xpWorkDiv: 'Champion XP per day = work ÷', xpDailyCap: '… at most',
  storeBase: 'Storage without a Storehouse', storePer: 'Storehouse level 1 adds', storeGrowth: '… growing per level (%)', vaultBase: 'Protected without a Vault', vaultPer: 'Vault level 1 adds', vaultGrowth: '… growing per level (%)', roomBase: 'Troop room without a Burrow', roomPer: 'Burrow: room per level × level', roomGrowth: '… growing per level (%)',
  winRatioPct: 'Attack must reach this % of defense to win', lossPct: 'Loss rate (% of enemy ÷ own power)', scoutBonusPct: 'Scouting attack bonus (%)', scoutHours: 'Scouting bonus length (hours)', raidsPerDay: 'Raids per attacker and target per day', weakGap: 'Weak target: Town Hall this many levels lower', weakLootPct: 'Weak target loot (%)', siegePerWall: 'Siege units per Walls level knocked down', maxWallDamage: 'Most Walls levels per battle', repairHours: 'Walls repair: hours per level', thGuard: 'Defense per Town Hall level', forgePct: 'Forge: attack/defense % per level', wallsPct: 'Walls: defense % per level', maxSupport: 'Support groups a village can host', campDamagePct: 'Lost camp raid: % of attack removed from its defense',
  mightBase: 'Might at 0 points', mightPerPoint: 'Might per point', attackPerPointMilli: 'Attack bonus per point (millionths)', defensePerPointMilli: 'Defense bonus per point (millionths)', carryPerPointMilli: 'Carry bonus per point (millionths)', statCap: 'Most points per bonus', pointsPerLevel: 'Points per level', maxLevel: 'Max level', xpPerLevel: 'Level = 1 + √(XP ÷ this)', squeekPct: 'Squeek holder XP and stats (%)', killXpDiv: 'XP = killed value ÷ this',
  defenseBase: 'Defense at day 0', defensePerDay: 'Defense added per day', defenseCap: 'Defense cap', stockBase: 'Stock per hour at day 0', stockPerDay: 'Stock per hour added per day', stockHours: 'Stock cap (hours of output)', regrowHours: 'Defenders regrow after (hours)', sizePct: 'Small / normal / large size (%)', lossValueNum: 'Killed value per defense ×', lossValueDen: '… ÷',
  joinHall: 'Clan Hall level to join', foundHall: 'Clan Hall level to found', capPerHall: 'Members per Clan Hall level', maxMembers: 'Most members',
};
const GROUPS = [['economy', 'Economy', 'setEconomy', 'econ'], ['storageRules', 'Storage, Vault and Burrow', 'setStorage', 'store'], ['war', 'War', 'setWar', 'war'], ['hero', 'Champion', 'setHero', 'hero'], ['wild', 'Wild camps', 'setWild', 'wild'], ['social', 'Clans', 'setSocial', 'social']];
const comps = fn => SW.IF.config.getFunction(fn).outputs[0].components;
const numIn = (id, v, extra = '') => `<input type="number" id="${id}" value="${v}" min="0" step="any" ${extra}>`;
function adminPage() {
  if (!SW.D) return `<h2>Rule table</h2><div class="px box"><p class="muted">Season 2 is not deployed yet.</p></div>`;
  if (!CFG) return `<h2>Rule table</h2><div class="px box"><p class="muted">Reading the rule table…</p></div>`;
  if (!S.me) return `<h2>Rule table</h2><div class="px box"><p class="muted">This page is only for the owner of the season. Connect the owner wallet to open the rule table.</p><button class="btn" data-act="o-connect" type="button">Connect wallet</button><p class="why" id="o-msg"></p></div>`;
  if (!isOwner()) return `<h2>Rule table</h2><div class="px box"><p class="muted">This page is only for the owner of the season. The wallet ${shortAddr(S.me)} is not the owner, so there is nothing to edit here.</p><div class="row" style="justify-content:flex-start;gap:8px"><button class="btn ghost sm" data-act="o-switch" type="button">Switch account</button><a class="btn ghost sm" href="index.html#village">Back to the game</a></div></div>`;
  let h = `<h2>Rule table</h2><p class="sub">Every number of the season, version ${CFG.version}. Each Save is one transaction from your wallet; it applies from the next action on and shows up in the public change log.</p>`;
  for (const [fn, title, setter, key] of GROUPS) {
    const cs = comps(fn), val = CFG[key];
    h += `<details class="px box adm"><summary><h3>${title}</h3></summary><table class="kv adm-t">${cs.map(c => `<tr><td>${esc(LABEL[c.name] || c.name)}</td><td>${c.type.endsWith(']') ? val[c.name].map((x, i) => numIn(`cf-${key}-${c.name}-${i}`, x, 'style="width:70px"')).join(' ') : numIn(`cf-${key}-${c.name}`, val[c.name])}</td></tr>`).join('')}</table><button class="btn" data-act="cfsave" data-g="${key}" data-fn="${fn}" data-set="${setter}">Save ${title.toLowerCase()}</button></details>`;
  }
  h += `<details class="px box adm"><summary><h3>Field costs</h3></summary><div class="tblwrap"><table class="tbl"><thead><tr><th>Field</th>${RES.map(r => `<th>${RES_NAME[r]}</th>`).join('')}</tr></thead><tbody>${CFG.fieldCost.map((row, i) => `<tr><td>${FIELD_TYPE[i]}</td>${row.map((x, j) => `<td>${numIn(`fc-${i}-${j}`, x, 'style="width:70px"')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><button class="btn" data-act="fcsave">Save field costs</button></details>`;
  const uc = comps('unit').filter(c => c.name !== 'cost'), roleSel = (id, v) => `<select id="${id}">${ROLE_NAME.map((r, i) => `<option value="${i}" ${v === i ? 'selected' : ''}>${r}</option>`).join('')}</select>`;
  h += `<details class="px box adm"><summary><h3>Units · 16 slots</h3></summary><p class="muted">Turn a slot on, name it and set its numbers. Tier = research tier needed. Role: scouts scout and fight scouts, siege knocks down Walls.</p><div class="tblwrap"><table class="tbl adm-u"><thead><tr><th>#</th><th>Name</th>${uc.map(c => `<th>${c.name.replace('_', '')}</th>`).join('')}<th>Cost W / F / S / I</th><th></th></tr></thead><tbody>`;
  h += CFG.units.map(u => `<tr><td>${u.i + 1}</td><td><input id="un-${u.i}-name" value="${esc(u.name)}" maxlength="32" style="width:120px"></td>${uc.map(c => `<td>${c.type === 'bool' ? `<input type="checkbox" id="un-${u.i}-${c.name}" ${u[c.name] ? 'checked' : ''}>` : c.name === 'role' ? roleSel(`un-${u.i}-role`, u.role) : numIn(`un-${u.i}-${c.name}`, u[c.name], 'style="width:64px"')}</td>`).join('')}<td>${u.cost.map((x, j) => numIn(`un-${u.i}-cost-${j}`, x, 'style="width:56px"')).join('')}</td><td><button class="btn sm" data-act="unsave" data-i="${u.i}">Save</button></td></tr>`).join('');
  h += `</tbody></table></div></details>`;
  const bc = comps('building').filter(c => c.name !== 'cost'), fxSel = (id, v) => `<select id="${id}">${FX_NAME.map((r, i) => `<option value="${i}" ${v === i ? 'selected' : ''}>${r}</option>`).join('')}</select>`, capSel = (id, v) => `<select id="${id}">${['no cap', '≤ TH', '≤ 2 × TH'].map((r, i) => `<option value="${i}" ${v === i ? 'selected' : ''}>${r}</option>`).join('')}</select>`;
  h += `<details class="px box adm"><summary><h3>Buildings · 16 slots</h3></summary><p class="muted">Slots 1–11 keep their built-in role (Town Hall … Market). Every slot can add an effect per level. Players can put any enabled building on any free plot of their village. Growth values are % per level (162 = ×1.62).</p><div class="tblwrap"><table class="tbl adm-u"><thead><tr><th>#</th><th>Name</th>${bc.map(c => `<th>${c.name.replace('_', '')}</th>`).join('')}<th>Cost W / F / S / I</th><th></th></tr></thead><tbody>`;
  h += CFG.buildings.map(b => `<tr><td>${b.i + 1}</td><td><input id="bk-${b.i}-name" value="${esc(b.name)}" maxlength="32" style="width:120px"></td>${bc.map(c => `<td>${c.type === 'bool' ? `<input type="checkbox" id="bk-${b.i}-${c.name}" ${b[c.name] ? 'checked' : ''}>` : c.name === 'effect' ? fxSel(`bk-${b.i}-effect`, b.effect) : c.name === 'thCap' ? capSel(`bk-${b.i}-thCap`, b.thCap) : numIn(`bk-${b.i}-${c.name}`, b[c.name], 'style="width:64px"')}</td>`).join('')}<td>${b.cost.map((x, j) => numIn(`bk-${b.i}-cost-${j}`, x, 'style="width:56px"')).join('')}</td><td><button class="btn sm" data-act="bksave" data-i="${b.i}">Save</button></td></tr>`).join('');
  h += `</tbody></table></div></details>`;
  h += `<details class="px box adm"><summary><h3>Research tiers</h3></summary><p class="muted">Cost and SEED are whole amounts per resource. A tier's bonuses add up with the tiers below it (medicine takes the best).</p><div class="row" style="justify-content:flex-start;gap:8px"><label>Tiers in play ${numIn('tr-count', CFG.tierCount, 'style="width:56px" max="8"')}</label><button class="btn sm" data-act="tcsave">Save tier count</button></div><div class="tblwrap"><table class="tbl adm-u"><thead><tr><th>Tier</th><th>Cost each</th><th>SEED</th><th>Seconds</th><th>Academy</th><th>Carry %</th><th>Speed %</th><th>Medicine %</th><th></th></tr></thead><tbody>${CFG.tiers.map((x, i) => `<tr><td>${i + 1}</td><td>${numIn(`ti-${i}-cost`, x.costEachUnit / UNIT, 'style="width:80px"')}</td><td>${numIn(`ti-${i}-seed`, x.seedUnit / UNIT, 'style="width:80px"')}</td><td>${numIn(`ti-${i}-seconds_`, x.seconds_, 'style="width:80px"')}</td><td>${numIn(`ti-${i}-academy`, x.academy, 'style="width:56px"')}</td><td>${numIn(`ti-${i}-carryPct`, x.carryPct, 'style="width:56px"')}</td><td>${numIn(`ti-${i}-speedPct`, x.speedPct, 'style="width:56px"')}</td><td>${numIn(`ti-${i}-medicinePct`, x.medicinePct, 'style="width:56px"')}</td><td><button class="btn sm" data-act="tisave" data-i="${i + 1}">Save</button></td></tr>`).join('')}</tbody></table></div></details>`;
  h += `<details class="px box adm"><summary><h3>Owner and Squeekchain</h3></summary><div class="mkt"><label>SqueekCore<input id="rd-core" value="${SW.ADDR.core}" maxlength="42"></label><label>Squeek NFT<input id="rd-nft" value="${SW.ADDR.squeek}" maxlength="42"></label><button class="btn sm" data-act="rdsave">Point the game here</button></div><p class="muted">Only if Squeekchain moves its contracts. A new SqueekCore starts counting from its current work.</p><div class="mkt" style="margin-top:10px"><label>New owner<input id="own-to" maxlength="42" placeholder="0x…"></label><button class="btn sm ghost" data-act="ownsave">Hand over the rule table</button></div><p class="why">Handing over is final: the new wallet gets every power above.</p></details>`;
  return h + verifyBox() + changeLog();
}

const val = id => { const el = document.getElementById(id); if (!el) throw new Error('missing field ' + id); return el.type === 'checkbox' ? el.checked : el.tagName === 'SELECT' ? +el.value : el.value === '' ? NaN : +el.value; };
function intOf(x, label) { if (!Number.isFinite(x) || x < 0 || Math.floor(x) !== x) throw new Error(`${label}: use a whole number of 0 or more.`); return x; }
function saveGroup(key, fn, setter, title) {
  const o = {};
  for (const c of comps(fn)) o[c.name] = c.type.endsWith(']') ? CFG[key][c.name].map((_, i) => intOf(val(`cf-${key}-${c.name}-${i}`), LABEL[c.name] || c.name)) : intOf(val(`cf-${key}-${c.name}`), LABEL[c.name] || c.name);
  return ownerAct(`Save ${title}`, 'config', setter, [o]);
}
// ------------------------------------------------------------------ the source code on Etherscan
// verify/input.json is the exact compiler input of the deployed code (contracts/tools/verify-input.js); the key goes only to Etherscan
const ES_API = 'https://api.etherscan.io/v2/api', ES_CHAIN = 11155111;
const ES_LIST = [['GameConfig', 'config'], ['SeedLedger', 'ledger'], ['Clans', 'clans'], ['Army', 'army'], ['Villages', 'villages']].concat(SW.ADDR.chat ? [['Chat', 'chat']] : []);
const esState = {}; let esBusy = false;
const esSleep = ms => new Promise(r => setTimeout(r, ms));
function verifyBox() {
  const scan = a => `https://sepolia.etherscan.io/address/${a}#code`, src = a => `https://repo.sourcify.dev/${ES_CHAIN}/${SW.E.getAddress(a)}`;
  return `<details class="px box adm"><summary><h3>Source code on Etherscan</h3></summary><p class="muted">The game contracts are verified on Sourcify. To show the same source on Etherscan, paste an Etherscan API key (free at <a href="https://etherscan.io/myapikey" target="_blank" rel="noopener">etherscan.io/myapikey</a>) and press Verify on a contract, or verify them all at once. A contract that is already verified just shows ✓. The key stays in this tab and is sent only to Etherscan.</p>`
    + `<div class="mkt"><label>Etherscan API key<input id="es-key" type="password" autocomplete="off" spellcheck="false"></label><button class="btn sm" data-act="esverify" ${esBusy ? 'disabled' : ''}>Verify them all on Etherscan</button></div>`
    + `<table class="kv">${ES_LIST.map(([n, k]) => `<tr><td>${n}</td><td><a href="${scan(SW.ADDR[k])}" target="_blank" rel="noopener">Etherscan</a> · <a href="${src(SW.ADDR[k])}" target="_blank" rel="noopener">Sourcify</a></td><td><button class="btn sm ghost" data-act="esverify1" data-k="${k}" type="button">Verify</button></td><td id="es-st-${k}">${esState[k] || ''}</td></tr>`).join('')}</table>`
    + `<p class="muted" style="font-size:17px">By hand instead: on each contract's Etherscan page choose Contract → Verify and Publish → Solidity (Standard-Json-Input), compiler v0.8.26+commit.8a97fa7a, MIT, upload <a href="verify/input.json" download>input.json</a> (Chat: <a href="verify/input-chat.json" download>input-chat.json</a>), and paste the contract's constructor arguments from <a href="verify/contracts.json" target="_blank">contracts.json</a>.</p></details>`;
}
async function esVerify(only) {          // only: one contract key, or every contract
  const key = ($('#es-key').value || '').trim(); if (!key) return note('Paste your Etherscan API key first.', 'bad');
  if (esBusy) return note('Wait for the verification that is running.', 'bad'); esBusy = true;
  document.querySelectorAll('[data-act="esverify"],[data-act="esverify1"]').forEach(b => { b.disabled = true; });
  const set = (k, h) => { esState[k] = h; const el = document.getElementById('es-st-' + k); if (el) el.innerHTML = h; };
  const ok = '<span class="ok">✓ verified</span>', bad = m => `<span class="bad">${esc(m)}</span>`;
  try {
    const meta = await fetch('verify/contracts.json', { cache: 'no-store' }).then(r => r.json()), inputs = {};
    for (const c of meta.contracts.filter(x => !only || x.key === only)) {
      const file = c.input || 'input.json'; if (!inputs[file]) inputs[file] = await fetch('verify/' + file, { cache: 'no-store' }).then(r => r.json());
      const input = inputs[file];
      if (c.address.toLowerCase() !== String(SW.ADDR[c.key]).toLowerCase()) { set(c.key, bad('verify files are for another deployment')); continue; }
      set(c.key, 'Sending…');
      try {
        const body = new URLSearchParams({ module: 'contract', action: 'verifysourcecode', apikey: key, contractaddress: c.address, sourceCode: JSON.stringify(input), codeformat: 'solidity-standard-json-input', contractname: c.id, compilerversion: meta.compiler, constructorArguements: c.ctorArgs, licenseType: '3' });
        const j = await fetch(`${ES_API}?chainid=${ES_CHAIN}`, { method: 'POST', body }).then(r => r.json());
        if (j.status !== '1') { set(c.key, /already verified/i.test(j.result || '') ? ok : bad(j.result || j.message || 'Refused')); continue; }
        set(c.key, 'Etherscan is compiling…');
        for (let i = 0; i < 40; i++) {
          await esSleep(4000);
          const s = await fetch(`${ES_API}?chainid=${ES_CHAIN}&module=contract&action=checkverifystatus&guid=${encodeURIComponent(j.result)}&apikey=${encodeURIComponent(key)}`).then(r => r.json());
          if (/pending|queue/i.test(s.result || '')) continue;
          set(c.key, /^pass|already verified/i.test(s.result || '') ? ok : bad(s.result || 'Failed')); break;
        }
      } catch (e) { set(c.key, bad(e.message || String(e))); }
    }
  } finally { esBusy = false; document.querySelectorAll('[data-act="esverify"],[data-act="esverify1"]').forEach(b => { b.disabled = false; }); }
}
async function ownerAct(label, c, fn, args) {
  if (!S.me) return false;
  if (busyTx) { note('Wait for the last transaction to finish.', 'bad'); return false; }
  busyTx = true; let ok = false;
  try { await SW.send(c, fn, args, (st, hash) => showTx(label, st, hash)); ok = true; await ownerLoad(); }
  catch (e) { showTx(label, 'error', null, e.message || String(e)); }
  finally { busyTx = false; ownerRender(); }
  return ok;
}
async function ownerLoad() {
  if (!SW.D) return;
  try { const logs = await SW.syncLogs(); processLogs(logs); await loadConfig(); }
  catch (e) { console.warn(e); note('Could not reach the chain: ' + SW.explain(e), 'bad'); }
}
let ownerKey = '';
function ownerRender() {
  const wb = $('#walletbtn'); wb.textContent = S.me ? shortAddr(S.me) : 'Connect';
  const k = `${CFG && CFG.version}:${S.me}:${isOwner()}:${W.changes.length}`; if (k === ownerKey) return;
  const open = [...document.querySelectorAll('#admin details[open] summary h3')].map(e => e.textContent);
  setHTML($('#admin'), adminPage());
  document.querySelectorAll('#admin details summary h3').forEach(e => { if (open.includes(e.textContent)) e.closest('details').open = true; });
  ownerKey = k;
}
async function ownerConnect() {
  try { S.me = await SW.connect(); S.ui.off = false; saveUI(); note(`Wallet ${shortAddr(S.me)} connected`, 'ok'); }
  catch (e) { const m = $('#o-msg'); if (m) m.textContent = e.message || String(e); else note(e.message || String(e), 'bad'); }
  ownerRender();
}
function ownerClick(e) {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (a === 'txclose') { $('#txbox').hidden = true; return; }
  if (a === 'o-connect') return ownerConnect();
  if (a === 'esverify') return esVerify();
  if (a === 'esverify1') return esVerify(t.dataset.k);
  if (a === 'o-switch' || a === 'wm-switch') { $('#walletmenu').hidden = true; SW.switchAccount().then(acc => { S.me = acc; S.ui.off = false; saveUI(); ownerRender(); }).catch(err => note(err.message || String(err), 'bad')); return; }
  if (a === 'wm-off') { $('#walletmenu').hidden = true; SW.disconnect().then(() => { S.me = null; S.ui.off = true; saveUI(); note('Wallet disconnected'); ownerRender(); }); return; }
  if (a === 'wm-scan') { $('#walletmenu').hidden = true; if (SW.D && !SW.D.local) window.open(`https://sepolia.etherscan.io/address/${S.me}`, '_blank', 'noopener'); return; }
  try {
    if (a === 'cfsave') { const gr = GROUPS.find(x => x[3] === t.dataset.g); return saveGroup(gr[3], gr[0], gr[2], gr[1].toLowerCase()); }
    if (a === 'fcsave') return ownerAct('Save field costs', 'config', 'setFieldCosts', [[0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => intOf(val(`fc-${i}-${j}`), 'Field cost')))]);
    if (a === 'unsave') { const i = +t.dataset.i, o = {}; for (const c of comps('unit')) o[c.name] = c.name === 'cost' ? [0, 1, 2, 3].map(j => intOf(val(`un-${i}-cost-${j}`), 'Cost')) : c.type === 'bool' ? val(`un-${i}-${c.name}`) : intOf(val(`un-${i}-${c.name}`), c.name); return ownerAct(`Save unit ${i + 1}`, 'config', 'setUnit', [i, o, $(`#un-${i}-name`).value.trim()]); }
    if (a === 'bksave') { const i = +t.dataset.i, o = {}; for (const c of comps('building')) o[c.name] = c.name === 'cost' ? [0, 1, 2, 3].map(j => intOf(val(`bk-${i}-cost-${j}`), 'Cost')) : c.type === 'bool' ? val(`bk-${i}-${c.name}`) : intOf(val(`bk-${i}-${c.name}`), c.name); return ownerAct(`Save building ${i + 1}`, 'config', 'setBuilding', [i, o, $(`#bk-${i}-name`).value.trim()]); }
    if (a === 'tisave') { const i = +t.dataset.i, r = i - 1; const big = x => BigInt(Math.round(intOf(x, 'Cost') * UNIT)); return ownerAct(`Save research tier ${i}`, 'config', 'setTier', [i, { costEachUnit: big(val(`ti-${r}-cost`)), seedUnit: big(val(`ti-${r}-seed`)), seconds_: intOf(val(`ti-${r}-seconds_`), 'Seconds'), academy: intOf(val(`ti-${r}-academy`), 'Academy'), carryPct: intOf(val(`ti-${r}-carryPct`), 'Carry'), speedPct: intOf(val(`ti-${r}-speedPct`), 'Speed'), medicinePct: intOf(val(`ti-${r}-medicinePct`), 'Medicine') }]); }
    if (a === 'tcsave') return ownerAct('Save tier count', 'config', 'setTierCount', [intOf(val('tr-count'), 'Tiers')]);
    if (a === 'rdsave') return ownerAct('Point the game at Squeekchain', 'ledger', 'setReaders', [$('#rd-core').value.trim(), $('#rd-nft').value.trim()]);
    if (a === 'ownsave') { const to = $('#own-to').value.trim(); if (!/^0x[0-9a-fA-F]{40}$/.test(to)) return note('Paste a full 0x address.', 'bad'); if (!confirm(`Hand the rule table to ${to}? This cannot be undone from this wallet.`)) return; return ownerAct('Hand over the rule table', 'config', 'transferOwnership', [to]); }
  } catch (err) { note(err.message || String(err), 'bad'); }
}
async function ownerInit() {
  document.addEventListener('click', ownerClick);
  $('#walletbtn').addEventListener('click', e => { e.stopPropagation(); if (!S.me) { ownerConnect(); return; } const m = $('#walletmenu'); m.hidden = !m.hidden; if (!m.hidden) $('#wm-addr').textContent = S.me; });
  document.addEventListener('click', e => { const m = $('#walletmenu'); if (!m.hidden && !m.contains(e.target) && e.target.id !== 'walletbtn') m.hidden = true; });
  SW.onAccounts(acc => { S.me = acc; ownerRender(); });
  S.me = S.ui.off ? null : await SW.silent();
  ownerRender();
  await ownerLoad(); ownerRender();
  setInterval(() => { if (!document.hidden) ownerLoad().then(ownerRender); }, 30000);
}
ownerInit();
