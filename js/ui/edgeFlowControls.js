import { state } from '../state/appState.js';
import {
  applyEdgeFlowColors,
  applyEdgeFlowUniforms
} from '../materials/edgeFlowMaterial.js';
import { rebuildEdgeGlowTubes } from '../scene/edgeGlowTubes.js';

export function getEdgeFlowOpacity(multiplier = 1) {
  return state.edgeFlowSettings.opacity * multiplier;
}

export function getEdgeFlowOuterIntensity(multiplier = 1) {
  return state.pyramidBrightness * state.edgeFlowSettings.intensity * multiplier;
}

export function getEdgeFlowInnerIntensity(multiplier = 1) {
  return getEdgeFlowOuterIntensity(multiplier) * state.edgeFlowSettings.innerIntensityRatio;
}

export function applyEdgeFlowAppearance() {
  const { pyramidMats } = state;
  const opacity = state.edgeFlowSettings.opacity;

  applyEdgeFlowColors(
    pyramidMats.edgeFlowOuter,
    state.pyramidColorHex,
    getEdgeFlowOuterIntensity(),
    opacity
  );
  applyEdgeFlowColors(
    pyramidMats.edgeFlowInner,
    state.pyramidColorHex,
    getEdgeFlowInnerIntensity(),
    opacity
  );
  applyEdgeFlowUniforms(pyramidMats.edgeFlowOuter);
  applyEdgeFlowUniforms(pyramidMats.edgeFlowInner);
}

function syncEdgeFlowLabels() {
  const s = state.edgeFlowSettings;
  document.getElementById('edge-flow-speed-val').textContent = `${Math.round(s.speed * 100)}%`;
  document.getElementById('edge-flow-intensity-val').textContent = `${Math.round(s.intensity * 100)}%`;
  document.getElementById('edge-flow-opacity-val').textContent = `${Math.round(s.opacity * 100)}%`;
  document.getElementById('edge-flow-band-width-val').textContent = `${Math.round(s.bandWidth * 100)}%`;
  document.getElementById('edge-flow-outer-radius-val').textContent = s.outerRadius.toFixed(3);
  document.getElementById('edge-flow-inner-radius-val').textContent = s.innerRadius.toFixed(3);
}

function applyShaderSettings() {
  applyEdgeFlowAppearance();
  syncEdgeFlowLabels();
}

function applyGeometrySettings() {
  rebuildEdgeGlowTubes();
  applyEdgeFlowAppearance();
  syncEdgeFlowLabels();
}

export function setupEdgeFlowUI() {
  const s = state.edgeFlowSettings;

  document.getElementById('edge-flow-speed-slider').value = Math.round(s.speed * 100);
  document.getElementById('edge-flow-intensity-slider').value = Math.round(s.intensity * 100);
  document.getElementById('edge-flow-opacity-slider').value = Math.round(s.opacity * 100);
  document.getElementById('edge-flow-band-width-slider').value = Math.round(s.bandWidth * 100);
  document.getElementById('edge-flow-outer-radius-slider').value = Math.round(s.outerRadius * 1000);
  document.getElementById('edge-flow-inner-radius-slider').value = Math.round(s.innerRadius * 1000);

  document.getElementById('edge-flow-speed-slider').addEventListener('input', (e) => {
    state.edgeFlowSettings.speed = parseFloat(e.target.value) / 100;
    applyShaderSettings();
  });
  document.getElementById('edge-flow-intensity-slider').addEventListener('input', (e) => {
    state.edgeFlowSettings.intensity = parseFloat(e.target.value) / 100;
    applyShaderSettings();
  });
  document.getElementById('edge-flow-opacity-slider').addEventListener('input', (e) => {
    state.edgeFlowSettings.opacity = parseFloat(e.target.value) / 100;
    applyShaderSettings();
  });
  document.getElementById('edge-flow-band-width-slider').addEventListener('input', (e) => {
    state.edgeFlowSettings.bandWidth = parseFloat(e.target.value) / 100;
    applyShaderSettings();
  });
  document.getElementById('edge-flow-outer-radius-slider').addEventListener('input', (e) => {
    state.edgeFlowSettings.outerRadius = parseFloat(e.target.value) / 1000;
    applyGeometrySettings();
  });
  document.getElementById('edge-flow-inner-radius-slider').addEventListener('input', (e) => {
    state.edgeFlowSettings.innerRadius = parseFloat(e.target.value) / 1000;
    applyGeometrySettings();
  });

  syncEdgeFlowLabels();
}
