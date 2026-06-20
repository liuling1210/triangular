import {
  DEFAULT_PYRAMID_COLOR,
  RENDER_ORDER,
  H,
  SHAFT_RADIUS,
  SHAFT_CYL_HEIGHT,
  SHAFT_TIP_HEIGHT,
  SOLID_BOTTOM_HEIGHT
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { createGlowTexture } from '../utils/color.js';
import {
  getSliceVertices,
  sampleTriangle,
  getTriangleCentroid,
  radiusAtHeight
} from '../utils/geometry.js';

const SHAFT_TOP = SHAFT_CYL_HEIGHT + SHAFT_TIP_HEIGHT;

function computeParticleReveal(x, y, z) {
  const r = Math.sqrt(x * x + z * z);

  if (y <= SHAFT_TOP && r <= SHAFT_RADIUS * 1.6) {
    return 0.06 + Math.min(r / SHAFT_RADIUS, 1) * 0.14;
  }

  const yClamped = Math.max(0, Math.min(y, H));
  const shellR = radiusAtHeight(yClamped);
  if (shellR < 0.001) return 0;

  const radialNorm = Math.min(r / shellR, 1);
  return 1 - radialNorm;
}

function sampleToPositions(A, B, C, count, positions) {
  const batch = [];
  sampleTriangle(A, B, C, count, batch);
  for (let i = 0; i < batch.length; i += 3) {
    positions.push(batch[i], batch[i + 1], batch[i + 2]);
  }
}

export function createParticlePyramid(parent, apex, baseVerts, sliceHeights) {
  const positions = [];

  for (let i = 0; i < 3500; i++) {
    const y = Math.random() * H;
    const sv = getSliceVertices(baseVerts, y);
    sampleToPositions(sv[0], sv[1], sv[2], 1, positions);
  }

  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    sampleToPositions(apex, baseVerts[i], baseVerts[next], 1000, positions);
  }

  const baseCenter = getTriangleCentroid(baseVerts[0], baseVerts[1], baseVerts[2]);
  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    sampleToPositions(baseCenter, baseVerts[i], baseVerts[next], 1200, positions);
  }
  sampleToPositions(baseVerts[0], baseVerts[1], baseVerts[2], 900, positions);

  const bottomBandTop = SOLID_BOTTOM_HEIGHT + 0.08;
  for (let i = 0; i < 1200; i++) {
    const y = Math.random() * bottomBandTop;
    const sv = getSliceVertices(baseVerts, y);
    sampleToPositions(sv[0], sv[1], sv[2], 1, positions);
  }
  for (let i = 0; i < 500; i++) {
    const y = Math.random() * 0.04 - 0.02;
    const t = Math.random();
    const edgeIdx = Math.floor(Math.random() * 3);
    const next = (edgeIdx + 1) % 3;
    const scale = 1 - Math.max(y, 0) / H;
    const x = baseVerts[edgeIdx].x * scale * (1 - t) + baseVerts[next].x * scale * t;
    const z = baseVerts[edgeIdx].z * scale * (1 - t) + baseVerts[next].z * scale * t;
    positions.push(x, y, z);
  }

  sliceHeights.forEach((y, sliceIndex) => {
    const sliceScale = sliceIndex === 1 ? 0.25 : 1;
    const sv = getSliceVertices(baseVerts, y);
    sampleToPositions(sv[0], sv[1], sv[2], Math.round(1500 * sliceScale), positions);
    for (let i = 0; i < Math.round(500 * sliceScale); i++) {
      const bandY = y + (Math.random() - 0.5) * 0.1;
      if (bandY < 0 || bandY > H) continue;
      const bandSv = getSliceVertices(baseVerts, bandY);
      sampleToPositions(bandSv[0], bandSv[1], bandSv[2], 1, positions);
    }
  });

  for (let i = 0; i < 2400; i++) {
    const yCoord = Math.random() * SHAFT_CYL_HEIGHT;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * SHAFT_RADIUS;
    positions.push(rad * Math.cos(angle), yCoord, rad * Math.sin(angle));
  }

  for (let i = 0; i < 700; i++) {
    const t = Math.random();
    const yCoord = SHAFT_CYL_HEIGHT + t * SHAFT_TIP_HEIGHT;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.sqrt(Math.random()) * (1 - t) * SHAFT_RADIUS;
    positions.push(rad * Math.cos(angle), yCoord, rad * Math.sin(angle));
  }

  for (let i = 0; i < 400; i++) {
    const yCoord = Math.random() * SHAFT_TOP;
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.random() * SHAFT_RADIUS * 0.4;
    positions.push(rad * Math.cos(angle), yCoord, rad * Math.sin(angle));
  }

  const count = positions.length / 3;
  const reveals = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    reveals[i] = computeParticleReveal(positions[i3], positions[i3 + 1], positions[i3 + 2]);
    colors[i3] = 1;
    colors[i3 + 1] = 1;
    colors[i3 + 2] = 1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('reveal', new THREE.BufferAttribute(reveals, 1));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  state.particleCloudGeo = geo;

  const mat = new THREE.PointsMaterial({
    color: DEFAULT_PYRAMID_COLOR,
    size: 0.055,
    map: createGlowTexture(DEFAULT_PYRAMID_COLOR, true),
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });
  state.pyramidMats.particleCloud = mat;

  const points = new THREE.Points(geo, mat);
  points.renderOrder = RENDER_ORDER.particles;
  parent.add(points);
}

export function resetParticleCloudColors() {
  const geo = state.particleCloudGeo;
  if (!geo) return;
  const colors = geo.attributes.color.array;
  for (let i = 0; i < colors.length; i++) {
    colors[i] = 1;
  }
  geo.attributes.color.needsUpdate = true;
}
