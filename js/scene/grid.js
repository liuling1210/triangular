import { state } from '../state/appState.js';

export function createCircularGrid() {
  const gridGroup = new THREE.Group();
  gridGroup.position.y = -0.045;
  state.scene.add(gridGroup);

  const lineMat = new THREE.LineBasicMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.25
  });

  const maxRadius = 5.5;
  const ringCount = 8;
  for (let i = 1; i <= ringCount; i++) {
    const radius = (maxRadius / ringCount) * i;
    const ringGeo = new THREE.BufferGeometry();
    const pts = [];
    const segments = 64;
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)));
    }
    ringGeo.setFromPoints(pts);
    gridGroup.add(new THREE.Line(ringGeo, lineMat));
  }

  const radialCount = 12;
  for (let i = 0; i < radialCount; i++) {
    const a = (i / radialCount) * Math.PI * 2;
    const radialGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(maxRadius * Math.cos(a), 0, maxRadius * Math.sin(a))
    ]);
    gridGroup.add(new THREE.Line(radialGeo, lineMat));
  }
}
