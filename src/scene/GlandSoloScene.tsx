import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { computeTargetPose } from '../domain/cameraFocus'
import type { Gland } from '../types/gland'
import { OrganModel } from './OrganModel'
import { SceneLights } from './SceneLights'

interface GlandSoloSceneProps {
  gland: Gland
  /** 是否高亮（满不透明 + 主题色自发光）。 */
  isHighlighted: boolean
  /**
   * 是否允许旋转/缩放。
   * 详情视图开启；右下角的入口缩略图关闭 —— 那里点击要落到外层按钮上。
   */
  interactive: boolean
}

/**
 * 只装一个腺体的场景：没有人体、没有其他腺体。
 *
 * 两处复用：右下角的详情入口缩略图（interactive=false），
 * 以及进入后的全尺寸详情视图（interactive=true）。
 *
 * 机位直接用 domain 的 computeTargetPose —— 它算出的就是"看清这个腺体
 * 且保留少量周边空间"的距离，正是单腺体取景需要的。
 */
export function GlandSoloScene({ gland, isHighlighted, interactive }: GlandSoloSceneProps) {
  const pose = computeTargetPose(gland, 0)
  const target: [number, number, number] = [pose.target[0], pose.target[1], pose.target[2]]

  return (
    <Canvas
      camera={{ position: [pose.position[0], pose.position[1], pose.position[2]], fov: 40 }}
      dpr={[1, 2]}
      onCreated={({ camera }) => {
        camera.lookAt(...target)
      }}
    >
      <SceneLights />

      <Suspense fallback={null}>
        <OrganModel
          gland={gland}
          isSelected={isHighlighted}
          // 场景里只有这一个腺体，"是否有选中项"等同于"它是否被高亮"。
          hasSelection={isHighlighted}
          // 点击由外层 DOM 承担：缩略图是 <button>，详情视图有自己的返回按钮。
        />
      </Suspense>

      {interactive && (
        <OrbitControls
          target={target}
          // 与人体场景同一套约束（Design.md §11）
          enablePan={false}
          enableZoom
          minPolarAngle={1.0}
          maxPolarAngle={2.1}
          minDistance={0.1}
          maxDistance={1.0}
          enableDamping
          dampingFactor={0.08}
        />
      )}
    </Canvas>
  )
}
