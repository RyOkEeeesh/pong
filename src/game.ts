import { THREE, App, TC } from './module';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

THREE.Mesh.prototype.raycast = acceleratedRaycast;

const app = new App({
  cameraPosition: {y: 15, z: 15 },
  controls: true
});

const returnMesh = (geo: THREE.BoxGeometry, mat: THREE.Material) => new THREE.Mesh(geo, mat);

const width = 16;
const height = 20;

const sideWallGeo = new THREE.BoxGeometry(height, 1, 0.1);
const ABWallGeo = new THREE.BoxGeometry(width, 1, 0.1);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });

const wallLeft = returnMesh(sideWallGeo, material);
TC.changePosition(wallLeft, { x: -width / 2 });
TC.changeRotation(wallLeft, { y: TC.toRad(-90) });

const wallRight = returnMesh(sideWallGeo, material);
TC.changePosition(wallRight, { x: width / 2 });
TC.changeRotation(wallRight, { y: TC.toRad(90) });

const wallBefore = returnMesh(ABWallGeo, material);
TC.changePosition(wallBefore, { z: height / 2 });

const wallAfter = returnMesh(ABWallGeo, material);
TC.changePosition(wallAfter, { z: -height / 2 });

const walls = [wallLeft, wallRight, wallBefore, wallAfter];
walls.forEach(wall => {
  wall.geometry.boundsTree = new MeshBVH(wall.geometry);
});

app.addScene(...walls);

const ball = returnMesh(new THREE.BoxGeometry(1, 1, 1), material);
ball.position.set(0, 0, 0);
app.addScene(ball);

// 初期速度
let velocity = TC.vec3({x: 0.1, z: 0.1});

app.onBeforeRender(() => {
  // ボールの移動
  ball.position.add(velocity);

  // 衝突判定
  const raycaster = new THREE.Raycaster(ball.position, velocity.clone().normalize(), 0, 0.6);
  for (const wall of walls) {
    const intersects = raycaster.intersectObject(wall, true);
    if (intersects.length > 0) {
      const normal = intersects[0].face?.normal.clone();
      if (normal) {
        normal.transformDirection(wall.matrixWorld);
        velocity.reflect(normal);
        break;
      }
    }
  }
});

app.start();
