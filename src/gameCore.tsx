import * as THREE from 'three';
import { forwardRef, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ACCELERATION, BALL_SIZE, BALL_SPEED, BALL_SPEED_MAX, FramePriority, FRICTION, GAME_POINT_MAX, GameStatus, GOAL_1, GOAL_2, PADDLE_1, PADDLE_2, PADDLE_DEPTH, PADDLE_HALF_X, PADDLE_POSITION_Z1, PADDLE_POSITION_Z2, SIDE_1, SIDE_2, STAGE_HEIGHT, STAGE_WIDTH, WALL_DEPTH, WALL_HEIGHT } from './constants';
import { useGameStore, coreStore } from './store';
import { Hit, intersect } from './core';

function SetDelta() {
  useFrame((_, delta) => { coreStore.delta = delta }, FramePriority.SetDelta);
  return null;
}

type Object2d = { name: string; ref: React.RefObject<THREE.Box2> };

type ObjectProps = {
  args: ConstructorParameters<typeof THREE.Box2>;
};

function move(obj: Object2d, position: THREE.Vector2) {
  const size = new THREE.Vector2();
  obj.ref.current.getSize(size);
  obj.ref.current.setFromCenterAndSize(position, size);

  const center = new THREE.Vector2();
  obj.ref.current.getCenter(center);
}

const Box2 = forwardRef<THREE.Box2, ObjectProps>((props, ref) => 
  <box2 ref={ref} {...props} />
);

function ballArgs(): ConstructorParameters<typeof THREE.Box2> {
  return [
    new THREE.Vector2(-BALL_SIZE / 2, -BALL_SIZE / 2),
    new THREE.Vector2(BALL_SIZE / 2, BALL_SIZE / 2)
  ];
}

function paddleArgs(): ConstructorParameters<typeof THREE.Box2> {
  return [
    new THREE.Vector2(-PADDLE_HALF_X, -PADDLE_DEPTH / 2),
    new THREE.Vector2(PADDLE_HALF_X, PADDLE_DEPTH / 2)
  ];
}

function sideWallArgs(): ConstructorParameters<typeof THREE.Box2> {
  return [
    new THREE.Vector2(-WALL_DEPTH / 2, -STAGE_HEIGHT / 2),
    new THREE.Vector2(WALL_DEPTH / 2, STAGE_HEIGHT / 2)
  ];
}

function goalWallArgs(): ConstructorParameters<typeof THREE.Box2>{
  return [
    new THREE.Vector2(-STAGE_WIDTH / 2, -WALL_DEPTH / 2),
    new THREE.Vector2(STAGE_WIDTH / 2, WALL_DEPTH / 2)
  ];
}

