import type { ThreeEvent } from '@react-three/fiber'
import type { Gland, GlandId, Vec3 } from '../types/gland'

/** marker 半径。仅在本文件内使用，导出是为了将来替换造型时保持尺度一致。 */
export const MARKER_RADIUS = 0.028

const OPACITY_OVERVIEW = 0.75
const OPACITY_SELECTED = 1
const OPACITY_DIMMED = 0.55

interface GlandMarkerProps {
  gland: Gland
  position: Vec3
  isSelected: boolean
  /** 当前是否已有任何腺体被选中。决定用概览态还是强弱对比态。 */
  hasSelection: boolean
  onSelect: (id: GlandId) => void
}

/**
 * 统一的发光小球占位。
 *
 * ★ 未来唯一的替换点：下一轮把这里的 <sphereGeometry> 换成按 gland.id
 *   分派的真实造型（<ThyroidMesh/> 等），其余代码一行不改。
 */
export function GlandMarker({
  gland,
  position,
  isSelected,
  hasSelection,
  onSelect,
}: GlandMarkerProps) {
  const opacity = !hasSelection
    ? OPACITY_OVERVIEW
    : isSelected
      ? OPACITY_SELECTED
      : OPACITY_DIMMED

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onSelect(gland.id)
  }

  return (
    <mesh
      name={`gland-marker-${gland.id}`}
      position={[position[0], position[1], position[2]]}
      scale={isSelected ? 1.35 : 1}
      onClick={handleClick}
    >
      <sphereGeometry args={[MARKER_RADIUS, 24, 24]} />
      <meshStandardMaterial
        color={gland.color}
        emissive={gland.color}
        emissiveIntensity={isSelected ? 1.1 : 0.35}
        roughness={0.4}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}
