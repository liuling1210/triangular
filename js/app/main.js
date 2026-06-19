import { SHOW_LABELS } from '../config/constants.js';
import { state } from '../state/appState.js';
import { createPyramid, advanceParticleFlowClock, updateParticleFlow, updateEdgeFlow } from '../scene/pyramid.js';
import { createCircularGrid } from '../scene/grid.js';
import { createLabels } from '../scene/labels.js';
import { setupLights } from '../scene/lights.js';
import { setupControls } from '../scene/controls.js';
import { setupCameraInfoPopup } from '../ui/cameraInfoPopup.js';
import { setupPostProcessing, updateFxaaResolution } from '../postprocessing/setup.js';
import { applyPyramidColorAndBrightness, setupColorBrightnessUI } from '../ui/pyramidControls.js';
import { applyAxisMaterial, setupAxisUI } from '../ui/axisControls.js';
import { setupSliceGradientUI } from '../ui/sliceControls.js';
import { setupEdgeFlowUI } from '../ui/edgeFlowControls.js';
import { setupMotionParticleUI } from '../ui/motionParticleControls.js';
import { setupGridUI } from '../ui/gridControls.js';
import { setupPanelSections } from '../ui/panelSections.js';
import { setupEffectUI } from '../ui/effectControls.js';
import {
  setupGlowWireTransitionUI,
  updateGlowWireTransition
} from '../transitions/glowWireframeTransition.js';
import {
  setupWireParticleTransitionUI,
  updateWireParticleTransition
} from '../transitions/wireframeParticleTransition.js';
import {
  setupParticleGlowTransitionUI,
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
}

function animate() {
  requestAnimationFrame(animate);
  state.controls.update();
  const elapsed = advanceParticleFlowClock(1);
  updateParticleFlow(elapsed);
  if (state.clock) {
    updateEdgeFlow(state.clock.getElapsedTime());
  }
  updateGlowWireTransition();
  updateWireParticleTransition();
  updateParticleGlowTransition();
  updateInitialReveal();
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
  if (SHOW_LABELS) createLabels();
  setupLights();
  setupPostProcessing();
  setupControls();
  setupCameraInfoPopup();
  setupPanelSections();
  setupColorBrightnessUI(applyAxisMaterial);
  setupEdgeFlowUI();
  setupMotionParticleUI();
  setupGridUI();
  setupAxisUI();
  setupSliceGradientUI();
  setupEffectUI();
  setupGlowWireTransitionUI();
  setupWireParticleTransitionUI();
  setupParticleGlowTransitionUI();
  applyPyramidColorAndBrightness();
  applyAxisMaterial();

  state.clock = new THREE.Clock();
  startInitialReveal();
  window.addEventListener('resize', onWindowResize);
  animate();
}

init();
