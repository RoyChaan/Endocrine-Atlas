import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import type { MeshStandardMaterial as StandardMaterial } from 'three'
import { GlandLayer } from '../src/scene/GlandLayer'
import { bodyGlands, glandById } from '../src/domain/glandRegistry'

/**
 * `useGLTF` 会真的去拉 .glb。jsdom 里既没有 fetch 到的文件也没有 WebGL，
 * 所以这里桩掉它，返回一个尺寸已知的假模型。
 *
 * 假模型故意做成 **1×2×4 的长方体、且中心不在原点**（放在 y = 10 上）：
 * OrganModel 的核心职责就是"把归一化过、原点毫无解剖含义的模型重新落位"，
 * 一个规规矩矩以原点为中心的单位球测不出这件事有没有做对。
 */
const STUB_SIZE = [1, 2, 4] as const
const STUB_CENTER = [0, 10, 0] as const

vi.mock('@react-three/drei', () => ({
  useGLTF: (url: string) => {
    const mesh = new Mesh(
      new BoxGeometry(STUB_SIZE[0], STUB_SIZE[1], STUB_SIZE[2]),
      new MeshStandardMaterial(),
    )
    mesh.position.set(STUB_CENTER[0], STUB_CENTER[1], STUB_CENTER[2])
    const scene = new Group()
    scene.name = `stub:${url}`
    scene.add(mesh)
    return { scene }
  },
}))

function organName(id: string): string {
  return `organ-${id}`
}

function groupFor(
  renderer: Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>,
  id: string,
) {
  const found = renderer.scene.findAll((node) => node.props.name === organName(id))
  expect(found).toHaveLength(1)
  return found[0]
}

/**
 * 器官的三层嵌套（压扁 → 偏航 → 归心）里，按类型各取一层。
 * 用 traverse 找而不是写死 `children[0]` —— 往中间插一层就全崩的写法，
 * 上一次加 `lateralScale` 时已经崩过一回了。
 */
function layersOf(root: unknown) {
  let squash: Object3D | null = null
  let rotated: Object3D | null = null
  let model: Object3D | null = null
  ;(root as Object3D).traverse((node) => {
    if (node === root) return
    if (!squash) squash = node
    else if (!rotated) rotated = node
    else if (!model) model = node
  })
  return {
    squash: squash as unknown as Object3D,
    rotated: rotated as unknown as Object3D,
    model: model as unknown as Object3D,
  }
}

/** 收集这棵子树里所有 Mesh 的材质。桩模型每个器官恰好一个 Mesh。 */
function materialsOf(object: unknown): StandardMaterial[] {
  const out: StandardMaterial[] = []
  ;(object as Object3D).traverse((node) => {
    if (node instanceof Mesh) {
      out.push(node.material as StandardMaterial)
    }
  })
  return out
}

