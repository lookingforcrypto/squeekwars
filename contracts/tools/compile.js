// usage: node tools/compile.js <srcDir> <outFile>   (solc 0.8.26, via-IR, optimizer 200, Shanghai; set SOLC to a solc module path if it is not installed here)
const path = require('path'), fs = require('fs');
const solc = require(process.env.SOLC || 'solc');   // npm install solc@0.8.26
const src = path.resolve(process.argv[2]), out = process.argv[3];
const sources = {};
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.sol')) sources[path.relative(src, p)] = { content: fs.readFileSync(p, 'utf8') }; } })(src);
const input = { language: 'Solidity', sources, settings: { viaIR: true, optimizer: { enabled: true, runs: Number(process.env.RUNS || 200) }, evmVersion: process.env.EVM || 'shanghai', metadata: { bytecodeHash: 'none' }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } } } };
const t0 = Date.now();
const res = JSON.parse(solc.compile(JSON.stringify(input)));
const errs = (res.errors || []).filter(e => e.severity === 'error');
(res.errors || []).filter(e => e.severity !== 'error').slice(0, 5).forEach(e => console.log('warn:', e.formattedMessage.split('\n')[0]));
if (errs.length) { errs.forEach(e => console.log(e.formattedMessage)); process.exit(1); }
const art = {};
for (const f in res.contracts) for (const c in res.contracts[f]) { const x = res.contracts[f][c]; if (!x.evm.bytecode.object) continue; art[c] = { abi: x.abi, bytecode: '0x' + x.evm.bytecode.object, runtime: x.evm.deployedBytecode.object.length / 2 }; }
fs.writeFileSync(out, JSON.stringify(art));
console.log('compiled in', ((Date.now() - t0) / 1000).toFixed(1), 's'); for (const c in art) if (art[c].runtime > 100) console.log(' ', c.padEnd(14), art[c].runtime, 'bytes');
