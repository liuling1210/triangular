import {
  BASE_BLOOM_STRENGTH,
  BASE_EMISSIVE,
  DEFAULT_PYRAMID_COLOR
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { applyPyramidColorAndBrightness } from '../ui/pyramidControls.js';
import { applyAxisMaterial } from '../ui/axisControls.js';
import { getFootEmissiveIntensity } from '../ui/footControls.js';
import {
  getEdgeFlowOpacity,
  getEdgeFlowOuterIntensity,
  getEdgeFlowInnerIntensity
} from '../ui/edgeFlowControls.js';
import {
  getMotionParticleOpacity,
  getMotionParticleVertexOpacity
} from '../utils/motionParticleSettings.js';
import { restoreGlowObjectVisibility } from './glowWireframeTransition.js';
import {
  beginGridRevealForInitial,
  finishGridReveal,
  getGridRevealStartAngle,
  updateGridRevealFromContour
} from '../scene/grid.js';

/** 底面外轮廓：1号 → 3号 → 2号 → 回到 1号 */
const CONTOUR_VERTEX_PATH = [[0, 2], [2, 1], [1, 0]];

const LINE_SAMPLE_COUNT = 72;
const REVEAL_LINE_OPACITY = 0.98;
const SETTLE_DURATION = 0.5;

/** 六幕时间轴（秒） */
const TIMELINE = {
  baseLines: { start: 0, duration: 2.0 },
  baseSolid: { start: 1.6, duration: 1.35 },
  shellEdges: { start: 2.4, duration: 1.4 },
  axis: { start: 3.2, duration: 1.0 },
  slices: { start: 4.1, duration: 1.8 },
  particles: { start: 5.6, duration: 1.5 }
};

const CONTOUR_SEGMENT_DURATION = 0.58;
const CONTOUR_SEGMENT_OVERLAP = 0.1;
const SLICE_LAYER_OFFSET = 0.2;
const SLICE_LAYER_DURATION = 0.85;

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

function phaseT(elapsed, phase) {
  return smootherstep(clamp01((elapsed - phase.start) / phase.duration));
}

function getTotalDuration() {
  return TIMELINE.particles.start + TIMELINE.particles.duration + SETTLE_DURATION;
}

export function getContourDrawProgress(elapsed, baseVerts = null) {
  const verts = baseVerts ?? state.pyramidBaseVerts;
  if (!verts?.length) return 0;

  let drawn = 0;
  let total = 0;

  for (let i = 0; i < CONTOUR_VERTEX_PATH.length; i++) {
    const [fromIdx, toIdx] = CONTOUR_VERTEX_PATH[i];
    const len = verts[fromIdx].distanceTo(verts[toIdx]);
    total += len;
    const segStart = i * (CONTOUR_SEGMENT_DURATION - CONTOUR_SEGMENT_OVERLAP);
    const segProg = smootherstep(clamp01((elapsed - segStart) / CONTOUR_SEGMENT_DURATION));
    drawn += len * segProg;
  }

  return total > 0 ? clamp01(drawn / total) : 0;
}

export function getContourEndTime() {
  const n = CONTOUR_VERTEX_PATH.length;
  return (n - 1) * (CONTOUR_SEGMENT_DURATION - CONTOUR_SEGMENT_OVERLAP) + CONTOUR_SEGMENT_DURATION;
}

function createProgressiveLine(start, end, material) {
  const points = [];
  for (let i = 0; i <= LINE_SAMPLE_COUNT; i++) {
    const t = i / LINE_SAMPLE_COUNT;
    points.push(
      new THREE.Vector3(
        lerp(start.x, end.x, t),
        lerp(start.y, end.y, t),
        lerp(start.z, end.z, t)
      )
    );
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  geo.setDrawRange(0, 0);
  const line = new THREE.Line(geo, material);
  line.frustumCulled = false;
  line.renderOrder = 12;
  return { line, geo, maxCount: points.length };
}

function setLineProgress(segment, progress) {
  const count = Math.max(2, Math.floor(progress * (segment.maxCount - 1)) + 1);
  segment.geo.setDrawRange(0, count);
}

function createRevealLineMaterial() {
  const color = new THREE.Color(state.pyramidColorHex || DEFAULT_PYRAMID_COLOR);
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
  });
}

function buildContourLines(baseVerts) {
  const lineMaterial = createRevealLineMaterial();
  const group = new THREE.Group();
  const segments = CONTOUR_VERTEX_PATH.map(([fromIdx, toIdx]) => {
    const segment = createProgressiveLine(baseVerts[fromIdx], baseVerts[toIdx], lineMaterial);
    group.add(segment.line);
    return segment;
  });
  return { group, segments, lineMaterial };
}

