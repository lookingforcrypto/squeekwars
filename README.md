# Squeek Wars

A browser strategy game for [Squeekchain](https://squeekchain.com). Every wallet can found one village. Squeektoshi, the real hamster whose wheel runs drive Squeekchain, powers the economy: every village earns SEED from his settled work, and each night's run boosts production everywhere. Every village has a champion; holding Squeeks makes it a Squeek champion (+10% XP and stats) and speeds up construction. A practice season runs on the Sepolia testnet now; Mainnet Season 1 opens after the official Squeek mint.

![Village screen](art/mockups/village_screen.png)

## The game in short

- **Build** a round village: Town Hall, 12 building plots, Walls, and 8 production sites (Wood, Food, Stone, Iron) across four river-split quarters.
- **Grow with the hamster:** SEED from Squeektoshi's runs pays for Town Hall upgrades and research, and the Wheelhouse turns his nightly runs into a production bonus of up to +250%, in every village.
- **Fight** on a 100 × 100 world map, one village per wallet: train seven unit types, scout, raid villages that are at least twice as weak, defend with Walls, Shieldbearers and your clan.
- **Champion and Squeeks:** every village has a champion that levels up from battles and the hamster's runs. Holding a Squeek makes it a Squeek champion (+10% XP and stats, golden glow), and Squeeks cut construction time after good runs (−15% with one, at most −30% however many you hold).
- **Fair by design:** one village per wallet, no player trading, SEED and resources never move between villages, no rarity caps, a beginner shield, raid limits and fully public on-chain state.

![World map](art/mockups/world_map_screen.png)

## Play the prototype

Open [`prototype/index.html`](prototype/) in a browser: the site plus a playable village, world map, scouting, raids, clans and a ranking, with time running 60× faster. See [prototype/README.md](prototype/README.md).

## Repository

| Path | What |
|---|---|
| [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) | Rules: economy, buildings, research, units, battle, champion, world map, protection, clans, ranking |
| [docs/SPEC.md](docs/SPEC.md) | Contract-level specification for the Season 1 build |
| [docs/IMD_BRIEF.md](docs/IMD_BRIEF.md) | The checked and quoted request for IMD's swarm |
| [docs/BUILDINGS.md](docs/BUILDINGS.md) | Every building level: effects, costs, times, looks |
| [docs/PLAYTEST.md](docs/PLAYTEST.md) | Playtest findings and what was fixed |
| `art/sprites/` | 74 cut-out sprites (buildings in 5 looks, units, champion, villagers, production sites) |
| `art/mockups/` | Village and world map screen mockups |
| `art/map/` | Village map concept |
| [art/PROMPTS.md](art/PROMPTS.md) | The prompts used to generate the art |
| `sim/` | Economy simulation (Python) and the parameters behind the tables |
| `prototype/` | Playable browser prototype (no wallet, no chain) |

## Status

Design draft v5 with a playable prototype and a contract spec. Next: the IMD build (contracts, tests, independent review, deployment on Sepolia, then the live site), from [docs/IMD_BRIEF.md](docs/IMD_BRIEF.md).