export function CliGameCore() {
  const ball: Object2d = { name: 'ball', ref: useRef<THREE.Box2>(null!) };
  const paddles: [Object2d, Object2d] = [
    { name: PADDLE_2, ref: useRef<THREE.Box2>(null!) },
    { name: PADDLE_1, ref: useRef<THREE.Box2>(null!) }
  ];
  const walls: [Object2d, Object2d, Object2d, Object2d] = [
    { name: GOAL_1, ref: useRef<THREE.Box2>(null!) },
    { name: GOAL_2, ref: useRef<THREE.Box2>(null!) },
    { name: SIDE_1, ref: useRef<THREE.Box2>(null!) },
    { name: SIDE_2, ref: useRef<THREE.Box2>(null!) }
  ];

  const argsList = useMemo(() => [
    ballArgs(),
    paddleArgs(),
    paddleArgs(),
    goalWallArgs(),
    goalWallArgs(),
    sideWallArgs(),
    sideWallArgs()
  ], []);

  useEffect(() => {
    if (
      !paddles[0].ref.current ||
      !paddles[1].ref.current ||
      !walls[0].ref.current ||
      !walls[1].ref.current ||
      !walls[2].ref.current ||
      !walls[3].ref.current
    ) return;
    move(paddles[0], new THREE.Vector2(0, PADDLE_POSITION_Z2));
    move(paddles[1], new THREE.Vector2(0, PADDLE_POSITION_Z1));
    move(walls[0], new THREE.Vector2(0, STAGE_HEIGHT / 2));
    move(walls[1], new THREE.Vector2(0, -STAGE_HEIGHT / 2));
    move(walls[2], new THREE.Vector2(-STAGE_WIDTH / 2, 0));
    move(walls[3], new THREE.Vector2(STAGE_WIDTH / 2, 0));
  }, []);

  function handleHitPaddle() {
    const paddlePos = coreStore.paddlesPosition[Number(coreStore.ballPosition.y > 0)];

    const normalized = THREE.MathUtils.clamp(
      (coreStore.ballPosition.x - paddlePos) / PADDLE_HALF_X,
      -1,
      1
    );
    const maxAngle = Math.PI / 3;
    const angle = normalized * maxAngle;
    coreStore.velocity.set(
      coreStore.ballSpeed * Math.sin(angle),
      -Math.sign(coreStore.ballPosition.y) * coreStore.ballSpeed * Math.cos(angle)
    );
    coreStore.ballSpeed = Math.min(coreStore.ballSpeed + ACCELERATION, BALL_SPEED_MAX);
  }

  function handleHitSideWall() {
    coreStore.velocity.x *= -1;
  }
  
  function processAddPoint() {
    const { points, setIsMatch, setIsEnd } = useGameStore.getState();
    const max = Math.max(...points);
    if (coreStore.gamePoint - max === 1) {
      if (points[0] === points[1] && GAME_POINT_MAX - max !== 1) {
        coreStore.gamePoint = Math.min(coreStore.gamePoint + 1, GAME_POINT_MAX);
        setIsMatch(false);
      } else setIsMatch(true);
    } else if (coreStore.gamePoint === max) setIsEnd();
  }

  function handleHitGoalWall() {
    const { addPoint } = useGameStore.getState();
    coreStore.ballSpeed = BALL_SPEED;
    coreStore.velocity.set(0, 0);
    coreStore.pointGetter = coreStore.ballPosition.y < 0;
    addPoint();
    processAddPoint();
    coreStore.gameStatus = GameStatus.GetPoint;
  }

  function handleHit(obj: Object2d, hit: Hit) {
    const { setHit } = useGameStore.getState();
    if (obj.name === PADDLE_1 || obj.name === PADDLE_2) {
      if (Math.abs(hit.normal.y) > 0.9) {
        handleHitPaddle();
        setHit(obj.name, hit.point, hit.normal);
        return;
      }
      handleHitSideWall();
      return;
    }
    if (obj.name === SIDE_1 || obj.name === SIDE_2) {
      handleHitSideWall();
      setHit(obj.name, hit.point, hit.normal);
      return;
    }
    handleHitGoalWall();
  }

  function onHit(ball: THREE.Box2, obj: Object2d): boolean {
    const hit = intersect(ball, obj.ref.current);
    if (hit) {
      handleHit(obj, hit);
      if (obj.name !== PADDLE_1 && obj.name !== PADDLE_2)
        coreStore.ballPosition.copy(hit.point);
      return true;
    }
    return false;
  }

  const done = useRef<boolean>(false);

  function accept(): boolean {
    if (coreStore.acceptNextStatus) {
      coreStore.acceptNextStatus = false;
      done.current = false;
      return true;
    }
    return false;
  }

  const tmpVec2 = useRef<THREE.Vector2>(new THREE.Vector2());

  function moveBallForPaddle() {
    const posY = coreStore.pointGetter ? PADDLE_POSITION_Z2 : PADDLE_POSITION_Z1;
    coreStore.ballPosition.set(
        coreStore.paddlesPosition[Number(!coreStore.pointGetter)],
        posY - Math.sign(posY) * 1.2
    );
  }

  const beforeBallPosition = useRef<THREE.Vector2 | null>(null);
  const beforePaddlePosition = useRef<THREE.Vector2 | null>(null);
  const ballVelocity = useRef<THREE.Vector2>(new THREE.Vector2());
  const paddleVelocity = useRef<THREE.Vector2>(new THREE.Vector2());

  function changeServePosition() {
    const newBallPos = coreStore.ballPosition.clone();
    const paddlePos = new THREE.Vector2(coreStore.paddlesPosition[Number(!coreStore.pointGetter)], 0);

    if ( !beforeBallPosition.current || !beforePaddlePosition.current ) {
      beforeBallPosition.current = newBallPos;
      beforePaddlePosition.current = paddlePos;
      return;
    }

    ballVelocity.current.subVectors(newBallPos, beforeBallPosition.current).divideScalar(coreStore.delta);
    paddleVelocity.current.subVectors(paddlePos, beforePaddlePosition.current!).divideScalar(coreStore.delta);
    beforeBallPosition.current.copy(coreStore.ballPosition);
    beforePaddlePosition.current.copy(paddlePos);

    if (paddleVelocity.current.x !== ballVelocity.current.x) {
      ballVelocity.current.multiplyScalar(FRICTION);
      if(ballVelocity.current.lengthSq() < 0.0001) ballVelocity.current.set(0, 0);
      newBallPos.x += ballVelocity.current.x * coreStore.delta;
      newBallPos.x = THREE.MathUtils.clamp(newBallPos.x, -STAGE_WIDTH / 2 + 0.8, STAGE_WIDTH / 2 - 0.8);
    }

    newBallPos.x = THREE.MathUtils.clamp(
      newBallPos.x,
      paddlePos.x - PADDLE_HALF_X + BALL_SIZE / 2,
      paddlePos.x + PADDLE_HALF_X - BALL_SIZE / 2
    );
    coreStore.ballPosition.copy(newBallPos);
  }

  function resetBeforePositions() {
    beforeBallPosition.current = null;
    beforePaddlePosition.current = null;
  }

  function updatePaddlesPosition() {
    move(paddles[0], tmpVec2.current.set(coreStore.paddlesPosition[0] ,PADDLE_POSITION_Z2));
    move(paddles[1], tmpVec2.current.set(coreStore.paddlesPosition[1] ,PADDLE_POSITION_Z1));
  }

  function updateBallPosition() {
    move(ball, coreStore.ballPosition);
  }

  useFrame(() => {
    updatePaddlesPosition();

    if (coreStore.gameStatus === GameStatus.First) {
      if (!done.current) {
        done.current = true;
        moveBallForPaddle();
      } else if (accept())
        coreStore.gameStatus = GameStatus.Serving;
    } else if (coreStore.gameStatus === GameStatus.Serving) {
      changeServePosition();
      if(coreStore.serveHit) {
        coreStore.serveHit = false;
        handleHitPaddle();
        resetBeforePositions();
        coreStore.gameStatus = GameStatus.Playing;
      }
    } else if (coreStore.gameStatus === GameStatus.Playing) {
      coreStore.ballPosition.addScaledVector(coreStore.velocity, coreStore.delta);
      updateBallPosition();
      for (const obj of [ ...walls, ...paddles ])
        if (onHit(ball.ref.current, obj)) break;
      if (coreStore.gameStatus !== GameStatus.Playing) {
        if (!done.current) {
          done.current = true;
          useGameStore.getState().isEnd
            ? coreStore.ballPosition.set(0, 0)
            : moveBallForPaddle();
        }
      }
    } else if (coreStore.gameStatus === GameStatus.GetPoint) {
      if (accept()) coreStore.gameStatus = useGameStore.getState().isEnd ? GameStatus.End : GameStatus.Serving;
    } else { // GameStatus.End
      if (accept()) {
        // reset all してから
        // coreStore.gameStatus = GameStatus.First;
      }
    }

    updateBallPosition();
  }, FramePriority.GameCore);

  return (
    <>
      <SetDelta />
      {[ ball, ...paddles, ...walls ].map((obj, i) => 
        <Box2 key={obj.name} ref={obj.ref} args={argsList[i]} />
      )}
    </>
  )
}

