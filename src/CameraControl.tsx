import * as THREE from 'three';

export function trackingLookAt(camera: THREE.PerspectiveCamera): THREE.PerspectiveCamera {
  const originalLookAt = camera.lookAt.bind(camera);

  camera.lookAt = function (x: number | THREE.Vector3, y?: number, z?: number) {
    const target: THREE.Vector3 = x instanceof THREE.Vector3 ? x.clone() : new THREE.Vector3(x, y as number, z as number) ;
    camera.userData.lookAt = target;
    originalLookAt(target);
  };

  return camera;
}

export function fitObject(camera: THREE.PerspectiveCamera, object: THREE.Object3D, offset = 1.1) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const center = camera.userData.lookAt instanceof THREE.Vector3 ? camera.userData.lookAt.clone() : box.getCenter(new THREE.Vector3());

  const vertices = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];

  // カメラ視線方向
  const dir = new THREE.Vector3().subVectors(camera.position, center).normalize();

  // 距離を二分探索で調整
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;

  const distForHeight = maxDim / (2 * Math.tan(fov / 2));
  const distForWidth = distForHeight / aspect;
  const approxDist = Math.max(distForHeight, distForWidth);

  let low = approxDist * 0.8;
  let high = approxDist * 1.2;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const testPos = center.clone().add(dir.clone().multiplyScalar(mid));
    camera.position.copy(testPos);
    camera.lookAt(center);

    // NDCでチェック
    let fits = true;
    for (const v of vertices) {
      const p = v.clone().project(camera);
      if (p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1) {
        fits = false;
        break;
      }
    }
    fits ? high = mid : low = mid;
  }

  const finalDist = high * offset;
  camera.position.copy(center).add(dir.multiplyScalar(finalDist));
  camera.lookAt(center);
}

export function fitObjectFast(camera: THREE.PerspectiveCamera, object: THREE.Object3D, offset = 1.1) {
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = camera.userData.lookAt instanceof THREE.Vector3 ?
  camera.userData.lookAt.clone():
  box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = camera.aspect;

  const distForHeight = maxDim / (2 * Math.tan(fov / 2));
  const distForWidth = distForHeight / aspect;
  const requiredDist = Math.max(distForHeight, distForWidth) * offset;

  const direction = new THREE.Vector3()
    .subVectors(camera.position, center)
    .normalize();

  camera.position.copy(center).add(direction.multiplyScalar(requiredDist));
  camera.lookAt(center);

  return requiredDist;
}
