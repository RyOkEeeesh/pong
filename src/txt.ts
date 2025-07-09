import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry, THREE } from "./ThreeModule";
import { MeshStandardMaterialParameters } from "three";

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

export class Txt{
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