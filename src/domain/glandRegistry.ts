import { GLANDS } from '../data/glands'
import type { Gland, GlandId } from '../types/gland'

const BY_ID: ReadonlyMap<GlandId, Gland> = new Map(GLANDS.map((g) => [g.id, g]))

/** 全部腺体，按解剖高度从上到下。 */
export function allGlands(): readonly Gland[] {
  return GLANDS
}

/** 按 id 取腺体。id 不存在时抛错 —— 这是编程错误，不是用户输入错误。 */
export function glandById(id: GlandId): Gland {
  const gland = BY_ID.get(id)
  if (!gland) {
    throw new Error(`Unknown gland id: ${id}`)
  }
  return gland
}

/** 宽松查询：接受任意字符串或 null，查不到返回 null。用于 UI 的可空选中态。 */
export function findGland(id: string | null): Gland | null {
  if (id === null) {
    return null
  }
  return BY_ID.get(id as GlandId) ?? null
}
