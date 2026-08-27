import { GlandSoloScene } from '../scene/GlandSoloScene'
import type { Gland } from '../types/gland'

interface DetailViewProps {
  gland: Gland
  onExit: () => void
}

/**
 * 单个腺体的独立详情视图，占满整个 3D 区。
 *
 * 用于展示不在人体上的腺体（睾丸）。可旋转、可缩放，左上角有返回按钮
 * 退回人体 —— 全程留在同一个页面内，不做路由跳转（Design.md §9）。
 */
export function DetailView({ gland, onExit }: DetailViewProps) {
  return (
    <section className="detail-view" aria-label={`${gland.chineseName}单独视图`}>
      <div className="detail-view__scene">
        <GlandSoloScene gland={gland} isHighlighted interactive />
      </div>

      <button type="button" className="detail-view__back" onClick={onExit}>
        ← 返回人体
      </button>

      <p className="detail-view__caption">
        <span className="detail-view__cn">{gland.chineseName}</span>
        <span className="detail-view__en">{gland.name}</span>
      </p>
    </section>
  )
}
