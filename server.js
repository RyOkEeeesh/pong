const THREE = require('three');
const { MeshBVH, acceleratedRaycast } = require('three-mesh-bvh');

// BVH有効化
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// 壁のメッシュとBVH構築
const wallGeometry = new THREE.BoxGeometry(10, 1, 10);
wallGeometry.boundsTree = new MeshBVH(wallGeometry);
const wall = new THREE.Mesh(wallGeometry);
wall.position.set(0, -5, 0);
wall.updateMatrixWorld(true);

// ボールの状態
let ballPos = new THREE.Vector3(0, 0, 0);
let ballVel = new THREE.Vector3(0, -0.2, 0); // 下向きに移動

// ゲームループ
setInterval(() => {
  const raycaster = new THREE.Raycaster();
  raycaster.ray.origin.copy(ballPos);
  raycaster.ray.direction.copy(ballVel.clone().normalize());

  const intersects = raycaster.intersectObject(wall);

  if (intersects.length > 0 && intersects[0].distance < ballVel.length()) {
    const normal = intersects[0].face.normal.clone().transformDirection(wall.matrixWorld);
    ballVel.reflect(normal); // 反射！
    console.log('反射しました！新しい速度:', ballVel.toArray());
  }

  // ボールを移動
  ballPos.add(ballVel);
  console.log('ボール位置:', ballPos.toArray());
}, 1000 / 60);
