/** 三棱锥与三角形相关的几何体创建、采样与柱体裁剪工具 */
import {
  R,
  H,
  PYRAMID_Y_OFFSET,
  SHAFT_RADIUS,
  SHAFT_CYL_HEIGHT,
  SHAFT_TIP_HEIGHT,
  SOLID_BOTTOM_HEIGHT
} from '../config/constants.js';

/** 创建三棱锥（开放底面）的圆锥几何体 */
export function createPyramidConeGeo() {
  return new THREE.ConeGeometry(R, H, 3, 1, true);
}

/** 从圆锥几何体提取顶点与底面三角顶点（按方位角排序） */
export function extractPyramidKeyPoints(coneGeo) {
  const pos = coneGeo.attributes.position;
  const apex = new THREE.Vector3();
  const baseVerts = [];
  let maxY = -Infinity;

  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    v.y += PYRAMID_Y_OFFSET;

    if (v.y > maxY) {
      maxY = v.y;
      apex.copy(v);
    }

    if (Math.abs(v.y) < 0.001) {
      const exists = baseVerts.some((b) => b.distanceTo(v) < 0.001);
      if (!exists) baseVerts.push(v.clone());
    }
  }

  baseVerts.sort((a, b) => Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z));
  return { apex, baseVerts };
}

/** 按高度 y 对底面顶点做线性缩放，得到该高度截面上的三个顶点 */
export function getSliceVertices(baseVerts, y) {
  const scale = 1 - y / H;
  return baseVerts.map((v) => new THREE.Vector3(v.x * scale, y, v.z * scale));
}

/** 返回三棱锥在高度 y 处的底面半径 */
export function radiusAtHeight(y) {
  return R * (1 - y / H);
}

/** 由三个顶点创建三角形 BufferGeometry */
export function createTriangleGeo(v0, v1, v2) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([
    v0.x, v0.y, v0.z,
    v1.x, v1.y, v1.z,
    v2.x, v2.y, v2.z
  ], 3));
  geo.computeVertexNormals();
  return geo;
}

/** 计算三角形三个顶点的质心 */
export function getTriangleCentroid(v0, v1, v2) {
  return new THREE.Vector3()
    .add(v0)
    .add(v1)
    .add(v2)
    .divideScalar(3);
}

/** 返回质心到三角形各顶点的最大距离（用于径向渐变归一化） */
export function getTriangleMaxRadius(centroid, v0, v1, v2) {
  return Math.max(
    centroid.distanceTo(v0),
    centroid.distanceTo(v1),
    centroid.distanceTo(v2)
  );
}

/** 在三角形 ABC 内均匀随机采样 count 个点，坐标追加到 out 数组 */
export function sampleTriangle(A, B, C, count, out) {
  for (let i = 0; i < count; i++) {
    const r1 = Math.random();
    const r2 = Math.random();
    const s = Math.sqrt(r1);
    out.push(
      (1 - s) * A.x + s * (1 - r2) * B.x + s * r2 * C.x,
      (1 - s) * A.y + s * (1 - r2) * B.y + s * r2 * C.y,
      (1 - s) * A.z + s * (1 - r2) * B.z + s * r2 * C.z
    );
  }
}

/** 返回中轴柱体在高度 y 处的截面半径（含圆柱段与锥形段） */
export function pillarRadiusAt(y) {
  const shaftTop = SHAFT_CYL_HEIGHT + SHAFT_TIP_HEIGHT;
  if (y < SOLID_BOTTOM_HEIGHT || y > shaftTop) return 0;
  if (y <= SHAFT_CYL_HEIGHT) return SHAFT_RADIUS;
  return SHAFT_RADIUS * (1 - (y - SHAFT_CYL_HEIGHT) / SHAFT_TIP_HEIGHT);
}

/** 将三角形内边起点沿径向裁剪至柱体边界外，避免与轴体重叠 */
export function clipInnerEdgeStart(centroid, vertex) {
  const dirX = vertex.x - centroid.x;
  const dirZ = vertex.z - centroid.z;
  const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
  const startR = pillarRadiusAt(centroid.y) * 1.02;
  if (len <= startR) return vertex.clone();
  const scale = startR / len;
  return new THREE.Vector3(centroid.x + dirX * scale, centroid.y, centroid.z + dirZ * scale);
}
