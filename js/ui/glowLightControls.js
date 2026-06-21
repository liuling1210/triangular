import { state } from '../state/appState.js';
import {
  applyViewAdaptiveBloom,
  applyViewAdaptiveLights,
  getViewTopDownBlend
} from '../utils/viewAdaptation.js';

const SOFTNESS_LIGHTS = [
  { key: 'ambientSoftness', prefix: 'glow-light-ambient-soft' },
  { key: 'keySoftness', prefix: 'glow-light-key-soft' },
  { key: 'fillSoftness', prefix: 'glow-light-fill-soft' },
  { key: 'coreSoftness', prefix: 'glow-light-core-soft' },
  { key: 'axisSoftness', prefix: 'glow-light-axis-soft' }
];

const POSITION_LIGHTS = [
  { lightKey: 'key', positionKey: 'keyPosition', prefix: 'glow-light-key' },
  { lightKey: 'fill', positionKey: 'fillPosition', prefix: 'glow-light-fill' },
  { lightKey: 'core', positionKey: 'corePosition', prefix: 'glow-light-core' },
  { lightKey: 'axis', positionKey: 'axisLightPosition', prefix: 'glow-light-axis' }
];

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function posText(value) {
  return value.toFixed(2);
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

  SOFTNESS_LIGHTS.forEach(({ key, prefix }) => {
    document.getElementById(`${prefix}-val`).textContent = pct(glowLightSettings[key]);
  });

  POSITION_LIGHTS.forEach(({ positionKey, prefix }) => {
    const position = glowLightSettings[positionKey];
    ['x', 'y', 'z'].forEach((axis) => {
      document.getElementById(`${prefix}-${axis}-val`).textContent = posText(position[axis]);
    });
  });
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

  SOFTNESS_LIGHTS.forEach(({ key, prefix }) => {
    bind(`${prefix}-slider`, key);
  });

  POSITION_LIGHTS.forEach(({ positionKey, prefix }) => {
    ['x', 'y', 'z'].forEach((axis) => {
      document.getElementById(`${prefix}-${axis}-slider`).addEventListener('input', (e) => {
        state.glowLightSettings[positionKey][axis] = parseFloat(e.target.value) / 100;
        applyGlowLightSettings();
      });
    });
  });
}
