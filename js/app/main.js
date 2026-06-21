import { SHOW_LABELS } from '../config/constants.js';
import { state } from '../state/appState.js';
import { createPyramid, advanceParticleFlowClock, updateParticleFlow, updateEdgeFlow } from '../scene/pyramid.js';
import { createCircularGrid } from '../scene/grid.js';
import {
  createGlitchBackground,
  resizeGlitchBackground,
  updateGlitchBackground
} from '../scene/glitchBackground.js';
import { createLabels } from '../scene/labels.js';
import { setupLights } from '../scene/lights.js';
import { setupControls } from '../scene/controls.js';
import { updateCameraViewTransition } from '../ui/cameraViewControls.js';
import { setupPyramidAutoRotateUI, updatePyramidAutoRotate } from '../ui/pyramidAutoRotateControls.js';
import { setupPostProcessing, updateFxaaResolution } from '../postprocessing/setup.js';
import { applyPyramidColorAndBrightness, setupColorBrightnessUI } from '../ui/pyramidControls.js';
import { applyAxisMaterial, setupAxisUI } from '../ui/axisControls.js';
import { applyFootMaterial, setupFootUI } from '../ui/footControls.js';
import { updateViewAdaptation } from '../utils/viewAdaptation.js';
import { applyShellMaterial, setupShellUI } from '../ui/shellControls.js';
import { setupSliceGradientUI } from '../ui/sliceControls.js';
import { setupEdgeFlowUI } from '../ui/edgeFlowControls.js';
import { setupMotionParticleUI } from '../ui/motionParticleControls.js';
import { setupGridUI } from '../ui/gridControls.js';
import { setupStrategicLabelUI } from '../ui/strategicLabelControls.js';
import { setupPanelSections } from '../ui/panelSections.js';
import { setupColorEyedroppers } from '../ui/colorEyedropper.js';
import { setPyramidEffect } from '../ui/effectControls.js';
import {
  updateGlowWireTransition
} from '../transitions/glowWireframeTransition.js';
import {
  updateWireParticleTransition
} from '../transitions/wireframeParticleTransition.js';
import {
  updateParticleGlowTransition
} from '../transitions/particleGlowTransition.js';
import {
  startInitialReveal,
  updateInitialReveal
} from '../transitions/initialRevealTransition.js';

function onWindowResize() {
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.composer.setSize(window.innerWidth, window.innerHeight);
  updateFxaaResolution();
  state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  resizeGlitchBackground();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = state.clock?.getDelta() ?? 0.016;
  updateCameraViewTransition();
  if (!state.cameraViewTransition) {
    state.controls.update();
  }
  updatePyramidAutoRotate(delta);
  const elapsed = advanceParticleFlowClock(1);
  updateParticleFlow(elapsed);
  if (state.clock) {
    updateEdgeFlow(state.clock.getElapsedTime());
  }
  updateGlowWireTransition();
  updateWireParticleTransition();
  updateParticleGlowTransition();
  updateInitialReveal();
  updateViewAdaptation();
  updateGlitchBackground();
  state.composer.render();
  if (SHOW_LABELS || state.baseCornerMarkers.length) {
    state.labelRenderer.render(state.scene, state.camera);
  }
}

function init() {
  const container = document.getElementById('canvas-container');

  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x000000);
  state.scene.fog = new THREE.FogExp2(0x000000, 0.045);

  state.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);

  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 1.2;
  container.appendChild(state.renderer.domElement);

  state.labelRenderer = new THREE.CSS2DRenderer();
  state.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  state.labelRenderer.domElement.style.position = 'absolute';
  state.labelRenderer.domElement.style.top = '0';
  state.labelRenderer.domElement.style.left = '0';
  state.labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(state.labelRenderer.domElement);

  createPyramid();
  createCircularGrid();
  createGlitchBackground(container);
  if (SHOW_LABELS) createLabels();
  setupLights();
  setupPostProcessing();
  setupControls();
  setupPyramidAutoRotateUI();
  setupPanelSections();
  setupColorBrightnessUI(applyAxisMaterial);
  setupEdgeFlowUI();
  setupMotionParticleUI();
  setupGridUI();
  setupStrategicLabelUI();
  setupAxisUI();
  setupFootUI();
  setupShellUI();
  setupSliceGradientUI();
  setPyramidEffect(state.pyramidEffectMode);
  applyPyramidColorAndBrightness();
  applyAxisMaterial();
  applyFootMaterial();
  applyShellMaterial();

  setupColorEyedroppers();

  state.clock = new THREE.Clock();
  startInitialReveal();
  window.addEventListener('resize', onWindowResize);
  animate();
}

init();
