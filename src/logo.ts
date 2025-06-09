import { App } from './module'

const app = new App(true, true);

const text = await app.loadFontText(
  'PONG',
  /* geometry option */ {
    depth: 0.1,
  }, /* material option */ {
    color: 0x7fba00,
    emissive: 0xa6a6a7,
    emissiveIntensity: 1, // 自発光の強さ
    metalness: 0, // 金属っぽさ 0 : プラスチック　1 : 金属
    roughness: 0 // 表面の粗さ 0: つるつる　1 : ざらざら
  }
);

app.addScene(text);

app.centerObject(text);

app.start();
