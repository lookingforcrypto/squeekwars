# Squeek Wars

A browser strategy game for [Squeekchain](https://squeekchain.com) on Sepolia. Every wallet can found one village, and a Squeek in that wallet can lead it as its champion. Squeektoshi, the real hamster whose wheel runs drive Squeekchain, powers the economy: every village earns SEED from his settled work, and each night's run boosts production in the villages a Squeek leads.

![Village screen](art/mockups/village_screen.png)

## The game in short

- **Build** a round village: Town Hall, 12 building plots, Walls, and 8 production sites (Wood, Food, Stone, Iron) across four river-split quarters.
- **Grow with the hamster:** SEED from Squeektoshi's runs pays for Town Hall upgrades and research in every village; in a village led by a Squeek, the Wheelhouse also turns his nightly runs into a production bonus of up to +250%.
- **Fight** on a 100 × 100 world map, one village per wallet: train seven unit types, scout, raid villages that are at least twice as weak, defend with Walls, Shieldbearers and your clan.
- **Lead with your Squeek:** name a Squeek you hold as your village's leader; it becomes your champion and levels up from battles and the hamster's runs, and the level stays with the NFT. One Squeek leads one village at a time.
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

Design draft v3 with a playable prototype and a contract spec. Next: the IMD build (contracts, tests, independent review, deployment on Sepolia, then the live site), from [docs/IMD_BRIEF.md](docs/IMD_BRIEF.md).
