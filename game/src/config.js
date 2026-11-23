// Every tuning number, colour and card definition in one place. The table is a fixed
// 1280x800 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size.

export const FIELD = { width: 1280, height: 800 };

export const STEP = 1 / 60;

export const START_LIFE = 30;
export const MAX_HAND = 7;
export const HAND_SIZE = 5;
export const START_ENERGY = 3;
export const MAX_ENERGY = 6;
export const WIN_BONUS = 100;

/** The four suits. The cycle EMBER > THORN > TIDE > EMBER is the counter-play: an attack
 *  whose suit beats the foe's last played suit deals +3 damage. GALE stands outside it. */
export const SUITS = {
  EMBER: { key: 'EMBER', name: 'Ember', color: '#e5534b', dark: '#8f2b26', glyph: 'flame', beats: 'THORN', verb: 'burns' },
  TIDE: { key: 'TIDE', name: 'Tide', color: '#4fc3f7', dark: '#226b8f', glyph: 'drop', beats: 'EMBER', verb: 'drowns' },
  THORN: { key: 'THORN', name: 'Thorn', color: '#7bc96f', dark: '#3c6b34', glyph: 'leaf', beats: 'TIDE', verb: 'strangles' },
  GALE: { key: 'GALE', name: 'Gale', color: '#b388eb', dark: '#5d3f8f', glyph: 'wind', beats: null, verb: 'shields' },
};

export const SUIT_ORDER = ['EMBER', 'TIDE', 'THORN', 'GALE'];

/** What each suit does when played. Value is the card's power; cost is its energy price. */
export const EFFECTS = {
  EMBER: 'Deal {v} damage.',
  TIDE: 'Restore {v} life.',
  THORN: 'Deal {v} damage, heal {v2}.',
  GALE: 'Shield {v}, deal {v2}.',
};

const NAMES = {
  EMBER: ['Cinder Pup', 'Spark Imp', 'Flame Fox', 'Blaze Hound', 'Inferno Drake', 'Pyre Titan', 'Ember Sovereign'],
  TIDE: ['Dew Sprite', 'Brook Nymph', 'Rain Caller', 'Wave Serpent', 'Tide Leviathan', 'Storm Herald', 'Abyss Queen'],
  THORN: ['Seedling', 'Bramble Cub', 'Vine Wolf', 'Thorn Stag', 'Root Golem', 'Forest Warden', 'Ancient Oak'],
  GALE: ['Breeze Wisp', 'Zephyr Hawk', 'Storm Kite', 'Cloud Runner', 'Tempest Roc', 'Sky Sovereign', 'Gale Archon'],
};

/** Values 2..8; cost 1 for 2-3, 2 for 4-6, 3 for 7-8. Seven cards per suit, 28 in a deck. */
export const VALUES = [2, 3, 4, 5, 6, 7, 8];

export function costFor(value) {
  return value <= 3 ? 1 : value <= 6 ? 2 : 3;
}

export function cardName(suit, value) {
  return NAMES[suit][VALUES.indexOf(value)];
}

export function effectText(suit, value) {
  return EFFECTS[suit].replace('{v}', String(value)).replace('{v2}', String(Math.floor(value / 2)));
}

export const PALETTE = {
  backdrop: '#0d1410',
  felt: '#1d4d33',
  feltDark: '#143626',
  feltLine: '#2f6b47',
  gold: '#f2c94c',
  goldDark: '#8a6d1f',
  panel: '#101b16',
  panelEdge: '#2a3a30',
  text: '#f2f0e4',
  muted: '#9fb3a4',
  cardBack: '#f2f0e4',
  cardFace: '#f7f4e8',
  cardEdge: '#20241f',
  you: '#4fc3f7',
  rival: '#e5534b',
  shield: '#b388eb',
  log: '#c8d4c9',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ember-duel.best';
