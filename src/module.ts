import * as THREE from 'three';
import type { MeshStandardMaterialParameters } from 'three';
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

export type Callback = (() => void) | null;

type typeGeoOp = {
  font: Font;
  size?: number;
  depth?: number;
  curveSegments?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
};


export class App {
  #fontURL: string;
  #start: boolean = false;
  #stop: boolean = false;

  #fontCache: Map<string, Font> = new Map();
  #animationId: number | null = null;

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

  initCamera(position: Partial<Vector3Like> = {}) {
    const defaultPosition: Vector3Like = { x: 0, y: 0, z: 5 };
    const finalPosition: Vector3Like = Object.assign({}, defaultPosition, position);

    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.camera.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
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
      this.composer?.setSize(this.width, this.height);
    });
  }

  initComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      1, // 強さ
      0.1, // 半径
      0.5 // しきい値
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

  async fontLoader(font?: string): Promise<Font> {
    const fontURL = font ?? this.#fontURL;

    if (this.#fontCache.has(fontURL)) return this.#fontCache.get(fontURL)!;

    const fontLoader = new FontLoader();
    const loadedFont = await new Promise<Font>((resolve, reject) =>
      fontLoader.load(fontURL, resolve, undefined, reject)
    );

    this.#fontCache.set(fontURL, loadedFont);
    return loadedFont;
  }

  async loadFontText(text: string, geometryOption?: Partial<typeGeoOp>, materialOption?: Partial<MeshStandardMaterialParameters> ) {
    const font = await this.fontLoader();

    const defaultGeoOp: typeGeoOp = {
      font,
      size: 1,
      depth: 0,
      curveSegments: 1,
      bevelEnabled: false,
    }

    const defaultMatOp: MeshStandardMaterialParameters = {
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8, // 自発光の強さ
      metalness: 0.3, // 金属っぽさ
      roughness: 0.2 // 表面の粗さ
    }

    const geoOp = Object.assign({}, defaultGeoOp, geometryOption);
    const matOp = Object.assign({}, defaultMatOp, materialOption);

    const geometry = new TextGeometry(text, geoOp);
    const material = new THREE.MeshStandardMaterial(matOp);

    return new THREE.Mesh(geometry, material);
  }

  
  removeFromScene(...objects: THREE.Object3D[]) {
    objects.forEach(obj => this.scene.remove(obj));
  }

  changePosition(
    target: THREE.Object3D,
    position: Partial<Vector3Like>
  ) {
    target.updateMatrixWorld();
    const { x = target.position.x, y = target.position.y, z = target.position.z } = position;
    target.position.set(x, y, z);
  }

  changeRotation(
    target: THREE.Object3D,
    rotation: Partial<Vector3Like>
  ) {
    target.updateMatrixWorld();
    const { x = target.rotation.x, y = target.rotation.y, z = target.rotation.z } = rotation;
    target.rotation.set(x, y, z);
  }

  changeScale(
    target: THREE.Object3D,
    scale: Partial<Vector3Like> | number
  ) {
    target.updateMatrixWorld();
    let x: number, y: number, z: number;

    if (typeof scale === 'number') {
      x = y = z = scale;
    } else {
    // オブジェクトなら、指定された軸だけ変更し、他は元の値を使う
      x = scale.x ?? target.scale.x;
      y = scale.y ?? target.scale.y;
      z = scale.z ?? target.scale.z;
    }

    target.scale.set(x, y, z);
  }

  centerObject(target: THREE.Object3D) {
    target.updateMatrixWorld();

    const box = new THREE.Box3().setFromObject(target);
    const center = new THREE.Vector3();
    box.getCenter(center);
    target.position.sub(center);
  }

  draw() {
    if (!this.#start) return
    this.controls?.update();
    this.composer ? this.composer.render() : this.renderer.render(this.scene, this.camera);

    if (!this.#stop) this.#animationId = requestAnimationFrame(this.draw);
  }

  start() {
    this.#start = true;
    this.#stop = false;
    this.draw();
  }

  stop() {
    this.#start = false;
    this.#stop = true;
    if (this.#animationId !== null) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }
  }
}



export {OrbitControls, FontLoader, TextGeometry, EffectComposer, RenderPass, UnrealBloomPass};