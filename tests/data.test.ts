import { describe, expect, it } from 'vitest'
import { GLANDS } from '../src/data/glands'
import { allGlands, bodyGlands, detailGlands, findGland, glandById } from '../src/domain/glandRegistry'
import { BODY_BOUNDS, MAX_FUNCTIONS } from '../src/domain/constants'
import type { GlandId } from '../src/types/gland'

const EXPECTED_IDS: readonly GlandId[] = [
  'hypothalamus',
  'pituitary',
  'thyroid',
  'adrenal',
  'pancreas',
  'ovary',
  'testis',
]

describe('腺体数据完整性', () => {
  it('恰好 7 个腺体，id 集合与 GlandId 全集一致', () => {
    expect(GLANDS).toHaveLength(7)
    expect(GLANDS.map((g) => g.id).sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('id 唯一', () => {
    const ids = GLANDS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的文本字段非空', (_id, gland) => {
    expect(gland.name.trim()).not.toBe('')
    expect(gland.chineseName.trim()).not.toBe('')
    expect(gland.location.trim()).not.toBe('')
    expect(gland.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的激素与作用条数合规', (_id, gland) => {
    expect(gland.hormones.length).toBeGreaterThanOrEqual(1)
    expect(gland.functions.length).toBeGreaterThanOrEqual(1)
    expect(gland.functions.length).toBeLessThanOrEqual(MAX_FUNCTIONS)
    for (const text of [...gland.hormones, ...gland.functions]) {
      expect(text.trim()).not.toBe('')
    }
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 至少有一个位置', (_id, gland) => {
    expect(gland.positions.length).toBeGreaterThanOrEqual(1)
    expect(gland.positions.length).toBeLessThanOrEqual(2)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的坐标落在人体包围盒内', (_id, gland) => {
    for (const [x, y, z] of gland.positions) {
      expect(x).toBeGreaterThanOrEqual(BODY_BOUNDS.minX)
      expect(x).toBeLessThanOrEqual(BODY_BOUNDS.maxX)
      expect(y).toBeGreaterThanOrEqual(BODY_BOUNDS.minY)
      expect(y).toBeLessThanOrEqual(BODY_BOUNDS.maxY)
      expect(z).toBeGreaterThanOrEqual(BODY_BOUNDS.minZ)
      expect(z).toBeLessThanOrEqual(BODY_BOUNDS.maxZ)
    }
  })

  it('成对器官左右对称', () => {
    const paired = GLANDS.filter((g) => g.positions.length === 2)
    expect(paired.map((g) => g.id).sort()).toEqual(['adrenal', 'ovary', 'testis'])

    for (const gland of paired) {
      const [left, right] = gland.positions
      expect(left[0]).toBeCloseTo(-right[0], 10)
      expect(left[1]).toBeCloseTo(right[1], 10)
      expect(left[2]).toBeCloseTo(right[2], 10)
      expect(Math.abs(left[0])).toBeGreaterThan(0)
    }
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的 focusDistance 为正', (_id, gland) => {
    expect(gland.focusDistance).toBeGreaterThan(0)
  })

  it('解剖高度自上而下排列，与数组顺序一致', () => {
    const heights = GLANDS.map((g) => g.positions[0][1])
    for (let i = 1; i < heights.length; i += 1) {
      expect(heights[i]).toBeLessThan(heights[i - 1])
    }
  })

  it('肾上腺高于胰腺（T12 高于 L1–L2）', () => {
    expect(glandById('adrenal').positions[0][1]).toBeGreaterThan(
      glandById('pancreas').positions[0][1],
    )
  })

  it('下丘脑高于垂体（Design.md §5）', () => {
    expect(glandById('hypothalamus').positions[0][1]).toBeGreaterThan(
      glandById('pituitary').positions[0][1],
    )
  })
})

describe('腺体的展示位置', () => {
  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 声明了 display', (_id, gland) => {
    expect(['body', 'detail']).toContain(gland.display)
  })

  it('恰好一个腺体需要独立详情视图，且是睾丸', () => {
    expect(detailGlands().map((g) => g.id)).toEqual(['testis'])
  })

  it('人体上有卵巢、没有睾丸 —— 同一个人不可能两者兼有', () => {
    const bodyIds = bodyGlands().map((g) => g.id)
    expect(bodyIds).toContain('ovary')
    expect(bodyIds).not.toContain('testis')
  })

  it('bodyGlands 与 detailGlands 恰好划分全部腺体，无遗漏无重叠', () => {
    const body = bodyGlands().map((g) => g.id)
    const detail = detailGlands().map((g) => g.id)

    expect(body).not.toHaveLength(0)
    expect(detail).not.toHaveLength(0)
    expect(new Set([...body, ...detail]).size).toBe(GLANDS.length)
    expect([...body, ...detail].sort()).toEqual(allGlands().map((g) => g.id).sort())
  })
})

describe('glandRegistry', () => {
  it('allGlands 返回全部 7 条', () => {
    expect(allGlands()).toHaveLength(7)
  })

  it('glandById 命中', () => {
    expect(glandById('thyroid').chineseName).toBe('甲状腺')
  })

  it('glandById 对未知 id 抛错', () => {
    expect(() => glandById('spleen' as GlandId)).toThrow('Unknown gland id: spleen')
  })

  it('findGland 对 null 与未知 id 返回 null', () => {
    expect(findGland(null)).toBeNull()
    expect(findGland('spleen')).toBeNull()
  })

  it('findGland 命中', () => {
    expect(findGland('ovary')?.chineseName).toBe('卵巢')
  })
})
