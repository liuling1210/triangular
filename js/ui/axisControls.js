/** 中心轴材质与 UI 控制 */
import { applyAxisGradientUniforms } from '../materials/axisMaterial.js';
import { state } from '../state/appState.js';

/** 计算中心轴当前发光强度 */
function getAxisEmissiveIntensity() {
  return state.axisSettings.emissiveIntensity * state.pyramidBrightness;
}

/** 同步中心轴表面材质参数 */
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
  applyAxisGradientUniforms(mat, state.axisSettings);
  mat.needsUpdate = true;
  return baseColor;
}

/** 按揭示权重应用中心轴材质（过渡/入场动画用） */
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

/** 应用中心轴材质并同步 UI 标签 */
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
  syncAxisGradientLabels();
}

/** 同步中心轴渐变相关 UI 标签 */
function syncAxisGradientLabels() {
  const { axisSettings } = state;
  document.getElementById('axis-gradient-strength-val').textContent =
    `${Math.round(axisSettings.gradientStrength * 100)}%`;
  document.getElementById('axis-gradient-end-darkness-val').textContent =
    `${Math.round(axisSettings.gradientEndDarkness * 100)}%`;
  document.getElementById('axis-gradient-center-val').textContent =
    `${Math.round(axisSettings.gradientCenter * 100)}%`;
  document.getElementById('axis-gradient-half-width-val').textContent =
    `${Math.round(axisSettings.gradientHalfWidth * 100)}%`;
}

/** 应用中心轴渐变设置到材质 */
function applyAxisGradientSettings() {
  const mat = state.pyramidMats.axis;
  if (mat) {
    applyAxisGradientUniforms(mat, state.axisSettings);
  }
  syncAxisGradientLabels();
}

/** 绑定中心轴控制面板事件 */
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
  document.getElementById('axis-gradient-strength-slider').addEventListener('input', (e) => {
    state.axisSettings.gradientStrength = parseFloat(e.target.value) / 100;
    applyAxisGradientSettings();
  });
  document.getElementById('axis-gradient-end-darkness-slider').addEventListener('input', (e) => {
    state.axisSettings.gradientEndDarkness = parseFloat(e.target.value) / 100;
    applyAxisGradientSettings();
  });
  document.getElementById('axis-gradient-center-slider').addEventListener('input', (e) => {
    state.axisSettings.gradientCenter = parseFloat(e.target.value) / 100;
    applyAxisGradientSettings();
  });
  document.getElementById('axis-gradient-half-width-slider').addEventListener('input', (e) => {
    state.axisSettings.gradientHalfWidth = parseFloat(e.target.value) / 100;
    applyAxisGradientSettings();
  });
}
