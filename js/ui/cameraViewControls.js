/** 相机预设视角切换与平滑过渡 */
import { FRONT_VIEW_CAMERA } from '../config/constants.js';
import { state } from '../state/appState.js';
import { applyCameraPreset, getPresetCameraState } from '../utils/cameraPreset.js';
import { smootherstep } from '../utils/math.js';

const VIEW_FRONT = 'front';
const TRANSITION_DURATION = 1.2;

/** 完成相机视角过渡并恢复控制器 */
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
}

/** 每帧更新相机视角平滑过渡 */
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

/** 启动到指定预设视角的平滑过渡 */
function setCameraView(preset, viewKey) {
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
}

/** 平滑飞行到正视图预设 */
export function flyCameraToFrontView() {
  if (!state.camera || !state.controls || !state.clock) return;
  if (state.cameraViewTransition?.viewKey === VIEW_FRONT) return;
  setCameraView(FRONT_VIEW_CAMERA, VIEW_FRONT);
}
