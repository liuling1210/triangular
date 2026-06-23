import {
  DEFAULT_BASE_CORNER_CYLINDER_SETTINGS,
  RENDER_ORDER
} from '../config/constants.js';
import { state } from '../state/appState.js';

const OUTWARD_DIR = new THREE.Vector3();

function getCornerCylinderSettings() {
  return DEFAULT_BASE_CORNER_CYLINDER_SETTINGS;
}

function syncCornerCylinderSurfaceMaterial(mat) {
  const settings = getCornerCylinderSettings();
  const baseColor = new THREE.Color(settings.color);
  mat.color.copy(baseColor.clone().multiplyScalar(settings.colorBrightness));
  mat.emissive.copy(baseColor.clone().multiplyScalar(settings.emissiveStrength));
  mat.metalness = settings.metalness;
  mat.roughness = settings.roughness;
  mat.clearcoat = settings.clearcoat;
  mat.clearcoatRoughness = settings.clearcoatRoughness;
  mat.transmission = 0;
  mat.depthWrite = true;
  mat.depthTest = true;
  mat.needsUpdate = true;
}

function createCornerCylinderMaterial() {
  const settings = getCornerCylinderSettings();
  return new THREE.MeshPhysicalMaterial({
    color: settings.color,
    metalness: settings.metalness,
    roughness: settings.roughness,
    emissive: new THREE.Color(settings.color),
    emissiveIntensity: settings.emissiveIntensity,
    clearcoat: settings.clearcoat,
    clearcoatRoughness: settings.clearcoatRoughness,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide
  });
}

function computeCornerGroupPosition(baseVert, cornerIndex, settings) {
  OUTWARD_DIR.set(baseVert.x, 0, baseVert.z);
  if (OUTWARD_DIR.lengthSq() > 1e-8) {
    OUTWARD_DIR.normalize().multiplyScalar(settings.outwardOffset);
  } else {
    OUTWARD_DIR.set(0, 0, 0);
  }

  const tweak = settings.vertexOffsets[cornerIndex] ?? { x: 0, y: 0, z: 0 };
  return {
    x: baseVert.x + OUTWARD_DIR.x + tweak.x,
    y: settings.longitudinalOffset + tweak.y,
    z: baseVert.z + OUTWARD_DIR.z + tweak.z
  };
}

function getCornerCylinderLayouts(baseVerts) {
  const settings = getCornerCylinderSettings();
  return baseVerts.map((v, cornerIndex) => ({
    ...computeCornerGroupPosition(v, cornerIndex, settings),
    radius: settings.radius,
    height: settings.height
  }));
}

/** 线框模式：与渲染模式同位置的小圆柱线框 */
export function createBaseCornerConesWireframe(parent, baseVerts, edgeMat) {
  const settings = getCornerCylinderSettings();
  getCornerCylinderLayouts(baseVerts).forEach(({ x, y, z, radius, height }) => {
    const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 24);
    const wireGeo = new THREE.WireframeGeometry(cylGeo);
    const lines = new THREE.LineSegments(wireGeo, edgeMat);
    lines.position.set(x, y + height / 2, z);
    lines.renderOrder = RENDER_ORDER.baseCornerCone;
    parent.add(lines);
  });
}

function sampleCylinderVolume(cx, baseY, cz, radius, height, count, positions) {
  for (let i = 0; i < count; i++) {
    const y = baseY + Math.random() * height;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * radius;
    positions.push(cx + rad * Math.cos(angle), y, cz + rad * Math.sin(angle));
  }
}

/** 粒子模式：在三棱锥底角小圆柱体积内采样 */
export function sampleBaseCornerConeParticles(baseVerts, positions, countPerCone = 150) {
  getCornerCylinderLayouts(baseVerts).forEach(({ x, y, z, radius, height }) => {
    sampleCylinderVolume(x, y, z, radius, height, countPerCone, positions);
  });
}

