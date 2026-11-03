# Playtest report — prototype, Nov 2026

Three sessions, played through the real game code in a headless browser:

| Session | Setup | What it covered |
|---|---|---|
| **A. Real rules, 15 days** | Test mode off, a scripted player that builds, researches, trains, raids the best target it can beat 2×, and logs every time an action is blocked | Pacing, economy, combat, incoming raids |
| **B. Late game** | Test mode on, everything maxed (TH10, Walls 10, all research), 600 Berserkers + 150 Chargers + 60 Catapults, Champion 30 | Upper limits, Catapults vs Walls, night scene, all pages |
| **C. Phone** | iPhone 13 viewport: first launch as a new player, then every tab on the late-game save | Layout, readability, first-time experience |

No JavaScript errors in any session.

## Status after the fixes (prototype v2)

Everything below was fixed or added, except the daily Champion tasks (dropped on request). Checked again in a headless browser: the same 15-day scripted player on real rules, a feature-by-feature test, and the phone pass.

| Finding | What changed | Checked |
|---|---|---|
| 1.1 Raids scaled with your own defense | Raids now come from a real neighbour with its own army. It attacks only when it judges it has 2× your defense, or when it holds a grudge because you raided it. Each neighbour raids you at most once every 2 days and skips you when little sits outside your Vault. | 15 days: 1 raid, repelled (v1: 5 raids, 4 lost). A strong defense now keeps raiders away. |
| 1.2 Wood starved the game | Costs spread over all four resources. Market opens at Town Hall 2. Research tiers at Academy 1/2/4/6/8. Food upkeep halved to 0.5. | Town Hall 4 on day 11 and Town Hall 5 on day 15 (v1: stuck at 3 from day 6). No resource sits at the cap. |
| 1.3 Catapult damage lost on reload | Walls damage is saved; bots rebuild one level every 12 h. | Walls 4 → 2, still 2 after a reload, 3 after 12 h, 4 after 36 h. |
| 1.4 Childish name parts | Replaced. | 565 bot names, none left. |
| 2.1 Early SEED gate | Start with 1,500 SEED. | |
| 2.4 Farming tiny villages | Villages 3+ Town Hall levels below you: half loot, no points, no XP. Bots refill their stock half as fast (other raiders share it). | Loot about 1.25× own production for an active raider (v1 before the fix: 2.5×). |
| 2.5 Exact enemy defense for free | A defense range until scouted or attacked. New **Scout** unit (tier 2). | Range 3,480–5,690 before, exact after scouting. |
| 2.6 Food ceiling not explained | Army page shows which limit binds (Burrow room or Food) and allows dismissing units. | |
| 2.7 Full storage silent | Gold border with "full in …" when under 2 h; red blinking "FULL" when full. | |
| Phone resource bar cut off | 3-column grid: all 4 resources and SEED visible. | 5 of 5 visible, no sideways scroll. |
| Phone tab bar 4 of 8 | 5 × 2 grid; "World Map" shortens to "Map". | 9 of 9 tabs visible (Ranking added). |
| Phone opens zoomed in | Opens on the whole village; + / − / fit buttons, pinch zoom, mouse-wheel zoom on desktop. | |
| Test controls over content | Moved into the top bar as **Settings** (sound, night run, notifications and the test controls). | |
| Report form, Army table | One column under 600 px; unit icons stay beside the names. | |
| Market "75–75" | Reads "25 to 75 … (yours gives 75)". | |
| Plates overlap | The inner north plot's plate moved left of its building. | |
| "Town Hall 4" on locked plots | "Opens at Town Hall 4". | |
| Night looks like day | Blue night tint from dusk to dawn, warm window and lamp glow, villagers go home, the Wheelhouse wheel spins during the run. | |
| No life in the scene | 8 hamster villagers walk the roads; chimney smoke; scaffolding on buildings under construction; Clan Hall banners at levels 3, 5 and 7 in the clan colour. | |
| Wheelhouse level numbers | Numbers removed from all 5 sprites. | |
| Desktop panels cover the map | Building panel starts closed; the full building list folds away; zoom out with the buttons or the mouse wheel. | |
| World panel too long | Compact header, travel times fold away, Attack button sticks to the bottom. | |
| Two tabs share one save | The newest tab plays; an older tab pauses with "Play here instead". | Both directions checked. |
| 4 Missing features | First-steps quests (14), shortage message with amounts and time, incoming-attack banner, cancel (80% back) for builds, research and training, dismiss units, Go to x\|y or a name, hover tooltip on the map, Attack again / Strike back from reports, report filters, **Ranking** tab, clan support both ways, SEED treasury (Festival, Peace shield, banner colour), sound, browser notifications, night-run replay. | Each exercised in the feature test. |


