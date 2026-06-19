import { GRID, getGridRingRadii, syncGridDerivedSettings } from '../config/constants.js';
import { state } from '../state/appState.js';
import {
  createGridRevealMaterial,
  getGridRevealStartAngle,
  setGridRevealFade,
  setGridRevealInnerRadius,
  setGridRevealOuterSweep,
  syncGridRevealUniforms
} from '../materials/gridRevealMaterial.js';

export { getGridRevealStartAngle };

const GRID_REVEAL_CROSSFADE = 0.45;
const SEGMENT_AXIS = new THREE.Vector3(0, 0, 1);

function createGridMaterial() {
  return new THREE.MeshBasicMaterial({
    color: GRID.color,
    transparent: true,
    opacity: state.gridSettings.brightness,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

function createSegmentMesh(start, end, lineWidth, material) {
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  if (length < 1e-6) return null;

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(lineWidth, lineWidth * 0.25, length),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(SEGMENT_AXIS, dir.normalize());
  return mesh;
}

function createRingMesh(radius, lineWidth, material, segments = 96) {
  const group = new THREE.Group();

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const start = new THREE.Vector3(radius * Math.cos(a0), 0, radius * Math.sin(a0));
    const end = new THREE.Vector3(radius * Math.cos(a1), 0, radius * Math.sin(a1));
    const segment = createSegmentMesh(start, end, lineWidth, material);
    if (segment) group.add(segment);
  }

  return group;
}

function createRadialMesh(radius, angle, lineWidth, material) {
  const end = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  return createSegmentMesh(new THREE.Vector3(0, 0, 0), end, lineWidth, material);
}

function disposeGridGroup() {
  if (!state.gridGroup) return;

  state.gridGroup.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
  });
  state.scene.remove(state.gridGroup);
  state.gridGroup = null;
}

function disposeGridReveal() {
  if (!state.gridRevealGroup) return;

  state.gridRevealGroup.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  state.scene.remove(state.gridRevealGroup);
  state.gridRevealGroup = null;
  state.gridRevealMaterial = null;
}

function buildGridMeshes(group, settings) {
  const { maxRadius, radialCount, lineWidth } = settings;
  const material = state.gridMaterial;
  const ringRadii = getGridRingRadii(settings);

  ringRadii.forEach((radius) => {
    group.add(createRingMesh(radius, lineWidth, material));
  });

  for (let i = 0; i < radialCount; i++) {
    const angle = (i / radialCount) * Math.PI * 2;
    const radial = createRadialMesh(maxRadius, angle, lineWidth, material);
    if (radial) group.add(radial);
  }
}

export function applyGridAppearance() {
  if (!state.gridMaterial) return;
  state.gridMaterial.opacity = state.gridSettings.brightness;
  if (state.gridRevealMaterial) {
    syncGridRevealUniforms(state.gridRevealMaterial);
  }
}

export function setSolidGridVisible(visible) {
  if (state.gridGroup) state.gridGroup.visible = visible;
}

export function createGridReveal(startAngle = 0) {
  disposeGridReveal();
  syncGridDerivedSettings(state.gridSettings);

  const size = state.gridSettings.maxRadius * 2.4;
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  geometry.rotateX(-Math.PI / 2);

  const material = createGridRevealMaterial(startAngle);
  syncGridRevealUniforms(material);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;

  const group = new THREE.Group();
  group.position.y = GRID.y;
  group.add(mesh);
  state.scene.add(group);

  state.gridRevealGroup = group;
  state.gridRevealMaterial = material;
}

export function beginGridRevealForInitial(startAngle) {
  setSolidGridVisible(false);
  if (state.gridMaterial) state.gridMaterial.opacity = 0;
  createGridReveal(startAngle);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function smootherstep(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 阶段 A：最外圈随轮廓角度扫出 */
export function updateGridRevealFromContour(contourProgress) {
  const material = state.gridRevealMaterial;
  if (!material) return;
  setGridRevealOuterSweep(material, clamp01(contourProgress));
}

/** 阶段 B：内部网格由内向外；完成后 crossfade 到实体网格 */
export function updateGridRevealInner(innerProgress, crossfadeElapsed = null) {
  const material = state.gridRevealMaterial;
  if (!material) return;

  setGridRevealInnerRadius(material, innerProgress);

  if (innerProgress < 0.999 || crossfadeElapsed == null) {
    return;
  }

  const fadeT = smootherstep(Math.min(crossfadeElapsed / GRID_REVEAL_CROSSFADE, 1));
  setSolidGridVisible(true);
  setGridRevealFade(material, 1 - fadeT, fadeT);

  if (fadeT >= 0.999) {
    disposeGridReveal();
    applyGridAppearance();
  }
}

export function finishGridReveal() {
  disposeGridReveal();
  setSolidGridVisible(true);
  applyGridAppearance();
}

export function rebuildCircularGrid() {
  if (!state.scene) return;
  syncGridDerivedSettings(state.gridSettings);

  disposeGridGroup();

  if (!state.gridMaterial) {
    state.gridMaterial = createGridMaterial();
  }

  applyGridAppearance();

  const gridGroup = new THREE.Group();
  gridGroup.position.y = GRID.y;
  gridGroup.renderOrder = -1;
  buildGridMeshes(gridGroup, state.gridSettings);
  state.scene.add(gridGroup);
  state.gridGroup = gridGroup;
}

export function createCircularGrid() {
  state.gridMaterial = createGridMaterial();
  rebuildCircularGrid();
}
