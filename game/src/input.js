// Keyboard and pointer input. Number keys pick a card, Enter plays the picked card,
// E ends the turn, P pauses; one-shot presses are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted twice. Pointer
// clicks are reported with their table coordinates; main.js decides what they hit.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_END_TURN = 4;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const END_TURN = new Set(['KeyE']);
const DIGITS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7']);

export function createInput(canvas) {
  let actions = 0;
  let picked = -1;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (DIGITS.has(event.code)) {
      picked = Number(event.code.slice(-1)) - 1;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (END_TURN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else return;
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    picked = -1;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    click = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The index picked by a number key since the last call, or -1. */
    takePick() {
      const taken = picked;
      picked = -1;
      return taken;
    },
    /** The last pointer click in canvas pixels since the last call, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
