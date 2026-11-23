// Drawing only: the duel's state and the current screen in, pixels out. The 1280x800
// table is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Flat shapes and canvas text; suits are told apart by colour AND glyph shape,
// never by text alone, so a card stays legible shrunk to a thumbnail.

import { FIELD, FONT, PALETTE, START_LIFE, SUITS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const CARD = { w: 150, h: 210 };
const BACK = { w: 84, h: 120 };
/** The player's hand lives in this centre column; the life panel and the deck panel
 *  own the gutters on either side, so a seven-card hand never covers them. */
const HAND_ZONE = { x: 240, w: 800, y: 540 };

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

/** The four suit glyphs, each a different shape: flame, drop, leaf, wind. */
function drawGlyph(context, glyph, x, y, size, color) {
  context.fillStyle = color;
  context.beginPath();
  if (glyph === 'flame') {
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.7, y + size * 0.6);
    context.lineTo(x + size * 0.25, y + size * 0.25);
    context.lineTo(x, y + size * 0.8);
    context.lineTo(x - size * 0.25, y + size * 0.25);
    context.lineTo(x - size * 0.7, y + size * 0.6);
  } else if (glyph === 'drop') {
    context.moveTo(x, y - size);
    context.bezierCurveTo(x + size * 0.8, y - size * 0.1, x + size * 0.7, y + size * 0.7, x, y + size * 0.7);
    context.bezierCurveTo(x - size * 0.7, y + size * 0.7, x - size * 0.8, y - size * 0.1, x, y - size);
  } else if (glyph === 'leaf') {
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.7, y);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.7, y);
  } else {
    // wind: a four-point star
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.3, y - size * 0.3);
    context.lineTo(x + size, y);
    context.lineTo(x + size * 0.3, y + size * 0.3);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.3, y + size * 0.3);
    context.lineTo(x - size, y);
    context.lineTo(x - size * 0.3, y - size * 0.3);
  }
  context.closePath();
  context.fill();
}

/** One card's rectangle at its drawn size; the hand shrinks its cards when it grows. */
export function handCardSize(count) {
  const w = Math.min(CARD.w, Math.floor((HAND_ZONE.w - (count - 1) * 12) / count));
  return { w, h: Math.round((w * CARD.h) / CARD.w) };
}

