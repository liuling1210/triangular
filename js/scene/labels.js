/** CSS2D 三棱锥场景标签（战略文案占位） */
import { state } from '../state/appState.js';

/** 在场景中创建三条 CSS2D 战略文案标签 */
export function createLabels() {
  const labels = [
    { text: '以战略中轴为路', position: [-3.2, 2.2, 0.8] },
    { text: '以战略课题为门', position: [3.0, 1.5, 0.5] },
    { text: '以价值三角为基', position: [0, -0.3, 3.2] }
  ];

  labels.forEach(({ text, position }) => {
    const div = document.createElement('div');
    div.className = 'pyramid-label';
    div.textContent = text;
    state.labelElements.push(div);
    const label = new THREE.CSS2DObject(div);
    label.position.set(...position);
    state.scene.add(label);
  });
}