function hidePyramidContent() {
  const objects = state.glowObjects;
  const { glow, flow } = state.pyramidGroups;
  if (!objects || !glow) return;

  objects.meshes.forEach((mesh) => {
    mesh.visible = false;
  });
  objects.sliceEdgeLines.forEach((line) => {
    line.visible = false;
  });
  objects.sliceInnerEdgeLines.forEach((line) => {
    line.visible = false;
  });
  if (objects.edgeGlowTubes) objects.edgeGlowTubes.tubeGroup.visible = false;
  if (objects.vertexPoints) objects.vertexPoints.visible = false;
  if (objects.axisShaft) {
    objects.axisShaft.visible = false;
    objects.axisShaft.scale.y = 0.001;
  }
  objects.slicePlanes?.forEach((plane) => {
    plane.scale.set(0.92, 1, 0.92);
  });
  if (flow) flow.visible = false;
  glow.visible = true;

  const mats = state.pyramidMats;
  if (mats.base) {
    mats.base.opacity = 0;
    mats.base.emissiveIntensity = 0;
  }
  if (mats.solid) {
    mats.solid.opacity = 0;
    mats.solid.emissiveIntensity = 0;
  }
  if (mats.shell) {
    mats.shell.opacity = 0;
    mats.shell.emissiveIntensity = 0;
  }
  if (mats.axis) {
    mats.axis.opacity = 0;
    mats.axis.emissiveIntensity = 0;
  }
  mats.planes?.forEach((mat) => {
    mat.uniforms.uIntensity.value = 0;
    mat.uniforms.uRevealRadius.value = 0;
  });
  mats.sliceEdges?.forEach((mat) => {
    mat.opacity = 0;
  });
  mats.sliceInnerEdges?.forEach((mat) => {
    mat.opacity = 0;
  });
  if (mats.particles) mats.particles.opacity = 0;
  mats.edgeFlowOuter?.forEach((mat) => {
    mat.uniforms.uOpacity.value = 0;
    mat.uniforms.uIntensity.value = 0;
  });
  mats.edgeFlowInner?.forEach((mat) => {
    mat.uniforms.uOpacity.value = 0;
    mat.uniforms.uIntensity.value = 0;
  });
  if (mats.vertex) mats.vertex.opacity = 0;

}

function softReveal(t) {
  return smootherstep(smootherstep(clamp01(t)));
}

function applyPhysicalRevealSoft(mat, baseOpacity, emissiveScale, weight) {
  if (!mat) return;
  const w = clamp01(weight);
  const opacityW = softReveal(w);
  const glowW = softReveal(clamp01(w * 0.78 - 0.04));
  const isTranslucent = baseOpacity < 1;
  mat.transparent = opacityW < 0.999 || isTranslucent;
  mat.opacity = baseOpacity * opacityW;
  if (emissiveScale !== undefined) {
    mat.emissiveIntensity = emissiveScale * state.pyramidBrightness * glowW;
  }
}

function applyPhysicalReveal(mat, baseOpacity, emissiveScale, weight) {
  if (!mat) return;
  const w = clamp01(weight);
  const glowW = smootherstep(clamp01(w * 1.15 - 0.08));
  const isTranslucent = baseOpacity < 1;
  mat.transparent = w < 0.999 || isTranslucent;
  mat.opacity = baseOpacity * w;
  if (emissiveScale !== undefined) {
    mat.emissiveIntensity = emissiveScale * state.pyramidBrightness * glowW;
  }
}

function updateBaseLines(elapsed, reveal) {
  reveal.segments.forEach((segment, index) => {
    const segStart = index * (CONTOUR_SEGMENT_DURATION - CONTOUR_SEGMENT_OVERLAP);
    const progress = smootherstep(clamp01((elapsed - segStart) / CONTOUR_SEGMENT_DURATION));
    setLineProgress(segment, progress);
  });

  const contourProgress = getContourDrawProgress(elapsed, state.pyramidBaseVerts);
  reveal.contourProgress = contourProgress;
  let gridCrossfadeElapsed = null;
  if (contourProgress >= 0.999) {
    if (reveal.gridCrossfadeStart == null) {
      reveal.gridCrossfadeStart = elapsed;
    }
    gridCrossfadeElapsed = elapsed - reveal.gridCrossfadeStart;
  }
  updateGridRevealFromContour(contourProgress, gridCrossfadeElapsed);

  const lineFade = softReveal(clamp01((elapsed - TIMELINE.baseSolid.start) / TIMELINE.baseSolid.duration));
  const lineIn = smootherstep(clamp01(elapsed / 0.18));
  reveal.lineMaterial.opacity = REVEAL_LINE_OPACITY * lineIn * (1 - lineFade * 0.82);
}

