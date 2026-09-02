import { Box3, Group, Vector3 } from 'three'
import type { Object3D } from 'three'
import type { Gland } from '../types/gland'

/**
 * 把生成器导出的模型摆进人体坐标系，返回摆好位的根节点。
 *
 * ## 为什么单独抽出来
 *
 * 摆位一共四层嵌套，顺序错一层结果就完全不同。这套逻辑同时被两处用到：
 * 场景里的 `OrganModel`，以及摆位检查台 `tools/placement.html`。
 * 两边各写一遍的后果已经付过学费 —— 加 `lateralScale` 时只改了组件，
 * 检查台照旧按老逻辑摆，于是报告说"全部在体内"，而它量的根本是另一个摆法。
 * 检查台是摆位唯一的裁判，它一撒谎，后面全靠猜。所以只留一份实现。
 *
 * ## 四层分别在做什么
 *
 * 第三方生成器的导出被归一化过：最长边约 1、底面贴 y = 0、水平居中。
 * 也就是说模型自带的原点毫无解剖含义，直接 `position = anchor` 摆出来会全错。
 *
 * 1. **最内层** 按包围盒中心归心，原点从此落在器官正中；
 * 2. **第二层** 施加 `yaw`，把生成器的朝向转成 +Z 朝腹侧；
 * 3. **第三层** 施加 `lateralScale`，沿人体左右轴压一下（只有大脑用到）；
 * 4. **最外层** 等比缩放到 `size`，再平移到 `anchor`。
 *
 * 顺序不能换。等比缩放与旋转可交换，所以第 4 层放在最外面没问题；
 * 但 `lateralScale` 是非等比的，必须在 `yaw` **之后**才压得到世界 X 轴 ——
 * 压在旋转里面压的是模型自己的轴，对大脑来说那是前后径，正好压反。
 * 归心则必须在旋转**里面**，否则转的是"绕模型原点"而不是"绕器官自身"。
 *
 * 会就地修改 `model.position`，所以传进来的应当是调用方自己的克隆。
 */
export function placeOrgan(model: Object3D, gland: Gland): Group {
  const box = new Box3().setFromObject(model)
  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const longest = Math.max(size.x, size.y, size.z)

  model.position.set(-center.x, -center.y, -center.z)

  const rotated = new Group()
  rotated.name = 'organ-yaw'
  rotated.rotation.y = gland.model.yaw ?? 0
  rotated.add(model)

  const squashed = new Group()
  squashed.name = 'organ-lateral'
  squashed.scale.set(gland.model.lateralScale ?? 1, 1, 1)
  squashed.add(rotated)

  const placed = new Group()
  placed.scale.setScalar(longest > 0 ? gland.model.size / longest : 1)
  placed.position.set(gland.model.anchor[0], gland.model.anchor[1], gland.model.anchor[2])
  placed.add(squashed)
  return placed
}
