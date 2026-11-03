# Squeek Wars · Buildings and levels (draft v5)

Costs are the sum of the 4 resources (Wood, Food, Stone, Iron); the per-resource split is in `sim/params.py`. Times are before the Town Hall speed bonus. Sprites change every 2 levels (10-level buildings) or every 4 levels (20-level buildings): cardboard → wood → plaster & timber → stone → marble & gold.

**General rules:** no building or field can exceed the Town Hall level; Storehouse and Vault can go up to 2× the Town Hall level. Two build slots run in parallel and each slot holds one queued order. Orders are paid when placed.

## Town Hall (fixed, centre)

| Level | Open plots | Building cap | Storehouse/Vault cap | Build time | Village guard | Resources | SEED | Time | Look |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 1 | 2 | -0% | 40 | – | – | – | cardboard |
| 2 | 5 | 2 | 4 | -3% | 80 | 1,225 | 1,000 | 1.1 h | cardboard |
| 3 | 6 | 3 | 6 | -6% | 120 | 2,144 | 1,501 | 1.7 h | wood |
| 4 | 7 | 4 | 8 | -9% | 160 | 3,752 | 2,251 | 2.5 h | wood |
| 5 | 8 | 5 | 10 | -12% | 200 | 6,565 | 3,377 | 3.8 h | plaster & timber |
| 6 | 9 | 6 | 12 | -15% | 240 | 11,489 | 5,065 | 5.7 h | plaster & timber |
| 7 | 10 | 7 | 14 | -18% | 280 | 20,106 | 7,598 | 8.5 h | stone |
| 8 | 11 | 8 | 16 | -21% | 320 | 35,186 | 11,396 | 13 h | stone |
| 9 | 12 | 9 | 18 | -24% | 360 | 61,575 | 17,094 | 19 h | marble & gold |
| 10 | 12 | 10 | 20 | -27% | 400 | 107,756 | 25,642 | 29 h | marble & gold |

Starts at level 1. Feeds 30 upkeep worth of troops even without a Burrow.

## Walls (fixed, around the village)

| Level | Defense bonus | Resources | Time | Look |
|---|---|---|---|---|
| 1 | +4% | – | – | cardboard |
| 2 | +8% | 810 | 52 min | cardboard |
| 3 | +12% | 1,312 | 1.3 h | wood |
| 4 | +16% | 2,126 | 1.8 h | wood |
| 5 | +20% | 3,444 | 2.7 h | plaster & timber |
| 6 | +24% | 5,579 | 3.8 h | plaster & timber |
| 7 | +28% | 9,038 | 5.6 h | stone |
| 8 | +32% | 14,641 | 8.1 h | stone |
| 9 | +36% | 23,719 | 12 h | marble & gold |
| 10 | +40% | 38,424 | 17 h | marble & gold |

Starts at level 1. If an attack wins (≥ 2× defense), every 20 surviving Catapults lower the Walls by 1 level (max 2 per attack).

## Production sites (8: 2 forests, 2 sunflower farms, 2 quarries, 2 iron mines)

| Level | Base output / h | With Wheelhouse at same level, normal night / h | Resources | Time |
|---|---|---|---|---|
| 1 | 8.0 | 10 | – | – |
| 2 | 11.2 | 17 | 256 | 34 min |
| 3 | 15.7 | 27 | 410 | 47 min |
| 4 | 22.0 | 44 | 655 | 1.1 h |
| 5 | 30.7 | 69 | 1,049 | 1.5 h |
| 6 | 43.0 | 108 | 1,678 | 2.2 h |
| 7 | 60.2 | 166 | 2,684 | 3.0 h |
| 8 | 84.3 | 253 | 4,295 | 4.2 h |
| 9 | 118.1 | 384 | 6,872 | 5.9 h |
| 10 | 165.3 | 579 | 10,995 | 8.3 h |

All start at level 1. Output = base × (1 + wheel bonus). The daily wheel bonus comes from Squeektoshi's settled passes (11,000 passes ≈ +255%) and is capped by the Wheelhouse. If the hamster does not run, base output continues.

