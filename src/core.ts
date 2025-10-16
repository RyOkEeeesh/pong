import * as THREE from 'three';

function getBoxWithMargin(box: THREE.Box2, margin: number) {
  return new THREE.Box2(
    box.min.clone().subScalar(margin),
    box.max.clone().addScalar(margin)
  );
}

export interface Hit {
  point: THREE.Vector2;
  normal: THREE.Vector2;
}

export function intersect(a: THREE.Box2, b: THREE.Box2): Hit | null {
  if (!getBoxWithMargin(a, 0.1).intersectsBox(b)) return null;

  const overlapMin = new THREE.Vector2(
    Math.max(a.min.x, b.min.x),
    Math.max(a.min.y, b.min.y)
  );
  const overlapMax = new THREE.Vector2(
    Math.min(a.max.x, b.max.x),
    Math.min(a.max.y, b.max.y)
  );
  const overlap = new THREE.Vector2().subVectors(overlapMax, overlapMin);

  if (overlap.x < overlap.y) {
    const normal = new THREE.Vector2(a.min.x < b.min.x ? -1 : 1, 0);
    const point = new THREE.Vector2(
      normal.x > 0 ? a.max.x : a.min.x,
      (overlapMin.y + overlapMax.y) / 2
    );
    return { point, normal };
  } else {
    const normal = new THREE.Vector2(0, a.min.y < b.min.y ? -1 : 1);
    const point = new THREE.Vector2(
      (overlapMin.x + overlapMax.x) / 2,
      normal.y > 0 ? a.max.y : a.min.y
    );
    return { point, normal };
  }
}