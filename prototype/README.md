# Squeek Wars · playable prototype

A browser-only prototype of the site and the game. There is no wallet and no chain: the game state lives in your browser, you play Squeek #4821, and game time runs 60× faster than real time (1 game hour = 1 real minute).

## Run it

Open `prototype/index.html` in a browser. If your browser blocks local files, serve the folder instead:

```bash
cd prototype
python3 -m http.server 8000
```

Then open http://localhost:8000.

## What you can try

- **Site:** landing page with how it works, the wheel bonus, units and FAQ.
- **Village:** tap the Town Hall, a production site, a building or an empty plot. Build, upgrade and queue orders (2 build slots, 1 queued order each).
- **Hamster:** every game night (00:00–04:00) Squeektoshi runs; at 04:00 you get SEED and a new wheel bonus for the day.
- **Academy, Barracks, Market, Champion:** research tiers, unit training, resource exchange and champion points.
- **World Map:** drag to move, tap a village to see its defense and loot, send an attack with the battle prediction. After your 7-day beginner shield ends, neighbours attack you too.
- **Test mode (on by default):** nothing costs resources and everything is instant (building, research, training, travel). Turn either off in **Test controls** (bottom right) to play with the real costs and times. Test controls also offer production ×1000, game speed ×1 to ×3600, extra resources or SEED, ending the beginner shield and a restart.
- **Rival:** Ironpaw (Squeek #777) at (48|71) is a neighbour with a real army to attack; its troops recover a few game hours after a battle.
- **Panels:** every side panel has a Hide/Show button.

`game.html` is the same page without the document wrapper (used for the hosted preview); `app.js` holds all rules and UI.
