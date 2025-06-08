import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree
} from 'three-mesh-bvh';

// 型拡張
declare module 'three' {
  interface BufferGeometry {
    computeBoundsTree: typeof computeBoundsTree;
    disposeBoundsTree: typeof disposeBoundsTree;
  }
  interface Mesh {
    raycast: typeof acceleratedRaycast;
  }
}

// 拡張適用
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// シーン構築
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Box（動かす対象）
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshNormalMaterial();
const box = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(box);

// 壁
const wallGeometry = new THREE.BoxGeometry(10, 1, 1);
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.position.z = -5;
scene.add(wall);

// BVH構築
wall.geometry.computeBoundsTree();

// キー入力
const keys = { ArrowUp: false };

window.addEventListener('keydown', (e) => {
  if (e.key in keys) keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key in keys) keys[e.key] = false;
});

// アニメーションループ
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // 移動処理
  if (keys.ArrowUp) {
    const direction = new THREE.Vector3(0, 0, -1);
    const raycaster = new THREE.Raycaster(box.position, direction, 0, 0.6);
    const intersects = raycaster.intersectObject(wall);

    if (intersects.length === 0) {
      box.position.addScaledVector(direction, delta * 2);
    } else {
      console.log('壁にぶつかった！');
    }
  }

  renderer.render(scene, camera);
}
animate();
