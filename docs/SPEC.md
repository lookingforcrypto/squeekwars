# Squeek Wars · Contract specification (draft v8)

The rules the contracts enforce, written for the IMD build. [GAME_DESIGN.md](GAME_DESIGN.md) explains the game; [BUILDINGS.md](BUILDINGS.md) lists every level; `sim/params.py` holds every constant; `prototype/app.js` is a working reference implementation. Where they differ, this file wins.

## 1. Scope

- **Chain:** Sepolia (11155111) for the Testnet season. Mainnet Season 1 deploys the same contracts again after the official Squeek mint, with mainnet addresses; nothing carries over. Contracts are final once deployed: no proxies, no upgrade path, no self-destruct.
- **No money:** the contracts hold no ETH and no tokens, take no fees and pay nobody.
- **No randomness:** every result follows from public state and the formulas below.
- **No test or cheat functions:** the prototype's test controls (free, instant, production ×1000, game speed, extra resources or SEED, ending the shield, Squeek count) are demo-only and exist in no contract and not on the live site.
- **Everything is public:** troops, Walls and stock of every village can be read. Scouting gives an attack bonus, not hidden information.

## 2. Outside contracts (read-only)

| Name | Sepolia address | Used for |
|---|---|---|
| Squeek NFT (ERC-721) | `0xcb98349c134ab983da5bfd80527dfe2552bdb70f` | `ownerOf(id)`: which Squeeks a wallet holds |
| SqueekCore | `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44` | `state().cumulativeWork`: Squeektoshi's settled work |

These are the addresses `api.squeekchain.com/v1/economy/state` reports. The owner can repoint either address through a public 72-hour timelock (`proposeSources` → wait 72 h → `applySources`, or `cancelSources`) and can renounce that power for good. It is the only admin power in the system.

## 3. Conventions

- **Time** is `block.timestamp` in seconds; an hour is 3,600 s. Formulas below are per hour unless they say otherwise.
- **Game day** `d = floor((t − 4 h) / 24 h)`: days start at 04:00 UTC, when Squeektoshi's night run is over.
- **Amounts** (resources, SEED, XP) are stored as fixed point with at least 3 decimals. Every rounding goes down, against the player.
- **Levels:** `L` is the current level. Cost of reaching level `L` is `c × g^(L−1)` per resource. Build time is `t × gt^(L−1) × (1 − 0.03 × (TownHall − 1))` hours.
- **Bounded work:** no call loops over an unbounded set. Where catching up could be long (days to claim, movements to resolve), a call handles a fixed maximum and can be repeated.
- **Events** for every state change the site shows: founding, orders placed, finished and cancelled, research, training, movements sent and resolved (with the full battle table), scouting, clans, treasury and day checkpoints.

## 4. Contracts and wiring

At most 8 contracts. Suggested split:

| Contract | Holds |
|---|---|
| **SeedLedger** | Day checkpoints from SqueekCore; SEED balance of every village; burns |
| **Villages** | Founding, resources and production, buildings and the build queue with the Squeek build speed, research, Market, treasury |
| **Army** | Units, training, upkeep, movements, scouting, battles, loot, Walls damage, the village champion |
| **Clans** | Clans, invites, membership, support troops, ranking counters |

Constructors take only static values, `$owner` and `$contract:EarlierName`, and nothing is called after deployment. Where an earlier contract has to trust a later one, the later one registers itself from its own constructor inside the same deployment transaction, once, and the earlier contract accepts it only then (for example the same `tx.origin` and block as its own construction). Merging contracts is fine as long as each stays under the size limit.

## 5. Villages

### Founding, Squeeks and the champion

