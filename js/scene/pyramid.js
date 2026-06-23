/** 三棱锥主场景：实体壳体、切片、轴、边流与内部运动粒子 */
import {
  DEFAULT_PYRAMID_COLOR,
  DEFAULT_AXIS_SETTINGS,
  DEFAULT_SHELL_SETTINGS,
  BASE_EMISSIVE,
  RENDER_ORDER,
  DEFAULT_MOTION_PARTICLE_SETTINGS,
  MOTION_PARTICLE_BASE_COUNTS,
  R,
  H,
  SHAFT_RADIUS,
  SHAFT_CYL_HEIGHT,
  SHAFT_TIP_HEIGHT,
  SOLID_BOTTOM_HEIGHT,
  SOLID_CAP_HEIGHT
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { createGlowTexture } from '../utils/color.js';
import {
  createPyramidConeGeo,
  extractPyramidKeyPoints,
  getSliceVertices,
  radiusAtHeight,
  createTriangleGeo,
  getTriangleCentroid,
  getTriangleMaxRadius,
  sampleTriangle,
  clipInnerEdgeStart
} from '../utils/geometry.js';
import { createGradientSliceMaterial } from '../materials/sliceMaterial.js';
import { createAxisPhysicalMaterial } from '../materials/axisMaterial.js';
import { createWireframePyramid } from './wireframePyramid.js';
import { createParticlePyramid } from './particlePyramid.js';
import { createEdgeGlowTubes } from './edgeGlowTubes.js';
import { createBaseCornerCones } from './baseCornerCones.js';
import { createStrategicLabels } from './strategicLabels.js';
import { getMotionParticleRiseSpeed, getMotionParticleCountMultiplier } from '../utils/motionParticleSettings.js';

/** 将粒子位置编码为极角、归一化半径与相位，供上升动画使用 */
function encodeParticleStream(x, y, z, phase) {
  const angle = Math.atan2(z, x);
  const r = Math.sqrt(x * x + z * z);
  const maxR = Math.max(radiusAtHeight(y) * 0.85, 0.001);
  return { angle, radialNorm: Math.min(r / maxR, 1), phase };
}

/** 按倍率缩放粒子基准数量并保证至少为 1 */
function scaleParticleCount(base, multiplier) {
  return Math.max(1, Math.round(base * multiplier));
}

/** 在 flow 组内创建内部上升运动粒子云 */
function createInternalParticles(group, apex, baseVerts, sliceHeights, countMultiplier = 1) {
  const counts = MOTION_PARTICLE_BASE_COUNTS;
  const particles = [];
  const streams = [];

  /** 追加单个粒子坐标及其流编码 */
  function addParticle(x, y, z) {
    particles.push(x, y, z);
    streams.push(encodeParticleStream(x, y, z, Math.random()));
  }

  for (let i = 0; i < scaleParticleCount(counts.volume, countMultiplier); i++) {
    const y = Math.random() * H * 0.95;
    const maxR = radiusAtHeight(y) * 0.85;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * maxR;
    addParticle(rad * Math.cos(angle), y, rad * Math.sin(angle));
  }

  for (let i = 0; i < scaleParticleCount(counts.core, countMultiplier); i++) {
    const y = Math.random() * H * 0.98;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * 0.35;
    addParticle(rad * Math.cos(angle), y, rad * Math.sin(angle));
  }

  sliceHeights.forEach((y) => {
    const sv = getSliceVertices(baseVerts, y);
    const batch = [];
    sampleTriangle(sv[0], sv[1], sv[2], scaleParticleCount(counts.slice, countMultiplier), batch);
    for (let i = 0; i < batch.length; i += 3) {
      addParticle(batch[i], batch[i + 1], batch[i + 2]);
    }
  });

  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    const batch = [];
    sampleTriangle(apex, baseVerts[i], baseVerts[next], scaleParticleCount(counts.face, countMultiplier), batch);
    for (let j = 0; j < batch.length; j += 3) {
      addParticle(batch[j], batch[j + 1], batch[j + 2]);
    }
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(streams.length * 3), 3));
  state.internalParticleGeo = pGeo;
  state.internalParticleStreams = streams;

  let pMat = state.pyramidMats.particles;
  if (!pMat) {
    pMat = new THREE.PointsMaterial({
      color: DEFAULT_PYRAMID_COLOR,
      size: DEFAULT_MOTION_PARTICLE_SETTINGS.internalSize,
      map: createGlowTexture(DEFAULT_PYRAMID_COLOR, false),
      transparent: true,
      opacity: DEFAULT_MOTION_PARTICLE_SETTINGS.opacity,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
    state.pyramidMats.particles = pMat;
  }

  const internalPoints = new THREE.Points(pGeo, pMat);
  internalPoints.renderOrder = RENDER_ORDER.particles;
  group.add(internalPoints);
  return internalPoints;
}

/** 按当前数量倍率重建内部运动粒子云 */
export function rebuildInternalParticles() {
  const flowGroup = state.pyramidGroups.flow;
  if (!flowGroup || !state.pyramidApex || !state.pyramidBaseVerts) return;

  const existing = state.glowObjects.internalPoints;
  if (existing) {
    flowGroup.remove(existing);
    existing.geometry.dispose();
  }

  state.internalParticleGeo = null;
  state.internalParticleStreams = [];

  const sliceHeights = state.pyramidSliceHeights ?? [H / 3, (2 * H) / 3];
  state.glowObjects.internalPoints = createInternalParticles(
    flowGroup,
    state.pyramidApex,
    state.pyramidBaseVerts,
    sliceHeights,
    getMotionParticleCountMultiplier()
  );
}

/** 构建完整三棱锥场景（实体、切片、轴、边流、线框与粒子组） */
export function createPyramid() {
  const pyramidRoot = new THREE.Group();
  state.pyramidRootGroup = pyramidRoot;

  const glowGroup = new THREE.Group();
  const wireframeGroup = new THREE.Group();
  const particleGroup = new THREE.Group();
  const flowGroup = new THREE.Group();
  state.pyramidGroups = { glow: glowGroup, wireframe: wireframeGroup, particles: particleGroup, flow: flowGroup };
  state.glowObjects = {
    edgeGlowTubes: null,
    internalPoints: null,
    axisShaft: null,
    baseCornerCones: null,
    solidFrustum: null,
    solidBottomCap: null,
    solidTopCap: null,
    slicePlanes: [],
    sliceEdgeLines: [],
    sliceInnerEdgeLines: [],
    meshes: []
  };

  pyramidRoot.add(glowGroup);
  pyramidRoot.add(wireframeGroup);
  pyramidRoot.add(particleGroup);
  pyramidRoot.add(flowGroup);
  state.scene.add(pyramidRoot);
  wireframeGroup.visible = false;
  particleGroup.visible = false;
  flowGroup.visible = true;

  const coneGeo = createPyramidConeGeo();
  const { apex, baseVerts } = extractPyramidKeyPoints(coneGeo);
  state.pyramidApex = apex;
  state.pyramidBaseVerts = baseVerts.map((v) => v.clone());
  createStrategicLabels();
  const sliceHeights = [H / 3, (2 * H) / 3];
  state.pyramidSliceHeights = sliceHeights;

  const bottomR = radiusAtHeight(SOLID_BOTTOM_HEIGHT);
  const capInset = SOLID_CAP_HEIGHT / 2;
  const bottomCapGeo = new THREE.CylinderGeometry(R, R, SOLID_CAP_HEIGHT, 3);
  const topCapGeo = new THREE.CylinderGeometry(bottomR, bottomR, SOLID_CAP_HEIGHT, 3);
  const baseMat = new THREE.MeshPhysicalMaterial({
    color: DEFAULT_PYRAMID_COLOR,
    metalness: 0.95,
    roughness: 0.1,
    emissive: 0x4a3210,
    emissiveIntensity: BASE_EMISSIVE.base,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  state.pyramidMats.base = baseMat;

  const bottomFrustumGeo = new THREE.CylinderGeometry(bottomR, R, SOLID_BOTTOM_HEIGHT, 3, 1, true);
  const solidGoldMat = new THREE.MeshPhysicalMaterial({
    color: DEFAULT_PYRAMID_COLOR,
    metalness: 0.85,
    roughness: 0.2,
    emissive: 0x3d2a10,
    emissiveIntensity: BASE_EMISSIVE.solid,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    side: THREE.FrontSide
  });
  state.pyramidMats.solid = solidGoldMat;
  const bottomMesh = new THREE.Mesh(bottomFrustumGeo, solidGoldMat);
  bottomMesh.position.y = SOLID_BOTTOM_HEIGHT / 2;
  bottomMesh.renderOrder = RENDER_ORDER.solid;
  glowGroup.add(bottomMesh);
  state.glowObjects.solidFrustum = bottomMesh;
  state.glowObjects.meshes.push(bottomMesh);

  const bottomCap = new THREE.Mesh(bottomCapGeo, baseMat);
  bottomCap.position.y = -capInset;
  bottomCap.renderOrder = RENDER_ORDER.base;
  glowGroup.add(bottomCap);
  state.glowObjects.solidBottomCap = bottomCap;
  state.glowObjects.meshes.push(bottomCap);

  const topCap = new THREE.Mesh(topCapGeo, baseMat);
  topCap.position.y = SOLID_BOTTOM_HEIGHT - capInset;
  topCap.renderOrder = RENDER_ORDER.base;
  glowGroup.add(topCap);
  state.glowObjects.solidTopCap = topCap;
  state.glowObjects.meshes.push(topCap);

  const shellHeight = H - SOLID_BOTTOM_HEIGHT;
  const shellBottomR = radiusAtHeight(SOLID_BOTTOM_HEIGHT);
  const shellConeGeo = new THREE.ConeGeometry(shellBottomR, shellHeight, 3, 1, true);
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: DEFAULT_SHELL_SETTINGS.color,
    roughness: DEFAULT_SHELL_SETTINGS.roughness,
    metalness: DEFAULT_SHELL_SETTINGS.metalness,
    transmission: DEFAULT_SHELL_SETTINGS.transmission,
    thickness: DEFAULT_SHELL_SETTINGS.thickness,
    transparent: true,
    opacity: DEFAULT_SHELL_SETTINGS.opacity,
    emissive: 0x1a1005,
    emissiveIntensity: DEFAULT_SHELL_SETTINGS.emissiveIntensity,
    side: THREE.FrontSide,
    depthWrite: false,
    depthTest: true,
    clearcoat: DEFAULT_SHELL_SETTINGS.clearcoat,
    clearcoatRoughness: DEFAULT_SHELL_SETTINGS.clearcoatRoughness
  });
  state.pyramidMats.shell = shellMat;
  const fullShell = new THREE.Mesh(shellConeGeo, shellMat);
  fullShell.position.y = SOLID_BOTTOM_HEIGHT + shellHeight / 2;
  fullShell.renderOrder = RENDER_ORDER.shell;
  glowGroup.add(fullShell);
  state.glowObjects.meshes.push(fullShell);

  state.pyramidMats.planes = [];
  state.pyramidMats.sliceEdges = [];
  state.pyramidMats.sliceInnerEdges = [];
  sliceHeights.forEach((y, sliceIndex) => {
    const sv = getSliceVertices(baseVerts, y);
    const centroid = getTriangleCentroid(sv[0], sv[1], sv[2]);
    const maxDist = getTriangleMaxRadius(centroid, sv[0], sv[1], sv[2]);
    const grad = state.sliceGradients[sliceIndex];
    const mat = createGradientSliceMaterial(centroid, maxDist, grad, state.sliceOpacity);
    state.pyramidMats.planes.push(mat);

    const plane = new THREE.Mesh(createTriangleGeo(sv[0], sv[1], sv[2]), mat);
    plane.renderOrder = RENDER_ORDER.slicePlane;
    plane.frustumCulled = false;
    glowGroup.add(plane);
    state.glowObjects.meshes.push(plane);
    state.glowObjects.slicePlanes.push(plane);

    const sliceEdgeGeo = new THREE.BufferGeometry().setFromPoints([
      sv[0], sv[1], sv[1], sv[2], sv[2], sv[0]
    ]);
    const sliceEdgeMat = new THREE.LineBasicMaterial({
      color: grad.end,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });
    state.pyramidMats.sliceEdges.push(sliceEdgeMat);
    const sliceEdge = new THREE.LineSegments(sliceEdgeGeo, sliceEdgeMat);
    sliceEdge.renderOrder = RENDER_ORDER.sliceEdge;
    glowGroup.add(sliceEdge);
    state.glowObjects.sliceEdgeLines.push(sliceEdge);

    const innerStarts = sv.map((v) => clipInnerEdgeStart(centroid, v));
    const innerEdgeGeo = new THREE.BufferGeometry().setFromPoints([
      innerStarts[0], sv[0], innerStarts[1], sv[1], innerStarts[2], sv[2]
    ]);
    const innerEdgeMat = new THREE.LineBasicMaterial({
      color: grad.end,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });
    state.pyramidMats.sliceInnerEdges.push(innerEdgeMat);
    const innerEdge = new THREE.LineSegments(innerEdgeGeo, innerEdgeMat);
    innerEdge.renderOrder = RENDER_ORDER.sliceInnerEdge;
    glowGroup.add(innerEdge);
    state.glowObjects.sliceInnerEdgeLines.push(innerEdge);
  });

  const axisMat = createAxisPhysicalMaterial(DEFAULT_AXIS_SETTINGS);
  state.pyramidMats.axis = axisMat;

  const axisShaft = new THREE.Group();
  const axisCylHeight = SHAFT_CYL_HEIGHT - SOLID_BOTTOM_HEIGHT;
  const cylGeo = new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, axisCylHeight, 64);
  const cylMesh = new THREE.Mesh(cylGeo, axisMat);
  cylMesh.position.y = SOLID_BOTTOM_HEIGHT + axisCylHeight / 2;
  cylMesh.renderOrder = RENDER_ORDER.axis;
  axisShaft.add(cylMesh);

  const tipGeo = new THREE.ConeGeometry(SHAFT_RADIUS, SHAFT_TIP_HEIGHT, 64);
  const tipMesh = new THREE.Mesh(tipGeo, axisMat);
  tipMesh.position.y = SHAFT_CYL_HEIGHT + SHAFT_TIP_HEIGHT / 2;
  tipMesh.renderOrder = RENDER_ORDER.axis;
  axisShaft.add(tipMesh);
  glowGroup.add(axisShaft);
  state.glowObjects.axisShaft = axisShaft;

  state.glowObjects.meshes.push(cylMesh, tipMesh);

  state.glowObjects.baseCornerCones = createBaseCornerCones(glowGroup, baseVerts);

  const edgeGlow = createEdgeGlowTubes(glowGroup, apex, baseVerts);
  state.glowObjects.edgeGlowTubes = edgeGlow;
  state.pyramidMats.edgeFlowOuter = edgeGlow.outerMats;
  state.pyramidMats.edgeFlowInner = edgeGlow.innerMats;

  state.glowObjects.internalPoints = createInternalParticles(
    flowGroup,
    apex,
    baseVerts,
    sliceHeights,
    getMotionParticleCountMultiplier()
  );
  createWireframePyramid(wireframeGroup, apex, baseVerts, sliceHeights);
  createParticlePyramid(particleGroup, apex, baseVerts, sliceHeights);
}

