# Economy simulation

Agent-based simulation of villages, production, construction, research, armies, raids and champions. All numbers live in `params.py`; `make_buildings_md.py` turns them into `docs/BUILDINGS.md`.

```bash
cd sim
python3 run150.py prop 2 2   # 150 days, proportional battles, 2 build slots with 1 queued order each
```

The run writes `res150_prop_s2d2.json` with milestone days per player type, raid losses, loot share and champion levels.

Player types in the code (keys are Turkish): `ciftci` = builder, `dengeli` = balanced, `yagmaci` = raider, `gundelik` = casual (1 login a day). Units: `piyade` = Spearman, `akinci` = Forager, `kalkan` = Shieldbearer, `kemirici` = Berserker, `suvari` = Charger, `mancinik` = Catapult. Buildings: `merkez` = Town Hall, `cark` = Wheelhouse, `ambar` = Storehouse, `yanak` = Vault, `yuva` = Burrow, `kisla` = Barracks, `akademi` = Academy, `demirci` = Forge, `sur` = Walls, `klan` = Clan Hall, `pazar` = Market.

Squeektoshi's nightly passes are sampled from 7 real nights (8,505–13,297 settled passes).
