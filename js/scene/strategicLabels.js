/** 战略标签 DOM 叠层：位置、字号与入场渐显 */
import { STRATEGIC_APEX_BG_IMAGE, STRATEGIC_LABEL_ITEMS } from '../config/constants.js';
import { state } from '../state/appState.js';
import { clamp01, smootherstep } from '../utils/math.js';

const LABEL_CLASS = {
  base: 'strategic-label strategic-label--base',
  axis: 'strategic-label strategic-label--side',
  slices: 'strategic-label strategic-label--side',
  apex: 'strategic-label strategic-label--title'
};

/** 根据时间轴阶段计算该阶段的透明度 */
function phaseOpacity(elapsed, phase) {
  if (elapsed < phase.start) return 0;
  return smootherstep(clamp01((elapsed - phase.start) / phase.duration));
}

/** 将百分比屏幕坐标应用到 DOM 元素 */
function applyScreenPosition(element, position) {
  element.style.left = `${position.x}%`;
  element.style.top = `${position.y}%`;
}

/** 将 state 中的百分比位置同步到指定或全部战略标签 */
export function applyStrategicLabelPositions(key = null) {
  if (!state.strategicLabels?.length) return;

  state.strategicLabels.forEach((entry) => {
    if (key && entry.key !== key) return;
    const position = state.strategicLabelPositions[entry.key];
    if (!position) return;
    applyScreenPosition(entry.element, position);
  });
}

/** 将全局字号 CSS 变量同步到叠层容器 */
export function applyStrategicLabelFontSize() {
  const overlay = document.getElementById('strategic-labels-overlay');
  if (!overlay) return;
  overlay.style.setProperty('--strategic-label-font-size', `${state.strategicLabelFontSize}px`);
}

/** 同步顶点标签背景图的宽度与屏幕位置 */
export function applyStrategicApexBgSettings() {
  const apex = state.strategicLabels?.find((entry) => entry.key === 'apex');
  const bg = apex?.bgElement;
  if (!bg) return;

  const { width, position } = state.strategicApexBg;
  bg.style.width = `${width}px`;
  applyScreenPosition(bg, position);
}

/** 在 DOM 叠层中创建全部战略标签元素 */
export function createStrategicLabels() {
  const overlay = document.getElementById('strategic-labels-overlay');
  if (!overlay) return;

  overlay.replaceChildren();
  state.strategicLabels = [];

  STRATEGIC_LABEL_ITEMS.forEach(({ key, text }) => {
    const position = state.strategicLabelPositions[key];

    if (key === 'apex') {
      const div = document.createElement('div');
      div.className = LABEL_CLASS[key];
      div.textContent = text;
      div.style.opacity = '0';
      applyScreenPosition(div, position);
      overlay.appendChild(div);

      const bg = document.createElement('img');
      bg.className = 'strategic-label-apex-bg';
      bg.src = STRATEGIC_APEX_BG_IMAGE;
      bg.alt = '';
      bg.decoding = 'async';
      bg.style.opacity = '0';
      overlay.appendChild(bg);

      state.strategicLabels.push({ key, element: div, bgElement: bg });
      return;
    }

    const div = document.createElement('div');
    div.className = LABEL_CLASS[key];
    div.textContent = text;
    div.style.opacity = '0';
    applyScreenPosition(div, position);
    overlay.appendChild(div);
    state.strategicLabels.push({ key, element: div });
  });

  applyStrategicApexBgSettings();
  applyStrategicLabelFontSize();
}

/** 设置指定战略标签（及背景）的不透明度 */
export function setStrategicLabelOpacity(key, opacity) {
  const item = state.strategicLabels?.find((entry) => entry.key === key);
  if (!item) return;
  const value = String(clamp01(opacity));
  item.element.style.opacity = value;
  if (item.bgElement) item.bgElement.style.opacity = value;
}

/** 隐藏全部战略标签 */
export function hideAllStrategicLabels() {
  state.strategicLabels?.forEach(({ element, bgElement }) => {
    element.style.opacity = '0';
    if (bgElement) bgElement.style.opacity = '0';
  });
}

/** 显示全部战略标签（不透明） */
export function showAllStrategicLabels() {
  state.strategicLabels?.forEach(({ element, bgElement }) => {
    element.style.opacity = '1';
    if (bgElement) bgElement.style.opacity = '1';
  });
}

/** 与 initialRevealTransition 时间轴同步更新各标签渐显 */
export function updateStrategicLabelReveal(elapsed, timeline) {
  if (!state.strategicLabels?.length || !timeline) return;

  setStrategicLabelOpacity('base', phaseOpacity(elapsed, timeline.baseLabel));
  setStrategicLabelOpacity('axis', phaseOpacity(elapsed, timeline.axis));
  setStrategicLabelOpacity('slices', phaseOpacity(elapsed, timeline.slices));
  setStrategicLabelOpacity('apex', phaseOpacity(elapsed, timeline.apexLabel));
}
