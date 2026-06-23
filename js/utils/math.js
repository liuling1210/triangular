/** 将数值限制在 [0, 1] 区间 */
export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

/** 线性插值 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** 五次 Hermite 平滑插值（端点导数为 0） */
export function smootherstep(t) {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}
