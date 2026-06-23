/** 金字塔自动旋转与效果循环切换 UI */
import { PYRAMID_EFFECT_MODES } from '../config/constants.js';
import { state } from '../state/appState.js';
import { flyCameraToFrontView } from './cameraViewControls.js';
import {
  isInitialRevealActive,
  isInitialRevealPastSlices
} from '../transitions/initialRevealTransition.js';
import {
  isEffectTransitioning,
  startGlowWireTransition
} from '../transitions/glowWireframeTransition.js';
import { startWireParticleTransition } from '../transitions/wireframeParticleTransition.js';
import { startParticleGlowTransition } from '../transitions/particleGlowTransition.js';

/** 正视图下绕 Y 轴负方向自转，单位：弧度/秒 */
const AUTO_ROTATE_SPEED = 0.45;
const LAPS_PER_EFFECT_SWITCH = 1;
const RADIANS_PER_EFFECT_SWITCH = LAPS_PER_EFFECT_SWITCH * Math.PI * 2;

let lapRadians = 0;

/** 同步旋转切换按钮的文案与禁用状态 */
function syncRotateToggleButton() {
  const btn = document.getElementById('pyramid-rotate-toggle-btn');
  if (!btn) return;

  const blocked = isAutoRotateBlockedByInitialReveal();
  btn.classList.toggle('is-disabled', blocked);
  btn.textContent = state.pyramidAutoRotate ? '旋转暂停' : '旋转继续';
  btn.setAttribute('aria-label', state.pyramidAutoRotate ? '暂停旋转' : '继续旋转');
}

/** 重置自转圈数计数器 */
function resetAutoRotateLapCounter() {
  lapRadians = 0;
}

/** 判断初始揭示是否阻止自转 */
function isAutoRotateBlockedByInitialReveal() {
  return isInitialRevealActive() && !isInitialRevealPastSlices();
}

/** 尝试触发一次效果模式自动切换 */
function tryTriggerAutoRotateEffectSwitch() {
  if (isEffectTransitioning() || isAutoRotateBlockedByInitialReveal()) return false;

  const mode = state.pyramidEffectMode;
  if (mode === PYRAMID_EFFECT_MODES.GLOW) {
    startGlowWireTransition();
  } else if (mode === PYRAMID_EFFECT_MODES.WIREFRAME) {
    startWireParticleTransition();
  } else if (mode === PYRAMID_EFFECT_MODES.PARTICLES) {
    startParticleGlowTransition();
  } else {
    return false;
  }

  return isEffectTransitioning();
}

/** 每圈自转完成后检查并触发效果切换 */
function updateAutoRotateEffectCycle() {
  if (lapRadians < RADIANS_PER_EFFECT_SWITCH) return;

  while (lapRadians >= RADIANS_PER_EFFECT_SWITCH) {
    if (isEffectTransitioning()) return;
    lapRadians -= RADIANS_PER_EFFECT_SWITCH;
    if (!tryTriggerAutoRotateEffectSwitch()) {
      lapRadians += RADIANS_PER_EFFECT_SWITCH;
      return;
    }
  }
}

/** 设置金字塔自动旋转开关 */
export function setPyramidAutoRotate(enabled) {
  state.pyramidAutoRotate = Boolean(enabled);
  resetAutoRotateLapCounter();
  syncRotateToggleButton();

  if (state.pyramidAutoRotate) {
    flyCameraToFrontView();
  }
}

/** 切换金字塔自动旋转开关 */
export function togglePyramidAutoRotate() {
  if (isAutoRotateBlockedByInitialReveal()) return;
  state.pyramidAutoRotate = !state.pyramidAutoRotate;
  syncRotateToggleButton();
}

/** 每帧更新金字塔自转与效果循环 */
export function updatePyramidAutoRotate(delta) {
  if (!state.pyramidAutoRotate || !state.pyramidRootGroup || isAutoRotateBlockedByInitialReveal()) {
    syncRotateToggleButton();
    return;
  }

  const step = AUTO_ROTATE_SPEED * delta;
  state.pyramidRootGroup.rotation.y -= step;
  lapRadians += step;
  updateAutoRotateEffectCycle();
}

/** 绑定金字塔自转控制按钮事件 */
export function setupPyramidAutoRotateUI() {
  const btn = document.getElementById('pyramid-rotate-toggle-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    togglePyramidAutoRotate();
  });
  syncRotateToggleButton();
}
