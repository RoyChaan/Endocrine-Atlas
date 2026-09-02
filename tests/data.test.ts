import { describe, expect, it } from 'vitest'
import { GLANDS } from '../src/data/glands'
import {
  allGlands,
  bodyGlands,
  detailGlands,
  findGland,
  glandById,
} from '../src/domain/glandRegistry'
import { BODY_BOUNDS, MAX_FUNCTIONS } from '../src/domain/constants'
import type { GlandId } from '../src/types/gland'

const EXPECTED_IDS: readonly GlandId[] = [
  'pituitary',
  'thyroid',
  'thymus',
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
})

describe('模型落位', () => {
  it('每个腺体各占一个模型文件，不重复', () => {
    const urls = GLANDS.map((g) => g.model.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的模型路径指向 public/models', (_id, gland) => {
    expect(gland.model.url).toMatch(/^\/models\/[a-z]+\.glb$/)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))(
    '%s 的尺寸在人体器官的合理量级（1 cm – 25 cm）',
    (_id, gland) => {
      expect(gland.model.size).toBeGreaterThan(0.01)
      expect(gland.model.size).toBeLessThan(0.25)
    },
  )

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的落位点在人体包围盒内', (_id, gland) => {
    const [x, y, z] = gland.model.anchor
    expect(x).toBeGreaterThanOrEqual(BODY_BOUNDS.minX)
    expect(x).toBeLessThanOrEqual(BODY_BOUNDS.maxX)
    expect(y).toBeGreaterThanOrEqual(BODY_BOUNDS.minY)
    expect(y).toBeLessThanOrEqual(BODY_BOUNDS.maxY)
    expect(z).toBeGreaterThanOrEqual(BODY_BOUNDS.minZ)
    expect(z).toBeLessThanOrEqual(BODY_BOUNDS.maxZ)
  })

  it('解剖高度自上而下排列，与数组顺序一致', () => {
    const heights = GLANDS.map((g) => g.model.anchor[1])
    for (let i = 1; i < heights.length; i += 1) {
      expect(heights[i]).toBeLessThan(heights[i - 1])
    }
  })

  it('甲状腺在颈部：高于胸腺，低于颅腔', () => {
    const y = (id: GlandId) => glandById(id).model.anchor[1]
    expect(y('thyroid')).toBeLessThan(y('pituitary'))
    expect(y('thyroid')).toBeGreaterThan(y('thymus'))
  })

  it('肾与胰腺在前后方向上错开，肾在后', () => {
    // 两个模型原来在 z 上重叠 5.1 cm，看上去是穿插在一起的。
    // 解剖上肾贴后腹壁、胰腺在其前方，分层方向是确定的。
    //
    // 半厚由 `node scripts/measure-models.mjs` 量出：肾 3.5 cm、胰腺 3.0 cm，
    // 所以两个落位点在 z 上至少要差 6.5 cm，两者的包围盒才不再相交。
    const MIN_GAP = 0.065
    const kidneyZ = glandById('adrenal').model.anchor[2]
    const pancreasZ = glandById('pancreas').model.anchor[2]
    expect(pancreasZ - kidneyZ).toBeGreaterThanOrEqual(MIN_GAP)
  })

  it('肾上腺的聚焦点落在肾模型的上半部 —— 腺体是顶端那对小帽', () => {
    const adrenal = glandById('adrenal')
    expect(adrenal.focusOffset?.[1] ?? 0).toBeGreaterThan(0)
  })

  it('只有大脑需要偏航修正 —— 其余模型导出时就是 +Z 朝腹侧', () => {
    const rotated = GLANDS.filter((g) => (g.model.yaw ?? 0) !== 0)
    expect(rotated.map((g) => g.id)).toEqual(['pituitary'])
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的 focusDistance 为正', (_id, gland) => {
    expect(gland.focusDistance).toBeGreaterThan(0)
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
    expect(
      [...body, ...detail].sort(),
    ).toEqual(allGlands().map((g) => g.id).sort())
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
