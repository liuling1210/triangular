import { PYRAMID_EFFECT_MODES } from '../config/constants.js';
import { state } from '../state/appState.js';
import { flyCameraToFrontView } from './cameraViewControls.js';
import { isInitialRevealActive } from '../transitions/initialRevealTransition.js';
import {
  isEffectTransitioning,
  startGlowWireTransition
} from '../transitions/glowWireframeTransition.js';
import { startWireParticleTransition } from '../transitions/wireframeParticleTransition.js';
import { startParticleGlowTransition } from '../transitions/particleGlowTransition.js';

/** 正视图下绕 Y 轴负方向自转，单位：弧度/秒 */
const AUTO_ROTATE_SPEED = 0.45;
const LAPS_PER_EFFECT_SWITCH = 1;
const RADIANS_PER_EFFECT_SWITCH = LAPS_PER_EFFECT_SWITCH * Math.PI * 2;

let lapRadians = 0;

function syncAutoRotateButton() {
  document.getElementById('pyramid-auto-rotate-btn')?.classList.toggle('active', state.pyramidAutoRotate);
}

function resetAutoRotateLapCounter() {
  lapRadians = 0;
}

function tryTriggerAutoRotateEffectSwitch() {
  if (isEffectTransitioning() || isInitialRevealActive()) return false;

  const mode = state.pyramidEffectMode;
  if (mode === PYRAMID_EFFECT_MODES.GLOW) {
    startGlowWireTransition();
  } else if (mode === PYRAMID_EFFECT_MODES.WIREFRAME) {
    startWireParticleTransition();
  } else if (mode === PYRAMID_EFFECT_MODES.PARTICLES) {
    startParticleGlowTransition();
  } else {
    return false;
  }

  return isEffectTransitioning();
}

function updateAutoRotateEffectCycle() {
  if (lapRadians < RADIANS_PER_EFFECT_SWITCH) return;

  while (lapRadians >= RADIANS_PER_EFFECT_SWITCH) {
    if (isEffectTransitioning()) return;
    lapRadians -= RADIANS_PER_EFFECT_SWITCH;
    if (!tryTriggerAutoRotateEffectSwitch()) {
      lapRadians += RADIANS_PER_EFFECT_SWITCH;
      return;
    }
  }
}

export function setPyramidAutoRotate(enabled) {
  state.pyramidAutoRotate = Boolean(enabled);
  syncAutoRotateButton();
  resetAutoRotateLapCounter();

  if (state.pyramidAutoRotate) {
    flyCameraToFrontView();
  }
}

export function stopPyramidAutoRotate() {
  if (!state.pyramidAutoRotate) return;
  state.pyramidAutoRotate = false;
  syncAutoRotateButton();
  resetAutoRotateLapCounter();
}

export function updatePyramidAutoRotate(delta) {
  if (!state.pyramidAutoRotate || !state.pyramidRootGroup || isInitialRevealActive()) return;

  const step = AUTO_ROTATE_SPEED * delta;
  state.pyramidRootGroup.rotation.y -= step;
  lapRadians += step;
  updateAutoRotateEffectCycle();
}

export function setupPyramidAutoRotateUI() {
  document.getElementById('pyramid-auto-rotate-btn')?.addEventListener('click', () => {
    setPyramidAutoRotate(!state.pyramidAutoRotate);
  });

  document.getElementById('view-top-btn')?.addEventListener('click', () => {
    stopPyramidAutoRotate();
  });
}
