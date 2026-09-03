// 用 MakeHuman 的 CC0 基础网格生成人体虚影：public/models/body.glb
//
//   node scripts/build-body.mjs
//
// ## 为什么换掉自己写的距离场人体
//
// 上一版是用圆锥胶囊链 + 光滑并集提等值面搓出来的。比例可以按人体测量数据
// 排对，但"好不好看"排不出来 —— 头是个没有五官的蛋、手指糊成一团、
// 融合半径一大四肢就和躯干粘死。那是雕塑活，不是参数活。
//
// MakeHuman 的基础网格是**真人扫描拓扑**，2020 年 9 月由版权方明确释为
// CC0（见 base.obj 头部的声明），可以直接用、不必署名。
//
// ## MakeHuman 的形变是怎么回事
//
// base.obj 是一具中性（无性别倾向）的网格。性别 / 年龄 / 人种 / 胖瘦 /
// 胸型这些都不是骨骼参数，而是一组**逐顶点位移表**（.target 文件，
// 每行 `顶点号 dx dy dz`）。把想要的几张表加到基础网格上，就得到对应的人。
// 这里加的四张对应 MakeHuman 里"高加索 / 女 / 青年 / 中等肌肉 / 中等体重 /
// 中等罩杯 / 理想比例"这一组默认值。
//
// ## 只取 body 组
//
// base.obj 里除了皮肤，还有一堆给衣服 / 头发 / 骨骼绑定用的辅助几何
// （helper-*、joint-*）—— 一百多个小立方体和几片布。它们不该出现在画面上，
// 按 `g body` 分组过滤掉。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = path.join(ROOT, 'vendor', 'makehuman')
const OUT = path.join(ROOT, 'public', 'models', 'body.glb')

const BASE_URL =
  'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data'

/** 全部权重 1.0，对应 MakeHuman 里那组默认的"高加索女性青年"。 */
const TARGETS = [
  ['targets/macrodetails/caucasian-female-young.target', 1],
  ['targets/macrodetails/universal-female-young-averagemuscle-averageweight.target', 1],
  [
    'targets/macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions.target',
    1,
  ],
  // 罩杯收到最小。
  //
  // MakeHuman 的罩杯 / 挺度以"中等"为基准，中等就是零位移，仓库里没有这个
  // 文件（只有 max / min 两端），女性胸型本身含在 caucasian-female-young 里。
  // 而这具网格是**教学用的人体虚影**：侧面和背面转过去时，中等罩杯的轮廓
  // 比胸腔里那些腺体还抢眼 —— 看的人注意力全跑偏了。收到最小罩杯，性别特征
  // 仍在（卵巢、雌激素那张卡还得对得上一具女性躯体），但不再是画面的主角。
  ['targets/breast/female-young-averagemuscle-averageweight-mincup-averagefirmness.target', 1],
  ['targets/breast/breast-point-decr.target', 1],
]

/** 成品总高（米）。与 domain/constants.ts 的 BODY_HEIGHT 一致。 */
const BODY_HEIGHT = 1.75

