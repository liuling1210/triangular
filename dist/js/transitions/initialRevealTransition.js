import {
  REVEAL_CONTOUR_LINE_COLOR,
  REVEAL_CONTOUR_LINE_WIDTH
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { applyPyramidColorAndBrightness } from '../ui/pyramidControls.js';
import { applyAxisMaterial, applyAxisRevealWeight } from '../ui/axisControls.js';
import { getFootEmissiveIntensityForReveal } from '../utils/viewAdaptation.js';
import { getShellEmissiveIntensity, getShellOpacity } from '../ui/shellControls.js';
import {
  getEdgeFlowOpacity,
  getEdgeFlowOuterIntensity,
  getEdgeFlowInnerIntensity
} from '../ui/edgeFlowControls.js';
import {
  getMotionParticleOpacity
} from '../utils/motionParticleSettings.js';
import { restoreGlowObjectVisibility } from './glowWireframeTransition.js';
import { flyCameraToFrontView } from '../ui/cameraViewControls.js';
import { setPyramidAutoRotate } from '../ui/pyramidAutoRotateControls.js';
import {
  beginGridRevealForInitial,
  finishGridReveal,
  getGridRevealStartAngle,
  updateGridRevealFromContour,
  updateGridRevealInner
} from '../scene/grid.js';
import {
  hideAllStrategicLabels,
  showAllStrategicLabels,
  updateStrategicLabelReveal
} from '../scene/strategicLabels.js';
import {
  hideBaseCornerConesForReveal,
  resetBaseCornerConesReveal,
  syncBaseCornerConesWithAxis
} from '../scene/baseCornerCones.js';

/** 底面外轮廓：1号 → 3号 → 2号 → 回到 1号 */
const CONTOUR_VERTEX_PATH = [[0, 2], [2, 1], [1, 0]];

const LINE_SAMPLE_COUNT = 72;
const REVEAL_LINE_OPACITY = 0.98;
const SETTLE_DURATION = 0.5;
const CONTOUR_SEGMENT_AXIS = new THREE.Vector3(0, 0, 1);

const CONTOUR_SEGMENT_DURATION = 0.58;
const CONTOUR_SEGMENT_OVERLAP = 0.1;

function contourEndTime() {
  const n = CONTOUR_VERTEX_PATH.length;
  return (n - 1) * (CONTOUR_SEGMENT_DURATION - CONTOUR_SEGMENT_OVERLAP) + CONTOUR_SEGMENT_DURATION;
}

/** 轮廓闭合后立即底面渐变 → 完成后相机切正视 → 外壳/网格… */
const BASE_SOLID_DURATION = 1.25;
const CAMERA_FLY_DURATION = 1.2;
const SHELL_GRID_DURATION = 1.4;
const AXIS_DURATION = 1.0;
const SLICES_DURATION = 1.8;
const PARTICLES_DURATION = 1.5;

const REVEAL_DURATIONS = {
  baseSolid: BASE_SOLID_DURATION,
  cameraFly: CAMERA_FLY_DURATION,
  shellEdges: SHELL_GRID_DURATION,
  gridInner: SHELL_GRID_DURATION,
  axis: AXIS_DURATION,
  slices: SLICES_DURATION,
  particles: PARTICLES_DURATION
};

function buildEffectiveTimeline(reveal) {
  const baseStart = reveal?.baseSolidStartTime;
  if (baseStart == null) {
    return null;
  }

  const cameraStart = baseStart + BASE_SOLID_DURATION;
  const shellStart = cameraStart + CAMERA_FLY_DURATION;
  const shellEnd = shellStart + SHELL_GRID_DURATION;
  const axisStart = shellEnd;
  const axisEnd = axisStart + AXIS_DURATION;
  const slicesStart = axisEnd;
  const slicesEnd = slicesStart + SLICES_DURATION;
  const particlesStart = slicesEnd;

  return {
    baseSolid: { start: baseStart, duration: BASE_SOLID_DURATION },
    cameraFly: { start: cameraStart, duration: CAMERA_FLY_DURATION },
    baseLabel: { start: cameraStart + CAMERA_FLY_DURATION, duration: BASE_SOLID_DURATION },
    shellEdges: { start: shellStart, duration: SHELL_GRID_DURATION },
    gridInner: { start: shellStart, duration: SHELL_GRID_DURATION },
    axis: { start: axisStart, duration: AXIS_DURATION },
    slices: { start: slicesStart, duration: SLICES_DURATION },
    particles: { start: particlesStart, duration: PARTICLES_DURATION },
    apexLabel: { start: particlesStart, duration: SLICES_DURATION }
  };
}

export { REVEAL_DURATIONS as REVEAL_TIMELINE };
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
  return (
    contourEndTime() +
    BASE_SOLID_DURATION +
    CAMERA_FLY_DURATION +
    SHELL_GRID_DURATION +
    AXIS_DURATION +
    SLICES_DURATION +
    PARTICLES_DURATION +
    SETTLE_DURATION
  );
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
  return contourEndTime();
}

