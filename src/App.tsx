import { useState } from 'react'
import { AnatomyScene } from './scene/AnatomyScene'
import type { GlandId } from './types/gland'

export function App() {
  const [selectedId, setSelectedId] = useState<GlandId | null>(null)

  return (
    <div className="app">
      <header className="app__header">
        <h1>ENDOCRINE ATLAS</h1>
        <span className="app__subtitle">内分泌系统</span>
      </header>
      <main className="app__body">
        <AnatomyScene selectedId={selectedId} onSelect={setSelectedId} />
      </main>
    </div>
  )
}
