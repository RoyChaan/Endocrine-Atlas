// 量人体网格：打印每个高度上正中矢状面的前后边界与躯干半宽。
//
//   node scripts/measure-body.mjs
//
// data/glands.ts 里那些 anchor 是照着这张表填的，不是拍脑袋写的。
// 换了人体模型就重新跑一遍 —— 不同网格的颈、胸、盆腔在 z 上差着好几厘米，
// 照搬旧坐标会让甲状腺浮到喉咙外面（这个坑真的踩过）。
//
// 直接读 build-body.mjs 产出的 GLB：它是未压缩、未量化的，
// POSITION 就是第 0 号 accessor，解析三行搞定，不需要拖 three 进来。
import fs from 'fs'
const buf = fs.readFileSync('public/models/body.glb')
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'))
const acc = json.accessors[0], bv = json.bufferViews[acc.bufferView]
const pos = new Float32Array(buf.buffer, buf.byteOffset + 20 + jsonLen + 8 + bv.byteOffset, acc.count * 3)

// 正中矢状面附近的一薄层：给出每个高度上躯干的前后边界。手臂不在中线上，
// 自动被排除，不需要额外过滤。
console.log('  y     z腹侧   z背侧   前后厚  z中心   躯干半宽')
for (let y = 0.82; y <= 1.76; y += 0.02) {
  let zf = -1e9, zb = 1e9
  for (let i = 0; i < pos.length; i += 3) {
    if (Math.abs(pos[i + 1] - y) > 0.008) continue
    if (Math.abs(pos[i]) > 0.015) continue
    zf = Math.max(zf, pos[i + 2]); zb = Math.min(zb, pos[i + 2])
  }
  // 躯干半宽：只取靠近中线厚度带内的点，再按 x 排序找躯干与手臂之间的空隙
  const xs = []
  for (let i = 0; i < pos.length; i += 3) {
    if (Math.abs(pos[i + 1] - y) > 0.008) continue
    if (pos[i] < 0) continue
    if (pos[i + 2] < zb - 0.02 || pos[i + 2] > zf + 0.02) continue
    xs.push(pos[i])
  }
  xs.sort((a, b) => a - b)
  let halfW = xs.length ? xs[xs.length - 1] : 0
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] - xs[i - 1] > 0.02) { halfW = xs[i - 1]; break }   // 躯干与手臂之间的空隙
  }
  if (zf < -1e8) continue
  const f = (v) => (v >= 0 ? '+' : '') + v.toFixed(3)
  console.log(`${y.toFixed(2)}  ${f(zf)}  ${f(zb)}  ${(zf-zb).toFixed(3)}  ${f((zf+zb)/2)}   ${halfW.toFixed(3)}`)
}
