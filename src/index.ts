import { CPUMode } from "./cpu";
import { Game } from "./game";
import { GameMode } from "./manager";
import { SingleMode } from "./mode";

const game = new Game();

(async() => {
  getParam();
  await game.stage.isLoad()
  game.start();
})();

function setModeSelecting() {
  game.setMode(GameMode.Selecting);
  //メニュー表示など
}

function setModeSingle(m: string | null) {
  const mode: CPUMode = Number(m ?? CPUMode.Normal)
  game.setMode(GameMode.Single);
  if (game.gameMode instanceof SingleMode) game.gameMode.initCPU(mode);
}

function setModeDuo() {
  game.setMode(GameMode.Duo);
}

function setModeMulti() {
  game.setMode(GameMode.Multi);
}

function getParam() {
  const param = new URLSearchParams(location.search);
  const mode: GameMode = Number(param.get('mode') ?? GameMode.Selecting);
  switch (mode) {
    case GameMode.Selecting:
      setModeSelecting();
      break;
    case GameMode.Single:
      setModeSingle(param.get('cpu'));
      break;
    case GameMode.Duo:
      setModeDuo();
      break
    case GameMode.Multi:
      setModeMulti();
      break;
  }
}