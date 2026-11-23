# Ember Duel

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/ayukwulan/ember-duel-card-game/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/ayukwulan/ember-duel-card-game/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

An original card duel for [make.fun's best card game bounty](https://make.fun/c/best-card-game-20261122-1826). You duel Rival Sable with a 28-card deck of four invented suits — **Ember, Tide, Thorn and Gale** — each with its own job: Ember burns, Tide heals, Thorn drains, Gale shields. The suit cycle **Ember beats Thorn beats Tide beats Ember** turns every attack into a read: play the suit that beats the rival's last card for +3 damage, and play the same suit twice in a turn for a COMBO +2.

## How to play

- Serve it: `node serve.ts`, then open http://localhost:8080 in desktop Chrome.
- Click a card to select it, click again (or press Enter) to play it. Keys 1–7 select a card.
- Each turn you gain energy (up to 6) and draw back up to 5 cards. Play as many cards as your energy allows, then press **END TURN** (or E). The rival plays, and the duel goes on.
- Reduce Rival Sable to 0 life to win. Your score is the damage you dealt, plus a bonus for winning with life to spare.

## Layout

- `game/` — the game itself: plain static files, no network requests, no libraries.
  - `game/src/config.js` — tuning, palette, the four suits and the deck list.
  - `game/src/deck.js` — the 28-card deck, shuffle and draw.
  - `game/src/duel.js` — the duel rules: life, energy, shields, combos, the rival AI.
  - `game/src/render.js` — the table, hands, cards and panels, all on one canvas.
  - `game/src/input.js` — keyboard and pointer input.
  - `game/src/shots.js` — the deterministic screenshot scenes.
  - `game/src/main.js` — boot, the game loop and the screens.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `screenshots/` — the four screenshots: the duel table (cover), title, victory and defeat.

## License

MIT. See [LICENSE](LICENSE).
