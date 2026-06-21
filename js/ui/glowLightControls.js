import { state } from '../state/appState.js';
import {
  applyViewAdaptiveBloom,
  applyViewAdaptiveLights,
  getViewTopDownBlend
} from '../utils/viewAdaptation.js';

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function syncGlowLightLabels() {
  const { glowLightSettings } = state;
  document.getElementById('glow-light-ambient-val').textContent = pct(glowLightSettings.ambientIntensity);
  document.getElementById('glow-light-key-val').textContent = pct(glowLightSettings.keyIntensity);
  document.getElementById('glow-light-fill-val').textContent = pct(glowLightSettings.fillIntensity);
  document.getElementById('glow-light-core-val').textContent = pct(glowLightSettings.coreIntensity);
  document.getElementById('glow-light-bloom-strength-val').textContent = pct(glowLightSettings.bloomStrength);
  document.getElementById('glow-light-bloom-threshold-val').textContent = pct(glowLightSettings.bloomThreshold);
  document.getElementById('glow-light-bloom-radius-val').textContent = pct(glowLightSettings.bloomRadius);
  document.getElementById('glow-light-exposure-val').textContent = pct(glowLightSettings.toneExposure);
}

export function applyGlowLightSettings() {
  const topDownBlend = getViewTopDownBlend();
  applyViewAdaptiveLights(topDownBlend);
  applyViewAdaptiveBloom(topDownBlend, 1);

  if (state.renderer) {
    state.renderer.toneMappingExposure = state.glowLightSettings.toneExposure * state.pyramidBrightness;
  }

  syncGlowLightLabels();
}

export function setupGlowLightUI() {
  const bind = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state.glowLightSettings[key] = parseFloat(e.target.value) / 100;
      applyGlowLightSettings();
    });
  };

  bind('glow-light-ambient-slider', 'ambientIntensity');
  bind('glow-light-key-slider', 'keyIntensity');
  bind('glow-light-fill-slider', 'fillIntensity');
  bind('glow-light-core-slider', 'coreIntensity');
  bind('glow-light-bloom-strength-slider', 'bloomStrength');
  bind('glow-light-bloom-threshold-slider', 'bloomThreshold');
  bind('glow-light-bloom-radius-slider', 'bloomRadius');
  bind('glow-light-exposure-slider', 'toneExposure');
}