function updateBaseSolid(elapsed, reveal) {
  const contourDone = (reveal?.contourProgress ?? 0) >= 0.999;
  const crossfadeReady =
    reveal?.gridCrossfadeStart != null &&
    elapsed - reveal.gridCrossfadeStart >= 0.35;
  if (!contourDone || !crossfadeReady) return;

  const t = clamp01((elapsed - TIMELINE.baseSolid.start) / TIMELINE.baseSolid.duration);
  const baseW = softReveal(t);
  const solidW = softReveal(clamp01((t - 0.2) / 0.8));

  const objects = state.glowObjects;
  const mats = state.pyramidMats;
  const baseMesh = objects.meshes[4];
  const bottomMesh = objects.meshes[0];

  if (baseMesh) baseMesh.visible = baseW > 0.008;
  if (bottomMesh) bottomMesh.visible = solidW > 0.008;
  applyPhysicalRevealSoft(mats.base, 1, getFootEmissiveIntensity(), baseW);
  applyPhysicalRevealSoft(mats.solid, 1, getFootEmissiveIntensity(), solidW);
}

function updateShellEdges(elapsed) {
  const w = phaseT(elapsed, TIMELINE.shellEdges);
  const edgeW = smootherstep(clamp01(w * 1.12 + 0.04));
  const shellW = smootherstep(clamp01(w * 0.95));

  const objects = state.glowObjects;
  const mats = state.pyramidMats;
  const shellMesh = objects.meshes[1];

  if (shellMesh) shellMesh.visible = shellW > 0.01;
  applyPhysicalReveal(mats.shell, 0.42, BASE_EMISSIVE.shell, shellW);

  if (objects.edgeGlowTubes) {
    objects.edgeGlowTubes.tubeGroup.visible = edgeW > 0.03;
  }
  mats.edgeFlowOuter?.forEach((mat, i) => {
    const stagger = smootherstep(clamp01(edgeW * 1.1 - i * 0.08));
    mat.uniforms.uOpacity.value = getEdgeFlowOpacity(stagger);
    mat.uniforms.uIntensity.value = getEdgeFlowOuterIntensity(stagger);
  });
  mats.edgeFlowInner?.forEach((mat, i) => {
    const stagger = smootherstep(clamp01(edgeW * 1.1 - i * 0.08));
    mat.uniforms.uOpacity.value = getEdgeFlowOpacity(stagger);
    mat.uniforms.uIntensity.value = getEdgeFlowInnerIntensity(stagger);
  });
}

function updateAxis(elapsed) {
  const w = phaseT(elapsed, TIMELINE.axis);
  const objects = state.glowObjects;
  const mats = state.pyramidMats;
  const axisShaft = objects.axisShaft;

  if (!axisShaft || !mats.axis) return;

  axisShaft.visible = w > 0.01;
  axisShaft.scale.y = Math.max(w, 0.001);

  const cylMesh = objects.meshes[5];
  const tipMesh = objects.meshes[6];
  if (cylMesh) cylMesh.visible = w > 0.01;
  if (tipMesh) tipMesh.visible = w > 0.01;

  const emissiveBump = w > 0.82 ? lerp(1, 1.06, smootherstep((w - 0.82) / 0.18)) : w / 0.82;
  mats.axis.transparent = w < 0.999;
  mats.axis.opacity = w;
  mats.axis.emissiveIntensity = state.axisSettings.emissiveIntensity * w * emissiveBump;
}

function updateSliceLayer(elapsed, sliceIndex) {
  const sliceStart = TIMELINE.slices.start + sliceIndex * SLICE_LAYER_OFFSET;
  const w = smootherstep(clamp01((elapsed - sliceStart) / SLICE_LAYER_DURATION));
  const edgeW = smootherstep(clamp01((elapsed - (sliceStart + 0.1)) / (SLICE_LAYER_DURATION * 0.85)));

  const objects = state.glowObjects;
  const mats = state.pyramidMats;
  const planeMesh = objects.slicePlanes?.[sliceIndex];
  const planeMat = mats.planes?.[sliceIndex];
  const edgeMat = mats.sliceEdges?.[sliceIndex];
  const innerMat = mats.sliceInnerEdges?.[sliceIndex];
  const edgeLine = objects.sliceEdgeLines?.[sliceIndex];
  const innerLine = objects.sliceInnerEdgeLines?.[sliceIndex];

  if (planeMesh) {
    planeMesh.visible = w > 0.01;
    const scale = lerp(0.92, 1, w);
    planeMesh.scale.set(scale, 1, scale);
  }
  if (planeMat) {
    planeMat.uniforms.uIntensity.value = w;
    planeMat.uniforms.uRevealRadius.value = w * 1.08;
  }
  if (edgeMat) edgeMat.opacity = 0.98 * edgeW;
  if (innerMat) innerMat.opacity = 0.72 * edgeW;
  if (edgeLine) edgeLine.visible = edgeW > 0.04;
  if (innerLine) innerLine.visible = edgeW > 0.04;
}

