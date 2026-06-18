import {
  DEFAULT_PYRAMID_COLOR,
  DEFAULT_BRIGHTNESS,
  DEFAULT_SLICE_GRADIENTS,
  DEFAULT_SLICE_OPACITY,
  DEFAULT_AXIS_SETTINGS
} from '../config/constants.js';

export const state = {
  pyramidColorHex: DEFAULT_PYRAMID_COLOR,
  pyramidBrightness: DEFAULT_BRIGHTNESS,
  sliceGradients: DEFAULT_SLICE_GRADIENTS.map((g) => ({ ...g })),
  sliceOpacity: { ...DEFAULT_SLICE_OPACITY },
  axisSettings: { ...DEFAULT_AXIS_SETTINGS },
  pyramidMats: {},
  pyramidLights: {},
  bloomPass: null,
  fxaaPass: null,
  labelElements: [],
  clock: null,
  pyramidApex: null,
  internalParticleGeo: null,
  internalParticleStreams: [],
  vertexParticleGeo: null,
  vertexParticleStreams: [],
  scene: null,
  camera: null,
  renderer: null,
  labelRenderer: null,
  controls: null,
  composer: null
};
