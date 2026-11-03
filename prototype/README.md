# Squeek Wars · playable prototype

A browser-only prototype of the site and the game. There is no wallet and no chain: the game state lives in your browser, you play a wallet that holds three Squeeks, and game time runs 60× faster than real time (1 game hour = 1 real minute).

## Run it

Open `prototype/index.html` in a browser. If your browser blocks local files, serve the folder instead:

```bash
cd prototype
python3 -m http.server 8000
```

Then open http://localhost:8000.

## What you can try

- **Site:** landing page with how it works, the wheel bonus, units, rules, FAQ and a report form.
- **First steps:** a quest list on the left of the village walks you through the first Town Hall levels, your first scouting and your first raid; each step pays a small reward.
- **Village:** tap the Town Hall, a production site, a building or an empty plot. Build, upgrade and queue orders (2 build slots, 1 queued order each); cancel an order with ✕ for 80% back. If you cannot afford something, the panel says what is missing and roughly when you will have it. Zoom with + / − / fit, pinch or the mouse wheel.
- **Life and night:** villagers walk the roads, chimneys smoke, buildings under construction get scaffolding. From dusk the village goes dark with lit windows; between 00:00 and 04:00 Squeektoshi runs and the Wheelhouse wheel spins. At 04:00 a short replay shows the laps, the SEED for every village and the new wheel bonus.
- **Academy, Barracks, Market:** research tiers, unit training and dismissing, resource exchange (from Town Hall 2).
- **Testnet or mainnet:** entering the game asks where to play: Testnet (the practice season) or Mainnet, which stays locked until the official Squeek mint. A TESTNET badge sits in the top bar.
- **Squeeks:** one village per wallet, same production and SEED for everyone. Squeeks cut construction time after good runs (each extra one adds less, at most −30%), and one of them is your champion (pick it on the Champion tab, once per 24 h; its level stays with that Squeek). Set **Squeeks in your wallet** (0 to 10) in Settings to compare.
- **World Map:** drag to move, hover (desktop) or tap a village, or type x|y or a player name in **Go to**. Every village's troops, Walls and stock are visible (as they will be on-chain). Send **Scouts** first and your attacks on that village get +10% for 12 hours. Choose troops and send an attack with the battle prediction.
- **Raids on you:** after your 7-day beginner shield, neighbours with a big enough army raid you, and villages you raided may strike back. A red banner under the top bar counts down every attack on the way.
- **Clans:** research and build a Clan Hall; at level 3 found a clan and invite players by name, from the Clan tab or from the World Map. Send troops to defend a member and recall them later; members near you send help when you are attacked. The Clan Hall raises banners in your clan colour at levels 3, 5 and 7.
- **Reports:** battle and scouting reports with sent / lost / left tables, filters, **Attack again** (same troops) and **Strike back**.
- **Ranking:** villages, attackers, defenders, raiders and clans in your region, for the whole season or this week, plus last week's titles.
- **Treasury:** in the Town Hall panel, spend SEED on a Wheel Festival (+20% output for 24 h), a Peace shield (12 h) or a banner colour.
- **Settings** (top bar): sound, the night-run replay, browser notifications, and the **test controls**. Test mode is on by default: nothing costs resources and everything is instant. Turn either off to play with the real costs and times; production ×1000, game speed ×1 to ×3600, extra resources or SEED, ending the beginner shield, replaying the night run and a restart are there too.
- **Rival:** Ironpaw (Squeek #777) at (48|71) is a neighbour with a real army to attack; it strikes back if you raid it.
- **Buildings:** Move a building to another empty plot or Demolish it (no refund). The Walls look changes with their level.
- **Other tabs:** if the same village is opened in a second browser tab, the older tab pauses so the save is never overwritten.

`game.html` is the same page without the document wrapper (used for the hosted preview); `app.js` holds all rules and UI.
