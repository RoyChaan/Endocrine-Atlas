import { allGlands } from '../domain/glandRegistry'
import type { GlandId } from '../types/gland'
import { GlandMarker } from './GlandMarker'

interface GlandLayerProps {
  selectedId: GlandId | null
  onSelect: (id: GlandId) => void
}

/**
 * 把数据展开成 marker。成对器官的 positions.length === 2，因此渲染出
 * 两个 marker，但它们共享同一个 gland.id —— 一条知识条目对应多个
 * marker，无需重复条目（Design.md §19）。
 */
export function GlandLayer({ selectedId, onSelect }: GlandLayerProps) {
  const hasSelection = selectedId !== null

  return (
    <group name="gland-layer">
      {allGlands().flatMap((gland) =>
        gland.positions.map((position, index) => (
          <GlandMarker
            key={`${gland.id}-${index}`}
            gland={gland}
            position={position}
            isSelected={selectedId === gland.id}
            hasSelection={hasSelection}
            onSelect={onSelect}
          />
        )),
      )}
    </group>
  )
}
