import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Mesh } from 'three'
import type { BufferGeometry, Object3D } from 'three'
import { createBodyShellMaterial } from './bodyShell'
import { assetUrl } from '../assetUrl'

/** `scripts/build-body.mjs` 的产物：MakeHuman CC0 基础网格 + 女性形变表。 */
const BODY_URL = assetUrl('/models/body.glb')

/**
 * 半透明女性人体虚影（Design.md §4、§20）。
 *
 * 造型不是这里算的，是 `scripts/build-body.mjs` 离线生成的：MakeHuman 的
 * CC0 基础网格加上"高加索 / 女 / 青年"那组形变表，只取皮肤（`body` 组），
 * 归一化到脚底贴地、总高 1.75。脚本头部有完整说明。
 *
 * 上一版是自己用圆锥胶囊链搓的距离场等值面。比例能按人体测量数据排对，
 * 但"好不好看"排不出来 —— 头是个没五官的蛋、手指糊成一团。那是雕塑活。
 *
 * 材质仍是 `bodyShell.ts` 的菲涅尔壳：正对视线几乎全透、掠射处亮起，
 * 既让体内器官透出来，又把体积感交代清楚。
 */
export function BodyModel() {
  const { scene } = useGLTF(BODY_URL)

  const geometry = useMemo<BufferGeometry | null>(() => {
    let found: BufferGeometry | null = null
    scene.traverse((node: Object3D) => {
      if (!found && node instanceof Mesh) {
        found = node.geometry as BufferGeometry
      }
    })
    return found
  }, [scene])

  const material = useMemo(() => createBodyShellMaterial(), [])

  // ShaderMaterial 是我们自己 new 出来的，R3F 不接管它的生命周期，
  // 得自己释放 GPU 上的 program。几何体属于 useGLTF 的缓存，是共享的，
  // 不在此列。
  useEffect(() => () => material.dispose(), [material])

  if (!geometry) {
    return null
  }

  return (
    <group name="body-model">
      <mesh name="body-surface" geometry={geometry} material={material} />
    </group>
  )
}
