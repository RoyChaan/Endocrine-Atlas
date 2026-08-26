import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  OVERVIEW_POSE,
  azimuthFrom,
  computeTargetPose,
  interpolatePose,
} from '../domain/cameraFocus'
import { FOCUS_DURATION_MS } from '../domain/constants'
import { glandById } from '../domain/glandRegistry'
import type { CameraPose, GlandId } from '../types/gland'

interface CameraRigProps {
  selectedId: GlandId | null
  controlsRef: RefObject<OrbitControlsImpl | null>
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
export function CameraRig({ selectedId, controlsRef }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const transition = useRef<Transition | null>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    const from: CameraPose = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    }

    // 保留用户当前已转到的水平角度，聚焦不打断旋转（Design.md §12）。
    const azimuth = azimuthFrom(from.position, from.target)
    const to =
      selectedId === null ? OVERVIEW_POSE : computeTargetPose(glandById(selectedId), azimuth)

    transition.current = { from, to, startedAt: performance.now() }
    // camera 与 controlsRef 是稳定引用，只需在 selectedId 变化时重新起动画。
  }, [selectedId, camera, controlsRef])

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
