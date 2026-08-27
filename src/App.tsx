import { useState } from 'react'
import { insetGlands } from './domain/glandRegistry'
import { AnatomyScene } from './scene/AnatomyScene'
import { ControlsHint } from './ui/ControlsHint'
import { GlandInset } from './ui/GlandInset'
import { Header } from './ui/Header'
import { KnowledgeCard } from './ui/KnowledgeCard'
import { ResetButton } from './ui/ResetButton'
import type { GlandId } from './types/gland'

export function App() {
  const [selectedId, setSelectedId] = useState<GlandId | null>(null)
  /**
   * 复位计数器。相机复位不能只靠 selectedId 变化来驱动 —— 用户在概览态下
   * 转动/缩放后 selectedId 仍是 null，点重置就不会有任何反应。递增这个值
   * 给了 CameraRig 一个与选中状态无关的触发信号。
   */
  const [resetToken, setResetToken] = useState(0)

  function handleReset() {
    setSelectedId(null)
    setResetToken((n) => n + 1)
  }

  return (
    <div className="app">
      <Header actions={<ResetButton onReset={handleReset} />} />

      <main className="app__body">
        <div className="app__viewer">
          <AnatomyScene
            selectedId={selectedId}
            onSelect={setSelectedId}
            resetToken={resetToken}
          />
          {insetGlands().map((gland) => (
            <GlandInset
              key={gland.id}
              gland={gland}
              isSelected={selectedId === gland.id}
              onSelect={setSelectedId}
            />
          ))}
        </div>
        <div className="app__panel">
          <KnowledgeCard selectedId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      </main>

      <footer className="app__footer">
        <ControlsHint />
      </footer>
    </div>
  )
}
