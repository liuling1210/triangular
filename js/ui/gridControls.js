/** 圆形网格 UI 控制 */
import { state } from '../state/appState.js';
import { applyGridAppearance, rebuildCircularGrid } from '../scene/grid.js';

/** 同步网格 UI 标签显示 */
function syncGridLabels() {
  const s = state.gridSettings;
  document.getElementById('grid-line-width-val').textContent = s.lineWidth.toFixed(3);
  document.getElementById('grid-brightness-val').textContent = `${Math.round(s.brightness * 100)}%`;
  document.getElementById('grid-ring-count-val').textContent = String(s.ringCount);
  document.getElementById('grid-radius-scale-val').textContent = `${Math.round(s.ringRadiusScale * 100)}%`;
}

/** 应用网格亮度设置 */
function applyBrightness() {
  applyGridAppearance();
  syncGridLabels();
}

/** 应用网格线宽并重建几何 */
function applyLineWidth() {
  rebuildCircularGrid();
  syncGridLabels();
}

/** 应用网格几何参数并重建 */
function applyGridGeometry() {
  rebuildCircularGrid();
  syncGridLabels();
}

/** 绑定网格控制面板事件 */
export function setupGridUI() {
  const s = state.gridSettings;

  document.getElementById('grid-line-width-slider').value = Math.round(s.lineWidth * 1000);
  document.getElementById('grid-brightness-slider').value = Math.round(s.brightness * 100);
  document.getElementById('grid-ring-count-slider').value = s.ringCount;
  document.getElementById('grid-radius-scale-slider').value = Math.round(s.ringRadiusScale * 100);

  document.getElementById('grid-line-width-slider').addEventListener('input', (e) => {
    state.gridSettings.lineWidth = parseFloat(e.target.value) / 1000;
    applyLineWidth();
  });
  document.getElementById('grid-brightness-slider').addEventListener('input', (e) => {
    state.gridSettings.brightness = parseFloat(e.target.value) / 100;
    applyBrightness();
  });
  document.getElementById('grid-ring-count-slider').addEventListener('input', (e) => {
    state.gridSettings.ringCount = parseInt(e.target.value, 10);
    applyGridGeometry();
  });
  document.getElementById('grid-radius-scale-slider').addEventListener('input', (e) => {
    state.gridSettings.ringRadiusScale = parseFloat(e.target.value) / 100;
    applyGridGeometry();
  });

  syncGridLabels();
}
