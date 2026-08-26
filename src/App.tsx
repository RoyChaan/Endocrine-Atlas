import { useState } from 'react'
import { AnatomyScene } from './scene/AnatomyScene'
import { ControlsHint } from './ui/ControlsHint'
import { Header } from './ui/Header'
import { KnowledgeCard } from './ui/KnowledgeCard'
import { ResetButton } from './ui/ResetButton'
import type { GlandId } from './types/gland'

export function App() {
  const [selectedId, setSelectedId] = useState<GlandId | null>(null)

  return (
    <div className="app">
      <Header actions={<ResetButton onReset={() => setSelectedId(null)} />} />

      <main className="app__body">
        <div className="app__viewer">
          <AnatomyScene selectedId={selectedId} onSelect={setSelectedId} />
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
