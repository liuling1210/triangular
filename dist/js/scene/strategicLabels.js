import { STRATEGIC_APEX_BG_IMAGE, STRATEGIC_LABEL_ITEMS } from '../config/constants.js';
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

export function applyStrategicApexBgSettings() {
  const apex = state.strategicLabels?.find((entry) => entry.key === 'apex');
  const bg = apex?.bgElement;
  if (!bg) return;

  const { width, position } = state.strategicApexBg;
  bg.style.width = `${width}px`;
  applyScreenPosition(bg, position);
}

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

export function setStrategicLabelOpacity(key, opacity) {
  const item = state.strategicLabels?.find((entry) => entry.key === key);
  if (!item) return;
  const value = String(clamp01(opacity));
  item.element.style.opacity = value;
  if (item.bgElement) item.bgElement.style.opacity = value;
}

export function hideAllStrategicLabels() {
  state.strategicLabels?.forEach(({ element, bgElement }) => {
    element.style.opacity = '0';
    if (bgElement) bgElement.style.opacity = '0';
  });
}

export function showAllStrategicLabels() {
  state.strategicLabels?.forEach(({ element, bgElement }) => {
    element.style.opacity = '1';
    if (bgElement) bgElement.style.opacity = '1';
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
  setStrategicLabelOpacity('apex', phaseOpacity(elapsed, timeline.shellEdges));
}
