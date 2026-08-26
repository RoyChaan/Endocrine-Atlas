import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { OVERVIEW_POSE } from '../domain/cameraFocus'
import type { GlandId } from '../types/gland'
import { BodyModel } from './BodyModel'
import { CameraRig } from './CameraRig'
import { GlandLayer } from './GlandLayer'

interface AnatomySceneProps {
  selectedId: GlandId | null
  /** 传 null 表示取消选中（点击空白处）。 */
  onSelect: (id: GlandId | null) => void
}

export function AnatomyScene({ selectedId, onSelect }: AnatomySceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  return (
    <Canvas
      camera={{
        position: [
          OVERVIEW_POSE.position[0],
          OVERVIEW_POSE.position[1],
          OVERVIEW_POSE.position[2],
        ],
        fov: 40,
      }}
      // Design.md §25：pixelRatio = min(devicePixelRatio, 2)
      dpr={[1, 2]}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <directionalLight position={[-2, 1, -3]} intensity={0.4} />

      <BodyModel />
      <GlandLayer selectedId={selectedId} onSelect={onSelect} />

      <OrbitControls
        ref={controlsRef}
        target={[OVERVIEW_POSE.target[0], OVERVIEW_POSE.target[1], OVERVIEW_POSE.target[2]]}
        // Design.md §11
        enablePan={false}
        enableZoom
        minPolarAngle={1.0}
        maxPolarAngle={2.1}
        minDistance={0.3}
        maxDistance={4}
        enableDamping
        dampingFactor={0.08}
      />

      <CameraRig selectedId={selectedId} controlsRef={controlsRef} />
    </Canvas>
  )
}
