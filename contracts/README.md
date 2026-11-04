# Squeek Wars contracts · V2

V2 keeps the game of the first Testnet season (IMD launch 2935, MIT) and moves every number into one owner-editable table, **GameConfig**. The owner can rebalance the economy, add units and add buildings without redeploying. Villages, armies and ranking counters stay as they are; a change applies from the next action on.

## Contracts

| Contract | Role | Constructor |
| --- | --- | --- |
| `GameConfig` | The rule table and its owner | `owner` |
| `SeedLedger` | Daily checkpoint of SqueekCore work, SEED balances, wheel bonus history | `config, squeekCore, squeekNft` |
| `Clans` | Clans and season/week ranking counters | `config` |
| `Army` | Troops, movements, battles, champions, wild camps | `config, ledger, clans` |
| `Villages` | The game: every player action starts here | `config, ledger, clans, army` |

Deploy them in that order. There are no wiring calls after deployment.

## What the owner can change

Every setter on `GameConfig` is owner-only, bumps `version` and emits `Changed(what, index, version)`, so the site can show a public change log.

| Setter | Covers |
| --- | --- |
| `setEconomy` | Starting resources, SEED and shield; field output, costs and times; plots; cancel refund; troop upkeep; Barracks speed; Market rate; Treasury prices and durations; the Squeek build-time cut; SEED per work, the wheel bonus and the daily champion XP |
| `setStorage` | Storehouse, Vault and Burrow formulas |
| `setWar` | Win ratio, loss rate, scouting bonus, raids per day, weak-target rule, siege, Walls repair, Town Hall guard, Forge and Walls bonuses, support cap, camp damage |
| `setHero` | Champion Might, bonuses per point, caps, points per level, max level, XP curve, the Squeek bonus |
| `setWild` | Wild camp defense and stock growth, sizes, regrowth |
| `setSocial` | Clan Hall levels to join and found, member caps |
| `setFieldCosts` | Base costs of the four field types |
| `setUnit(kind, unit, name)` | Any of **16 unit slots**: on/off, stats, cost, training time, research tier, role (0 normal, 1 scout, 2 siege) |
| `setBuilding(kind, building, name)` | Any of **16 building slots**. Slots 0–10 keep their built-in roles (Town Hall … Market); every slot can also carry one effect per level: defense %, attack %, output %, storage, troop room, training speed %, build speed %, carry % or vault |
| `setTier(tier, …)`, `setTierCount` | Up to **8 research tiers**: cost, SEED, time, Academy level, and the carry, speed and medicine bonuses each tier unlocks |
| `transferOwnership` | Hand the table to another wallet |

`SeedLedger.setReaders(core, nft)` lets the same owner point the game at another SqueekCore or Squeek NFT; a new Core is baselined at its current counter.

Guard rails keep the game from breaking: level caps stay within what the formulas support (20, and 10 for the Town Hall and the Wheelhouse), divisors are never zero, the Town Hall and Walls cannot be switched off, and enabled units need a speed and a room size.

## Other changes from the first season

- **Wild camps spread over the whole map.** They sit at every 49th map slot from 48 instead of every 50th, so they no longer stack in two columns.
- Arrays of units are `uint32[16]` (`home`, `send`, `Movement.units`), and `Village.buildings` is `uint8[16]`. Build targets are 0–7 for fields and 8–23 for building slots.
- `Army.campTile(id)` and `Villages.villageSlot(n)` expose the map layout.

## Build and test

```sh
npm install solc@0.8.26 ganache@7.9.2
node tools/compile.js src artifacts.json
node test/scenario.js artifacts.json node_modules/ganache ../site/vendor/ethers.umd.min.js
```

The scenario test deploys everything on a local chain with mock Squeekchain contracts and plays a season: founding, production, building, the checkpoint and SEED, the wheel bonus, research, training, a camp raid, a village raid, clans, Squeeks, and owner edits (a new unit, a new building, new economy and war numbers). It compiles for the Shanghai EVM so the local chain can run it; Sepolia runs the same bytecode.
