import { GlandSoloScene } from '../scene/GlandSoloScene'
import type { Gland, GlandId } from '../types/gland'

interface DetailEntryProps {
  gland: Gland
  onOpen: (id: GlandId) => void
}

/**
 * 3D 区右下角的详情入口卡片。
 *
 * 睾丸不在人体上（人体上是卵巢，两者解剖学上互斥），所以需要一个显式的
 * 入口。卡片里放一个不可交互的迷你 3D 缩略图，让学生一眼看出这是另一套
 * 器官，而不只是一个文字按钮。
 *
 * 外壳是真正的 <button>：命中区覆盖整张卡片，键盘可达，且这一层在 jsdom
 * 中可测 —— 只有内部的 <Canvas> 需要桩掉。
 */
export function DetailEntry({ gland, onOpen }: DetailEntryProps) {
  return (
    <button
      type="button"
      className="detail-entry"
      onClick={() => onOpen(gland.id)}
      aria-label={`单独查看${gland.chineseName}`}
    >
      <span className="detail-entry__scene">
        <GlandSoloScene gland={gland} isHighlighted={false} interactive={false} />
      </span>
      <span className="detail-entry__label">
        <span className="detail-entry__names">
          <span className="detail-entry__cn">{gland.chineseName}</span>
          <span className="detail-entry__en">{gland.name}</span>
        </span>
        <span className="detail-entry__cue" aria-hidden="true">
          单独查看 →
        </span>
      </span>
    </button>
  )
}
