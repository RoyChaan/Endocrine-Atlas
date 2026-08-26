import type { ReactNode } from 'react'

export function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header className="app__header">
      <h1>ENDOCRINE ATLAS</h1>
      <span className="app__subtitle">内分泌系统</span>
      <div className="app__header-actions">{actions}</div>
    </header>
  )
}
