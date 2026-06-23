import {
  PYRAMID_EFFECT_MODES
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { getFullBloomStrength } from '../utils/viewAdaptation.js';
import {
  getEdgeFlowOpacity,
  getEdgeFlowOuterIntensity,
  getEdgeFlowInnerIntensity
} from '../ui/edgeFlowControls.js';
import { applyMotionParticleColors } from '../utils/motionParticleColors.js';
import { applyAxisRevealWeight } from '../ui/axisControls.js';
import { applyBaseCornerConeRevealWeight, resetBaseCornerConesReveal } from '../scene/baseCornerCones.js';
import { getFootEmissiveIntensity } from '../ui/footControls.js';
import { getShellEmissiveIntensity, getShellOpacity } from '../ui/shellControls.js';

const DURATION = 1.35;
const WIREFRAME_BLOOM_RATIO = 0.38;
const WIREFRAME_OPACITY = { shell: 0.92, edge: 0.98, slice: 0.85 };

const GLOW_LINE_HIDE_WIRE = 0.06;
const GLOW_MESH_HIDE = 0.015;
const GLOW_GROUP_HIDE = 0.006;

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

function glowFadeOut(progress) {
  return 1 - smootherstep(progress);
}

function wireFadeIn(progress, delay = 0.14, span = 0.86) {
  return smootherstep(clamp01((progress - delay) / span));
}

export function restoreGlowObjectVisibility() {
  const objects = state.glowObjects;
  const glow = state.pyramidGroups.glow;
  if (!objects || !glow) return;

  if (objects.edgeGlowTubes) objects.edgeGlowTubes.tubeGroup.visible = true;
  objects.sliceEdgeLines.forEach((line) => {
    line.visible = true;
  });
  objects.sliceInnerEdgeLines.forEach((line) => {
    line.visible = true;
  });
  objects.meshes.forEach((mesh) => {
    mesh.visible = true;
  });
  glow.visible = true;
  resetBaseCornerConesReveal();
}

function setGlowVisualWeight(w) {
  const mats = state.pyramidMats;
  const weight = clamp01(w);
  const fading = weight < 0.999;
  const brightness = state.pyramidBrightness;

  const applyPhysical = (mat, baseOpacity, emissiveScale) => {
    if (!mat) return;
    const isTranslucent = baseOpacity < 1;
    mat.transparent = fading || isTranslucent;
    mat.opacity = baseOpacity * weight;
    if (emissiveScale !== undefined) {
      mat.emissiveIntensity = emissiveScale * brightness * weight;
    }
  };

  applyPhysical(mats.solid, 1, getFootEmissiveIntensity());
  applyPhysical(mats.shell, getShellOpacity(), getShellEmissiveIntensity());
  applyPhysical(mats.base, 1, getFootEmissiveIntensity());
  applyAxisRevealWeight(weight, { opacityFade: true });
  applyBaseCornerConeRevealWeight(weight, { opacityFade: true });

  if (mats.planes) {
    mats.planes.forEach((mat) => {
      mat.uniforms.uIntensity.value = weight;
    });
  }
  if (mats.sliceEdges) {
    mats.sliceEdges.forEach((mat) => {
      mat.opacity = 0.98 * weight;
    });
  }
  if (mats.sliceInnerEdges) {
    mats.sliceInnerEdges.forEach((mat) => {
      mat.opacity = 0.72 * weight;
    });
  }
  mats.edgeFlowOuter?.forEach((mat) => {
    mat.uniforms.uOpacity.value = getEdgeFlowOpacity(weight);
    mat.uniforms.uIntensity.value = getEdgeFlowOuterIntensity(weight);
  });
  mats.edgeFlowInner?.forEach((mat) => {
    mat.uniforms.uOpacity.value = getEdgeFlowOpacity(weight);
    mat.uniforms.uIntensity.value = getEdgeFlowInnerIntensity(weight);
  });
}

function setWireframeVisualWeight(t) {
  const wireMats = state.pyramidMats.wireframe;
  if (!wireMats || wireMats.length < 3) return;

  const [shellMat, edgeMat, sliceMat] = wireMats;
  const gold = new THREE.Color(state.pyramidColorHex);
  const white = new THREE.Color(0xffffff);
  const sliceWhite = new THREE.Color(0xe8e8e8);

  const edgeT = wireFadeIn(t, 0.1, 0.9);
  const shellT = wireFadeIn(t, 0.18, 0.82);
  const sliceT = wireFadeIn(t, 0.26, 0.74);
  const overall = smootherstep(t);

  edgeMat.opacity = WIREFRAME_OPACITY.edge * edgeT;
  edgeMat.color.copy(gold).lerp(white, edgeT);

  shellMat.opacity = WIREFRAME_OPACITY.shell * shellT;
  shellMat.color.copy(gold).lerp(white, shellT);

  sliceMat.opacity = WIREFRAME_OPACITY.slice * sliceT;
  sliceMat.color.copy(gold).lerp(sliceWhite, sliceT);

  const scale = 0.985 + 0.015 * overall;
  state.pyramidGroups.wireframe.scale.setScalar(scale);
}

function applyBloomForTransition(progress) {
  if (!state.bloomPass) return;
  const fullBloom = getFullBloomStrength();
  const wireBloom = fullBloom * WIREFRAME_BLOOM_RATIO;
  state.bloomPass.strength = lerp(fullBloom, wireBloom, smootherstep(progress));
}

function syncGlowToWireVisibility(glowWeight, wireWeight) {
  const objects = state.glowObjects;
  const glow = state.pyramidGroups.glow;
  if (!objects || !glow) return;

  const hideGlowLines = wireWeight > GLOW_LINE_HIDE_WIRE;
  if (objects.edgeGlowTubes) objects.edgeGlowTubes.tubeGroup.visible = !hideGlowLines;
  objects.sliceEdgeLines.forEach((line) => {
    line.visible = !hideGlowLines;
  });
  objects.sliceInnerEdgeLines.forEach((line) => {
    line.visible = !hideGlowLines;
  });

  const showMeshes = glowWeight > GLOW_MESH_HIDE;
  objects.meshes.forEach((mesh) => {
    mesh.visible = showMeshes;
  });

  glow.visible = glowWeight > GLOW_GROUP_HIDE;
}

function finishTransition() {
  state.pyramidEffectMode = PYRAMID_EFFECT_MODES.WIREFRAME;
  state.effectTransition = null;
  state.motionParticleGoldWeight = 0;
  applyMotionParticleColors(0);

  const { glow, wireframe } = state.pyramidGroups;
  if (wireframe) wireframe.visible = true;
  if (glow) glow.visible = false;

  applyBloomForTransition(1);
}

export function isEffectTransitioning() {
  return Boolean(state.effectTransition?.active);
}

export function startGlowWireTransition() {
  if (isEffectTransitioning()) return;
  if (state.pyramidEffectMode !== PYRAMID_EFFECT_MODES.GLOW) return;

  const { glow, wireframe, particles } = state.pyramidGroups;
  if (!glow || !wireframe) return;

  particles.visible = false;
  glow.visible = true;
  wireframe.visible = true;
  restoreGlowObjectVisibility();
  setGlowVisualWeight(1);
  setWireframeVisualWeight(0);
  state.motionParticleGoldWeight = 1;
  applyMotionParticleColors(1);

  state.effectTransition = {
    active: true,
    kind: 'glowWire',
    from: PYRAMID_EFFECT_MODES.GLOW,
    to: PYRAMID_EFFECT_MODES.WIREFRAME,
    startTime: state.clock.getElapsedTime(),
    duration: DURATION
  };
}

export function updateGlowWireTransition() {
  const tr = state.effectTransition;
  if (!tr?.active || tr.kind !== 'glowWire' || !state.clock) return;

  const elapsed = state.clock.getElapsedTime() - tr.startTime;
  const progress = clamp01(elapsed / tr.duration);

  const glowWeight = glowFadeOut(progress);
  const wireWeight = wireFadeIn(progress);
  const goldWeight = 1 - wireFadeIn(progress, 0.1, 0.9);
  setGlowVisualWeight(glowWeight);
  setWireframeVisualWeight(wireWeight);
  applyMotionParticleColors(goldWeight);
  syncGlowToWireVisibility(glowWeight, wireWeight);
  applyBloomForTransition(progress);

  if (progress >= 1) {
    finishTransition();
  }
}
