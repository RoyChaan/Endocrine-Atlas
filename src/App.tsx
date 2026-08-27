import { useState } from 'react'
import { detailGlands, findGland } from './domain/glandRegistry'
import {
  INITIAL_VIEW,
  bodySelectedId,
  cardGlandId,
  closeCard,
  exitDetail,
  openDetail,
  selectGland,
} from './domain/viewState'
import type { ViewState } from './domain/viewState'
import { AnatomyScene } from './scene/AnatomyScene'
import { ControlsHint } from './ui/ControlsHint'
import { DetailEntry } from './ui/DetailEntry'
import { DetailView } from './ui/DetailView'
import { Header } from './ui/Header'
import { KnowledgeCard } from './ui/KnowledgeCard'
import { ResetButton } from './ui/ResetButton'
import type { GlandId } from './types/gland'

export function App() {
  const [view, setView] = useState<ViewState>(INITIAL_VIEW)
  /**
   * 复位计数器。相机复位不能只靠选中项变化来驱动 —— 用户在概览态下
   * 转动/缩放后选中项仍是 null，点重置就不会有任何反应。递增这个值
   * 给了 CameraRig 一个与选中状态无关的触发信号。
   */
  const [resetToken, setResetToken] = useState(0)

  const detailGland = view.mode === 'detail' ? findGland(view.glandId) : null

  function handleReset() {
    setView(INITIAL_VIEW)
    setResetToken((n) => n + 1)
  }

  function handleSelect(id: GlandId | null) {
    setView((current) => selectGland(current, id))
  }

  return (
    <div className="app">
      <Header actions={<ResetButton onReset={handleReset} />} />

      <main className="app__body">
        <div className="app__viewer">
          {detailGland ? (
            <DetailView gland={detailGland} onExit={() => setView(exitDetail())} />
          ) : (
            <>
              <AnatomyScene
                selectedId={bodySelectedId(view)}
                onSelect={handleSelect}
                resetToken={resetToken}
              />
              {detailGlands().map((gland) => (
                <DetailEntry
                  key={gland.id}
                  gland={gland}
                  onOpen={(id) => setView(openDetail(id))}
                />
              ))}
            </>
          )}
        </div>
        <div className="app__panel">
          <KnowledgeCard
            selectedId={cardGlandId(view)}
            onClose={() => setView((current) => closeCard(current))}
          />
        </div>
      </main>

      <footer className="app__footer">
        <ControlsHint />
      </footer>
    </div>
  )
}
