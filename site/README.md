# Squeek Wars · live site

The playable website for the Squeek Wars Testnet season. It uses the prototype's art and layout, but every number comes from the live contracts on Sepolia.

- **Static files only.** No server, indexer or database. The browser reads Sepolia through public RPCs (`chain.js`, with fallback between four of them) and batches reads through Multicall3. Contract events are cached in the browser's localStorage.
- **The player's wallet signs everything.** Before asking the wallet, each action is simulated with `eth_call`, so a refused action shows the contract's reason in plain English. The site never holds a key.
- **Contracts** (Sepolia, IMD launch 2935, deployed in block 12,060,202):

| Contract | Address |
| --- | --- |
| Villages (the game) | `0x68dcfbff8b40429be1effaa63e82ea5200c87aec` |
| Army | `0x3cba4215e531ee3c4c3daa045d15803505d282e0` |
| Clans | `0xb789d7a3c8bb07ca1bd8811f10ee47f270d93fe1` |
| SeedLedger | `0x11d4a8126b7911bda323e4c6dc8b137bf01ba2b9` |
| GameRules | `0xfbe6911fbaa2fdfd91ef91887f30b0d3ba8f9d15` |
| SqueekCore (read only) | `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44` |
| Squeek NFT (read only) | `0xcb98349c134ab983da5bfd80527dfe2552bdb70f` |

## Files

| File | What it does |
| --- | --- |
| `index.html` | The landing page and the game's views |
| `style.css` | The prototype's look, plus readability fixes for small text |
| `chain.js` | RPC reads, Multicall3, event cache, wallet connection, transactions and error messages |
| `app.js` | The village scene, map, army, academy, market, champion, clan, ranking and reports |
| `abi.js` | The contracts' ABIs, generated from the contract repository's `docs/abi` |
| `vendor/ethers.umd.min.js` | ethers v6.13.4, used to encode and decode calls |
| `assets/` | The prototype's sprites and backgrounds |

## Run it locally

Wallet extensions don't inject into `file://` pages, so serve the folder:

```sh
cd site
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser with MetaMask or Rabby on Sepolia.

## Host it

Any static host works: GitHub Pages, Cloudflare Pages, IPFS, or ordinary shared hosting. Upload the contents of this folder as they are; there is no build step.
