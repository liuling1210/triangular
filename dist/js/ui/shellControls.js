import { state } from '../state/appState.js';

export function getShellOpacity() {
  return state.shellSettings.opacity;
}

export function getShellEmissiveIntensity() {
  return state.shellSettings.emissiveIntensity;
}

export function applyShellMaterial() {
  const mat = state.pyramidMats.shell;
  if (!mat) return;

  const baseColor = new THREE.Color(state.shellSettings.color);
  const surfaceColor = baseColor.clone().multiplyScalar(state.shellSettings.colorBrightness);
  const emissiveColor = baseColor.clone().multiplyScalar(state.shellSettings.emissiveStrength);
  const { shellSettings } = state;

  mat.color.copy(surfaceColor);
  mat.emissive.copy(emissiveColor);
  mat.emissiveIntensity = shellSettings.emissiveIntensity * state.pyramidBrightness;
  mat.opacity = shellSettings.opacity;
  mat.transmission = shellSettings.transmission;
  mat.thickness = shellSettings.thickness;
  mat.roughness = shellSettings.roughness;
  mat.metalness = shellSettings.metalness;
  mat.clearcoat = shellSettings.clearcoat;
  mat.clearcoatRoughness = shellSettings.clearcoatRoughness;
  mat.needsUpdate = true;

  document.getElementById('shell-color-hex-label').textContent = shellSettings.color.toUpperCase();
  document.getElementById('shell-color-preview').style.background = shellSettings.color;
  document.getElementById('shell-color-brightness-val').textContent =
    `${Math.round(shellSettings.colorBrightness * 100)}%`;
  document.getElementById('shell-opacity-val').textContent =
    `${Math.round(shellSettings.opacity * 100)}%`;
  document.getElementById('shell-transmission-val').textContent =
    `${Math.round(shellSettings.transmission * 100)}%`;
  document.getElementById('shell-thickness-val').textContent =
    shellSettings.thickness.toFixed(2);
  document.getElementById('shell-roughness-val').textContent =
    `${Math.round(shellSettings.roughness * 100)}%`;
  document.getElementById('shell-metalness-val').textContent =
    `${Math.round(shellSettings.metalness * 100)}%`;
  document.getElementById('shell-emissive-val').textContent =
    `${Math.round(shellSettings.emissiveIntensity * 100)}%`;
  document.getElementById('shell-clearcoat-val').textContent =
    `${Math.round(shellSettings.clearcoat * 100)}%`;
  document.getElementById('shell-clearcoat-roughness-val').textContent =
    `${Math.round(shellSettings.clearcoatRoughness * 100)}%`;
}

export function setupShellUI() {
  document.getElementById('shell-color-picker').addEventListener('input', (e) => {
    state.shellSettings.color = e.target.value;
    applyShellMaterial();
  });
  document.getElementById('shell-color-brightness-slider').addEventListener('input', (e) => {
    state.shellSettings.colorBrightness = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-opacity-slider').addEventListener('input', (e) => {
    state.shellSettings.opacity = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-transmission-slider').addEventListener('input', (e) => {
    state.shellSettings.transmission = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-thickness-slider').addEventListener('input', (e) => {
    state.shellSettings.thickness = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-roughness-slider').addEventListener('input', (e) => {
    state.shellSettings.roughness = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-metalness-slider').addEventListener('input', (e) => {
    state.shellSettings.metalness = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-emissive-slider').addEventListener('input', (e) => {
    state.shellSettings.emissiveIntensity = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-clearcoat-slider').addEventListener('input', (e) => {
    state.shellSettings.clearcoat = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
  document.getElementById('shell-clearcoat-roughness-slider').addEventListener('input', (e) => {
    state.shellSettings.clearcoatRoughness = parseFloat(e.target.value) / 100;
    applyShellMaterial();
  });
}
