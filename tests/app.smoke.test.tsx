import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { bodyGlands, detailGlands } from '../src/domain/glandRegistry'
import type { GlandId } from '../src/types/gland'

// GlandSoloScene 内含 <Canvas>，jsdom 无 WebGL。桩掉它，保留 DetailEntry
// 与 DetailView 的 DOM 外壳（按钮、标签、返回）作为真实被测对象。
vi.mock('../src/scene/GlandSoloScene', () => ({
  GlandSoloScene: () => <div data-testid="solo-scene-stub" />,
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
      {bodyGlands().map((gland) => (
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

  it.each(bodyGlands().map((g) => [g.id, g] as const))(
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

  it('人体上没有睾丸的选择入口 —— 它不在人体上', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: 'select-testis' })).not.toBeInTheDocument()
  })

  it('人体模式下有睾丸的详情入口', () => {
    render(<App />)
    const [testis] = detailGlands()
    const entry = screen.getByRole('button', { name: `单独查看${testis.chineseName}` })
    expect(entry).toHaveTextContent(testis.chineseName)
    expect(entry).toHaveTextContent(testis.name)
  })

  it('点击入口进入睾丸单独视图：人体消失，出现返回按钮与知识卡', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = detailGlands()

    await user.click(screen.getByRole('button', { name: `单独查看${testis.chineseName}` }))

    // 人体场景已从画面上移除
    expect(screen.queryByTestId('scene-stub')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /返回人体/ })).toBeInTheDocument()

    const card = screen.getByRole('complementary')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(testis.chineseName)
    expect(card).toHaveTextContent(testis.location)
    for (const hormone of testis.hormones) {
      expect(card).toHaveTextContent(hormone)
    }
    for (const fn of testis.functions) {
      expect(card).toHaveTextContent(fn)
    }
  })

  it('点返回按钮退回人体，入口重新出现', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = detailGlands()
    const entryName = `单独查看${testis.chineseName}`

    await user.click(screen.getByRole('button', { name: entryName }))
    await user.click(screen.getByRole('button', { name: /返回人体/ }))

    expect(screen.getByTestId('scene-stub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: entryName })).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('详情视图中点重置也退回人体', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = detailGlands()

    await user.click(screen.getByRole('button', { name: `单独查看${testis.chineseName}` }))
    await user.click(screen.getByRole('button', { name: '重新查看全部' }))

    expect(screen.getByTestId('scene-stub')).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('详情视图中关闭知识卡等同于退回人体', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = detailGlands()

    await user.click(screen.getByRole('button', { name: `单独查看${testis.chineseName}` }))
    await user.click(screen.getByRole('button', { name: '关闭' }))

    expect(screen.getByTestId('scene-stub')).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('从人体选中项进入详情，返回后不残留旧的选中项', async () => {
    const user = userEvent.setup()
    render(<App />)
    const [testis] = detailGlands()

    await user.click(screen.getByRole('button', { name: 'select-thyroid' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('甲状腺')

    await user.click(screen.getByRole('button', { name: `单独查看${testis.chineseName}` }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(testis.chineseName)

    await user.click(screen.getByRole('button', { name: /返回人体/ }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'select-ovary' }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'select-none' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
