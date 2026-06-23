import {
  R,
  H,
  SHAFT_RADIUS,
  SHAFT_CYL_HEIGHT,
  SHAFT_TIP_HEIGHT,
  SOLID_BOTTOM_HEIGHT,
  RENDER_ORDER
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { getSliceVertices, radiusAtHeight } from '../utils/geometry.js';
import { createBaseCornerConesWireframe } from './baseCornerCones.js';

function addWireframeMesh(parent, geo, mat, positionY, renderOrder) {
  const wireGeo = new THREE.WireframeGeometry(geo);
  const lines = new THREE.LineSegments(wireGeo, mat);
  lines.position.y = positionY;
  lines.renderOrder = renderOrder;
  parent.add(lines);
  return lines;
}

function addTriangleEdges(parent, v0, v1, v2, mat, renderOrder) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    v0, v1,
    v1, v2,
    v2, v0
  ]);
  const lines = new THREE.LineSegments(geo, mat);
  lines.renderOrder = renderOrder;
  parent.add(lines);
  return lines;
}

export function createWireframePyramid(parent, apex, baseVerts, sliceHeights) {
  state.pyramidMats.wireframe = [];

  const shellMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    depthWrite: false
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.98,
    depthWrite: false
  });
  const sliceMat = new THREE.LineBasicMaterial({
    color: 0xe8e8e8,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  state.pyramidMats.wireframe.push(shellMat, edgeMat, sliceMat);

  const shellHeight = H - SOLID_BOTTOM_HEIGHT;
  const shellBottomR = radiusAtHeight(SOLID_BOTTOM_HEIGHT);
  const bottomR = radiusAtHeight(SOLID_BOTTOM_HEIGHT);

  const bottomFrustumGeo = new THREE.CylinderGeometry(bottomR, R, SOLID_BOTTOM_HEIGHT, 3, 1, true);
  addWireframeMesh(parent, bottomFrustumGeo, shellMat, SOLID_BOTTOM_HEIGHT / 2, RENDER_ORDER.shell);

  const shellConeGeo = new THREE.ConeGeometry(shellBottomR, shellHeight, 3, 1, true);
  addWireframeMesh(parent, shellConeGeo, shellMat, SOLID_BOTTOM_HEIGHT + shellHeight / 2, RENDER_ORDER.shell);

  const baseGeo = new THREE.CylinderGeometry(R, R, 0.04, 3);
  addWireframeMesh(parent, baseGeo, shellMat, -0.02, RENDER_ORDER.base);

  const cylGeo = new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, SHAFT_CYL_HEIGHT, 24);
  addWireframeMesh(parent, cylGeo, edgeMat, SHAFT_CYL_HEIGHT / 2, RENDER_ORDER.axis);

  const tipGeo = new THREE.ConeGeometry(SHAFT_RADIUS, SHAFT_TIP_HEIGHT, 24);
  addWireframeMesh(parent, tipGeo, edgeMat, SHAFT_CYL_HEIGHT + SHAFT_TIP_HEIGHT / 2, RENDER_ORDER.axis);

  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    addTriangleEdges(parent, apex, baseVerts[i], baseVerts[next], edgeMat, RENDER_ORDER.edge);
  }

  sliceHeights.forEach((y) => {
    const sv = getSliceVertices(baseVerts, y);
    addTriangleEdges(parent, sv[0], sv[1], sv[2], sliceMat, RENDER_ORDER.sliceEdge);
  });

  createBaseCornerConesWireframe(parent, baseVerts, edgeMat);
}
