import { PYRAMID_EFFECT_MODES, BASE_BLOOM_STRENGTH } from '../config/constants.js';
import { state } from '../state/appState.js';
import {
  applyMotionParticleColors,
  getMotionGoldWeightForMode
} from '../utils/motionParticleColors.js';
import {
  isEffectTransitioning,
  restoreGlowObjectVisibility,
  startGlowWireTransition
} from '../transitions/glowWireframeTransition.js';
import { startWireParticleTransition } from '../transitions/wireframeParticleTransition.js';
import { startParticleGlowTransition } from '../transitions/particleGlowTransition.js';
import { setCornerMarkersVisible } from '../scene/baseCornerMarkers.js';

const WIREFRAME_BLOOM_RATIO = 0.38;

export function setPyramidEffect(mode) {
  const { glow, wireframe, particles } = state.pyramidGroups;
  if (!glow || !wireframe || !particles) return;

  state.pyramidEffectMode = mode;
  state.motionParticleGoldWeight = getMotionGoldWeightForMode(mode);
  applyMotionParticleColors(state.motionParticleGoldWeight);
  glow.visible = mode === PYRAMID_EFFECT_MODES.GLOW;
  wireframe.visible = mode === PYRAMID_EFFECT_MODES.WIREFRAME;
  particles.visible = mode === PYRAMID_EFFECT_MODES.PARTICLES;

  if (mode === PYRAMID_EFFECT_MODES.GLOW) {
    restoreGlowObjectVisibility();
  }

  if (state.bloomPass && !isEffectTransitioning()) {
    const fullBloom = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
    if (mode === PYRAMID_EFFECT_MODES.WIREFRAME) {
      state.bloomPass.strength = fullBloom * WIREFRAME_BLOOM_RATIO;
    } else if (mode === PYRAMID_EFFECT_MODES.GLOW) {
      state.bloomPass.strength = fullBloom;
    }
  }

  document.getElementById('effect-glow-btn').classList.toggle('active', mode === PYRAMID_EFFECT_MODES.GLOW);
  document.getElementById('effect-wireframe-btn').classList.toggle('active', mode === PYRAMID_EFFECT_MODES.WIREFRAME);
  document.getElementById('effect-particles-btn').classList.toggle('active', mode === PYRAMID_EFFECT_MODES.PARTICLES);
}

export function setupEffectUI() {
  document.getElementById('effect-glow-btn').addEventListener('click', () => {
    if (isEffectTransitioning()) return;
    if (state.pyramidEffectMode === PYRAMID_EFFECT_MODES.PARTICLES) {
      startParticleGlowTransition();
      return;
    }
    setPyramidEffect(PYRAMID_EFFECT_MODES.GLOW);
  });
  document.getElementById('effect-wireframe-btn').addEventListener('click', () => {
    if (isEffectTransitioning()) return;
    if (state.pyramidEffectMode === PYRAMID_EFFECT_MODES.GLOW) {
      startGlowWireTransition();
      return;
    }
    setPyramidEffect(PYRAMID_EFFECT_MODES.WIREFRAME);
  });
  document.getElementById('effect-particles-btn').addEventListener('click', () => {
    if (isEffectTransitioning()) return;
    if (state.pyramidEffectMode === PYRAMID_EFFECT_MODES.WIREFRAME) {
      startWireParticleTransition();
      return;
    }
    setPyramidEffect(PYRAMID_EFFECT_MODES.PARTICLES);
  });
  setPyramidEffect(state.pyramidEffectMode);

  const cornerMarkersBtn = document.getElementById('corner-markers-toggle-btn');
  cornerMarkersBtn.addEventListener('click', () => {
    setCornerMarkersVisible(!state.showCornerMarkers);
    cornerMarkersBtn.classList.toggle('active', state.showCornerMarkers);
  });
}
