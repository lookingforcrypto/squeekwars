'use strict';
/* Squeek Wars · chain layer.
   Reads Sepolia from the browser through public RPCs (with fallback) and Multicall3.
   Every write is signed by the player's own wallet (EIP-1193). No server, no keys, no indexer. */
const SW = (() => {
  const E = window.ethers;
  const CHAIN_ID = 11155111, CHAIN_HEX = '0xaa36a7', DEPLOY_BLOCK = 12060202;
  const RPCS = ['https://ethereum-sepolia-rpc.publicnode.com', 'https://rpc.sepolia.ethpandaops.io', 'https://sepolia.gateway.tenderly.co', 'https://sepolia.rpc.sentio.xyz'];
  const ADDR = {
    villages: '0x68dcfbff8b40429be1effaa63e82ea5200c87aec',
    army: '0x3cba4215e531ee3c4c3daa045d15803505d282e0',
    clans: '0xb789d7a3c8bb07ca1bd8811f10ee47f270d93fe1',
    ledger: '0x11d4a8126b7911bda323e4c6dc8b137bf01ba2b9',
    rules: '0xfbe6911fbaa2fdfd91ef91887f30b0d3ba8f9d15',
    core: '0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44',
    squeek: '0xcb98349c134ab983da5bfd80527dfe2552bdb70f',
    multicall: '0xcA11bde05977b3631167028862bE2a173976CA11',
  };
  const A = window.SW_ABI;
  const IF = {
    villages: new E.Interface(A.Villages), army: new E.Interface(A.Army), clans: new E.Interface(A.Clans),
    ledger: new E.Interface(A.SeedLedger), rules: new E.Interface(A.GameRules),
    core: new E.Interface(['function state() view returns ((uint64 settledThroughRound,uint64 cumulativeWork,uint96 cumulativeBlockUnits,uint64 blockHeight,uint96 blockProgress,uint32 workPerThousandBlocks,uint256 authorizationNonce,bool paused))']),
    multicall: new E.Interface(['function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)']),
  };
  const ERR = new E.Interface([...new Map([...A.Villages, ...A.Army, ...A.Clans, ...A.SeedLedger, ...A.GameRules]
    .filter(f => f.type === 'error').map(f => [f.name, f])).values()]);

  // ---------------------------------------------------------------- reads
  let rpcAt = 0, rid = 1;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function rpc(method, params) {
    let last;
    for (let k = 0; k < RPCS.length; k++) {
      const i = (rpcAt + k) % RPCS.length;
      try {
        const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 15000);
        const r = await fetch(RPCS[i], { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: rid++, method, params }), signal: ctl.signal });
        clearTimeout(to);
        const j = await r.json();
        if (j.error) {
          const msg = j.error.message || 'RPC error';
          if (j.error.data !== undefined || /revert/i.test(msg)) { const e = new Error(msg); e.data = j.error.data; e.revert = true; throw e; }
          throw new Error(msg);
        }
        rpcAt = i; return j.result;
      } catch (e) { if (e.revert) throw e; last = e; }
    }
    throw last || new Error('No Sepolia RPC answered.');
  }
  const unwrap = r => (r && r.length === 1 ? r[0] : r);
  async function call(c, fn, args = [], from) {
    const res = await rpc('eth_call', [{ to: ADDR[c], data: IF[c].encodeFunctionData(fn, args), ...(from ? { from } : {}) }, 'latest']);
    return unwrap(IF[c].decodeFunctionResult(fn, res));
  }
  // calls: [[contract, fn, args], …] → results in order, null where a call failed
  async function multi(calls) {
    const out = [];
    for (let i = 0; i < calls.length; i += 120) {
      const part = calls.slice(i, i + 120);
      const enc = part.map(([c, fn, args]) => ({ target: ADDR[c], allowFailure: true, callData: IF[c].encodeFunctionData(fn, args || []) }));
      const res = await rpc('eth_call', [{ to: ADDR.multicall, data: IF.multicall.encodeFunctionData('aggregate3', [enc]) }, 'latest']);
      const [rows] = IF.multicall.decodeFunctionResult('aggregate3', res);
      rows.forEach((r, j) => {
        const [c, fn] = part[j];
        if (!r.success) { out.push(null); return; }
        try { out.push(unwrap(IF[c].decodeFunctionResult(fn, r.returnData))); } catch (e) { out.push(null); }
      });
    }
    return out;
  }
  async function head() {
    const b = await rpc('eth_getBlockByNumber', ['latest', false]);
    return { number: parseInt(b.number, 16), time: parseInt(b.timestamp, 16) };
  }

  // ---------------------------------------------------------------- events (cached in this browser)
  const TOPIC = {};
  for (const c of ['villages', 'army', 'clans', 'ledger']) IF[c].forEachEvent(ev => { TOPIC[ev.topicHash] = c; });
  const LOG_KEY = 'sw-logs-v1-' + ADDR.villages;
  const plain = v => typeof v === 'bigint' ? (v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v.toString())
    : Array.isArray(v) ? v.map(plain) : v;
  let LOGS = (() => { try { const j = JSON.parse(localStorage.getItem(LOG_KEY)); if (j && Array.isArray(j.logs)) return j; } catch (e) { } return { to: DEPLOY_BLOCK - 1, logs: [] }; })();
  let syncing = null;
  function syncLogs() {
    if (syncing) return syncing;
    syncing = (async () => {
      const top = parseInt(await rpc('eth_blockNumber', []), 16);
      const seen = new Set(LOGS.logs.map(l => l.k));
      let from = Math.max(DEPLOY_BLOCK, LOGS.to - 12);           // re-read the last blocks in case of a reorg
      while (from <= top) {
        const to = Math.min(top, from + 39999);
        const raw = await rpc('eth_getLogs', [{ fromBlock: '0x' + from.toString(16), toBlock: '0x' + to.toString(16), address: [ADDR.villages, ADDR.army, ADDR.clans, ADDR.ledger] }]);
        for (const l of raw) {
          const c = TOPIC[l.topics[0]]; if (!c) continue;
          const k = l.transactionHash + ':' + parseInt(l.logIndex, 16); if (seen.has(k)) continue;
          let p; try { p = IF[c].parseLog(l); } catch (e) { continue; }
          const a = {}; p.fragment.inputs.forEach((inp, i) => { a[inp.name] = plain(p.args[i]); });
          LOGS.logs.push({ k, c, n: p.name, a, b: parseInt(l.blockNumber, 16), i: parseInt(l.logIndex, 16), tx: l.transactionHash });
          seen.add(k);
        }
        LOGS.to = to; from = to + 1;
      }
      LOGS.logs.sort((x, y) => x.b - y.b || x.i - y.i);
      try { localStorage.setItem(LOG_KEY, JSON.stringify(LOGS)); } catch (e) { }
      return LOGS.logs;
    })().finally(() => { syncing = null; });
    return syncing;
  }

  // ---------------------------------------------------------------- wallet and writes
  let account = null;
  const eth = () => window.ethereum;
  async function ensureChain() {
    const id = await eth().request({ method: 'eth_chainId' });
    if (parseInt(id, 16) === CHAIN_ID) return;
    try { await eth().request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_HEX }] }); }
    catch (e) {
      if (e && e.code === 4902) await eth().request({ method: 'wallet_addEthereumChain', params: [{ chainId: CHAIN_HEX, chainName: 'Sepolia', nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: [RPCS[0]], blockExplorerUrls: ['https://sepolia.etherscan.io'] }] });
      else throw new Error('Switch your wallet to the Sepolia network to play.');
    }
  }
  async function connect() {
    if (!eth()) throw new Error('No wallet found in this browser. Install MetaMask or Rabby, or open the site in your wallet app.');
    const acc = await eth().request({ method: 'eth_requestAccounts' });
    account = acc && acc[0] ? acc[0].toLowerCase() : null;
    if (!account) throw new Error('The wallet gave no account.');
    await ensureChain();
    return account;
  }
  async function silent() {
    if (!eth()) return null;
    try { const acc = await eth().request({ method: 'eth_accounts' }); account = acc && acc[0] ? acc[0].toLowerCase() : null; } catch (e) { account = null; }
    return account;
  }
  function onAccounts(fn) { if (eth() && eth().on) { eth().on('accountsChanged', a => { account = a && a[0] ? a[0].toLowerCase() : null; fn(account); }); eth().on('chainChanged', () => fn(account)); } }

  const WHY = {
    AcademyTooLow: 'Your Academy is too low for this research tier.',
    AlreadyBuildingTarget: 'That is already being built in your other slot.',
    AlreadyCheckpointed: "Today's checkpoint is already recorded.",
    AlreadyInClan: 'You are already in a clan.',
    AlreadyRegisteredOrInvalidPlayer: 'This wallet already has a village.',
    BannerAlreadyOwned: 'You already own the banner.',
    BoostActiveOrInvalidResource: 'An output boost is still running.',
    BuildingCappedByTownHall: 'Upgrade the Town Hall first: a building cannot pass its level (Storehouse and Vault: twice its level).',
    CannotCancelCompletedBuild: 'That build is finished: press Finish instead.',
    CannotJoin: 'You cannot join this clan.',
    CannotRaiseCapacity: 'Upgrade the Clan Hall to raise the member cap.',
    CannotRecallSupport: 'Those troops cannot be recalled.',
    ChampionAway: 'Your champion is away with an army.',
    ClanFullOrMissing: 'That clan is full or does not exist.',
    ClanHall3Required: 'Founding a clan needs Clan Hall level 3.',
    ClanNameTaken: 'That clan name is taken.',
    DailyRaidLimit: 'You already raided this target 3 times today.',
    ExternalReadFailed: 'Squeekchain could not be read right now. Try again in a minute.',
    FieldCappedByTownHall: 'Upgrade the Town Hall first: a field cannot pass its level.',
    FounderLeavesLast: 'The founder leaves last.',
    InsufficientBurrowRoom: 'Not enough Burrow room: build or upgrade the Burrow.',
    InsufficientChampionPoints: 'Not enough free champion points.',
    InsufficientResources: 'Not enough resources.',
    InsufficientSeed: 'Not enough SEED.',
    InsufficientStorage: 'That would not fit in your storage.',
    InsufficientTroops: 'You do not have those troops at home.',
    InvalidBuildSlot: 'That build slot is busy.',
    InvalidExchange: 'Choose two different resources and an amount.',
    InvalidNameCharacter: 'Names use letters, digits and _ only.',
    InvalidNameLength: 'Names are 3 to 16 characters (clans 3 to 24).',
    InvalidSupport: 'Support goes only to clanmates, without the champion, one group per village.',
    InvalidTraining: 'Build Barracks and research that unit first, then train at least one.',
    InvalidTroopCount: 'Choose at least one unit.',
    MarketRequired: 'Build a Market first.',
    MaxLevel: 'Already at the maximum level.',
    MissingTarget: 'There is no village there.',
    MissingVillage: 'Found a village first.',
    MovementNotArrived: 'That army has not arrived yet.',
    NameTaken: 'That name is taken.',
    NoClaim: 'Nothing to claim yet: the next checkpoint brings new SEED.',
    NoPlotAvailable: 'No free plot: upgrade the Town Hall.',
    NoVillage: 'Found a village first.',
    NotInClan: 'You are not in a clan.',
    NotInvited: 'You need an invitation from the clan founder.',
    NotReady: 'Not finished yet.',
    OnlyFounderInvites: 'Only the clan founder can invite.',
    OnlyScoutsReconnoitre: 'Scouting missions send Scouts only.',
    PeaceCooldown: 'The peace shield can be bought once every 3 days.',
    PointsCannotBeReassigned: 'Champion points cannot be moved once spent.',
    ResearchBusy: 'Research is already running.',
    ResearchRequired: 'Research that unit first.',
    ResearchTier2First: 'Needs research tier 2.',
    ResearchVaultFirst: 'Needs research tier 1.',
    ScoutsTravelAlone: 'Scouts travel without the champion.',
    ShieldAlreadyActive: 'A longer shield is already running.',
    StatCap: 'That bonus is at its cap.',
    SupportStillAllied: 'That support is still with a clanmate.',
    TargetProtected: 'That village is shielded or in your clan.',
    TrainingBusyOrMissingVillage: 'The Barracks are busy: finish the current batch first.',
    TrainingNotReady: 'The training is not finished yet.',
    WorkDecreased: "Squeekchain's work counter went down. Checkpoints wait until the owner repoints it.",
  };
  function revertData(e) {
    for (let x = e, n = 0; x && n < 6; x = x.error || x.cause || x.data, n++) {
      if (typeof x === 'string' && /^0x[0-9a-f]*$/i.test(x)) return x;
      if (x && typeof x.data === 'string' && /^0x[0-9a-f]*$/i.test(x.data)) return x.data;
    }
    return null;
  }
  function explain(e) {
    const d = revertData(e);
    if (d && d.length >= 10) {
      try { const p = ERR.parseError(d); if (p) return WHY[p.name] || p.name.replace(/([a-z])([A-Z])/g, '$1 $2') + '.'; } catch (x) { }
    }
    const m = (e && (e.shortMessage || e.message)) || String(e);
    if (/insufficient funds/i.test(m)) return 'Your wallet needs a little Sepolia ETH for gas.';
    return m.length > 160 ? m.slice(0, 160) + '…' : m;
  }
  // onState(stage, hash): 'check' → 'wallet' → 'pending' → 'confirmed'
  async function send(c, fn, args, onState = () => { }) {
    if (!account) throw new Error('Connect your wallet first.');
    await ensureChain();
    const data = IF[c].encodeFunctionData(fn, args || []);
    onState('check');
    try { await rpc('eth_call', [{ from: account, to: ADDR[c], data }, 'latest']); }
    catch (e) { if (e.revert) throw new Error(explain(e)); }
    onState('wallet');
    let hash;
    try { hash = await eth().request({ method: 'eth_sendTransaction', params: [{ from: account, to: ADDR[c], data }] }); }
    catch (e) { if (e && (e.code === 4001 || /reject|denied|cancel/i.test(e.message || ''))) throw new Error('You cancelled it in your wallet.'); throw new Error(explain(e)); }
    onState('pending', hash);
    for (let i = 0; i < 150; i++) {
      await sleep(i < 15 ? 2000 : 4000);
      let r = null; try { r = await rpc('eth_getTransactionReceipt', [hash]); } catch (e) { }
      if (r) { if (r.status === '0x1') { onState('confirmed', hash); return r; } throw new Error('The transaction reverted on chain.'); }
    }
    throw new Error('Still pending after a few minutes. Check it on Sepolia Etherscan.');
  }

  const nameKey = name => E.keccak256(E.toUtf8Bytes(String(name).toLowerCase()));
  return { E, ADDR, CHAIN_ID, DEPLOY_BLOCK, RPCS, rpc, call, multi, head, syncLogs, logs: () => LOGS.logs, connect, silent, onAccounts, send, explain, nameKey, get account() { return account; }, hasWallet: () => !!eth() };
})();
