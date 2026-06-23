/** 根据相机俯视程度自适应调整底座材质、灯光与 Bloom 后处理 */
import {
  TOP_DOWN_BLOOM,
  TOP_DOWN_FOOT_OVERRIDES,
  TOP_DOWN_LIGHT_SCALES
} from '../config/constants.js';
import { state } from '../state/appState.js';
import { getCameraTopDownBlend } from './cameraPreset.js';
import { applyLightSoftness } from './lightSoftness.js';
import { lerp, clamp01, smootherstep } from './math.js';

/** 底面实心 → 相机 → 外壳 结束后、中轴开始前 Bloom 应已达正式强度 */
const REVEAL_BLOOM_RAMP_END_OFFSET = 1.25 + 1.2 + 1.4;

/** 根据初始揭示进度计算 Bloom 强度倍率（从 0.65 渐升至 1） */
function getInitialRevealBloomMultiplier() {
  const reveal = state.initialReveal;
  if (!reveal || !state.clock || reveal.startTime == null) return 1;

  const elapsed = state.clock.getElapsedTime() - reveal.startTime;
  const baseStart = reveal.baseSolidStartTime;
  const rampEnd = baseStart == null
    ? reveal.duration
    : baseStart + REVEAL_BLOOM_RAMP_END_OFFSET;

  return lerp(0.65, 1, smootherstep(clamp01(elapsed / Math.max(rampEnd, 0.001))));
}

/** 返回当前视角的俯视混合度（0 正视，1 俯视） */
export function getViewTopDownBlend() {
  return getCameraTopDownBlend(state.camera, state.controls?.target);
}

/** 返回考虑金字塔亮度的完整 Bloom 强度 */
export function getFullBloomStrength() {
  return state.glowLightSettings.bloomStrength * state.pyramidBrightness;
}

/** 返回揭示阶段底座自发光强度（含俯视插值） */
export function getFootEmissiveIntensityForReveal() {
  const blend = getViewTopDownBlend();
  return lerp(
    state.footSettings.emissiveIntensity,
    TOP_DOWN_FOOT_OVERRIDES.emissiveIntensity,
    blend
  );
}

/** 按俯视混合度插值更新底座 solid/base 材质的颜色与 PBR 参数 */
export function applyFootViewMaterials(topDownBlend, { applyIntensity = true } = {}) {
  const settings = state.footSettings;
  const overrides = TOP_DOWN_FOOT_OVERRIDES;

  [state.pyramidMats.solid, state.pyramidMats.base].forEach((mat) => {
    if (!mat) return;

    const baseColor = new THREE.Color(settings.color);
    const brightness = lerp(settings.colorBrightness, overrides.colorBrightness, topDownBlend);
    const surfaceColor = baseColor.clone().multiplyScalar(brightness);
    const emissiveColor = baseColor.clone().multiplyScalar(settings.emissiveStrength);

    mat.color.copy(surfaceColor);
    mat.emissive.copy(emissiveColor);
    mat.metalness = lerp(settings.metalness, overrides.metalness, topDownBlend);
    mat.roughness = lerp(settings.roughness, overrides.roughness, topDownBlend);
    mat.clearcoat = lerp(settings.clearcoat, overrides.clearcoat, topDownBlend);
    mat.clearcoatRoughness = lerp(
      settings.clearcoatRoughness,
      overrides.clearcoatRoughness,
      topDownBlend
    );
    mat.needsUpdate = true;
  });

  if (applyIntensity) {
    const intensity = lerp(
      settings.emissiveIntensity,
      overrides.emissiveIntensity,
      topDownBlend
    ) * state.pyramidBrightness;
    if (state.pyramidMats.solid) {
      state.pyramidMats.solid.emissiveIntensity = intensity;
    }
    if (state.pyramidMats.base) {
      state.pyramidMats.base.emissiveIntensity = intensity;
    }
  }
}

/** 按俯视混合度更新各主光源强度与位置，并触发柔光同步 */
export function applyViewAdaptiveLights(topDownBlend) {
  const lights = state.pyramidLights;
  const brightness = state.pyramidBrightness;
  const settings = state.glowLightSettings;

  if (lights.core) {
    lights.core.intensity = settings.coreIntensity * brightness
      * lerp(1, TOP_DOWN_LIGHT_SCALES.core, topDownBlend);
    lights.core.position.set(
      settings.corePosition.x,
      settings.corePosition.y,
      settings.corePosition.z
    );
  }
  if (lights.key) {
    lights.key.intensity = settings.keyIntensity * brightness
      * lerp(1, TOP_DOWN_LIGHT_SCALES.key, topDownBlend);
    lights.key.position.set(
      settings.keyPosition.x,
      settings.keyPosition.y,
      settings.keyPosition.z
    );
  }
  if (lights.fill) {
    lights.fill.intensity = settings.fillIntensity * brightness;
    lights.fill.position.set(
      settings.fillPosition.x,
      settings.fillPosition.y,
      settings.fillPosition.z
    );
  }
  if (lights.ambient) {
    lights.ambient.intensity = settings.ambientIntensity
      * lerp(1, TOP_DOWN_LIGHT_SCALES.ambient, topDownBlend);
  }
  if (lights.axis) {
    lights.axis.intensity = state.axisSettings.lightIntensity * brightness
      * lerp(1, TOP_DOWN_LIGHT_SCALES.axis, topDownBlend);
    lights.axis.position.set(
      settings.axisLightPosition.x,
      settings.axisLightPosition.y,
      settings.axisLightPosition.z
    );
  }

  applyLightSoftness(topDownBlend);
}

/** 按俯视混合度与揭示倍率更新 Bloom 后处理的强度与阈值 */
export function applyViewAdaptiveBloom(topDownBlend, revealMultiplier = 1) {
  const bloom = state.bloomPass;
  if (!bloom) return;

  const settings = state.glowLightSettings;
  const strengthScale = lerp(1, TOP_DOWN_BLOOM.strengthScale, topDownBlend);
  bloom.strength = settings.bloomStrength * state.pyramidBrightness * strengthScale * revealMultiplier;
  bloom.threshold = lerp(settings.bloomThreshold, TOP_DOWN_BLOOM.threshold, topDownBlend);
  bloom.radius = settings.bloomRadius;
}

/** 每帧统一更新底座材质、灯光与 Bloom 的视角自适应状态 */
export function updateViewAdaptation() {
  const topDownBlend = getViewTopDownBlend();
  const skipEmissiveIntensity = Boolean(state.initialReveal) && !state.initialReveal.pastAxisPhase;

  applyFootViewMaterials(topDownBlend, { applyIntensity: !skipEmissiveIntensity });
  applyViewAdaptiveLights(topDownBlend);
  applyViewAdaptiveBloom(topDownBlend, getInitialRevealBloomMultiplier());
}
