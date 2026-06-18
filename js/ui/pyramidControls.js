import {
  BASE_TONE_EXPOSURE,
  BASE_BLOOM_STRENGTH,
  BASE_LIGHT_INTENSITIES,
  BASE_EMISSIVE
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { createGlowTexture } from '../utils/color.js';
import { applySliceGradients } from './sliceControls.js';

export function applyPyramidColorAndBrightness() {
  const threeColor = new THREE.Color(state.pyramidColorHex);
  const shellColor = threeColor.clone().multiplyScalar(0.62);
  const emissiveColor = threeColor.clone().multiplyScalar(0.25);
  const { pyramidMats, pyramidLights } = state;

  if (pyramidMats.solid) {
    pyramidMats.solid.color.copy(threeColor);
    pyramidMats.solid.emissive.copy(emissiveColor);
    pyramidMats.solid.emissiveIntensity = BASE_EMISSIVE.solid * state.pyramidBrightness;
  }
  if (pyramidMats.shell) {
    pyramidMats.shell.color.copy(shellColor);
    pyramidMats.shell.emissive.copy(emissiveColor.clone().multiplyScalar(0.4));
    pyramidMats.shell.emissiveIntensity = BASE_EMISSIVE.shell * state.pyramidBrightness;
  }
  if (pyramidMats.base) {
    pyramidMats.base.color.copy(threeColor);
    pyramidMats.base.emissive.copy(emissiveColor);
    pyramidMats.base.emissiveIntensity = BASE_EMISSIVE.base * state.pyramidBrightness;
  }
  if (pyramidMats.edge) pyramidMats.edge.color.copy(threeColor);
  applySliceGradients();
  if (pyramidMats.particles) pyramidMats.particles.color.copy(threeColor);
  if (pyramidMats.vertex) pyramidMats.vertex.color.copy(threeColor);

  if (pyramidLights.core) {
    pyramidLights.core.color.copy(threeColor);
    pyramidLights.core.intensity = BASE_LIGHT_INTENSITIES.core * state.pyramidBrightness;
  }
  if (pyramidLights.key) {
    pyramidLights.key.intensity = BASE_LIGHT_INTENSITIES.key * state.pyramidBrightness;
  }

  if (state.renderer) {
    state.renderer.toneMappingExposure = BASE_TONE_EXPOSURE * state.pyramidBrightness;
  }
  if (state.bloomPass) {
    state.bloomPass.strength = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
  }

  const glowTexBright = createGlowTexture(state.pyramidColorHex, true);
  const glowTexSoft = createGlowTexture(state.pyramidColorHex, false);
  if (pyramidMats.vertex) {
    if (pyramidMats.vertex.map) pyramidMats.vertex.map.dispose();
    pyramidMats.vertex.map = glowTexBright;
    pyramidMats.vertex.needsUpdate = true;
  }
  if (pyramidMats.particles) {
    if (pyramidMats.particles.map) pyramidMats.particles.map.dispose();
    pyramidMats.particles.map = glowTexSoft;
    pyramidMats.particles.needsUpdate = true;
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
