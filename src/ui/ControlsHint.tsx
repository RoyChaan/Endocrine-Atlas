/** Design.md §8：初始就让用户知道怎么操作。 */
export function ControlsHint() {
  return (
    <p className="controls-hint">
      <span>点击腺体查看信息</span>
      <span className="controls-hint__sep">·</span>
      <span>拖动模型可以旋转</span>
      <span className="controls-hint__sep">·</span>
      <span>滚轮缩放</span>
    </p>
  )
}
