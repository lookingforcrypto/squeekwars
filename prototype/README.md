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
- **Wallet and name:** entering the game asks for a wallet (a browser wallet if you have one, or a demo wallet) and then a name tied to it; players appear as `Name · 0x1a2b…9f3c` in the top bar, on the map, in rankings, clans and reports. The map's Go to box also takes a wallet address. Settings shows your wallet and can disconnect it. The prototype only reads the address; nothing is signed.
- **Test controls are demo-only:** free, instant, production ×1000, game speed, extra resources or SEED, ending the shield and the Squeek count exist only in this prototype, never in the live game.
- **Testnet or mainnet:** entering the game asks where to play: Testnet (the practice season) or Mainnet, which stays locked until the official Squeek mint. A TESTNET badge sits in the top bar.
- **Champion and Squeeks:** one village per wallet, same production and SEED for everyone, and every village has a champion. Holding a Squeek makes it a Squeek champion (+10% XP and stats, golden glow), and Squeeks cut construction time after good runs (each extra one adds less, at most −30%). Set **Squeeks in your wallet** (0 to 10) in Settings to compare.
- **World Map:** drag to move, hover (desktop) or tap a village, or type x|y or a player name in **Go to**. Every village's troops, Walls and stock are visible (as they will be on-chain). Send **Scouts** first and your attacks on that village get +10% for 12 hours. Choose troops and send an attack with the battle prediction.
- **Raids on you:** after your 7-day beginner shield, neighbours with a big enough army raid you, and villages you raided may strike back. A red banner under the top bar counts down every attack on the way.
- **Clans:** research and build a Clan Hall; at level 3 found a clan and invite players by name, from the Clan tab or from the World Map. Send troops to defend a member and recall them later; members near you send help when you are attacked. The Clan Hall raises banners in your clan colour at levels 3, 5 and 7.
- **Reports:** battle and scouting reports with sent / lost / left tables, filters, **Attack again** (same troops) and **Strike back**.
- **Ranking:** Overall first (Build + Research + Combat, with the breakdown; Combat = (attack + defense points) ÷ 200, never more than Build), then villages, attackers, defenders, raiders (whole season or this week) and clans (sum of members' Overall), plus last week's titles.
- **SEED:** earned every night, never sent or looted. Spend it on the Town Hall, the Wheelhouse and research, exchange it one way into resources at the Market, or in the Town Hall's treasury: a +25% boost for one resource for 24 h (500 SEED each), a Peace shield (12 h) or a banner colour.
- **Settings** (top bar): sound, the night-run replay, browser notifications, and the **test controls**. Test mode is on by default: nothing costs resources and everything is instant. Turn either off to play with the real costs and times; production ×1000, game speed ×1 to ×3600, extra resources or SEED, ending the beginner shield, replaying the night run and a restart are there too.
- **Rival and neighbours (prototype only):** Ironpaw at (48|71) and the other villages are simulated so you can test alone; they raid you and strike back. The live game has no bots: every village is a real wallet.
- **Wild camps:** red **C** tiles on the map. They never attack, grow gently over the season (a medium camp defends with 550 on day 10), give loot and champion XP but no ranking points, and their defenders grow back in 24 h.
- **Buildings:** Move a building to another empty plot or Demolish it (no refund). The Walls look changes with their level.
- **Other tabs:** if the same village is opened in a second browser tab, the older tab pauses so the save is never overwritten.

`game.html` is the same page without the document wrapper (used for the hosted preview); `app.js` holds all rules and UI.
