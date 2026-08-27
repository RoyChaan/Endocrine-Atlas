import type { CameraPose, Gland, Vec3 } from '../types/gland'
import { MIN_FOCUS_DISTANCE } from './constants'

/** 聚焦时相机相对腺体的仰角（弧度）。略俯视，比纯水平更易读出深度。 */
const FOCUS_ELEVATION = 0.18

/** 概览机位：能看到上半身全貌（Design.md §8）。Reset 的目标。 */
export const OVERVIEW_POSE: CameraPose = {
  position: [0, 1.35, 2.4],
  target: [0, 1.15, 0],
}

export function centroid(positions: readonly Vec3[]): Vec3 {
  if (positions.length === 0) {
    throw new Error('centroid() requires at least one position')
  }
  let x = 0
  let y = 0
  let z = 0
  for (const p of positions) {
    x += p[0]
    y += p[1]
    z += p[2]
  }
  const n = positions.length
  return [x / n, y / n, z / n]
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * 由机位与注视点反推水平方位角。+Z（正前方）为 0，顺时针为正。
 * CameraRig 用它读出用户当前已转到的角度，聚焦时予以保留（Design.md §12）。
 */
export function azimuthFrom(position: Vec3, target: Vec3): number {
  return Math.atan2(position[0] - target[0], position[2] - target[2])
}

/**
 * 给定腺体与当前方位角，算出目标机位。
 * 距离取 max(gland.focusDistance, MIN_FOCUS_DISTANCE)，保证不会贴脸到
 * 丢失周边解剖上下文（Design.md §10）。
 */
export function computeTargetPose(gland: Gland, azimuth: number): CameraPose {
  const target = centroid(gland.positions)
  const d = Math.max(gland.focusDistance, MIN_FOCUS_DISTANCE)
  const horizontal = d * Math.cos(FOCUS_ELEVATION)
  return {
    position: [
      target[0] + horizontal * Math.sin(azimuth),
      target[1] + d * Math.sin(FOCUS_ELEVATION),
      target[2] + horizontal * Math.cos(azimuth),
    ],
    target,
  }
}

/**
 * 主相机对"当前选中项"的响应。
 *
 * 只有嵌在人体内的腺体（display === 'body'）才值得聚焦。选中独立小窗中的
 * 腺体时，人体内没有对应的 marker —— 若仍按 positions 飞过去，相机会停在
 * 一个空位置，误导性比不动更强。因此回到概览，由小窗自己承担视觉强调。
 */
export function poseForSelection(gland: Gland | null, azimuth: number): CameraPose {
  if (gland === null || gland.display !== 'body') {
    return OVERVIEW_POSE
  }
  return computeTargetPose(gland, azimuth)
}

/** 形式为 (1-t)*a + t*b，保证 t=0 精确返回 a、t=1 精确返回 b。 */
function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    (1 - t) * a[0] + t * b[0],
    (1 - t) * a[1] + t * b[1],
    (1 - t) * a[2] + t * b[2],
  ]
}

/** t ∈ [0,1]，easeInOutCubic 缓动；越界钳制。 */
export function interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const clamped = Math.min(1, Math.max(0, t))
  const e = easeInOutCubic(clamped)
  return {
    position: lerp3(from.position, to.position, e),
    target: lerp3(from.target, to.target, e),
  }
}
