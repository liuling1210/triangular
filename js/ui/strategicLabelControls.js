/** 战略标签位置与样式 UI 控制 */
import {
  STRATEGIC_APEX_BG_RANGE,
  STRATEGIC_LABEL_ADJUST_RANGE,
  STRATEGIC_LABEL_FONT_SIZE_RANGE,
  STRATEGIC_LABEL_ITEMS
} from '../config/constants.js';
import { state } from '../state/appState.js';
import {
  applyStrategicApexBgSettings,
  applyStrategicLabelFontSize,
  applyStrategicLabelPositions
} from '../scene/strategicLabels.js';

const AXES = ['x', 'y'];
/** 滑块 raw 值与屏幕百分比的换算：1 raw = 0.01% */
const SCREEN_PERCENT_SCALE = 1000;

/** 格式化屏幕坐标百分比显示 */
function formatScreenValue(value) {
  return `${value.toFixed(2)}%`;
}

/** 百分比转滑块 raw 值 */
function toSliderRaw(percent) {
  return Math.round(percent * SCREEN_PERCENT_SCALE);
}

/** 滑块 raw 值转百分比 */
function fromSliderRaw(raw) {
  return raw / SCREEN_PERCENT_SCALE;
}

/** 生成标签位置滑块 DOM id */
function sliderId(key, axis) {
  return `strategic-label-${key}-${axis}-slider`;
}

/** 生成标签位置值显示 DOM id */
function valueId(key, axis) {
  return `strategic-label-${key}-${axis}-val`;
}

/** 生成顶点背景位置滑块 DOM id */
function apexBgSliderId(axis) {
  return `strategic-apex-bg-${axis}-slider`;
}

/** 生成顶点背景位置值显示 DOM id */
function apexBgValueId(axis) {
  return `strategic-apex-bg-${axis}-val`;
}

/** 同步战略标签字号控件显示 */
function syncFontSizeControl() {
  const slider = document.getElementById('strategic-label-font-size-slider');
  const label = document.getElementById('strategic-label-font-size-val');
  if (slider) slider.value = state.strategicLabelFontSize;
  if (label) label.textContent = `${state.strategicLabelFontSize}px`;
}

/** 获取指定标签轴的滑块细调范围 */
function getAdjustRange(key, axis) {
  return STRATEGIC_LABEL_ADJUST_RANGE[key][axis];
}

/** 将滑块 min/max 同步为细调范围（raw 值 = 百分比 × 1000） */
function configureSliderRange(slider, key, axis) {
  const range = getAdjustRange(key, axis);
  slider.min = toSliderRaw(range.min);
  slider.max = toSliderRaw(range.max);
  slider.step = 1;
}

/** 同步顶点背景控件显示 */
function syncApexBgControlValues() {
  const { width, position } = state.strategicApexBg;
  const widthSlider = document.getElementById('strategic-apex-bg-width-slider');
  const widthLabel = document.getElementById('strategic-apex-bg-width-val');
  if (widthSlider) widthSlider.value = width;
  if (widthLabel) widthLabel.textContent = `${Math.round(width)}px`;

  AXES.forEach((axis) => {
    const slider = document.getElementById(apexBgSliderId(axis));
    const label = document.getElementById(apexBgValueId(axis));
    if (slider) slider.value = toSliderRaw(position[axis]);
    if (label) label.textContent = formatScreenValue(position[axis]);
  });
}

/** 应用顶点背景宽度并更新 UI */
function applyApexBgWidth(rawValue) {
  const range = STRATEGIC_APEX_BG_RANGE.width;
  const value = Math.max(range.min, Math.min(range.max, Math.round(rawValue)));
  state.strategicApexBg.width = value;
  applyStrategicApexBgSettings();

  const label = document.getElementById('strategic-apex-bg-width-val');
  if (label) label.textContent = `${value}px`;
}

/** 应用顶点背景位置并更新 UI */
function applyApexBgPosition(axis, rawValue) {
  const range = getAdjustRange('apexBg', axis);
  const value = Math.max(range.min, Math.min(range.max, fromSliderRaw(rawValue)));
  state.strategicApexBg.position[axis] = value;
  applyStrategicApexBgSettings();

  const label = document.getElementById(apexBgValueId(axis));
  if (label) label.textContent = formatScreenValue(value);
}

/** 同步所有战略标签控件显示 */
function syncLabelControlValues() {
  STRATEGIC_LABEL_ITEMS.forEach(({ key }) => {
    const position = state.strategicLabelPositions[key];
    AXES.forEach((axis) => {
      const slider = document.getElementById(sliderId(key, axis));
      const label = document.getElementById(valueId(key, axis));
      if (slider) slider.value = toSliderRaw(position[axis]);
      if (label) label.textContent = formatScreenValue(position[axis]);
    });
  });
  syncFontSizeControl();
  syncApexBgControlValues();
}

/** 应用单个标签轴坐标并更新 UI */
function applyAxisValue(key, axis, rawValue) {
  const range = getAdjustRange(key, axis);
  const value = Math.max(range.min, Math.min(range.max, fromSliderRaw(rawValue)));
  state.strategicLabelPositions[key][axis] = value;
  applyStrategicLabelPositions(key);

  const label = document.getElementById(valueId(key, axis));
  if (label) label.textContent = formatScreenValue(value);
}

/** 应用战略标签字号并更新 UI */
function applyFontSize(rawValue) {
  const range = STRATEGIC_LABEL_FONT_SIZE_RANGE;
  const value = Math.max(range.min, Math.min(range.max, Math.round(rawValue)));
  state.strategicLabelFontSize = value;
  applyStrategicLabelFontSize();

  const label = document.getElementById('strategic-label-font-size-val');
  if (label) label.textContent = `${value}px`;
}

/** 绑定战略标签控制面板事件 */
export function setupStrategicLabelUI() {
  STRATEGIC_LABEL_ITEMS.forEach(({ key }) => {
    AXES.forEach((axis) => {
      const slider = document.getElementById(sliderId(key, axis));
      if (!slider) return;
      configureSliderRange(slider, key, axis);
      slider.addEventListener('input', (event) => {
        applyAxisValue(key, axis, parseFloat(event.target.value));
      });
    });
  });

  const fontSizeSlider = document.getElementById('strategic-label-font-size-slider');
  if (fontSizeSlider) {
    fontSizeSlider.addEventListener('input', (event) => {
      applyFontSize(parseFloat(event.target.value));
    });
  }

  const widthSlider = document.getElementById('strategic-apex-bg-width-slider');
  if (widthSlider) {
    widthSlider.addEventListener('input', (event) => {
      applyApexBgWidth(parseFloat(event.target.value));
    });
  }

  AXES.forEach((axis) => {
    const slider = document.getElementById(apexBgSliderId(axis));
    if (!slider) return;
    configureSliderRange(slider, 'apexBg', axis);
    slider.addEventListener('input', (event) => {
      applyApexBgPosition(axis, parseFloat(event.target.value));
    });
  });

  syncLabelControlValues();
  applyStrategicLabelFontSize();
  applyStrategicApexBgSettings();
}
