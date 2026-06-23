/** 粒子模式到发光模式的过渡动画 */
import {
  PYRAMID_EFFECT_MODES
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { getFullBloomStrength } from '../utils/viewAdaptation.js';
import { clamp01, lerp, smootherstep } from '../utils/math.js';
import {
  getEdgeFlowOpacity,
  getEdgeFlowOuterIntensity,
  getEdgeFlowInnerIntensity
} from '../ui/edgeFlowControls.js';
import { resetParticleCloudColors } from '../scene/particlePyramid.js';
import { applyPyramidColorAndBrightness } from '../ui/pyramidControls.js';
import { applyAxisMaterial, applyAxisRevealWeight } from '../ui/axisControls.js';
import {
  applyBaseCornerConeRevealWeight,
  resetBaseCornerConesReveal
} from '../scene/baseCornerCones.js';
import {
  isEffectTransitioning,
  restoreGlowObjectVisibility
} from './glowWireframeTransition.js';
import { applyMotionParticleColors } from '../utils/motionParticleColors.js';
import { getFootEmissiveIntensity } from '../ui/footControls.js';
import { getShellEmissiveIntensity, getShellOpacity } from '../ui/shellControls.js';

const DURATION = 2.1;
const SETTLE_DURATION = 0.3;

const CHARGE_END = 0.15;
const DISSOLVE_START = 0.15;
const DISSOLVE_END = 0.85;
const DISSOLVE_SPAN = DISSOLVE_END - DISSOLVE_START;
const SOFT_FADE_START = 0.88;

const PARTICLE_BASE_SIZE = 0.055;
const PARTICLE_SWELL_SIZE = 0.058;
const PARTICLE_BASE_OPACITY = 0.92;

const REVEAL_THRESHOLD_SPAN = 0.55;
const REVEAL_THRESHOLD_BASE = 0.08;
const REVEAL_FADE_SPAN = 0.28;

const GLOW_DECOR_SHOW = 0.04;
const GLOW_SLICE_LINES_SHOW = 0.05;

const BLOOM_PEAK_RATIO = 1.06;
const BLOOM_SETTLE_START = 0.78;

/** 计算装饰元素随过渡进度的运动权重 */
function computeDecorMotionWeight(progress) {
  if (progress < 0.22) {
    return lerp(0, 0.15, smootherstep(progress / 0.22));
  }
  if (progress < 0.55) {
    return lerp(0.15, 0.55, smootherstep((progress - 0.22) / 0.33));
  }
  if (progress < 0.82) {
    return lerp(0.55, 0.88, smootherstep((progress - 0.55) / 0.27));
  }
  return lerp(0.88, 1, smootherstep((progress - 0.82) / 0.18));
}

/** 计算分层淡入权重 */
function layerFadeIn(progress, delay, span) {
  return smootherstep(clamp01((progress - delay) / span));
}

/** 计算溶解阶段的归一化进度 */
function dissolveProgressAt(progress) {
  return clamp01((progress - DISSOLVE_START) / DISSOLVE_SPAN);
}

/** 计算粒子组末尾的软淡出系数 */
function softGroupFade(progress) {
  if (progress <= SOFT_FADE_START) return 1;
  return 1 - smootherstep((progress - SOFT_FADE_START) / (1 - SOFT_FADE_START));
}

/** 按进度更新粒子云的溶解与显影效果 */
function setParticleDissolveWeight(progress) {
  const geo = state.particleCloudGeo;
  const mat = state.pyramidMats.particleCloud;
  if (!geo || !mat) return;

  const reveals = geo.attributes.reveal.array;
  const colors = geo.attributes.color.array;
  const count = reveals.length;
  const globalOpacity = PARTICLE_BASE_OPACITY * state.pyramidBrightness;
  const groupFade = softGroupFade(progress);

  if (progress < CHARGE_END) {
    const chargeT = smootherstep(progress / CHARGE_END);
    mat.size = lerp(PARTICLE_BASE_SIZE, PARTICLE_SWELL_SIZE, chargeT);
    mat.opacity = globalOpacity * groupFade;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    }
    geo.attributes.color.needsUpdate = true;
    return;
  }

  const dissolveT = dissolveProgressAt(progress);
  const swellHold = 1 - smootherstep(clamp01(dissolveT / 0.35));
  mat.size = lerp(PARTICLE_BASE_SIZE, PARTICLE_SWELL_SIZE, swellHold * 0.65);
  mat.opacity = globalOpacity * lerp(1, 0.12, smootherstep(clamp01((dissolveT - 0.5) / 0.5))) * groupFade;

  for (let i = 0; i < count; i++) {
    const threshold = reveals[i] * REVEAL_THRESHOLD_SPAN + REVEAL_THRESHOLD_BASE;
    const alpha = 1 - smootherstep((dissolveT - threshold) / REVEAL_FADE_SPAN);
    const i3 = i * 3;
    colors[i3] = alpha;
    colors[i3 + 1] = alpha;
    colors[i3 + 2] = alpha;
  }

  geo.attributes.color.needsUpdate = true;
}

