import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { allGlands, insetGlands } from '../src/domain/glandRegistry'
import type { GlandId } from '../src/types/gland'

// InsetScene 内含 <Canvas>，jsdom 无 WebGL。桩掉它，保留 GlandInset 的
// DOM 外壳（按钮、标签、aria-pressed）作为真实被测对象。
vi.mock('../src/scene/InsetScene', () => ({
  InsetScene: () => <div data-testid="inset-scene-stub" />,
}))

vi.mock('../src/scene/AnatomyScene', () => ({
  AnatomyScene: ({
    onSelect,
    resetToken,
  }: {
    onSelect: (id: GlandId | null) => void
    resetToken: number
  }) => (
    <div data-testid="scene-stub">
      {/* 把 resetToken 暴露到 DOM，这样"复位是否被触发"在 jsdom 里可断言 */}
      <span data-testid="reset-token">{resetToken}</span>
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

  it('睾丸的独立小窗渲染出来，标注中英文名', () => {
    render(<App />)
    const [testis] = insetGlands()
    const inset = screen.getByRole('button', { name: new RegExp(testis.chineseName) })
    expect(inset).toHaveTextContent(testis.chineseName)
    expect(inset).toHaveTextContent(testis.name)
    expect(inset).toHaveAttribute('aria-pressed', 'false')
  })

  it('点击独立小窗选中睾丸并弹出知识卡', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = insetGlands()

    await user.click(screen.getByRole('button', { name: new RegExp(testis.chineseName) }))

    const card = screen.getByRole('complementary')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(testis.chineseName)
    expect(card).toHaveTextContent(testis.location)
    for (const fn of testis.functions) {
      expect(card).toHaveTextContent(fn)
    }
  })

  it('选中后小窗进入按下态，重置后恢复', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = insetGlands()
    const nameMatcher = new RegExp(testis.chineseName)

    await user.click(screen.getByRole('button', { name: nameMatcher }))
    expect(screen.getByRole('button', { name: nameMatcher })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: '重新查看全部' }))
    expect(screen.getByRole('button', { name: nameMatcher })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('选中人体内的腺体时，小窗不进入按下态', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = insetGlands()

    await user.click(screen.getByRole('button', { name: 'select-thyroid' }))

    expect(
      screen.getByRole('button', { name: new RegExp(testis.chineseName) }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('概览态下点重置仍会触发复位（相机被转动过但没选中任何腺体的情形）', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 从未选中任何腺体 —— 旧实现在这里什么都不会发生，因为它依赖
    // selectedId 的变化来驱动相机，而 selectedId 一直是 null。
    expect(screen.getByTestId('reset-token')).toHaveTextContent('0')

    await user.click(screen.getByRole('button', { name: '重新查看全部' }))
    expect(screen.getByTestId('reset-token')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: '重新查看全部' }))
    expect(screen.getByTestId('reset-token')).toHaveTextContent('2')
  })

  it('重置同时取消选中并触发复位', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-adrenal' }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByTestId('reset-token')).toHaveTextContent('0')

    await user.click(screen.getByRole('button', { name: '重新查看全部' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByTestId('reset-token')).toHaveTextContent('1')
  })

  it('普通选中不会触发复位', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-thyroid' }))
    await user.click(screen.getByRole('button', { name: 'select-ovary' }))
    await user.click(screen.getByRole('button', { name: 'select-none' }))

    expect(screen.getByTestId('reset-token')).toHaveTextContent('0')
  })

  it('卡片上的关闭按钮只取消选中，不复位相机', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-pancreas' }))
    await user.click(screen.getByRole('button', { name: '关闭' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByTestId('reset-token')).toHaveTextContent('0')
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
