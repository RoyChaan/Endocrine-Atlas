import { bodyGlands } from '../domain/glandRegistry'
import type { GlandId } from '../types/gland'
import { OrganModel } from './OrganModel'

interface GlandLayerProps {
  selectedId: GlandId | null
  onSelect: (id: GlandId) => void
}

/**
 * 人体内的全部腺体模型。
 *
 * 一条数据 → 一个模型。成对器官（肾上腺、卵巢）不需要在这里展开成两份：
 * 生成器给的模型本身就含左右两侧（以及肾、子宫这些解剖背景），
 * 一份模型就是一条知识条目，点哪一侧都落到同一个 id 上。
 *
 * 只渲染 display === 'body' 的腺体。睾丸不在其中 —— 人体上放的是卵巢，
 * 两者解剖学上互斥，睾丸由 ui/DetailView 的独立视图承载。
 */
export function GlandLayer({ selectedId, onSelect }: GlandLayerProps) {
  const hasSelection = selectedId !== null

  return (
    <group name="gland-layer">
      {bodyGlands().map((gland) => (
        <OrganModel
          key={gland.id}
          gland={gland}
          isSelected={selectedId === gland.id}
          hasSelection={hasSelection}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}
