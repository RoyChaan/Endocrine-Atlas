import { InsetScene } from '../scene/InsetScene'
import type { Gland, GlandId } from '../types/gland'

interface GlandInsetProps {
  gland: Gland
  isSelected: boolean
  onSelect: (id: GlandId) => void
}

/**
 * 3D 区右下角的独立小窗（参考图中睾丸就是画在独立小框里的）。
 *
 * 外壳是一个真正的 <button>：命中区域覆盖整个小窗而非那两个小球，
 * 键盘可达，`aria-pressed` 表达选中态，且整层在 jsdom 中可测 ——
 * 只有内部的 <Canvas> 需要 WebGL。
 */
export function GlandInset({ gland, isSelected, onSelect }: GlandInsetProps) {
  return (
    <button
      type="button"
      className={`gland-inset${isSelected ? ' gland-inset--selected' : ''}`}
      style={isSelected ? { borderColor: gland.color } : undefined}
      aria-pressed={isSelected}
      onClick={() => onSelect(gland.id)}
    >
      <span className="gland-inset__scene">
        <InsetScene gland={gland} isSelected={isSelected} />
      </span>
      <span className="gland-inset__label">
        <span className="gland-inset__cn">{gland.chineseName}</span>
        <span className="gland-inset__en">{gland.name}</span>
      </span>
    </button>
  )
}
