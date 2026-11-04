// usage: node tools/verify-input.js <solc module> <ethers module> <srcDir> <outDir> <deployment.js>
// Writes the standard JSON input (the settings of tools/compile.js, without the test mocks) and the constructor arguments
// of the five contracts, and checks that the compiled runtime code equals the code on chain. The Chat add-on, once in
// deployment.js, gets its own input-chat.json (the same sources plus Chat.sol), so the five keep their exact input.
const path = require('path'), fs = require('fs');
const solc = require(path.resolve(process.argv[2]));
const E = require(path.resolve(process.argv[3]));
const src = path.resolve(process.argv[4]), outDir = process.argv[5];
const sources = {};
(function walk(d) { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (f !== 'test') walk(p); } else if (f.endsWith('.sol')) sources[path.relative(src, p)] = { content: fs.readFileSync(p, 'utf8') }; } })(src);
const input = { language: 'Solidity', sources, settings: { viaIR: true, optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai', metadata: { bytecodeHash: 'none' }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.deployedBytecode.immutableReferences'] } } } };
const res = JSON.parse(solc.compile(JSON.stringify(input)));
if ((res.errors || []).some(e => e.severity === 'error')) { console.log(res.errors); process.exit(1); }
const dep = (() => { const window = {}; eval(fs.readFileSync(process.argv[6], 'utf8')); return window.SW_DEPLOY; })();
const D = { ...dep.addresses, owner: dep.owner };
const ADDON = { Chat: 'Chat.sol' };
const LIST = [['GameConfig', 'config', [D.owner]], ['SeedLedger', 'ledger', [D.config, D.core, D.squeek]], ['Clans', 'clans', [D.config]], ['Army', 'army', [D.config, D.ledger, D.clans]], ['Villages', 'villages', [D.config, D.ledger, D.clans, D.army]]];
if (D.chat) LIST.push(['Chat', 'chat', [D.config, D.villages]]);
const p = new E.JsonRpcProvider((dep.rpcs && dep.rpcs[0]) || 'https://ethereum-sepolia-rpc.publicnode.com');
(async () => {
  const out = { compiler: 'v' + solc.version().replace(/\.Emscripten.*$/, ''), contracts: [] };
  for (const [name, key, args] of LIST) {
    const file = Object.keys(res.contracts).find(f => res.contracts[f][name]);
    const c = res.contracts[file][name], abi = c.abi;
    let rt = c.evm.deployedBytecode.object, chain = (await p.getCode(D[key])).slice(2);
    const imm = c.evm.deployedBytecode.immutableReferences || {};
    let a = chain.split(''), b = rt.split('');            // blank the immutables on both sides before comparing
    for (const id in imm) for (const r of imm[id]) for (let i = r.start * 2; i < (r.start + r.length) * 2; i++) { a[i] = '0'; b[i] = '0'; }
    const same = a.join('') === b.join('');
    const ctor = new E.Interface(abi).encodeDeploy(args).slice(2);
    console.log(name.padEnd(11), file, '| runtime matches Sepolia:', same, '| ctor args', ctor.length / 2, 'bytes');
    out.contracts.push({ name, key, file, id: `${file}:${name}`, address: D[key], ctorArgs: ctor, input: ADDON[name] ? 'input-chat.json' : 'input.json' });
  }
  const base = { ...sources }; for (const f of Object.values(ADDON)) delete base[f];
  fs.writeFileSync(path.join(outDir, 'input.json'), JSON.stringify({ language: 'Solidity', sources: base, settings: { viaIR: true, optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai', metadata: { bytecodeHash: 'none' }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } } } }));
  if (D.chat) fs.writeFileSync(path.join(outDir, 'input-chat.json'), JSON.stringify({ language: 'Solidity', sources, settings: { viaIR: true, optimizer: { enabled: true, runs: 200 }, evmVersion: 'shanghai', metadata: { bytecodeHash: 'none' }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } } } }));
  fs.writeFileSync(path.join(outDir, 'contracts.json'), JSON.stringify(out, null, 2));
  console.log('compiler', out.compiler, '| sources', Object.keys(sources).join(' '));
})();
