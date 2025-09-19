import * as THREE from 'three';

export const STAGE_HEIGHT = 28;
export const STAGE_WIDTH = 22.4;

export const WALL_HEIGHT = 1;
export const WALL_DEPTH = 0.1;

export const PADDLE_WIDTH = STAGE_WIDTH / 6;
export const PADDLE_HALF_X = PADDLE_WIDTH / 2;
export const PADDLE_HEIGHT = 1;
export const PADDLE_DEPTH = 1;

export const BALL_SIZE = 1;
export const BALL_SPEED = 28;
export const BALL_SPEED_MAX = 100;
export const ACCELERATION = 0.2;

export const PADDLE_POSITION_Z1 = STAGE_HEIGHT / 2 - 1;
export const PADDLE_POSITION_Z2 = -STAGE_HEIGHT / 2 + 1;

export const GAME_POINT = 3;
export const GAME_POINT_MAX = 6;

export const FRICTION = 0.965;

// Mesh Name
export const PADDLE_1 = 'paddle1';
export const PADDLE_2 = 'paddle2';

export const GOAL_1 = 'goalWall1';
export const GOAL_2 = 'goalWall2';

export const SIDE_1 = 'sideWall1';
export const SIDE_2 = 'sideWall2';

export const EFFECT_MESH_WIDTH = 1.5;

export const EFFECT_MATERIAL_ARGS = {
  color: 0x000000,
  emissive: 0xffffff,
  emissiveIntensity: 3,
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide,
  depthWrite: false
};

export enum CPUMode {
  Easy,
  Normal,
  Hard
}

export enum GameMode {
  Selecting,
  Single,
  Duo,
  Multi
};

export enum GameStatus {
  Waiting,
  First,
  Serving,
  Playing,
  GetPoint,
  End,
  Pause
};

// role

export enum SendType {
  Client,
  Server
};

export enum RoleStatus {
  P1,
  P2,
  Spectator, // SerOnly
}

export enum MsgType {
  Join,
  RequestRole,
  Init,
  Ready,
  Playing,
  Exit
}

export enum ServerStatus {
  Lobby,
  Game
}

export type UUID = string;

export interface JoinMsg {
  type: MsgType.Join;
  id?: UUID; // Ser
}

export interface RequestRoleMsg {
  type: MsgType.RequestRole;
  role: RoleStatus;
}

export type Player = {
  name: string;
  id: UUID;
  role: RoleStatus;
  ready: boolean;
};

export interface InitMsg {
  type: MsgType.Init;
  players: Player[];
}

export interface ReadyMsg {
  type: MsgType.Ready;
  readyStatus: boolean;
}

export interface CliPlayingMsg {
  type: MsgType.Playing;
  paddlePosition: number;
  serveHit?: boolean;
}

export interface SerPlayingMsg {
  type: MsgType.Playing;
  gameStatus: GameStatus;
  ballPositon: [number, number];
  paddlePositions: [number, number];
  ballSpeed?: number;
  velocity?: [number, number];
  points?: [number, number];
  matchPoint?: boolean;
  isFinish?: boolean;
  serveHit?: boolean;
}

export interface ExitMsg {
  type: MsgType.Exit;
  playerID?: UUID; // サーバが送る
  reason?: number;
}

export type ClientMsg = RequestRoleMsg | ReadyMsg | CliPlayingMsg | ExitMsg ;
export type ServerMsg = JoinMsg | InitMsg | SerPlayingMsg | ExitMsg ;