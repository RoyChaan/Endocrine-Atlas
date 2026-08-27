import { describe, expect, it } from 'vitest'
import {
  OVERVIEW_POSE,
  azimuthFrom,
  centroid,
  computeTargetPose,
  easeInOutCubic,
  interpolatePose,
  poseForSelection,
} from '../src/domain/cameraFocus'
import { allGlands, bodyGlands, glandById, insetGlands } from '../src/domain/glandRegistry'
import { MIN_FOCUS_DISTANCE } from '../src/domain/constants'
import type { CameraPose, Vec3 } from '../src/types/gland'

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

describe('centroid', () => {
  it('单点返回自身', () => {
    expect(centroid([[1, 2, 3]])).toEqual([1, 2, 3])
  })

  it('两点返回中点', () => {
    expect(
      centroid([
        [-2, 4, 6],
        [2, 4, 6],
      ]),
    ).toEqual([0, 4, 6])
  })

  it('空数组抛错', () => {
    expect(() => centroid([])).toThrow('centroid() requires at least one position')
  })

  it('成对器官的质心落在正中线上', () => {
    for (const gland of allGlands().filter((g) => g.positions.length === 2)) {
      expect(centroid(gland.positions)[0]).toBeCloseTo(0, 10)
    }
  })
})

describe('easeInOutCubic', () => {
  it('端点精确', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
  })

  it('中点为 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10)
  })

  it('单调不减', () => {
    let prev = -Infinity
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = easeInOutCubic(Math.min(t, 1))
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

describe('interpolatePose', () => {
  const from: CameraPose = { position: [0, 1.35, 2.4], target: [0, 1.15, 0] }
  const to: CameraPose = { position: [0.1, 1.5, 0.6], target: [0, 1.47, 0.05] }

  it('t=0 精确返回起点', () => {
    expect(interpolatePose(from, to, 0)).toEqual(from)
  })

  it('t=1 精确返回终点', () => {
    expect(interpolatePose(from, to, 1)).toEqual(to)
  })

  it('t 越界被钳制', () => {
    expect(interpolatePose(from, to, -1)).toEqual(from)
    expect(interpolatePose(from, to, 2)).toEqual(to)
  })

  it('到目标机位的距离沿 t 单调不增', () => {
    let prev = Infinity
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const pose = interpolatePose(from, to, Math.min(t, 1))
      const d = distance(pose.position, to.position)
      expect(d).toBeLessThanOrEqual(prev + 1e-9)
      prev = d
    }
  })
})

describe('computeTargetPose', () => {
  it('target 等于腺体质心', () => {
    const gland = glandById('adrenal')
    expect(computeTargetPose(gland, 0).target).toEqual(centroid(gland.positions))
  })

  it('对全部 7 个腺体，相机距离不小于阈值（防贴脸）', () => {
    for (const gland of allGlands()) {
      for (const azimuth of [0, 0.7, Math.PI / 2, Math.PI, -2.3]) {
        const pose = computeTargetPose(gland, azimuth)
        expect(distance(pose.position, pose.target)).toBeGreaterThanOrEqual(
          MIN_FOCUS_DISTANCE - 1e-9,
        )
      }
    }
  })

  it('相机距离等于 max(focusDistance, MIN_FOCUS_DISTANCE)', () => {
    for (const gland of allGlands()) {
      const pose = computeTargetPose(gland, 1.1)
      const expected = Math.max(gland.focusDistance, MIN_FOCUS_DISTANCE)
      expect(distance(pose.position, pose.target)).toBeCloseTo(expected, 10)
    }
  })

  it('focusDistance 低于阈值时被抬到阈值', () => {
    const tiny = { ...glandById('thyroid'), focusDistance: 0.01 }
    const pose = computeTargetPose(tiny, 0)
    expect(distance(pose.position, pose.target)).toBeCloseTo(MIN_FOCUS_DISTANCE, 10)
  })

  it('不同方位角给出不同机位，但 target 不变', () => {
    const gland = glandById('thyroid')
    const a = computeTargetPose(gland, 0)
    const b = computeTargetPose(gland, Math.PI / 2)
    expect(a.position).not.toEqual(b.position)
    expect(a.target).toEqual(b.target)
  })

  it('相机高于腺体质心（略俯视）', () => {
    for (const gland of allGlands()) {
      const pose = computeTargetPose(gland, 0)
      expect(pose.position[1]).toBeGreaterThan(pose.target[1])
    }
  })
})

describe('azimuthFrom', () => {
  it('与 computeTargetPose 互为逆运算', () => {
    const gland = glandById('pancreas')
    for (const azimuth of [0, 0.7, 1.5, -2.3, 3.0]) {
      const pose = computeTargetPose(gland, azimuth)
      expect(azimuthFrom(pose.position, pose.target)).toBeCloseTo(azimuth, 10)
    }
  })

  it('正前方（+Z）为 0', () => {
    expect(azimuthFrom([0, 1, 1], [0, 1, 0])).toBeCloseTo(0, 10)
  })

  it('正右方（+X）为 π/2', () => {
    expect(azimuthFrom([1, 1, 0], [0, 1, 0])).toBeCloseTo(Math.PI / 2, 10)
  })
})

describe('poseForSelection', () => {
  it('未选中任何腺体时回到概览', () => {
    expect(poseForSelection(null, 0)).toEqual(OVERVIEW_POSE)
    expect(poseForSelection(null, 1.7)).toEqual(OVERVIEW_POSE)
  })

  it('选中人体内的腺体时聚焦到它', () => {
    for (const gland of bodyGlands()) {
      expect(poseForSelection(gland, 0.4)).toEqual(computeTargetPose(gland, 0.4))
    }
  })

  it('选中独立小窗中的腺体时，主相机回到概览而不是飞向体内的空位置', () => {
    for (const gland of insetGlands()) {
      expect(poseForSelection(gland, 0.4)).toEqual(OVERVIEW_POSE)
    }
  })

  it('睾丸的 positions 仍在数据中，但主相机不会飞过去', () => {
    const testis = glandById('testis')
    expect(testis.positions.length).toBe(2)
    expect(poseForSelection(testis, 0)).not.toEqual(computeTargetPose(testis, 0))
  })
})

describe('OVERVIEW_POSE', () => {
  it('位于人体正前方', () => {
    expect(OVERVIEW_POSE.position[0]).toBeCloseTo(0, 10)
    expect(OVERVIEW_POSE.position[2]).toBeGreaterThan(0)
  })

  it('距离远大于任何单个腺体的聚焦距离，能看到上半身全貌', () => {
    const d = distance(OVERVIEW_POSE.position, OVERVIEW_POSE.target)
    const maxFocus = Math.max(...allGlands().map((g) => g.focusDistance))
    expect(d).toBeGreaterThan(maxFocus * 2)
  })
})
