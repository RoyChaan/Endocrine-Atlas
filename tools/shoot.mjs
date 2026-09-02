// 开发用截图脚本：驱动本机 Chrome 打开 dev server，做一串动作后截图。
//
//   node tools/shoot.mjs <out.png> [动作 ...]
//
// 动作有两种：
//   "文本片段"    —— 按可见文本找按钮并点击（返回人体、单独查看…）
//   "gland:<id>"  —— 点 3D 画布上那个腺体。位置由概览机位把它的 anchor
//                    投影到屏幕算出来，所以这个动作顺带验证了射线检测
//                    真的能打中 GLB 模型 —— 那是纯 DOM 测试覆盖不到的。
import puppeteer from 'puppeteer-core'

const [out, ...actions] = process.argv.slice(2)
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1400, height: 900 })
page.on('pageerror', (e) => console.error('PAGEERROR', e.message))
page.on('console', (m) => {
  const t = m.text()
  if (m.type() === 'error' && !t.includes('favicon')) console.error('CONSOLE', t)
})
await page.goto('http://localhost:5177/', { waitUntil: 'networkidle0', timeout: 180000 })
const settle = (ms = 4000) => new Promise((r) => setTimeout(r, ms))
await settle(6000)

for (const action of actions) {
  if (action.startsWith('gland:')) {
    const id = action.slice('gland:'.length)
    const point = await page.evaluate(async (glandId) => {
      const { GLANDS } = await import('/src/data/glands.ts')
      const { OVERVIEW_POSE } = await import('/src/domain/cameraFocus.ts')
      const gland = GLANDS.find((g) => g.id === glandId)
      const canvas = document.querySelector('canvas')
      const rect = canvas.getBoundingClientRect()

      // 概览机位是正对人体的（x = 0，看向 x = 0），所以投影退化成
      // 一次透视除法，不需要搬一整个矩阵库进来。
      const eye = OVERVIEW_POSE.position
      const target = OVERVIEW_POSE.target
      const [ax, ay, az] = gland.model.anchor
      const forward = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]]
      const flen = Math.hypot(...forward)
      const f = forward.map((v) => v / flen)
      const upWorld = [0, 1, 0]
      const right = [
        f[1] * upWorld[2] - f[2] * upWorld[1],
        f[2] * upWorld[0] - f[0] * upWorld[2],
        f[0] * upWorld[1] - f[1] * upWorld[0],
      ]
      const rlen = Math.hypot(...right)
      const r = right.map((v) => v / rlen)
      const u = [
        r[1] * f[2] - r[2] * f[1],
        r[2] * f[0] - r[0] * f[2],
        r[0] * f[1] - r[1] * f[0],
      ]
      const d = [ax - eye[0], ay - eye[1], az - eye[2]]
      const depth = d[0] * f[0] + d[1] * f[1] + d[2] * f[2]
      const sx = d[0] * r[0] + d[1] * r[1] + d[2] * r[2]
      const sy = d[0] * u[0] + d[1] * u[1] + d[2] * u[2]
      const halfH = Math.tan((40 * Math.PI) / 180 / 2) * depth
      const halfW = halfH * (rect.width / rect.height)
      return {
        x: rect.left + rect.width * (0.5 + sx / (2 * halfW)),
        y: rect.top + rect.height * (0.5 - sy / (2 * halfH)),
      }
    }, id)
    await page.mouse.click(point.x, point.y)
  } else {
    const handle = await page.evaluateHandle((t) => {
      const all = [...document.querySelectorAll('button, [role=button]')]
      return all.find((el) => el.textContent.includes(t)) ?? null
    }, action)
    const element = handle.asElement()
    if (!element) {
      console.error(`no element containing: ${action}`)
      process.exit(1)
    }
    await element.click()
  }
  await settle()
}

await page.screenshot({ path: out })
await browser.close()
console.log('wrote', out)
