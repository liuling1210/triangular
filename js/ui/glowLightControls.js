/** 发光灯光与 Bloom 参数 UI 控制 */
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

/** 将 0–1 数值格式化为百分比字符串 */
function pct(value) {
  return `${Math.round(value * 100)}%`;
}

/** 将位置数值格式化为两位小数字符串 */
function posText(value) {
  return value.toFixed(2);
}

/** 同步发光灯光 UI 标签显示 */
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

/** 应用发光灯光设置到场景与后处理 */
export function applyGlowLightSettings() {
  const topDownBlend = getViewTopDownBlend();
  applyViewAdaptiveLights(topDownBlend);
  applyViewAdaptiveBloom(topDownBlend, 1);

  if (state.renderer) {
    state.renderer.toneMappingExposure = state.glowLightSettings.toneExposure * state.pyramidBrightness;
  }

  syncGlowLightLabels();
}

/** 绑定发光灯光控制面板事件 */
export function setupGlowLightUI() {
  /** 绑定单个滑块到 glowLightSettings 字段 */
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
