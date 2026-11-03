"""Generates docs/BUILDINGS.md from params.py (all numbers are draft v1)."""
from params import *
def f0(x): return f"{int(round(x)):,}"
def f1(x): return f"{x:.1f}"
def hrs(h):
    if h < 1: return f"{f0(h*60)} min"
    return f"{f1(h)} h" if h < 10 else f"{f0(h)} h"
def tb(head, rows): return "| " + " | ".join(head) + " |\n|" + "---|" * len(head) + "\n" + "".join("| " + " | ".join(str(c) for c in r) + " |\n" for r in rows)
def cost(n, L): return sum(B[n][0]) * B[n][1] ** (L - 1)
def tm(n, L): return B[n][2] * B[n][3] ** (L - 1)
def seed(n, L): return SEED_COST[n][0] * SEED_COST[n][1] ** (L - 1) if n in SEED_COST else 0
LOOK = ['cardboard', 'wood', 'plaster & timber', 'stone', 'marble & gold']
def look10(L): return LOOK[(L - 1) // 2]
def look20(L): return LOOK[(L - 1) // 4]
MARKET = {L: 25 + 5 * (L - 1) for L in range(1, 10)}; MARKET[10] = 75
o = ["# Squeek Wars · Buildings and levels (draft v1)\n",
     "Costs are the sum of the 4 resources (Wood, Food, Stone, Iron); the per-resource split is in `sim/params.py`. Times are before the Town Hall speed bonus. Sprites change every 2 levels (10-level buildings) or every 4 levels (20-level buildings): cardboard → wood → plaster & timber → stone → marble & gold.\n",
     "**General rules:** no building or field can exceed the Town Hall level; Storehouse and Vault can go up to 2× the Town Hall level. Two build slots run in parallel and each slot holds one queued order. Orders are paid when placed.\n"]
rows = [[L, min(12, 3 + L), L, min(20, 2 * L), f"-{int(MERKEZ_SPEEDUP*100*(L-1))}%", f0(BASE_DEF_PER_MERKEZ * L), '–' if L == 1 else f0(cost('merkez', L)), '–' if L == 1 else f0(seed('merkez', L)), '–' if L == 1 else hrs(tm('merkez', L)), look10(L)] for L in range(1, 11)]
o += ["## Town Hall (fixed, centre)\n", tb(['Level', 'Open plots', 'Building cap', 'Storehouse/Vault cap', 'Build time', 'Village guard', 'Resources', 'SEED', 'Time', 'Look'], rows), "Starts at level 1. Feeds 30 upkeep worth of troops even without a Burrow.\n"]
rows = [[L, f"+{int(SUR_STEP*100*L)}%", '–' if L == 1 else f0(cost('sur', L)), '–' if L == 1 else hrs(tm('sur', L)), look10(L)] for L in range(1, 11)]
o += ["## Walls (fixed, around the village)\n", tb(['Level', 'Defense bonus', 'Resources', 'Time', 'Look'], rows), "Starts at level 1. If an attack wins (≥ 2× defense), every 20 surviving Catapults lower the Walls by 1 level (max 2 per attack).\n"]
rows = []
for L in range(1, 11):
    base = FIELD_BASE * FIELD_G ** (L - 1); m = 1 + min(CARK_STEP * L, 11000 / PASS_PER_BONUS)
    rows.append([L, f1(base), f0(base * m), '–' if L == 1 else f0(160 * FIELD_CG ** (L - 1)), '–' if L == 1 else hrs(FIELD_T1 * FIELD_TG ** (L - 1))])
o += ["## Production sites (8: 2 forests, 2 sunflower farms, 2 quarries, 2 iron mines)\n", tb(['Level', 'Base output / h', 'With Wheelhouse at same level, normal night / h', 'Resources', 'Time'], rows),
      "All start at level 1. Output = base × (1 + wheel bonus). The daily wheel bonus comes from Squeektoshi's settled passes (11,000 passes ≈ +255%) and is capped by the Wheelhouse. If the hamster does not run, base output continues.\n"]
rows = [[L, f"+{int(CARK_STEP*100*L)}%", f0(cost('cark', L)), f0(seed('cark', L)), hrs(tm('cark', L)), look10(L)] for L in range(1, 11)]
o += ["## Wheelhouse (1, unlocked)\n", tb(['Level', 'Wheel bonus cap', 'Resources', 'SEED', 'Time', 'Look'], rows)]
rows = [[L, f0(AMBAR_CAP * AMBAR_G ** (L - 1)), f0(cost('ambar', L)), hrs(tm('ambar', L)), look20(L)] for L in range(1, 21)]
o += ["## Storehouse (several allowed, unlocked, 20 levels)\n", tb(['Level', 'Added capacity (per resource)', 'Resources', 'Time', 'Look'], rows), f"Without a Storehouse the village holds {f0(STORE_BASE)} of each resource. Output above capacity is lost.\n"]
rows = [[L, f0(YANAK_CAP * YANAK_G ** (L - 1)), f0(cost('yanak', L)), hrs(tm('yanak', L)), look20(L)] for L in range(1, 21)]
o += ["## Vault (several allowed, Academy tier 1, 20 levels)\n", tb(['Level', 'Protected amount (per resource)', 'Resources', 'Time', 'Look'], rows), f"Even without a Vault, {f0(PROT_BASE)} of each resource is protected. Protected amounts cannot be raided.\n"]
rows = [[L, f0(yuva_pop(L)), f0(cost('yuva', L)), hrs(tm('yuva', L)), look10(L)] for L in range(1, 11)]
o += ["## Burrow (several allowed, unlocked)\n", tb(['Level', 'Upkeep capacity', 'Resources', 'Time', 'Look'], rows), "Each unit eats its upkeep in Food per hour and fills Burrow capacity (Spearman, Forager, Shieldbearer, Berserker 1; Charger 2; Catapult 4).\n"]
rows = [[L, f"×{f1(KISLA_SPEED**(L-1))}", f0(cost('kisla', L)), hrs(tm('kisla', L)), look10(L)] for L in range(1, 11)]
o += ["## Barracks (1, unlocked)\n", tb(['Level', 'Training time', 'Resources', 'Time', 'Look'], rows), "One training batch at a time. The Academy decides which units can be trained; Spearman is available from the start.\n"]
TN = {'akinci': 'Forager', 'yanak': 'Vault', 'kalkan': 'Shieldbearer', 'kemirici': 'Berserker', 'demirci': 'Forge', 'klan': 'Clan Hall', 'buyukyanak': 'Logistics (+20% carry)',
      'suvari': 'Charger', 'pazar': 'Market', 'mancinik': 'Catapult', 'sargi': 'Field Medicine (10% of fallen units return)', 'buyukyanak2': 'Logistics II', 'hizli': 'Forced March (+20% speed)'}
rows = []
for L in range(1, 11):
    t = tier_open(L); new = ', '.join(TN[n] for n, tt in RESEARCH.items() if tt == t) if L % 2 == 1 else '–'
    rows.append([L, t, new, f"×{f1(0.95**(L-1))}", f0(cost('akademi', L)), hrs(tm('akademi', L)), look10(L)])
o += ["## Academy (1, unlocked)\n", tb(['Level', 'Open tier', 'Research unlocked at this level', 'Research time', 'Resources', 'Time', 'Look'], rows)]
o += ["Research cost by tier:\n", tb(['Tier', 'Resources', 'SEED', 'Time'], [[t, f0(sum(research_cost(t))), f0(research_seed(t)), hrs(research_time(t, 2 * t - 1))] for t in range(1, 6)])]
rows = [[L, f"+{int(DEMIRCI_STEP*100*L)}%", f0(cost('demirci', L)), hrs(tm('demirci', L)), look10(L)] for L in range(1, 11)]
o += ["## Forge (1, Academy tier 2)\n", tb(['Level', 'Attack and defense, all units', 'Resources', 'Time', 'Look'], rows)]
rows = [[L, 'join' if L < 3 else 'found', 3 * L, f0(50 * L), f0(cost('klan', L)), hrs(tm('klan', L)), look10(L)] for L in range(1, 11)]
o += ["## Clan Hall (1, Academy tier 2, phase 2)\n", tb(['Level', 'Clan', 'Member cap (founder)', 'Allied reinforcements (upkeep)', 'Resources', 'Time', 'Look'], rows), "Clan members cannot send resources to each other (anti multi-account); they can only send troops to help defend. Clan chat is off-chain.\n"]
rows = [[L, f"100 → {MARKET[L]}", f0(cost('pazar', L)), hrs(tm('pazar', L)), look10(L)] for L in range(1, 11)]
o += ["## Market (1, Academy tier 3)\n", tb(['Level', 'Exchange rate', 'Resources', 'Time', 'Look'], rows), "No trading between players. The Market only converts your own resources: give 100 of one, receive the listed amount of another. +5 per level, level 10 gets a final bonus to 75. SEED cannot be exchanged.\n"]
o += ["## Champion (the Squeek NFT)\n", tb(['Champion level', 'Look', 'Total XP needed'], [['1–9', 'red scarf, wooden sword', '0–6,400'], ['10–19', 'leather armor, shield', '8,100–32,400'], ['20–29', 'steel armor, blue cape', '36,100–78,400'], ['30', 'golden armor, crown', '84,100']]),
      "4 points per level: Might (+100 power), Attack and Defense (+0.8% per point, max 20%), Carry (+2% per point). XP comes from battles (killed enemy cost ÷ 20) and from the hamster's runs (~110 per day). The champion never dies; after a lost battle it is injured for 12 hours.\n"]
open('../docs/BUILDINGS.md', 'w').write("\n".join(o)); print('ok')
