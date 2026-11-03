# Squeek Wars · Game design (draft v2)

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
- **Food upkeep:** each upkeep point eats 0.5 Food every hour (v2; it was 1.0, which capped armies far too early).
- Output above Storehouse capacity is lost.
- On-chain this is computed lazily: the contract records each day's settled work and settles production on the next interaction.

## 4. Levels and construction

- Buildings, Town Hall, Walls and production sites have 10 levels; Storehouse and Vault have 20.
- Nothing can exceed the Town Hall level; Storehouse and Vault can go up to 2× the Town Hall level.
- **Construction:** two build slots work in parallel, and each slot can hold one queued order (four orders at most). Orders are paid when placed. An order can be cancelled for an 80% refund; the same goes for research and training.
- **Costs** are spread over all four resources (v2). In v1 most costs leaned on Wood and Stone, and the playtest stalled at Town Hall 3 for 9 days with Wood empty and Food full.
- New villages start with 750 of each resource and 1,500 SEED.
- Sprites have 5 looks: cardboard → wood → plaster & timber → stone → marble & gold.

## 5. Buildings

| Building | Role | Unlock | Count |
|---|---|---|---|
| Town Hall | Opens plots (4 at Lv1, +1 per level), sets level caps, faster construction, village guard | fixed | 1 |
| Walls | +4% defense per level; Catapults can lower it | fixed | 1 |
| Production sites | Wood, Food, Stone, Iron output | fixed | 8 |
| Wheelhouse | Caps the wheel bonus (+25% per level) | start | 1 |
| Storehouse | Storage capacity | start | several |
| Burrow | Troop room (upkeep capacity) | start | several |
| Barracks | Trains units, faster per level | start | 1 |
| Academy | Research tiers (Lv1/2/4/6/8 open tiers 1–5) | start | 1 |
| Vault | Amount protected from raids | Academy tier 1 | several |
| Forge | +2% attack and defense for all units per level | Academy tier 2 | 1 |
| Clan Hall | Join (Lv1) or found (Lv3) a clan, send and receive support troops | Academy tier 2 | 1 |
| Market | Exchange your own resources (100 → 25 at Lv1, +5 per level, 75 at Lv10) | Town Hall 2 | 1 |

There are 9 plot buildings for 12 plots, so the last 3 plots are a strategic choice (more Storehouses, Burrows or Vaults).

## 6. Academy research

| Tier | Academy level | Unlocks |
|---|---|---|
| 1 | 1 | Forager, Vault |
| 2 | 2 | Shieldbearer, Berserker, Scout, Forge, Clan Hall |
| 3 | 4 | Charger, Logistics (+20% carry) |
| 4 | 6 | Catapult, Field Medicine (10% of fallen units return) |
| 5 | 8 | Logistics II, Forced March (+20% speed) |

Research costs resources (split evenly) and SEED. One research runs at a time. v2 opens tiers earlier (v1: Academy 1/3/5/7/9) and moves the Market out of research.

## 7. Units (draft numbers)

| Unit | Role | Attack / Defense | Speed (tiles/h) | Carry | Upkeep | Cost | Training (Barracks 1) | Unlock |
|---|---|---|---|---|---|---|---|---|
| Spearman | Balanced infantry | 40 / 35 | 6 | 50 | 1 | 180 | 15 min | start |
| Forager | Raider: low stats, high carry | 20 / 15 | 8 | 120 | 1 | 160 | 12 min | tier 1 |
| Shieldbearer | Defense | 15 / 70 | 5 | 20 | 1 | 220 | 18 min | tier 2 |
| Berserker | Attack | 75 / 20 | 6 | 40 | 1 | 245 | 20 min | tier 2 |
| Scout | Spies on a village; does not fight | 0 / 5 | 16 | 0 | 1 | 130 | 8 min | tier 2 |
| Charger | Fast (rides a hamster ball) | 90 / 50 | 14 | 80 | 2 | 510 | 35 min | tier 3 |
| Catapult | Lowers the Walls | 30 / 10 | 3 | 0 | 4 | 930 | 70 min | tier 4 |

A maxed village grows about 1,150 Food an hour, enough for about 2,300 upkeep, so three level-10 Burrows (about 1,700 room) are the usual limit. Units can be dismissed (no refund).

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
- **No randomness, but missing information:** without fresh intel the game shows a defense range (about −25% to +30%). Scouting a village, or attacking it, reveals its exact troops, Walls and stock for 12 hours; then the calculator shows the exact result.
- **Pick on someone your size:** raids on villages 3 or more Town Hall levels below yours give half loot, no ranking points and no champion XP.
- **Walls damage stays:** Walls lowered by Catapults are rebuilt one level every 12 hours.
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
- Selecting a village shows its owner, clan, Town Hall level, distance and a defense range; after scouting also its defenders, Walls and lootable amount. Travel time per unit, scouting, attack and clan support start from the same panel. Desktop shows the same summary on hover; a box jumps to x|y or a player name.
- Open issue: contract state is public, so a player who reads the chain directly can see exact troops. Scouting only creates real fog of war if troop counts are stored hidden (for example as commitments). See open items.

