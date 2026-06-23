/** 运动粒子 UI 控制 */
import { state } from '../state/appState.js';
import { applyMotionParticleMaterialSettings, getMotionParticleCount } from '../utils/motionParticleSettings.js';
import { applyMotionParticleColors } from '../utils/motionParticleColors.js';
import { rebuildInternalParticles } from '../scene/pyramid.js';

/** 应用运动粒子材质与颜色（面板调节后调用） */
export function applyMotionParticleAppearance(goldWeight = state.motionParticleGoldWeight) {
  applyMotionParticleMaterialSettings();
  applyMotionParticleColors(goldWeight);
}

/** 同步运动粒子 UI 标签显示 */
function syncMotionParticleLabels() {
  const s = state.motionParticleSettings;
  document.getElementById('motion-particle-speed-val').textContent = `${Math.round(s.speed * 100)}%`;
  document.getElementById('motion-particle-count-val').textContent = `${getMotionParticleCount()}`;
  document.getElementById('motion-particle-opacity-val').textContent = `${Math.round(s.opacity * 100)}%`;
  document.getElementById('motion-particle-size-val').textContent = s.internalSize.toFixed(3);
}

/** 绑定运动粒子控制面板事件 */
export function setupMotionParticleUI() {
  const s = state.motionParticleSettings;

  document.getElementById('motion-particle-speed-slider').value = Math.round(s.speed * 100);
  document.getElementById('motion-particle-count-slider').value = Math.round(s.count * 100);
  document.getElementById('motion-particle-opacity-slider').value = Math.round(s.opacity * 100);
  document.getElementById('motion-particle-size-slider').value = Math.round(s.internalSize * 1000);

  document.getElementById('motion-particle-speed-slider').addEventListener('input', (e) => {
    state.motionParticleSettings.speed = parseFloat(e.target.value) / 100;
    syncMotionParticleLabels();
  });
  document.getElementById('motion-particle-count-slider').addEventListener('input', (e) => {
    state.motionParticleSettings.count = parseFloat(e.target.value) / 100;
    rebuildInternalParticles();
    applyMotionParticleAppearance();
    syncMotionParticleLabels();
  });
  document.getElementById('motion-particle-opacity-slider').addEventListener('input', (e) => {
    state.motionParticleSettings.opacity = parseFloat(e.target.value) / 100;
    applyMotionParticleAppearance();
  });
  document.getElementById('motion-particle-size-slider').addEventListener('input', (e) => {
    state.motionParticleSettings.internalSize = parseFloat(e.target.value) / 1000;
    applyMotionParticleAppearance();
  });

  syncMotionParticleLabels();
}
