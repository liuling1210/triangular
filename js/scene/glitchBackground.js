/** Canvas ：随机字符闪烁与 RGB 分离 */
import { GLITCH_BG } from '../config/constants.js';

const GLYPH_COLOR = '#E8CB96';
const FONT_FAMILY = 'Consolas, "Courier New", monospace';

let canvas = null;
let ctx = null;
let texture = null;
let slots = [];
let viewport = { width: 0, height: 0 };
let pixelRatio = 1;

/** 生成 [min, max] 范围内的随机浮点数 */
function rand(min, max) {
  return min + Math.random() * (max - min);
}

/** 生成 [min, max] 范围内的随机整数 */
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/** 从配置字符集中随机选取一个字符 */
function pickChar() {
  const { chars } = GLITCH_BG;
  return chars[Math.floor(Math.random() * chars.length)];
}

/** 返回闪烁阶段下一次 tick 的延迟毫秒数 */
function nextTickDelay() {
  return rand(GLITCH_BG.tickMinMs, GLITCH_BG.tickMaxMs);
}

/** 返回空闲阶段下一次 tick 的延迟毫秒数 */
function nextIdleDelay() {
  return rand(GLITCH_BG.idleMinMs, GLITCH_BG.idleMaxMs);
}

/** 判断点是否在三角形内（同向叉积法） */
function pointInTriangle(px, py, a, b, c) {
  const d1 = (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y);
  const d2 = (px - c.x) * (b.y - c.y) - (b.x - c.x) * (py - c.y);
  const d3 = (px - a.x) * (c.y - a.y) - (c.x - a.x) * (py - a.y);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/** 当前点是否位于字符排除的三角形区域内 */
function isInsideExcludedTriangle(x, y) {
  const triangle = GLITCH_BG.glyphTriangle;
  if (!triangle || triangle.length !== 3) return false;
  const [a, b, c] = triangle;
  return pointInTriangle(x, y, a, b, c);
}

/** 在视口内随机生成屏幕坐标（避开边缘，且不在排除三角形内） */
function randomScreenPosition() {
  const { width, height } = viewport;
  const inset = GLITCH_BG.edgeInsetPx;
  const triangle = GLITCH_BG.glyphTriangle;

  if (triangle && triangle.length === 3) {
    const [a, b, c] = triangle;
    for (let i = 0; i < 48; i++) {
      const pos = {
        x: rand(inset, width - inset),
        y: rand(inset, height - inset)
      };
      if (!pointInTriangle(pos.x, pos.y, a, b, c)) return pos;
    }
  }

  return {
    x: rand(inset, width - inset),
    y: rand(inset, height - inset)
  };
}

/** 隐藏槽位字符并重置抖动与 RGB 分离状态 */
function hideGlyph(slot) {
  slot.opacity = 0;
  slot.jitterX = 0;
  slot.rgbSplit = false;
}

/** 显示槽位字符并随机设置透明度、抖动与 RGB 分离 */
function showGlyph(slot) {
  slot.opacity = rand(GLITCH_BG.opacityMin, GLITCH_BG.opacityMax);
  slot.jitterX = rand(-8, 8);
  slot.rgbSplit = Math.random() < 0.35;
}

/** 为槽位随机放置字符、字号与屏幕位置 */
function placeGlyph(slot) {
  const pos = randomScreenPosition();
  slot.x = pos.x;
  slot.y = pos.y;
  slot.char = pickChar();
  slot.fontSize = randInt(GLITCH_BG.fontSizeMin, GLITCH_BG.fontSizeMax);
}

/** 将槽位切换至空闲阶段并安排下次触发时间 */
function scheduleIdle(slot, now) {
  slot.phase = 'idle';
  slot.togglesLeft = 0;
  hideGlyph(slot);
  slot.nextAt = now + nextIdleDelay();
}

/** 将槽位切换至闪烁阶段并初始化 flicker 次数 */
function scheduleFlash(slot, now) {
  placeGlyph(slot);
  slot.phase = 'flash';
  const flickers = randInt(GLITCH_BG.flashFlickersMin, GLITCH_BG.flashFlickersMax);
  slot.togglesLeft = flickers * 2;
  slot.flashOn = true;
  showGlyph(slot);
  slot.nextAt = now + nextTickDelay();
}

/** 将槽位切换至保持显示阶段 */
function scheduleHold(slot, now) {
  slot.phase = 'hold';
  slot.togglesLeft = 0;
  showGlyph(slot);
  slot.nextAt = now + GLITCH_BG.holdMs;
}

/** 创建单个字符槽位的初始状态对象 */
function createSlot() {
  return {
    char: 'J',
    phase: 'idle',
    togglesLeft: 0,
    flashOn: false,
    opacity: 0,
    jitterX: 0,
    rgbSplit: false,
    fontSize: GLITCH_BG.fontSizeMin,
    x: 0,
    y: 0,
    nextAt: performance.now() + rand(0, GLITCH_BG.idleMaxMs)
  };
}

/** 推进单个槽位的状态机（idle → flash → hold → idle） */
function tickSlot(slot, now) {
  if (now < slot.nextAt) return;

  if (slot.phase === 'idle') {
    scheduleFlash(slot, now);
    return;
  }

  if (slot.phase === 'flash') {
    slot.flashOn = !slot.flashOn;
    if (slot.flashOn) showGlyph(slot);
    else hideGlyph(slot);
    slot.togglesLeft -= 1;

    if (slot.togglesLeft <= 0) {
      scheduleHold(slot, now);
    } else {
      slot.nextAt = now + nextTickDelay();
    }
    return;
  }

  if (slot.phase === 'hold') {
    scheduleIdle(slot, now);
  }
}

/** 将 Three.js 颜色与透明度转为 Canvas rgba 字符串 */
function parseGlyphColor(opacity) {
  const c = new THREE.Color(GLYPH_COLOR);
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${opacity})`;
}

/** 在 Canvas 上绘制单个字符（支持 RGB 分离与发光） */
function drawGlyph(slot) {
  if (!ctx || slot.opacity <= 0) return;
  if (isInsideExcludedTriangle(slot.x, slot.y)) return;

  const { x, y, char, fontSize, opacity, jitterX, rgbSplit } = slot;
  const textX = x + jitterX;
  const textY = y;

  ctx.font = `700 ${fontSize}px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (rgbSplit) {
    ctx.fillStyle = `rgba(255, 72, 72, 0.45)`;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillText(char, textX + jitterX, textY);

    ctx.fillStyle = `rgba(72, 200, 255, 0.45)`;
    ctx.fillText(char, textX - jitterX, textY);

    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(232, 203, 150, 0.55)';
    ctx.fillStyle = parseGlyphColor(opacity);
    ctx.fillText(char, textX, textY);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    return;
  }

  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(232, 203, 150, 0.55)';
  ctx.fillStyle = parseGlyphColor(opacity);
  ctx.fillText(char, textX, textY);

  ctx.shadowBlur = 16;
  ctx.shadowColor = 'rgba(232, 203, 150, 0.25)';
  ctx.fillText(char, textX, textY);

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

/** 清空 Canvas 并重绘所有可见字符 */
function redrawGlitchCanvas() {
  if (!ctx) return;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  slots.forEach((slot) => drawGlyph(slot));
}

/** 按视口与 DPR 同步 Canvas 尺寸并重绘 */
function syncCanvasSize() {
  if (!canvas || !ctx) return;

  pixelRatio = Math.min(window.devicePixelRatio, 2);
  canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
  canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
  redrawGlitchCanvas();
  if (texture) texture.needsUpdate = true;
}

/** 初始化 Canvas 纹理背景并创建字符槽位 */
export function createGlitchBackground(scene) {
  if (texture) return;

  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
  pixelRatio = Math.min(window.devicePixelRatio, 2);

  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');
  canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
  canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));

  texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  scene.background = texture;

  slots = [];
  for (let i = 0; i < GLITCH_BG.slotCount; i++) {
    slots.push(createSlot());
  }

  redrawGlitchCanvas();
  texture.needsUpdate = true;
}

/** 响应窗口尺寸变化并更新背景 Canvas */
export function resizeGlitchBackground() {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
  syncCanvasSize();
}

/** 每帧推进所有槽位状态机并重绘背景纹理 */
export function updateGlitchBackground() {
  if (!texture) return;

  const now = performance.now();
  slots.forEach((slot) => tickSlot(slot, now));
  redrawGlitchCanvas();
  texture.needsUpdate = true;
}
