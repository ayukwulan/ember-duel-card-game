// The deck: 28 original cards, seven per suit. A card is a plain object with an id that
// is unique inside one duel, so the table can point at a card without copying it.

import { SUIT_ORDER, VALUES, cardName, costFor, effectText } from './config.js';

let nextId = 1;

export function makeCard(suit, value) {
  return {
    id: nextId++,
    suit,
    value,
    cost: costFor(value),
    name: cardName(suit, value),
    text: effectText(suit, value),
  };
}

export function buildDeck() {
  nextId = 1;
  const deck = [];
  for (const suit of SUIT_ORDER) {
    for (const value of VALUES) deck.push(makeCard(suit, value));
  }
  return deck;
}

/** Fisher-Yates with the duel's own random, so a seed fixes the whole deal. */
export function shuffle(deck, random) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = deck[i];
    deck[i] = deck[j];
    deck[j] = held;
  }
  return deck;
}

/** Move cards from the top of `from` into `hand` until it holds `count`; reshuffles the
 *  discard pile back in when the deck runs dry. Returns how many were drawn. */
export function drawUp(hand, deck, discard, count, random) {
  let drawn = 0;
  while (hand.length < count) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      while (discard.length > 0) deck.push(discard.pop());
      shuffle(deck, random);
    }
    hand.push(deck.pop());
    drawn += 1;
  }
  return drawn;
}
