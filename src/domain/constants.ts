/** 模型总高（单位≈米）。原点在双脚之间的地面。 */
export const BODY_HEIGHT = 1.75

/** 人体包围盒。所有腺体坐标必须落在其中。 */
export const BODY_BOUNDS = {
  minX: -0.3,
  maxX: 0.3,
  minY: 0,
  maxY: BODY_HEIGHT,
  minZ: -0.2,
  maxZ: 0.2,
} as const

/** 相机与腺体质心的最小距离，防止"贴脸"丢失周边解剖上下文（Design.md §10）。 */
export const MIN_FOCUS_DISTANCE = 0.35

/** 聚焦过渡时长。Design.md §10 要求 500–900ms。 */
export const FOCUS_DURATION_MS = 700

/** 每个腺体的作用条目上限（Design.md §16）。 */
export const MAX_FUNCTIONS = 3
