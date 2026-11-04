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
| `Chat` | Add-on: chat and announcements, kept in events. Wallets with a village talk (280 bytes, 15 s apart); the GameConfig owner announces, hides messages and mutes wallets | `config, villages` |

Deploy them in that order. There are no wiring calls after deployment. `Chat` can be added to a running season at any time (deploy.html has the step).

## Season 2 on Sepolia

| Contract | Address | Source |
| --- | --- | --- |
| `GameConfig` | [0xd1eca225399ab5b6220bf522c2e0f964f75a4ce7](https://sepolia.etherscan.io/address/0xd1eca225399ab5b6220bf522c2e0f964f75a4ce7) | [Sourcify](https://repo.sourcify.dev/11155111/0xD1eCa225399Ab5b6220Bf522c2E0F964f75a4Ce7) |
| `SeedLedger` | [0x36fa35c9583ed036aff17d7aa49db8c4d737c5af](https://sepolia.etherscan.io/address/0x36fa35c9583ed036aff17d7aa49db8c4d737c5af) | [Sourcify](https://repo.sourcify.dev/11155111/0x36fA35c9583ed036aFf17D7aA49DB8C4d737c5AF) |
| `Clans` | [0x6c5072663b7b7b2d65f09b140536b3cac21f26ec](https://sepolia.etherscan.io/address/0x6c5072663b7b7b2d65f09b140536b3cac21f26ec) | [Sourcify](https://repo.sourcify.dev/11155111/0x6C5072663b7b7B2d65f09b140536b3Cac21F26ec) |
| `Army` | [0x84e5751a7b168df2376213aa67ce7ee641048eab](https://sepolia.etherscan.io/address/0x84e5751a7b168df2376213aa67ce7ee641048eab) | [Sourcify](https://repo.sourcify.dev/11155111/0x84e5751a7b168df2376213AA67ce7ee641048Eab) |
| `Villages` | [0xd7437dc56da2162cb190b0a20df7c6699e4e9b6e](https://sepolia.etherscan.io/address/0xd7437dc56da2162cb190b0a20df7c6699e4e9b6e) | [Sourcify](https://repo.sourcify.dev/11155111/0xd7437Dc56DA2162cB190B0a20dF7C6699e4e9b6E) |
| `Chat` | [0x150e32b56c9ff8ed04ae7ad9819adfab67b6c5a6](https://sepolia.etherscan.io/address/0x150e32b56c9ff8ed04ae7ad9819adfab67b6c5a6) | [Sourcify](https://repo.sourcify.dev/11155111/0x150E32B56C9fF8ED04AE7Ad9819aDfab67B6C5A6) |

All six are verified on Sourcify with a full match of the creation and runtime code. `../site/verify/input.json` is the exact compiler input of the five game contracts (`input-chat.json` adds `Chat.sol` for the add-on) (solc 0.8.26+commit.8a97fa7a, via-IR, optimizer 200, Shanghai, no metadata hash) and `../site/verify/contracts.json` holds the constructor arguments; `tools/verify-input.js` rebuilds both from `src` and checks the compiled code against the chain. The owner page of the site (`owner.html`) sends the same input to Etherscan with the owner's own Etherscan API key.

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
