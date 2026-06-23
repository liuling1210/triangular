/** 金字塔效果模式切换 */
import { PYRAMID_EFFECT_MODES } from '../config/constants.js';
import { state } from '../state/appState.js';
import {
  applyMotionParticleColors,
  getMotionGoldWeightForMode
} from '../utils/motionParticleColors.js';
import { getFullBloomStrength } from '../utils/viewAdaptation.js';
import {
  isEffectTransitioning,
  restoreGlowObjectVisibility
} from '../transitions/glowWireframeTransition.js';

const WIREFRAME_BLOOM_RATIO = 0.38;

/** 立即切换到指定效果模式（无过渡动画） */
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
    const fullBloom = getFullBloomStrength();
    if (mode === PYRAMID_EFFECT_MODES.WIREFRAME) {
      state.bloomPass.strength = fullBloom * WIREFRAME_BLOOM_RATIO;
    } else if (mode === PYRAMID_EFFECT_MODES.GLOW) {
      state.bloomPass.strength = fullBloom;
    }
  }
}