- `found(name)`: any wallet without a village founds one. One village per wallet, forever (a village is never deleted). The name is 3–16 characters of `A–Z a–z 0–9 _`, unique ignoring case, stored with the village and never changed; the `Founded` event carries the wallet, the name and the tile. The site shows every player as name plus short address (`0x1a2b…9f3c`) and offers no play without a connected wallet.
- Start: 750 of each resource, 1,500 SEED, Town Hall 1, Walls 1, 8 production sites at level 1, 12 empty plots, a 7-day beginner shield.
- Tile: the n-th founded village gets tile `shuffle(n)` of the 100 × 100 grid (a fixed bijection, so consecutive villages are not neighbours). From the 10,001st village the grid grows by rings.
- No Squeek is needed to found or to play. Production, SEED and the wheel bonus are the same for every village.
- **Squeek build speed:** when an order for a building or a production site is placed, `n = SqueekNFT.balanceOf(wallet)` and the order's time is multiplied by `1 − 0.30 × (1 − 0.5^n) × min(1, lastDayWork / 11,000)`, where `lastDayWork` is the work of the latest recorded day. The time is fixed at placement; research and training are not affected.
- **Champion:** every village has one from founding, stored per village. While `SqueekNFT.balanceOf(wallet) ≥ 1` (read live wherever it counts), it is a Squeek champion: every XP gain × 1.1 and every stat × 1.1.
- Nothing about the champion is tied to a token id; transferring Squeeks only changes whether the boost applies.

### Production (lazy)

Before any action on a village, the contract settles it from `lastSettled` to now, in time order, through each finished build order and each day boundary in between:

- Output per site = `12 × 1.4^(L−1) × (1 + bonus)`; two sites per resource (forests Wood, farms Food, quarries Stone, mines Iron).
- **bonus** for day d = `min(dayWork(d) / 4,320, 0.25 × Wheelhouse level)`, for every village.
- Food also pays upkeep: `0.5 × Σ units × room` per hour, own units at home or away. If Food would go below 0, it stops at 0 and the units at home shrink by the share that could not be fed.
- Each resource is capped at storage: `1,000 + Σ Storehouses 1,200 × 1.22^(L−1)`. Output above the cap is lost.
- Settlement of more than 30 days at once uses each day's bonus for the first 30 days and base output after.

### Buildings and the build queue

| Building | Cost c (Wood/Food/Stone/Iron) | g | t (h) | gt | Max | Count | Unlock |
|---|---|---|---|---|---|---|---|
| Town Hall | 180/170/180/170 + SEED 667 × 1.5^(L−1) | 1.75 | 0.75 | 1.5 | 10 | fixed | – |
| Walls | 80/60/220/140 | 1.62 | 0.6 | 1.45 | 10 | fixed | – |
| Production site | forest 30/50/45/40 · farm 45/20/50/45 · quarry 45/45/20/50 · mine 50/45/45/10 | 1.6 | 0.4 | 1.4 | 10 | 8 fixed | – |
| Wheelhouse | 100/110/90/100 + SEED 300 × 1.5^(L−1) | 1.68 | 0.6 | 1.45 | 10 | 1 | – |
| Storehouse | 110/100/100/90 | 1.28 | 0.45 | 1.2 | 20 | any | – |
| Vault | 70/60/80/50 | 1.28 | 0.45 | 1.2 | 20 | any | research |
| Burrow | 70/110/70/50 | 1.55 | 0.5 | 1.45 | 10 | any | – |
| Barracks | 150/150/130/170 | 1.62 | 0.6 | 1.45 | 10 | 1 | – |
| Academy | 160/160/170/210 | 1.62 | 0.6 | 1.45 | 10 | 1 | – |
| Forge | 130/110/140/260 | 1.62 | 0.6 | 1.45 | 10 | 1 | research |
| Clan Hall | 190/200/180/130 | 1.62 | 0.6 | 1.45 | 10 | 1 | research |
| Market | 150/200/150/150 | 1.62 | 0.6 | 1.45 | 10 | 1 | Town Hall 2 |

