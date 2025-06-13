import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
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

export type FontOp = Partial<{
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

    this.#renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true
    });
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
      0.5, // 半径
      0.6 // しきい値
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
    urls?.forEach(url => this.fontLoader(url));
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
    group.clear();
    newGroup.children.forEach(child => group.add(child.clone()));
  }

}

export class UserSetting {

}

export class Game extends App{

  wallLeft!: THREE.Mesh;
  wallRight!: THREE.Mesh;
  wallBefore!: THREE.Mesh;
  wallAfter!: THREE.Mesh;
  walls: THREE.Mesh[] = [];

  ball!: THREE.Mesh;

  myPaddle!: THREE.Mesh;
  enemyPaddle!: THREE.Mesh;

  ballSpeed: number = 20;
  ballVelocity!: THREE.Vector3;

  clock: THREE.Clock = new THREE.Clock();
  deltaTime! :number;

  myPoint: number = 0;
  enemyPoint: number = 0;

  constructor(option?: AppSetting) {
    super(option)

    this.ballVelocity = TC.vec3({x: 0.1, z: 0.1}).normalize().multiplyScalar(this.ballSpeed);
    this.initStage();
  }

  initStage() {
    THREE.Mesh.prototype.raycast = acceleratedRaycast;

    const returnMesh = (geo: THREE.BoxGeometry, mat: THREE.Material) => new THREE.Mesh(geo, mat);
    
    const height = 28;
    const width = height / 4 * 3;

    const paddleWidth = width / 5;

    const boxHeight = 1;
    const boxDepth = 0.1;
    
    const sideWallGeo = new THREE.BoxGeometry(height - boxDepth, boxHeight, boxDepth);
    const ABWallGeo = new THREE.BoxGeometry(width + boxDepth, boxHeight, boxDepth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.25, // 自発光の強さ
      metalness: 0, // 金属っぽさ
      roughness: 0 // 表面の粗さ
    });
    
    this.wallLeft = returnMesh(sideWallGeo, material);
    TC.changePosition(this.wallLeft, { x: -width / 2 });
    TC.changeRotation(this.wallLeft, { y: TC.toRad(-90) });
    
    this.wallRight = returnMesh(sideWallGeo, material);
    TC.changePosition(this.wallRight, { x: width / 2 });
    TC.changeRotation(this.wallRight, { y: TC.toRad(90) });
    
    this.wallBefore = returnMesh(ABWallGeo, material);
    TC.changePosition(this.wallBefore, { z: height / 2 });
    
    this.wallAfter = returnMesh(ABWallGeo, material);
    TC.changePosition(this.wallAfter, { z: -height / 2 });
    
    this.walls = [this.wallLeft, this.wallRight, this.wallBefore, this.wallAfter];
    this.walls.forEach(wall => wall.geometry.boundsTree = new MeshBVH(wall.geometry));
    
    super.addScene(...this.walls);

    const paddleGeo = new THREE.BoxGeometry(paddleWidth, 1, 1);

    this.myPaddle = returnMesh(paddleGeo, material);
    this.myPaddle.geometry.boundsTree = new MeshBVH(this.myPaddle.geometry);
    TC.changePosition(this.myPaddle, { z: height / 2 - 1 });
    this.myPaddle.geometry.computeBoundingBox();


    this.enemyPaddle = returnMesh(paddleGeo, material);
    this.enemyPaddle.geometry.boundsTree = new MeshBVH(this.enemyPaddle.geometry);
    TC.changePosition(this.enemyPaddle, { z: -height / 2 + 1 });
    this.enemyPaddle.geometry.computeBoundingBox();

    super.addScene(this.myPaddle, this.enemyPaddle)


    this.ball = returnMesh(new THREE.BoxGeometry(1, 1, 1), material);
    this.ball.position.set(0, 0, 0);
    super.addScene(this.ball);
  }

  reflectorGame() {
    this.deltaTime = Math.min(this.clock.getDelta(), 0.05);

  }

  createStretchEffect(center: THREE.Vector3, wallNormal: THREE.Vector3, wall: THREE.Mesh) {
    const duration = 750;
    const width = 1;
    const height = 1;
    const maxOffset = 3;
    const depthOffset = 0.01;

    const wallTangent = new THREE.Vector3().crossVectors(wallNormal, new THREE.Vector3(0, 1, 0)).normalize();

    wall.geometry.computeBoundingBox();
    const wallSize = new THREE.Vector3();
    wall.geometry.boundingBox?.getSize(wallSize);
    wall.updateMatrixWorld();

    const wallCenter = new THREE.Vector3();
    wall.getWorldPosition(wallCenter);

    const wallDirection = wallTangent.clone(); // 壁の横方向
    const halfLength = wallSize.x / 2;
    const wallStart = wallCenter.clone().add(wallDirection.clone().multiplyScalar(-halfLength));
    const wallEnd = wallCenter.clone().add(wallDirection.clone().multiplyScalar(halfLength));

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;

      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveIntensity: 3,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);

      const basePosition = center.clone().add(wallNormal.clone().multiplyScalar(depthOffset));
      mesh.position.copy(basePosition);

      const planeNormal = new THREE.Vector3(0, 0, 1);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(planeNormal, wallNormal.clone().normalize());
      mesh.quaternion.copy(quaternion);

      this.scene.add(mesh);

      const startTime = performance.now();
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          this.scene.remove(mesh);
          return;
        }

        const offset = wallTangent.clone().multiplyScalar(maxOffset * progress * side);
        let effectPos = basePosition.clone().add(offset);

        const localOffset = effectPos.clone().sub(wallStart);
        const projectedLength = localOffset.dot(wallDirection);
        const halfEffectWidth = width / 2;

        if (projectedLength < halfEffectWidth) {
          effectPos = wallStart.clone().add(wallDirection.clone().multiplyScalar(halfEffectWidth));
        } else if (projectedLength > wallSize.x - halfEffectWidth) {
          effectPos = wallEnd.clone().add(wallDirection.clone().multiplyScalar(-halfEffectWidth));
        }

        mesh.position.copy(effectPos);
        material.opacity = 1 - progress;
        material.emissiveIntensity = 3 * (1 - progress);

        requestAnimationFrame(animate);
      };
      animate();
    }
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