## 11. Protection and anti multi-account

- New villages have a 7-day beginner shield (cannot attack or be attacked).
- **Peace shield** (bought with SEED, see section 13): 12 hours without attacks, once every 3 days; it ends if you attack.
- A village can be raided successfully at most 3 times a day.
- The Vault protects a fixed amount from raids.
- No trading between players, and clan members cannot send resources to each other. The Market only exchanges a player's own resources.
- Known gap: a player can still raid their own alt villages. The 3-raids-a-day limit reduces this but cannot fully stop it on-chain.

## 12. Clans

- Clan Hall Lv1 to join, Lv3 to found. Member cap = 3 × the founder's Clan Hall level (30 at Lv10). A player already in a clan declines invites.
- **Support:** members send troops to defend each other (capacity 50 upkeep per Clan Hall level). Support stays until recalled, still eats the sender's Food, and fights with the host's Walls. In the prototype, clan members near you also send defenders when an attack on you is announced. No resource sending.
- Members cannot attack each other. Clan chat is off-chain.

## 13. Ranking and the SEED treasury

- **Ranking** (per region and per season):
  - **Village points:** resources spent on buildings and production sites ÷ 100.
  - **Attack points:** resource value of defenders killed while attacking.
  - **Defense points:** resource value of attackers killed while defending.
  - **Raiders:** resources looted.
  - **Clans:** sum of the members' village points.
- **Weekly titles:** Top Attacker, Top Defender and Top Raider get a title and badge, with no resources or SEED, so feeder accounts gain nothing. Raids on villages 3+ Town Hall levels below you give no points. Everything resets each season.
- **SEED treasury** (all SEED spent is burned):

  | Item | SEED | Effect |
  |---|---|---|
  | Wheel Festival | 2,500 | +20% output of every resource for 24 h |
  | Peace shield | 4,000 | No attacks for 12 h, once every 3 days, ends if you attack |
  | Banner colour | 1,000 | Your flag colour on the map and in the ranking |

## 14. First steps

A quest list of 14 steps leads new players through the core loop (Wheelhouse → production → Storehouse → Town Hall 2 → Academy → research → Barracks → 10 units → Walls → Vault → scout → first raid → Town Hall 4 → clan). Each step pays 120–500 of every resource; nothing pays SEED, which only the hamster makes.

## 15. Economy simulation

600 villages over 150 days with Squeektoshi's real 7 nights (8,500–13,300 passes a night), four player types, proportional battles with the 2× rule, and the 2 + 2 build queue. Numbers are for the v2 parameters; v1 in brackets.

| Player type | Town Hall 5 | Town Hall 7 | Town Hall 8 | Town Hall 10 | Production lost to raids |
|---|---|---|---|---|---|
| Builder (3 logins a day) | day 13 (16) | day 29 (28) | day 41 (41) | day 93 (93) | 0.2% (1.7%) |
| Balanced (3 logins a day) | day 12 (15) | day 29 (27) | day 45 (41) | day 100 (93) | 0% (1.6%) |
| Raider (6 logins a day) | day 12 (12) | day 29 (29) | day 46 (42) | day 102 (102) | 24% (31%) |
| Casual (1 login a day) | day 14 (15) | day 31 (31) | day 44 (42) | day 97 (94) | 2.6% (0%) |

- About 1,100 SEED a day per village. Maxing the Town Hall, Wheelhouse and research needs about 129,000 SEED, so the hamster paces the top levels for everyone. That is why v2 changes the early game (Town Hall 5 three days sooner) but hardly the late game.
- Raiders get about 14% of their income from loot (v1: 17.5%). Villages that quit lose about 9% of their output.
- The Market, scouting, clan support and the raids-from-neighbours logic of the prototype are not part of this simulation; the prototype's own 15-day playtest checks them (see `docs/PLAYTEST.md`).
- The simulated players are simple bots; read the numbers as direction, not precise values.

## 16. Contracts (draft)

Within IMD's limit of 8 contracts:

1. SEED token (ERC-20, minted from settled wheel work, burned on spend)
2. Village (founding, plots, levels, construction queue, Town Hall rules)
3. Resources (production, wheel bonus, storage, Vault, Market exchange)
4. Army (training, upkeep, movements, battles, champion, research)
5. Clan (phase 2)

The contract that reads Squeekchain can be repointed through a public 72-hour timelock, which can be renounced.

## 17. Open items

- Which Squeekchain deployment to read (the live stream-game core or the core in the docs record).
- Fog of war on-chain: scouting only hides information if troop counts are not readable from contract state (commit-reveal or hidden counts), otherwise the defense range is a UI convenience.
- The Clan Hall has one look for all levels; banners mark levels 3, 5 and 7 until 5 staged sprites exist (prompts in `art/PROMPTS.md`).
- `SPEC.md`: the contract-level rule text for the IMD build.
