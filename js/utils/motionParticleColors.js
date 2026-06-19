import {
  PYRAMID_EFFECT_MODES,
  WIREFRAME_MOTION_COLOR
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { createGlowTexture } from './color.js';
import { applyEdgeFlowShaderColors } from '../materials/edgeFlowMaterial.js';
import {
  getMotionParticleOpacity,
  getMotionParticleVertexOpacity
} from './motionParticleSettings.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function getMotionGoldWeightForMode(mode) {
  return mode === PYRAMID_EFFECT_MODES.WIREFRAME ? 0 : 1;
}

export function getMotionParticleMixColor(goldWeight = state.motionParticleGoldWeight) {
  const gold = new THREE.Color(state.pyramidColorHex);
  const wire = new THREE.Color(WIREFRAME_MOTION_COLOR);
  return gold.clone().lerp(wire, 1 - clamp01(goldWeight));
}

export function getMotionParticleMixHex(goldWeight = state.motionParticleGoldWeight) {
  return `#${getMotionParticleMixColor(goldWeight).getHexString()}`;
}

function refreshPointsGlowMap(material, hex, bright) {
  if (!material) return;
  const cacheKey = `${hex}:${bright ? 1 : 0}`;
  if (material.userData.glowCacheKey === cacheKey) return;
  if (material.map) material.map.dispose();
  material.map = createGlowTexture(hex, bright);
  material.userData.glowCacheKey = cacheKey;
  material.needsUpdate = true;
}

export function applyMotionParticleColors(goldWeight = state.motionParticleGoldWeight) {
  const w = clamp01(goldWeight);
  state.motionParticleGoldWeight = w;

  const mixColor = getMotionParticleMixColor(w);
  const mixHex = `#${mixColor.getHexString()}`;
  const { pyramidMats } = state;

  if (pyramidMats.particles) {
    pyramidMats.particles.color.copy(mixColor);
    pyramidMats.particles.opacity = getMotionParticleOpacity();
    refreshPointsGlowMap(pyramidMats.particles, mixHex, false);
  }
  if (pyramidMats.vertex) {
    pyramidMats.vertex.color.copy(mixColor);
    pyramidMats.vertex.opacity = getMotionParticleVertexOpacity();
    refreshPointsGlowMap(pyramidMats.vertex, mixHex, true);
  }
  if (pyramidMats.particleCloud) {
    pyramidMats.particleCloud.color.copy(mixColor);
    refreshPointsGlowMap(pyramidMats.particleCloud, mixHex, true);
  }

  applyEdgeFlowShaderColors(pyramidMats.edgeFlowOuter, mixHex);
  applyEdgeFlowShaderColors(pyramidMats.edgeFlowInner, mixHex);
}
