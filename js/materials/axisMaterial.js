/** 中轴 MeshPhysicalMaterial 的创建与沿高度垂直渐变 shader 注入 */
import {
  DEFAULT_AXIS_SETTINGS,
  SOLID_BOTTOM_HEIGHT,
  SHAFT_CYL_HEIGHT,
  SHAFT_TIP_HEIGHT
} from '../config/constants.js';

const AXIS_SHAFT_BASE_Y = SOLID_BOTTOM_HEIGHT;
const AXIS_SHAFT_TOP_Y = SHAFT_CYL_HEIGHT + SHAFT_TIP_HEIGHT;

/** 从轴设置中解析渐变参数，缺失项回退到默认值 */
function getGradientSettings(settings = DEFAULT_AXIS_SETTINGS) {
  return {
    endDarkness: settings.gradientEndDarkness ?? DEFAULT_AXIS_SETTINGS.gradientEndDarkness,
    center: settings.gradientCenter ?? DEFAULT_AXIS_SETTINGS.gradientCenter,
    halfWidth: settings.gradientHalfWidth ?? DEFAULT_AXIS_SETTINGS.gradientHalfWidth,
    strength: settings.gradientStrength ?? DEFAULT_AXIS_SETTINGS.gradientStrength
  };
}

/** 为材质注入沿轴高度方向的垂直渐变 onBeforeCompile 补丁 */
function attachAxisVerticalGradient(material, settings = DEFAULT_AXIS_SETTINGS) {
  material.userData.axisGradientSettings = getGradientSettings(settings);

  material.onBeforeCompile = (shader) => {
    material.userData.axisShader = shader;
    const gradient = material.userData.axisGradientSettings;

    shader.uniforms.uShaftBaseY = { value: AXIS_SHAFT_BASE_Y };
    shader.uniforms.uShaftTopY = { value: AXIS_SHAFT_TOP_Y };
    shader.uniforms.uGradientCenter = { value: gradient.center };
    shader.uniforms.uGradientHalfWidth = { value: gradient.halfWidth };
    shader.uniforms.uGradientEndDarkness = { value: gradient.endDarkness };
    shader.uniforms.uGradientStrength = { value: gradient.strength };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uShaftBaseY;
      uniform float uShaftTopY;
      varying float vAxisHeightT;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <skinning_vertex>',
      `#include <skinning_vertex>
      vec4 axisWorldPos = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        axisWorldPos = instanceMatrix * axisWorldPos;
      #endif
      axisWorldPos = modelMatrix * axisWorldPos;
      vAxisHeightT = clamp(
        (axisWorldPos.y - uShaftBaseY) / max(uShaftTopY - uShaftBaseY, 0.001),
        0.0,
        1.0
      );`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      varying float vAxisHeightT;
      uniform float uGradientCenter;
      uniform float uGradientHalfWidth;
      uniform float uGradientEndDarkness;
      uniform float uGradientStrength;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <aomap_fragment>\n\tvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;',
      `#include <aomap_fragment>
\tvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
\t{
\t\tfloat axisDist = abs(vAxisHeightT - uGradientCenter);
\t\tfloat axisFalloff = smoothstep(0.0, uGradientHalfWidth, axisDist);
\t\tfloat axisRaw = mix(1.0, uGradientEndDarkness, axisFalloff);
\t\toutgoingLight *= mix(1.0, axisRaw, uGradientStrength);
\t}`
    );
  };

  material.customProgramCacheKey = () => {
    const g = material.userData.axisGradientSettings;
    return [
      'axisVerticalGradient',
      g.center,
      g.halfWidth,
      g.endDarkness,
      g.strength
    ].join('-');
  };

  material.needsUpdate = true;
}

/** 将渐变 uniform 同步到已编译的轴材质 shader */
export function applyAxisGradientUniforms(material, settings = DEFAULT_AXIS_SETTINGS) {
  if (!material) return;

  const gradient = getGradientSettings(settings);
  material.userData.axisGradientSettings = gradient;

  const shader = material.userData.axisShader;
  if (!shader?.uniforms) return;

  shader.uniforms.uGradientCenter.value = gradient.center;
  shader.uniforms.uGradientHalfWidth.value = gradient.halfWidth;
  shader.uniforms.uGradientEndDarkness.value = gradient.endDarkness;
  shader.uniforms.uGradientStrength.value = gradient.strength;
}

/** 创建带垂直渐变 shader 的中轴 MeshPhysicalMaterial */
export function createAxisPhysicalMaterial(settings = DEFAULT_AXIS_SETTINGS) {
  const material = new THREE.MeshPhysicalMaterial({
    color: settings.color,
    metalness: settings.metalness,
    roughness: settings.roughness,
    emissive: new THREE.Color(settings.color),
    emissiveIntensity: settings.emissiveIntensity,
    clearcoat: settings.clearcoat,
    clearcoatRoughness: settings.clearcoatRoughness,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide
  });

  attachAxisVerticalGradient(material, settings);
  return material;
}