/** 按进度更新发光模式的逐层凝聚效果 */
function setGlowMaterializeWeight(progress) {
  const mats = state.pyramidMats;
  const brightness = state.pyramidBrightness;
  const decorMotion = computeDecorMotionWeight(progress);

  const coreT = layerFadeIn(progress, 0.08, 0.42);
  const shellT = layerFadeIn(progress, 0.12, 0.48);
  const sliceT = layerFadeIn(progress, 0.22, 0.5);
  const decorT = layerFadeIn(progress, 0.32, 0.52);
  const decorOpacity = decorT * lerp(0.35, 1, smootherstep(clamp01(decorMotion / 0.55)));

  const applyPhysical = (mat, baseOpacity, emissiveScale, layerWeight) => {
    if (!mat) return;
    const w = clamp01(layerWeight);
    const fading = w < 0.999;
    const isTranslucent = baseOpacity < 1;
    mat.transparent = fading || isTranslucent;
    mat.opacity = baseOpacity * w;
    if (emissiveScale !== undefined) {
      mat.emissiveIntensity = emissiveScale * brightness * w;
    }
  };

  applyPhysical(mats.solid, 1, getFootEmissiveIntensity(), coreT);
  applyPhysical(mats.base, 1, getFootEmissiveIntensity(), coreT);
  applyAxisRevealWeight(coreT > 0.004 ? 1 : 0, { opacityFade: false });
  applyBaseCornerConeRevealWeight(coreT > 0.004 ? 1 : 0, { opacityFade: false });

  applyPhysical(mats.shell, getShellOpacity(), getShellEmissiveIntensity(), shellT);

  if (mats.planes) {
    mats.planes.forEach((mat) => {
      mat.uniforms.uIntensity.value = sliceT;
    });
  }
  if (mats.sliceEdges) {
    mats.sliceEdges.forEach((mat) => {
      mat.opacity = 0.98 * sliceT;
    });
  }
  if (mats.sliceInnerEdges) {
    mats.sliceInnerEdges.forEach((mat) => {
      mat.opacity = 0.72 * sliceT;
    });
  }
  mats.edgeFlowOuter?.forEach((mat) => {
    mat.uniforms.uOpacity.value = getEdgeFlowOpacity(decorOpacity);
    mat.uniforms.uIntensity.value = getEdgeFlowOuterIntensity(decorOpacity);
  });
  mats.edgeFlowInner?.forEach((mat) => {
    mat.uniforms.uOpacity.value = getEdgeFlowOpacity(decorOpacity);
    mat.uniforms.uIntensity.value = getEdgeFlowInnerIntensity(decorOpacity);
  });

  syncGlowMaterializeVisibility(coreT, shellT, sliceT, decorT);
}

/** 同步发光凝聚过程中各子元素的可见性 */
function syncGlowMaterializeVisibility(coreT, shellT, sliceT, decorT) {
  const objects = state.glowObjects;
  const glow = state.pyramidGroups.glow;
  if (!objects || !glow) return;

  glow.visible = coreT > 0.004 || shellT > 0.004 || sliceT > 0.004 || decorT > 0.004;

  const showAxis = coreT > 0.004;
  objects.meshes.forEach((mesh) => {
    mesh.visible = true;
  });
  if (objects.axisShaft) objects.axisShaft.visible = showAxis;
  if (objects.baseCornerCones) {
    objects.baseCornerCones.group.visible = showAxis;
    objects.baseCornerCones.corners.forEach(({ group, mesh }) => {
      group.visible = showAxis;
      group.scale.y = showAxis ? 1 : 0.001;
      if (mesh) mesh.visible = showAxis;
    });
  }

  const showSliceLines = sliceT > GLOW_SLICE_LINES_SHOW;
  objects.sliceEdgeLines.forEach((line) => {
    line.visible = showSliceLines;
  });
  objects.sliceInnerEdgeLines.forEach((line) => {
    line.visible = showSliceLines;
  });

  const showDecor = decorT > GLOW_DECOR_SHOW;
  if (objects.edgeGlowTubes) objects.edgeGlowTubes.tubeGroup.visible = showDecor;
}

