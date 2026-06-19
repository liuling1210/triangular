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