function createContourSegmentMesh(start, end, lineWidth, material) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  if (length < 1e-6) return null;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(lineWidth, lineWidth * 0.25, length),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(CONTOUR_SEGMENT_AXIS, dir.normalize());
  mesh.frustumCulled = false;
  mesh.renderOrder = 12;
  return mesh;
}

function createProgressiveContourSegment(start, end, material, lineWidth) {
  const chunks = [];
  const segmentGroup = new THREE.Group();

  for (let i = 0; i < LINE_SAMPLE_COUNT; i++) {
    const t0 = i / LINE_SAMPLE_COUNT;
    const t1 = (i + 1) / LINE_SAMPLE_COUNT;
    const p0 = new THREE.Vector3(
      lerp(start.x, end.x, t0),
      lerp(start.y, end.y, t0),
      lerp(start.z, end.z, t0)
    );
    const p1 = new THREE.Vector3(
      lerp(start.x, end.x, t1),
      lerp(start.y, end.y, t1),
      lerp(start.z, end.z, t1)
    );
    const mesh = createContourSegmentMesh(p0, p1, lineWidth, material);
    if (!mesh) continue;
    mesh.visible = false;
    segmentGroup.add(mesh);
    chunks.push(mesh);
  }

  return { group: segmentGroup, chunks, maxCount: chunks.length };
}

function setLineProgress(segment, progress) {
  const count = Math.max(1, Math.floor(progress * segment.maxCount));
  segment.chunks.forEach((mesh, index) => {
    mesh.visible = index < count;
  });
}