/** 过渡过程中更新 Bloom 强度曲线 */
function applyBloomForTransition(progress) {
  if (!state.bloomPass) return;
  const fullBloom = getFullBloomStrength();
  const peakBloom = fullBloom * BLOOM_PEAK_RATIO;

  if (progress < CHARGE_END) {
    state.bloomPass.strength = lerp(fullBloom, peakBloom, smootherstep(progress / CHARGE_END));
    return;
  }

  if (progress < BLOOM_SETTLE_START) {
    state.bloomPass.strength = peakBloom;
    return;
  }

  const settleT = smootherstep(clamp01((progress - BLOOM_SETTLE_START) / (1 - BLOOM_SETTLE_START)));
  state.bloomPass.strength = lerp(peakBloom, fullBloom, settleT);
}

/** 过渡结束后的收尾淡出阶段 */
function applySettlePhase(settleT) {
  const mat = state.pyramidMats.particleCloud;
  if (mat) {
    mat.opacity = lerp(mat.opacity, 0, smootherstep(settleT));
  }

  if (state.bloomPass) {
    const fullBloom = getFullBloomStrength();
    state.bloomPass.strength = lerp(state.bloomPass.strength, fullBloom, smootherstep(settleT));
  }
}

/** 恢复发光物理材质的不透明标志 */
function restoreGlowMaterialFlags() {
  const mats = state.pyramidMats;
  if (mats.solid) {
    mats.solid.transparent = false;
    mats.solid.opacity = 1;
  }
  if (mats.base) {
    mats.base.transparent = false;
    mats.base.opacity = 1;
  }
}

/** 完成过渡并切换到发光模式 */
function finishTransition() {
  state.pyramidEffectMode = PYRAMID_EFFECT_MODES.GLOW;
  state.effectTransition = null;
  state.motionParticleGoldWeight = 1;

  const { particles } = state.pyramidGroups;
  if (particles) particles.visible = false;

  const mat = state.pyramidMats.particleCloud;
  if (mat) {
    mat.size = PARTICLE_BASE_SIZE;
    mat.opacity = PARTICLE_BASE_OPACITY * state.pyramidBrightness;
  }
  resetParticleCloudColors();
  applyMotionParticleColors(1);

  restoreGlowMaterialFlags();
  restoreGlowObjectVisibility();
  resetBaseCornerConesReveal();
  applyPyramidColorAndBrightness();
  applyAxisMaterial();
}

/** 启动粒子到发光的过渡动画 */
export function startParticleGlowTransition() {
  if (isEffectTransitioning()) return;
  if (state.pyramidEffectMode !== PYRAMID_EFFECT_MODES.PARTICLES) return;

  const { glow, particles, wireframe } = state.pyramidGroups;
  if (!glow || !particles) return;

  if (wireframe) wireframe.visible = false;
  particles.visible = true;
  glow.visible = true;

  resetParticleCloudColors();
  const mat = state.pyramidMats.particleCloud;
  if (mat) {
    mat.size = PARTICLE_BASE_SIZE;
    mat.opacity = PARTICLE_BASE_OPACITY * state.pyramidBrightness;
  }

  setGlowMaterializeWeight(0);
  setParticleDissolveWeight(0);

  const now = state.clock.getElapsedTime();
  state.effectTransition = {
    active: true,
    kind: 'particleGlow',
    from: PYRAMID_EFFECT_MODES.PARTICLES,
    to: PYRAMID_EFFECT_MODES.GLOW,
    startTime: now,
    duration: DURATION,
    settling: false
  };
}

/** 每帧更新粒子到发光的过渡进度 */
export function updateParticleGlowTransition() {
  const tr = state.effectTransition;
  if (!tr?.active || tr.kind !== 'particleGlow' || !state.clock) return;

  if (tr.settling) {
    const settleElapsed = state.clock.getElapsedTime() - tr.settleStart;
    const settleT = clamp01(settleElapsed / SETTLE_DURATION);
    applySettlePhase(settleT);
    if (settleElapsed >= SETTLE_DURATION) {
      finishTransition();
    }
    return;
  }

  const elapsed = state.clock.getElapsedTime() - tr.startTime;
  const progress = clamp01(elapsed / tr.duration);

  setParticleDissolveWeight(progress);
  setGlowMaterializeWeight(progress);
  applyBloomForTransition(progress);

  if (progress >= 1) {
    tr.settling = true;
    tr.settleStart = state.clock.getElapsedTime();
  }
}