---

## 1. Critical — fix before anything else

### 1.1 Incoming raids scale with *your* defense, so defending is pointless
`spawnIncoming()` sets the attacker's power to `your defense × (0.5 … 2.6)`. Whatever you invest, **about 29 % of raids reach 2× and wipe your defense**, and the rest bounce. In session A the player at 2,326 defense was hit by 5,622; at 2,029 defense it was hit by 2,434. Walls, Shieldbearers and the Vault never change the odds.

**Fix:** the raid comes from a real neighbour: use that bot's own troops (`botTroops`) and its level, so a strong village is attacked less often and only by strong neighbours. Raiding a bot should raise the chance that it raids you back.

### 1.2 Wood starves the whole game; stuck at Town Hall 3 from day 6 to day 15
| Day | TH | Wood | Food | Stone | Iron | Storage |
|---|---|---|---|---|---|---|
| 4 | 2 | 53 | 1,107 | 93 | 608 | 2,200 |
| 8 | 3 | 161 | 2,227 | 1,101 | 2,382 | 2,786 |
| 15 | 3 | 153 | 3,555 | 3,647 | 3,887 | 4,243 |

Food, Stone and Iron sit near the storage cap and are wasted while Wood never passes ~200. The TH upgrade was blocked 290 times for resources.
Causes:
- Cost mixes lean heavily on Wood.
- Fields cannot go above the TH level.
- The Market only opens at research tier 3 (Academy 5), too late to convert the surplus.

**Fix:**
- Rebalance cost vectors: move part of the Wood and Stone cost onto Food and Iron (Academy and Forge on Iron, units and the Burrow on Food).
- Make the Market available from Town Hall 2 at the 100 → 25 rate.
- Show which resource is short (see 4.2).

### 1.3 Catapult damage on bots is lost on reload
Wall reductions are written to the bot cache (`b.walls`), not to the save `S`. Reloading restores the old walls. Bots also never rebuild walls, so within one session a village stays open forever.
**Fix:** store `walls` in `botState` and let bots rebuild one level every ~12 h.

### 1.4 Childish names in bot names — fixed in this commit
The random name parts included "cheek" and "whisker" (a report showed *BrightCheek16*). They are replaced with "hold" and "crest".

---

## 2. Balance and pacing

| # | Finding | Suggestion |
|---|---|---|
| 2.1 | **Early SEED gate:** TH2 costs 1,000 SEED and the Wheelhouse 300, against 1,118 at start. Blocked by SEED 20 times early on. | Start at 1,500 SEED or make TH2 600. |
| 2.2 | **Research waits on the Academy, the Academy waits on Wood.** "Shieldbearer — tier locked" 126 times. | Follows from 1.2. Also allow tier 2 at Academy 2. |
| 2.3 | **Armies stay tiny:** day 15 = 3 Foragers + 21 Shieldbearers. Burrow room and a food surplus of only +31/h hold it back. | Cheaper Burrow levels 1–3; the first Barracks level trains faster. |
| 2.4 | **Farming tiny villages:** 30 raids in 2 days on villages with 40 defense, each full XP for the Champion. | XP in proportion to the enemy's defense; less loot when the target is under ¼ of your power. |
| 2.5 | **Attack preview shows the exact enemy defense for free.** No uncertainty and no reason to scout. | Show a range ("≈ 80–140") until the village has been scouted or attacked once. |
| 2.6 | **Late game food ceiling:** upkeep 1,140/h against max Food 1,157/h. Food, not the Burrow (1,693 room), caps the army, and the game never says so. | Show "Army limited by Food" on the Army page; Field Medicine or the Champion could lower upkeep. |
| 2.7 | **Full storage gives no warning:** production silently stops at the cap. | "Wood full in 2h 10m" on the bar; flash the counter at 100 %. |

---

## 3. Bugs and graphics

