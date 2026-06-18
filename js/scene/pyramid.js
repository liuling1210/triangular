import {
  DEFAULT_PYRAMID_COLOR,
  DEFAULT_AXIS_SETTINGS,
  BASE_EMISSIVE,
  RENDER_ORDER,
  PARTICLE_RISE_SPEED,
  R,
  H,
  SHAFT_RADIUS,
  SHAFT_CYL_HEIGHT,
  SHAFT_TIP_HEIGHT,
  PYRAMID_Y_OFFSET
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

function encodeParticleStream(x, y, z, phase) {
  const angle = Math.atan2(z, x);
  const r = Math.sqrt(x * x + z * z);
  const maxR = Math.max(radiusAtHeight(y) * 0.85, 0.001);
  return { angle, radialNorm: Math.min(r / maxR, 1), phase };
}

function createInternalParticles(group, apex, baseVerts, sliceHeights) {
  const particles = [];
  const streams = [];

  function addParticle(x, y, z) {
    particles.push(x, y, z);
    streams.push(encodeParticleStream(x, y, z, Math.random()));
  }

  for (let i = 0; i < 900; i++) {
    const y = Math.random() * H * 0.95;
    const maxR = radiusAtHeight(y) * 0.85;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * maxR;
    addParticle(rad * Math.cos(angle), y, rad * Math.sin(angle));
  }

  for (let i = 0; i < 500; i++) {
    const y = Math.random() * H * 0.98;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * 0.35;
    addParticle(rad * Math.cos(angle), y, rad * Math.sin(angle));
  }

  sliceHeights.forEach((y) => {
    const sv = getSliceVertices(baseVerts, y);
    const batch = [];
    sampleTriangle(sv[0], sv[1], sv[2], 180, batch);
    for (let i = 0; i < batch.length; i += 3) {
      addParticle(batch[i], batch[i + 1], batch[i + 2]);
    }
  });

  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    const batch = [];
    sampleTriangle(apex, baseVerts[i], baseVerts[next], 200, batch);
    for (let j = 0; j < batch.length; j += 3) {
      addParticle(batch[j], batch[j + 1], batch[j + 2]);
    }
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(streams.length * 3), 3));
  state.internalParticleGeo = pGeo;
  state.internalParticleStreams = streams;

  const pMat = new THREE.PointsMaterial({
    color: DEFAULT_PYRAMID_COLOR,
    size: 0.065,
    map: createGlowTexture(DEFAULT_PYRAMID_COLOR, false),
    transparent: true,
    opacity: 0.95,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
  });
  state.pyramidMats.particles = pMat;

  const internalPoints = new THREE.Points(pGeo, pMat);
  internalPoints.renderOrder = RENDER_ORDER.particles;
  group.add(internalPoints);
}