- Nothing goes above the Town Hall level; Storehouse and Vault go up to 2 × Town Hall. Plots open: `min(12, 3 + Town Hall)`.
- **Queue:** 2 slots run in parallel; each holds the running order and one queued order. Orders are paid in full when placed. A queued order starts when the one before it finishes. One order per building at a time.
- `cancel(slot, index)`: refunds 80% of what was paid (resources capped by storage, SEED included). Cancelling a new building empties its plot. The next order in the slot starts now with its full duration.
- `move(fromPlot, toPlot)` and `demolish(plot)` (no refund) are allowed while the building has no order and is not training, researching or hosting a clan.
- **Town Hall effects:** construction 3% faster per level above 1; village guard 40 × level added to defense.

### Research

- Tiers open at Academy 1, 2, 4, 6, 8. Tier t costs `600 × 2.2^(t−1)` split evenly over the 4 resources plus `300 × 2^(t−1)` SEED, and takes `2 × 1.8^(t−1) × 0.95^(Academy−1)` h. One research at a time; cancel refunds 80%.
- T1 Forager, Vault · T2 Shieldbearer, Berserker, Scout, Forge, Clan Hall · T3 Charger, Logistics (+20% carry) · T4 Catapult, Field Medicine (10% of fallen units return) · T5 Logistics II (+20% carry), Forced March (+20% speed).

### Market and treasury

- `exchange(from, to, amount)`: needs a Market; gives `amount × rate / 100` with rate `25 + 5 × (L − 1)` (75 at level 10). Only the village's own resources. SEED can be the side given (at the same rate), never the side received, so no resource ever becomes SEED.
- Treasury (SEED burned):

  | Item | SEED | Effect |
  |---|---|---|
  | Resource boost (Wood, Food, Stone or Iron) | 500 each | That resource's output × 1.25 for 24 h; not while the same boost runs |
  | Peace shield | 4,000 | No attack can be sent at the village for 12 h; cancels attacks already on the way; once per 72 h; ends when the village attacks |
  | Banner colour | 1,000 | One of 7 colours, shown on the map and the ranking |

## 6. SeedLedger

- `checkpoint()`: anyone, at most once per game day, after 04:00 UTC. `dayWork(d) = SqueekCore.cumulativeWork − cumulativeWork at the previous checkpoint`. Missed days record 0 and their work lands on the day of the next checkpoint.
- `claim(village)`: adds `dayWork(d) / 10` SEED for every recorded day d after the village's last claimed day (bounded per call). Every village gets the same SEED, with or without Squeeks. The village's champion also gets `min(150, dayWork(d) / 100)` XP per day claimed (× 1.1 for a Squeek champion).
- SEED is an in-game balance per village: no transfer function, no approval, no ERC-20 interface, never part of loot. Only the game contracts can burn it (costs, Market exchange, treasury).

## 7. Army

### Units

| Unit | Attack | Defense | Speed (tiles/h) | Carry | Room | Cost (W/F/S/I) | Minutes | Unlock |
|---|---|---|---|---|---|---|---|---|
| Spearman | 40 | 35 | 6 | 50 | 1 | 50/45/45/40 | 15 | – |
| Forager | 20 | 15 | 8 | 120 | 1 | 55/55/30/20 | 12 | T1 |
| Shieldbearer | 15 | 70 | 5 | 20 | 1 | 60/45/70/45 | 18 | T2 |
| Berserker | 75 | 20 | 6 | 40 | 1 | 55/55/35/100 | 20 | T2 |
| Scout | 0 | 5 | 16 | 0 | 1 | 30/40/20/40 | 8 | T2 |
| Charger | 90 | 50 | 14 | 80 | 2 | 120/130/90/170 | 35 | T3 |
| Catapult | 30 | 10 | 3 | 0 | 4 | 320/140/300/170 | 70 | T4 |

- `train(unit, n)`: needs Barracks and the research; one batch at a time; time `n × minutes × 0.9^(Barracks−1)`. Room: `30 + Σ Burrows 20 × L × 1.12^(L−1)` must cover all own units, at home, away or in training. Cancel refunds 80%.
- `dismiss(unit, n)`: units at home leave; no refund.

