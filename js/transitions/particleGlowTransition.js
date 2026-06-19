import {
  PYRAMID_EFFECT_MODES,
  BASE_BLOOM_STRENGTH,
  BASE_EMISSIVE
} from '../config/constants.js';
import { state } from '../state/appState.js';
import {
  getEdgeFlowOpacity,
  getEdgeFlowOuterIntensity,
  getEdgeFlowInnerIntensity
} from '../ui/edgeFlowControls.js';
import { resetParticleCloudColors } from '../scene/particlePyramid.js';
import { applyPyramidColorAndBrightness } from '../ui/pyramidControls.js';
import { applyAxisMaterial } from '../ui/axisControls.js';
import {
  isEffectTransitioning,
  restoreGlowObjectVisibility
} from './glowWireframeTransition.js';
import { applyMotionParticleColors } from '../utils/motionParticleColors.js';
import { getFootEmissiveIntensity } from '../ui/footControls.js';

// 显影 → 凝聚 → 定型
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

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smootherstep(t) {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function layerFadeIn(progress, delay, span) {
  return smootherstep(clamp01((progress - delay) / span));
}

function dissolveProgressAt(progress) {
  return clamp01((progress - DISSOLVE_START) / DISSOLVE_SPAN);
}

function softGroupFade(progress) {
  if (progress <= SOFT_FADE_START) return 1;
  return 1 - smootherstep((progress - SOFT_FADE_START) / (1 - SOFT_FADE_START));
}

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
  if (mats.axis) {
    mats.axis.transparent = coreT < 0.999;
    mats.axis.opacity = coreT;
    mats.axis.emissiveIntensity = state.axisSettings.emissiveIntensity * coreT;
  }

  applyPhysical(mats.shell, 0.42, BASE_EMISSIVE.shell, shellT);

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
  if (mats.vertex) mats.vertex.opacity = getMotionParticleVertexOpacity() * decorOpacity;

  syncGlowMaterializeVisibility(coreT, shellT, sliceT, decorT);
}

function syncGlowMaterializeVisibility(coreT, shellT, sliceT, decorT) {
  const objects = state.glowObjects;
  const glow = state.pyramidGroups.glow;
  if (!objects || !glow) return;

  glow.visible = coreT > 0.004 || shellT > 0.004 || sliceT > 0.004 || decorT > 0.004;

  objects.meshes.forEach((mesh) => {
    mesh.visible = true;
  });

  const showSliceLines = sliceT > GLOW_SLICE_LINES_SHOW;
  objects.sliceEdgeLines.forEach((line) => {
    line.visible = showSliceLines;
  });
  objects.sliceInnerEdgeLines.forEach((line) => {
    line.visible = showSliceLines;
  });

  const showDecor = decorT > GLOW_DECOR_SHOW;
  if (objects.edgeGlowTubes) objects.edgeGlowTubes.tubeGroup.visible = showDecor;
  if (objects.vertexPoints) objects.vertexPoints.visible = showDecor;
}

function applyBloomForTransition(progress) {
  if (!state.bloomPass) return;
  const fullBloom = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
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

function applySettlePhase(settleT) {
  const mat = state.pyramidMats.particleCloud;
  if (mat) {
    mat.opacity = lerp(mat.opacity, 0, smootherstep(settleT));
  }

  if (state.bloomPass) {
    const fullBloom = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
    state.bloomPass.strength = lerp(state.bloomPass.strength, fullBloom, smootherstep(settleT));
  }
}

function setTransitionButtonBusy(busy) {
  const btn = document.getElementById('effect-particle-glow-toggle-btn');
  if (btn) btn.classList.toggle('is-busy', busy);
}

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
  applyPyramidColorAndBrightness();
  applyAxisMaterial();

  document.getElementById('effect-glow-btn').classList.toggle('active', true);
  document.getElementById('effect-wireframe-btn').classList.toggle('active', false);
  document.getElementById('effect-particles-btn').classList.toggle('active', false);

  setTransitionButtonBusy(false);
}

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

  setTransitionButtonBusy(true);
}

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

export function setupParticleGlowTransitionUI() {
  const btn = document.getElementById('effect-particle-glow-toggle-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    startParticleGlowTransition();
  });
}
