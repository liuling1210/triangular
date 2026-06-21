export const INITIAL_CAMERA = {
  position: { x: -0.074, y: 8.188, z: -0.073 },
  target: { x: -0.074, y: 1.35, z: -0.073 },
  alignVertex1ToTop: true
};

/** 正视视角 */
export const FRONT_VIEW_CAMERA = {
  position: { x: 7.076, y: 2.621, z: 4.171 },
  target: { x: 0.052, y: 0.86, z: -0.078 },
  azimuth: 1.027
};

export const DEFAULT_PYRAMID_COLOR = '#907647';
/** 初始俯视底面轮廓描边 */
export const REVEAL_CONTOUR_LINE_COLOR = '#AD834E';
export const REVEAL_CONTOUR_LINE_WIDTH = 0.010;
export const SHOW_LABELS = false;
export const DEFAULT_BRIGHTNESS = 0.74;

export const STRATEGIC_LABEL_ITEMS = [
  { key: 'base', text: '以价值三角为基', position: { x: 49.1, y: 76.6 } },
  { key: 'axis', text: '以战略中轴为路', position: { x: 36.2, y: 39.4 } },
  { key: 'slices', text: '以战略课题为门', position: { x: 65.6, y: 46.8 } },
  { key: 'apex', text: '战略目标', position: { x: 49.1, y: 11.9 } }
];

export const STRATEGIC_APEX_BG_IMAGE = 'public/bg.png';

export const DEFAULT_STRATEGIC_APEX_BG = {
  width: 72,
  position: { x: 49.2, y: 15.6 }
};

export const STRATEGIC_APEX_BG_RANGE = {
  width: { min: 20, max: 300 }
};

export const DEFAULT_STRATEGIC_LABEL_POSITIONS = Object.fromEntries(
  STRATEGIC_LABEL_ITEMS.map(({ key, position }) => [key, { ...position }])
);

/** 屏幕百分比定位（相对画布宽高） */
export const STRATEGIC_LABEL_SCREEN_RANGE = {
  x: { min: 0, max: 100 },
  y: { min: 0, max: 100 }
};

export const DEFAULT_STRATEGIC_LABEL_FONT_SIZE = 26;
export const STRATEGIC_LABEL_FONT_SIZE_RANGE = { min: 10, max: 40 };

export const DEFAULT_SLICE_GRADIENTS = [
  { start: '#1C1C1C', end: '#D6B884' },
  { start: '#1C1C1C', end: '#D3BB92' }
];

export const DEFAULT_AXIS_SETTINGS = {
  color: '#AA937A',
  colorBrightness: 1.75,
  emissiveStrength: 0.95,
  emissiveIntensity: 0.44,
  metalness: 0.79,
  roughness: 0.36,
  clearcoat: 0.9,
  clearcoatRoughness: 0.06,
  lightIntensity: 2.8
};

/** 三棱锥上半段玻璃外壳（shell）材质参数 */
export const DEFAULT_SHELL_SETTINGS = {
  color: '#C6DFEB',
  colorBrightness: 0.83,
  emissiveStrength: 0.1,
  emissiveIntensity: 1.6,
  opacity: 0.95,
  transmission: 0.43,
  thickness: 2.03,
  roughness: 0.11,
  metalness: 0.56,
  clearcoat: 0,
  clearcoatRoughness: 1
};

/** 底部实心段（solid）与底面盖板（base）共用材质参数 */
export const DEFAULT_FOOT_SETTINGS = {
  color: '#B3966E',
  colorBrightness: 1,
  emissiveStrength: 0.25,
  emissiveIntensity: 0.57,
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.1
};

/** 俯视时压低底面镜面高光与自发光，避免中心灯圈 / 整面过曝 */
export const TOP_DOWN_FOOT_OVERRIDES = {
  metalness: 0.1,
  roughness: 0.72,
  clearcoat: 0,
  clearcoatRoughness: 0.2,
  colorBrightness: 0.88,
  emissiveIntensity: 0.15
};

export const TOP_DOWN_LIGHT_SCALES = {
  core: 0.12,
  key: 0.6,
  ambient: 0.8,
  axis: 0
};

export const TOP_DOWN_BLOOM = {
  strengthScale: 0.55,
  threshold: 0.5
};

export const BASE_AMBIENT_INTENSITY = 0.6;
export const BLOOM_THRESHOLD = 0.15;
export const BLOOM_RADIUS = 0.45;

export const DEFAULT_SLICE_OPACITY = {
  opacityCenter: 0.34,
  opacityEdge: 0.61,
  fadeRange: 0.8
};

export const BASE_TONE_EXPOSURE = 1.2;
export const BASE_BLOOM_STRENGTH = 0.85;
export const BASE_LIGHT_INTENSITIES = { key: 1.2, core: 2.5, axis: 2.8 };

/** 发光模式场景灯光与后处理参数（左侧面板可调） */
export const DEFAULT_GLOW_LIGHT_SETTINGS = {
  ambientIntensity: 1.08,
  keyIntensity: 1.31,
  fillIntensity: 0.47,
  coreIntensity: 2.54,
  ambientSoftness: 0.35,
  keySoftness: 0.25,
  fillSoftness: 0.45,
  coreSoftness: 0.4,
  axisSoftness: 0.35,
  bloomStrength: 0.28,
  bloomThreshold: 0.27,
  bloomRadius: 0.27,
  toneExposure: 1.18,
  keyPosition: { x: -6.74, y: 12.11, z: 1.72 },
  fillPosition: { x: 0.64, y: 3.92, z: 1.43 },
  corePosition: { x: -5.56, y: 0.97, z: 0 },
  axisLightPosition: { x: 0, y: 1.65, z: 0 }
};

export function cloneGlowLightSettings(source = DEFAULT_GLOW_LIGHT_SETTINGS) {
  return {
    ...source,
    keyPosition: { ...source.keyPosition },
    fillPosition: { ...source.fillPosition },
    corePosition: { ...source.corePosition },
    axisLightPosition: { ...source.axisLightPosition }
  };
}
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
  outerRadius: 0.011,
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
/** 粒子效果模式中的点云颜色 RGB(194, 168, 144) */
export const PARTICLE_EFFECT_COLOR = '#C2A890';
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

/** 背景 J/Z/X/+ 电视式闪烁 */
export const GLITCH_BG = {
  chars: ['J', 'Z', 'X', '+'],
  slotCount: 24,
  color: '#907647',
  fontSizeMin: 12,
  fontSizeMax: 22,
  opacityMin: 0.18,
  opacityMax: 0.42,
  idleMinMs: 1200,
  idleMaxMs: 4000,
  tickMinMs: 100,
  tickMaxMs: 180,
  flashFlickersMin: 3,
  flashFlickersMax: 5,
  holdMs: 1000,
  edgeInsetPx: 16
};
