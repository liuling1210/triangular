import { state } from '../state/appState.js';
import { getTriangleCentroid } from '../utils/geometry.js';

const OUTWARD_OFFSET = 0.22;
const Y_LIFT = 0.06;

/** baseVerts 已按 atan2(x, z) 逆时针排序，序号 1/2/3 与数组下标一一对应 */
export function createBaseCornerMarkers(baseVerts) {
  const center = getTriangleCentroid(baseVerts[0], baseVerts[1], baseVerts[2]);
  state.baseCornerMarkers = [];

  baseVerts.forEach((vertex, i) => {
    const outward = new THREE.Vector3().subVectors(vertex, center);
    outward.y = 0;
    outward.normalize();

    const position = vertex.clone().add(outward.multiplyScalar(OUTWARD_OFFSET));
    position.y += Y_LIFT;

    const div = document.createElement('div');
    div.className = 'base-corner-marker';
    div.textContent = String(i + 1);

    const label = new THREE.CSS2DObject(div);
    label.position.copy(position);
    (state.pyramidRootGroup ?? state.scene).add(label);

    state.baseCornerMarkers.push({
      index: i + 1,
      vertex: vertex.clone(),
      position: position.clone(),
      label,
      element: div
    });
  });

  applyCornerMarkersVisibility();
}

export function applyCornerMarkersVisibility() {
  state.baseCornerMarkers.forEach((marker) => {
    marker.element.style.opacity = state.showCornerMarkers ? '1' : '0';
  });
}

export function setCornerMarkersVisible(visible) {
  state.showCornerMarkers = visible;
  applyCornerMarkersVisibility();
}
