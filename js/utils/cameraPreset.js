/** 相机预设位姿计算、应用及俯视混合度检测 */
import { clamp01, smootherstep } from './math.js';

const TOP_DOWN_XZ_EPS = 0.08;

/** 判断相机是否处于近似顶视（XZ 偏移极小） */
function isTopDownView(position, target) {
  const dx = position.x - target.x;
  const dz = position.z - target.z;
  return Math.hypot(dx, dz) < TOP_DOWN_XZ_EPS;
}

/** 顶视时让顶点（baseVerts[0]）朝向屏幕上方（世界 -Z）所需的方位角 */
function computeVertex1TopAzimuth(baseVerts) {
  const v = baseVerts[0];
  return Math.PI - Math.atan2(v.x, v.z);
}

/** 顶视模式下设置 camera.up 并 lookAt 目标点 */
function applyTopDownOrientation(camera, target, azimuth) {
  camera.up.set(Math.sin(azimuth), 0, -Math.cos(azimuth)).normalize();
  camera.lookAt(target.x, target.y, target.z);
}

/** 根据预设与底面顶点解析出相机位置、目标、up 向量及俯视标志 */
export function getPresetCameraState(preset, baseVerts = null) {
  const target = new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z);
  const position = new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z);
  const topDown = isTopDownView(position, target);
  let azimuth = preset.azimuth;
  const up = new THREE.Vector3();

  if (topDown) {
    if (azimuth == null && preset.alignVertex1ToTop && baseVerts?.length) {
      azimuth = computeVertex1TopAzimuth(baseVerts);
    }
    up.set(Math.sin(azimuth ?? 0), 0, -Math.cos(azimuth ?? 0)).normalize();
  } else {
    up.set(0, 1, 0);
  }

  return { position, target, up, topDown, azimuth: azimuth ?? 0 };
}

/** 将相机与 OrbitControls 切换到指定预设位姿 */
export function applyCameraPreset(camera, preset, controls = null, baseVerts = null) {
  const { position, target, up, topDown, azimuth } = getPresetCameraState(preset, baseVerts);
  camera.position.copy(position);

  if (controls) {
    controls.target.copy(target);
  }

  if (topDown) {
    applyTopDownOrientation(camera, target, azimuth);
  } else {
    camera.up.copy(up);
    camera.lookAt(target);
  }

  controls?.update();
}

/** 0 = 正视，1 = 俯视；相机仰角越大值越高 */
export function getCameraTopDownBlend(camera, target) {
  if (!camera || !target) return 0;

  const dir = new THREE.Vector3().subVectors(camera.position, target);
  const horiz = Math.hypot(dir.x, dir.z);
  const elevFromHoriz = Math.atan2(Math.abs(dir.y), Math.max(horiz, 1e-4));

  return smootherstep(elevFromHoriz, 0.4, 1.05);
}
