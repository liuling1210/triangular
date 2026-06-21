import {
  BASE_TONE_EXPOSURE
} from '../config/constants.js';
import { state } from '../state/appState.js';
import {
  getMotionGoldWeightForMode
} from '../utils/motionParticleColors.js';
import { applyViewAdaptiveBloom, getViewTopDownBlend } from '../utils/viewAdaptation.js';
import { applyEdgeFlowAppearance } from './edgeFlowControls.js';
import { applyFootMaterial } from './footControls.js';
import { applyMotionParticleAppearance } from './motionParticleControls.js';
import { applyShellMaterial } from './shellControls.js';
import { applySliceGradients } from './sliceControls.js';

export function applyPyramidColorAndBrightness() {
  const threeColor = new THREE.Color(state.pyramidColorHex);
  const { pyramidMats, pyramidLights } = state;

  applyShellMaterial();
  applyFootMaterial();
  applyEdgeFlowAppearance();
  applySliceGradients();
  applyMotionParticleAppearance(
    state.motionParticleGoldWeight ?? getMotionGoldWeightForMode(state.pyramidEffectMode)
  );

  if (pyramidMats.particleCloud) {
    pyramidMats.particleCloud.opacity = 0.92 * state.pyramidBrightness;
  }

  if (pyramidLights.core) {
    pyramidLights.core.color.copy(threeColor);
  }
  applyViewAdaptiveBloom(getViewTopDownBlend(), 1);

  if (state.renderer) {
    state.renderer.toneMappingExposure = BASE_TONE_EXPOSURE * state.pyramidBrightness;
  }

  const r = Math.round(threeColor.r * 255);
  const g = Math.round(threeColor.g * 255);
  const b = Math.round(threeColor.b * 255);
  state.labelElements.forEach((el) => {
    el.style.color = state.pyramidColorHex;
    el.style.textShadow = `0 0 12px rgba(${r}, ${g}, ${b}, 0.9), 0 0 24px rgba(${r}, ${g}, ${b}, 0.4)`;
  });

  document.getElementById('color-hex-label').textContent = state.pyramidColorHex.toUpperCase();
  document.getElementById('color-preview').style.background = state.pyramidColorHex;
  document.getElementById('brightness-val').textContent = `${Math.round(state.pyramidBrightness * 100)}%`;
}

export function setupColorBrightnessUI(onBrightnessChange) {
  document.getElementById('pyramid-color-picker').addEventListener('input', (e) => {
    state.pyramidColorHex = e.target.value;
    applyPyramidColorAndBrightness();
  });
  document.getElementById('brightness-slider').addEventListener('input', (e) => {
    state.pyramidBrightness = parseFloat(e.target.value) / 100;
    applyPyramidColorAndBrightness();
    onBrightnessChange();
  });
}
