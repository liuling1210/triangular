export function hexToRgba(hex, alpha) {
  const c = new THREE.Color(hex);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createGlowTexture(hexColor, bright) {
  const threeColor = new THREE.Color(hexColor);
  const r = Math.round(threeColor.r * 255);
  const g = Math.round(threeColor.g * 255);
  const b = Math.round(threeColor.b * 255);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (bright) {
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.12, `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 35)}, ${Math.min(255, b + 20)}, 1)`);
    grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.75)`);
    grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.35)`);
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.15, `rgba(${Math.min(255, r + 35)}, ${Math.min(255, g + 28)}, ${Math.min(255, b + 18)}, 0.98)`);
    grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.72)`);
    grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.38)`);
    grad.addColorStop(0.82, `rgba(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)}, 0.12)`);
  }
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
