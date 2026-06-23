/** 运动粒子与边流光颜色的金/线框混合及材质刷新 */
import {
  PYRAMID_EFFECT_MODES,
  PARTICLE_EFFECT_COLOR,
  WIREFRAME_MOTION_COLOR
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { createGlowTexture } from './color.js';
import { applyEdgeFlowShaderColors } from '../materials/edgeFlowMaterial.js';
import {
  getMotionParticleOpacity
} from './motionParticleSettings.js';
import { clamp01 } from './math.js';

/** 根据效果模式返回金色权重 */
export function getMotionGoldWeightForMode(mode) {
  return mode === PYRAMID_EFFECT_MODES.WIREFRAME ? 0 : 1;
}

/** 按 goldWeight 在金字塔色与线框色之间插值，得到运动粒子混合色 */
function getMotionParticleMixColor(goldWeight = state.motionParticleGoldWeight) {
  const gold = new THREE.Color(state.pyramidColorHex);
  const wire = new THREE.Color(WIREFRAME_MOTION_COLOR);
  return gold.clone().lerp(wire, 1 - clamp01(goldWeight));
}

/** 按 goldWeight 在粒子特效色与线框色之间插值，得到粒子云混合色 */
function getParticleEffectMixColor(goldWeight = state.motionParticleGoldWeight) {
  const particle = new THREE.Color(PARTICLE_EFFECT_COLOR);
  const wire = new THREE.Color(WIREFRAME_MOTION_COLOR);
  return particle.clone().lerp(wire, 1 - clamp01(goldWeight));
}

/** 返回运动粒子混合色的十六进制字符串（含 # 前缀） */
export function getMotionParticleMixHex(goldWeight = state.motionParticleGoldWeight) {
  return `#${getMotionParticleMixColor(goldWeight).getHexString()}`;
}

/** 刷新 Points 材质的发光贴图（带缓存键避免重复创建） */
function refreshPointsGlowMap(material, hex, bright) {
  if (!material) return;
  const cacheKey = `${hex}:${bright ? 1 : 0}`;
  if (material.userData.glowCacheKey === cacheKey) return;
  if (material.map) material.map.dispose();
  material.map = createGlowTexture(hex, bright);
  material.userData.glowCacheKey = cacheKey;
  material.needsUpdate = true;
}

/** 按 goldWeight 更新运动粒子、粒子云及边流光的颜色与贴图 */
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
  if (pyramidMats.particleCloud) {
    const particleColor = getParticleEffectMixColor(w);
    const particleHex = `#${particleColor.getHexString()}`;
    pyramidMats.particleCloud.color.copy(particleColor);
    refreshPointsGlowMap(pyramidMats.particleCloud, particleHex, true);
  }

  applyEdgeFlowShaderColors(pyramidMats.edgeFlowOuter, mixHex);
  applyEdgeFlowShaderColors(pyramidMats.edgeFlowInner, mixHex);
}
