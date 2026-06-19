import { GRID } from '../config/constants.js';
import { state } from '../state/appState.js';

const TAU = Math.PI * 2;

export function createGridRevealMaterial(startAngle = 0) {
  const color = new THREE.Color(GRID.color);

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: state.gridSettings.brightness },
      uMaxRadius: { value: state.gridSettings.maxRadius },
      uRingCount: { value: state.gridSettings.ringCount },
      uRadialCount: { value: state.gridSettings.radialCount },
      uLineWidth: { value: state.gridSettings.lineWidth },
      uOuterRingSweepAngle: { value: 0 },
      uInnerRevealRadius: { value: 0 },
      uStartAngle: { value: startAngle },
      uDashLength: { value: 0.1 },
      uDashRatio: { value: 0.48 },
      uRevealOpacity: { value: 1 }
    },
    vertexShader: `
      precision mediump float;
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      precision mediump float;

      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uMaxRadius;
      uniform float uRingCount;
      uniform float uRadialCount;
      uniform float uLineWidth;
      uniform float uOuterRingSweepAngle;
      uniform float uInnerRevealRadius;
      uniform float uStartAngle;
      uniform float uDashLength;
      uniform float uDashRatio;
      uniform float uRevealOpacity;

      varying vec3 vWorldPos;

      const float TAU = 6.28318530718;
      const float PI = 3.14159265359;

      float angularDiff(float a, float b) {
        float d = abs(mod(a - b + PI, TAU) - PI);
        return d;
      }

      bool inOuterSweep(float angleCCW) {
        return uOuterRingSweepAngle >= TAU - 0.001
          || (uOuterRingSweepAngle > 0.001 && angleCCW <= uOuterRingSweepAngle);
      }

      void main() {
        vec2 p = vWorldPos.xz;
        float r = length(p);
        if (r > uMaxRadius + uLineWidth) discard;

        float worldAngle = atan(p.x, p.y);
        float angleCCW = mod(uStartAngle - worldAngle + TAU, TAU);

        float halfWidth = uLineWidth * 0.55;
        float onLine = 0.0;
        float solidMix = 1.0;
        float dashCoord = 0.0;
        float lineAlpha = 1.0;

        float ringStep = uMaxRadius / uRingCount;
        float ringR1 = ringStep;
        float ringR2 = ringStep * 2.0;
        float ringR3 = ringStep * 3.0;
        float outerRingR = ringStep * uRingCount;

        bool onOuterRing = abs(r - outerRingR) <= halfWidth;
        bool onRing1 = uRingCount >= 1.0 && abs(r - ringR1) <= halfWidth && ringR1 < outerRingR - 0.001;
        bool onRing2 = uRingCount >= 2.0 && abs(r - ringR2) <= halfWidth && ringR2 < outerRingR - 0.001;

        float radialStep = TAU / uRadialCount;
        float snapped = floor((worldAngle + radialStep * 0.5) / radialStep) * radialStep;
        float radialDiff = angularDiff(worldAngle, snapped);
        bool onRadial = radialDiff <= halfWidth / max(r, 0.08) && r <= uMaxRadius && r < outerRingR - halfWidth;

        if (onOuterRing) {
          bool swept = inOuterSweep(angleCCW);
          if (!swept && uOuterRingSweepAngle <= 0.001) discard;
          onLine = 1.0;
          solidMix = swept ? 1.0 : 0.0;
          dashCoord = angleCCW * max(outerRingR, 0.001);
        } else if (onRing1 || onRing2 || onRadial) {
          if (uInnerRevealRadius <= 0.001) discard;

          float ringR = onRing1 ? ringR1 : ringR2;
          if (onRing1 || onRing2) {
            float ringMask = smoothstep(ringR - halfWidth * 1.5, ringR + halfWidth * 0.5, uInnerRevealRadius);
            if (ringMask <= 0.001) discard;
            onLine = 1.0;
            lineAlpha = ringMask;
            dashCoord = angleCCW * max(ringR, 0.001);
          } else if (onRadial) {
            float radialMask = 1.0 - smoothstep(uInnerRevealRadius - halfWidth * 2.0, uInnerRevealRadius + halfWidth, r);
            if (radialMask <= 0.001) discard;
            onLine = 1.0;
            lineAlpha = radialMask;
            dashCoord = r;
          }
        }

        if (onLine < 0.5) discard;

        if (solidMix < 0.5) {
          float phase = mod(dashCoord, uDashLength);
          if (phase >= uDashLength * uDashRatio) discard;
        }

        float alpha = mix(uOpacity * 0.18, uOpacity, solidMix) * uRevealOpacity * lineAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

export function getGridRevealStartAngle(baseVerts) {
  if (!baseVerts?.length) return 0;
  const v = baseVerts[0];
  return Math.atan2(v.x, v.z);
}

export function syncGridRevealUniforms(material) {
  if (!material?.uniforms) return;
  const s = state.gridSettings;
  material.uniforms.uMaxRadius.value = s.maxRadius;
  material.uniforms.uRingCount.value = s.ringCount;
  material.uniforms.uRadialCount.value = s.radialCount;
  material.uniforms.uLineWidth.value = s.lineWidth;
  material.uniforms.uOpacity.value = s.brightness;
}

export function setGridRevealOuterSweep(material, contourProgress) {
  if (!material?.uniforms) return;
  material.uniforms.uOuterRingSweepAngle.value = clamp01(contourProgress) * TAU;
}

export function setGridRevealInnerRadius(material, innerProgress) {
  if (!material?.uniforms) return;
  const maxR = state.gridSettings.maxRadius;
  material.uniforms.uInnerRevealRadius.value = clamp01(innerProgress) * maxR;
  if (clamp01(innerProgress) > 0.001) {
    material.uniforms.uOuterRingSweepAngle.value = TAU;
  }
}

/** @deprecated use setGridRevealOuterSweep */
export function setGridRevealSweep(material, contourProgress) {
  setGridRevealOuterSweep(material, contourProgress);
}

export function setGridRevealFade(material, revealOpacity, solidFade = null) {
  if (!material?.uniforms) return;
  material.uniforms.uRevealOpacity.value = revealOpacity;
  if (solidFade !== null && state.gridMaterial) {
    state.gridMaterial.opacity = state.gridSettings.brightness * solidFade;
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
