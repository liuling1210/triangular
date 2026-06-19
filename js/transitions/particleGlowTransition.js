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
import { updateParticleFlow, syncParticleFlowClock, advanceParticleFlowClock, stampParticleFlowClock } from '../scene/pyramid.js';
import { applyPyramidColorAndBrightness } from '../ui/pyramidControls.js';
import { applyAxisMaterial } from '../ui/axisControls.js';
import {
  isEffectTransitioning,
  restoreGlowObjectVisibility
} from './glowWireframeTransition.js';

const DURATION = 1.6;
const SETTLE_DURATION = 0.25;
const CHARGE_END = 0.2;
const DISSOLVE_START = 0.18;
const DISSOLVE_SPAN = 0.72;

const PARTICLE_BASE_SIZE = 0.055;
const PARTICLE_SHRINK_SIZE = 0.02;
const PARTICLE_BASE_OPACITY = 0.92;

const REVEAL_THRESHOLD_SPAN = 0.55;
const REVEAL_THRESHOLD_BASE = 0.08;
const REVEAL_FADE_SPAN = 0.22;

const GLOW_DECOR_SHOW = 0.05;
const GLOW_SLICE_LINES_SHOW = 0.08;

const MOTION_PRERUN_START = 0.5;
const MOTION_PRERUN_END = 0.75;
const MOTION_RAMP_END = 0.9;

function computeMotionWeight(progress) {
  if (progress < MOTION_PRERUN_START) return 0;
  if (progress < MOTION_PRERUN_END) {
    return lerp(0, 0.1, smootherstep((progress - MOTION_PRERUN_START) / (MOTION_PRERUN_END - MOTION_PRERUN_START)));
  }
  if (progress < MOTION_RAMP_END) {
    return lerp(0.1, 0.6, smootherstep((progress - MOTION_PRERUN_END) / (MOTION_RAMP_END - MOTION_PRERUN_END)));
  }
  return lerp(0.6, 1, smootherstep((progress - MOTION_RAMP_END) / (1 - MOTION_RAMP_END)));
}

function advanceFlowClock(motionWeight) {
  const elapsed = advanceParticleFlowClock(motionWeight);
  updateParticleFlow(elapsed, { pulseWeight: motionWeight });
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

function setParticleDissolveWeight(progress) {
  const geo = state.particleCloudGeo;
  const mat = state.pyramidMats.particleCloud;
  if (!geo || !mat) return;

  const reveals = geo.attributes.reveal.array;
  const colors = geo.attributes.color.array;
  const count = reveals.length;
  const globalOpacity = PARTICLE_BASE_OPACITY * state.pyramidBrightness;

  if (progress < CHARGE_END) {
    const chargeT = smootherstep(progress / CHARGE_END);
    mat.size = lerp(PARTICLE_BASE_SIZE, PARTICLE_BASE_SIZE * 1.08, chargeT);
    mat.opacity = globalOpacity;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    }
    geo.attributes.color.needsUpdate = true;
    return;
  }

  const dissolveProgress = clamp01((progress - DISSOLVE_START) / DISSOLVE_SPAN);
  const shrinkT = smootherstep(dissolveProgress);
  mat.size = lerp(PARTICLE_BASE_SIZE, PARTICLE_SHRINK_SIZE, shrinkT);
  mat.opacity = lerp(globalOpacity, globalOpacity * 0.35, smootherstep(clamp01((dissolveProgress - 0.35) / 0.65)));

  for (let i = 0; i < count; i++) {
    const outerness = 1 - reveals[i];
    const threshold = outerness * REVEAL_THRESHOLD_SPAN + REVEAL_THRESHOLD_BASE;
    const alpha = 1 - smootherstep((dissolveProgress - threshold) / REVEAL_FADE_SPAN);
    const i3 = i * 3;
    colors[i3] = alpha;
    colors[i3 + 1] = alpha;
    colors[i3 + 2] = alpha;
  }

  geo.attributes.color.needsUpdate = true;
}

function setGlowMaterializeWeight(progress) {
  const mats = state.pyramidMats;
  const transformT = clamp01((progress - CHARGE_END) / (1 - CHARGE_END));
  const brightness = state.pyramidBrightness;
  const motionWeight = computeMotionWeight(progress);

  const coreT = layerFadeIn(transformT, 0.02, 0.36);
  const shellT = layerFadeIn(transformT, 0.14, 0.4);
  const sliceT = layerFadeIn(transformT, 0.26, 0.4);
  const decorT = layerFadeIn(transformT, 0.4, 0.44);
  const decorOpacity = decorT * lerp(0.3, 1, smootherstep(clamp01(motionWeight / 0.6)));

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

  applyPhysical(mats.solid, 1, BASE_EMISSIVE.solid, coreT);
  applyPhysical(mats.base, 1, BASE_EMISSIVE.base, coreT);
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
  if (mats.particles) mats.particles.opacity = 0.95 * decorOpacity;
  if (mats.vertex) mats.vertex.opacity = decorOpacity;

  syncGlowMaterializeVisibility(coreT, shellT, sliceT, decorT);
}

function syncGlowMaterializeVisibility(coreT, shellT, sliceT, decorT) {
  const objects = state.glowObjects;
  const glow = state.pyramidGroups.glow;
  if (!objects || !glow) return;

  glow.visible = coreT > 0.006 || shellT > 0.006 || sliceT > 0.006 || decorT > 0.006;

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
  if (objects.internalPoints) objects.internalPoints.visible = showDecor;
  if (objects.vertexPoints) objects.vertexPoints.visible = showDecor;
}

function applyBloomForTransition(progress) {
  if (!state.bloomPass) return;
  const fullBloom = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
  const chargeBloom = fullBloom * 1.1;

  if (progress < CHARGE_END) {
    state.bloomPass.strength = lerp(fullBloom, chargeBloom, smootherstep(progress / CHARGE_END));
    return;
  }

  const settleT = smootherstep(clamp01((progress - 0.5) / 0.5));
  state.bloomPass.strength = lerp(chargeBloom, fullBloom, settleT);
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

  const { glow, particles } = state.pyramidGroups;
  if (particles) particles.visible = false;

  const mat = state.pyramidMats.particleCloud;
  if (mat) {
    mat.size = PARTICLE_BASE_SIZE;
  }
  resetParticleCloudColors();

  restoreGlowMaterialFlags();
  restoreGlowObjectVisibility();
  applyPyramidColorAndBrightness();
  applyAxisMaterial();
  stampParticleFlowClock();

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

  syncParticleFlowClock();
  updateParticleFlow(state.particleFlowElapsed, { pulseWeight: 0 });

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
    advanceFlowClock(1);
    const settleElapsed = state.clock.getElapsedTime() - tr.settleStart;
    if (settleElapsed >= SETTLE_DURATION) {
      finishTransition();
    }
    return;
  }

  const elapsed = state.clock.getElapsedTime() - tr.startTime;
  const progress = clamp01(elapsed / tr.duration);
  const motionWeight = computeMotionWeight(progress);

  advanceFlowClock(motionWeight);
  setParticleDissolveWeight(progress);
  setGlowMaterializeWeight(progress);
  applyBloomForTransition(progress);

  if (progress >= 1) {
    tr.settling = true;
    tr.settleStart = state.clock.getElapsedTime();
    stampParticleFlowClock();
  }
}

export function setupParticleGlowTransitionUI() {
  const btn = document.getElementById('effect-particle-glow-toggle-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    startParticleGlowTransition();
  });
}