function createRevealLineMaterial() {
  return new THREE.MeshBasicMaterial({
    color: REVEAL_CONTOUR_LINE_COLOR,
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
    const segment = createProgressiveContourSegment(
      baseVerts[fromIdx],
      baseVerts[toIdx],
      lineMaterial,
      REVEAL_CONTOUR_LINE_WIDTH
    );
    group.add(segment.group);
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
  if (objects.axisShaft) {
    objects.axisShaft.visible = false;
    objects.axisShaft.scale.y = 0.001;
  }
  hideBaseCornerConesForReveal();
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
    applyAxisRevealWeight(0);
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

  hideAllStrategicLabels();
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
  updateGridRevealFromContour(contourProgress);

  if (contourProgress >= 0.999 && reveal.baseSolidStartTime == null) {
    reveal.baseSolidStartTime = elapsed;
  }

  const baseStart = reveal.baseSolidStartTime;
  let lineFadeOut = 0;
  if (baseStart != null) {
    const t = clamp01((elapsed - baseStart) / BASE_SOLID_DURATION);
    lineFadeOut = softReveal(t);
  }
  const lineIn = smootherstep(clamp01(elapsed / 0.18));
  reveal.lineMaterial.opacity = REVEAL_LINE_OPACITY * lineIn * (1 - lineFadeOut);
  if (reveal.group) {
    reveal.group.visible = lineFadeOut < 0.999;
  }
}

function updateBaseSolid(elapsed, reveal) {
  const baseStart = reveal.baseSolidStartTime;
  if (baseStart == null) return;

  const t = clamp01((elapsed - baseStart) / BASE_SOLID_DURATION);
  const baseW = softReveal(t);
  const solidW = softReveal(clamp01((t - 0.2) / 0.8));

  const objects = state.glowObjects;
  const mats = state.pyramidMats;
  const bottomCap = objects.solidBottomCap;
  const topCap = objects.solidTopCap;
  const bottomMesh = objects.solidFrustum;

  if (bottomCap) bottomCap.visible = baseW > 0.008;
  if (topCap) topCap.visible = baseW > 0.008;
  if (bottomMesh) bottomMesh.visible = solidW > 0.008;

  applyPhysicalRevealSoft(mats.base, 1, getFootEmissiveIntensityForReveal(), baseW);
  applyPhysicalRevealSoft(mats.solid, 1, getFootEmissiveIntensityForReveal(), solidW);
}

function updateShellEdges(elapsed, timeline) {
  const w = phaseT(elapsed, timeline.shellEdges);
  const edgeW = smootherstep(clamp01(w * 1.12 + 0.04));
  const shellW = smootherstep(clamp01(w * 0.95));

  const objects = state.glowObjects;
  const mats = state.pyramidMats;
  const shellMesh = objects.meshes[3];

  if (shellMesh) shellMesh.visible = shellW > 0.01;
  applyPhysicalReveal(mats.shell, getShellOpacity(), getShellEmissiveIntensity(), shellW);

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

function updateAxis(elapsed, timeline) {
  const w = phaseT(elapsed, timeline.axis);
  const objects = state.glowObjects;
  const axisShaft = objects.axisShaft;

  if (!axisShaft || !state.pyramidMats.axis) return;

  axisShaft.visible = w > 0.01;
  axisShaft.scale.y = Math.max(w, 0.001);

  const cylMesh = objects.meshes[6];
  const tipMesh = objects.meshes[7];
  if (cylMesh) cylMesh.visible = w > 0.01;
  if (tipMesh) tipMesh.visible = w > 0.01;

  if (w > 0.01 && state.initialReveal) {
    state.initialReveal.pastAxisPhase = true;
  }

  applyAxisRevealWeight(w > 0.01 ? 1 : 0, { opacityFade: false });
  syncBaseCornerConesWithAxis(w);
}

function updateSliceLayer(elapsed, sliceIndex, timeline) {
  const sliceStart = timeline.slices.start + sliceIndex * SLICE_LAYER_OFFSET;
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

function updateGridInner(elapsed, reveal, timeline) {
  const innerT = smootherstep(
    clamp01((elapsed - timeline.gridInner.start) / timeline.gridInner.duration)
  );
  let gridCrossfadeElapsed = null;
  if (innerT >= 0.999) {
    if (reveal.gridCrossfadeStart == null) {
      reveal.gridCrossfadeStart = elapsed;
    }
    gridCrossfadeElapsed = elapsed - reveal.gridCrossfadeStart;
  }
  updateGridRevealInner(innerT, gridCrossfadeElapsed);
}

function updateSlices(elapsed, timeline) {
  updateSliceLayer(elapsed, 0, timeline);
  updateSliceLayer(elapsed, 1, timeline);
}

function updateParticles(elapsed, timeline) {
  const w = phaseT(elapsed, timeline.particles);
  const { flow } = state.pyramidGroups;
  const mats = state.pyramidMats;

  if (flow) flow.visible = w > 0.02;
  if (mats.particles) {
    const heightReveal = smootherstep(clamp01(w * 1.1));
    mats.particles.opacity = getMotionParticleOpacity() * heightReveal;
  }
}


function resetRevealState() {
  const objects = state.glowObjects;
  const mats = state.pyramidMats;

  if (objects?.axisShaft) {
    objects.axisShaft.scale.y = 1;
    objects.axisShaft.visible = true;
  }
  resetBaseCornerConesReveal();
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
  reveal.segments.forEach((segment) => {
    segment.chunks.forEach((mesh) => mesh.geometry.dispose());
  });

  resetRevealState();
  finishGridReveal();
  restoreGlowObjectVisibility();
  if (state.pyramidGroups.flow) state.pyramidGroups.flow.visible = true;
  applyPyramidColorAndBrightness();
  applyAxisMaterial();

  showAllStrategicLabels();

  state.initialReveal = null;
}

export function startInitialReveal() {
  const baseVerts = state.pyramidBaseVerts;
  if (!baseVerts?.length || !state.clock) return;

  hidePyramidContent();

  const startAngle = getGridRevealStartAngle(state.pyramidBaseVerts);
  beginGridRevealForInitial(startAngle);

  const reveal = buildContourLines(baseVerts);
  state.scene.add(reveal.group);

  reveal.startTime = state.clock.getElapsedTime();
  reveal.duration = getTotalDuration();
  reveal.autoRotateStarted = false;
  state.initialReveal = reveal;
}

function updateInitialRevealCamera(elapsed, reveal, timeline) {
  if (!timeline || elapsed < timeline.cameraFly.start || reveal.cameraFlyStarted) return;
  reveal.cameraFlyStarted = true;
  flyCameraToFrontView();
}

function maybeStartAutoRotateAfterSlices(elapsed, timeline, reveal) {
  if (reveal.autoRotateStarted || !timeline || elapsed < timeline.particles.start) return;
  reveal.autoRotateStarted = true;
  setPyramidAutoRotate(true);
}

export function updateInitialReveal() {
  const reveal = state.initialReveal;
  if (!reveal || !state.clock) {
    return;
  }

  const elapsed = state.clock.getElapsedTime() - reveal.startTime;

  updateBaseLines(elapsed, reveal);
  updateBaseSolid(elapsed, reveal);

  const timeline = buildEffectiveTimeline(reveal);
  if (timeline) {
    updateInitialRevealCamera(elapsed, reveal, timeline);
    if (elapsed >= timeline.shellEdges.start) {
      updateShellEdges(elapsed, timeline);
    }
    if (elapsed >= timeline.gridInner.start) {
      updateGridInner(elapsed, reveal, timeline);
    }
    if (elapsed >= timeline.axis.start) {
      updateAxis(elapsed, timeline);
    }
    if (elapsed >= timeline.slices.start) {
      updateSlices(elapsed, timeline);
    }
    if (elapsed >= timeline.particles.start) {
      maybeStartAutoRotateAfterSlices(elapsed, timeline, reveal);
      updateParticles(elapsed, timeline);
    }
    updateStrategicLabelReveal(elapsed, timeline);
  }

  if (elapsed >= reveal.duration) {
    finishInitialReveal(reveal);
  }
}

export function isInitialRevealActive() {
  return Boolean(state.initialReveal);
}

export function isInitialRevealPastSlices() {
  if (!state.initialReveal) return true;
  if (!state.clock || state.initialReveal.startTime == null) return false;

  const elapsed = state.clock.getElapsedTime() - state.initialReveal.startTime;
  const timeline = buildEffectiveTimeline(state.initialReveal);
  if (!timeline) return false;
  return elapsed >= timeline.particles.start;
}
