import { state } from '../state/appState.js';

export function getMotionParticleOpacity() {
  return state.motionParticleSettings.opacity;
}

export function getMotionParticleVertexOpacity() {
  return state.motionParticleSettings.vertexOpacity;
}

export function getMotionParticleRiseSpeed() {
  return state.motionParticleSettings.speed;
}

export function getMotionParticleCountMultiplier() {
  return state.motionParticleSettings.count;
}

export function getMotionParticleCount() {
  return state.internalParticleStreams.length;
}

export function applyMotionParticleMaterialSettings() {
  const s = state.motionParticleSettings;
  const { pyramidMats } = state;

  if (pyramidMats.particles) {
    pyramidMats.particles.size = s.internalSize;
    pyramidMats.particles.opacity = s.opacity;
  }
  if (pyramidMats.vertex) {
    pyramidMats.vertex.size = s.vertexSize;
    pyramidMats.vertex.opacity = s.vertexOpacity;
  }
}
