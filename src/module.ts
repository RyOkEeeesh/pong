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

type AppSetting = Partial<{
  add: 	HTMLDivElement,
  cameraPosition: Partial<Vector3Like>,
  backgroundColor: number,
  controls: boolean,
  composer: boolean
}>

export const ToneMappingTypes = {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  Cineon: THREE.CineonToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping
} as const;

export type ToneMappingKey = keyof typeof ToneMappingTypes;

type GeoOp = {
  font: Font; // 必須
  size?: number;
  depth?: number;
  curveSegments?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
};

type FontOp = Partial<{
  fontURL: string,
  lineHeight: number,
  geometryOption: Partial<GeoOp>,
  materialOption: Partial<MeshStandardMaterialParameters>
}>

export class App {

  #start: boolean = false;
  #stop: boolean = false;

  #beforeRenderCallbacks: Callback[] = [];
  #afterRenderCallbacks: Callback[] = [];
  #animationId: number | null = null;

  width: number;
  height: number;
  #scene!:THREE.Scene;
  #camera!: THREE.PerspectiveCamera;
  #controls: OrbitControls | null = null;
  #renderer!: THREE.WebGLRenderer;
  #ambientLight!: THREE.AmbientLight;
  #composer!: EffectComposer;

  constructor(option?: AppSetting) {
    this.width = option?.add?.clientWidth || window.innerWidth;
    this.height = option?.add?.clientHeight ||  window.innerHeight;

    this.initScene(option?.backgroundColor);
    this.initCamera(option?.cameraPosition);
    this.initRenderer(option?.add);
    if (option?.composer) this.initComposer();
    this.initLight();
    if (option?.controls) this.initControls();
    this.draw = this.draw.bind(this);
  }

  initScene(backgroundColor: number = 0x000000) {
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(backgroundColor);
  }

  addScene(...elements: THREE.Object3D[]) { elements.forEach(e => this.#scene.add(e)); }

  initCamera(position: Partial<Vector3Like> = {}) {
    const defaultPosition: Vector3Like = { x: 0, y: 0, z: 5 };
    const finalPosition: Vector3Like = Object.assign({}, defaultPosition, position);

    this.#camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.#camera.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
    this.addScene(this.#camera);
  }

  initRenderer(add?:	HTMLDivElement) {
    const addDocument = add ?? document.body;

    this.#renderer = new THREE.WebGLRenderer({antialias: true});
    this.#renderer.setSize(this.width, this.height);
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    addDocument.appendChild(this.#renderer.domElement);

    if(!add) {
      window.addEventListener('resize', () => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.#camera.aspect = this.width / this.height;
        this.#camera.updateProjectionMatrix();
        this.#renderer.setSize(this.width, this.height);
        this.#composer?.setSize(this.width, this.height);
      });
    }

  }

  initComposer() {
    this.#composer = new EffectComposer(this.#renderer);
    this.#composer.addPass(new RenderPass(this.#scene, this.#camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      1, // 強さ
      0.1, // 半径
      0.5 // しきい値
    );
    this.#composer.addPass(bloomPass);
  }

  initControls() {
    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.2;
  }

  initLight() {
    this.#ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.addScene(this.#ambientLight);
  }

  removeFromScene(...objects: THREE.Object3D[]) {
    objects.forEach(obj => this.#scene.remove(obj));
  }

  onBeforeRender(callback: Callback) {
    if (callback) this.#beforeRenderCallbacks.push(callback);
  }

  onAfterRender(callback: Callback) {
    if (callback) this.#afterRenderCallbacks.push(callback);
  }

  setToneMapping(
    type: ToneMappingKey,
    exposure: number = 1.0
  ) {
    this.#renderer.toneMapping = ToneMappingTypes[type];;
    this.#renderer.toneMappingExposure = exposure;
  }

  draw() {
    if (!this.#start) return;

    this.#beforeRenderCallbacks.forEach(cb => cb?.());

    this.#controls?.update();
    this.#composer
      ? this.#composer.render()
      : this.#renderer.render(this.#scene, this.#camera);

    this.#afterRenderCallbacks.forEach(cb => cb?.());

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

  get camera(): THREE.PerspectiveCamera {
    return this.#camera;
  }

  get scene(): THREE.Scene {
    return this.#scene;
  }

  get renderer(): THREE.WebGLRenderer {
    return this.#renderer;
  }

  get composer(): EffectComposer | undefined {
    return this.#composer;
  }

  get controls(): OrbitControls | null {
    return this.#controls;
  }

  get animationId(): number | null {
    return this.#animationId;
  }

}

export class txtMesh{
  #fontURL: string;
  #fontCache: Map<string, Font> = new Map();

  constructor(urls?: string[]) {
    this.#fontURL = './font/Jersey15_Regular.json';
    this.fontLoader();
    urls?.forEach((url) => this.fontLoader(url));
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

  async loadFontText(text: string, option: FontOp ) {
    const font = await this.fontLoader(option?.fontURL);

    const defaultGeoOp: GeoOp = {
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

    const geoOp = Object.assign({}, defaultGeoOp, option?.geometryOption);
    const matOp = Object.assign({}, defaultMatOp, option?.materialOption);

    const geometry = new TextGeometry(text, geoOp);
    geometry.center();
    const material = new THREE.MeshStandardMaterial(matOp);

    return new THREE.Mesh(geometry, material);
  }

  async loadMultilineText(text: string, option: FontOp) {
    const lines = text.split('\n');
    const group = new THREE.Group();

    for (let i = 0; i < lines.length; i++) {
      const mesh = await this.loadFontText(lines[i], option);
      mesh.position.y = -i * (option?.lineHeight ?? 1.2);
      group.add(mesh);
    }

    return group;
  }

  clearFontCache() {
    this.#fontCache.clear();
  }

  async updateText(group: THREE.Group, newText: string, option: FontOp) {
    const newGroup = await this.loadMultilineText(newText, option);

    // 古いメッシュを削除
    group.clear();

    // 新しいメッシュを追加
    newGroup.children.forEach(child => {
      group.add(child.clone());
    });
  }

}

export const TC = {

  toRad(deg: number) {
    return THREE.MathUtils.degToRad(deg)
  },

  vec2(vec: Partial<{x: number, y: number}>) {
    const { x = 0, y = 0 } = vec;
    return new THREE.Vector2(x, y);
  },

  vec3(vec: Partial<Vector3Like>) {
    const { x = 0, y = 0, z = 0 } = vec;
    return new THREE.Vector3(x, y, z);
  },

  changePosition(
    target: THREE.Object3D,
    position: Partial<Vector3Like>
  ) {
    target.updateMatrixWorld();
    const { x = target.position.x, y = target.position.y, z = target.position.z } = position;
    target.position.set(x, y, z);
    target.updateMatrixWorld();
  },

  changeRotation(
    target: THREE.Object3D,
    rotation: Partial<Vector3Like>
  ) {
    target.updateMatrixWorld();
    const { x = target.rotation.x, y = target.rotation.y, z = target.rotation.z } = rotation;
    target.rotation.set(x, y, z);
    target.updateMatrixWorld();
  },

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
    target.updateMatrixWorld();
  },

  centerObject(target: THREE.Object3D) {
    target.updateMatrixWorld();

    const box = new THREE.Box3().setFromObject(target);
    const center = new THREE.Vector3();
    box.getCenter(center);
    target.position.sub(center);
    target.updateMatrixWorld();
  }

}

export {THREE, OrbitControls, FontLoader, TextGeometry, EffectComposer, RenderPass, UnrealBloomPass};