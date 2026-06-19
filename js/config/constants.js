export const INITIAL_CAMERA = {
  position: { x: -0.074, y: 8.188, z: -0.073 },
  target: { x: -0.074, y: 1.35, z: -0.073 },
  alignVertex1ToTop: true
};

export const DEFAULT_PYRAMID_COLOR = '#DDB873';
export const SHOW_LABELS = false;
export const DEFAULT_BRIGHTNESS = 0.67;

export const DEFAULT_SLICE_GRADIENTS = [
  { start: '#383838', end: '#C2B85B' },
  { start: '#323232', end: '#C2B85B' }
];

export const DEFAULT_AXIS_SETTINGS = {
  color: '#DDB873',
  colorBrightness: 1.12,
  emissiveStrength: 0.95,
  emissiveIntensity: 0.44,
  metalness: 0.45,
  roughness: 0.1,
  clearcoat: 0.9,
  clearcoatRoughness: 0.06,
  lightIntensity: 2.8
};

export const DEFAULT_SLICE_OPACITY = {
  opacityCenter: 0.25,
  opacityEdge: 0.95,
  fadeRange: 1.0
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
  speed: 0.32,
  baseOpacity: 0.95
};

export const DEFAULT_EDGE_FLOW_SETTINGS = {
  speed: EDGE_FLOW.speed,
  opacity: EDGE_FLOW.baseOpacity,
  intensity: 1,
  innerIntensityRatio: 1.15,
  bandWidth: 0.12,
  outerRadius: EDGE_FLOW.outerRadius,
  innerRadius: EDGE_FLOW.innerRadius
};

export const PARTICLE_RISE_SPEED = 0.18;
export const INTERNAL_FLOW_OPACITY = 0.95;

export const DEFAULT_MOTION_PARTICLE_SETTINGS = {
  speed: PARTICLE_RISE_SPEED,
  opacity: INTERNAL_FLOW_OPACITY,
  internalSize: 0.065,
  vertexSize: 0.28,
  vertexOpacity: 1,
  count: 1
};

export const MOTION_PARTICLE_BASE_COUNTS = {
  volume: 900,
  core: 500,
  slice: 180,
  face: 200
};
export const SOLID_BOTTOM_HEIGHT = 0.1;
export const R = 2.0;
export const H = 3.0;
export const PYRAMID_EFFECT_MODES = { GLOW: 'glow', WIREFRAME: 'wireframe', PARTICLES: 'particles' };
export const WIREFRAME_MOTION_COLOR = '#ffffff';
export const SHAFT_RADIUS = 0.05;
export const SHAFT_CYL_HEIGHT = H - 0.2;
export const SHAFT_TIP_HEIGHT = 0.2;
export const PYRAMID_Y_OFFSET = H / 2;

export const GRID = {
  maxRadius: 3,
  ringCount: 3,
  radialCount: 12,
  lineWidth: 0.011,
  brightness: 0.29,
  color: 0x888888,
  y: -0.045
};

export const DEFAULT_GRID_SETTINGS = {
  maxRadius: GRID.maxRadius,
  ringCount: GRID.ringCount,
  radialCount: GRID.radialCount,
  lineWidth: GRID.lineWidth,
  brightness: GRID.brightness
};
