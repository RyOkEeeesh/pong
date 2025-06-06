import * as THREE from 'three';
import * as module from './module'

// Three.js の基本セットアップ
let width: number = window.innerWidth;
let height: number = window.innerHeight;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// const light = new THREE.AmbientLight();
// scene.add(light);

camera.position.z = 3;
const controls = new module.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.2;

const loader = new module.FontLoader();
loader.load('./font/Jersey 15_Regular.json',font => {
  const textGeometry = new module.TextGeometry('PONG', {
    font: font,
    size: 1,
    depth: 0.1,
    curveSegments: 1,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.02,
    bevelSegments: 1
  });

  const textMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x7fba00,
    emissiveIntensity: 3,
    metalness: 0.3,
    roughness: 0.2
  });

  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  scene.add(textMesh);
});

const composer = new module.EffectComposer(renderer);
const renderPass = new module.RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new module.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4, // 強さ
  0.5, // 半径
  0.1 // しきい値
);
composer.addPass(bloomPass);


renderer.render(scene, camera);

const draw = () => {
  controls.update(); // カメラ操作の更新も忘れずに
  composer.render(); // ← ここを renderer.render から composer.render に変更
  requestAnimationFrame(draw);
};

draw();
