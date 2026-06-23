/** 棱边流光 ShaderMaterial 的创建与颜色/动画 uniform 同步 */
import { DEFAULT_PYRAMID_COLOR } from '../config/constants.js';
import { state } from '../state/appState.js';

/** 创建内外棱边流光 ShaderMaterial（isCore 区分核心/外层样式） */
export function createEdgeFlowMaterial(isCore, phase = 0) {
  const settings = state.edgeFlowSettings;

  return new THREE.ShaderMaterial({
    uniforms: {
      uBaseColor: { value: new THREE.Color(DEFAULT_PYRAMID_COLOR) },
      uGlowColor: { value: new THREE.Color(DEFAULT_PYRAMID_COLOR) },
      uTime: { value: 0 },
      uSpeed: { value: settings.speed },
      uPhase: { value: phase },
      uBandWidth: { value: settings.bandWidth },
      uIntensity: { value: 1 },
      uOpacity: { value: settings.opacity },
      uEndFadeBottom: { value: settings.endFadeBottom },
      uEndFadeTop: { value: settings.endFadeTop },
      uCore: { value: isCore ? 1 : 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uGlowColor;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uPhase;
      uniform float uBandWidth;
      uniform float uIntensity;
      uniform float uOpacity;
      uniform float uEndFadeBottom;
      uniform float uEndFadeTop;
      uniform float uCore;
      varying vec2 vUv;

      void main() {
        float along = vUv.x;
        float endFade = smoothstep(0.0, uEndFadeBottom, along)
          * smoothstep(1.0, 1.0 - uEndFadeTop, along);
        float radialDist = abs(vUv.y - 0.5) * 2.0;
        float radial = 1.0 - smoothstep(0.0, 1.0, radialDist);
        radial = pow(radial, uCore > 0.5 ? 2.4 : 1.75);

        float band1 = fract(along - uTime * uSpeed + uPhase);
        float pulse1 = smoothstep(0.0, uBandWidth, band1)
          * smoothstep(uBandWidth * 4.5, uBandWidth * 1.8, band1);

        float band2 = fract(along - uTime * uSpeed * 0.62 + 0.38 + uPhase);
        float pulse2 = smoothstep(0.0, uBandWidth * 0.85, band2)
          * smoothstep(uBandWidth * 4.0, uBandWidth * 1.5, band2) * 0.5;

        float flow = pulse1 + pulse2;

        vec3 col;
        float alpha;

        if (uCore > 0.5) {
          col = uGlowColor * radial * uIntensity * (0.55 + flow * 0.65);
          col += vec3(1.0) * flow * radial * 0.18 * uIntensity;
          alpha = radial * uOpacity * (0.75 + flow * 0.25);
        } else {
          col = uBaseColor * radial * 0.22 * uIntensity;
          col += uGlowColor * flow * radial * uIntensity * 1.15;
          col += uGlowColor * radial * 0.18 * uIntensity;
          alpha = (0.12 + flow * 0.88) * radial * uOpacity;
        }

        col *= endFade;
        alpha *= endFade;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
}

/** 更新边流光材质的基色与发光色 uniform */
export function applyEdgeFlowShaderColors(materials, hexColor) {
  if (!materials) return;
  const list = Array.isArray(materials) ? materials : [materials];
  const color = new THREE.Color(hexColor);
  list.forEach((material) => {
    material.uniforms.uBaseColor.value.copy(color);
    material.uniforms.uGlowColor.value.copy(color);
  });
}

/** 同步边流光颜色、亮度与不透明度 uniform */
export function applyEdgeFlowColors(materials, hexColor, brightness, opacity) {
  if (!materials) return;
  const list = Array.isArray(materials) ? materials : [materials];
  applyEdgeFlowShaderColors(list, hexColor);
  list.forEach((material) => {
    material.uniforms.uIntensity.value = brightness;
    material.uniforms.uOpacity.value = opacity;
  });
}

/** 从全局 edgeFlowSettings 同步速度、带宽与端部渐隐 uniform */
export function applyEdgeFlowUniforms(materials) {
  if (!materials) return;
  const list = Array.isArray(materials) ? materials : [materials];
  const settings = state.edgeFlowSettings;
  list.forEach((material) => {
    material.uniforms.uSpeed.value = settings.speed;
    material.uniforms.uBandWidth.value = settings.bandWidth;
    material.uniforms.uEndFadeBottom.value = settings.endFadeBottom;
    material.uniforms.uEndFadeTop.value = settings.endFadeTop;
  });
}
