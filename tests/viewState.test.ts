import { describe, expect, it } from 'vitest'
import {
  INITIAL_VIEW,
  bodySelectedId,
  cardGlandId,
  closeCard,
  exitDetail,
  isDetail,
  openDetail,
  selectGland,
} from '../src/domain/viewState'
import { bodyGlands, detailGlands } from '../src/domain/glandRegistry'

describe('INITIAL_VIEW', () => {
  it('初始处于人体模式且未选中任何腺体', () => {
    expect(INITIAL_VIEW).toEqual({ mode: 'body', selectedId: null })
    expect(isDetail(INITIAL_VIEW)).toBe(false)
    expect(cardGlandId(INITIAL_VIEW)).toBeNull()
    expect(bodySelectedId(INITIAL_VIEW)).toBeNull()
  })
})

describe('人体模式下选中腺体', () => {
  it('选中后卡片与人体高亮都指向它', () => {
    const view = selectGland(INITIAL_VIEW, 'thyroid')
    expect(view).toEqual({ mode: 'body', selectedId: 'thyroid' })
    expect(cardGlandId(view)).toBe('thyroid')
    expect(bodySelectedId(view)).toBe('thyroid')
  })

  it('传 null 取消选中', () => {
    const view = selectGland(selectGland(INITIAL_VIEW, 'ovary'), null)
    expect(view).toEqual(INITIAL_VIEW)
    expect(cardGlandId(view)).toBeNull()
  })

  it('切换选中项', () => {
    const view = selectGland(selectGland(INITIAL_VIEW, 'thyroid'), 'adrenal')
    expect(cardGlandId(view)).toBe('adrenal')
  })
})

describe('详情模式', () => {
  it('打开详情后模式切换，卡片指向该腺体', () => {
    const view = openDetail('testis')
    expect(view).toEqual({ mode: 'detail', glandId: 'testis' })
    expect(isDetail(view)).toBe(true)
    expect(cardGlandId(view)).toBe('testis')
  })

  it('详情模式下人体没有选中项 —— 人体此刻根本不在画面上', () => {
    expect(bodySelectedId(openDetail('testis'))).toBeNull()
  })

  it('退出详情回到人体概览', () => {
    expect(exitDetail()).toEqual(INITIAL_VIEW)
    expect(isDetail(exitDetail())).toBe(false)
  })

  it('详情模式下 selectGland 不生效 —— 那些腺体不在画面上，点不到', () => {
    const view = openDetail('testis')
    expect(selectGland(view, 'thyroid')).toEqual(view)
    expect(selectGland(view, null)).toEqual(view)
  })
})

describe('closeCard', () => {
  it('人体模式下只取消选中，仍留在人体模式', () => {
    const view = closeCard(selectGland(INITIAL_VIEW, 'pancreas'))
    expect(view).toEqual(INITIAL_VIEW)
    expect(isDetail(view)).toBe(false)
  })

  it('详情模式下等同于退出详情', () => {
    expect(closeCard(openDetail('testis'))).toEqual(INITIAL_VIEW)
  })

  it('已经没有选中项时是幂等的', () => {
    expect(closeCard(INITIAL_VIEW)).toEqual(INITIAL_VIEW)
  })
})

describe('与腺体数据的一致性', () => {
  it('人体上的腺体包含卵巢，不包含睾丸 —— 同一个人不会两者兼有', () => {
    const bodyIds = bodyGlands().map((g) => g.id)
    expect(bodyIds).toContain('ovary')
    expect(bodyIds).not.toContain('testis')
  })

  it('睾丸是唯一需要独立详情视图的腺体', () => {
    expect(detailGlands().map((g) => g.id)).toEqual(['testis'])
  })

  it('每个 detail 腺体都能打开并退出详情', () => {
    for (const gland of detailGlands()) {
      const view = openDetail(gland.id)
      expect(cardGlandId(view)).toBe(gland.id)
      expect(exitDetail()).toEqual(INITIAL_VIEW)
    }
  })
})
