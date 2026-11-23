// The screenshot scenes behind ?shot=title|play|win|loss. Each one plays the real rules
// forward from a fresh duel for a fixed script, so the frame is what a real game looks
// like and the same seed always gives the same frame. The win scene steers the player
// well and the loss scene steers the player not at all — the starter's own trick of
// staging an end with a worse pilot, not state set by hand. The seed in the shot URL
// picks a duel where the script lands the scene it names.

import { EVENT_OVER } from './duel.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Play every affordable Ember or Thorn in hand, best first, then stop. */
function attackAll(duel) {
  const state = duel.state;
  for (;;) {
    const affordable = state.you.hand
      .filter((card) => card.cost <= state.you.energy && (card.suit === 'EMBER' || card.suit === 'THORN'))
      .sort((a, b) => b.value - a.value);
    if (affordable.length === 0) return false;
    if (duel.playCard('you', affordable[0].id) & EVENT_OVER) return true;
  }
}

/** Play every affordable card in hand, best first (all suits), then stop. */
function playAll(duel) {
  const state = duel.state;
  for (;;) {
    const affordable = state.you.hand
      .filter((card) => card.cost <= state.you.energy)
      .sort((a, b) => b.value - a.value);
    if (affordable.length === 0) return false;
    if (duel.playCard('you', affordable[0].id) & EVENT_OVER) return true;
  }
}

/**
 * Set `duel` to the named scene (title, play, win or loss; any other name is title)
 * and return the screen to draw over it and the best score to show. Returns null when
 * the script did not land the scene (a seed that ends the duel too early, say) so the
 * caller can try another seed instead of showing the wrong screen.
 */
export function stageShot(name, duel) {
  duel.reset();
  const state = duel.state;
  if (name === 'play') {
    // A dense mid-duel: both lives hurt, both hands full, several cards played.
    const good = (s) => s.round >= 3 && s.you.life < 30 && s.rival.life < 30
      && s.you.hand.length >= 4 && s.rival.hand.length >= 2 && s.damageDealt > 0;
    for (let turn = 0; turn < 12; turn += 1) {
      if (good(state)) return { screen: SCREEN_PLAY, best: state.score };
      if (state.over !== null) return null;
      if (attackAll(duel)) return null;
      if (duel.endTurn() & EVENT_OVER) return null;
    }
    return good(state) ? { screen: SCREEN_PLAY, best: state.score } : null;
  }
  if (name === 'win') {
    // The player plays everything, the rival plays its own game: a real race, won
    // on the seed the shot URL names.
    for (let turn = 0; turn < 40 && state.over === null; turn += 1) {
      if (playAll(duel)) break;
      if (duel.endTurn() & EVENT_OVER) break;
    }
    return state.over === 'win' ? { screen: SCREEN_OVER, best: state.score } : null;
  }
  if (name === 'loss') {
    // You never play a card: the rival burns you down on its own.
    for (let turn = 0; turn < 40 && state.over === null; turn += 1) {
      if (duel.endTurn() & EVENT_OVER) break;
    }
    return state.over === 'loss' ? { screen: SCREEN_OVER, best: state.score } : null;
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
