export const INITIAL_CAMERA = {
  position: { x: -0.074, y: 8.188, z: -0.073 },
  target: { x: -0.074, y: 1.35, z: -0.073 },
  alignVertex1ToTop: true
};

/** 正视视角 */
export const FRONT_VIEW_CAMERA = {
  position: { x: 6.074, y: 2.37, z: 3.565 },
  target: { x: 0.052, y: 0.86, z: -0.078 },
  azimuth: 1.027
};

export const DEFAULT_PYRAMID_COLOR = '#E8CB96';
export const SHOW_LABELS = false;
export const DEFAULT_BRIGHTNESS = 0.74;

export const DEFAULT_SLICE_GRADIENTS = [
  { start: '#383838', end: '#B6AE58' },
  { start: '#323232', end: '#B6AE58' }
];

export const DEFAULT_AXIS_SETTINGS = {
  color: '#B6AE58',
  colorBrightness: 1.75,
  emissiveStrength: 0.95,
  emissiveIntensity: 0.44,
  metalness: 0.79,
  roughness: 0.36,
  clearcoat: 0.9,
  clearcoatRoughness: 0.06,
  lightIntensity: 2.8
};

/** 底部实心段（solid）与底面盖板（base）共用材质参数 */
export const DEFAULT_FOOT_SETTINGS = {
  color: '#DDB873',
  colorBrightness: 1,
  emissiveStrength: 0.25,
  emissiveIntensity: 0.575,
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.1
};

export const DEFAULT_SLICE_OPACITY = {
  opacityCenter: 0.34,
  opacityEdge: 0.61,
  fadeRange: 0.8
};

export const BASE_TONE_EXPOSURE = 1.2;
export const BASE_BLOOM_STRENGTH = 0.85;
export const BASE_LIGHT_INTENSITIES = { key: 1.2, core: 2.5, axis: 2.8 };
export const BASE_EMISSIVE = { solid: 0.55, base: 0.6, shell: 0.2, axis: 1.6 };

export const RENDER_ORDER = {
  base: 0,
  solid: 1,
  shell: 2,
  particles: 4,
  edge: 5,
  axis: 7,
  slicePlane: 8,
  sliceInnerEdge: 9,
  sliceEdge: 10
};

export const EDGE_FLOW = {
  outerRadius: 0.024,
  innerRadius: 0.005,
  tubularSegments: 96,
  radialSegments: 8,
  speed: 0.72,
  baseOpacity: 0.95,
  endFadeBottom: 0.11,
  endFadeTop: 0.06,
  bottomInsetRatio: 0.035,
  topInsetRatio: 0.02
};

export const DEFAULT_EDGE_FLOW_SETTINGS = {
  speed: EDGE_FLOW.speed,
  opacity: EDGE_FLOW.baseOpacity,
  intensity: 1,
  innerIntensityRatio: 1.15,
  bandWidth: 0.06,
  outerRadius: EDGE_FLOW.outerRadius,
  innerRadius: EDGE_FLOW.innerRadius,
  endFadeBottom: EDGE_FLOW.endFadeBottom,
  endFadeTop: EDGE_FLOW.endFadeTop,
  bottomInsetRatio: EDGE_FLOW.bottomInsetRatio,
  topInsetRatio: EDGE_FLOW.topInsetRatio
};

export const PARTICLE_RISE_SPEED = 0.28;
export const INTERNAL_FLOW_OPACITY = 0.95;

export const DEFAULT_MOTION_PARTICLE_SETTINGS = {
  speed: PARTICLE_RISE_SPEED,
  opacity: INTERNAL_FLOW_OPACITY,
  internalSize: 0.065,
  vertexSize: 0.28,
  vertexOpacity: 1,
  count: 0.37
};

export const MOTION_PARTICLE_BASE_COUNTS = {
  volume: 900,
  core: 500,
  slice: 180,
  face: 200
};
export const SOLID_BOTTOM_HEIGHT = 0.1;
export const SOLID_CAP_HEIGHT = 0.04;
export const R = 2.0;
export const H = 3.0;
export const PYRAMID_EFFECT_MODES = { GLOW: 'glow', WIREFRAME: 'wireframe', PARTICLES: 'particles' };
export const WIREFRAME_MOTION_COLOR = '#ffffff';
export const SHAFT_RADIUS = 0.05;
export const SHAFT_CYL_HEIGHT = H - 0.2;
export const SHAFT_TIP_HEIGHT = 0.2;
export const PYRAMID_Y_OFFSET = H / 2;

export const GRID_MAX_RINGS = 8;

export const GRID = {
  ringStep: 0.5,
  ringRadiusScale: 1.43,
  ringCount: 4,
  minRingCount: 2,
  maxRingCount: 6,
  maxRadius: 2.715,
  radialCount: 24,
  lineWidth: 0.011,
  brightness: 0.29,
  color: 0x888888,
  y: -0.045
};

/** 以三棱锥底面外接圆 R 为锚点，向内/外等距生成圈层 */
export function computeGridRingRadii(ringCount, radiusScale, step = GRID.ringStep) {
  const scaledStep = step * radiusScale;
  const pyramidRingIdx = Math.max(0, ringCount - 2);
  return Array.from({ length: ringCount }, (_, i) => {
    const radius = R + (i - pyramidRingIdx) * scaledStep;
    return Math.max(radius, scaledStep * 0.25);
  });
}

export function getGridRingRadii(settings) {
  const count = settings.ringCount ?? GRID.ringCount;
  const scale = settings.ringRadiusScale ?? GRID.ringRadiusScale;
  const step = settings.ringStep ?? GRID.ringStep;
  return computeGridRingRadii(count, scale, step);
}

export function syncGridDerivedSettings(settings) {
  const radii = getGridRingRadii(settings);
  settings.maxRadius = radii[radii.length - 1];
  settings.ringCount = radii.length;
  return radii;
}

export const DEFAULT_GRID_SETTINGS = {
  ringStep: GRID.ringStep,
  ringRadiusScale: GRID.ringRadiusScale,
  ringCount: GRID.ringCount,
  maxRadius: GRID.maxRadius,
  radialCount: GRID.radialCount,
  lineWidth: GRID.lineWidth,
  brightness: GRID.brightness
};
