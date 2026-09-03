import { findGland } from '../domain/glandRegistry'
import type { GlandId } from '../types/gland'

interface KnowledgeCardProps {
  selectedId: GlandId | null
  onClose: () => void
}

/** Design.md §17。所有文案来自 domain/glandRegistry，此处不硬编码任何内容。 */
export function KnowledgeCard({ selectedId, onClose }: KnowledgeCardProps) {
  const gland = findGland(selectedId)
  if (!gland) {
    return null
  }

  return (
    <aside className="knowledge-card" aria-label="腺体知识卡">
      <div className="knowledge-card__title" style={{ borderColor: gland.color }}>
        <h2>{gland.chineseName}</h2>
        <p className="knowledge-card__en">{gland.name}</p>
      </div>

      <section className="knowledge-card__section">
        <h3>📍 在哪里？</h3>
        <p>{gland.location}</p>
      </section>

      <section className="knowledge-card__section">
        <h3>💡 有什么功能？</h3>
        <ul>
          {gland.functions.map((fn) => (
            <li key={fn}>{fn}</li>
          ))}
        </ul>
      </section>

      <button type="button" className="knowledge-card__close" onClick={onClose}>
        关闭
      </button>
    </aside>
  )
}
