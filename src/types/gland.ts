export type Vec3 = readonly [number, number, number]

export type GlandId =
  | 'hypothalamus'
  | 'pituitary'
  | 'thyroid'
  | 'adrenal'
  | 'pancreas'
  | 'ovary'
  | 'testis'

/**
 * 腺体在哪里展示。
 * - `body`  ：作为 marker 嵌在半透明人体内
 * - `inset` ：单独渲染在 3D 区右下角的独立小窗中
 *
 * 睾丸用 `inset`：参考图里它也是画在独立小框中的，因为主人体轮廓
 * 无法同时承载卵巢与睾丸。这是数据属性而非组件里的 id 特判分支。
 */
export type GlandDisplay = 'body' | 'inset'

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
  /** 展示在人体内还是独立小窗中。 */
  readonly display: GlandDisplay
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
