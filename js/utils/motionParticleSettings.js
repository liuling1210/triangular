/** 运动粒子数量、速度与材质参数的读取与应用 */
import { state } from '../state/appState.js';

/** 返回运动粒子的不透明度设置值 */
export function getMotionParticleOpacity() {
  return state.motionParticleSettings.opacity;
}

/** 返回运动粒子的上升速度设置值 */
export function getMotionParticleRiseSpeed() {
  return state.motionParticleSettings.speed;
}

/** 返回运动粒子数量的倍率系数 */
export function getMotionParticleCountMultiplier() {
  return state.motionParticleSettings.count;
}

/** 返回当前内部粒子流的条数（即实际粒子组数量） */
export function getMotionParticleCount() {
  return state.internalParticleStreams.length;
}

/** 将运动粒子尺寸与不透明度同步到 pyramidMats.particles 材质 */
export function applyMotionParticleMaterialSettings() {
  const s = state.motionParticleSettings;
  const { pyramidMats } = state;

  if (pyramidMats.particles) {
    pyramidMats.particles.size = s.internalSize;
    pyramidMats.particles.opacity = s.opacity;
  }
}
