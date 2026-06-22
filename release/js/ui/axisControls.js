import { state } from '../state/appState.js';

export function getAxisEmissiveIntensity() {
  return state.axisSettings.emissiveIntensity * state.pyramidBrightness;
}

function syncAxisSurfaceMaterial(mat) {
  const baseColor = new THREE.Color(state.axisSettings.color);
  mat.color.copy(baseColor.clone().multiplyScalar(state.axisSettings.colorBrightness));
  mat.emissive.copy(baseColor.clone().multiplyScalar(state.axisSettings.emissiveStrength));
  mat.metalness = state.axisSettings.metalness;
  mat.roughness = state.axisSettings.roughness;
  mat.clearcoat = state.axisSettings.clearcoat;
  mat.clearcoatRoughness = state.axisSettings.clearcoatRoughness;
  mat.transmission = 0;
  mat.depthWrite = true;
  mat.depthTest = true;
  mat.needsUpdate = true;
  return baseColor;
}

/**
 * 动画渐显：表面参数与正式材质始终一致。
 * 默认不透明（opacityFade: false），由 scale / visible 控制出现；仅 wireframe 切换等需要时才做 opacity 淡出。
 */
export function applyAxisRevealWeight(revealWeight, { opacityFade = false } = {}) {
  const mat = state.pyramidMats.axis;
  if (!mat) return;

  const w = Math.max(0, Math.min(1, revealWeight));

  if (w <= 0) {
    syncAxisSurfaceMaterial(mat);
    mat.transparent = true;
    mat.opacity = 0;
    mat.emissiveIntensity = 0;
    return;
  }

  syncAxisSurfaceMaterial(mat);
  mat.emissiveIntensity = getAxisEmissiveIntensity();

  if (opacityFade && w < 1) {
    mat.transparent = true;
    mat.opacity = w;
  } else {
    mat.transparent = false;
    mat.opacity = 1;
  }
}

export function applyAxisMaterial() {
  const mat = state.pyramidMats.axis;
  const baseColor = mat ? syncAxisSurfaceMaterial(mat) : new THREE.Color(state.axisSettings.color);

  if (mat) {
    mat.transparent = false;
    mat.opacity = 1;
    mat.emissiveIntensity = getAxisEmissiveIntensity();
  }

  if (state.pyramidLights.axis) {
    state.pyramidLights.axis.color.copy(baseColor);
  }
  if (state.pyramidLights.axisSoft) {
    state.pyramidLights.axisSoft.color.copy(baseColor);
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
