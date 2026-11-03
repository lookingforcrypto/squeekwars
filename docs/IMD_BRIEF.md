# IMD brief · Squeek Wars Testnet season

The request for IMD's swarm (`workflow.open`: contracts → tests → independent review → deploy on Sepolia → website on IPFS as `squeek-wars`), written from [SPEC.md](SPEC.md), [GAME_DESIGN.md](GAME_DESIGN.md) and the prototype, following https://imd.fun/skill.md. It points the builders at this repository at commit `b0dfe3b`.

- **Check** (`POST /requests/check`): no blockers, no suggestions; every fact stated (what each contract does, who can call what, numbers, outside contracts, payouts, site pages and wallet actions).
- **Quote** (`POST /requests/quote`): passed (`created: true`). Price 0.5 IMD, paid on Ethereum or Robinhood Chain; the contracts deploy on Sepolia.
- **Rules in short:** one village per wallet, open to everyone, same production, SEED and wheel bonus for all; Squeek holders build faster (−15% with one Squeek, at most −30%) and get one modest champion; SEED is a non-transferable balance per village.
- **Seasons:** this is the Testnet season. The site opens with Testnet and a locked Mainnet button; Mainnet Season 1 deploys the same contracts again after the official Squeek mint, as a separate request.
- **Reads, read-only:** Squeek NFT `0xcb98349c134ab983da5bfd80527dfe2552bdb70f` and SqueekCore `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44` on Sepolia, the deployment `api.squeekchain.com/v1/economy/state` reports.
- **Paying:** from the wallet verified on the owner's Squeekchain profile, so the Genesis Code lane counts the project as theirs. The body is public once paid; it holds no keys or private data.

## Body (`input` of `workflow.open`)

