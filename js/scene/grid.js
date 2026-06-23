/** 圆形地面网格：实体线框、Shader 渐显与裁剪重建 */
import { GRID, getGridRingRadii, syncGridDerivedSettings } from '../config/constants.js';
import { state } from '../state/appState.js';
import { clamp01, smootherstep } from '../utils/math.js';
import {
  clipSegmentExteriorXZ,
  getGridClipTriangle,
  rayTriangleExitDistanceXZ
} from '../utils/gridClip.js';
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
const EPS = 1e-5;

/** 返回网格应挂载的父级 */
function getGridParent() {
  return state.pyramidRootGroup ?? state.scene;
}

/** 创建实体网格线段的基础材质 */
function createGridMaterial() {
  return new THREE.MeshBasicMaterial({
    color: GRID.color,
    transparent: true,
    opacity: state.gridSettings.brightness,
    side: THREE.DoubleSide,
    depthWrite: false
  });
}

/** 在两点之间创建一条 Box 线段网格 */
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

/** 创建指定半径的完整圆环（由多段 Box 拼接） */
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

/** 创建从原点到指定角度的径向线段 */
function createRadialMesh(radius, angle, lineWidth, material) {
  const end = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  return createSegmentMesh(new THREE.Vector3(0, 0, 0), end, lineWidth, material);
}

/** 释放实体网格组及其几何体 */
function disposeGridGroup() {
  if (!state.gridGroup) return;

  state.gridGroup.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
  });
  state.gridGroup.parent?.remove(state.gridGroup);
  state.gridGroup = null;
}

/** 释放 Shader 渐显网格组及其几何体与材质 */
function disposeGridReveal() {
  if (!state.gridRevealGroup) return;

  state.gridRevealGroup.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  state.gridRevealGroup.parent?.remove(state.gridRevealGroup);
  state.gridRevealGroup = null;
  state.gridRevealMaterial = null;
}

/** 创建经三角裁剪后的圆环线段集合 */
function createClippedRingMeshes(radius, lineWidth, material, clipTriangle, segments = 96) {
  const meshes = [];
  const [v0, v1, v2] = clipTriangle;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const start = new THREE.Vector3(radius * Math.cos(a0), 0, radius * Math.sin(a0));
    const end = new THREE.Vector3(radius * Math.cos(a1), 0, radius * Math.sin(a1));
    const parts = clipSegmentExteriorXZ(start, end, v0, v1, v2);

    parts.forEach(([partStart, partEnd]) => {
      const segment = createSegmentMesh(partStart, partEnd, lineWidth, material);
      if (segment) meshes.push(segment);
    });
  }

  return meshes;
}

/** 创建经三角裁剪后的径向线段（止于三角形边界） */
function createClippedRadialMesh(maxRadius, angle, lineWidth, material, clipTriangle) {
  const [v0, v1, v2] = clipTriangle;
  const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const exitT = rayTriangleExitDistanceXZ(dir, v0, v1, v2);
  if (exitT >= maxRadius - EPS) return null;

  const start = dir.clone().multiplyScalar(exitT);
  const end = dir.clone().multiplyScalar(maxRadius);
  return createSegmentMesh(start, end, lineWidth, material);
}

/** 向组内添加同心圆环与径向线（可选三角裁剪） */
function buildGridMeshes(group, settings, clipTriangle = null) {
  const { maxRadius, radialCount, lineWidth } = settings;
  const material = state.gridMaterial;
  const ringRadii = getGridRingRadii(settings);

  ringRadii.forEach((radius) => {
    if (clipTriangle) {
      createClippedRingMeshes(radius, lineWidth, material, clipTriangle).forEach((mesh) => {
        group.add(mesh);
      });
    } else {
      group.add(createRingMesh(radius, lineWidth, material));
    }
  });

  for (let i = 0; i < radialCount; i++) {
    const angle = (i / radialCount) * Math.PI * 2;
    const radial = clipTriangle
      ? createClippedRadialMesh(maxRadius, angle, lineWidth, material, clipTriangle)
      : createRadialMesh(maxRadius, angle, lineWidth, material);
    if (radial) group.add(radial);
  }
}

/** 同步实体网格与 Shader 渐显网格的亮度等外观参数 */
export function applyGridAppearance() {
  if (!state.gridMaterial) return;
  state.gridMaterial.opacity = state.gridSettings.brightness;
  if (state.gridRevealMaterial) {
    syncGridRevealUniforms(state.gridRevealMaterial);
  }
}

/** 切换实体网格组的可见性 */
function setSolidGridVisible(visible) {
  if (state.gridGroup) state.gridGroup.visible = visible;
}

/** 创建 Shader 渐显平面网格并写入 state */
function createGridReveal(startAngle = 0) {
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
  getGridParent().add(group);

  state.gridRevealGroup = group;
  state.gridRevealMaterial = material;
}

/** 初始入场：隐藏实体网格并启动 Shader 渐显 */
export function beginGridRevealForInitial(startAngle) {
  setSolidGridVisible(false);
  if (state.gridMaterial) state.gridMaterial.opacity = 0;
  createGridReveal(startAngle);
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

/** 跳过 crossfade，直接完成渐显并显示实体网格 */
export function finishGridReveal() {
  disposeGridReveal();
  setSolidGridVisible(true);
  applyGridAppearance();
}

/** 按当前设置重建实体圆形网格（含三角裁剪） */
export function rebuildCircularGrid() {
  if (!state.scene) return;
  syncGridDerivedSettings(state.gridSettings);

  disposeGridGroup();

  if (!state.gridMaterial) {
    state.gridMaterial = createGridMaterial();
  }

  applyGridAppearance();

  const clipTriangle = getGridClipTriangle();
  const gridGroup = new THREE.Group();
  gridGroup.position.y = GRID.y;
  gridGroup.renderOrder = -1;
  buildGridMeshes(gridGroup, state.gridSettings, clipTriangle);
  getGridParent().add(gridGroup);
  state.gridGroup = gridGroup;
}

/** 初始化网格材质并首次构建圆形网格 */
export function createCircularGrid() {
  state.gridMaterial = createGridMaterial();
  rebuildCircularGrid();
}
