'use strict';
/* A local Squeek Wars chain for testing the website: ganache on :8545 (Shanghai), Multicall3, mock
   Squeekchain contracts, the five V2 contracts, and two neighbour villages.
   usage: node tools/localchain.js <artifacts.json> <ganache module dir> <ethers umd path> <deployment.js out> */
const path = require('path'), fs = require('fs');
const [ART, GANACHE, ETHERS, OUT] = process.argv.slice(2);
const A = require(path.resolve(ART));
const ganache = require(path.resolve(GANACHE));
const E = require(path.resolve(ETHERS));

(async () => {
  const server = ganache.server({ logging: { quiet: true }, chain: { hardfork: 'shanghai', chainId: 11155111, vmErrorsOnRPCResponse: true }, miner: { blockGasLimit: 300_000_000 }, wallet: { totalAccounts: 8, defaultBalance: 1000, deterministic: true } });
  await new Promise((res, rej) => server.listen(8545, e => e ? rej(e) : res()));
  const P = new E.JsonRpcProvider('http://127.0.0.1:8545', undefined, { staticNetwork: true });
  P.estimateGas = async () => 20_000_000n;
  const signers = await Promise.all([0, 1, 2, 3].map(i => P.getSigner(i)));
  const [owner] = signers;
  const deploy = async (name, ...args) => { const c = await new E.ContractFactory(A[name].abi, A[name].bytecode, owner).deploy(...args); await c.waitForDeployment(); return c.getAddress(); };
  const multicall = await deploy('Multicall3');
  const core = await deploy('MockCore'), squeek = await deploy('MockNFT');
  const start = await P.getBlockNumber();
  const config = await deploy('GameConfig', await owner.getAddress());
  const ledger = await deploy('SeedLedger', config, core, squeek);
  const clans = await deploy('Clans', config);
  const army = await deploy('Army', config, ledger, clans);
  const villages = await deploy('Villages', config, ledger, clans, army);
  const chat = await deploy('Chat', config, villages);
  const V = s => new E.Contract(villages, A.Villages.abi, s);
  await (await V(signers[2]).found('AmberPaw42')).wait();
  await (await V(signers[3]).found('Moss_Hold')).wait();
  const dep = { chainId: 11155111, deployBlock: start, rpcs: ['http://127.0.0.1:8545'], local: true, addresses: { config, ledger, clans, army, villages, chat, core, squeek, multicall }, owner: await owner.getAddress() };
  fs.writeFileSync(OUT, `/* local test chain */\nwindow.SW_DEPLOY = ${JSON.stringify(dep, null, 2)};\n`);
  console.log('READY', JSON.stringify(dep.addresses), 'owner', dep.owner, 'player', await signers[1].getAddress());
})().catch(e => { console.error(e); process.exit(1); });
