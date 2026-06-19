import { INITIAL_CAMERA } from '../config/constants.js';
import { applyCameraPreset } from '../utils/cameraPreset.js';
import { state } from '../state/appState.js';

export function setupControls() {
  state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
  applyCameraPreset(state.camera, INITIAL_CAMERA, state.controls, state.pyramidBaseVerts);
  state.controls.enableDamping = true;
  state.controls.dampingFactor = 0.05;
  state.controls.minDistance = 4;
  state.controls.maxDistance = 20;
}