describe('GlandLayer 场景图', () => {
  it('人体层每个腺体渲染一个模型 —— 成对器官由模型自带左右两侧，不再展开成两份', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    // 垂体（脑）+ 甲状腺 + 胸腺 + 胰岛（胰腺）+ 肾上腺（肾）+ 卵巢（子宫）= 6
    expect(bodyGlands()).toHaveLength(6)
    for (const gland of bodyGlands()) {
      expect(
        renderer.scene.findAll((node) => node.props.name === organName(gland.id)),
      ).toHaveLength(1)
    }
  })

  it('人体上有卵巢、没有睾丸 —— 两者解剖学上互斥', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    expect(
      renderer.scene.findAll((node) => node.props.name === organName('ovary')),
    ).toHaveLength(1)
    expect(
      renderer.scene.findAll((node) => node.props.name === organName('testis')),
    ).toHaveLength(0)
  })

  it('每个模型落在数据里声明的 anchor 上', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    for (const gland of bodyGlands()) {
      const group = groupFor(renderer, gland.id)
      const { x, y, z } = group.instance.position
      expect([x, y, z]).toEqual([...gland.model.anchor])
    }
  })

  it('缩放把模型的最长边压到 model.size', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    const longest = Math.max(...STUB_SIZE)
    for (const gland of bodyGlands()) {
      const group = groupFor(renderer, gland.id)
      expect(group.instance.scale.x).toBeCloseTo(gland.model.size / longest, 10)
      // 各向同性 —— 器官不能被拉扁。
      expect(group.instance.scale.y).toBeCloseTo(group.instance.scale.x, 10)
      expect(group.instance.scale.z).toBeCloseTo(group.instance.scale.x, 10)
    }
  })

  it('模型按自身包围盒归心，生成器留下的原点偏移被抵消掉', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    const group = groupFor(renderer, 'thyroid')
    // 桩模型的包围盒中心在 (0, 10, 0)，落位后整组的世界中心必须回到 anchor。
    group.instance.updateWorldMatrix(true, true)
    const box = new Box3().setFromObject(group.instance as unknown as Object3D)
    const center = box.getCenter(new Vector3())
    const anchor = glandById('thyroid').model.anchor
    expect(center.x).toBeCloseTo(anchor[0], 6)
    expect(center.y).toBeCloseTo(anchor[1], 6)
    expect(center.z).toBeCloseTo(anchor[2], 6)
  })

  it('只有大脑带偏航，其余模型不转', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    for (const gland of bodyGlands()) {
      const { rotated } = layersOf(groupFor(renderer, gland.id).instance)
      expect(rotated.rotation.y).toBeCloseTo(gland.model.yaw ?? 0, 10)
    }
  })

  it('只有大脑做左右压扁，其余模型严格等比', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    for (const gland of bodyGlands()) {
      const { squash } = layersOf(groupFor(renderer, gland.id).instance)
      expect(squash.scale.x).toBeCloseTo(gland.model.lateralScale ?? 1, 10)
      // 只压左右轴：上下与前后必须原样，否则器官会被整体拉变形。
      expect(squash.scale.y).toBe(1)
      expect(squash.scale.z).toBe(1)
    }
    const squashed = bodyGlands().filter((g) => (g.model.lateralScale ?? 1) !== 1)
    expect(squashed.map((g) => g.id)).toEqual(['pituitary'])
  })

  it('压扁层在偏航层外面 —— 压的必须是人体左右轴，不是模型自己的轴', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId="pituitary" onSelect={() => {}} />,
    )
    const { squash, rotated } = layersOf(groupFor(renderer, 'pituitary').instance)
    // 大脑的前后径被生成器放在了模型 X 上，偏航 90° 后才转到世界 Z。
    // 压扁层要是嵌在偏航层里面，压到的就是前后径 —— 正好压反。
    expect(rotated.parent).toBe(squash)
    expect(rotated.rotation.y).toBeCloseTo(Math.PI / 2, 10)
  })

  it('点击模型以正确的 id 触发 onSelect', async () => {
    const onSelect = vi.fn()
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={onSelect} />,
    )

    await renderer.fireEvent(groupFor(renderer, 'thyroid'), 'click', {
      stopPropagation: () => {},
    })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('thyroid')
  })

  it('概览态下所有腺体不透明度一致（Design.md §8：初始不强调任何腺体）', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    const opacities = bodyGlands().flatMap((gland) =>
      materialsOf(groupFor(renderer, gland.id).instance).map((m) => m.opacity),
    )
    expect(opacities).toHaveLength(bodyGlands().length)
    expect(new Set(opacities).size).toBe(1)
  })

  it('选中态：该腺体满不透明并染上主题色，其余被压暗', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId="thyroid" onSelect={() => {}} />,
    )
    const [thyroid] = materialsOf(groupFor(renderer, 'thyroid').instance)
    const [other] = materialsOf(groupFor(renderer, 'pancreas').instance)

    expect(thyroid.opacity).toBe(1)
    expect(other.opacity).toBeLessThan(1)
    expect(thyroid.emissiveIntensity).toBeGreaterThan(other.emissiveIntensity)
  })

  it('材质逐实例复制 —— 两个腺体不共享同一份材质，否则选中态会互相串', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId="thyroid" onSelect={() => {}} />,
    )
    const uuids = bodyGlands().flatMap((gland) =>
      materialsOf(groupFor(renderer, gland.id).instance).map((m) => m.uuid),
    )
    expect(new Set(uuids).size).toBe(uuids.length)
  })

  it('每个腺体用各自的模型文件，不共用一份占位几何', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    const names = bodyGlands().map(
      (gland) => layersOf(groupFor(renderer, gland.id).instance).model.name,
    )
    expect(new Set(names).size).toBe(bodyGlands().length)
    for (const gland of bodyGlands()) {
      expect(names).toContain(`stub:${gland.model.url}`)
    }
  })
})
