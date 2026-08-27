export type Vec3 = readonly [number, number, number]

export type GlandId =
  | 'hypothalamus'
  | 'pituitary'
  | 'thyroid'
  | 'adrenal'
  | 'pancreas'
  | 'ovary'
  | 'testis'

export interface Gland {
  readonly id: GlandId
  /** 英文名，知识卡的次级标签。 */
  readonly name: string
  /** 中文名，知识卡主标题。 */
  readonly chineseName: string
  /**
   * 一条数据 → 一个或多个 marker。
   * 单发器官 length === 1；成对器官（肾上腺 / 卵巢 / 睾丸）length === 2。
   * 这样一条知识条目就能对应多个 marker，无需重复的知识条目（Design.md §19）。
   */
  readonly positions: readonly Vec3[]
  /**
   * 是否在 3D 区右下角**额外**给一个独立小窗。
   *
   * 这是附加的细节视图，不影响腺体在人体内的存在 —— 全部腺体都嵌在人体里，
   * 点击时主相机一律居中放大聚焦过去。睾丸开这个标志，是因为它在半透明
   * mannequin 的盆腔下方不易看清（参考图也为它单开了一个小框）。
   */
  readonly hasInset: boolean
  /** 一句话位置描述。 */
  readonly location: string
  readonly hormones: readonly string[]
  /** 1–3 条，初中生水平（Design.md §16）。 */
  readonly functions: readonly string[]
  /** marker 颜色，hex。 */
  readonly color: string
  /** 相机聚焦时与腺体质心的距离，用于保留周边解剖上下文（Design.md §10）。 */
  readonly focusDistance: number
}

export interface CameraPose {
  readonly position: Vec3
  readonly target: Vec3
}
