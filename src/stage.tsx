import { useRef } from "react"
import { MeshStandardMaterial } from "three"

const STAGE_HEIGHT = 28;
const STAGE_WIDTH = 22.4;

const WALL_HEIGHT = 1;
const WALL_DEPTH = 0.1;

type WallProps = {
  position: [number, number, number],
  material: MeshStandardMaterial
}

function SideWall(props: WallProps) {
  return (
    <mesh {...props} rotation={[0, Math.PI / 2, 0]}>
      <boxGeometry args={[STAGE_HEIGHT + WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH]} />
    </mesh>
  )
}

function GoalWall(props: WallProps) {
  return (
    <mesh {...props}>
      <boxGeometry args={[STAGE_WIDTH + WALL_DEPTH, WALL_HEIGHT, WALL_DEPTH]} />
    </mesh>
  )
}

function Paddle(props: WallProps) {
  return (
    <mesh {...props}>
      <boxGeometry args={[STAGE_WIDTH / 6 , WALL_HEIGHT, WALL_HEIGHT]} />
    </mesh>
  )
}


export default function Stage() {
  const wallMat = useRef<MeshStandardMaterial>(new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.25,
    metalness: 0,
    roughness: 0
  })).current;

  return (
    <>
      <SideWall position={[-STAGE_WIDTH / 2, 0 , 0]} material={wallMat} />
      <SideWall position={[STAGE_WIDTH / 2, 0 , 0]} material={wallMat} />
      <GoalWall position={[0, 0, STAGE_HEIGHT / 2]} material={wallMat} />
      <GoalWall position={[0, 0, -STAGE_HEIGHT / 2]} material={wallMat} />

    </>
  )
}