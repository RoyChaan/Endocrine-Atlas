import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { azimuthFrom, interpolatePose, poseForSelection } from '../domain/cameraFocus'
import { FOCUS_DURATION_MS } from '../domain/constants'
import { findGland } from '../domain/glandRegistry'
import type { CameraPose, GlandId } from '../types/gland'

interface CameraRigProps {
  selectedId: GlandId | null
  controlsRef: RefObject<OrbitControlsImpl | null>
  /**
   * 每次递增都重新起一次动画。它与 selectedId 相互独立，因此
   * "概览态下转动过相机再点重置" 也能触发复位 —— 这种情形下
   * selectedId 自始至终是 null，光靠它无法驱动。
   */
  resetToken: number
}

interface Transition {
  from: CameraPose
  to: CameraPose
  startedAt: number
}

/**
 * 相机聚焦的薄壳。全部数学在 domain/cameraFocus.ts 中且已被单测覆盖，
 * 这里只做三件事：读当前机位、推进 t、把结果写回 camera 与 controls。
 */
export function CameraRig({ selectedId, controlsRef, resetToken }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const transition = useRef<Transition | null>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    // 先排空 OrbitControls 的阻尼残留。拖动结束后它内部还留着一份
    // sphericalDelta，若不清掉，我们每帧写好机位后调用的 controls.update()
    // 会把这份角速度重新叠加回去 —— 表现为"点了重置但只转回去一半"。
    // 关掉阻尼跑一次 update()，走的是非阻尼分支：应用一次后把 delta 归零。
    const dampingWasEnabled = controls.enableDamping
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = dampingWasEnabled

    const from: CameraPose = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    }

    // 保留用户当前已转到的水平角度，聚焦不打断旋转（Design.md §12）。
    const azimuth = azimuthFrom(from.position, from.target)
    const to = poseForSelection(findGland(selectedId), azimuth)

    transition.current = { from, to, startedAt: performance.now() }
    // camera 与 controlsRef 是稳定引用；真正的触发源是 selectedId 与 resetToken。
  }, [selectedId, resetToken, camera, controlsRef])

  useFrame(() => {
    const active = transition.current
    const controls = controlsRef.current
    if (!active || !controls) {
      return
    }

    const t = (performance.now() - active.startedAt) / FOCUS_DURATION_MS
    const pose = interpolatePose(active.from, active.to, t)

    camera.position.set(pose.position[0], pose.position[1], pose.position[2])
    controls.target.set(pose.target[0], pose.target[1], pose.target[2])
    controls.update()

    if (t >= 1) {
      transition.current = null
    }
  })

  return null
}
