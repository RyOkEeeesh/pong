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

export type AppSetting = Partial<{
  add: 	HTMLDivElement | HTMLCanvasElement,
  scene: THREE.Scene,
  backgroundColor: number,
  camera: THREE.PerspectiveCamera,
  cameraPosition: Partial<Vector3Like>,
  renderer: THREE.WebGLRenderer,
  composer: boolean,
  ambientLight: boolean,
  controls: boolean,
  controlArea: HTMLDivElement,
}>

export const ToneMappingTypes = {
  None: THREE.NoToneMapping,
  Linear: THREE.LinearToneMapping,
  Reinhard: THREE.ReinhardToneMapping,
  Cineon: THREE.CineonToneMapping,
  ACESFilmic: THREE.ACESFilmicToneMapping
} as const;

export type ToneMappingKey = keyof typeof ToneMappingTypes;

export class ThreeApp {

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
    const defOp = {
      add: undefined,
      scene: undefined,
      backgroundColor: 0x000000,
      camera: undefined,
      renderer: undefined,
      composer: false,
      ambientLight: true,
      controls: false,
    }

    const op = Object.assign({}, defOp, option) as AppSetting;

    if (op.add instanceof HTMLDivElement || op.add instanceof HTMLCanvasElement) {
      this.width = op.add!.clientWidth;
      this.height = op.add!.clientHeight;
    } else {
      this.width = window.innerWidth;
      this.height = window.innerHeight
    }

    this.initScene({
      scene: op.scene,
      backgroundColor: op.backgroundColor ?? 0x000000
    });

    this.initCamera({
      camera: op.camera,
      position: op.cameraPosition
    });

    this.initRenderer({
      add: op.add,
      renderer: op.renderer
    });

    if (op.composer) this.initComposer();
    if (op.ambientLight)this.initLight();
    if (op.controls || op.controlArea) this.initControls(op.controlArea);
    this.draw = this.draw.bind(this);
  }

  initScene(op: {
    scene?: THREE.Scene | undefined,
    backgroundColor: number
  }) {
    const isScene = (e: any): e is THREE.Scene => e instanceof THREE.Scene;
    this.#scene = isScene(op.scene) ? op.scene : new THREE.Scene();
    this.#scene.background = new THREE.Color(op.backgroundColor);
  }

  addScene(...elements: THREE.Object3D[]) { elements.forEach(e => this.#scene.add(e)); }

  initCamera(op: Partial<{
    camera: THREE.PerspectiveCamera,
    position: Partial<Vector3Like>
  }> = {}) {
    const isCamera = (e: any): e is THREE.Camera => e instanceof THREE.PerspectiveCamera;
    const position = Object.assign({}, { x: 0, y: 5, z: 5 }, op.position);
    this.#camera = isCamera(op.camera) ? op.camera : new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
    this.#camera.position.set(position.x, position.y, position.z);
    this.addScene(this.#camera);
  }

  initRenderer(op: {
    add: HTMLDivElement | HTMLCanvasElement | undefined,
    renderer: THREE.WebGLRenderer | undefined
  }) {

    const addDocument = op.add || document.body;

    const isRenderer = (e: any): e is THREE.WebGLRenderer => e instanceof THREE.WebGLRenderer;

    this.#renderer = isRenderer(op.renderer) ? op.renderer : new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true
    });
    this.#renderer.setSize(this.width, this.height);
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    addDocument.appendChild(this.#renderer.domElement);

    if (op.add) {
      const resizeObserver = new ResizeObserver(() => {
        this.width = op.add!.clientWidth;
        this.height = op.add!.clientHeight;
        this.update();
      });
      resizeObserver.observe(op.add);
    } else {
      window.addEventListener('resize', () => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.update();
      });
    }
  }

  initComposer() {
    this.#composer = new EffectComposer(this.#renderer);
    this.#composer.addPass(new RenderPass(this.#scene, this.#camera));

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      0.8, // 強さ
      0.5, // 半径
      0.65 // しきい値
    );
    this.#composer.addPass(bloomPass);
  }

  initControls(controlArea?: HTMLDivElement) {
    this.#controls = new OrbitControls(this.#camera, controlArea ?? this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.2;
  }

  initLight() {
    this.#ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.addScene(this.#ambientLight);
  }

  update() {
    this.#camera.aspect = this.width / this.height;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(this.width, this.height);
    this.#composer?.setSize(this.width, this.height);
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

export {THREE, OrbitControls, FontLoader, TextGeometry, EffectComposer, RenderPass, UnrealBloomPass};