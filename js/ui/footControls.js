import { state } from '../state/appState.js';
import {
  applyFootViewMaterials,
  applyViewAdaptiveBloom,
  applyViewAdaptiveLights,
  getViewTopDownBlend
} from '../utils/viewAdaptation.js';

export function getFootEmissiveIntensity() {
  return state.footSettings.emissiveIntensity;
}

export function applyFootMaterial() {
  const topDownBlend = getViewTopDownBlend();
  applyFootViewMaterials(topDownBlend, { applyIntensity: true });
  applyViewAdaptiveLights(topDownBlend);
  applyViewAdaptiveBloom(topDownBlend, 1);

  const { footSettings } = state;
  document.getElementById('foot-color-hex-label').textContent = footSettings.color.toUpperCase();
  document.getElementById('foot-color-preview').style.background = footSettings.color;
  document.getElementById('foot-color-brightness-val').textContent = `${Math.round(footSettings.colorBrightness * 100)}%`;
  document.getElementById('foot-metalness-val').textContent = `${Math.round(footSettings.metalness * 100)}%`;
  document.getElementById('foot-roughness-val').textContent = `${Math.round(footSettings.roughness * 100)}%`;
  document.getElementById('foot-emissive-val').textContent = `${Math.round(footSettings.emissiveIntensity * 100)}%`;
  document.getElementById('foot-clearcoat-val').textContent = `${Math.round(footSettings.clearcoat * 100)}%`;
}

export function setupFootUI() {
  document.getElementById('foot-color-picker').addEventListener('input', (e) => {
    state.footSettings.color = e.target.value;
    applyFootMaterial();
  });
  document.getElementById('foot-color-brightness-slider').addEventListener('input', (e) => {
    state.footSettings.colorBrightness = parseFloat(e.target.value) / 100;
    applyFootMaterial();
  });
  document.getElementById('foot-metalness-slider').addEventListener('input', (e) => {
    state.footSettings.metalness = parseFloat(e.target.value) / 100;
    applyFootMaterial();
  });
  document.getElementById('foot-roughness-slider').addEventListener('input', (e) => {
    state.footSettings.roughness = parseFloat(e.target.value) / 100;
    applyFootMaterial();
  });
  document.getElementById('foot-emissive-slider').addEventListener('input', (e) => {
    state.footSettings.emissiveIntensity = parseFloat(e.target.value) / 100;
    applyFootMaterial();
  });
  document.getElementById('foot-clearcoat-slider').addEventListener('input', (e) => {
    state.footSettings.clearcoat = parseFloat(e.target.value) / 100;
    applyFootMaterial();
  });
}
