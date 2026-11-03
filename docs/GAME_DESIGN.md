# Squeek Wars · Game design (draft v1)

Squeek Wars is a browser strategy game for Squeekchain on Sepolia. Every Squeek NFT is a village and its champion. Squeektoshi, the real hamster whose wheel runs drive Squeekchain, powers the economy: SEED is earned from his settled passes, and each night's run boosts resource production in every village.

Numbers marked as draft come from the economy simulation in `sim/` and can still change. Per-level tables are in [BUILDINGS.md](BUILDINGS.md).

## 1. Core rules

- **One village and one champion per Squeek NFT** (9,972 Squeeks). Both follow the NFT when it is sold. For staked Squeeks the owner is the staking contract's depositor.
- **A village appears on the world map** when the NFT owner sends their first transaction (founding).
- **SEED (ERC-20):** 1 SEED per 10 settled wheel passes, the same for every village. +200 for a zoomies witness, at most once a day. SEED spent on upgrades and research is burned. SEED cannot be exchanged in the Market.
- **Resources:** Wood, Food, Stone, Iron. They are in-game balances, not tokens, and cannot be sent to other players.
- **Raids take resources only.** SEED, NFTs and buildings are never taken. The only structure that can lose levels is the Walls (Catapults).
- **No rarity caps.** Any number of villages can reach any level.

## 2. Village layout

- Round village with a wooden palisade (the Walls) and four diagonal gates.
- Town Hall in the centre and 12 building plots around it (8 outer, 4 inner).
- A river rings the village outside the Walls. Four branches split the countryside into four quarters, each with two production sites:
  - north-west: 2 forests (Wood)
  - north-east: 2 sunflower farms (Food)
  - south-west: 2 quarries (Stone)
  - south-east: 2 iron mines (Iron)
- A bridge crosses the river at each gate.

## 3. Production

- **Hourly output** = base output of the site level × (1 + wheel bonus).
- **Wheel bonus of the day** = Squeektoshi's settled passes ÷ 4,320 (11,000 passes ≈ +255%), capped by the Wheelhouse: +25% per level, +250% at level 10.
- If the hamster does not run, base output continues.
- **Food upkeep:** each unit eats its upkeep points in Food every hour.
- Output above Storehouse capacity is lost.
- On-chain this is computed lazily: the contract records each day's settled work and settles production on the next interaction.

## 4. Levels and construction

- Buildings, Town Hall, Walls and production sites have 10 levels; Storehouse and Vault have 20.
- Nothing can exceed the Town Hall level; Storehouse and Vault can go up to 2× the Town Hall level.
- **Construction:** two build slots work in parallel, and each slot can hold one queued order (four orders at most). Orders are paid when placed.
- Sprites have 5 looks: cardboard → wood → plaster & timber → stone → marble & gold.

## 5. Buildings

| Building | Role | Unlock | Count |
|---|---|---|---|
| Town Hall | Opens plots (4 at Lv1, +1 per level), sets level caps, faster construction, village guard | fixed | 1 |
| Walls | +4% defense per level; Catapults can lower it | fixed | 1 |
| Production sites | Wood, Food, Stone, Iron output | fixed | 8 |
| Wheelhouse | Caps the wheel bonus (+25% per level) | start | 1 |
| Storehouse | Storage capacity | start | several |
| Burrow | Upkeep capacity (how many troops you can feed) | start | several |
| Barracks | Trains units, faster per level | start | 1 |
| Academy | Research tiers (Lv1/3/5/7/9 open tiers 1–5) | start | 1 |
| Vault | Amount protected from raids | Academy tier 1 | several |
| Forge | +2% attack and defense for all units per level | Academy tier 2 | 1 |
| Clan Hall | Join (Lv1) or found (Lv3) a clan, host allied troops | Academy tier 2 | 1 |
| Market | Exchange your own resources (100 → 25 at Lv1, +5 per level, 75 at Lv10) | Academy tier 3 | 1 |

There are 9 plot buildings for 12 plots, so the last 3 plots are a strategic choice (more Storehouses, Burrows or Vaults).

## 6. Academy research

| Tier | Academy level | Unlocks |
|---|---|---|
| 1 | 1 | Forager, Vault |
| 2 | 3 | Shieldbearer, Berserker, Forge, Clan Hall, Logistics (+20% carry) |
| 3 | 5 | Charger, Market |
| 4 | 7 | Catapult, Field Medicine (10% of fallen units return) |
| 5 | 9 | Logistics II, Forced March (+20% speed) |

Research costs resources and SEED. One research runs at a time.

## 7. Units (draft numbers)

| Unit | Role | Attack / Defense | Speed (tiles/h) | Carry | Upkeep | Cost | Training (Barracks 1) | Unlock |
|---|---|---|---|---|---|---|---|---|
| Spearman | Balanced infantry | 40 / 35 | 6 | 50 | 1 | 180 | 15 min | start |
| Forager | Raider: low stats, high carry | 20 / 15 | 8 | 120 | 1 | 160 | 12 min | tier 1 |
| Shieldbearer | Defense | 15 / 70 | 5 | 20 | 1 | 220 | 18 min | tier 2 |
| Berserker | Attack | 75 / 20 | 6 | 40 | 1 | 250 | 20 min | tier 2 |
| Charger | Fast (rides a hamster ball) | 90 / 50 | 14 | 80 | 2 | 500 | 35 min | tier 3 |
| Catapult | Lowers the Walls | 30 / 10 | 3 | 0 | 4 | 950 | 70 min | tier 4 |

