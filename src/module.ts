import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Font, FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';


export type Vector3Like = {
  x: number;
  y: number;
  z: number;
};


export class App {
  #fontURL: string;
  width: number;
  height: number;
  scene!:THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  renderer!: THREE.WebGLRenderer;
  ambientLight!: THREE.AmbientLight;
  composer!: EffectComposer;

  constructor(composer: boolean = true, control: boolean = true) {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.#fontURL = './font/Jersey15_Regular.json';

    this.initScene();
    this.initCamera();
    this.initRenderer();
    if (composer) this.initComposer();
    this.initLight();
    if (control) this.initControls();
    this.draw = this.draw.bind(this);
  }

  initScene(backgroundColor: number = 0x000000) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);
  }

  addScene(...elements: THREE.Object3D[]) { elements.forEach(e => this.scene.add(e)); }

  initCamera(position: Vector3Like = {
    x: 0,
    y: 0,
    z: 5
  }) {
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.set(position.x, position.y, position.z);
    this.addScene(this.camera);
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(window.devicePixelRatio);
    });
  }

  initComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      1, // 強さ
      0.4, // 半径
      0.85 // しきい値
    );
    this.composer.addPass(bloomPass);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.2;
  }

  initLight() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.addScene(this.ambientLight);
  }

  async loadFontText(text: string) {
    const fontLoader = new FontLoader();
    const font = await new Promise<Font>((resolve, reject) => fontLoader.load(this.#fontURL, resolve, undefined, reject));

    const geometry = new TextGeometry(text, {
      font,
      size: 1,
      depth: 0.1,
      curveSegments: 1,
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.02,
      bevelSegments: 1
    });

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x7fba00,
      emissiveIntensity: 2,
      metalness: 0.3,
      roughness: 0.2
    });

    return new THREE.Mesh(geometry, material);
  }


  draw() {
    this.controls?.update();
    this.composer ? this.composer.render() : this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.draw);
  }

  start() { this.draw(); }
}


export {OrbitControls, FontLoader, TextGeometry, EffectComposer, RenderPass, UnrealBloomPass};