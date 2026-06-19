import { INITIAL_CAMERA, FRONT_VIEW_CAMERA } from '../config/constants.js';
import { state } from '../state/appState.js';
import { applyCameraPreset, getPresetCameraState } from '../utils/cameraPreset.js';

const VIEW_TOP = 'top';
const VIEW_FRONT = 'front';
const TRANSITION_DURATION = 1.2;

function smootherstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function setViewButtonsBusy(busy) {
  document.getElementById('view-top-btn').classList.toggle('is-busy', busy);
  document.getElementById('view-front-btn').classList.toggle('is-busy', busy);
}

function setActiveView(view) {
  document.getElementById('view-top-btn').classList.toggle('active', view === VIEW_TOP);
  document.getElementById('view-front-btn').classList.toggle('active', view === VIEW_FRONT);
}

export function isCameraViewTransitioning() {
  return state.cameraViewTransition != null;
}

function finishCameraViewTransition() {
  const transition = state.cameraViewTransition;
  if (!transition) return;

  applyCameraPreset(
    state.camera,
    transition.preset,
    state.controls,
    state.pyramidBaseVerts
  );
  state.controls.enabled = true;
  state.cameraViewTransition = null;
  setViewButtonsBusy(false);
}

export function updateCameraViewTransition() {
  const transition = state.cameraViewTransition;
  if (!transition || !state.clock) return;

  const elapsed = state.clock.getElapsedTime() - transition.startTime;
  const t = smootherstep(elapsed / TRANSITION_DURATION);

  const { from, to } = transition;
  state.camera.position.lerpVectors(from.position, to.position, t);
  state.controls.target.lerpVectors(from.target, to.target, t);
  state.camera.up.lerpVectors(from.up, to.up, t).normalize();
  state.camera.lookAt(state.controls.target);
  state.controls.update();

  if (t >= 1) {
    finishCameraViewTransition();
  }
}

export function setCameraView(preset, viewKey) {
  if (!state.camera || !state.controls || !state.clock) return;
  if (state.cameraViewTransition?.viewKey === viewKey) return;

  const to = getPresetCameraState(preset, state.pyramidBaseVerts);
  const from = {
    position: state.camera.position.clone(),
    target: state.controls.target.clone(),
    up: state.camera.up.clone()
  };

  state.controls.enabled = false;
  state.cameraViewTransition = {
    preset,
    viewKey,
    from,
    to,
    startTime: state.clock.getElapsedTime()
  };

  setActiveView(viewKey);
  setViewButtonsBusy(true);
}

export function flyCameraToFrontView() {
  if (!state.camera || !state.controls || !state.clock) return;
  if (state.cameraViewTransition?.viewKey === VIEW_FRONT) return;
  setCameraView(FRONT_VIEW_CAMERA, VIEW_FRONT);
}

export function setupCameraViewUI() {
  document.getElementById('view-top-btn').addEventListener('click', () => {
    setCameraView(INITIAL_CAMERA, VIEW_TOP);
  });
  document.getElementById('view-front-btn').addEventListener('click', () => {
    setCameraView(FRONT_VIEW_CAMERA, VIEW_FRONT);
  });
}
