/** 网格线在 XZ 平面上的三角形裁剪与射线求交工具 */
import { state } from '../state/appState.js';

const EPS = 1e-5;

/** 二维叉积（用于共面方向判定） */
function cross2(ax, az, bx, bz) {
  return ax * bz - az * bx;
}

/** 三棱锥底面在 XZ 平面上的投影三角形 */
export function getGridClipTriangle() {
  const verts = state.pyramidBaseVerts;
  if (!verts || verts.length < 3) return null;
  return verts.map((v) => new THREE.Vector3(v.x, 0, v.z));
}

/** 判断点 p 是否位于 XZ 平面三角形 (v0,v1,v2) 内部或边上 */
function pointInTriangleXZ(p, v0, v1, v2) {
  const sign = (px, pz, ax, az, bx, bz) =>
    cross2(px - bx, pz - bz, ax - bx, az - bz);

  const d1 = sign(p.x, p.z, v0.x, v0.z, v1.x, v1.z);
  const d2 = sign(p.x, p.z, v1.x, v1.z, v2.x, v2.z);
  const d3 = sign(p.x, p.z, v2.x, v2.z, v0.x, v0.z);

  const hasNeg = d1 < -EPS || d2 < -EPS || d3 < -EPS;
  const hasPos = d1 > EPS || d2 > EPS || d3 > EPS;
  return !(hasNeg && hasPos);
}

/** 求线段与三角形某条边在参数 t∈[0,1] 上的交点参数，无交则返回 null */
function segmentEdgeIntersectionT(p0x, p0z, dX, dZ, e0, e1) {
  const sX = e1.x - e0.x;
  const sZ = e1.z - e0.z;
  const denom = cross2(dX, dZ, sX, sZ);
  if (Math.abs(denom) < EPS) return null;

  const qX = e0.x - p0x;
  const qZ = e0.z - p0z;
  const t = cross2(qX, qZ, sX, sZ) / denom;
  const s = cross2(qX, qZ, dX, dZ) / denom;
  if (t < -EPS || t > 1 + EPS || s < -EPS || s > 1 + EPS) return null;
  return Math.max(0, Math.min(1, t));
}

/** 返回线段在三角形外的子段（y 恒为 0） */
export function clipSegmentExteriorXZ(start, end, v0, v1, v2) {
  const dX = end.x - start.x;
  const dZ = end.z - start.z;
  const len2 = dX * dX + dZ * dZ;
  if (len2 < EPS * EPS) return [];

  const ts = [0, 1];
  const edges = [[v0, v1], [v1, v2], [v2, v0]];

  edges.forEach(([ea, eb]) => {
    const t = segmentEdgeIntersectionT(start.x, start.z, dX, dZ, ea, eb);
    if (t !== null && t > EPS && t < 1 - EPS) ts.push(t);
  });

  ts.sort((a, b) => a - b);

  const parts = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const t0 = ts[i];
    const t1 = ts[i + 1];
    if (t1 - t0 < EPS) continue;

    const midX = start.x + dX * ((t0 + t1) * 0.5);
    const midZ = start.z + dZ * ((t0 + t1) * 0.5);
    if (pointInTriangleXZ({ x: midX, z: midZ }, v0, v1, v2)) continue;

    parts.push([
      new THREE.Vector3(start.x + dX * t0, 0, start.z + dZ * t0),
      new THREE.Vector3(start.x + dX * t1, 0, start.z + dZ * t1)
    ]);
  }

  return parts;
}

/** 原点在三角形内时，沿射线方向离开三角形的距离 */
export function rayTriangleExitDistanceXZ(dir, v0, v1, v2) {
  if (!pointInTriangleXZ({ x: 0, z: 0 }, v0, v1, v2)) return 0;

  const edges = [[v0, v1], [v1, v2], [v2, v0]];
  let exitT = Infinity;

  edges.forEach(([ea, eb]) => {
    const sX = eb.x - ea.x;
    const sZ = eb.z - ea.z;
    const denom = cross2(dir.x, dir.z, sX, sZ);
    if (Math.abs(denom) < EPS) return;

    const qX = ea.x;
    const qZ = ea.z;
    const t = cross2(qX, qZ, sX, sZ) / denom;
    const s = cross2(qX, qZ, dir.x, dir.z) / denom;
    if (t > EPS && s >= -EPS && s <= 1 + EPS && t < exitT) {
      exitT = t;
    }
  });

  return exitT === Infinity ? 0 : exitT;
}
