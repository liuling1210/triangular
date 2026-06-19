import { state } from '../state/appState.js';
import { applyMotionParticleMaterialSettings, getMotionParticleCount } from '../utils/motionParticleSettings.js';
import { applyMotionParticleColors } from '../utils/motionParticleColors.js';
import { rebuildInternalParticles } from '../scene/pyramid.js';

export { getMotionParticleOpacity, getMotionParticleVertexOpacity, getMotionParticleRiseSpeed, getMotionParticleCount } from '../utils/motionParticleSettings.js';

export function applyMotionParticleAppearance(goldWeight = state.motionParticleGoldWeight) {
  applyMotionParticleMaterialSettings();
  applyMotionParticleColors(goldWeight);
}

function syncMotionParticleLabels() {
  const s = state.motionParticleSettings;
  document.getElementById('motion-particle-speed-val').textContent = `${Math.round(s.speed * 100)}%`;
  document.getElementById('motion-particle-count-val').textContent = `${getMotionParticleCount()}`;
  document.getElementById('motion-particle-opacity-val').textContent = `${Math.round(s.opacity * 100)}%`;
  document.getElementById('motion-particle-size-val').textContent = s.internalSize.toFixed(3);
  document.getElementById('motion-particle-vertex-size-val').textContent = s.vertexSize.toFixed(3);
  document.getElementById('motion-particle-vertex-opacity-val').textContent = `${Math.round(s.vertexOpacity * 100)}%`;
}

export function setupMotionParticleUI() {
  const s = state.motionParticleSettings;

  document.getElementById('motion-particle-speed-slider').value = Math.round(s.speed * 100);
  document.getElementById('motion-particle-count-slider').value = Math.round(s.count * 100);
  document.getElementById('motion-particle-opacity-slider').value = Math.round(s.opacity * 100);
  document.getElementById('motion-particle-size-slider').value = Math.round(s.internalSize * 1000);
  document.getElementById('motion-particle-vertex-size-slider').value = Math.round(s.vertexSize * 1000);
  document.getElementById('motion-particle-vertex-opacity-slider').value = Math.round(s.vertexOpacity * 100);

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
  document.getElementById('motion-particle-vertex-size-slider').addEventListener('input', (e) => {
    state.motionParticleSettings.vertexSize = parseFloat(e.target.value) / 1000;
    applyMotionParticleAppearance();
  });
  document.getElementById('motion-particle-vertex-opacity-slider').addEventListener('input', (e) => {
    state.motionParticleSettings.vertexOpacity = parseFloat(e.target.value) / 100;
    applyMotionParticleAppearance();
  });

  syncMotionParticleLabels();
}
