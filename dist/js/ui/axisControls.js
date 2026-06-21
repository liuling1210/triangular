import { state } from '../state/appState.js';

export function applyAxisMaterial() {
  const baseColor = new THREE.Color(state.axisSettings.color);
  const surfaceColor = baseColor.clone().multiplyScalar(state.axisSettings.colorBrightness);
  const emissiveColor = baseColor.clone().multiplyScalar(state.axisSettings.emissiveStrength);

  if (state.pyramidMats.axis) {
    state.pyramidMats.axis.color.copy(surfaceColor);
    state.pyramidMats.axis.emissive.copy(emissiveColor);
    state.pyramidMats.axis.emissiveIntensity = state.axisSettings.emissiveIntensity * state.pyramidBrightness;
    state.pyramidMats.axis.metalness = state.axisSettings.metalness;
    state.pyramidMats.axis.roughness = state.axisSettings.roughness;
    state.pyramidMats.axis.clearcoat = state.axisSettings.clearcoat;
    state.pyramidMats.axis.clearcoatRoughness = state.axisSettings.clearcoatRoughness;
    state.pyramidMats.axis.transparent = false;
    state.pyramidMats.axis.opacity = 1;
    state.pyramidMats.axis.transmission = 0;
    state.pyramidMats.axis.depthWrite = true;
    state.pyramidMats.axis.depthTest = true;
    state.pyramidMats.axis.needsUpdate = true;
  }

  if (state.pyramidLights.axis) {
    state.pyramidLights.axis.color.copy(baseColor);
    state.pyramidLights.axis.intensity = state.axisSettings.lightIntensity * state.pyramidBrightness;
  }

  document.getElementById('axis-color-hex-label').textContent = state.axisSettings.color.toUpperCase();
  document.getElementById('axis-color-preview').style.background = state.axisSettings.color;
  document.getElementById('axis-color-brightness-val').textContent = `${Math.round(state.axisSettings.colorBrightness * 100)}%`;
  document.getElementById('axis-metalness-val').textContent = `${Math.round(state.axisSettings.metalness * 100)}%`;
  document.getElementById('axis-roughness-val').textContent = `${Math.round(state.axisSettings.roughness * 100)}%`;
  document.getElementById('axis-emissive-val').textContent = `${Math.round(state.axisSettings.emissiveIntensity * 100)}%`;
  document.getElementById('axis-clearcoat-val').textContent = `${Math.round(state.axisSettings.clearcoat * 100)}%`;
  document.getElementById('axis-light-val').textContent = `${Math.round(state.axisSettings.lightIntensity * 100)}%`;
}

export function setupAxisUI() {
  document.getElementById('axis-color-picker').addEventListener('input', (e) => {
    state.axisSettings.color = e.target.value;
    applyAxisMaterial();
  });
  document.getElementById('axis-color-brightness-slider').addEventListener('input', (e) => {
    state.axisSettings.colorBrightness = parseFloat(e.target.value) / 100;
    applyAxisMaterial();
  });
  document.getElementById('axis-metalness-slider').addEventListener('input', (e) => {
    state.axisSettings.metalness = parseFloat(e.target.value) / 100;
    applyAxisMaterial();
  });
  document.getElementById('axis-roughness-slider').addEventListener('input', (e) => {
    state.axisSettings.roughness = parseFloat(e.target.value) / 100;
    applyAxisMaterial();
  });
  document.getElementById('axis-emissive-slider').addEventListener('input', (e) => {
    state.axisSettings.emissiveIntensity = parseFloat(e.target.value) / 100;
    applyAxisMaterial();
  });
  document.getElementById('axis-clearcoat-slider').addEventListener('input', (e) => {
    state.axisSettings.clearcoat = parseFloat(e.target.value) / 100;
    applyAxisMaterial();
  });
  document.getElementById('axis-light-slider').addEventListener('input', (e) => {
    state.axisSettings.lightIntensity = parseFloat(e.target.value) / 100;
    applyAxisMaterial();
  });
}
