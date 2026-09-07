import type { CameraPose, Gland, Vec3 } from '../types/gland'
import { MIN_FOCUS_DISTANCE } from './constants'

/** 聚焦时相机相对腺体的仰角（弧度）。略俯视，比纯水平更易读出深度。 */
const FOCUS_ELEVATION = 0.18

/**
 * 概览机位：一开始就框住**上半身**（Design.md §8）。Reset 的目标。
 *
 * 六个腺体全部落在 y ∈ [0.90, 1.72]，下半身没有任何要展示的东西。
 * 早先那个能看到全身的机位把一半画面让给了两条腿，每个腺体只剩几十像素。
 *
 * 距离 1.27、竖直视角 40°，纵向视野约 0.93 m —— 从耻骨上方一直框到头顶，
 * 上下各留约 4 cm 余量。人体切掉双臂后只有 0.42 m 宽，横向绰绰有余，
 * 所以取景由**纵向**定，再近腺体就会被上下裁掉。
 */
export const OVERVIEW_POSE: CameraPose = {
  position: [0, 1.36, 1.27],
  target: [0, 1.3, 0],
}

/**
 * 相机该注视腺体的哪一点：模型落位点，加上 `focusOffset`。
 *
 * 偏移是必要的 —— 有几个模型里"腺体本身"并不在包围盒中心。最典型的是
 * 肾上腺：模型的主体是那对肾脏，腺体只是扣在肾上极的两顶小帽子，
 * 对着包围盒中心推近相机，画面正中会是肾门而不是腺体。
 */
export function focusPoint(gland: Gland): Vec3 {
  const [ax, ay, az] = gland.model.anchor
  const [ox, oy, oz] = gland.focusOffset ?? [0, 0, 0]
  return [ax + ox, ay + oy, az + oz]
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
  const target = focusPoint(gland)
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
 * 主相机对"当前选中项"的响应：没有选中项就回概览，否则聚焦过去。
 *
 * 全部腺体一视同仁 —— 带独立小窗的腺体（睾丸）同样嵌在人体内，
 * 点小窗和点体内 marker 的效果完全一致：主画面居中放大到它。
 */
export function poseForSelection(gland: Gland | null, azimuth: number): CameraPose {
  if (gland === null) {
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
