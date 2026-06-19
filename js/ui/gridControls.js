import { state } from '../state/appState.js';
import { applyGridAppearance, rebuildCircularGrid } from '../scene/grid.js';

function syncGridLabels() {
  const s = state.gridSettings;
  document.getElementById('grid-line-width-val').textContent = s.lineWidth.toFixed(3);
  document.getElementById('grid-brightness-val').textContent = `${Math.round(s.brightness * 100)}%`;
}

function applyBrightness() {
  applyGridAppearance();
  syncGridLabels();
}

function applyLineWidth() {
  rebuildCircularGrid();
  syncGridLabels();
}

export function setupGridUI() {
  const s = state.gridSettings;

  document.getElementById('grid-line-width-slider').value = Math.round(s.lineWidth * 1000);
  document.getElementById('grid-brightness-slider').value = Math.round(s.brightness * 100);

  document.getElementById('grid-line-width-slider').addEventListener('input', (e) => {
    state.gridSettings.lineWidth = parseFloat(e.target.value) / 1000;
    applyLineWidth();
  });
  document.getElementById('grid-brightness-slider').addEventListener('input', (e) => {
    state.gridSettings.brightness = parseFloat(e.target.value) / 100;
    applyBrightness();
  });

  syncGridLabels();
}
