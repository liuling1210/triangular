import {
  DEFAULT_PYRAMID_COLOR,
  DEFAULT_AXIS_SETTINGS
} from '../config/constants.js';
import { state } from '../state/appState.js';

export function setupLights() {
  const settings = state.glowLightSettings;
  const ambient = new THREE.AmbientLight(0x1a1208, settings.ambientIntensity);
  state.pyramidLights.ambient = ambient;
  state.scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff0d0, settings.keyIntensity);
  keyLight.position.set(
    settings.keyPosition.x,
    settings.keyPosition.y,
    settings.keyPosition.z
  );
  state.pyramidLights.key = keyLight;
  state.scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x886644, settings.fillIntensity);
  fillLight.position.set(
    settings.fillPosition.x,
    settings.fillPosition.y,
    settings.fillPosition.z
  );
  state.pyramidLights.fill = fillLight;
  state.scene.add(fillLight);

  const coreLight = new THREE.PointLight(DEFAULT_PYRAMID_COLOR, settings.coreIntensity, 12);
  coreLight.position.set(
    settings.corePosition.x,
    settings.corePosition.y,
    settings.corePosition.z
  );
  state.pyramidLights.core = coreLight;
  state.scene.add(coreLight);

  const axisLight = new THREE.PointLight(DEFAULT_AXIS_SETTINGS.color, DEFAULT_AXIS_SETTINGS.lightIntensity, 6);
  axisLight.position.set(
    settings.axisLightPosition.x,
    settings.axisLightPosition.y,
    settings.axisLightPosition.z
  );
  state.pyramidLights.axis = axisLight;
  state.scene.add(axisLight);
}
