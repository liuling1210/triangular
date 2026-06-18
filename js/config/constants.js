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

export const PARTICLE_RISE_SPEED = 0.18;
export const R = 2.0;
export const H = 3.0;
export const SHAFT_RADIUS = 0.05;
export const SHAFT_CYL_HEIGHT = H - 0.2;
export const SHAFT_TIP_HEIGHT = 0.2;
export const PYRAMID_Y_OFFSET = H / 2;
