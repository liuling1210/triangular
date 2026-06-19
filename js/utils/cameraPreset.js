function roundCoord(value) {
  return Math.round(value * 1000) / 1000;
}

function vec3ToCoords(vector) {
  return {
    x: roundCoord(vector.x),
    y: roundCoord(vector.y),
    z: roundCoord(vector.z)
  };
}

const TOP_DOWN_XZ_EPS = 0.08;

function isTopDownView(position, target) {
  const dx = position.x - target.x;
  const dz = position.z - target.z;
  return Math.hypot(dx, dz) < TOP_DOWN_XZ_EPS;
}

/** 顶视时让 1 号底角顶点（baseVerts[0]）朝向屏幕上方（世界 -Z）所需的方位角 */
export function computeVertex1TopAzimuth(baseVerts) {
  const v = baseVerts[0];
  return Math.PI - Math.atan2(v.x, v.z);
}

function getTopDownAzimuth(camera) {
  return Math.atan2(camera.up.x, -camera.up.z);
}

function applyTopDownOrientation(camera, target, azimuth) {
  camera.up.set(Math.sin(azimuth), 0, -Math.cos(azimuth)).normalize();
  camera.lookAt(target.x, target.y, target.z);
}

export function applyCameraPreset(camera, preset, controls = null, baseVerts = null) {
  const target = new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z);
  camera.position.set(preset.position.x, preset.position.y, preset.position.z);

  if (controls) {
    controls.target.copy(target);
  }

  const topDown = isTopDownView(camera.position, target);
  let azimuth = preset.azimuth;

  if (topDown) {
    if (azimuth == null && preset.alignVertex1ToTop && baseVerts?.length) {
      azimuth = computeVertex1TopAzimuth(baseVerts);
    }
    applyTopDownOrientation(camera, target, azimuth ?? 0);
  } else {
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
  }

  controls?.update();
}

export function getCameraPreset(camera, controls) {
  const preset = {
    position: vec3ToCoords(camera.position),
    target: vec3ToCoords(controls.target)
  };

  if (isTopDownView(camera.position, controls.target)) {
    preset.azimuth = roundCoord(getTopDownAzimuth(camera));
    preset.alignVertex1ToTop = true;
  } else {
    preset.azimuth = roundCoord(controls.getAzimuthalAngle());
  }

  return preset;
}

export function formatCameraPresetCode(preset) {
  const fmt = ({ x, y, z }) => `{ x: ${x}, y: ${y}, z: ${z} }`;
  const lines = [
    'const INITIAL_CAMERA = {',
    `  position: ${fmt(preset.position)},`,
    `  target: ${fmt(preset.target)},`
  ];

  if (preset.azimuth != null) {
    lines.push(`  azimuth: ${preset.azimuth},`);
  }
  if (preset.alignVertex1ToTop) {
    lines.push('  alignVertex1ToTop: true,');
  }

  lines.push('};');
  return lines.join('\n');
}
