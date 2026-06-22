import { EDGE_FLOW, RENDER_ORDER } from '../config/constants.js';
import { state } from '../state/appState.js';
import { createEdgeFlowMaterial } from '../materials/edgeFlowMaterial.js';

function disposeEdgeGlowTubes(objects) {
  if (!objects) return;

  objects.tubeGroup.parent?.remove(objects.tubeGroup);
  objects.outerMeshes.forEach((mesh) => mesh.geometry.dispose());
  objects.innerMeshes.forEach((mesh) => mesh.geometry.dispose());
  objects.outerMats?.forEach((mat) => mat.dispose());
  objects.innerMats?.forEach((mat) => mat.dispose());
}

function collectPhases(existing) {
  if (!existing?.outerMats?.length) {
    return null;
  }
  return existing.outerMats.map((mat) => mat.uniforms.uPhase.value);
}

function createInsetEdgeCurve(baseVert, apex) {
  const settings = state.edgeFlowSettings;
  const start = baseVert.clone();
  const end = apex.clone();
  const edgeDir = new THREE.Vector3().subVectors(end, start);
  const edgeLen = edgeDir.length();
  edgeDir.multiplyScalar(1 / edgeLen);
  const curveStart = start.addScaledVector(edgeDir, edgeLen * settings.bottomInsetRatio);
  const curveEnd = end.addScaledVector(edgeDir, -edgeLen * settings.topInsetRatio);
  return new THREE.LineCurve3(curveStart, curveEnd);
}

export function createEdgeGlowTubes(group, apex, baseVerts, phases = null) {
  const tubeGroup = new THREE.Group();
  const outerMeshes = [];
  const innerMeshes = [];
  const outerMats = [];
  const innerMats = [];
  const settings = state.edgeFlowSettings;

  for (let i = 0; i < baseVerts.length; i++) {
    const phase = phases?.[i] ?? Math.random();
    const outerMat = createEdgeFlowMaterial(false, phase);
    const innerMat = createEdgeFlowMaterial(true, phase);
    outerMats.push(outerMat);
    innerMats.push(innerMat);

    const curve = createInsetEdgeCurve(baseVerts[i], apex);

    const outerGeo = new THREE.TubeGeometry(
      curve,
      EDGE_FLOW.tubularSegments,
      settings.outerRadius,
      EDGE_FLOW.radialSegments,
      false
    );
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.renderOrder = RENDER_ORDER.edge;
    outerMesh.frustumCulled = false;
    tubeGroup.add(outerMesh);
    outerMeshes.push(outerMesh);

    const innerGeo = new THREE.TubeGeometry(
      curve,
      EDGE_FLOW.tubularSegments,
      settings.innerRadius,
      EDGE_FLOW.radialSegments,
      false
    );
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.renderOrder = RENDER_ORDER.edge + 0.5;
    innerMesh.frustumCulled = false;
    tubeGroup.add(innerMesh);
    innerMeshes.push(innerMesh);
  }

  group.add(tubeGroup);

  return { tubeGroup, outerMeshes, innerMeshes, outerMats, innerMats };
}

export function rebuildEdgeGlowTubes() {
  const glowGroup = state.pyramidGroups.glow;
  const apex = state.pyramidApex;
  const baseVerts = state.pyramidBaseVerts;
  if (!glowGroup || !apex || !baseVerts?.length) return;

  const existing = state.glowObjects?.edgeGlowTubes;
  const phases = collectPhases(existing);
  disposeEdgeGlowTubes(existing);

  const edgeGlow = createEdgeGlowTubes(glowGroup, apex, baseVerts, phases);
  state.glowObjects.edgeGlowTubes = edgeGlow;
  state.pyramidMats.edgeFlowOuter = edgeGlow.outerMats;
  state.pyramidMats.edgeFlowInner = edgeGlow.innerMats;
}
