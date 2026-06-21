import { GRID, GRID_MAX_RINGS, getGridRingRadii, syncGridDerivedSettings } from '../config/constants.js';
import { state } from '../state/appState.js';

const TAU = Math.PI * 2;

function syncRingRadiusUniforms(material, settings) {
  syncGridDerivedSettings(settings);
  const radii = getGridRingRadii(settings);
  const outer = radii[radii.length - 1] ?? settings.maxRadius;
  const ringArray = material.uniforms.uRingRadii.value;

  for (let i = 0; i < GRID_MAX_RINGS; i++) {
    ringArray[i] = i < radii.length ? radii[i] : 0;
  }

  material.uniforms.uRingCount.value = radii.length;
  material.uniforms.uOuterRingR.value = outer;
  material.uniforms.uMaxRadius.value = outer;
}

export function createGridRevealMaterial(startAngle = 0) {
  const color = new THREE.Color(GRID.color);
  const settings = state.gridSettings;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uOpacity: { value: settings.brightness },
      uMaxRadius: { value: settings.maxRadius },
      uRingCount: { value: settings.ringCount },
      uRingRadii: { value: new Float32Array(GRID_MAX_RINGS) },
      uOuterRingR: { value: settings.maxRadius },
      uRadialCount: { value: settings.radialCount },
      uLineWidth: { value: settings.lineWidth },
      uOuterRingSweepAngle: { value: 0 },
      uInnerRevealRadius: { value: 0 },
      uStartAngle: { value: startAngle },
      uDashLength: { value: 0.1 },
      uDashRatio: { value: 0.48 },
      uOuterRingSolidMix: { value: 0 },
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
      uniform float uRingRadii[${GRID_MAX_RINGS}];
      uniform float uOuterRingR;
      uniform float uRadialCount;
      uniform float uLineWidth;
      uniform float uOuterRingSweepAngle;
      uniform float uInnerRevealRadius;
      uniform float uStartAngle;
      uniform float uDashLength;
      uniform float uDashRatio;
      uniform float uOuterRingSolidMix;
      uniform float uRevealOpacity;

      varying vec3 vWorldPos;

      const float TAU = 6.28318530718;
      const float PI = 3.14159265359;
      const int MAX_RINGS = ${GRID_MAX_RINGS};

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

        bool onOuterRing = abs(r - uOuterRingR) <= halfWidth;

        bool onInnerRing = false;
        float hitRingR = 0.0;
        for (int i = 0; i < MAX_RINGS; i++) {
          if (float(i) >= uRingCount - 1.0) continue;
          float ringR = uRingRadii[i];
          if (ringR >= uOuterRingR - 0.001) continue;
          if (abs(r - ringR) <= halfWidth) {
            onInnerRing = true;
            hitRingR = ringR;
          }
        }

        float radialStep = TAU / uRadialCount;
        float snapped = floor((worldAngle + radialStep * 0.5) / radialStep) * radialStep;
        float radialDiff = angularDiff(worldAngle, snapped);
        bool onRadial = radialDiff <= halfWidth / max(r, 0.08) && r <= uMaxRadius && r < uOuterRingR - halfWidth;

        if (onOuterRing) {
          bool swept = inOuterSweep(angleCCW);
          bool fullRing = uOuterRingSweepAngle >= TAU - 0.001;
          if (!swept && !fullRing) discard;
          onLine = 1.0;
          solidMix = uOuterRingSolidMix;
          dashCoord = angleCCW * max(uOuterRingR, 0.001);
        } else if (onInnerRing || onRadial) {
          if (uInnerRevealRadius <= 0.001) discard;

          if (onInnerRing) {
            float ringMask = smoothstep(hitRingR - halfWidth * 1.5, hitRingR + halfWidth * 0.5, uInnerRevealRadius);
            if (ringMask <= 0.001) discard;
            onLine = 1.0;
            lineAlpha = ringMask;
            solidMix = 1.0;
          } else if (onRadial) {
            float radialMask = 1.0 - smoothstep(uInnerRevealRadius - halfWidth * 2.0, uInnerRevealRadius + halfWidth, r);
            if (radialMask <= 0.001) discard;
            onLine = 1.0;
            lineAlpha = radialMask;
            solidMix = 1.0;
          }
        }

        if (onLine < 0.5) discard;

        if (solidMix < 0.5) {
          float phase = mod(dashCoord, uDashLength);
          if (phase >= uDashLength * uDashRatio) discard;
        }

        float alpha = mix(uOpacity * 0.45, uOpacity, solidMix) * uRevealOpacity * lineAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  syncRingRadiusUniforms(material, settings);
  return material;
}

export function getGridRevealStartAngle(baseVerts) {
  if (!baseVerts?.length) return 0;
  const v = baseVerts[0];
  return Math.atan2(v.x, v.z);
}

export function syncGridRevealUniforms(material) {
  if (!material?.uniforms) return;
  const s = state.gridSettings;
  material.uniforms.uRadialCount.value = s.radialCount;
  material.uniforms.uLineWidth.value = s.lineWidth;
  material.uniforms.uOpacity.value = s.brightness;
  syncRingRadiusUniforms(material, s);
}

export function setGridRevealOuterSweep(material, contourProgress) {
  if (!material?.uniforms) return;
  material.uniforms.uOuterRingSweepAngle.value = clamp01(contourProgress) * TAU;
  material.uniforms.uOuterRingSolidMix.value = 0;
}

function smootherstep(t) {
  t = clamp01(t);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 内圈揭示抵达外圈时，外圈由虚线渐变为实线 */
const OUTER_RING_SOLID_START = 0.9;

export function setGridRevealInnerRadius(material, innerProgress) {
  if (!material?.uniforms) return;
  syncGridDerivedSettings(state.gridSettings);
  const maxR = state.gridSettings.maxRadius;
  const p = clamp01(innerProgress);
  material.uniforms.uInnerRevealRadius.value = p * maxR;
  if (p > 0.001) {
    material.uniforms.uOuterRingSweepAngle.value = TAU;
  }

  const solidT = p >= 0.999
    ? 1
    : smootherstep(clamp01((p - OUTER_RING_SOLID_START) / (1 - OUTER_RING_SOLID_START)));
  material.uniforms.uOuterRingSolidMix.value = solidT;
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
