import { state } from '../state/appState.js';
import { getCameraPreset, formatCameraPresetCode } from '../utils/cameraPreset.js';

let popupEl = null;
let codeEl = null;
let copyBtn = null;

function hidePopup() {
  if (popupEl) popupEl.hidden = true;
}

function showPopup(clientX, clientY, code) {
  if (!popupEl) return;
  codeEl.textContent = code;
  popupEl.hidden = false;

  const margin = 12;
  const rect = popupEl.getBoundingClientRect();
  let left = clientX;
  let top = clientY;

  if (left + rect.width > window.innerWidth - margin) {
    left = window.innerWidth - rect.width - margin;
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = window.innerHeight - rect.height - margin;
  }

  popupEl.style.left = `${Math.max(margin, left)}px`;
  popupEl.style.top = `${Math.max(margin, top)}px`;
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    const prev = copyBtn.textContent;
    copyBtn.textContent = '已复制';
    window.setTimeout(() => {
      copyBtn.textContent = prev;
    }, 1200);
  } catch {
    copyBtn.textContent = '复制失败';
    window.setTimeout(() => {
      copyBtn.textContent = '复制';
    }, 1200);
  }
}

function createPopup() {
  popupEl = document.createElement('div');
  popupEl.id = 'camera-info-popup';
  popupEl.hidden = true;

  const title = document.createElement('div');
  title.className = 'camera-info-popup-title';
  title.textContent = 'INITIAL_CAMERA 预设（可复制到代码）:';

  codeEl = document.createElement('pre');
  codeEl.className = 'camera-info-popup-code';

  copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'camera-info-popup-copy';
  copyBtn.textContent = '复制';
  copyBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    copyCode(codeEl.textContent);
  });

  popupEl.append(title, codeEl, copyBtn);
  document.body.appendChild(popupEl);
}

export function setupCameraInfoPopup() {
  createPopup();

  const canvas = state.renderer.domElement;

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    const preset = getCameraPreset(state.camera, state.controls);
    const code = formatCameraPresetCode(preset);
    showPopup(event.clientX, event.clientY, code);
  });

  document.addEventListener('pointerdown', (event) => {
    if (popupEl.hidden) return;
    if (popupEl.contains(event.target)) return;
    hidePopup();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hidePopup();
  });
}
