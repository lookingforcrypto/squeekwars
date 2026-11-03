# Squeek Wars

A browser strategy game for [Squeekchain](https://squeekchain.com) on Sepolia. Every Squeek NFT is a village and its champion. Squeektoshi, the real hamster whose wheel runs drive Squeekchain, powers the economy: SEED is earned from his settled passes, and each night's run boosts resource production in every village.

![Village screen](art/mockups/village_screen.png)

## The game in short

- **Build** a round village: Town Hall, 12 building plots, Walls, and 8 production sites (Wood, Food, Stone, Iron) across four river-split quarters.
- **Grow with the hamster:** the Wheelhouse turns Squeektoshi's nightly runs into a production bonus; SEED from his runs pays for Town Hall upgrades and research.
- **Fight** on a 100 × 100 world map where every tile is a Squeek: train six unit types, raid villages that are at least twice as weak, defend with Walls and Shieldbearers.
- **Lead with your Squeek:** the NFT is your champion; it levels up from battles and from the hamster's runs.
- **Fair by design:** no player trading, no rarity caps, a beginner shield, raid limits, and fully public on-chain state.

![World map](art/mockups/world_map_screen.png)

## Play the prototype

Open [`prototype/index.html`](prototype/) in a browser: the site plus a playable village, world map and raids with time running 60× faster. See [prototype/README.md](prototype/README.md).

## Repository

| Path | What |
|---|---|
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | Rules: economy, buildings, research, units, battle, champion, world map, protection |
| [docs/BUILDINGS.md](docs/BUILDINGS.md) | Every building level: effects, costs, times, looks |
| `art/sprites/` | 73 cut-out sprites (buildings in 5 looks, units, champion, villagers, production sites) |
| `art/mockups/` | Village and world map screen mockups |
| `art/map/` | Village map concept |
| [art/PROMPTS.md](art/PROMPTS.md) | The prompts used to generate the art |
| `sim/` | Economy simulation (Python) and the parameters behind the tables |
| `prototype/` | Playable browser prototype (no wallet, no chain) |

## Status

Design draft v1 with a playable prototype. Next: the contract-level spec (`SPEC.md`) for the IMD build, then contracts and the live site.
