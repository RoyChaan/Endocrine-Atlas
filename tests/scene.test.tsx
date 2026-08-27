import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { Mesh, MeshStandardMaterial } from 'three'
import { GlandLayer } from '../src/scene/GlandLayer'
import { bodyGlands } from '../src/domain/glandRegistry'

/** 人体层只渲染 display === 'body' 的腺体；睾丸不在人体上。 */
const TOTAL_MARKERS = bodyGlands().reduce((n, g) => n + g.positions.length, 0)

function markerName(id: string): string {
  return `gland-marker-${id}`
}

/**
 * test-renderer 把 instance 静态类型标为 Object3D。所有 marker 都是
 * Mesh + MeshStandardMaterial，这里收窄一次，避免测试里散落断言。
 */
function materialOf(node: { instance: object }): MeshStandardMaterial {
  return (node.instance as Mesh).material as MeshStandardMaterial
}

describe('GlandLayer 场景图', () => {
  it('marker 总数等于人体层腺体 positions 之和（成对器官展开为 2 个）', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    const meshes = renderer.scene.findAll((node) => node.type === 'Mesh')
    // 下丘脑1 + 垂体1 + 甲状腺1 + 肾上腺2 + 胰腺1 + 卵巢2 = 8（睾丸不在人体上）
    expect(TOTAL_MARKERS).toBe(8)
    expect(meshes).toHaveLength(TOTAL_MARKERS)
  })

  it('人体上有卵巢、没有睾丸 —— 两者解剖学上互斥', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    expect(
      renderer.scene.findAll((node) => node.props.name === markerName('ovary')),
    ).toHaveLength(2)
    expect(
      renderer.scene.findAll((node) => node.props.name === markerName('testis')),
    ).toHaveLength(0)
  })

  it('覆盖全部人体层腺体 id', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    for (const gland of bodyGlands()) {
      const found = renderer.scene.findAll((node) => node.props.name === markerName(gland.id))
      expect(found).toHaveLength(gland.positions.length)
    }
  })

  it('点击 marker 以正确的 id 触发 onSelect', async () => {
    const onSelect = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={onSelect} />,
    )
    const thyroid = renderer.scene.findAll(
      (node) => node.props.name === markerName('thyroid'),
    )[0]

    await renderer.fireEvent(thyroid, 'click', { stopPropagation: () => {} })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('thyroid')
  })

  it('成对器官的两个 marker 都映射到同一个 id', async () => {
    const onSelect = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={onSelect} />,
    )
    const adrenals = renderer.scene.findAll((node) => node.props.name === markerName('adrenal'))
    expect(adrenals).toHaveLength(2)

    for (const marker of adrenals) {
      await renderer.fireEvent(marker, 'click', { stopPropagation: () => {} })
    }

    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls.map((c) => c[0])).toEqual(['adrenal', 'adrenal'])
  })

  it('概览态下所有腺体不透明度一致（Design.md §8：初始不强调任何腺体）', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    const opacities = renderer.scene
      .findAll((node) => node.type === 'Mesh')
      .map((node) => materialOf(node).opacity)

    expect(opacities).toHaveLength(TOTAL_MARKERS)
    expect(new Set(opacities).size).toBe(1)
  })

  it('选中态：该腺体更不透明、更亮、更大；其余被压暗', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId="thyroid" onSelect={() => {}} />,
    )
    const thyroid = renderer.scene.findAll(
      (node) => node.props.name === markerName('thyroid'),
    )[0]
    const other = renderer.scene.findAll(
      (node) => node.props.name === markerName('pancreas'),
    )[0]

    expect(materialOf(thyroid).opacity).toBe(1)
    expect(materialOf(other).opacity).toBeLessThan(1)
    expect(materialOf(thyroid).emissiveIntensity).toBeGreaterThan(
      materialOf(other).emissiveIntensity,
    )
    expect(thyroid.instance.scale.x).toBeGreaterThan(other.instance.scale.x)
  })

  it('marker 位置与数据中的坐标一致', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    for (const gland of bodyGlands()) {
      const markers = renderer.scene.findAll((node) => node.props.name === markerName(gland.id))
      const rendered = markers
        .map((m) => [m.instance.position.x, m.instance.position.y, m.instance.position.z])
        .sort((a, b) => a[0] - b[0])
      const expected = gland.positions.map((p) => [...p]).sort((a, b) => a[0] - b[0])
      expect(rendered).toEqual(expected)
    }
  })
})
