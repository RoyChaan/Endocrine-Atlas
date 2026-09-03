import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Mesh, MeshStandardMaterial } from 'three'
import type { Object3D } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { placeOrgan } from './organPlacement'
import type { Gland, GlandId } from '../types/gland'
import { assetUrl } from '../assetUrl'

/**
 * 不透明度。选中的那个保持全实，其余压暗，让"我现在看的是哪个"一眼可辨。
 * 概览态（没有任何选中项）下所有腺体一致 —— Design.md §8：初始不强调任何一个。
 */
const OPACITY_OVERVIEW = 1
const OPACITY_DIMMED = 0.45

/**
 * 选中时往主题色上染一点，跟右侧知识卡的配色对上。
 * 数值必须小 —— 睾丸、肾这类本来就浅的组织，0.16 就足以把整个器官染成主题色。
 */
const EMISSIVE_SELECTED = 0.09

interface OrganModelProps {
  gland: Gland
  isSelected: boolean
  /** 当前是否已有任何腺体被选中。决定用概览态还是强弱对比态。 */
  hasSelection: boolean
  /** 传 undefined 表示这个模型不可点（详情入口缩略图里由外层 DOM 接管点击）。 */
  onSelect?: (id: GlandId) => void
}

/**
 * 一个腺体的写实模型。
 *
 * 摆位（归心 / 偏航 / 左右压扁 / 缩放落位）全在 `organPlacement.ts`，
 * 与摆位检查台共用同一份实现。这里只管两件组件层面的事：材质与点击。
 *
 * ## 材质为什么要改写
 *
 * 生成器给的是不透明 PBR 材质。要做"未选中时压暗"就必须开 `transparent`，
 * 而 glTF 里的材质是**多个实例共享的克隆源**，直接改会污染其他实例 ——
 * 同一个模型可能同时出现在人体场景和详情视图里，两处选中状态并不相同。
 * 所以 `useGLTF` 拿到的场景每次都 `clone(true)`，材质也各复制一份。
 */
export function OrganModel({ gland, isSelected, hasSelection, onSelect }: OrganModelProps) {
  const { scene } = useGLTF(assetUrl(gland.model.url))

  // 克隆与摆位必须在**同一个** useMemo 里。
  //
  // 拆成两个的话，StrictMode 下渲染函数会跑两遍：第二遍的 placeOrgan 把克隆体
  // 从第一遍建的 group 里摘走挂到自己的 group 上，而 React 保留的是第一遍的
  // 记忆值 —— 于是画面上挂着一个空 group，七个器官全部消失，且不报任何错。
  // 合成一个之后，每次调用连克隆带 group 都是自己新建的，互不相干。
  const placed = useMemo(() => {
    const cloned = scene.clone(true)
    cloned.traverse((node: Object3D) => {
      if (!(node instanceof Mesh)) {
        return
      }
      const source = node.material as MeshStandardMaterial
      const material = source.clone()
      material.transparent = true
      material.depthWrite = true
      node.material = material
    })
    return placeOrgan(cloned, gland)
  }, [scene, gland])

  // 逐实例克隆出来的材质不归 R3F 管，得自己释放。几何体与贴图仍属于
  // useGLTF 的缓存，是共享的，不能在这里 dispose。
  useEffect(
    () => () => {
      placed.traverse((node: Object3D) => {
        if (node instanceof Mesh) {
          ;(node.material as MeshStandardMaterial).dispose()
        }
      })
    },
    [placed],
  )

  const opacity = !hasSelection ? OPACITY_OVERVIEW : isSelected ? 1 : OPACITY_DIMMED

  useEffect(() => {
    placed.traverse((node: Object3D) => {
      if (!(node instanceof Mesh)) {
        return
      }
      const material = node.material as MeshStandardMaterial
      material.opacity = opacity
      material.emissive.set(gland.color)
      material.emissiveIntensity = isSelected ? EMISSIVE_SELECTED : 0
    })
  }, [placed, opacity, isSelected, gland.color])

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!onSelect) {
      return
    }
    event.stopPropagation()
    onSelect(gland.id)
  }

  return (
    <primitive
      object={placed}
      name={`organ-${gland.id}`}
      onClick={onSelect ? handleClick : undefined}
    />
  )
}
