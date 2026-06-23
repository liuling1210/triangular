/** 右键点击场景显示屏幕像素坐标，便于配置背景字符三角形区域 */

const TOAST_MS = 2200;

let toastEl = null;
let hideTimer = null;

/** 在点击位置附近显示坐标提示 */
function showCoordToast(x, y, clientX, clientY) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'scene-coord-toast';
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = `{ x: ${x}, y: ${y} }`;
  toastEl.style.left = `${clientX + 12}px`;
  toastEl.style.top = `${clientY + 12}px`;
  toastEl.classList.add('is-visible');

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toastEl?.classList.remove('is-visible');
  }, TOAST_MS);
}

/** 绑定 WebGL 画布右键坐标拾取 */
export function setupSceneCoordPicker(canvas) {
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();

    const x = Math.round(event.clientX);
    const y = Math.round(event.clientY);

    console.log(`[scene coord] { x: ${x}, y: ${y} }`);
    showCoordToast(x, y, event.clientX, event.clientY);
  });
}