/** 底角小圆柱粒子显影阈值（与中心柱类似，优先凝聚） */
export function computeCornerConeParticleReveal(x, y, z, baseVerts) {
  const layouts = getCornerCylinderLayouts(baseVerts);
  for (let i = 0; i < layouts.length; i++) {
    const { x: cx, y: baseY, z: cz, radius, height } = layouts[i];
    const dx = x - cx;
    const dz = z - cz;
    const r = Math.sqrt(dx * dx + dz * dz);
    if (y < baseY - 0.002 || y > baseY + height + 0.002) continue;
    if (r > radius * 1.6) continue;
    return 0.06 + Math.min(r / radius, 1) * 0.14;
  }
  return null;
}

/**
 * 在三棱锥三个底角各放置一个小圆柱，与中心柱分离渲染。
 */
export function createBaseCornerCones(glowGroup, baseVerts) {
  const settings = getCornerCylinderSettings();
  const mat = createCornerCylinderMaterial();
  state.pyramidMats.baseCornerCones = mat;

  const group = new THREE.Group();
  const corners = [];

  baseVerts.forEach((v, cornerIndex) => {
    const cornerGroup = new THREE.Group();
    const pos = computeCornerGroupPosition(v, cornerIndex, settings);
    cornerGroup.position.set(pos.x, pos.y, pos.z);

    const cylGeo = new THREE.CylinderGeometry(
      settings.radius,
      settings.radius,
      settings.height,
      32
    );
    const cylMesh = new THREE.Mesh(cylGeo, mat);
    cylMesh.position.y = settings.height / 2;
    cylMesh.renderOrder = RENDER_ORDER.baseCornerCone;
    cornerGroup.add(cylMesh);

    group.add(cornerGroup);
    corners.push({ group: cornerGroup, mesh: cylMesh });
  });

  glowGroup.add(group);
  return { group, corners, material: mat };
}

export function getBaseCornerConeEmissiveIntensity() {
  return getCornerCylinderSettings().emissiveIntensity * state.pyramidBrightness;
}

/** 材质渐显/淡出，与中心柱 applyAxisRevealWeight 用法一致 */
export function applyBaseCornerConeRevealWeight(revealWeight, { opacityFade = false } = {}) {
  const mat = state.pyramidMats.baseCornerCones;
  if (!mat) return;

  const w = Math.max(0, Math.min(1, revealWeight));

  if (w <= 0) {
    syncCornerCylinderSurfaceMaterial(mat);
    mat.transparent = true;
    mat.opacity = 0;
    mat.emissiveIntensity = 0;
    return;
  }

  syncCornerCylinderSurfaceMaterial(mat);
  mat.emissiveIntensity = getBaseCornerConeEmissiveIntensity();

  if (opacityFade && w < 1) {
    mat.transparent = true;
    mat.opacity = w;
  } else {
    mat.transparent = false;
    mat.opacity = 1;
  }
}

/** 与中心柱同步：同一权重控制可见性与 Y 轴生长 */
export function syncBaseCornerConesWithAxis(weight) {
  const markers = state.glowObjects?.baseCornerCones;
  if (!markers) return;

  const w = Math.max(weight, 0.001);
  const visible = weight > 0.01;

  markers.group.visible = visible;
  markers.corners.forEach(({ group, mesh }) => {
    group.visible = visible;
    group.scale.y = w;
    if (mesh) mesh.visible = visible;
  });

  applyBaseCornerConeRevealWeight(visible ? 1 : 0, { opacityFade: false });
}

export function resetBaseCornerConesReveal() {
  const markers = state.glowObjects?.baseCornerCones;
  if (!markers) return;

  markers.group.visible = true;
  markers.corners.forEach(({ group, mesh }) => {
    group.visible = true;
    group.scale.y = 1;
    if (mesh) mesh.visible = true;
  });
  applyBaseCornerConeRevealWeight(1, { opacityFade: false });
}

export function hideBaseCornerConesForReveal() {
  const markers = state.glowObjects?.baseCornerCones;
  if (!markers) return;

  markers.group.visible = false;
  markers.corners.forEach(({ group }) => {
    group.visible = false;
    group.scale.y = 0.001;
  });
  applyBaseCornerConeRevealWeight(0);
}
