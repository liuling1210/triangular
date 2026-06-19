import {
  PYRAMID_EFFECT_MODES,
  BASE_BLOOM_STRENGTH
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { resetParticleCloudColors } from '../scene/particlePyramid.js';
import { applyPyramidColorAndBrightness } from '../ui/pyramidControls.js';
import { isEffectTransitioning } from './glowWireframeTransition.js';
import { applyMotionParticleColors } from '../utils/motionParticleColors.js';

const DURATION = 1.5;
const WIREFRAME_BLOOM_RATIO = 0.38;
const CHARGE_END = 0.25;
const TRANSFORM_START = 0.18;
const TRANSFORM_SPAN = 0.72;

const PARTICLE_BASE_SIZE = 0.055;
const PARTICLE_START_SIZE = 0.02;
const PARTICLE_BASE_OPACITY = 0.92;

const WIREFRAME_OPACITY = { shell: 0.92, edge: 0.98, slice: 0.85 };

const REVEAL_THRESHOLD_SPAN = 0.55;
const REVEAL_THRESHOLD_BASE = 0.08;
const REVEAL_FADE_SPAN = 0.22;

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

function layerFadeOut(progress, delay, span) {
  return 1 - smootherstep(clamp01((progress - delay) / span));
}

function restoreWireframeMaterials() {
  const wireMats = state.pyramidMats.wireframe;
  if (!wireMats || wireMats.length < 3) return;
  const [shell, edge, slice] = wireMats;
  shell.opacity = WIREFRAME_OPACITY.shell;
  shell.color.setHex(0xffffff);
  edge.opacity = WIREFRAME_OPACITY.edge;
  edge.color.setHex(0xffffff);
  slice.opacity = WIREFRAME_OPACITY.slice;
  slice.color.setHex(0xe8e8e8);
  state.pyramidGroups.wireframe.scale.setScalar(1);
}

function setWireframeDissolveWeight(progress) {
  const wireMats = state.pyramidMats.wireframe;
  if (!wireMats || wireMats.length < 3) return;

  const dissolveT = clamp01((progress - CHARGE_END) / (1 - CHARGE_END));
  const [shellMat, edgeMat, sliceMat] = wireMats;
  const gold = new THREE.Color(state.pyramidColorHex);
  const white = new THREE.Color(0xffffff);
  const sliceWhite = new THREE.Color(0xe8e8e8);

  const edgeT = layerFadeOut(dissolveT, 0.04, 0.42);
  const shellT = layerFadeOut(dissolveT, 0.14, 0.42);
  const sliceT = layerFadeOut(dissolveT, 0.24, 0.42);
  const chargeGlow = progress < CHARGE_END
    ? 1 + smootherstep(progress / CHARGE_END) * 0.12
    : 1;

  edgeMat.opacity = WIREFRAME_OPACITY.edge * edgeT * chargeGlow;
  edgeMat.color.copy(white).lerp(gold, 1 - edgeT);

  shellMat.opacity = WIREFRAME_OPACITY.shell * shellT * chargeGlow;
  shellMat.color.copy(white).lerp(gold, 1 - shellT);

  sliceMat.opacity = WIREFRAME_OPACITY.slice * sliceT;
  sliceMat.color.copy(sliceWhite).lerp(gold, 1 - sliceT);

  const scale = 1 + (1 - smootherstep(dissolveT)) * 0.008;
  state.pyramidGroups.wireframe.scale.setScalar(scale);
}

function setParticleRevealWeight(progress) {
  const geo = state.particleCloudGeo;
  const mat = state.pyramidMats.particleCloud;
  if (!geo || !mat) return;

  const reveals = geo.attributes.reveal.array;
  const colors = geo.attributes.color.array;
  const count = reveals.length;
  const revealProgress = clamp01((progress - TRANSFORM_START) / TRANSFORM_SPAN);
  const sizeT = smootherstep(clamp01((progress - 0.12) / 0.88));
  const globalOpacity = PARTICLE_BASE_OPACITY * state.pyramidBrightness;

  mat.size = lerp(PARTICLE_START_SIZE, PARTICLE_BASE_SIZE, sizeT);
  mat.opacity = lerp(0.15, globalOpacity, smootherstep(revealProgress));

  for (let i = 0; i < count; i++) {
    const threshold = reveals[i] * REVEAL_THRESHOLD_SPAN + REVEAL_THRESHOLD_BASE;
    const alpha = smootherstep((revealProgress - threshold) / REVEAL_FADE_SPAN);
    const i3 = i * 3;
    colors[i3] = alpha;
    colors[i3 + 1] = alpha;
    colors[i3 + 2] = alpha;
  }

  geo.attributes.color.needsUpdate = true;
}

function applyBloomForTransition(progress) {
  if (!state.bloomPass) return;
  const fullBloom = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
  const wireBloom = fullBloom * WIREFRAME_BLOOM_RATIO;
  const chargeBloom = wireBloom * 1.18;
  const blend = smootherstep(clamp01((progress - 0.08) / 0.92));
  const startBloom = progress < CHARGE_END
    ? lerp(wireBloom, chargeBloom, smootherstep(progress / CHARGE_END))
    : lerp(chargeBloom, fullBloom, blend);
  state.bloomPass.strength = startBloom;
}

function setTransitionButtonBusy(busy) {
  const btn = document.getElementById('effect-wire-particle-toggle-btn');
  if (btn) btn.classList.toggle('is-busy', busy);
}

function finishTransition() {
  state.pyramidEffectMode = PYRAMID_EFFECT_MODES.PARTICLES;
  state.effectTransition = null;
  state.motionParticleGoldWeight = 1;

  const { wireframe, particles } = state.pyramidGroups;
  if (wireframe) {
    wireframe.visible = false;
    restoreWireframeMaterials();
  }
  if (particles) particles.visible = true;

  const mat = state.pyramidMats.particleCloud;
  if (mat) {
    mat.size = PARTICLE_BASE_SIZE;
  }
  resetParticleCloudColors();
  applyMotionParticleColors(1);
  applyPyramidColorAndBrightness();

  document.getElementById('effect-glow-btn').classList.toggle('active', false);
  document.getElementById('effect-wireframe-btn').classList.toggle('active', false);
  document.getElementById('effect-particles-btn').classList.toggle('active', true);

  setTransitionButtonBusy(false);
}

export function startWireParticleTransition() {
  if (isEffectTransitioning()) return;
  if (state.pyramidEffectMode !== PYRAMID_EFFECT_MODES.WIREFRAME) return;

  const { wireframe, particles, glow } = state.pyramidGroups;
  if (!wireframe || !particles) return;

  if (glow) glow.visible = false;
  wireframe.visible = true;
  particles.visible = true;

  restoreWireframeMaterials();
  setWireframeDissolveWeight(0);

  const mat = state.pyramidMats.particleCloud;
  if (mat) {
    mat.size = PARTICLE_START_SIZE;
    mat.opacity = 0;
  }
  setParticleRevealWeight(0);
  state.motionParticleGoldWeight = 0;
  applyMotionParticleColors(0);

  state.effectTransition = {
    active: true,
    kind: 'wireParticle',
    from: PYRAMID_EFFECT_MODES.WIREFRAME,
    to: PYRAMID_EFFECT_MODES.PARTICLES,
    startTime: state.clock.getElapsedTime(),
    duration: DURATION
  };

  setTransitionButtonBusy(true);
}

export function updateWireParticleTransition() {
  const tr = state.effectTransition;
  if (!tr?.active || tr.kind !== 'wireParticle' || !state.clock) return;

  const elapsed = state.clock.getElapsedTime() - tr.startTime;
  const progress = clamp01(elapsed / tr.duration);

  setWireframeDissolveWeight(progress);
  setParticleRevealWeight(progress);
  const revealProgress = clamp01((progress - TRANSFORM_START) / TRANSFORM_SPAN);
  applyMotionParticleColors(smootherstep(revealProgress));
  applyBloomForTransition(progress);

  if (progress >= 1) {
    finishTransition();
  }
}

export function setupWireParticleTransitionUI() {
  const btn = document.getElementById('effect-wire-particle-toggle-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    startWireParticleTransition();
  });
}
