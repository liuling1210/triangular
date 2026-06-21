import {
  SHAFT_RADIUS,
  SHAFT_CYL_HEIGHT,
  SHAFT_TIP_HEIGHT,
  SOLID_BOTTOM_HEIGHT
} from '../config/constants.js';

export function createGradientSliceMaterial(centroid, maxDist, grad, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      colorStart: { value: new THREE.Color(grad.start) },
      colorEnd: { value: new THREE.Color(grad.end) },
      uCentroid: { value: centroid.clone() },
      uMaxDist: { value: maxDist },
      uOpacityCenter: { value: opacity.opacityCenter },
      uOpacityEdge: { value: opacity.opacityEdge },
      uFadeRange: { value: opacity.fadeRange },
      uIntensity: { value: 1.0 },
      uRevealRadius: { value: 1.2 },
      uRevealSoftness: { value: 0.15 },
      uShaftRadius: { value: SHAFT_RADIUS },
      uShaftCylHeight: { value: SHAFT_CYL_HEIGHT },
      uShaftTipHeight: { value: SHAFT_TIP_HEIGHT },
      uShaftBaseY: { value: SOLID_BOTTOM_HEIGHT }
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 colorStart;
      uniform vec3 colorEnd;
      uniform vec3 uCentroid;
      uniform float uMaxDist;
      uniform float uOpacityCenter;
      uniform float uOpacityEdge;
      uniform float uFadeRange;
      uniform float uIntensity;
      uniform float uRevealRadius;
      uniform float uRevealSoftness;
      uniform float uShaftRadius;
      uniform float uShaftCylHeight;
      uniform float uShaftTipHeight;
      uniform float uShaftBaseY;
      varying vec3 vPos;

      float pillarRadiusAt(float y) {
        float shaftTop = uShaftCylHeight + uShaftTipHeight;
        if (y < uShaftBaseY || y > shaftTop) return 0.0;
        if (y <= uShaftCylHeight) return uShaftRadius;
        return uShaftRadius * (1.0 - (y - uShaftCylHeight) / uShaftTipHeight);
      }

      void main() {
        if (length(vPos.xz) < pillarRadiusAt(vPos.y)) discard;

        float radial = clamp(length(vPos - uCentroid) / uMaxDist, 0.0, 1.0);
        float revealMask = 1.0 - smoothstep(uRevealRadius - uRevealSoftness, uRevealRadius, radial);
        if (revealMask <= 0.001) discard;

        float edgeGlow = pow(radial, 1.55);
        vec3 col = mix(colorStart, colorEnd, edgeGlow);
        col += colorEnd * pow(edgeGlow, 2.8) * 0.45 * uIntensity;
        col = max(col, colorStart * 0.55 + vec3(0.035));
        col *= uIntensity * revealMask;
        float inner = 1.0 - uFadeRange;
        float fadeT = smoothstep(inner, 1.0, radial);
        float alpha = mix(uOpacityCenter, uOpacityEdge, fadeT) * revealMask;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending
  });
}