## Wheelhouse (1, unlocked)

| Level | Wheel bonus cap | Resources | SEED | Time | Look |
|---|---|---|---|---|---|
| 1 | +25% | 400 | 300 | 36 min | cardboard |
| 2 | +50% | 672 | 450 | 52 min | cardboard |
| 3 | +75% | 1,129 | 675 | 1.3 h | wood |
| 4 | +100% | 1,897 | 1,012 | 1.8 h | wood |
| 5 | +125% | 3,186 | 1,519 | 2.7 h | plaster & timber |
| 6 | +150% | 5,353 | 2,278 | 3.8 h | plaster & timber |
| 7 | +175% | 8,993 | 3,417 | 5.6 h | stone |
| 8 | +200% | 15,109 | 5,126 | 8.1 h | stone |
| 9 | +225% | 25,382 | 7,689 | 12 h | marble & gold |
| 10 | +250% | 42,643 | 11,533 | 17 h | marble & gold |

## Storehouse (several allowed, unlocked, 20 levels)

| Level | Added capacity (per resource) | Resources | Time | Look |
|---|---|---|---|---|
| 1 | 1,200 | 400 | 27 min | cardboard |
| 2 | 1,464 | 512 | 32 min | cardboard |
| 3 | 1,786 | 655 | 39 min | cardboard |
| 4 | 2,179 | 839 | 47 min | cardboard |
| 5 | 2,658 | 1,074 | 56 min | wood |
| 6 | 3,243 | 1,374 | 1.1 h | wood |
| 7 | 3,957 | 1,759 | 1.3 h | wood |
| 8 | 4,827 | 2,252 | 1.6 h | wood |
| 9 | 5,889 | 2,882 | 1.9 h | plaster & timber |
| 10 | 7,185 | 3,689 | 2.3 h | plaster & timber |
| 11 | 8,766 | 4,722 | 2.8 h | plaster & timber |
| 12 | 10,694 | 6,045 | 3.3 h | plaster & timber |
| 13 | 13,047 | 7,737 | 4.0 h | stone |
| 14 | 15,917 | 9,904 | 4.8 h | stone |
| 15 | 19,419 | 12,677 | 5.8 h | stone |
| 16 | 23,691 | 16,226 | 6.9 h | stone |
| 17 | 28,903 | 20,769 | 8.3 h | marble & gold |
| 18 | 35,261 | 26,585 | 10.0 h | marble & gold |
| 19 | 43,019 | 34,028 | 12 h | marble & gold |
| 20 | 52,483 | 43,556 | 14 h | marble & gold |

Without a Storehouse the village holds 1,000 of each resource. Output above capacity is lost.

## Vault (several allowed, Academy tier 1, 20 levels)

| Level | Protected amount (per resource) | Resources | Time | Look |
|---|---|---|---|---|
| 1 | 250 | 260 | 27 min | cardboard |
| 2 | 305 | 333 | 32 min | cardboard |
| 3 | 372 | 426 | 39 min | cardboard |
| 4 | 454 | 545 | 47 min | cardboard |
| 5 | 554 | 698 | 56 min | wood |
| 6 | 676 | 893 | 1.1 h | wood |
| 7 | 824 | 1,143 | 1.3 h | wood |
| 8 | 1,006 | 1,464 | 1.6 h | wood |
| 9 | 1,227 | 1,873 | 1.9 h | plaster & timber |
| 10 | 1,497 | 2,398 | 2.3 h | plaster & timber |
| 11 | 1,826 | 3,070 | 2.8 h | plaster & timber |
| 12 | 2,228 | 3,929 | 3.3 h | plaster & timber |
| 13 | 2,718 | 5,029 | 4.0 h | stone |
| 14 | 3,316 | 6,437 | 4.8 h | stone |
| 15 | 4,046 | 8,240 | 5.8 h | stone |
| 16 | 4,936 | 10,547 | 6.9 h | stone |
| 17 | 6,021 | 13,500 | 8.3 h | marble & gold |
| 18 | 7,346 | 17,280 | 10.0 h | marble & gold |
| 19 | 8,962 | 22,118 | 12 h | marble & gold |
| 20 | 10,934 | 28,311 | 14 h | marble & gold |

