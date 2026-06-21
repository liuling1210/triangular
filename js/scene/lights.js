import {
  DEFAULT_PYRAMID_COLOR,
  DEFAULT_AXIS_SETTINGS,
  BASE_AMBIENT_INTENSITY,
  BASE_LIGHT_INTENSITIES,
  H
} from '../config/constants.js';
import { state } from '../state/appState.js';

export function setupLights() {
  const ambient = new THREE.AmbientLight(0x1a1208, BASE_AMBIENT_INTENSITY);
  state.pyramidLights.ambient = ambient;
  state.scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff0d0, BASE_LIGHT_INTENSITIES.key);
  keyLight.position.set(4, 8, 6);
  state.pyramidLights.key = keyLight;
  state.scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x886644, 0.4);
  fillLight.position.set(-5, 3, -4);
  state.scene.add(fillLight);

  const coreLight = new THREE.PointLight(DEFAULT_PYRAMID_COLOR, BASE_LIGHT_INTENSITIES.core, 12);
  coreLight.position.set(0, 1.5, 0);
  state.pyramidLights.core = coreLight;
  state.scene.add(coreLight);

  const axisLight = new THREE.PointLight(DEFAULT_AXIS_SETTINGS.color, DEFAULT_AXIS_SETTINGS.lightIntensity, 6);
  axisLight.position.set(0, H * 0.55, 0);
  state.pyramidLights.axis = axisLight;
  state.scene.add(axisLight);
}
