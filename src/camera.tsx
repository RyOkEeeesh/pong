import { PerspectiveCamera, KeyboardControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import Stage from './stage';
import { useCameraStore, useGameStore, useUserSetting } from './store';
import { trackingLookAt } from './CameraControl';
import { FramePriority, RoleStatus, STAGE_WIDTH } from './constants';
import { useShallow } from 'zustand/shallow';

declare const __APP_VERSION__: string;

function CameraSetup() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

  useEffect(() => {
    if (cameraRef.current) {
      trackingLookAt(cameraRef.current);
      cameraRef.current.lookAt(0, 0, 3.5);
    }
  }, []);

  return <PerspectiveCamera makeDefault ref={cameraRef} position={[0, 17, 10]} fov={75} />;
}

function ComposerSetup() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.8}
        radius={0.5}
        luminanceThreshold={0.65}
        luminanceSmoothing={0.0}
        height={window.innerHeight}
      />
    </EffectComposer>
  )
}

type CameraProps = {
  stageGroup: RefObject<THREE.Group<THREE.Object3DEventMap>>;
}

function Camera({ stageGroup }: CameraProps) {
  const { set } = useThree();
  const role = useGameStore(s => s.role);
  const beforeRoleRef = useRef<RoleStatus>(role);
  const [ cameras, camNo, motionCamera, isObjectFit ] = useCameraStore(useShallow(s => [s.cameras, s.camNo, s.motionCamera, s.isObjectFit]));
  const { pushCamera, setMotionCamera } = useCameraStore.getState();

  const motionRef = useRef<THREE.PerspectiveCamera>(null!);
  const camsRef = useRef<THREE.PerspectiveCamera[]>([]);

  const [isResizing, setIsResizing] = useState<boolean>(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    function handleResize() {
      setIsResizing(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
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
    if (isResizing) return setIsObjectFit(false);
    fitObject(camera as THREE.PerspectiveCamera, stageGroup.current, 1.1);
    setIsObjectFit(true);
  }, [isResizing, camera]);


  // カメラ初期設定
  useEffect(() => {
    if (motionRef.current && camsRef.current.length !== 3) return;
    setMotionCamera(motionRef.current);
    pushCamera(...camsRef.current);
  }, [])

  useEffect(() => {
    if (!isObjectFit && cameras.length !== 3 && !motionCamera) return;

    // fitObjectやるためにモーションカメラは指定のところに置いといて、切り替わった時とかは切り替わる前のポジションとかコピーして指定の場所までモーション移動
    // nextのステータスでもストアに保持しとこうかな
    if (role === RoleStatus.Spectator) {
      set({camera: motionCamera});

    } else {
      if (beforeRoleRef.current !== RoleStatus.Spectator) {
        const camera = cameras[camNo];
        set({camera});

        if (role === RoleStatus.P1) {
          cameras[0].position.z = Math.abs(camsRef.current[0].position.z);
          cameras[1].up.z = 1;
        } else {
          cameras[0].position.z = -Math.abs(camsRef.current[0].position.z);
          cameras[1].up.z = -1;
        }
      } else {
        // 今の位置から使用するカメラに移動する
      }
    }

    // if (role === RoleStatus.Spectator) {
    //   const cam = cameras[camNo];
    //   motionRef.current.position.copy(cam.position);
    //   motionRef.current.rotation.copy(cam.rotation);
    //   motionRef.current.fov = cam.fov;
    //   return;
    // }

  }, [role, cameras, motionCamera, camNo, isObjectFit]);


  return (
    <>
      <PerspectiveCamera visible={role === RoleStatus.Spectator} ref={motionRef} position={[STAGE_WIDTH / 2, 17, 0]} fov={75} up={[0, -1, 0]} />
      <PerspectiveCamera visible={role !== RoleStatus.Spectator} ref={e => { if (e) camsRef.current[0] = e;}} position={[0, 17, 10]} fov={75} />
      <PerspectiveCamera visible={role !== RoleStatus.Spectator} ref={e => { if (e) camsRef.current[1] = e;}} position={[0, 1, 0]} fov={45} />
      <PerspectiveCamera visible={role !== RoleStatus.Spectator} ref={e => { if (e) camsRef.current[2] = e;}} position={[0, 1, 0]} fov={45} up={[0, -1, 0]} />
    </>
  );
}