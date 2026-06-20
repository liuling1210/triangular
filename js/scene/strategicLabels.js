import { STRATEGIC_LABEL_ITEMS } from '../config/constants.js';
import { state } from '../state/appState.js';

const LABEL_CLASS = {
  base: 'strategic-label strategic-label--base',
  axis: 'strategic-label strategic-label--side',
  slices: 'strategic-label strategic-label--side',
  apex: 'strategic-label strategic-label--title'
};

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smootherstep(t) {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function phaseOpacity(elapsed, phase) {
  if (elapsed < phase.start) return 0;
  return smootherstep(clamp01((elapsed - phase.start) / phase.duration));
}

function applyScreenPosition(element, position) {
  element.style.left = `${position.x}%`;
  element.style.top = `${position.y}%`;
}

export function applyStrategicLabelPositions(key = null) {
  if (!state.strategicLabels?.length) return;

  state.strategicLabels.forEach((entry) => {
    if (key && entry.key !== key) return;
    const position = state.strategicLabelPositions[entry.key];
    if (!position) return;
    applyScreenPosition(entry.element, position);
  });
}

export function applyStrategicLabelFontSize() {
  const overlay = document.getElementById('strategic-labels-overlay');
  if (!overlay) return;
  overlay.style.setProperty('--strategic-label-font-size', `${state.strategicLabelFontSize}px`);
}

export function createStrategicLabels() {
  const overlay = document.getElementById('strategic-labels-overlay');
  if (!overlay) return;

  overlay.replaceChildren();
  state.strategicLabels = [];

  STRATEGIC_LABEL_ITEMS.forEach(({ key, text }) => {
    const position = state.strategicLabelPositions[key];
    const div = document.createElement('div');
    div.className = LABEL_CLASS[key];
    div.textContent = text;
    div.style.opacity = '0';
    applyScreenPosition(div, position);
    overlay.appendChild(div);

    state.strategicLabels.push({ key, element: div });
  });

  applyStrategicLabelFontSize();
}

export function setStrategicLabelOpacity(key, opacity) {
  const item = state.strategicLabels?.find((entry) => entry.key === key);
  if (item) {
    item.element.style.opacity = String(clamp01(opacity));
  }
}

export function hideAllStrategicLabels() {
  state.strategicLabels?.forEach(({ element }) => {
    element.style.opacity = '0';
  });
}

export function showAllStrategicLabels() {
  state.strategicLabels?.forEach(({ element }) => {
    element.style.opacity = '1';
  });
}

/** 与 initialRevealTransition 时间轴同步 */
export function updateStrategicLabelReveal(elapsed, timeline, reveal = null) {
  if (!state.strategicLabels?.length || !timeline) return;

  const contourDone = (reveal?.contourProgress ?? 0) >= 0.999;
  setStrategicLabelOpacity(
    'base',
    contourDone ? phaseOpacity(elapsed, timeline.baseSolid) : 0
  );
  setStrategicLabelOpacity('axis', phaseOpacity(elapsed, timeline.axis));
  setStrategicLabelOpacity('slices', phaseOpacity(elapsed, timeline.slices));
  setStrategicLabelOpacity('apex', phaseOpacity(elapsed, timeline.particles));
}