/** Where the clickable things are, in table coordinates. main.js hit-tests with this. */
export function layoutFor(state) {
  const hand = state.you.hand;
  const size = handCardSize(hand.length);
  const total = hand.length * size.w + Math.max(0, hand.length - 1) * 12;
  const startX = HAND_ZONE.x + (HAND_ZONE.w - total) / 2;
  const y = HAND_ZONE.y + Math.round((CARD.h - size.h) / 2);
  const cards = hand.map((card, index) => ({
    id: card.id,
    x: startX + index * (size.w + 12),
    y,
    w: size.w,
    h: size.h,
  }));
  return {
    cards,
    endTurn: { x: 1060, y: 380, w: 196, h: 56 },
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, bold) {
    const key = size + (bold ? 'b' : '');
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  /** A card face, drawn at (x, y) at the given width; everything inside scales with it. */
  function drawCardFace(card, x, y, w, selected) {
    const scale = w / CARD.w;
    const h = CARD.h * scale;
    context.save();
    if (selected) {
      context.fillStyle = PALETTE.gold;
      roundRect(context, x - 5, y - 5, w + 10, h + 10, 14);
      context.fill();
    }
    context.translate(x, y);
    context.scale(scale, scale);
    const suit = SUITS[card.suit];
    context.fillStyle = PALETTE.cardFace;
    roundRect(context, 0, 0, CARD.w, CARD.h, 12);
    context.fill();
    context.strokeStyle = PALETTE.cardEdge;
    context.lineWidth = 2;
    context.stroke();
    // Suit band with the card's name.
    context.fillStyle = suit.color;
    roundRect(context, 2, 2, CARD.w - 4, 36, 10);
    context.fill();
    context.fillRect(2, 22, CARD.w - 4, 16);
    text(card.name, CARD.w / 2, 26, 14, '#ffffff', 'center', true);
    // Glyph, then the big readable value.
    drawGlyph(context, suit.glyph, CARD.w / 2, 82, 26, suit.color);
    text(String(card.value), CARD.w / 2, 158, 52, suit.dark, 'center', true);
    // Cost pips along the bottom edge, and the effect line under them.
    for (let dot = 0; dot < card.cost; dot += 1) {
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(20 + dot * 18, CARD.h - 34, 6, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.goldDark;
      context.lineWidth = 1;
      context.stroke();
    }
    text(`COST ${card.cost}`, CARD.w - 10, CARD.h - 28, 12, PALETTE.muted, 'right', true);
    text(card.text, CARD.w / 2, CARD.h - 10, 12, '#3a3a30', 'center');
    context.restore();
  }

  function drawCardBack(x, y) {
    context.fillStyle = '#2a3a30';
    roundRect(context, x, y, BACK.w, BACK.h, 8);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    context.stroke();
    context.strokeStyle = 'rgba(242,201,76,0.45)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x + 8, y + BACK.h - 8);
    context.lineTo(x + BACK.w - 8, y + 8);
    context.moveTo(x + 8, y + 8);
    context.lineTo(x + BACK.w - 8, y + BACK.h - 8);
    context.stroke();
    drawGlyph(context, 'flame', x + BACK.w / 2, y + BACK.h / 2, 20, PALETTE.gold);
  }

  function drawLifePanel(x, y, label, side, accent) {
    text(label, x, y + 18, 15, PALETTE.muted, 'left', true);
    text(`${side.life}`, x, y + 62, 44, side.life <= 8 ? '#ff6b5e' : PALETTE.text, 'left', true);
    text(`/ ${START_LIFE} LIFE`, x + 62, y + 58, 16, PALETTE.muted, 'left', true);
    if (side.shield > 0) text(`SHIELD ${side.shield}`, x, y + 88, 16, PALETTE.shield, 'left', true);
    const barW = 190;
    context.fillStyle = '#0a0f0c';
    roundRect(context, x, y + 98, barW, 14, 7);
    context.fill();
    context.fillStyle = accent;
    if (side.life > 0) {
      roundRect(context, x, y + 98, (barW * side.life) / START_LIFE, 14, 7);
      context.fill();
    }
  }

  function drawHud(state) {
    context.fillStyle = PALETTE.panel;
    context.fillRect(0, 0, FIELD.width, 56);
    text('EMBER DUEL', 24, 38, 26, PALETTE.gold, 'left', true);
    text(`ROUND ${state.round}`, FIELD.width / 2, 38, 22, PALETTE.text, 'center', true);
    text(`SCORE ${state.score}`, FIELD.width - 24, 38, 26, PALETTE.text, 'right', true);
  }

  function drawTable() {
    context.fillStyle = PALETTE.felt;
    roundRect(context, 12, 64, FIELD.width - 24, 716, 18);
    context.fill();
    context.strokeStyle = PALETTE.feltLine;
    context.lineWidth = 2;
    context.stroke();
  }

  function drawRivalHand(state) {
    const count = state.rival.hand.length;
    text(`RIVAL HAND · ${count} CARDS`, FIELD.width / 2, 78, 15, PALETTE.muted, 'center', true);
    const total = count * BACK.w + (count - 1) * 10;
    const startX = (FIELD.width - total) / 2;
    for (let i = 0; i < count; i += 1) drawCardBack(startX + i * (BACK.w + 10), 88);
  }

  function drawArena(state, showLog) {
    // Last played cards, face up in the middle of the table.
    const slots = [
      { card: state.rival.lastCard, label: 'RIVAL PLAYED', x: 300 },
      { card: state.you.lastCard, label: 'YOU PLAYED', x: 830 },
    ];
    for (const slot of slots) {
      text(slot.label, slot.x + CARD.w / 2, 232, 14, PALETTE.muted, 'center', true);
      if (slot.card) drawCardFace(slot.card, slot.x, 244, CARD.w, false);
      else {
        context.strokeStyle = 'rgba(242,240,228,0.25)';
        context.lineWidth = 2;
        context.setLineDash([6, 6]);
        roundRect(context, slot.x, 244, CARD.w, CARD.h, 12);
        context.stroke();
        context.setLineDash([]);
        text('—', slot.x + CARD.w / 2, 380, 40, 'rgba(242,240,228,0.35)', 'center');
      }
    }
    text('VS', FIELD.width / 2, 350, 34, PALETTE.gold, 'center', true);
    text('EMBER > THORN > TIDE > EMBER', FIELD.width / 2, 390, 15, PALETTE.muted, 'center', true);
    text('GALE stands apart · same suit twice in a turn: COMBO +2', FIELD.width / 2, 412, 13, PALETTE.muted, 'center');
    // The log: the last few things that happened, readable under the arena. Hidden
    // behind an end panel, where its last line would poke out from under the panel.
    if (!showLog) return;
    context.textBaseline = 'top';
    for (let i = 0; i < state.log.length; i += 1) {
      text(state.log[i], FIELD.width / 2, 466 + i * 15, 14, PALETTE.log, 'center');
    }
    context.textBaseline = 'alphabetic';
  }

  function drawEndTurn(state) {
    if (state.turn !== 'you' || state.over !== null) return;
    context.fillStyle = PALETTE.gold;
    roundRect(context, 1060, 380, 196, 56, 10);
    context.fill();
    text('END TURN  [E]', 1158, 416, 19, '#1d1a10', 'center', true);
  }

  function drawPlayerArea(state, selectedId) {
    const layout = layoutFor(state);
    text(`YOUR HAND · ${state.you.hand.length} CARDS`, FIELD.width / 2, 532, 15, PALETTE.muted, 'center', true);
    for (const slot of layout.cards) {
      const card = state.you.hand.find((held) => held.id === slot.id);
      drawCardFace(card, slot.x, slot.y - (slot.id === selectedId ? 20 : 0), slot.w, slot.id === selectedId);
    }
    text('Click a card to select it, click again or press Enter to play. Keys 1-7 select.', FIELD.width / 2, 776, 14, PALETTE.muted, 'center');
  }

  function drawDeckPanel(state) {
    text('DECK', 1066, 578, 15, PALETTE.muted, 'left', true);
    text(`${state.you.deck.length}`, 1066, 622, 44, PALETTE.text, 'left', true);
    text(`DISCARD ${state.you.discard.length}`, 1066, 652, 16, PALETTE.muted, 'left', true);
    text(`ENERGY ${state.you.energy}/${state.you.maxEnergy}`, 1066, 690, 16, PALETTE.gold, 'left', true);
    for (let pip = 0; pip < state.you.maxEnergy; pip += 1) {
      context.fillStyle = pip < state.you.energy ? PALETTE.gold : '#3a3f35';
      context.beginPath();
      context.arc(1074 + pip * 22, 714, 8, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = 150 + lines.length * 32;
    const x = (FIELD.width - 640) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(8,12,10,0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, 640, height, 16);
    context.fill();
    context.strokeStyle = accent;
    context.lineWidth = 3;
    context.stroke();
    text(title, FIELD.width / 2, y + 74, 52, accent, 'center', true);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + 128 + index * 32, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 36, 22, PALETTE.gold, 'center', true);
  }

  /** Paint one frame: the table, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, selectedId) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawTable();
    if (screen === SCREEN_TITLE) {
      drawHud(state);
      drawRivalHand(state);
      drawArena(state, false);
      drawPanel(
        'EMBER DUEL',
        ['A duel of ember, tide, thorn and gale.', 'Play cards to burn, heal, drain and shield.', 'Ember beats Thorn beats Tide beats Ember.', `Best score ${best}`],
        'Press Space or click to start',
        PALETTE.gold,
      );
      return;
    }
    drawHud(state);
    drawLifePanel(24, 84, 'RIVAL — SABLE', state.rival, PALETTE.rival);
    drawRivalHand(state);
    drawArena(state, screen !== SCREEN_OVER);
    drawLifePanel(24, 560, 'YOU', state.you, PALETTE.you);
    drawEndTurn(state);
    drawDeckPanel(state);
    drawPlayerArea(state, selectedId);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The embers wait for you.'], 'Press P to resume', PALETTE.gold);
    } else if (screen === SCREEN_OVER) {
      if (state.over === 'win') {
        drawPanel('VICTORY!', [`Score ${state.score}`, `Damage dealt ${state.damageDealt} · Life left ${state.you.life}`], 'Press Space or click to duel again', PALETTE.gold);
      } else {
        drawPanel('DEFEAT', [`Score ${state.score}`, `Damage dealt ${state.damageDealt} · Rival life left ${state.rival.life}`], 'Press Space or click to try again', PALETTE.rival);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
