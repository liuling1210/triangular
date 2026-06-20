import {
  STRATEGIC_LABEL_FONT_SIZE_RANGE,
  STRATEGIC_LABEL_ITEMS,
  STRATEGIC_LABEL_SCREEN_RANGE
} from '../config/constants.js';
import { state } from '../state/appState.js';
import {
  applyStrategicLabelFontSize,
  applyStrategicLabelPositions
} from '../scene/strategicLabels.js';

const AXES = ['x', 'y'];

function formatScreenValue(value) {
  return `${value.toFixed(1)}%`;
}

function sliderId(key, axis) {
  return `strategic-label-${key}-${axis}-slider`;
}

function valueId(key, axis) {
  return `strategic-label-${key}-${axis}-val`;
}

function syncFontSizeControl() {
  const slider = document.getElementById('strategic-label-font-size-slider');
  const label = document.getElementById('strategic-label-font-size-val');
  if (slider) slider.value = state.strategicLabelFontSize;
  if (label) label.textContent = `${state.strategicLabelFontSize}px`;
}

function syncLabelControlValues() {
  STRATEGIC_LABEL_ITEMS.forEach(({ key }) => {
    const position = state.strategicLabelPositions[key];
    AXES.forEach((axis) => {
      const slider = document.getElementById(sliderId(key, axis));
      const label = document.getElementById(valueId(key, axis));
      if (slider) slider.value = Math.round(position[axis] * 10);
      if (label) label.textContent = formatScreenValue(position[axis]);
    });
  });
  syncFontSizeControl();
}

function applyAxisValue(key, axis, rawValue) {
  const range = STRATEGIC_LABEL_SCREEN_RANGE[axis];
  const value = Math.max(range.min, Math.min(range.max, rawValue / 10));
  state.strategicLabelPositions[key][axis] = value;
  applyStrategicLabelPositions(key);

  const label = document.getElementById(valueId(key, axis));
  if (label) label.textContent = formatScreenValue(value);
}

function applyFontSize(rawValue) {
  const range = STRATEGIC_LABEL_FONT_SIZE_RANGE;
  const value = Math.max(range.min, Math.min(range.max, Math.round(rawValue)));
  state.strategicLabelFontSize = value;
  applyStrategicLabelFontSize();

  const label = document.getElementById('strategic-label-font-size-val');
  if (label) label.textContent = `${value}px`;
}

export function setupStrategicLabelUI() {
  STRATEGIC_LABEL_ITEMS.forEach(({ key }) => {
    AXES.forEach((axis) => {
      const slider = document.getElementById(sliderId(key, axis));
      if (!slider) return;
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

  syncLabelControlValues();
  applyStrategicLabelFontSize();
}
