import { App } from './module'

const app = new App(true, true);

const text = await app.loadFontText('PONG');

app.addScene(text);

app.start();
