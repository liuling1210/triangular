import { state } from '../state/appState.js';

export function setupControls() {
  state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
  state.controls.target.set(0, 1.35, 0);
  state.controls.enableDamping = true;
  state.controls.dampingFactor = 0.05;
  state.controls.minDistance = 4;
  state.controls.maxDistance = 20;
}
