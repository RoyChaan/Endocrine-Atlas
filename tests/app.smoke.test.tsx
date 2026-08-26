import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { allGlands } from '../src/domain/glandRegistry'
import type { GlandId } from '../src/types/gland'

vi.mock('../src/scene/AnatomyScene', () => ({
  AnatomyScene: ({ onSelect }: { onSelect: (id: GlandId | null) => void }) => (
    <div data-testid="scene-stub">
      {allGlands().map((gland) => (
        <button key={gland.id} type="button" onClick={() => onSelect(gland.id)}>
          {`select-${gland.id}`}
        </button>
      ))}
      <button type="button" onClick={() => onSelect(null)}>
        select-none
      </button>
    </div>
  ),
}))

// App 必须在 vi.mock 之后 import，才能拿到被替换的 AnatomyScene。
const { App } = await import('../src/App')

describe('App 端到端冒烟', () => {
  it('初始态：有标题与操作提示，无知识卡', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ENDOCRINE ATLAS')
    expect(screen.getByText(/点击腺体查看信息/)).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it.each(allGlands().map((g) => [g.id, g] as const))(
    '选中 %s 后，卡片内容逐条与 data/glands.ts 一致',
    async (id, gland) => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: `select-${id}` }))

      const card = screen.getByRole('complementary')
      expect(card).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(gland.chineseName)
      expect(card).toHaveTextContent(gland.name)
      expect(card).toHaveTextContent(gland.location)
      for (const hormone of gland.hormones) {
        expect(card).toHaveTextContent(hormone)
      }
      for (const fn of gland.functions) {
        expect(card).toHaveTextContent(fn)
      }
    },
  )

  it('切换选中时卡片内容随之更换', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-thyroid' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('甲状腺')

    await user.click(screen.getByRole('button', { name: 'select-ovary' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('卵巢')
    expect(screen.queryByText('甲状腺')).not.toBeInTheDocument()
  })

  it('点击重置按钮后卡片消失，回到初始态', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-pancreas' }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新查看全部' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByText(/点击腺体查看信息/)).toBeInTheDocument()
  })

  it('卡片上的关闭按钮也能取消选中', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-adrenal' }))
    await user.click(screen.getByRole('button', { name: '关闭' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('场景传回 null 时取消选中', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-testis' }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'select-none' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
