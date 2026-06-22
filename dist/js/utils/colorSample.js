export function rgbToHex(r, g, b) {
  const toHex = (channel) => channel.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** 从 WebGL 画布指定屏幕坐标读取像素颜色（需刚完成渲染） */
export function sampleRendererColorAtClientPoint(renderer, clientX, clientY) {
  if (!renderer?.domElement) return null;

  const canvas = renderer.domElement;
  const rect = canvas.getBoundingClientRect();
  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null;
  }

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor((clientX - rect.left) * scaleX);
  const y = Math.floor((clientY - rect.top) * scaleY);

  const gl = renderer.getContext();
  const pixels = new Uint8Array(4);
  gl.readPixels(x, canvas.height - y - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  return rgbToHex(pixels[0], pixels[1], pixels[2]);
}

export function isEyeDropperSupported() {
  return typeof window.EyeDropper === 'function';
}

export async function pickColorFromScreen() {
  if (!isEyeDropperSupported()) {
    return null;
  }

  const dropper = new window.EyeDropper();
  const result = await dropper.open();
  return result.sRGBHex;
}
