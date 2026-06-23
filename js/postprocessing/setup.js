/** 后处理管线：Bloom 与 FXAA 配置 */
import { state } from '../state/appState.js';

/** 初始化 EffectComposer、Bloom 与 FXAA 通道 */
export function setupPostProcessing() {
  const settings = state.glowLightSettings;
  state.composer = new THREE.EffectComposer(state.renderer);
  state.composer.addPass(new THREE.RenderPass(state.scene, state.camera));

  state.bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    settings.bloomStrength,
    settings.bloomRadius,
    settings.bloomThreshold
  );
  state.composer.addPass(state.bloomPass);

  state.fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
  updateFxaaResolution();
  state.composer.addPass(state.fxaaPass);
}

/** 窗口尺寸变化时更新 FXAA 分辨率 uniform */
export function updateFxaaResolution() {
  if (!state.fxaaPass) return;
  const pr = state.renderer.getPixelRatio();
  state.fxaaPass.material.uniforms.resolution.value.set(
    1 / (window.innerWidth * pr),
    1 / (window.innerHeight * pr)
  );
}
