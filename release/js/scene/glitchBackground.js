import { GLITCH_BG } from '../config/constants.js';
import { state } from '../state/appState.js';

let rootEl = null;
let slots = [];
let viewport = { width: 0, height: 0 };

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pickChar() {
  const { chars } = GLITCH_BG;
  return chars[Math.floor(Math.random() * chars.length)];
}

function nextTickDelay() {
  return rand(GLITCH_BG.tickMinMs, GLITCH_BG.tickMaxMs);
}

function nextIdleDelay() {
  return rand(GLITCH_BG.idleMinMs, GLITCH_BG.idleMaxMs);
}

function randomScreenPosition() {
  const { width, height } = viewport;
  const inset = GLITCH_BG.edgeInsetPx;
  return {
    x: rand(inset, width - inset),
    y: rand(inset, height - inset)
  };
}

function applyGlyphVisual(slot) {
  const { el, opacity, jitterX, rgbSplit } = slot;
  el.style.opacity = String(opacity);
  el.style.transform = `translateX(${jitterX}px)`;

  if (rgbSplit) {
    el.style.textShadow = [
      `${jitterX}px 0 rgba(255, 72, 72, 0.45)`,
      `${-jitterX}px 0 rgba(72, 200, 255, 0.45)`,
      `0 0 10px rgba(232, 203, 150, 0.55)`
    ].join(', ');
  } else {
    el.style.textShadow = '0 0 8px rgba(232, 203, 150, 0.55), 0 0 16px rgba(232, 203, 150, 0.25)';
  }
}

function hideGlyph(slot) {
  slot.opacity = 0;
  slot.jitterX = 0;
  slot.rgbSplit = false;
  applyGlyphVisual(slot);
}

function showGlyph(slot) {
  slot.opacity = rand(GLITCH_BG.opacityMin, GLITCH_BG.opacityMax);
  slot.jitterX = rand(-8, 8);
  slot.rgbSplit = Math.random() < 0.35;
  applyGlyphVisual(slot);
}

function placeGlyph(slot) {
  const pos = randomScreenPosition();
  slot.x = pos.x;
  slot.y = pos.y;
  slot.el.style.left = `${pos.x}px`;
  slot.el.style.top = `${pos.y}px`;
  slot.char = pickChar();
  slot.el.textContent = slot.char;
  slot.el.style.fontSize = `${randInt(GLITCH_BG.fontSizeMin, GLITCH_BG.fontSizeMax)}px`;
}

function scheduleIdle(slot, now) {
  slot.phase = 'idle';
  slot.togglesLeft = 0;
  hideGlyph(slot);
  slot.nextAt = now + nextIdleDelay();
}

function scheduleFlash(slot, now) {
  placeGlyph(slot);
  slot.phase = 'flash';
  const flickers = randInt(GLITCH_BG.flashFlickersMin, GLITCH_BG.flashFlickersMax);
  slot.togglesLeft = flickers * 2;
  slot.flashOn = true;
  showGlyph(slot);
  slot.nextAt = now + nextTickDelay();
}

function scheduleHold(slot, now) {
  slot.phase = 'hold';
  slot.togglesLeft = 0;
  showGlyph(slot);
  slot.nextAt = now + GLITCH_BG.holdMs;
}

function createSlot(el) {
  return {
    el,
    char: 'J',
    phase: 'idle',
    togglesLeft: 0,
    flashOn: false,
    opacity: 0,
    jitterX: 0,
    rgbSplit: false,
    x: 0,
    y: 0,
    nextAt: performance.now() + rand(0, GLITCH_BG.idleMaxMs)
  };
}

function tickSlot(slot, now) {
  if (now < slot.nextAt) return;

  if (slot.phase === 'idle') {
    scheduleFlash(slot, now);
    return;
  }

  if (slot.phase === 'flash') {
    slot.flashOn = !slot.flashOn;
    if (slot.flashOn) showGlyph(slot);
    else hideGlyph(slot);
    slot.togglesLeft -= 1;

    if (slot.togglesLeft <= 0) {
      scheduleHold(slot, now);
    } else {
      slot.nextAt = now + nextTickDelay();
    }
    return;
  }

  if (slot.phase === 'hold') {
    scheduleIdle(slot, now);
  }
}

export function createGlitchBackground(container) {
  if (rootEl) return;

  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;

  rootEl = document.createElement('div');
  rootEl.id = 'glitch-bg';

  slots = [];
  for (let i = 0; i < GLITCH_BG.slotCount; i++) {
    const el = document.createElement('span');
    el.className = 'glitch-glyph';
    el.setAttribute('aria-hidden', 'true');
    rootEl.appendChild(el);
    slots.push(createSlot(el));
  }

  const labelLayer = state.labelRenderer?.domElement;
  if (labelLayer?.parentElement === container) {
    container.insertBefore(rootEl, labelLayer);
  } else {
    container.appendChild(rootEl);
  }
}

export function resizeGlitchBackground() {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
}

export function updateGlitchBackground() {
  if (!rootEl) return;

  const now = performance.now();
  slots.forEach((slot) => tickSlot(slot, now));
}

export function disposeGlitchBackground() {
  if (rootEl?.parentElement) {
    rootEl.parentElement.removeChild(rootEl);
  }
  rootEl = null;
  slots = [];
}
