/** Design.md §23。文案固定为 "重新查看全部"，app.smoke 测试按此名称定位。 */
export function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button type="button" className="reset-button" onClick={onReset}>
      重新查看全部
    </button>
  )
}