async function fetchCached(relative) {
  const file = path.join(VENDOR, relative.replaceAll('/', '_'))
  if (fs.existsSync(file)) {
    return fs.readFileSync(file, 'utf8')
  }
  fs.mkdirSync(VENDOR, { recursive: true })
  const url = `${BASE_URL}/${relative}`
  process.stdout.write(`fetch ${relative}\n`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`)
  }
  const text = await response.text()
  fs.writeFileSync(file, text)
  return text
}

/** base.obj → 全部顶点 + body 组的四边形面。 */
function parseObj(text) {
  const vertices = []
  const quads = []
  let inBody = false
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/)
      vertices.push([Number(x), Number(y), Number(z)])
    } else if (line.startsWith('g ')) {
      inBody = line.trim() === 'g body'
    } else if (inBody && line.startsWith('f ')) {
      // `f v/vt/vn ...`，只要顶点号；obj 是 1-based。
      const corners = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((token) => Number(token.split('/')[0]) - 1)
      quads.push(corners)
    }
  }
  return { vertices, quads }
}

/** .target → [顶点号, dx, dy, dz] 列表。注释行以 # 开头。 */
function parseTarget(text) {
  const deltas = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }
    const [index, dx, dy, dz] = trimmed.split(/\s+/)
    deltas.push([Number(index), Number(dx), Number(dy), Number(dz)])
  }
  return deltas
}

/**
 * 把网格上的开口补上，返回补出来的三角形。
 *
 * MakeHuman 的 `body` 组不是封闭的：眼窝、口裂本来要靠 helper 组的眼球和
 * 牙齿去填，而我们把 helper 全滤掉了。不补的话，半透明壳上那几个洞会读成
 * 脸上的黑窟窿；而且开口网格没有"内外"可言，摆位检查台的射线奇偶判定
 * 会在头部整个失效。
 *
 * 做法是标准的边界环填充：只被一个三角形用到的边就是边界边，把它们首尾
 * 相接串成环，每个环从质心扇形三角化。眼窝口裂都是小而近乎平面的环，
 * 扇形填充足够，不需要真正的多边形三角化。
 */
function capHoles(positions, indices) {
  // 有向边 → 出现次数。封闭网格里每条边的两个方向各出现一次。
  const seen = new Map()
  const key = (a, b) => `${a},${b}`
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [indices[i], indices[i + 1], indices[i + 2]]
    for (let e = 0; e < 3; e += 1) {
      seen.set(key(tri[e], tri[(e + 1) % 3]), true)
    }
  }

  // 反向不存在的有向边就是边界边。边界环沿着它们走。
  const next = new Map()
  for (const k of seen.keys()) {
    const [a, b] = k.split(',').map(Number)
    if (!seen.has(key(b, a))) {
      next.set(a, b)
    }
  }

  const added = []
  const visited = new Set()
  for (const start of next.keys()) {
    if (visited.has(start)) {
      continue
    }
    const loop = []
    let v = start
    while (v !== undefined && !visited.has(v)) {
      visited.add(v)
      loop.push(v)
      v = next.get(v)
    }
    if (loop.length < 3) {
      continue
    }

    // 质心作为新顶点，扇形连回环上。
    const center = positions.length / 3
    let cx = 0
    let cy = 0
    let cz = 0
    for (const id of loop) {
      cx += positions[id * 3]
      cy += positions[id * 3 + 1]
      cz += positions[id * 3 + 2]
    }
    positions.push(cx / loop.length, cy / loop.length, cz / loop.length)

    // 边界环的走向与相邻面的绕序相反，所以这里要反着连，
    // 补出来的面才和周围同向 —— 否则补片的法线是朝里的。
    for (let i = 0; i < loop.length; i += 1) {
      added.push(center, loop[(i + 1) % loop.length], loop[i])
    }
  }
  return added
}

/**
 * 只保留**从外面看得见**的那层壳，把网格内部的几何全部删掉。
 *
 * MakeHuman 的 base 网格不只有皮肤：眼窝里嵌着一对实心眼球，嘴唇往里折成
 * 一个通到咽部的大空腔。它们对不透明的角色渲染无害，但这里的人体是一层
 * 菲涅尔玻璃 —— 内部面会原样透出来，看着就是"脑子和嘴之间浮着一个大球"，
 * 外加一条穿进后脑的隧道。
 *
 * 判据是"能不能从体外走到它旁边"，用体素洪水填充实现：
 *
 * 1. 把整具网格栅格化成体素，被三角形扫过的标成**墙**；
 * 2. 从包围盒外面的一个角开始，在非墙体素里做六连通洪水填充 —— 填到的
 *    就是**体外**。体腔、眼球内部、口腔都被墙围死，填不进去；
 * 3. 一个三角形只要有任何一个采样体素紧挨着"体外"体素，就留下；否则删。
 *
 * 用体素而不是逐三角形投射线求可见性：后者要 18000 × 若干方向 × 18000 次
 * 相交测试，没有 BVH 根本跑不动；体素法是线性的，几秒就完。
 *
 * 体素边长取 3 mm：比网格边长（约 5 mm）小，能分清眼睑与眼球；又足够粗，
 * 能把闭合的唇缝、鼻孔、耳道封死，让洪水灌不进那些腔体。
 */
function keepOuterShell(positions, indices, voxel = 0.003, seal = 1) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      min[k] = Math.min(min[k], positions[i + k])
      max[k] = Math.max(max[k], positions[i + k])
    }
  }
  // 留出空边，保证角上那个起点一定在体外，也给膨胀留余地。
  const pad = voxel * (seal + 3)
  const origin = min.map((v) => v - pad)
  const dim = [0, 1, 2].map((k) => Math.ceil((max[k] - min[k] + pad * 2) / voxel) + 1)
  const at = (x, y, z) => x + dim[0] * (y + dim[1] * z)
  const NEIGHBORS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
  const forEachNeighbor = (id, visit) => {
    const x = id % dim[0]
    const y = Math.floor(id / dim[0]) % dim[1]
    const z = Math.floor(id / (dim[0] * dim[1]))
    for (const [dx, dy, dz] of NEIGHBORS) {
      const nx = x + dx
      const ny = y + dy
      const nz = z + dz
      if (nx < 0 || ny < 0 || nz < 0 || nx >= dim[0] || ny >= dim[1] || nz >= dim[2]) continue
      visit(at(nx, ny, nz))
    }
  }

  /** 在三角形上按比网格更细的密度撒点。第二遍复用同一组采样点。 */
  const sampleTriangle = (t, visit) => {
    const a = indices[t] * 3
    const b = indices[t + 1] * 3
    const c = indices[t + 2] * 3
    let longest = 0
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      longest = Math.max(
        longest,
        Math.hypot(
          positions[p] - positions[q],
          positions[p + 1] - positions[q + 1],
          positions[p + 2] - positions[q + 2],
        ),
      )
    }
    const n = Math.max(1, Math.ceil(longest / (voxel * 0.5)))
    for (let i = 0; i <= n; i += 1) {
      for (let j = 0; i + j <= n; j += 1) {
        const u = i / n
        const v = j / n
        const w = 1 - u - v
        const gx = Math.floor((positions[a] * w + positions[b] * u + positions[c] * v - origin[0]) / voxel)
        const gy = Math.floor((positions[a + 1] * w + positions[b + 1] * u + positions[c + 1] * v - origin[1]) / voxel)
        const gz = Math.floor((positions[a + 2] * w + positions[b + 2] * u + positions[c + 2] * v - origin[2]) / voxel)
        visit(at(gx, gy, gz))
      }
    }
  }

  // 1. 栅格化成墙。
  const wall = new Uint8Array(dim[0] * dim[1] * dim[2])
  for (let t = 0; t < indices.length; t += 3) {
    sampleTriangle(t, (id) => {
      wall[id] = 1
    })
  }

  // 2. 把墙向外膨胀 seal 格，堵住比 2×seal 格更窄的缝（形态学闭运算）。
  //    眼球就是靠这一步变成"内部"的：眼裂本身是敞开的，洪水能从眼缝钻进
  //    眼窝，绕着眼球转一圈，于是整颗球都算"看得见"。把眼缝糊上之后，
  //    球被彻底关在里面。
  const sealedWall = Uint8Array.from(wall)
  let frontier = []
  for (let id = 0; id < wall.length; id += 1) {
    if (wall[id] === 1) frontier.push(id)
  }
  for (let round = 0; round < seal; round += 1) {
    const next = []
    for (const id of frontier) {
      forEachNeighbor(id, (n) => {
        if (sealedWall[n] === 0) {
          sealedWall[n] = 1
          next.push(n)
        }
      })
    }
    frontier = next
  }

  // 3. 从角上灌水，填到的就是体外。显式栈 —— 几百万格会把调用栈冲爆。
  const outside = new Uint8Array(sealedWall.length)
  const stack = [at(0, 0, 0)]
  outside[stack[0]] = 1
  while (stack.length > 0) {
    const id = stack.pop()
    forEachNeighbor(id, (n) => {
      if (outside[n] === 0 && sealedWall[n] === 0) {
        outside[n] = 1
        stack.push(n)
      }
    })
  }

  // 4. 体外区域被膨胀的墙挡在了真实表面之外 seal 格，得再涨回来，
  //    否则连外皮自己都够不着"体外"，整具网格会被删光。
  frontier = []
  for (let id = 0; id < outside.length; id += 1) {
    if (outside[id] === 1) frontier.push(id)
  }
  const reach = Uint8Array.from(outside)
  for (let round = 0; round <= seal; round += 1) {
    const next = []
    for (const id of frontier) {
      forEachNeighbor(id, (n) => {
        if (reach[n] === 0) {
          reach[n] = 1
          next.push(n)
        }
      })
    }
    frontier = next
  }

  // 5. 采样点碰得到"体外"的三角形留下。
  const kept = []
  for (let t = 0; t < indices.length; t += 3) {
    let visible = false
    sampleTriangle(t, (id) => {
      if (!visible && reach[id] === 1) visible = true
    })
    if (visible) {
      kept.push(indices[t], indices[t + 1], indices[t + 2])
    }
  }
  return kept
}

function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length)
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3
    const b = indices[i + 1] * 3
    const c = indices[i + 2] * 3
    const abx = positions[b] - positions[a]
    const aby = positions[b + 1] - positions[a + 1]
    const abz = positions[b + 2] - positions[a + 2]
    const acx = positions[c] - positions[a]
    const acy = positions[c + 1] - positions[a + 1]
    const acz = positions[c + 2] - positions[a + 2]
    // 不归一化：叉积的模正比于三角形面积，直接累加就是按面积加权。
    const nx = aby * acz - abz * acy
    const ny = abz * acx - abx * acz
    const nz = abx * acy - aby * acx
    for (const v of [a, b, c]) {
      normals[v] += nx
      normals[v + 1] += ny
      normals[v + 2] += nz
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2])
    if (len > 1e-12) {
      normals[i] /= len
      normals[i + 1] /= len
      normals[i + 2] /= len
    } else {
      normals[i + 1] = 1
    }
  }
  return normals
}

function writeGlb(positions, normals, indices, file) {
  const pad4 = (n) => (n + 3) & ~3

  const posBytes = positions.byteLength
  const nrmBytes = normals.byteLength
  const idxBytes = indices.byteLength
  const posOffset = 0
  const nrmOffset = pad4(posOffset + posBytes)
  const idxOffset = pad4(nrmOffset + nrmBytes)
  const binLength = pad4(idxOffset + idxBytes)

  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k += 1) {
      min[k] = Math.min(min[k], positions[i + k])
      max[k] = Math.max(max[k], positions[i + k])
    }
  }

  const json = {
    asset: { version: '2.0', generator: 'endocrine-atlas/build-body' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'body' }],
    meshes: [
      {
        name: 'body',
        primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2 }],
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: positions.length / 3,
        type: 'VEC3',
        min,
        max,
      },
      { bufferView: 1, componentType: 5126, count: normals.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: nrmOffset, byteLength: nrmBytes, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes, target: 34963 },
    ],
    buffers: [{ byteLength: binLength }],
  }

  let jsonText = JSON.stringify(json)
  while (jsonText.length % 4 !== 0) {
    jsonText += ' '
  }
  const jsonChunk = Buffer.from(jsonText, 'utf8')

  const bin = Buffer.alloc(binLength)
  Buffer.from(positions.buffer, positions.byteOffset, posBytes).copy(bin, posOffset)
  Buffer.from(normals.buffer, normals.byteOffset, nrmBytes).copy(bin, nrmOffset)
  Buffer.from(indices.buffer, indices.byteOffset, idxBytes).copy(bin, idxOffset)

  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0) // "glTF"
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + bin.length, 8)

  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonChunk.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4) // "JSON"

  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(bin.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4) // "BIN"

  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, Buffer.concat([header, jsonHeader, jsonChunk, binHeader, bin]))
}

const obj = parseObj(await fetchCached('3dobjs/base.obj'))
const vertices = obj.vertices.map((v) => [...v])

for (const [relative, weight] of TARGETS) {
  for (const [index, dx, dy, dz] of parseTarget(await fetchCached(relative))) {
    const v = vertices[index]
    v[0] += dx * weight
    v[1] += dy * weight
    v[2] += dz * weight
  }
}

// 只保留 body 组用到的顶点，重排下标。
const remap = new Map()
const positionList = []
const indexList = []
const idOf = (original) => {
  let id = remap.get(original)
  if (id === undefined) {
    id = positionList.length / 3
    remap.set(original, id)
    positionList.push(...vertices[original])
  }
  return id
}
for (const quad of obj.quads) {
  const ids = quad.map(idOf)
  // MakeHuman 的面是四边形，扇形切成三角形。
  for (let i = 1; i + 1 < ids.length; i += 1) {
    indexList.push(ids[0], ids[i], ids[i + 1])
  }
}

// 归一化到人体坐标系：脚底贴 y = 0，左右居中，总高 1.75。
const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
for (let i = 0; i < positionList.length; i += 3) {
  for (let k = 0; k < 3; k += 1) {
    bounds.min[k] = Math.min(bounds.min[k], positionList[i + k])
    bounds.max[k] = Math.max(bounds.max[k], positionList[i + k])
  }
}
const scale = BODY_HEIGHT / (bounds.max[1] - bounds.min[1])
const shiftX = -(bounds.min[0] + bounds.max[0]) / 2
const shiftY = -bounds.min[1]
for (let i = 0; i < positionList.length; i += 3) {
  positionList[i] = (positionList[i] + shiftX) * scale
  positionList[i + 1] = (positionList[i + 1] + shiftY) * scale
  positionList[i + 2] = positionList[i + 2] * scale
}

// z 方向**不能**按整体包围盒居中：脚尖伸得比身体任何部位都靠前，
// 臀部又最靠后，按包围盒对中会把 z = 0 推到躯干前方约 5 cm 处 ——
// 于是所有按解剖写死的器官 z 坐标集体前移，甲状腺会浮到喉咙外面。
//
// 改成按**躯干**对中：取胸腹段（y ∈ [0.95, 1.40]）正中矢状面上每一层的
// 前后中点，平均之后归零。这样 z = 0 就是躯干的冠状中面，
// 也正是 data/glands.ts 里那些 z 值默认的参照。
{
  let sum = 0
  let count = 0
  for (let y = 0.95; y <= 1.4; y += 0.01) {
    let front = -Infinity
    let back = Infinity
    for (let i = 0; i < positionList.length; i += 3) {
      if (Math.abs(positionList[i + 1] - y) > 0.008) continue
      if (Math.abs(positionList[i]) > 0.015) continue
      front = Math.max(front, positionList[i + 2])
      back = Math.min(back, positionList[i + 2])
    }
    if (front > -Infinity && front - back > 0.05) {
      sum += (front + back) / 2
      count += 1
    }
  }
  const torsoZ = sum / count
  for (let i = 2; i < positionList.length; i += 3) {
    positionList[i] -= torsoZ
  }
  console.log(`躯干冠状中面原本在 z = ${torsoZ.toFixed(3)}，已平移到 0`)
}

// 切掉双臂。
//
// 基础网格是 A 字站姿，两条手臂张得很开（全宽 1.07 m，其中躯干只占 0.4）。
// 画面里它们不承载任何信息，却把人体压小了一半 —— 相机要退到很远才装得下。
//
// 切法是一刀垂直平面。实测这具网格上：躯干最宽处在髋部、半宽 0.196；
// 手臂在 y < 1.27 处与躯干完全分离、内缘不小于 0.222；再往上并入肩部。
// 取 0.21 正好落在这两个数之间 —— 髋不会被削到，刀口落在三角肌上。
//
// 不做严格的多边形裁剪，而是把越界顶点**吸附**到切面上，再丢掉三条边都
// 越界的三角形。省掉一整套 Sutherland–Hodgman，代价是跨切面的那圈三角形
// 被拉扁了一点点 —— 网格边长才 5 mm，看不出来，而刀口是精确平面。
const ARM_CUT = 0.21
{
  const wasOutside = []
  for (let v = 0; v < positionList.length / 3; v += 1) {
    const x = positionList[v * 3]
    wasOutside.push(Math.abs(x) > ARM_CUT)
    if (Math.abs(x) > ARM_CUT) {
      positionList[v * 3] = Math.sign(x) * ARM_CUT
    }
  }
  const kept = []
  for (let i = 0; i < indexList.length; i += 3) {
    const a = indexList[i]
    const b = indexList[i + 1]
    const c = indexList[i + 2]
    // 三个角全在体外的是手臂本体，整片丢掉；只有一两个角越界的是刀口那圈，
    // 吸附之后正好铺成切面，留着。
    if (wasOutside[a] && wasOutside[b] && wasOutside[c]) {
      continue
    }
    kept.push(a, b, c)
  }
  console.log(`切臂：丢掉 ${(indexList.length - kept.length) / 3} 个三角形`)
  indexList.splice(0, indexList.length, ...kept.slice(0, 0))
  for (const id of kept) indexList.push(id)
}

// 先封住切臂留下的两个肩部断面。
//
// 顺序要紧：这一步必须在删内部几何**之前**。断面开着的话，下一步那场
// 洪水会直接从肩口灌进整个体腔，于是"体外"蔓延到全身内部，所有内部面
// 都被判成看得见 —— 实测只删掉 82 个三角形，眼球和口腔原封不动。
{
  const caps = capHoles(positionList, indexList)
  indexList.push(...caps)
  console.log(`封肩部断面：补上 ${caps.length / 3} 个三角形`)
}

// 删掉从体外看不见的内部几何（眼球、口腔 / 咽腔）。
{
  const before = indexList.length / 3
  const kept = keepOuterShell(positionList, indexList, 0.003)
  indexList.length = 0
  for (const id of kept) indexList.push(id)
  console.log(`删内部几何：丢掉 ${before - kept.length / 3} 个三角形（眼球、口腔等）`)
}

// 再封一次：上一步把眼球和口腔挖走后，眼裂与唇缝那圈变成了新的开口。
{
  const caps = capHoles(positionList, indexList)
  indexList.push(...caps)
  console.log(`封眼裂唇缝：补上 ${caps.length / 3} 个三角形`)
}

// 手臂顶点还留在数组里，只是没有面引用它们了。重排一遍丢掉。
{
  const remapped = new Map()
  const compact = []
  for (let i = 0; i < indexList.length; i += 1) {
    const old = indexList[i]
    let id = remapped.get(old)
    if (id === undefined) {
      id = compact.length / 3
      remapped.set(old, id)
      compact.push(positionList[old * 3], positionList[old * 3 + 1], positionList[old * 3 + 2])
    }
    indexList[i] = id
  }
  positionList.length = 0
  for (const value of compact) positionList.push(value)
}

const positions = new Float32Array(positionList)
const indices = new Uint32Array(indexList)
const normals = computeNormals(positions, indices)
writeGlb(positions, normals, indices, OUT)

// 尺寸按**成品**算：切臂前的包围盒宽 1.07 m，报那个数会误导。
const finalMin = [Infinity, Infinity, Infinity]
const finalMax = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < positions.length; i += 3) {
  for (let k = 0; k < 3; k += 1) {
    finalMin[k] = Math.min(finalMin[k], positions[i + k])
    finalMax[k] = Math.max(finalMax[k], positions[i + k])
  }
}
console.log(
  `body.glb  ${positions.length / 3} verts  ${indices.length / 3} tris  ` +
    `${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB
` +
    `成品包围盒（米）  宽 ${(finalMax[0] - finalMin[0]).toFixed(3)}  ` +
    `高 ${(finalMax[1] - finalMin[1]).toFixed(3)}  厚 ${(finalMax[2] - finalMin[2]).toFixed(3)}`,
)
