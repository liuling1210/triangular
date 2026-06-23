/** 根据柔光参数同步主光与伴生柔光的衰减、距离与强度 */
import { TOP_DOWN_LIGHT_SCALES } from '../config/constants.js';
import { state } from '../state/appState.js';
import { lerp } from './math.js';

const DIRECTIONAL_SOFT = {
  key: { distance: [8, 24], companionRatio: 0.75 },
  fill: { distance: [6, 18], companionRatio: 0.7 }
};

const POINT_SOFT = {
  core: { distance: [12, 30], companionDistance: [20, 40], companionRatio: 0.55 },
  axis: { distance: [6, 18], companionDistance: [12, 28], companionRatio: 0.5 }
};

/** 更新平行光（key/fill）主光与伴生柔光的衰减、距离与强度 */
function applyDirectionalSoftness(lightKey, intensity, topDownScale = 1) {
  const lights = state.pyramidLights;
  const settings = state.glowLightSettings;
  const main = lights[lightKey];
  const soft = lights[`${lightKey}Soft`];
  if (!main || !soft) return;

  const softness = settings[`${lightKey}Softness`];
  const config = DIRECTIONAL_SOFT[lightKey];
  const scaledIntensity = intensity * state.pyramidBrightness * topDownScale;

  soft.color.copy(main.color);
  soft.intensity = scaledIntensity * softness * config.companionRatio;
  soft.decay = lerp(2, 0.35, softness);
  soft.distance = lerp(config.distance[0], config.distance[1], softness);
  soft.position.copy(main.position);
}

/** 更新点光源（core/axis）主光与伴生柔光的衰减、距离与强度 */
function applyPointSoftness(lightKey, intensity, topDownScale = 1) {
  const lights = state.pyramidLights;
  const settings = state.glowLightSettings;
  const main = lights[lightKey];
  const soft = lights[`${lightKey}Soft`];
  if (!main || !soft) return;

  const softness = settings[`${lightKey}Softness`];
  const config = POINT_SOFT[lightKey];
  const scaledIntensity = intensity * state.pyramidBrightness * topDownScale;

  main.decay = lerp(2, 0.45, softness);
  main.distance = lerp(config.distance[0], config.distance[1], softness);

  soft.color.copy(main.color);
  soft.intensity = scaledIntensity * softness * config.companionRatio;
  soft.decay = lerp(2, 0.15, softness);
  soft.distance = lerp(config.companionDistance[0], config.companionDistance[1], softness);
  soft.position.copy(main.position);
}

/** 根据俯视混合度与柔光设置，统一更新环境光及各类主/伴生光参数 */
export function applyLightSoftness(topDownBlend) {
  const lights = state.pyramidLights;
  const settings = state.glowLightSettings;

  if (lights.ambientHemisphere) {
    const softness = settings.ambientSoftness;
    const ambientScale = lerp(1, TOP_DOWN_LIGHT_SCALES.ambient, topDownBlend);
    lights.ambientHemisphere.intensity = settings.ambientIntensity
      * state.pyramidBrightness
      * ambientScale
      * lerp(0, 0.85, softness);
  }

  applyDirectionalSoftness(
    'key',
    settings.keyIntensity,
    lerp(1, TOP_DOWN_LIGHT_SCALES.key, topDownBlend)
  );
  applyDirectionalSoftness('fill', settings.fillIntensity);
  applyPointSoftness(
    'core',
    settings.coreIntensity,
    lerp(1, TOP_DOWN_LIGHT_SCALES.core, topDownBlend)
  );
  applyPointSoftness(
    'axis',
    state.axisSettings.lightIntensity,
    lerp(1, TOP_DOWN_LIGHT_SCALES.axis, topDownBlend)
  );
}
