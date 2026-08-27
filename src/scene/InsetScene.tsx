import { Canvas } from '@react-three/fiber'
import { computeTargetPose } from '../domain/cameraFocus'
import type { Gland } from '../types/gland'
import { GlandMarker } from './GlandMarker'

interface InsetSceneProps {
  gland: Gland
  isSelected: boolean
}

/**
 * 独立小窗里的迷你 3D 场景：只有这一个腺体，没有人体、没有 OrbitControls。
 *
 * 机位直接复用 domain 的 computeTargetPose —— 它算出的就是"看清这个腺体
 * 且保留少量周边空间"的距离，正是小窗需要的取景。
 */
export function InsetScene({ gland, isSelected }: InsetSceneProps) {
  const pose = computeTargetPose(gland, 0)

  return (
    <Canvas
      camera={{ position: [pose.position[0], pose.position[1], pose.position[2]], fov: 40 }}
      dpr={[1, 2]}
      onCreated={({ camera }) => {
        camera.lookAt(pose.target[0], pose.target[1], pose.target[2])
      }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[1, 2, 3]} intensity={1.2} />
      <directionalLight position={[-1, 0.5, -2]} intensity={0.4} />

      <group name={`inset-${gland.id}`}>
        {gland.positions.map((position, index) => (
          <GlandMarker
            key={`${gland.id}-${index}`}
            gland={gland}
            position={position}
            isSelected={isSelected}
            // 小窗里只有这一个腺体，因此"是否有选中项"等同于"它是否被选中"：
            // 未选中 → 概览态不透明度；选中 → 满不透明 + 高亮。
            hasSelection={isSelected}
            // 点击由外层 GlandInset 的 <button> 承担（DOM 事件会冒泡上去），
            // 命中区域更大，也让这一层在 jsdom 中可测。
            onSelect={() => {}}
          />
        ))}
      </group>
    </Canvas>
  )
}
