/** 颜色拾取器：为面板色块添加吸管按钮 */
import { state } from '../state/appState.js';
import {
  isEyeDropperSupported,
  pickColorFromScreen,
  sampleRendererColorAtClientPoint
} from '../utils/colorSample.js';

const PICK_CURSOR = 'crosshair';
let activePick = null;

const EYEDROPPER_ICON = `
<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M17.25 3a2.25 2.25 0 0 1 3.18 3.18l-9.9 9.9-3.36.84.84-3.36 9.24-9.56zm1.06 1.06a.75.75 0 0 0-1.06 0l-1.19 1.19 1.06 1.06 1.19-1.19a.75.75 0 0 0 0-1.06zM6.75 14.25l6.9-6.9 1.06 1.06-6.9 6.9H6v-1.06zM4.5 19.5h3.75L19.06 8.69l-1.06-1.06L7.19 18.44H4.5v1.06z"/>
</svg>`;

/** 将拾取到的颜色写入输入框并触发 input 事件 */
function applyColorToInput(input, hex) {
  if (!input || !hex) return;
  input.value = hex;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** 退出画布拾色模式并恢复控制器 */
function stopCanvasPickMode() {
  if (!activePick) return;

  const { canvas, onClick, onKeyDown, controlsWereEnabled } = activePick;
  canvas.removeEventListener('click', onClick, true);
  window.removeEventListener('keydown', onKeyDown);
  canvas.style.cursor = activePick.previousCursor;
  document.body.classList.remove('is-color-picking');
  if (state.controls && controlsWereEnabled != null) {
    state.controls.enabled = controlsWereEnabled;
  }
  activePick = null;
}

/** 进入画布点击拾色模式 */
function startCanvasPickMode(input) {
  const renderer = state.renderer;
  const canvas = renderer?.domElement;
  if (!canvas) return;

  stopCanvasPickMode();

  const previousCursor = canvas.style.cursor;
  const controlsWereEnabled = state.controls?.enabled ?? null;
  if (state.controls) {
    state.controls.enabled = false;
  }
  canvas.style.cursor = PICK_CURSOR;
  document.body.classList.add('is-color-picking');

  /** 画布点击时采样颜色并退出拾色模式 */
  const onClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (state.composer) {
      state.composer.render();
    } else if (renderer) {
      renderer.render(state.scene, state.camera);
    }

    const hex = sampleRendererColorAtClientPoint(renderer, event.clientX, event.clientY);
    stopCanvasPickMode();
    if (hex) {
      applyColorToInput(input, hex);
    }
  };

  /** Escape 键取消拾色模式 */
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      stopCanvasPickMode();
    }
  };

  activePick = { canvas, onClick, onKeyDown, previousCursor, controlsWereEnabled };
  canvas.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKeyDown);
}

/** 为指定颜色输入框执行拾色（优先 EyeDropper API） */
async function pickColorForInput(input) {
  if (isEyeDropperSupported()) {
    try {
      const hex = await pickColorFromScreen();
      applyColorToInput(input, hex);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
    }
  }

  startCanvasPickMode(input);
}

/** 为单个颜色输入框挂载吸管按钮 */
function attachEyedropperButton(input) {
  if (!input || input.dataset.eyedropperReady === 'true') return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'color-eyedropper-btn';
  button.title = isEyeDropperSupported()
    ? '从屏幕吸取颜色（含画布）'
    : '从画布吸取颜色';
  button.setAttribute('aria-label', button.title);
  button.innerHTML = EYEDROPPER_ICON;

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    pickColorForInput(input);
  });

  input.insertAdjacentElement('afterend', button);
  input.dataset.eyedropperReady = 'true';
}

/** 为控制面板内所有颜色输入框初始化吸管功能 */
export function setupColorEyedroppers(root = document.getElementById('control-panel')) {
  if (!root) return;

  root.querySelectorAll('input[type="color"]').forEach((input) => {
    attachEyedropperButton(input);
  });
}
