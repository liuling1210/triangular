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
      uSweepAngle: { value: 0 },
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
      uniform float uSweepAngle;
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

      void main() {
        vec2 p = vWorldPos.xz;
        float r = length(p);
        if (r > uMaxRadius + uLineWidth) discard;

        float worldAngle = atan(p.x, p.y);
        float angleCCW = mod(uStartAngle - worldAngle + TAU, TAU);

        bool inSweep = uSweepAngle >= TAU - 0.001 || (uSweepAngle > 0.001 && angleCCW <= uSweepAngle);
        float solidMix = inSweep ? 1.0 : 0.0;

        float lineWidth = mix(uLineWidth * 0.26, uLineWidth, solidMix);
        float halfWidth = lineWidth * 0.55;
        float onLine = 0.0;
        float dashCoord = 0.0;

        float ringStep = uMaxRadius / uRingCount;
        float ringR1 = ringStep;
        float ringR2 = ringStep * 2.0;
        float ringR3 = ringStep * 3.0;

        if (uRingCount >= 1.0 && abs(r - ringR1) <= halfWidth) {
          onLine = 1.0;
          dashCoord = angleCCW * max(ringR1, 0.001);
        }
        if (uRingCount >= 2.0 && abs(r - ringR2) <= halfWidth) {
          onLine = 1.0;
          dashCoord = angleCCW * max(ringR2, 0.001);
        }
        if (uRingCount >= 3.0 && abs(r - ringR3) <= halfWidth) {
          onLine = 1.0;
          dashCoord = angleCCW * max(ringR3, 0.001);
        }

        float radialStep = TAU / uRadialCount;
        float snapped = floor((worldAngle + radialStep * 0.5) / radialStep) * radialStep;
        float radialDiff = angularDiff(worldAngle, snapped);
        if (radialDiff <= halfWidth / max(r, 0.08) && r <= uMaxRadius) {
          onLine = 1.0;
          dashCoord = r;
        }

        if (onLine < 0.5) discard;

        if (solidMix < 0.5) {
          float phase = mod(dashCoord, uDashLength);
          if (phase >= uDashLength * uDashRatio) discard;
        }

        float alpha = mix(uOpacity * 0.18, uOpacity, solidMix) * uRevealOpacity;
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

export function setGridRevealSweep(material, contourProgress) {
  if (!material?.uniforms) return;
  material.uniforms.uSweepAngle.value = clamp01(contourProgress) * TAU;
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