### Movements

- Kinds: **attack**, **scout** (only Scouts), **support** (to a clan member), **return**. Travel time = distance ÷ speed of the slowest unit (× 1.2 speed with Forced March). Distance is Euclidean on (x|y).
- Attacks need: no beginner shield on either side, the target not in the attacker's clan, the target's Peace shield off, fewer than 3 successful raids on the target this game day.
- The champion can join an attack; it is then away until the army returns.
- **Resolution:** anyone can resolve a movement after it arrives. Before any action on a village, every movement to or from it that has arrived is resolved first, in arrival order (bounded; a separate `resolve` clears a backlog). Both villages are settled up to the arrival time before the battle.

### Battle

- **Attack** `A = (Σ attack × (1 + 0.02 × Forge) × (1 + champion attack bonus) + Might if the champion joins) × 1.10` if the attacker's Scouts reported on the target in the last 12 h (the bonus must still run at arrival).
- **Defense** `D = (Σ defense of units at home and support × (1 + 0.02 × Forge) + Might if the champion is home and not injured) × (1 + champion defense bonus) × (1 + 0.04 × Walls) + 40 × Town Hall`.
- **Losses:** the attacker loses `min(1, 0.5 × D / A)` of each unit, the defender (and its support) `min(1, 0.5 × A / D)`. Field Medicine returns 10% of each side's fallen units.
- **Win** only if `A ≥ 2 × D`: every defender falls, and
  - **loot** = survivors' carry × (1 + Logistics + champion carry bonus), taken evenly from the 4 resources above the Vault's protected amount (`150 + Σ Vaults 250 × 1.22^(L−1)` each);
  - every 20 surviving Catapults lower the Walls by 1 level (max 2 per attack); lowered Walls come back 1 level per 12 h.
- **Pick on someone your size:** if the target's Town Hall is 3 or more levels below the attacker's, loot is halved and there are no ranking points and no champion XP.
- **Champion:** XP = resource value of the enemy units it helped kill ÷ 20. If its side loses a bigger share than the enemy, it is injured for 12 h (no Might, no bonuses). It never dies.
- **Scouting:** a scout movement always succeeds and returns; it starts the 12-hour bonus for the attacker against that target.

### Champion

- Level `1 + floor(sqrt(XP / 100))`, max 30. 4 points per level: Might `50 + 25 × points`, Attack and Defense +0.5% per point (max 10%), Carry +1% per point (max 20%). A Squeek champion multiplies each of these and every XP gain by 1.1.
- XP and points belong to the village.

## 8. Clans

- Clan Hall 1 joins a clan, Clan Hall 3 founds one. Member cap = 3 × the founder's Clan Hall level. Tags are unique (2–4 letters or digits).
- Invite, accept, decline, leave, kick, disband. Members cannot attack each other.
- **Support:** troops sent to a member stay until recalled, defend with the host's Walls, and keep eating the sender's Food. Capacity per host: 50 room × the host's Clan Hall level. Leaving or being kicked sends support home.
- No resources and no SEED ever move between villages, in or out of a clan.

## 9. Ranking counters

Per village, per season and per game week: village points (resources spent on buildings and sites ÷ 100), attack points and defense points (resource value of enemy units killed), resources looted. Raids under the level-gap rule add nothing. The site builds the tables and weekly titles from these counters and events.

## 10. Invariants (tested)

- No resource or SEED moves from one village to another except raid loot.
- Only the village's wallet acts for it; the Squeek boosts count only while the wallet holds a Squeek, read at the moment of use.
- The champion boost is ×1.1 for any number of Squeeks ≥ 1; the build speed never exceeds −30%.
- Resources never exceed storage and never go below 0; SEED never goes below 0.
- A day's checkpoint and a village's claim for a day happen at most once.
- Movements resolve in arrival order, and a village's state at a battle includes everything that arrived before it.
- No overflow or division by zero at max levels, max armies and a 30-day catch-up.
