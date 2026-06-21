import { state } from '../state/appState.js';
import { hexToRgba } from '../utils/color.js';

export function applySliceGradients() {
  if (!state.pyramidMats.planes) return;
  const intensity = 0.75 + state.pyramidBrightness * 0.55;

  state.pyramidMats.planes.forEach((mat, i) => {
    const grad = state.sliceGradients[i];
    if (!grad || !mat.uniforms) return;
    mat.uniforms.colorStart.value.set(grad.start);
    mat.uniforms.colorEnd.value.set(grad.end);
    mat.uniforms.uOpacityCenter.value = state.sliceOpacity.opacityCenter;
    mat.uniforms.uOpacityEdge.value = state.sliceOpacity.opacityEdge;
    mat.uniforms.uFadeRange.value = state.sliceOpacity.fadeRange;
    mat.uniforms.uIntensity.value = intensity;
  });

  if (state.pyramidMats.sliceEdges) {
    state.pyramidMats.sliceEdges.forEach((mat, i) => {
      const grad = state.sliceGradients[i];
      if (!grad) return;
      mat.color.set(grad.end);
      mat.opacity = Math.min(1, 0.85 + state.sliceOpacity.opacityEdge * 0.15) * intensity;
    });
  }

  if (state.pyramidMats.sliceInnerEdges) {
    state.pyramidMats.sliceInnerEdges.forEach((mat, i) => {
      const grad = state.sliceGradients[i];
      if (!grad) return;
      mat.color.set(grad.end);
      mat.opacity = Math.min(1, 0.55 + state.sliceOpacity.opacityEdge * 0.2) * intensity;
    });
  }

  updateSliceGradientPreviews();
}

function updateSliceGradientPreviews() {
  state.sliceGradients.forEach((grad, i) => {
    const preview = document.querySelector(`.gradient-preview[data-slice="${i}"]`);
    if (preview) {
      const innerStop = Math.max(0, (1 - state.sliceOpacity.fadeRange) * 100);
      preview.style.background = `radial-gradient(circle, ${hexToRgba(grad.start, state.sliceOpacity.opacityCenter)} ${innerStop}%, ${hexToRgba(grad.end, state.sliceOpacity.opacityEdge)} 100%)`;
    }

    document.querySelectorAll(`.slice-color-hex[data-slice="${i}"]`).forEach((el) => {
      const role = el.dataset.role;
      if (grad[role]) {
        el.textContent = grad[role].toUpperCase();
      }
    });
  });

  const centerLabel = document.getElementById('slice-opacity-center-val');
  if (centerLabel) {
    centerLabel.textContent = `${Math.round(state.sliceOpacity.opacityCenter * 100)}%`;
  }
  const edgeLabel = document.getElementById('slice-opacity-edge-val');
  if (edgeLabel) {
    edgeLabel.textContent = `${Math.round(state.sliceOpacity.opacityEdge * 100)}%`;
  }
  const fadeLabel = document.getElementById('slice-fade-range-val');
  if (fadeLabel) {
    fadeLabel.textContent = `${Math.round(state.sliceOpacity.fadeRange * 100)}%`;
  }
}

export function setupSliceGradientUI() {
  document.querySelectorAll('.slice-color-picker').forEach((picker) => {
    picker.addEventListener('input', (e) => {
      const sliceIndex = parseInt(e.target.dataset.slice, 10);
      const role = e.target.dataset.role;
      state.sliceGradients[sliceIndex][role] = e.target.value;
      applySliceGradients();
    });
  });
  document.getElementById('slice-opacity-center-slider').addEventListener('input', (e) => {
    state.sliceOpacity.opacityCenter = parseFloat(e.target.value) / 100;
    applySliceGradients();
  });
  document.getElementById('slice-opacity-edge-slider').addEventListener('input', (e) => {
    state.sliceOpacity.opacityEdge = parseFloat(e.target.value) / 100;
    applySliceGradients();
  });
  document.getElementById('slice-fade-range-slider').addEventListener('input', (e) => {
    state.sliceOpacity.fadeRange = parseFloat(e.target.value) / 100;
    applySliceGradients();
  });
  updateSliceGradientPreviews();
}