/** 更新棱边流光 Shader 的 uTime  uniform */
export function updateEdgeFlow(elapsed) {
  const { edgeFlowOuter, edgeFlowInner } = state.pyramidMats;
  edgeFlowOuter?.forEach((mat) => {
    mat.uniforms.uTime.value = elapsed;
  });
  edgeFlowInner?.forEach((mat) => {
    mat.uniforms.uTime.value = elapsed;
  });
}

/** 初始化或读取粒子流时钟基准时间 */
function syncParticleFlowClock() {
  const now = state.clock.getElapsedTime();
  if (state.particleFlowElapsed == null) {
    state.particleFlowElapsed = now;
  }
  if (state.particleFlowLastUpdate == null) {
    state.particleFlowLastUpdate = now;
  }
  return now;
}

/** 按速度倍率推进粒子流时钟并返回累计 elapsed */
export function advanceParticleFlowClock(speedScale = 1) {
  const now = syncParticleFlowClock();
  const delta = now - state.particleFlowLastUpdate;
  state.particleFlowLastUpdate = now;
  state.particleFlowElapsed += delta * speedScale;
  return state.particleFlowElapsed;
}

/** 根据 elapsed 更新内部粒子的上升位置与颜色衰减 */
export function updateParticleFlow(elapsed) {
  const riseSpeed = getMotionParticleRiseSpeed();

  if (state.internalParticleGeo && state.internalParticleStreams.length) {
    const pos = state.internalParticleGeo.attributes.position.array;
    const colors = state.internalParticleGeo.attributes.color.array;
    for (let i = 0; i < state.internalParticleStreams.length; i++) {
      const s = state.internalParticleStreams[i];
      const t = (s.phase + (elapsed * riseSpeed) / H) % 1;
      const y = t * H;
      const maxR = radiusAtHeight(y) * 0.85;
      const r = s.radialNorm * maxR;
      const i3 = i * 3;
      pos[i3] = r * Math.cos(s.angle);
      pos[i3 + 1] = y;
      pos[i3 + 2] = r * Math.sin(s.angle);
      const sinFade = 0.4 + 0.6 * Math.sin(Math.PI * t);
      colors[i3] = sinFade;
      colors[i3 + 1] = sinFade;
      colors[i3 + 2] = sinFade;
    }
    state.internalParticleGeo.attributes.position.needsUpdate = true;
    state.internalParticleGeo.attributes.color.needsUpdate = true;
  }
}
