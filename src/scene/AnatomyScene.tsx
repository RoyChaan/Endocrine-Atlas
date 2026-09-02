import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { OVERVIEW_POSE } from '../domain/cameraFocus'
import type { GlandId } from '../types/gland'
import { BodyModel } from './BodyModel'
import { CameraRig } from './CameraRig'
import { GlandLayer } from './GlandLayer'
import { SceneLights } from './SceneLights'

interface AnatomySceneProps {
  selectedId: GlandId | null
  /** 传 null 表示取消选中（点击空白处）。 */
  onSelect: (id: GlandId | null) => void
  /** 每次递增都无条件把相机复位到概览，与 selectedId 是否变化无关。 */
  resetToken: number
}

export function AnatomyScene({ selectedId, onSelect, resetToken }: AnatomySceneProps) {
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
      <SceneLights />

      {/* 人体与腺体现在都是外部 GLB，一起等。Suspense 兜在 Canvas 里面
          而不是外面 —— 相机、灯光、OrbitControls 不该跟着一起挂起重建。 */}
      <Suspense fallback={null}>
        <BodyModel />
        <GlandLayer selectedId={selectedId} onSelect={onSelect} />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        target={[OVERVIEW_POSE.target[0], OVERVIEW_POSE.target[1], OVERVIEW_POSE.target[2]]}
        // Design.md §11
        enablePan={false}
        enableZoom
        minPolarAngle={1.0}
        maxPolarAngle={2.1}
        minDistance={0.2}
        maxDistance={4}
        enableDamping
        dampingFactor={0.08}
      />

      <CameraRig selectedId={selectedId} controlsRef={controlsRef} resetToken={resetToken} />
    </Canvas>
  )
}