function updateSlices(elapsed) {
  updateSliceLayer(elapsed, 0);
  updateSliceLayer(elapsed, 1);
}

function updateParticles(elapsed) {
  const w = phaseT(elapsed, TIMELINE.particles);
  const vertexW = smootherstep(clamp01((elapsed - (TIMELINE.particles.start + 0.22)) / 1.28));
  const { flow } = state.pyramidGroups;
  const mats = state.pyramidMats;
  const objects = state.glowObjects;

  if (flow) flow.visible = w > 0.02;
  if (mats.particles) {
    const heightReveal = smootherstep(clamp01(w * 1.1));
    mats.particles.opacity = getMotionParticleOpacity() * heightReveal;
  }
  if (objects.vertexPoints) {
    objects.vertexPoints.visible = vertexW > 0.04;
  }
  if (mats.vertex) mats.vertex.opacity = getMotionParticleVertexOpacity() * vertexW;
}

function updateBloom(elapsed) {
  if (!state.bloomPass) return;
  const full = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
  const bloomT = smootherstep(clamp01(elapsed / TIMELINE.particles.start));
  state.bloomPass.strength = lerp(full * 0.65, full, bloomT);
}

function resetRevealState() {
  const objects = state.glowObjects;
  const mats = state.pyramidMats;

  if (objects?.axisShaft) {
    objects.axisShaft.scale.y = 1;
    objects.axisShaft.visible = true;
  }
  objects?.slicePlanes?.forEach((plane) => {
    plane.scale.set(1, 1, 1);
  });
  mats.planes?.forEach((mat) => {
    mat.uniforms.uRevealRadius.value = 1.2;
    mat.uniforms.uIntensity.value = 1;
  });
}

function finishInitialReveal(reveal) {
  if (reveal.group.parent) {
    reveal.group.parent.remove(reveal.group);
  }
  reveal.lineMaterial.dispose();
  reveal.segments.forEach((segment) => segment.geo.dispose());

  resetRevealState();
  finishGridReveal();
  restoreGlowObjectVisibility();
  if (state.pyramidGroups.flow) state.pyramidGroups.flow.visible = true;
  applyPyramidColorAndBrightness();
  applyAxisMaterial();

  if (state.bloomPass) {
    state.bloomPass.strength = BASE_BLOOM_STRENGTH * state.pyramidBrightness;
  }

  state.initialReveal = null;
  state.effectTransition = null;
}

export function startInitialReveal() {
  const baseVerts = state.pyramidBaseVerts;
  if (!baseVerts?.length || !state.clock) return;

  hidePyramidContent();

  const startAngle = getGridRevealStartAngle(state.pyramidBaseVerts);
  beginGridRevealForInitial(startAngle);

  const reveal = buildContourLines(baseVerts);
  state.scene.add(reveal.group);

  state.initialReveal = reveal;
  state.effectTransition = {
    active: true,
    kind: 'initialReveal',
    startTime: state.clock.getElapsedTime(),
    duration: getTotalDuration()
  };

  if (state.bloomPass) {
    state.bloomPass.strength = BASE_BLOOM_STRENGTH * state.pyramidBrightness * 0.65;
  }
}

export function updateInitialReveal() {
  const transition = state.effectTransition;
  const reveal = state.initialReveal;
  if (!transition?.active || transition.kind !== 'initialReveal' || !reveal || !state.clock) {
    return;
  }

  const elapsed = state.clock.getElapsedTime() - transition.startTime;

  updateBaseLines(elapsed, reveal);

  if (elapsed >= TIMELINE.baseSolid.start) {
    updateBaseSolid(elapsed, reveal);
  }
  if (elapsed >= TIMELINE.shellEdges.start) {
    updateShellEdges(elapsed);
  }
  if (elapsed >= TIMELINE.axis.start) {
    updateAxis(elapsed);
  }
  if (elapsed >= TIMELINE.slices.start) {
    updateSlices(elapsed);
  }
  if (elapsed >= TIMELINE.particles.start) {
    updateParticles(elapsed);
  }

  updateBloom(elapsed);

  if (elapsed >= transition.duration) {
    finishInitialReveal(reveal);
  }
}

export function isInitialRevealActive() {
  return Boolean(state.initialReveal && state.effectTransition?.kind === 'initialReveal');
}