Even without a Vault, 150 of each resource is protected. Protected amounts cannot be raided.

## Burrow (several allowed, unlocked)

| Level | Upkeep capacity | Resources | Time | Look |
|---|---|---|---|---|
| 1 | 20 | 300 | 30 min | cardboard |
| 2 | 45 | 465 | 44 min | cardboard |
| 3 | 75 | 721 | 1.1 h | wood |
| 4 | 112 | 1,117 | 1.5 h | wood |
| 5 | 157 | 1,732 | 2.2 h | plaster & timber |
| 6 | 211 | 2,684 | 3.2 h | plaster & timber |
| 7 | 276 | 4,160 | 4.6 h | stone |
| 8 | 354 | 6,448 | 6.7 h | stone |
| 9 | 446 | 9,995 | 9.8 h | marble & gold |
| 10 | 555 | 15,492 | 14 h | marble & gold |

Each upkeep point eats 0.5 Food per hour and fills Burrow capacity (Spearman, Forager, Shieldbearer, Berserker, Scout 1; Charger 2; Catapult 4).

## Barracks (1, unlocked)

| Level | Training time | Resources | Time | Look |
|---|---|---|---|---|
| 1 | ×1.0 | 600 | 36 min | cardboard |
| 2 | ×0.9 | 972 | 52 min | cardboard |
| 3 | ×0.8 | 1,575 | 1.3 h | wood |
| 4 | ×0.7 | 2,551 | 1.8 h | wood |
| 5 | ×0.7 | 4,132 | 2.7 h | plaster & timber |
| 6 | ×0.6 | 6,695 | 3.8 h | plaster & timber |
| 7 | ×0.5 | 10,845 | 5.6 h | stone |
| 8 | ×0.5 | 17,569 | 8.1 h | stone |
| 9 | ×0.4 | 28,462 | 12 h | marble & gold |
| 10 | ×0.4 | 46,109 | 17 h | marble & gold |

One training batch at a time. The Academy decides which units can be trained; Spearman is available from the start.

## Academy (1, unlocked)

| Level | Open tier | Research unlocked at this level | Research time | Resources | Time | Look |
|---|---|---|---|---|---|---|
| 1 | 1 | Forager, Vault | ×1.0 | 700 | 36 min | cardboard |
| 2 | 2 | Shieldbearer, Berserker, Scout, Forge, Clan Hall | ×0.9 | 1,134 | 52 min | cardboard |
| 3 | 2 | – | ×0.9 | 1,837 | 1.3 h | wood |
| 4 | 3 | Charger, Logistics (+20% carry) | ×0.9 | 2,976 | 1.8 h | wood |
| 5 | 3 | – | ×0.8 | 4,821 | 2.7 h | plaster & timber |
| 6 | 4 | Catapult, Field Medicine (10% of fallen units return) | ×0.8 | 7,810 | 3.8 h | plaster & timber |
| 7 | 4 | – | ×0.7 | 12,653 | 5.6 h | stone |
| 8 | 5 | Logistics II, Forced March (+20% speed) | ×0.7 | 20,498 | 8.1 h | stone |
| 9 | 5 | – | ×0.7 | 33,206 | 12 h | marble & gold |
| 10 | 5 | – | ×0.6 | 53,794 | 17 h | marble & gold |

Research cost by tier:

| Tier | Resources | SEED | Time |
|---|---|---|---|
| 1 | 600 | 300 | 2.0 h |
| 2 | 1,320 | 600 | 3.4 h |
| 3 | 2,904 | 1,200 | 5.6 h |
| 4 | 6,389 | 2,400 | 9.0 h |
| 5 | 14,055 | 4,800 | 15 h |

## Forge (1, Academy tier 2)

