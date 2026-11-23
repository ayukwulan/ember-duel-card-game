// The duel itself: two 30-life duelists, hands of cards, energy, shields and the suit
// cycle. No drawing happens here — this file is rules only, and every change it makes
// is announced on the log so the table can show what happened and why.

import {
  HAND_SIZE, MAX_ENERGY, MAX_HAND, START_ENERGY, START_LIFE, SUITS, WIN_BONUS,
} from './config.js';
import { buildDeck, drawUp, shuffle } from './deck.js';

export const EVENT_PLAYED = 1;
export const EVENT_OVER = 2;

function makeSide(random, energy) {
  const deck = shuffle(buildDeck(), random);
  const side = {
    life: START_LIFE, shield: 0, energy, maxEnergy: energy,
    hand: [], deck, discard: [],
    lastSuit: null, lastCard: null, playedThisTurn: [],
  };
  drawUp(side.hand, side.deck, side.discard, HAND_SIZE, random);
  return side;
}

function suitBeats(attacker, defender) {
  return defender !== null && SUITS[attacker].beats === defender;
}

export function createDuel(random) {
  const duel = {
    random,
    round: 1,
    turn: 'you',
    you: null,
    rival: null,
    log: [],
    damageDealt: 0,
    damageTaken: 0,
    over: null,
    score: 0,
  };

  function say(line) {
    duel.log.push(line);
    if (duel.log.length > 4) duel.log.shift();
  }

  function refreshScore() {
    duel.score = duel.damageDealt + (duel.over === 'win' ? WIN_BONUS + duel.you.life * 2 : 0);
  }

  function hurt(target, amount, source) {
    let left = amount;
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, left);
      target.shield -= absorbed;
      left -= absorbed;
    }
    target.life = Math.max(0, target.life - left);
    return left;
  }

  function checkOver() {
    if (duel.rival.life <= 0) {
      duel.over = 'win';
      refreshScore();
      say('Rival Sable falls. Victory!');
      return EVENT_OVER;
    }
    if (duel.you.life <= 0) {
      duel.over = 'loss';
      refreshScore();
      say('Your ember gutters out. Defeat.');
      return EVENT_OVER;
    }
    refreshScore();
    return 0;
  }

  /** Play one card from `side`'s hand. Returns EVENT_OVER when the duel ends, else 0.
   *  Throws when the card cannot be played, so the table never offers a dead move. */
  function playCard(sideName, cardId) {
    const side = duel[sideName];
    const foe = duel[sideName === 'you' ? 'rival' : 'you'];
    const index = side.hand.findIndex((card) => card.id === cardId);
    if (index === -1) throw new Error('card not in hand');
    const card = side.hand[index];
    if (card.cost > side.energy) throw new Error('not enough energy');
    if (duel.over !== null) throw new Error('duel is over');
    side.hand.splice(index, 1);
    side.discard.push(card);
    side.energy -= card.cost;

    const combo = side.playedThisTurn.includes(card.suit) ? 2 : 0;
    const superior = suitBeats(card.suit, foe.lastSuit) ? 3 : 0;
    const who = sideName === 'you' ? 'You' : 'Rival';
    let event = EVENT_PLAYED;

    if (card.suit === 'EMBER') {
      const damage = card.value + combo + superior;
      const dealt = hurt(foe, damage, card);
      if (sideName === 'you') duel.damageDealt += dealt;
      else duel.damageTaken += dealt;
      say(`${who} played ${card.name} — ${damage} damage${superior ? ' (SUPERIOR +3)' : ''}${combo ? ' (COMBO +2)' : ''}!`);
    } else if (card.suit === 'TIDE') {
      const healed = Math.min(START_LIFE - side.life, card.value + combo);
      side.life += healed;
      say(`${who} played ${card.name} — restored ${healed} life${combo ? ' (COMBO +2)' : ''}.`);
    } else if (card.suit === 'THORN') {
      const damage = card.value + combo + superior;
      const dealt = hurt(foe, damage, card);
      const healed = Math.min(START_LIFE - side.life, Math.floor(card.value / 2) + combo);
      side.life += healed;
      if (sideName === 'you') duel.damageDealt += dealt;
      else duel.damageTaken += dealt;
      say(`${who} played ${card.name} — ${damage} damage, healed ${healed}${superior ? ' (SUPERIOR +3)' : ''}${combo ? ' (COMBO +2)' : ''}.`);
    } else {
      const gained = card.value + combo;
      const damage = Math.floor(card.value / 2);
      side.shield += gained;
      const dealt = hurt(foe, damage, card);
      if (sideName === 'you') duel.damageDealt += dealt;
      else duel.damageTaken += dealt;
      say(`${who} played ${card.name} — +${gained} shield, ${damage} damage${combo ? ' (COMBO +2)' : ''}.`);
    }

    side.lastSuit = card.suit;
    side.lastCard = card;
    side.playedThisTurn.push(card.suit);
    event |= checkOver();
    return event;
  }

  /** The rival's turn: draw, then play while it has energy and a card worth playing.
   *  It heals when hurt, otherwise hits with its biggest attack, and holds a shield
   *  when it has nothing better — a hand you can read and play around. */
  function rivalTurn() {
    const rival = duel.rival;
    rival.maxEnergy = Math.min(MAX_ENERGY, rival.maxEnergy + 1);
    rival.energy = rival.maxEnergy;
    drawUp(rival.hand, rival.deck, rival.discard, HAND_SIZE, duel.random);
    let played = 0;
    while (played < 2) {
      const affordable = rival.hand.filter((card) => card.cost <= rival.energy);
      if (affordable.length === 0) break;
      let pick = null;
      if (rival.life <= 12) {
        pick = affordable.filter((card) => card.suit === 'TIDE').sort((a, b) => b.value - a.value)[0] ?? null;
      }
      if (pick === null) {
        const attacks = affordable.filter((card) => card.suit === 'EMBER' || card.suit === 'THORN');
        pick = attacks.sort((a, b) => b.value - a.value)[0] ?? null;
      }
      if (pick === null) {
        pick = affordable.sort((a, b) => b.value - a.value)[0];
      }
      if (pick === null) break;
      const event = playCard('rival', pick.id);
      played += 1;
      if (event & EVENT_OVER) return event;
    }
    return 0;
  }

  /** End your turn: the rival plays, then a new round begins with fresh energy and a
   *  drawn hand. Returns EVENT_OVER when the duel ends. */
  function endTurn() {
    if (duel.over !== null || duel.turn !== 'you') return 0;
    duel.turn = 'rival';
    let event = rivalTurn();
    if (event & EVENT_OVER) return event;
    duel.round += 1;
    duel.turn = 'you';
    const you = duel.you;
    you.maxEnergy = Math.min(MAX_ENERGY, you.maxEnergy + 1);
    you.energy = you.maxEnergy;
    you.playedThisTurn = [];
    duel.rival.playedThisTurn = [];
    drawUp(you.hand, you.deck, you.discard, HAND_SIZE, duel.random);
    if (you.hand.length > MAX_HAND) {
      while (you.hand.length > MAX_HAND) you.discard.push(you.hand.pop());
    }
    say(`Round ${duel.round} — your turn. Energy ${you.energy}.`);
    return 0;
  }

  function reset() {
    duel.round = 1;
    duel.turn = 'you';
    duel.you = makeSide(random, START_ENERGY);
    duel.rival = makeSide(random, START_ENERGY);
    duel.log = ['The duel begins. Ember beats Thorn beats Tide beats Ember.'];
    duel.damageDealt = 0;
    duel.damageTaken = 0;
    duel.over = null;
    duel.score = 0;
  }

  reset();
  return { state: duel, playCard, endTurn, reset, say };
}