```json
{
 "request": "Build the Testnet season of Squeek Wars, a hamster village strategy game for Squeekchain's Genesis Code lane, as Solidity contracts on Sepolia with a full Foundry test suite and an independent security review before deployment; deploy them; then build and host its website against the live deployment.\n\nEvery wallet can found one village (one per wallet, open to everyone; no Squeek needed). Squeektoshi's real wheel work, recorded by SqueekCore (0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44, state().cumulativeWork), powers the economy: every village gets the same SEED and the same daily wheel bonus on production from each day's work. Holding Squeeks (ERC-721 at 0xcb98349c134ab983da5bfd80527dfe2552bdb70f on Sepolia) adds two capped extras: construction time x (1 - 0.30 x (1 - 0.5^n) x min(1, last day's work / 11,000)) with n = balanceOf(wallet) when the order is placed (buildings and production sites only, at most -30%), and one champion per wallet whatever the number of Squeeks. Players build, research, train units and raid each other; only resources can be taken, never SEED, NFTs or buildings. Mainnet Season 1 will deploy the same contracts again after the official Squeek mint; this request is only the Sepolia deployment.\n\nThe full design, every number and a playable browser prototype that implements all rules are in the public repository https://github.com/lookingforcrypto/squeekwars/tree/b0dfe3b28b7ae3183534e47c04924db5bb6b8171: docs/SPEC.md (the contract-level rules, the main source), docs/GAME_DESIGN.md (rules), docs/BUILDINGS.md (every level), sim/params.py (all constants), prototype/app.js (reference implementation), prototype/assets (pixel art to reuse on the site). Where this request and the repository differ, this request wins. The step objectives below hold the condensed contract and site rules.\n\nKey rules: lazy production settled on every interaction; 4 resources (Wood, Food, Stone, Iron) as non-transferable balances; 2 build slots with 1 queued order each; levels capped by the Town Hall; research tiers in the Academy; 7 unit types; deterministic battles where each side loses min(100%, 50% x enemy power / own power) and the defenders are wiped and loot is possible only at attack >= 2x defense; Walls add 4% defense per level and Catapults lower them; a champion that levels up from battles and the hamster's runs; clans that cannot attack each other and can send support troops but never resources; a Market that exchanges only the player's own resources; season ranking counters on-chain.\n\nAsk for an independent adversarial security review of the contracts before deployment, with special attention to: lazy accounting and rounding, the daily work checkpoint, battle math overflow, the 3-raids-a-day limit, champion and build-speed checks after NFT transfers (a Squeek is never the champion of two villages), and that no path lets one village move resources or SEED to another.\n\nContracts and what each does (suggested split): SeedLedger: the daily work checkpoint from SqueekCore and every village's SEED balance (SEED is an in-game balance per village, not an ERC-20, and cannot be transferred); Villages: founding, production, storage, buildings, the build queue, research, the Market and the SEED treasury; Army: training, upkeep, movements, scouting, battles, loot, Walls damage and the champion; Clans: clans, invites, support troops and the ranking counters.\nOutside contracts, read-only, and no other services or oracles: the Squeek NFT and SqueekCore above.\nWho can call what: any wallet founds its own village and acts only for it; anyone can call the daily checkpoint and resolve arrived movements; the owner can only propose, apply, cancel or renounce the 72-hour repoint of the two Squeekchain addresses and has no other power.\nWho receives fees and payouts: nobody. There are no fees and no payouts; the contracts hold no ETH or tokens.",
 "context": "Chain: Sepolia (11155111) only. Read-only integrations: Squeek NFT 0xcb98349c134ab983da5bfd80527dfe2552bdb70f (ownerOf, totalSupply) and SqueekCore 0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44 (state()). These are the addresses api.squeekchain.com/v1/economy/state reports today; the older docs deployment (0x0eAF... NFT, 0x7466... core) is not used.\nNames are final: Squeek Wars; resources Wood, Food, Stone, Iron; SEED; buildings Town Hall, Walls, Wheelhouse, Storehouse, Vault, Burrow, Barracks, Academy, Forge, Clan Hall, Market; units Spearman, Forager, Shieldbearer, Berserker, Charger, Catapult, Scout; Champion.\nRuled out: no launch token, pool or sale; no player-to-player trading or resource sending; no randomness; no upgradeable proxies; no admin power over player state; no fees; no ETH held. The only admin power: the owner can repoint the two Squeekchain addresses through a public 72-hour timelock, and can renounce it.\nContracts are wired only through constructor arguments ($contract:EarlierName, $owner); nothing is called after deployment. At most 8 contracts; split by concern (for example SEED, Villages and economy, Army and battles, Clans and ranking) so each stays under the size limit.\nGitHub publication and IPFS hosting are approved. Site name squeek-wars. Site and code in English; names must not be childish.",
 "draft": {
  "objective": "Build the Squeek Wars Testnet season contracts (economy constants in the contracts step) with Foundry tests and an independent review, deploy them on Sepolia, then build the game website against the live deployment and host it as squeek-wars. Rules every step must follow:\n- Attack = (sum a x (1 + Forge 2% per level) x (1 + champion attack bonus) + champion Might if it joins) x 1.10 if the attacker's Scouts reported on the target in the last 12 h. Defense = (sum d x (1 + Forge) + clan support + Might if home) x (1 + champion def) x (1 + 4% x Walls) + 40 x TH. Losses min(1, 0.5 x enemy / own) per side. Attack >= 2x defense: defenders wiped, loot = surviving carry x (1 + Logistics + champion carry), evenly from the 4 resources above the Vault; every 20 surviving Catapults lower Walls 1 level (max 2), rebuilt 1 level per 12 h. Max 3 successful raids per target per day. Target TH <= attacker TH - 3: half loot, no points, no XP.\n- Champion: one per wallet that holds a Squeek, whatever the count: the wallet picks which Squeek (once per 24 h; a Squeek is the champion of one village at a time; valid only while the wallet owns it, ownerOf read live); XP and points stored per token id; level 1 + floor(sqrt(XP/100)), max 30; XP = killed unit cost / 20; 4 points per level: Might 50 + 25 per point, Attack/Defense +0.5% per point (max 10%), Carry +1% per point (max 20%). Injured 12 h when it loses more than the enemy; never dies.\n- Market: give 100 of one resource, get 25 + 5 (L-1) of another (75 at L10). Clan Hall 1 joins, 3 founds; member cap 3 x founder Clan Hall level; members cannot attack each other; support troops stay until recalled, sender pays Food.\n- SEED treasury (burned): Wheel Festival 2,500 (+20% output 24 h); Peace shield 4,000 (12 h no attacks, once per 3 days, ends if you attack); banner colour 1,000.\n- Ranking counters per season and week: village points (resources spent on buildings / 100), attack and defense points (resource value of units killed), resources looted.",
  "shape": "dag",
  "onchain": "evm_contracts",
  "github": true,
  "ipfs": "squeek-wars",
  "references": [
   "solidity-security-review",
   "evm-contracts-launch",
   "eth-frontend-ux"
  ],
  "steps": [
   {
    "skill": "build-contract-project",
    "key": "contracts",
    "dependsOn": [],
    "objective": "Constants and formulas (hours; L = level; time t x (1 - 0.03 (TH - 1))):\n- Day = 04:00 to 04:00 UTC. Anyone may checkpoint once per day: day work = SqueekCore cumulativeWork - previous checkpoint. Each village claims SEED = work / 10 for every day since it last claimed (one claim per day per village). Wheel bonus that day = min(work / 4320, 0.25 x Wheelhouse level), for every village. The champion's XP + min(150, work / 100) per claimed day.\n- Founding: any wallet founds one village, once. Start: 750 of each resource, 1,500 SEED, Town Hall 1, Walls 1, 8 fields at 1, 7-day beginner shield (no attacking, not attackable). The n-th village gets tile shuffle(n) of the 100 x 100 grid (fixed bijection); the grid grows by rings after 10,000.\n- Fields: 2 per resource, output/h = 8 x 1.4^(L-1) x (1 + wheel bonus). Cost c x 1.6^(L-1), time 0.4 x 1.4^(L-1); c: forest 30/50/45/40, farm 45/20/50/45, quarry 45/45/20/50, mine 50/45/45/10 (Wood/Food/Stone/Iron).\n- Buildings, cost c x g^(L-1), time t x gt^(L-1): Town Hall 180/170/180/170, 1.75, 0.75, 1.5, plus SEED 667 x 1.5^(L-1); Walls 80/60/220/140; Wheelhouse 100/110/90/100, 1.68, plus SEED 300 x 1.5^(L-1); Storehouse 110/100/100/90, 1.28, 0.45, 1.2; Vault 70/60/80/50, 1.28, 0.45, 1.2; Burrow 70/110/70/50, 1.55, 0.5; Barracks 150/150/130/170; Academy 160/160/170/210; Forge 130/110/140/260; Clan Hall 190/200/180/130; Market 150/200/150/150. Others g 1.62, t 0.6, gt 1.45. Max 10 (Storehouse, Vault 20); cap TH level (Storehouse, Vault 2 x TH). Plots open 3 + TH (max 12). One of each except Storehouse, Vault, Burrow. Spent SEED is burned. Cancel refunds 80%.\n- Storage 1000 + sum 1200 x 1.22^(L-1); Vault keeps 150 + sum 250 x 1.22^(L-1) of each safe. Burrow room 30 + sum 20L x 1.12^(L-1). Food upkeep 0.5 per room per hour; at 0 Food units leave.\n- Research tiers open at Academy 1/2/4/6/8; tier t: 600 x 2.2^(t-1) split evenly + 300 x 2^(t-1) SEED, 2 x 1.8^(t-1) x 0.95^(Academy-1) h. T1 Forager, Vault; T2 Shieldbearer, Berserker, Scout, Forge, Clan Hall; T3 Charger, Logistics (+20% carry); T4 Catapult, Field Medicine (10% of fallen return); T5 Logistics II, Forced March (+20% speed).\n- Units a/d/speed/carry/room, cost, minutes (x 0.9^(Barracks-1)): Spearman 40/35/6/50/1, 50/45/45/40, 15; Forager 20/15/8/120/1, 55/55/30/20, 12; Shieldbearer 15/70/5/20/1, 60/45/70/45, 18; Berserker 75/20/6/40/1, 55/55/35/100, 20; Charger 90/50/14/80/2, 120/130/90/170, 35; Catapult 30/10/3/0/4, 320/140/300/170, 70; Scout 0/5/16/0/1, 30/40/20/40, 8. Travel = distance / slowest speed."
   },
   {
    "skill": "write-foundry-tests",
    "key": "tests",
    "dependsOn": [
     "contracts"
    ],
    "paths": [
     "test"
    ],
    "objective": "Unit, fuzz and invariant tests for every rule above, against mocks of the Squeek NFT and SqueekCore. Invariants: no resource or SEED moves between villages except raid loot; only the village's wallet acts for it, and the champion counts only while the wallet owns it, also right after a transfer; a Squeek is never the champion of two villages; the build speed never passes -30%; production never exceeds storage; the daily checkpoint and SEED claims cannot be repeated for the same day; no division by zero or overflow at max levels and max armies; battle results match the formulas exactly."
   },
   {
    "skill": "adversarial-review",
    "key": "review",
    "dependsOn": [
     "tests"
    ]
   },
   {
    "skill": "frontend-for-contract",
    "key": "site",
    "dependsOn": [
     "review"
    ],
    "objective": "A static website in English with the pixel-art look of the repository's prototype (reuse prototype/assets): landing page with how it works, rules and FAQ; on entering the game, two buttons side by side: Testnet (practice season on Sepolia, active) and Mainnet (disabled, 'opens after the official Squeek mint'), and a TESTNET badge in the game's top bar; connect wallet; found the wallet's village (no Squeek needed); show the wallet's Squeek count and its build speed, and let the player pick the champion among them (once per 24 h); village view with the Town Hall, 8 fields and 12 plots, build/upgrade/cancel and the 2 build slots; World Map 100 x 100 with village info, attack, scout and support; Army, Academy, Market, Clan, Champion, Ranking and Reports (from contract events) pages; a live Squeektoshi panel from SqueekCore and api.squeekchain.com/v1/status; the daily checkpoint and SEED claim buttons. Works on phones (390 px) and desktop."
   }
  ]
 },
 "permissions": {
  "github": true,
  "ipfs": "squeek-wars",
  "onchain": {
   "kind": "evm_contracts",
   "chainId": 11155111
  }
 }
}
```