| Level | Attack and defense, all units | Resources | Time | Look |
|---|---|---|---|---|
| 1 | +2% | 640 | 36 min | cardboard |
| 2 | +4% | 1,037 | 52 min | cardboard |
| 3 | +6% | 1,680 | 1.3 h | wood |
| 4 | +8% | 2,721 | 1.8 h | wood |
| 5 | +10% | 4,408 | 2.7 h | plaster & timber |
| 6 | +12% | 7,141 | 3.8 h | plaster & timber |
| 7 | +14% | 11,568 | 5.6 h | stone |
| 8 | +16% | 18,741 | 8.1 h | stone |
| 9 | +18% | 30,360 | 12 h | marble & gold |
| 10 | +20% | 49,183 | 17 h | marble & gold |

## Clan Hall (1, Academy tier 2)

| Level | Clan | Member cap (founder) | Allied reinforcements (upkeep) | Resources | Time | Look |
|---|---|---|---|---|---|---|
| 1 | join | 3 | 50 | 700 | 36 min | cardboard |
| 2 | join | 6 | 100 | 1,134 | 52 min | cardboard |
| 3 | found | 9 | 150 | 1,837 | 1.3 h | wood |
| 4 | found | 12 | 200 | 2,976 | 1.8 h | wood |
| 5 | found | 15 | 250 | 4,821 | 2.7 h | plaster & timber |
| 6 | found | 18 | 300 | 7,810 | 3.8 h | plaster & timber |
| 7 | found | 21 | 350 | 12,653 | 5.6 h | stone |
| 8 | found | 24 | 400 | 20,498 | 8.1 h | stone |
| 9 | found | 27 | 450 | 33,206 | 12 h | marble & gold |
| 10 | found | 30 | 500 | 53,794 | 17 h | marble & gold |

Clan members cannot send resources to each other (anti multi-account); they can only send troops to help defend. Clan chat is off-chain.

## Market (1, Town Hall 2)

| Level | Exchange rate | Resources | Time | Look |
|---|---|---|---|---|
| 1 | 100 → 25 | 650 | 36 min | cardboard |
| 2 | 100 → 30 | 1,053 | 52 min | cardboard |
| 3 | 100 → 35 | 1,706 | 1.3 h | wood |
| 4 | 100 → 40 | 2,763 | 1.8 h | wood |
| 5 | 100 → 45 | 4,477 | 2.7 h | plaster & timber |
| 6 | 100 → 50 | 7,253 | 3.8 h | plaster & timber |
| 7 | 100 → 55 | 11,749 | 5.6 h | stone |
| 8 | 100 → 60 | 19,033 | 8.1 h | stone |
| 9 | 100 → 65 | 30,834 | 12 h | marble & gold |
| 10 | 100 → 75 | 49,951 | 17 h | marble & gold |

No trading between players. The Market only converts your own resources: give 100 of one, receive the listed amount of another. +5 per level, level 10 gets a final bonus to 75. SEED can be given at the same rate and turns into resources, never the other way.

## Squeek build speed

| Squeeks held | 0 | 1 | 2 | 3 | 5 | 10 |
|---|---|---|---|---|---|---|
| Construction time after a full night | – | -15.0% | -22.5% | -26.2% | -29.1% | -30.0% |

For buildings and production sites, fixed when the order is placed. Scaled down after a weak night (full effect from 11,000 laps). Research and training are not affected.

## Champion (one per village)

| Champion level | Look | Total XP needed |
|---|---|---|
| 1–9 | red scarf, wooden sword | 0–6,400 |
| 10–19 | leather armor, shield | 8,100–32,400 |
| 20–29 | steel armor, blue cape | 36,100–78,400 |
| 30 | golden armor, crown | 84,100 |

4 points per level: Might 50 + 25 per point, Attack and Defense +0.5% per point (max 10%), Carry +1% per point (max 20%). XP comes from battles (killed enemy cost ÷ 20) and from the hamster's runs (~110 per day). The champion never dies; after a lost battle it is injured for 12 hours. Every village has one. If the wallet holds a Squeek, it is a Squeek champion: +10% XP and +10% to every stat, with a golden glow.