Army size is limited in the end by Food production (about 870 upkeep at max level).

## 8. Battle

- **Attack power** = Σ units' attack × (1 + Forge) × (1 + champion attack bonus) + champion Might (if the champion joins).
- **Defense power** = (Σ home units' defense × (1 + Forge) + champion Might if at home) × (1 + champion defense bonus) × (1 + Walls level × 4%) + 40 × Town Hall level.
- **Losses:** each side loses min(100%, 50% × enemy power ÷ own power) of its units.

| Attack : Defense | Attacker loses | Defender loses | Loot |
|---|---|---|---|
| 1 : 2 | 100% | 25% | no |
| 1 : 1 | 50% | 50% | no |
| 1.5 : 1 | 33% | 75% | no |
| 2 : 1 | 25% | 100% | yes |
| 3 : 1 | 17% | 100% | yes |

- **Defenders are wiped only when attack ≥ 2× defense.** Only then can the village be raided, and only then do Catapults work (every 20 surviving Catapults lower the Walls by 1 level, max 2 per attack).
- **Loot** = surviving units' carry × (1 + champion carry bonus + Logistics). Amounts protected by the Vault are excluded; the rest is taken evenly from the 4 resources.
- **No randomness:** outcomes can be computed in advance and the site shows a battle calculator.
- **Travel time** = distance ÷ speed of the slowest unit in the army.

## 9. Champion

- The Squeek NFT itself. Level cap 30 in Season 1.
- XP from battles (cost of killed enemy units ÷ 20) and from Squeektoshi's runs (about 110 XP a day, capped).
- 4 points per level: Might (+100 power), Attack and Defense (+0.8% per point, max 20%), Carry (+2% per point).
- Either joins an attack or stays home to defend. Never dies: after a lost battle it is injured for 12 hours; the hamster's runs speed up recovery.
- Looks change at levels 1, 10, 20 and 30.

## 10. World map

- 100 × 100 tiles, one tile per Squeek, with (x|y) coordinates. Tiles are assigned by a fixed shuffle of the token id, so consecutive ids are not neighbours.
- The map is browsed in 10 × 10 regions with a minimap of the whole world.
- Founded villages show an icon that grows with the Town Hall level and a plate with that level. Empty tiles are Squeeks whose owners have not founded yet.
- Markers: own village, clan members, beginner shield, armies on the move, incoming attacks.
- Selecting a village shows its owner, Town Hall level, distance, defenders at home, Walls, defense power, lootable amount and travel time per unit.
- Everything is public on-chain: there is no fog of war, and players can see each other's troops and incoming armies.

## 11. Protection and anti multi-account

- New villages have a 7-day beginner shield (cannot attack or be attacked).
- A village can be raided successfully at most 3 times a day.
- The Vault protects a fixed amount from raids.
- No trading between players, and clan members cannot send resources to each other. The Market only exchanges a player's own resources.
- Known gap: a player can still raid their own alt villages. The 3-raids-a-day limit reduces this but cannot fully stop it on-chain.

## 12. Clans (phase 2)

- Clan Hall Lv1 to join, Lv3 to found. Member cap = 3 × the founder's Clan Hall level (30 at Lv10).
- Members can send troops to help defend (capacity 50 upkeep per Clan Hall level). No resource sending.
- Clan chat is off-chain.

## 13. Economy simulation (v1)

600 villages over 150 days with Squeektoshi's real 7 nights (8,500–13,300 passes a night), four player types, proportional battles with the 2× rule, and the 2 + 2 build queue.

| Player type | Town Hall 5 | Town Hall 7 | Town Hall 8 | Town Hall 10 | Production lost to raids |
|---|---|---|---|---|---|
| Builder (3 logins a day) | day 16 | day 28 | day 41 | day 93 | 1.7% |
| Balanced (3 logins a day) | day 15 | day 27 | day 41 | day 93 | 1.6% |
| Raider (6 logins a day) | day 12 | day 29 | day 42 | day 102 | 31% (mostly to other raiders) |
| Casual (1 login a day) | day 15 | day 31 | day 42 | day 94 | 0% |

- About 1,100 SEED a day per village. Maxing the Town Hall, Wheelhouse and research needs about 129,000 SEED, so the hamster paces the top levels for everyone.
- Raiders get about 17.5% of their income from loot. Villages that quit lose about 16% of their output.
- The Market was not part of this simulation.
- The simulated players are simple bots; read the numbers as direction, not precise values.

## 14. Contracts (draft)

Within IMD's limit of 8 contracts:

1. SEED token (ERC-20, minted from settled wheel work, burned on spend)
2. Village (founding, plots, levels, construction queue, Town Hall rules)
3. Resources (production, wheel bonus, storage, Vault, Market exchange)
4. Army (training, upkeep, movements, battles, champion, research)
5. Clan (phase 2)

The contract that reads Squeekchain can be repointed through a public 72-hour timelock, which can be renounced.

## 15. Open items

- Which Squeekchain deployment to read (the live stream-game core or the core in the docs record).
- The Wheelhouse sprites show level numbers 1–5 that need cleaning.
- A SEED sink after everything is maxed (around day 100).
- `SPEC.md`: the contract-level rule text for the IMD build.
