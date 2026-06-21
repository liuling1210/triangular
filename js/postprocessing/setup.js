import { BASE_BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD } from '../config/constants.js';
import { state } from '../state/appState.js';

export function setupPostProcessing() {
  state.composer = new THREE.EffectComposer(state.renderer);
  state.composer.addPass(new THREE.RenderPass(state.scene, state.camera));

  state.bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BASE_BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD
  );
  state.composer.addPass(state.bloomPass);

  state.fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
  updateFxaaResolution();
  state.composer.addPass(state.fxaaPass);
}

export function updateFxaaResolution() {
  if (!state.fxaaPass) return;
  const pr = state.renderer.getPixelRatio();
  state.fxaaPass.material.uniforms.resolution.value.set(
    1 / (window.innerWidth * pr),
    1 / (window.innerHeight * pr)
  );
}
