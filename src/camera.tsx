import { PerspectiveCamera, KeyboardControls, useKeyboardControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from './store';
import { fitObject, trackingLookAt } from './CameraControl';
import { FramePriority, RoleStatus, STAGE_WIDTH } from './constants';
import { useShallow } from 'zustand/shallow';

/**
 * GameMode: カメラ | 仕様
 *  セレクト: motion | カメラは動かせない、勝手に追従とかして動いてる
 *  シングル: 0,1,2 | カメラ切り替え可
 *  デュオ: 1,2 | pcは2、スマホとタブレットは1
 *  マルチ: motion,0,1,2 | プレイヤーはシングル同様、観戦者はmotionをコントロール可能
 * 
 * motionの移動 ( isObjectFitRef.current = true になってから、移動 )
 *  ゲームモード選択時: 周りくるくるしたり、ボール追従したり
 *  ゲームモード選択完了後: 2カメの位置に移動
 *  ゲーム詳細選択ホバー
 *    シングル: lookAt(paddle2)、CPUの強さを選択してるものに変更
 *    デュオ: そのまま2カメ
 *    マルチ: p1,p2選択時、それぞれのパドルをlookAt、観戦者はそのまま
 *  ゲーム詳細選択完了
 *    シングル: 前回シングルまたはマルチで使っていた、カメラの位置まで移動後ゲームスタート
 *    デュオ: ゲームスタート
 *    マルチ: プレイヤーの場合シングル同様、観戦者は今のところコントロールだけ
 *  ゲーム終了後
 *    リトライ: そのまま
 *    メニューに戻る: セレクトのカメラに移動
 * 
 * motion移動中のリサイズ
 *  リサイズ中は、移動中断
 *  リサイズ完了後、リサイズされたカメラの位置へ移動
 */


// fitObjectやるためにモーションカメラは指定のところに置いといて、
// 切り替わった時とかは切り替わる前のポジションとかコピーして指定の場所までモーション移動
// nextのステータスでもストアに保持しとこうかな

type CameraProps = {
  stageGroup: RefObject<THREE.Group<THREE.Object3DEventMap>>;
}

function mod(n: number, m: number): number { return ((n % m) + m) % m; };

export function Camera({ stageGroup }: CameraProps) {
  const { set } = useThree();
  const [role, gameMode] = useGameStore(useShallow(s => [s.role, s.gameMode]));
  const beforeRoleRef = useRef<RoleStatus>(role);
  const isObjectFitRef = useRef<boolean>(false);
  const [ camNo, setCamNo ] = useState<number>(0);
  const motionRef = useRef<THREE.PerspectiveCamera>(null!);
  const camsRef = useRef<THREE.PerspectiveCamera[]>([]);

  const [ isResizing, setIsResizing ] = useState<boolean>(false);

  const timeoutIdRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (!stageGroup.current) return;
    if (!motionRef.current || camsRef.current.length === 0) return;

    set({camera: motionRef.current});

    fitObject(motionRef.current, stageGroup.current, 1.1);
    camsRef.current.forEach(cam => {
      trackingLookAt(cam);
      fitObject(cam, stageGroup.current, 1.1);
    });

    isObjectFitRef.current = true;

    function handleResize() {
      setIsResizing(true);
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = setTimeout(() => {
        setIsResizing(false);
      }, 1000 / 24);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!stageGroup.current) return;
    if (isResizing) {
      isObjectFitRef.current = false;
      return;
    }
    [ camsRef.current[camNo], ...camsRef.current.filter((_, i) => i !== camNo)].forEach(cam => fitObject(cam, stageGroup.current, 1.1));
    isObjectFitRef.current = true;
  }, [isResizing]);

  const [subscribe] = useKeyboardControls();

  useEffect(() => {

    function handleChangeCam(num: -1 | 1) {
      setCamNo(prev => mod(prev + num, camsRef.current.length));
    }

    const unsubPrev = subscribe(
      state => state.prevCam,
      value => {
        if (!value) handleChangeCam(-1);
      }
    );

    const unsubNext = subscribe(
      state => state.nextCam,
      value => {
        if (!value) handleChangeCam(1);
      }
    );

    return () => {
      unsubPrev()
      unsubNext()
    }
  }, [subscribe]);



  useEffect(() => {
    if (!isObjectFitRef.current && camsRef.current.length !== 3 && !motionRef.current) return;

    if (role === RoleStatus.P1) {
      camsRef.current[0].position.z = Math.abs(camsRef.current[0].position.z);
      camsRef.current[1].up.z = 1;
    } else if (role === RoleStatus.P2) {
      camsRef.current[0].position.z = -Math.abs(camsRef.current[0].position.z);
      camsRef.current[1].up.z = -1;
    }

    beforeRoleRef.current = role;
  }, [role]);

  useEffect(() => {
    if (!isObjectFitRef.current && camsRef.current.length !== 3 && !motionRef.current) return;

    if (role === RoleStatus.Spectator) {
      set({camera: motionRef.current});

    } else {
      if (beforeRoleRef.current !== RoleStatus.Spectator) {
        const camera = camsRef.current[camNo];
        set({camera});

      } else {
        // 今の位置から使用するカメラに移動する
      }
    }

    // if (role === RoleStatus.Spectator) {
    //   const cam = camsRef.current[camNo];
    //   motionRef.current.position.copy(cam.position);
    //   motionRef.current.rotation.copy(cam.rotation);
    //   motionRef.current.fov = cam.fov;
    //   return;
    // }

  }, [role, camNo]);


  return (
    <>
      <PerspectiveCamera visible={role === RoleStatus.Spectator} ref={motionRef} position={[STAGE_WIDTH / 2, 17, 0]} fov={75} up={[0, -1, 0]} />
      <PerspectiveCamera visible={role !== RoleStatus.Spectator} ref={e => { if (e) camsRef.current[0] = e;}} position={[0, 17, 10]} fov={75} lookAt={[0, 0, 3.5]} />
      <PerspectiveCamera visible={role !== RoleStatus.Spectator} ref={e => { if (e) camsRef.current[1] = e;}} position={[0, 1, 0]} fov={45} />
      <PerspectiveCamera visible={role !== RoleStatus.Spectator} ref={e => { if (e) camsRef.current[2] = e;}} position={[0, 1, 0]} fov={45} up={[0, -1, 0]} />
    </>
  );
}