export function createPyramid() {
  const group = new THREE.Group();
  state.scene.add(group);

  const coneGeo = createPyramidConeGeo();
  const { apex, baseVerts } = extractPyramidKeyPoints(coneGeo);
  state.pyramidApex = apex;
  const sliceHeights = [H / 3, (2 * H) / 3];
  const SOLID_BOTTOM_HEIGHT = 0.1;

  const bottomR = radiusAtHeight(SOLID_BOTTOM_HEIGHT);
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
  group.add(bottomMesh);

  const shellHeight = H - SOLID_BOTTOM_HEIGHT;
  const shellBottomR = radiusAtHeight(SOLID_BOTTOM_HEIGHT);
  const shellConeGeo = new THREE.ConeGeometry(shellBottomR, shellHeight, 3, 1, true);
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: DEFAULT_PYRAMID_COLOR,
    roughness: 0.3,
    metalness: 0.1,
    transmission: 0.5,
    thickness: 1.5,
    transparent: true,
    opacity: 0.42,
    emissive: 0x1a1005,
    emissiveIntensity: BASE_EMISSIVE.shell,
    side: THREE.FrontSide,
    depthWrite: false,
    depthTest: true,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12
  });
  state.pyramidMats.shell = shellMat;
  const fullShell = new THREE.Mesh(shellConeGeo, shellMat);
  fullShell.position.y = SOLID_BOTTOM_HEIGHT + shellHeight / 2;
  fullShell.renderOrder = RENDER_ORDER.shell;
  group.add(fullShell);

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
    group.add(plane);

    const sliceEdgeGeo = new THREE.BufferGeometry().setFromPoints([
      sv[0], sv[1], sv[1], sv[2], sv[2], sv[0]
    ]);
    const sliceEdgeMat = new THREE.LineBasicMaterial({
      color: grad.end,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false
    });
    state.pyramidMats.sliceEdges.push(sliceEdgeMat);
    const sliceEdge = new THREE.LineSegments(sliceEdgeGeo, sliceEdgeMat);
    sliceEdge.renderOrder = RENDER_ORDER.sliceEdge;
    group.add(sliceEdge);

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
      depthTest: false
    });
    state.pyramidMats.sliceInnerEdges.push(innerEdgeMat);
    const innerEdge = new THREE.LineSegments(innerEdgeGeo, innerEdgeMat);
    innerEdge.renderOrder = RENDER_ORDER.sliceInnerEdge;
    group.add(innerEdge);
  });

  const baseGeo = new THREE.CylinderGeometry(R, R, 0.04, 3);
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
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -0.02;
  baseMesh.renderOrder = RENDER_ORDER.base;
  group.add(baseMesh);

  const axisMat = new THREE.MeshPhysicalMaterial({
    color: DEFAULT_AXIS_SETTINGS.color,
    metalness: DEFAULT_AXIS_SETTINGS.metalness,
    roughness: DEFAULT_AXIS_SETTINGS.roughness,
    emissive: new THREE.Color(DEFAULT_AXIS_SETTINGS.color),
    emissiveIntensity: DEFAULT_AXIS_SETTINGS.emissiveIntensity,
    clearcoat: DEFAULT_AXIS_SETTINGS.clearcoat,
    clearcoatRoughness: DEFAULT_AXIS_SETTINGS.clearcoatRoughness,
    transparent: false,
    opacity: 1,
    transmission: 0,
    depthWrite: true,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.FrontSide
  });
  state.pyramidMats.axis = axisMat;

  const axisShaft = new THREE.Group();
  const cylGeo = new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_CYL_HEIGHT, 64);
  const cylMesh = new THREE.Mesh(cylGeo, axisMat);
  cylMesh.position.y = SHAFT_CYL_HEIGHT / 2;
  cylMesh.renderOrder = RENDER_ORDER.axis;
  axisShaft.add(cylMesh);

  const tipGeo = new THREE.ConeGeometry(SHAFT_RADIUS, SHAFT_TIP_HEIGHT, 64);
  const tipMesh = new THREE.Mesh(tipGeo, axisMat);
  tipMesh.position.y = SHAFT_CYL_HEIGHT + SHAFT_TIP_HEIGHT / 2;
  tipMesh.renderOrder = RENDER_ORDER.axis;
  axisShaft.add(tipMesh);
  group.add(axisShaft);

  const edgeMat = new THREE.LineBasicMaterial({
    color: DEFAULT_PYRAMID_COLOR,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });
  state.pyramidMats.edge = edgeMat;
  const edgeWireGeo = new THREE.WireframeGeometry(coneGeo);
  const edgeLines = new THREE.LineSegments(edgeWireGeo, edgeMat);
  edgeLines.position.y = PYRAMID_Y_OFFSET;
  edgeLines.renderOrder = RENDER_ORDER.edge;
  group.add(edgeLines);

  const vertexPositions = [];
  baseVerts.forEach((v) => vertexPositions.push(v.x, v.y + 0.02, v.z));
  const vertexGeo = new THREE.BufferGeometry();
  vertexGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertexPositions, 3));
  vertexGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(3 * baseVerts.length), 3));
  state.vertexParticleStreams = baseVerts.map((v) => ({
    startX: v.x,
    startY: v.y + 0.02,
    startZ: v.z,
    phase: Math.random()
  }));
  state.vertexParticleGeo = vertexGeo;

  const vertexMat = new THREE.PointsMaterial({
    color: DEFAULT_PYRAMID_COLOR,
    size: 0.28,
    map: createGlowTexture(DEFAULT_PYRAMID_COLOR, true),
    transparent: true,
    opacity: 1,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false
  });
  state.pyramidMats.vertex = vertexMat;
  const vertexPoints = new THREE.Points(vertexGeo, vertexMat);
  vertexPoints.renderOrder = RENDER_ORDER.particles;
  group.add(vertexPoints);

  createInternalParticles(group, apex, baseVerts, sliceHeights);
}

export function updateParticleFlow(elapsed) {
  if (state.internalParticleGeo && state.internalParticleStreams.length) {
    const pos = state.internalParticleGeo.attributes.position.array;
    const colors = state.internalParticleGeo.attributes.color.array;
    for (let i = 0; i < state.internalParticleStreams.length; i++) {
      const s = state.internalParticleStreams[i];
      const t = (s.phase + (elapsed * PARTICLE_RISE_SPEED) / H) % 1;
      const y = t * H;
      const maxR = radiusAtHeight(y) * 0.85;
      const r = s.radialNorm * maxR;
      const i3 = i * 3;
      pos[i3] = r * Math.cos(s.angle);
      pos[i3 + 1] = y;
      pos[i3 + 2] = r * Math.sin(s.angle);
      const fade = 0.4 + 0.6 * Math.sin(Math.PI * t);
      colors[i3] = fade;
      colors[i3 + 1] = fade;
      colors[i3 + 2] = fade;
    }
    state.internalParticleGeo.attributes.position.needsUpdate = true;
    state.internalParticleGeo.attributes.color.needsUpdate = true;
  }

  if (state.vertexParticleGeo && state.vertexParticleStreams.length && state.pyramidApex) {
    const pos = state.vertexParticleGeo.attributes.position.array;
    const colors = state.vertexParticleGeo.attributes.color.array;
    for (let i = 0; i < state.vertexParticleStreams.length; i++) {
      const s = state.vertexParticleStreams[i];
      const t = (s.phase + (elapsed * PARTICLE_RISE_SPEED) / H) % 1;
      const i3 = i * 3;
      pos[i3] = s.startX + (state.pyramidApex.x - s.startX) * t;
      pos[i3 + 1] = s.startY + (state.pyramidApex.y - s.startY) * t;
      pos[i3 + 2] = s.startZ + (state.pyramidApex.z - s.startZ) * t;
      const fade = 0.45 + 0.55 * Math.sin(Math.PI * t);
      colors[i3] = fade;
      colors[i3 + 1] = fade;
      colors[i3 + 2] = fade;
    }
    state.vertexParticleGeo.attributes.position.needsUpdate = true;
    state.vertexParticleGeo.attributes.color.needsUpdate = true;
  }
}