### Phone
- **Resource bar is cut off:** only Wood, Food and half of Stone fit; Iron and SEED are hidden in a sideways scroll with no visual cue. Use a 2×2 grid plus a SEED line, or smaller chips.
- **Tab bar shows 4 of 8 tabs:** Market, Clan, Champion and Reports are off-screen with no cue. Use two rows, icons, or a "More" tab.
- **First launch is zoomed to the centre:** the four production quarters (forests, farms, quarries, mines) are off-screen, so a new player never sees what the village is made of. Open zoomed out, or pan once to show them.
- **"Test controls" button floats over content:** Upgrade buttons, table rows, and the report form labels. Move it into the status line or the tab bar.
- The welcome toast covers the Test controls button.
- The Report form keeps two columns on phone, so "Player name or village (x|y) optional" wraps over three lines. Use one column under 600 px.
- Army table: some unit icons sit above the name (Spearman), others beside it (Forager).

### Everywhere
- **Market text bug:** at max level the subtitle reads "get 75–75 of another". The template puts the current rate in the lower bound; it should read "25–75 (now 75)".
- **Level plates overlap near the centre:** the Town Hall plate sits under the inner-north building; on phone two "10" plates collide.
- **Locked plots say "Town Hall 4":** should be "Opens at Town Hall 4".
- **Night looks the same as day:** nothing changes at 01:00 although the hamster run is the core of the game.
- **The scene has no life:** no hamsters, no turning wheel, no smoke. A building under construction looks finished.
- **Sprites:** the Wheelhouse sprites have the level number baked into the art; the Clan Hall has one look for all 10 levels.
- **Desktop:** the side panels cover the map corners and the production sites; the world map's right panel is long enough that the Attack button needs scrolling.
- **Two browser tabs share one save:** the last writer wins and silently overwrites the other.

---

## 4. Missing features

| Priority | Feature | Why |
|---|---|---|
| High | **First-steps quest list** (build the Wheelhouse → Storehouse → TH2 → Academy → first raid), each paying a small reward | The first screen only says "Tap a building or an empty plot". |
| High | **Say what is missing and when:** "Needs 240 more Wood — about 3h 20m" instead of "Not enough resources yet." | This message was the most common block in session A. |
| High | **Incoming attack alert in the village:** banner with a countdown and a "Prepare" shortcut | Today it is a toast plus a line in the Armies list, which sits below the fold on phone. |
| Medium | **Cancel a build or research order** (refund 80 %) | A wrong tap locks a slot for hours. |
| Medium | **Dismiss units** | The only way out of a food deficit is starving. |
| Medium | **Go to x\|y on the world map** | It is in the mockup but not in the prototype. |
| Medium | **Attack again / send the same army** from a report; report filters (Attacks, Defenses, Nights) | Raiding is the main loop; reports pile up. |
| Medium | **Map hover tooltip** on desktop (name, clan, level, distance) | Today every village has to be clicked. |
| Medium | **Leaderboard** (village points, attack and defense points, clans) | No goal beyond your own village. |
| Low | **Send defenders to clan members** | The Clan page already promises it for phase 2. |
| Low | **Late-game SEED sink** (cosmetics, Champion skins, clan banners) | SEED reaches 8,000+ by day 15 with nothing left to buy. |
| Low | **Sound** (build done, battle, night run) | |

## 5. Nice to have

- **Night replay:** a short animation of Squeektoshi's laps when the night settles, with the SEED and wheel bonus counting up — the moment that ties the game to the chain.
- **Scout unit** to go with 2.5.
- **Revenge:** a bot you raided keeps a grudge and may strike back; your report gets a "Revenge" button when a player raids you.
- **Daily Champion tasks** (win 2 raids, hold 1 defense) for steady XP.
- **Build-finished notifications** for the real game (browser push).

---

## Suggested fix order

1. Incoming raids from real neighbours (1.1).
2. Cost rebalance and an earlier Market (1.2, 2.1, 2.2).
3. Persist bot walls and let bots rebuild (1.3).
4. Phone layout: resource bar, tab bar, Test controls button, opening zoom (section 3).
5. Shortage messages with time, full-storage warning, incoming-attack banner (2.7, section 4).
6. Plates, "Opens at TH", night look, Market text (section 3).
7. First-steps quests, then Go to x|y, cancel, dismiss, attack again.
