// Boot and the one loop: input is read every frame, and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the shuffle and the rival. ?shot=title|play|win|loss (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. A shot that does not land (the seed ends the
// duel too early) leaves __shotReady unset and the page title says so.
import { BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createDuel, EVENT_OVER } from './duel.js';
import { ACTION_CONFIRM, ACTION_END_TURN, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, layoutFor, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const duel = createDuel(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, duel);
  if (scene === null) {
    document.title = `shot ${name} did not land for seed ${seed}`;
    return;
  }
  let painted = 0;
  function paint() {
    renderer.draw(duel.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let selectedId = null;

  // The duel and the screen, for the playtest driver and nothing else.
  window.__ember = { duel, get screen() { return screen; }, get selectedId() { return selectedId; } };

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    duel.reset();
    selectedId = null;
    screen = SCREEN_PLAY;
    announce('Playing. Round 1. Your turn.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (duel.state.score > best) {
      best = duel.state.score;
      saveBest(best);
    }
    announce(duel.state.over === 'win' ? `Victory. Score ${duel.state.score}.` : `Defeat. Score ${duel.state.score}.`);
  }

  /** A click in table coordinates: a hand card selects or plays, END TURN ends. */
  function handleClick(point) {
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 800);
    const offsetX = (rect.width - 1280 * scale) / 2;
    const offsetY = (rect.height - 800 * scale) / 2;
    const table = { x: (point.x - offsetX) / scale, y: (point.y - offsetY) / scale };
    const layout = layoutFor(duel.state);
    const button = layout.endTurn;
    if (table.x >= button.x && table.x <= button.x + button.w && table.y >= button.y && table.y <= button.y + button.h) {
      if (duel.endTurn() & EVENT_OVER) endGame();
      else selectedId = null;
      return;
    }
    for (const slot of layout.cards) {
      if (table.x >= slot.x && table.x <= slot.x + slot.w && table.y >= slot.y - 20 && table.y <= slot.y + slot.h) {
        if (selectedId === slot.id) {
          if (duel.playCard('you', slot.id) & EVENT_OVER) endGame();
          selectedId = null;
        } else {
          selectedId = slot.id;
        }
        return;
      }
    }
    selectedId = null;
  }

  function handleActions() {
    const actions = input.takeActions();
    const pick = input.takePick();
    if (pick >= 0 && screen === SCREEN_PLAY) {
      const hand = duel.state.you.hand;
      if (pick < hand.length) selectedId = hand[pick].id;
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) startGame();
      else if (screen === SCREEN_PLAY && selectedId !== null) {
        if (duel.playCard('you', selectedId) & EVENT_OVER) endGame();
        selectedId = null;
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_END_TURN && screen === SCREEN_PLAY) {
      if (duel.endTurn() & EVENT_OVER) endGame();
      else selectedId = null;
    }
    const click = input.takeClick();
    if (click !== null) handleClick(click);
  }

  function frame() {
    requestAnimationFrame(frame);
    handleActions();
    renderer.draw(duel.state, screen, best, selectedId);
  }

  // Leaving the tab pauses a running game rather than letting the rival play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Duel. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
