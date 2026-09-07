// 量 public/models/ 下每个模型：三轴尺寸、按 data/glands.ts 的 size 缩放后
// 在人体坐标系里的实际半厚，以及落位后的世界包围盒。
//
//   node scripts/measure-models.mjs
//
// data/glands.ts 里的 size 与 anchor、tests/data.test.ts 里的 MIN_GAP，
// 都该照这张表核对，而不是拍脑袋。
//
// 直接读 GLB 的 JSON 块：accessor 上带 POSITION 的 min/max，
// 不用解码顶点数据，也就不必把 three 拖进来。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'public', 'models')

// 与 data/glands.ts 保持一致；改了那边记得改这里。
const PLACEMENT = {
  brain: { size: 0.145, anchor: [-0.03, 1.662, -0.012], yaw: true, lateral: 0.72 },
  thyroid: { size: 0.05, anchor: [0, 1.457, -0.006] },
  pancreas: { size: 0.19, anchor: [0.01, 1.15, 0.042] },
  adrenal: { size: 0.16, anchor: [0, 1.09, -0.026] },
  ovary: { size: 0.135, anchor: [0, 0.94, -0.018] },
  testis: { size: 0.13, anchor: [0, 0.8, 0.03] },
}

const f = (v) => (v >= 0 ? '+' : '') + v.toFixed(3)
// 原始尺寸打成比例：GLB 里的坐标是量化过的整数（KHR_mesh_quantization），
// 绝对值没有意义，三轴的比值才有。
console.log('模型         原始比例 x/y/z      缩放后 x/y/z(米)     世界 z 区间')
for (const [id, place] of Object.entries(PLACEMENT)) {
  const file = path.join(DIR, `${id}.glb`)
  if (!fs.existsSync(file)) continue
  const buf = fs.readFileSync(file)
  const json = JSON.parse(buf.slice(20, 20 + buf.readUInt32LE(12)).toString('utf8'))
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      const a = json.accessors[prim.attributes.POSITION]
      for (let k = 0; k < 3; k += 1) {
        min[k] = Math.min(min[k], a.min[k])
        max[k] = Math.max(max[k], a.max[k])
      }
    }
  }
  const raw = [0, 1, 2].map((k) => max[k] - min[k])
  const scale = place.size / Math.max(...raw)
  // yaw 90° 把模型的 x / z 互换；lateral 只压世界 x。
  const world = place.yaw ? [raw[2], raw[1], raw[0]] : [raw[0], raw[1], raw[2]]
  const sized = world.map((v) => v * scale)
  if (place.lateral) sized[0] *= place.lateral
  const halfZ = sized[2] / 2
  console.log(
    `${id.padEnd(12)} ${raw.map((v) => (v / Math.max(...raw)).toFixed(2)).join(' ')}      ` +
      `${sized.map((v) => v.toFixed(3)).join(' ')}   ` +
      `${f(place.anchor[2] - halfZ)}..${f(place.anchor[2] + halfZ)}`,
  )
}
