import { DoubleSide } from 'three'

const BODY_COLOR = '#9FD4E8'
const BODY_OPACITY = 0.15

/**
 * 半透明人体 mannequin 占位（Design.md §4、§20）。
 * 用基础几何体拼接，不依赖任何外部 3D 资产。
 * depthWrite={false} 让体内的腺体 marker 能透出来。
 *
 * 坐标系与 data/glands.ts 完全一致：原点在双脚间地面，总高 1.75。
 */
export function BodyModel() {
  return (
    <group name="body-model">
      {/* 头 */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.105, 24, 24]} />
        <BodyMaterial />
      </mesh>

      {/* 颈 */}
      <mesh position={[0, 1.475, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.13, 20]} />
        <BodyMaterial />
      </mesh>

      {/* 躯干 */}
      <mesh position={[0, 1.18, 0]}>
        <capsuleGeometry args={[0.155, 0.34, 6, 20]} />
        <BodyMaterial />
      </mesh>

      {/* 骨盆 */}
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.14, 0.1, 6, 20]} />
        <BodyMaterial />
      </mesh>

      {/* 手臂 */}
      <mesh position={[-0.225, 1.13, 0]}>
        <capsuleGeometry args={[0.042, 0.5, 6, 16]} />
        <BodyMaterial />
      </mesh>
      <mesh position={[0.225, 1.13, 0]}>
        <capsuleGeometry args={[0.042, 0.5, 6, 16]} />
        <BodyMaterial />
      </mesh>

      {/* 腿 */}
      <mesh position={[-0.075, 0.42, 0]}>
        <capsuleGeometry args={[0.065, 0.7, 6, 16]} />
        <BodyMaterial />
      </mesh>
      <mesh position={[0.075, 0.42, 0]}>
        <capsuleGeometry args={[0.065, 0.7, 6, 16]} />
        <BodyMaterial />
      </mesh>
    </group>
  )
}

function BodyMaterial() {
  return (
    <meshStandardMaterial
      color={BODY_COLOR}
      transparent
      opacity={BODY_OPACITY}
      depthWrite={false}
      roughness={0.6}
      side={DoubleSide}
    />
  )
}
