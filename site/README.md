# Squeek Wars · website (Season 2)

The playable website. It uses the prototype's art and layout, and every rule and number comes from the Season 2 contracts on Sepolia, including the owner-editable rule table (`GameConfig`, see `../contracts`).

- **Static files only.** No server, indexer or database. The browser reads Sepolia through public RPCs (`chain.js`, with fallback) and batches reads through Multicall3. Contract events are cached in the browser.
- **The player's wallet signs everything.** Each action is simulated with `eth_call` first, so a refused action shows the contract's reason in plain English. The site never holds a key.
- **Data-driven.** Units, buildings, research tiers, prices and formulas are read from `GameConfig` and cached by its `version`, so an owner edit shows up on the next refresh without a new release of the site.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The landing page and the game's views |
| `deploy.html` | Deploys the five Season 2 contracts from the owner's wallet and prints the block for `deployment.js` |
| `deployment.js` | Where the season lives: chain, deploy block, contract addresses. `null` until deployed |
| `style.css` | The prototype's look, plus readability fixes and the owner pages |
| `chain.js` | RPC reads, Multicall3, event cache, wallet connection, transactions and error messages |
| `app.js` | Village, map, army, academy, market, champion, clan, ranking, reports, and the owner's **Rules** page |
| `abi.js` | Contract ABIs, generated from `../contracts` |
| `deploy-artifacts.js` | Contract creation bytecode, used only by `deploy.html` |
| `vendor/ethers.umd.min.js` | ethers v6.13.4 |
| `assets/` | Sprites and backgrounds |

## Launching a season

1. Open `deploy.html` with the owner's wallet on Sepolia and press the button five times (GameConfig, SeedLedger, Clans, Army, Villages). Progress is saved in the browser, so a closed tab can continue.
2. Copy the block it prints into `deployment.js` and publish the site.
3. The owner wallet now sees a **Rules** tab in the game: every number of the season, the 16 unit slots, the 16 building slots, the research tiers, the Squeekchain addresses and the owner hand-over. Each Save is one transaction and appears in the public change log.

## Run it locally

Wallet extensions don't inject into `file://` pages, so serve the folder:

```sh
cd site
python3 -m http.server 8000
```

Then open http://localhost:8000. For a full local season with test accounts, `../contracts/tools/localchain.js` starts a ganache chain with the contracts deployed and writes a `deployment.js` for it.

## Host it

Any static host works; there is no build step. With Cloudflare Pages: connect the GitHub repository, set the production branch, leave the build command empty, set the build output directory to `site`, then add the custom domain under the project's Custom domains.
