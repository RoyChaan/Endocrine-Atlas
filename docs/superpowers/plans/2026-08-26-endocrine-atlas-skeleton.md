# Endocrine Atlas 骨架 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个可运行、可测试的 Endocrine Atlas 骨架，`选中腺体 → 高亮 → 相机聚焦 → 知识卡` 主链路端到端真实可用且被测试覆盖；腺体真实造型用统一小球占位。

**Architecture:** 三层严格单向依赖 —— `data/`（纯数据，零 import）← `domain/`（纯函数，零 React 零 three）← `scene/` + `ui/`（React 薄壳）。相机聚焦数学被强制挤出 `useFrame` 成为纯函数，因而可被无 WebGL 单测覆盖。成对器官（肾上腺/卵巢/睾丸）用 `positions: Vec3[]` 承载，一条知识条目渲染多个 marker。

**Tech Stack:** Vite + React + TypeScript + Three.js + @react-three/fiber + @react-three/drei；测试用 Vitest + jsdom + @testing-library/react + @react-three/test-renderer。

**上游文档：**
- 需求规格：`Design.md`
- 设计方案：`docs/superpowers/specs/2026-08-26-endocrine-atlas-skeleton-design.md`

## Global Constraints

这些约束隐含地属于**每一个** task 的要求：

- **不引入 Next.js**（`Design.md` §3）。不引入状态管理库（§27）。不引入动画库（§3，用 `useFrame` 手写插值）。不引入 CSS 框架。不引入后端、数据库、鉴权（§34）。
- **单文件不超过约 150 行**。超出即说明职责过多，应拆分。
- **依赖方向严格单向**：`domain/` 不得 `import` `react` 或 `three`；`data/` 不得 `import` 任何模块（除了 `../types/gland` 的 type-only import）。
- **UI 组件不得直接 `import` `data/glands.ts`**，必须经由 `domain/glandRegistry.ts`（`Design.md` §15：教育内容不得硬编码进组件）。
- **坐标系**（`Design.md` §29，全局唯一）：`+Y` = 上；`+X` = 观察者右侧 = 人体左侧；`+Z` = 前（腹侧）。原点在双脚间地面，模型总高 **1.75** 单位。
- **教育内容语言**：中文为主，英文名作次级标签（`Design.md` §17）。目标读者初中生，禁止出现 HPA 轴、受体信号、第二信使、分子通路等术语（§16）。
- **Node 版本**：≥ 20。本机实测 v24.19.0 / npm 11.17.0。
- **git**：每个 task 结束时 commit，且 commit 落地时 `npm run verify` 必须为绿。**只做本地 commit，不 push**。commit message 用中文正文，结尾附：

  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```
- **PowerShell 注意**：本机 shell 无 `&&` 链式操作符。多条命令请分开执行，或用 `;` 分隔并自行检查各步结果。

---

## File Structure

| 文件 | 职责 | 由哪个 Task 创建 |
|---|---|---|
| `package.json` / `vite.config.ts` / `tsconfig.json` / `index.html` | 工具链 | 1 |
| `src/main.tsx` | React 挂载点 | 1 |
| `src/test/setup.ts` | jsdom 环境补丁（ResizeObserver / matchMedia / jest-dom） | 1 |
| `src/types/gland.ts` | `Gland` / `GlandId` / `Vec3` / `CameraPose` 类型定义 | 2 |
| `src/domain/constants.ts` | 人体包围盒、聚焦距离阈值、动画时长 | 2 |
| `src/data/glands.ts` | 7 条腺体教育内容 + 坐标（唯一真源） | 2 |
| `src/domain/glandRegistry.ts` | 腺体的唯一查询入口 | 2 |
| `src/domain/cameraFocus.ts` | 相机聚焦纯数学 | 3 |
| `src/scene/GlandMarker.tsx` | 统一发光小球 marker（**未来唯一替换点**） | 4 |
| `src/scene/GlandLayer.tsx` | 遍历数据展开成 marker，处理成对器官 | 4 |
| `src/scene/BodyModel.tsx` | 半透明人体 mannequin 占位 | 5 |
| `src/scene/CameraRig.tsx` | `useFrame` 薄壳，只调 `domain` 纯函数 | 5 |
| `src/scene/AnatomyScene.tsx` | `<Canvas>` + 灯光 + OrbitControls 组装 | 5 |
| `src/ui/Header.tsx` / `ResetButton.tsx` / `ControlsHint.tsx` / `KnowledgeCard.tsx` | UI 组件 | 6 |
| `src/App.tsx` | 布局 + 唯一的 `useState` | 1 创建骨架，6 完成接线 |
| `src/index.css` | 全部样式 | 1 创建骨架，6 完成 |
| `tests/toolchain.test.tsx` | 工具链自检 | 1 |
| `tests/data.test.ts` | 数据完整性护栏 | 2 |
| `tests/cameraFocus.test.ts` | 聚焦不变量 | 3 |
| `tests/scene.test.tsx` | 场景图 + 点击（r3f test-renderer） | 4 |
| `tests/app.smoke.test.tsx` | DOM 层端到端冒烟 | 6 |
| `README.md` | 上手说明 + 腺体造型替换指南 | 6 |

---

## Task 1: 工具链初始化

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`（已存在，跳过）
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`
- Test: `tests/toolchain.test.tsx`

**Interfaces:**
- Consumes: 无（首个 task）
- Produces:
  - npm scripts：`dev` / `build` / `test` / `test:watch` / `typecheck` / `verify`
  - `src/App.tsx` 具名导出 `App` 组件（`export function App()`，非 default export）
  - 测试文件放在顶层 `tests/`，通过 `vite.config.ts` 的 `test.include` 生效
  - 从 `tests/` 引用源码用相对路径 `../src/...`

- [ ] **Step 1: 创建 `package.json`**

```json
{
  "name": "endocrine-atlas",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "verify": "npm run typecheck && npm run test && npm run build"
  }
}
```

- [ ] **Step 2: 安装运行时依赖**

按**匹配的一组**版本安装（React 19 / R3F 9 / drei 10 是配套的）：

```bash
npm install react@^19 react-dom@^19 three @react-three/fiber@^9 @react-three/drei@^10
```

- [ ] **Step 3: 安装开发依赖**

```bash
npm install -D vite @vitejs/plugin-react typescript vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom @react-three/test-renderer@^9 @types/react @types/react-dom
```

- [ ] **Step 4: 验证依赖无 peer 冲突**

Run: `npm ls @react-three/fiber @react-three/test-renderer react`
Expected: 无 `UNMET PEER DEPENDENCY` / `invalid` 标记。

**若报 peer 冲突**：整组降级到 React 18 配套版本，重新执行 Step 2–3：

```bash
npm install react@^18 react-dom@^18 three @react-three/fiber@^8 @react-three/drei@^9
npm install -D @react-three/test-renderer@^8 @types/react@^18 @types/react-dom@^18
```

- [ ] **Step 5: 创建 `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 6: 创建 `vite.config.ts`**

用 `vitest/config` 的 `defineConfig`（而非 `vite` 的），这样 `test` 字段才有类型。

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 7: 创建 `src/test/setup.ts`**

jsdom 缺 `ResizeObserver` 和 `matchMedia`，R3F 与 drei 会用到。

```ts
import '@testing-library/jest-dom/vitest'

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverStub,
  })
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
```

- [ ] **Step 8: 创建 `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Endocrine Atlas · 内分泌系统</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: 创建 `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('#root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 10: 创建 `src/App.tsx`（本 task 只要骨架）**

```tsx
export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>ENDOCRINE ATLAS</h1>
        <span className="app__subtitle">内分泌系统</span>
      </header>
      <main className="app__body" />
    </div>
  )
}
```

- [ ] **Step 11: 创建 `src/index.css`（本 task 只要最小可见样式）**

```css
:root {
  --bg: #0f1419;
  --panel: #1a2027;
  --text: #e6edf3;
  --muted: #8b98a5;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
  margin: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app__header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.9rem 1.4rem;
  border-bottom: 1px solid #263039;
}

.app__header h1 {
  margin: 0;
  font-size: 1.05rem;
  letter-spacing: 0.14em;
  font-weight: 600;
}

.app__subtitle {
  color: var(--muted);
  font-size: 0.9rem;
}

.app__body {
  flex: 1;
  min-height: 0;
}
```

- [ ] **Step 12: 写工具链自检测试 `tests/toolchain.test.tsx`**

**不要**在这里渲染 `App` —— Task 6 会重写 `App`，那样这个测试会一起腐坏。渲染一个内联组件，只验证 TS + JSX + RTL + jsdom + jest-dom 五件事都通了。

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function Probe({ label }: { label: string }) {
  return <p data-testid="probe">{label}</p>
}

describe('toolchain', () => {
  it('renders TSX through React + jsdom', () => {
    render(<Probe label="工具链正常" />)
    expect(screen.getByTestId('probe')).toBeInTheDocument()
    expect(screen.getByTestId('probe')).toHaveTextContent('工具链正常')
  })

  it('provides the jsdom polyfills that R3F needs', () => {
    expect(typeof globalThis.ResizeObserver).toBe('function')
    expect(typeof window.matchMedia).toBe('function')
  })
})
```

- [ ] **Step 13: 跑测试，确认通过**

Run: `npm test`
Expected: PASS，2 个测试通过。

（本 task 是脚手架，不存在"先看到失败"的红灯阶段 —— 测试的对象就是工具链本身。后续 task 一律严格 TDD。）

- [ ] **Step 14: 跑完整 verify**

Run: `npm run verify`
Expected: typecheck 无错 → 2 个测试通过 → `vite build` 成功，产出 `dist/`。

**若 `tsc` 报 three 的类型缺失**（`Could not find a declaration file for module 'three'`）：
```bash
npm install -D @types/three
```
再跑一次 verify。

**若 `tsc` 报 R3F 的 JSX 内联元素（`<mesh>` 等）不存在**：本 task 还没用到这些元素，可忽略；Task 4 会处理。

- [ ] **Step 15: 手动确认开发服务器能起来**

Run: `npm run dev`
Expected: 打印本地地址，浏览器打开后看到深色页面与 "ENDOCRINE ATLAS / 内分泌系统" 标题栏。确认后 Ctrl+C 停止。

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src tests
git commit -m "chore: 初始化 vite + react + ts + vitest 工具链

npm run verify = typecheck + vitest + build，作为每个里程碑的
单一交付判据。tests/ 用顶层目录（借鉴 thebuggeddev/anatomy）。
src/test/setup.ts 补上 jsdom 缺失的 ResizeObserver 与 matchMedia，
这是后续 R3F 组件能在 jsdom 里跑起来的前提。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 类型、数据与查询入口

**Files:**
- Create: `src/types/gland.ts`, `src/domain/constants.ts`, `src/data/glands.ts`, `src/domain/glandRegistry.ts`
- Test: `tests/data.test.ts`

**Interfaces:**
- Consumes: Task 1 的工具链
- Produces:
  - `src/types/gland.ts`：`type Vec3 = readonly [number, number, number]`；`type GlandId`（7 个字面量联合）；`interface Gland`；`interface CameraPose { readonly position: Vec3; readonly target: Vec3 }`
  - `src/domain/constants.ts`：`BODY_HEIGHT: number`、`BODY_BOUNDS`、`MIN_FOCUS_DISTANCE: number`、`FOCUS_DURATION_MS: number`、`MAX_FUNCTIONS: number`
  - `src/data/glands.ts`：`export const GLANDS: readonly Gland[]`
  - `src/domain/glandRegistry.ts`：`allGlands(): readonly Gland[]`、`glandById(id: GlandId): Gland`、`findGland(id: string | null): Gland | null`

- [ ] **Step 1: 创建 `src/types/gland.ts`**

```ts
export type Vec3 = readonly [number, number, number]

export type GlandId =
  | 'hypothalamus'
  | 'pituitary'
  | 'thyroid'
  | 'adrenal'
  | 'pancreas'
  | 'ovary'
  | 'testis'

export interface Gland {
  readonly id: GlandId
  /** 英文名，知识卡的次级标签。 */
  readonly name: string
  /** 中文名，知识卡主标题。 */
  readonly chineseName: string
  /**
   * 一条数据 → 一个或多个 marker。
   * 单发器官 length === 1；成对器官（肾上腺 / 卵巢 / 睾丸）length === 2。
   * 这样一条知识条目就能对应多个 marker，无需重复的知识条目（Design.md §19）。
   */
  readonly positions: readonly Vec3[]
  /** 一句话位置描述。 */
  readonly location: string
  readonly hormones: readonly string[]
  /** 1–3 条，初中生水平（Design.md §16）。 */
  readonly functions: readonly string[]
  /** marker 颜色，hex。 */
  readonly color: string
  /** 相机聚焦时与腺体质心的距离，用于保留周边解剖上下文（Design.md §10）。 */
  readonly focusDistance: number
}
```

- [ ] **Step 2: 创建 `src/domain/constants.ts`**

```ts
/** 模型总高（单位≈米）。原点在双脚之间的地面。 */
export const BODY_HEIGHT = 1.75

/** 人体包围盒。所有腺体坐标必须落在其中。 */
export const BODY_BOUNDS = {
  minX: -0.3,
  maxX: 0.3,
  minY: 0,
  maxY: BODY_HEIGHT,
  minZ: -0.2,
  maxZ: 0.2,
} as const

/** 相机与腺体质心的最小距离，防止"贴脸"丢失周边解剖上下文（Design.md §10）。 */
export const MIN_FOCUS_DISTANCE = 0.35

/** 聚焦过渡时长。Design.md §10 要求 500–900ms。 */
export const FOCUS_DURATION_MS = 700

/** 每个腺体的作用条目上限（Design.md §16）。 */
export const MAX_FUNCTIONS = 3
```

- [ ] **Step 3: 创建 `src/data/glands.ts`**

坐标按 1.75m 身高的解剖比例推导。`+X` = 人体左侧，`+Z` = 腹侧。

```ts
import type { Gland } from '../types/gland'

/**
 * 全部教育内容的唯一真源（Design.md §15）。
 * UI 组件不得直接引用本文件，一律经由 domain/glandRegistry.ts。
 *
 * 坐标系（Design.md §29）：+Y 上，+X 人体左侧，+Z 腹侧；原点在双脚间地面，总高 1.75。
 * 数组顺序按解剖高度从上到下排列，tests/data.test.ts 会校验这一顺序。
 */
export const GLANDS: readonly Gland[] = [
  {
    id: 'hypothalamus',
    name: 'Hypothalamus',
    chineseName: '下丘脑',
    positions: [[0, 1.655, -0.01]],
    location: '大脑底部，垂体的正上方',
    hormones: ['释放激素'],
    functions: ['指挥垂体工作，是内分泌系统的“总开关”', '调节体温、饥饿和睡眠'],
    color: '#7C9EF0',
    focusDistance: 0.45,
  },
  {
    id: 'pituitary',
    name: 'Pituitary',
    chineseName: '垂体',
    positions: [[0, 1.63, -0.01]],
    location: '大脑底部，约一颗豌豆大小',
    hormones: ['生长激素'],
    functions: ['促进身体长高、长壮', '指挥其他内分泌腺工作'],
    color: '#9B8CF0',
    focusDistance: 0.45,
  },
  {
    id: 'thyroid',
    name: 'Thyroid',
    chineseName: '甲状腺',
    positions: [[0, 1.47, 0.05]],
    location: '颈部前方，气管两侧',
    hormones: ['甲状腺激素'],
    functions: ['调节身体的新陈代谢', '参与生长发育', '影响神经系统的兴奋性'],
    color: '#F0968C',
    focusDistance: 0.5,
  },
  {
    id: 'adrenal',
    name: 'Adrenal Glands',
    chineseName: '肾上腺',
    positions: [
      [-0.06, 1.13, -0.06],
      [0.06, 1.13, -0.06],
    ],
    location: '左右两个肾脏的上方，各一个',
    hormones: ['肾上腺素'],
    functions: ['紧张或危险时让心跳加快、呼吸加深', '帮助身体应对压力'],
    color: '#F0C46A',
    focusDistance: 0.55,
  },
  {
    id: 'pancreas',
    name: 'Pancreatic Islets',
    chineseName: '胰岛',
    positions: [[0, 1.08, -0.02]],
    location: '上腹部，位于胰腺之中',
    hormones: ['胰岛素'],
    functions: ['降低血糖，调节糖类的代谢', '分泌不足会引起糖尿病'],
    color: '#7FD1A8',
    focusDistance: 0.55,
  },
  {
    id: 'ovary',
    name: 'Ovaries',
    chineseName: '卵巢',
    positions: [
      [-0.05, 0.93, -0.01],
      [0.05, 0.93, -0.01],
    ],
    location: '女性下腹部盆腔内，左右各一',
    hormones: ['雌性激素'],
    functions: ['促进女性生殖器官的发育', '激发并维持女性的第二性征'],
    color: '#E68FC0',
    focusDistance: 0.5,
  },
  {
    id: 'testis',
    name: 'Testes',
    chineseName: '睾丸',
    positions: [
      [-0.025, 0.84, 0.05],
      [0.025, 0.84, 0.05],
    ],
    location: '男性阴囊内，左右各一',
    hormones: ['雄性激素'],
    functions: ['促进男性生殖器官的发育', '激发并维持男性的第二性征'],
    color: '#6FC3D9',
    focusDistance: 0.45,
  },
]
```

- [ ] **Step 4: 创建 `src/domain/glandRegistry.ts`**

```ts
import { GLANDS } from '../data/glands'
import type { Gland, GlandId } from '../types/gland'

const BY_ID: ReadonlyMap<GlandId, Gland> = new Map(GLANDS.map((g) => [g.id, g]))

/** 全部腺体，按解剖高度从上到下。 */
export function allGlands(): readonly Gland[] {
  return GLANDS
}

/** 按 id 取腺体。id 不存在时抛错 —— 这是编程错误，不是用户输入错误。 */
export function glandById(id: GlandId): Gland {
  const gland = BY_ID.get(id)
  if (!gland) {
    throw new Error(`Unknown gland id: ${id}`)
  }
  return gland
}

/** 宽松查询：接受任意字符串或 null，查不到返回 null。用于 UI 的可空选中态。 */
export function findGland(id: string | null): Gland | null {
  if (id === null) {
    return null
  }
  return BY_ID.get(id as GlandId) ?? null
}
```

- [ ] **Step 5: 写数据护栏测试 `tests/data.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { GLANDS } from '../src/data/glands'
import { allGlands, findGland, glandById } from '../src/domain/glandRegistry'
import { BODY_BOUNDS, MAX_FUNCTIONS } from '../src/domain/constants'
import type { GlandId } from '../src/types/gland'

const EXPECTED_IDS: readonly GlandId[] = [
  'hypothalamus',
  'pituitary',
  'thyroid',
  'adrenal',
  'pancreas',
  'ovary',
  'testis',
]

describe('腺体数据完整性', () => {
  it('恰好 7 个腺体，id 集合与 GlandId 全集一致', () => {
    expect(GLANDS).toHaveLength(7)
    expect(GLANDS.map((g) => g.id).sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it('id 唯一', () => {
    const ids = GLANDS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的文本字段非空', (_id, gland) => {
    expect(gland.name.trim()).not.toBe('')
    expect(gland.chineseName.trim()).not.toBe('')
    expect(gland.location.trim()).not.toBe('')
    expect(gland.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的激素与作用条数合规', (_id, gland) => {
    expect(gland.hormones.length).toBeGreaterThanOrEqual(1)
    expect(gland.functions.length).toBeGreaterThanOrEqual(1)
    expect(gland.functions.length).toBeLessThanOrEqual(MAX_FUNCTIONS)
    for (const text of [...gland.hormones, ...gland.functions]) {
      expect(text.trim()).not.toBe('')
    }
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 至少有一个位置', (_id, gland) => {
    expect(gland.positions.length).toBeGreaterThanOrEqual(1)
    expect(gland.positions.length).toBeLessThanOrEqual(2)
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的坐标落在人体包围盒内', (_id, gland) => {
    for (const [x, y, z] of gland.positions) {
      expect(x).toBeGreaterThanOrEqual(BODY_BOUNDS.minX)
      expect(x).toBeLessThanOrEqual(BODY_BOUNDS.maxX)
      expect(y).toBeGreaterThanOrEqual(BODY_BOUNDS.minY)
      expect(y).toBeLessThanOrEqual(BODY_BOUNDS.maxY)
      expect(z).toBeGreaterThanOrEqual(BODY_BOUNDS.minZ)
      expect(z).toBeLessThanOrEqual(BODY_BOUNDS.maxZ)
    }
  })

  it('成对器官左右对称', () => {
    const paired = GLANDS.filter((g) => g.positions.length === 2)
    expect(paired.map((g) => g.id).sort()).toEqual(['adrenal', 'ovary', 'testis'])

    for (const gland of paired) {
      const [left, right] = gland.positions
      expect(left[0]).toBeCloseTo(-right[0], 10)
      expect(left[1]).toBeCloseTo(right[1], 10)
      expect(left[2]).toBeCloseTo(right[2], 10)
      expect(Math.abs(left[0])).toBeGreaterThan(0)
    }
  })

  it.each(GLANDS.map((g) => [g.id, g] as const))('%s 的 focusDistance 为正', (_id, gland) => {
    expect(gland.focusDistance).toBeGreaterThan(0)
  })

  it('解剖高度自上而下排列，与数组顺序一致', () => {
    const heights = GLANDS.map((g) => g.positions[0][1])
    for (let i = 1; i < heights.length; i += 1) {
      expect(heights[i]).toBeLessThan(heights[i - 1])
    }
  })

  it('肾上腺高于胰岛（T12 高于 L1–L2）', () => {
    expect(glandById('adrenal').positions[0][1]).toBeGreaterThan(
      glandById('pancreas').positions[0][1],
    )
  })

  it('下丘脑高于垂体（Design.md §5）', () => {
    expect(glandById('hypothalamus').positions[0][1]).toBeGreaterThan(
      glandById('pituitary').positions[0][1],
    )
  })
})

describe('glandRegistry', () => {
  it('allGlands 返回全部 7 条', () => {
    expect(allGlands()).toHaveLength(7)
  })

  it('glandById 命中', () => {
    expect(glandById('thyroid').chineseName).toBe('甲状腺')
  })

  it('glandById 对未知 id 抛错', () => {
    expect(() => glandById('spleen' as GlandId)).toThrow('Unknown gland id: spleen')
  })

  it('findGland 对 null 与未知 id 返回 null', () => {
    expect(findGland(null)).toBeNull()
    expect(findGland('spleen')).toBeNull()
  })

  it('findGland 命中', () => {
    expect(findGland('ovary')?.chineseName).toBe('卵巢')
  })
})
```

- [ ] **Step 6: 跑测试确认通过**

Run: `npm test -- tests/data.test.ts`
Expected: PASS，全部通过。

- [ ] **Step 7: 用变异检验证明护栏有效（本 task 的红灯环节）**

这是纯数据的护栏测试，"看着 import 失败变红" 什么也证明不了。真正的红灯验证是**故意破坏数据，确认对应的那条断言会抓到**。逐条做，每次改完跑 `npm test -- tests/data.test.ts`，看到**指定的**那条测试失败后立即还原：

| 变异操作 | 必须变红的测试 |
|---|---|
| 删掉 `GLANDS` 中 `pancreas` 这一条 | `恰好 7 个腺体，id 集合与 GlandId 全集一致` |
| 把 `thyroid.positions` 改成 `[[0, 2.5, 0.05]]` | `thyroid 的坐标落在人体包围盒内` |
| 把 `adrenal.positions[1][0]` 从 `0.06` 改成 `0.08` | `成对器官左右对称` |
| 给 `thyroid.functions` 再加一条（凑成 4 条） | `thyroid 的激素与作用条数合规` |
| 把 `adrenal.positions[0][1]` 从 `1.13` 改成 `1.05` | `解剖高度自上而下排列，与数组顺序一致` **和** `肾上腺高于胰岛（T12 高于 L1–L2）` |

任何一行**没有**变红，说明该断言写错了或写漏了，必须先修断言再继续。

- [ ] **Step 8: 确认数据已完全还原，重跑测试**

Run: `git diff src/data/glands.ts`
Expected: 无输出（若 `glands.ts` 尚未提交过，则用 `npm test -- tests/data.test.ts` 确认全绿即可）。

- [ ] **Step 9: 跑完整 verify**

Run: `npm run verify`
Expected: 全绿。

- [ ] **Step 10: Commit**

```bash
git add src/types src/data src/domain tests/data.test.ts
git commit -m "feat(data): 7 个腺体作为唯一真源 + 数据完整性护栏

positions 是数组而非单个 Vec3：单发器官 length=1，肾上腺/卵巢/
睾丸 length=2。一条知识条目渲染多个 marker，Design.md §19 的
\"不要重复知识条目\" 由类型结构保证，全程零特判分支。

坐标按 1.75m 身高的解剖比例推导。测试锁死了三条解剖不变量：
自上而下的高度序、肾上腺(T12)高于胰岛(L1-L2)、下丘脑高于垂体。
后续调坐标若破坏解剖关系会立刻红灯。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 相机聚焦纯数学

**Files:**
- Create: `src/domain/cameraFocus.ts`
- Test: `tests/cameraFocus.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `Gland`、`Vec3`、`CameraPose`、`MIN_FOCUS_DISTANCE`、`allGlands()`
- Produces（Task 5 的 `CameraRig` 会逐个用到）：
  - `centroid(positions: readonly Vec3[]): Vec3`
  - `easeInOutCubic(t: number): number`
  - `azimuthFrom(position: Vec3, target: Vec3): number`
  - `computeTargetPose(gland: Gland, azimuth: number): CameraPose`
  - `interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose`
  - `const OVERVIEW_POSE: CameraPose`

**为什么是纯函数：** `Design.md` §10 把相机聚焦标为 critical milestone。写在 `useFrame` 里它永远测不了。拆成纯函数后，"不要贴脸" 才能写成一条断言而不是靠肉眼看。

- [ ] **Step 1: 写失败的测试 `tests/cameraFocus.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  OVERVIEW_POSE,
  azimuthFrom,
  centroid,
  computeTargetPose,
  easeInOutCubic,
  interpolatePose,
} from '../src/domain/cameraFocus'
import { allGlands, glandById } from '../src/domain/glandRegistry'
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
    expect(centroid([[-2, 4, 6], [2, 4, 6]])).toEqual([0, 4, 6])
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- tests/cameraFocus.test.ts`
Expected: FAIL，`Failed to resolve import "../src/domain/cameraFocus"`。

- [ ] **Step 3: 实现 `src/domain/cameraFocus.ts`**

```ts
import type { CameraPose, Gland, Vec3 } from '../types/gland'
import { MIN_FOCUS_DISTANCE } from './constants'

/** 聚焦时相机相对腺体的仰角（弧度）。略俯视，比纯水平更易读出深度。 */
const FOCUS_ELEVATION = 0.18

/** 概览机位：能看到上半身全貌（Design.md §8）。Reset 的目标。 */
export const OVERVIEW_POSE: CameraPose = {
  position: [0, 1.35, 2.4],
  target: [0, 1.15, 0],
}

export function centroid(positions: readonly Vec3[]): Vec3 {
  if (positions.length === 0) {
    throw new Error('centroid() requires at least one position')
  }
  let x = 0
  let y = 0
  let z = 0
  for (const p of positions) {
    x += p[0]
    y += p[1]
    z += p[2]
  }
  const n = positions.length
  return [x / n, y / n, z / n]
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * 由机位与注视点反推水平方位角。+Z（正前方）为 0，顺时针为正。
 * CameraRig 用它读出用户当前已转到的角度，聚焦时予以保留（Design.md §12）。
 */
export function azimuthFrom(position: Vec3, target: Vec3): number {
  return Math.atan2(position[0] - target[0], position[2] - target[2])
}

/**
 * 给定腺体与当前方位角，算出目标机位。
 * 距离取 max(gland.focusDistance, MIN_FOCUS_DISTANCE)，保证不会贴脸到
 * 丢失周边解剖上下文（Design.md §10）。
 */
export function computeTargetPose(gland: Gland, azimuth: number): CameraPose {
  const target = centroid(gland.positions)
  const d = Math.max(gland.focusDistance, MIN_FOCUS_DISTANCE)
  const horizontal = d * Math.cos(FOCUS_ELEVATION)
  return {
    position: [
      target[0] + horizontal * Math.sin(azimuth),
      target[1] + d * Math.sin(FOCUS_ELEVATION),
      target[2] + horizontal * Math.cos(azimuth),
    ],
    target,
  }
}

/** 形式为 (1-t)*a + t*b，保证 t=0 精确返回 a、t=1 精确返回 b。 */
function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    (1 - t) * a[0] + t * b[0],
    (1 - t) * a[1] + t * b[1],
    (1 - t) * a[2] + t * b[2],
  ]
}

/** t ∈ [0,1]，easeInOutCubic 缓动；越界钳制。 */
export function interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const clamped = Math.min(1, Math.max(0, t))
  const e = easeInOutCubic(clamped)
  return {
    position: lerp3(from.position, to.position, e),
    target: lerp3(from.target, to.target, e),
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test -- tests/cameraFocus.test.ts`
Expected: PASS。

若 "t=1 精确返回终点" 失败，说明 `lerp3` 没写成 `(1-t)*a + t*b` 形式（`a + (b-a)*t` 在浮点下不保证精确落回 `b`）。

- [ ] **Step 5: 跑完整 verify**

Run: `npm run verify`
Expected: 全绿。

- [ ] **Step 6: Commit**

```bash
git add src/domain/cameraFocus.ts tests/cameraFocus.test.ts
git commit -m "feat(domain): 相机聚焦纯数学 + 聚焦不变量测试

Design.md §10 把相机聚焦标为 critical milestone，但写在 useFrame
里它永远测不了。拆成 computeTargetPose / interpolatePose 两个纯
函数后，\"不要贴脸\" 变成一条可执行断言：对全部 7 个腺体、5 个方位
角，相机到质心的距离恒 >= MIN_FOCUS_DISTANCE。

computeTargetPose 接收 azimuth 而非内部固定，这样聚焦不会重置用户
已经转到的角度（Design.md §12）。azimuthFrom 是它的逆运算，由往返
测试锁死。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 腺体 marker 与场景图

**Files:**
- Create: `src/scene/GlandMarker.tsx`, `src/scene/GlandLayer.tsx`
- Test: `tests/scene.test.tsx`

**Interfaces:**
- Consumes: Task 2 的 `Gland` / `GlandId` / `Vec3`、`allGlands()`
- Produces:
  - `GlandMarker` props：`{ gland: Gland; position: Vec3; isSelected: boolean; hasSelection: boolean; onSelect: (id: GlandId) => void }`
  - `GlandLayer` props：`{ selectedId: GlandId | null; onSelect: (id: GlandId) => void }`
  - `const MARKER_RADIUS: number`（仅在 `GlandMarker` 内部使用；导出是为了将来替换造型时保持尺度一致，本轮无其他消费者）
  - 每个 marker 的 `name` 为 `` `gland-marker-${gland.id}` ``，测试与后续调试靠它定位

**这是未来唯一的替换点。** `GlandMarker` 现在渲染统一的 `sphereGeometry`；下一轮换成按 `gland.id` 分派到各自的造型组件时，`GlandLayer` / `CameraRig` / `domain` / `data` / `ui` 全部无需改动。

- [ ] **Step 1: 写失败的测试 `tests/scene.test.tsx`**

`@react-three/test-renderer` 不需要 WebGL，可直接断言场景图。

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { GlandLayer } from '../src/scene/GlandLayer'
import { allGlands } from '../src/domain/glandRegistry'

const TOTAL_MARKERS = allGlands().reduce((n, g) => n + g.positions.length, 0)

function markerName(id: string): string {
  return `gland-marker-${id}`
}

describe('GlandLayer 场景图', () => {
  it('marker 总数等于所有 positions 之和（成对器官展开为 2 个）', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    const meshes = renderer.scene.findAll((node) => node.type === 'Mesh')
    expect(TOTAL_MARKERS).toBe(10)
    expect(meshes).toHaveLength(TOTAL_MARKERS)
  })

  it('覆盖全部 7 个腺体 id', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    for (const gland of allGlands()) {
      const found = renderer.scene.findAll(
        (node) => node.props.name === markerName(gland.id),
      )
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
    const adrenals = renderer.scene.findAll(
      (node) => node.props.name === markerName('adrenal'),
    )
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
      .map((node) => node.instance.material.opacity as number)

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

    expect(thyroid.instance.material.opacity).toBe(1)
    expect(other.instance.material.opacity).toBeLessThan(1)
    expect(thyroid.instance.material.emissiveIntensity).toBeGreaterThan(
      other.instance.material.emissiveIntensity,
    )
    expect(thyroid.instance.scale.x).toBeGreaterThan(other.instance.scale.x)
  })

  it('marker 位置与数据中的坐标一致', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GlandLayer selectedId={null} onSelect={() => {}} />,
    )
    for (const gland of allGlands()) {
      const markers = renderer.scene.findAll(
        (node) => node.props.name === markerName(gland.id),
      )
      const rendered = markers
        .map((m) => [m.instance.position.x, m.instance.position.y, m.instance.position.z])
        .sort((a, b) => a[0] - b[0])
      const expected = gland.positions
        .map((p) => [...p])
        .sort((a, b) => a[0] - b[0])
      expect(rendered).toEqual(expected)
    }
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- tests/scene.test.tsx`
Expected: FAIL，`Failed to resolve import "../src/scene/GlandLayer"`。

- [ ] **Step 3: 实现 `src/scene/GlandMarker.tsx`**

```tsx
import type { ThreeEvent } from '@react-three/fiber'
import type { Gland, GlandId, Vec3 } from '../types/gland'

/** marker 半径。Task 5 的 OrbitControls minDistance 应大于它。 */
export const MARKER_RADIUS = 0.028

const OPACITY_OVERVIEW = 0.75
const OPACITY_SELECTED = 1
const OPACITY_DIMMED = 0.55

interface GlandMarkerProps {
  gland: Gland
  position: Vec3
  isSelected: boolean
  /** 当前是否已有任何腺体被选中。决定用概览态还是强弱对比态。 */
  hasSelection: boolean
  onSelect: (id: GlandId) => void
}

/**
 * 统一的发光小球占位。
 *
 * ★ 未来唯一的替换点：下一轮把这里的 <sphereGeometry> 换成按 gland.id
 *   分派的真实造型（<ThyroidMesh/> 等），其余代码一行不改。
 */
export function GlandMarker({
  gland,
  position,
  isSelected,
  hasSelection,
  onSelect,
}: GlandMarkerProps) {
  const opacity = !hasSelection
    ? OPACITY_OVERVIEW
    : isSelected
      ? OPACITY_SELECTED
      : OPACITY_DIMMED

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    onSelect(gland.id)
  }

  return (
    <mesh
      name={`gland-marker-${gland.id}`}
      position={[position[0], position[1], position[2]]}
      scale={isSelected ? 1.35 : 1}
      onClick={handleClick}
    >
      <sphereGeometry args={[MARKER_RADIUS, 24, 24]} />
      <meshStandardMaterial
        color={gland.color}
        emissive={gland.color}
        emissiveIntensity={isSelected ? 1.1 : 0.35}
        roughness={0.4}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}
```

- [ ] **Step 4: 实现 `src/scene/GlandLayer.tsx`**

```tsx
import { allGlands } from '../domain/glandRegistry'
import type { GlandId } from '../types/gland'
import { GlandMarker } from './GlandMarker'

interface GlandLayerProps {
  selectedId: GlandId | null
  onSelect: (id: GlandId) => void
}

/**
 * 把数据展开成 marker。成对器官的 positions.length === 2，因此渲染出
 * 两个 marker，但它们共享同一个 gland.id —— 一条知识条目对应多个
 * marker，无需重复条目（Design.md §19）。
 */
export function GlandLayer({ selectedId, onSelect }: GlandLayerProps) {
  const hasSelection = selectedId !== null

  return (
    <group name="gland-layer">
      {allGlands().flatMap((gland) =>
        gland.positions.map((position, index) => (
          <GlandMarker
            key={`${gland.id}-${index}`}
            gland={gland}
            position={position}
            isSelected={selectedId === gland.id}
            hasSelection={hasSelection}
            onSelect={onSelect}
          />
        )),
      )}
    </group>
  )
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npm test -- tests/scene.test.tsx`
Expected: PASS。

**排障：**
- 若 `tsc` 报 `Property 'mesh' does not exist on type 'JSX.IntrinsicElements'`：在 `src/types/` 下新建 `three-jsx.d.ts`，内容为 `import type {} from '@react-three/fiber'`，把 R3F 的 JSX 声明拉进来。
- 若 `fireEvent` 报 `stopPropagation is not a function`：确认第三个参数按上面写法传了 `{ stopPropagation: () => {} }`。
- 若 `node.instance.material` 为 `undefined`：说明 `findAll` 抓到的是非 Mesh 节点，改用 `renderer.scene.findAll((n) => n.type === 'Mesh' && n.props.name === ...)`。

- [ ] **Step 6: 跑完整 verify**

Run: `npm run verify`
Expected: 全绿。

- [ ] **Step 7: Commit**

```bash
git add src/scene tests/scene.test.tsx
git commit -m "feat(scene): 统一腺体 marker + 场景图测试

GlandMarker 是本骨架唯一的\"假\"部分：7 个腺体共用一个发光小球。
下一轮换真实造型时只改这一个文件，GlandLayer/CameraRig/domain/
data/ui 全部不动。

用 @react-three/test-renderer 测试 —— 它不需要 WebGL，能直接断言
场景图。测试锁死：10 个 marker（成对器官展开）、点击成对器官任一
侧都得到同一个 id、概览态所有腺体不透明度必须一致（Design.md §8
要求初始不强调任何腺体）、marker 坐标与数据逐条一致。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 人体模型、相机装置与场景组装

**Files:**
- Create: `src/scene/BodyModel.tsx`, `src/scene/CameraRig.tsx`, `src/scene/AnatomyScene.tsx`

**Interfaces:**
- Consumes: Task 3 的 `OVERVIEW_POSE` / `computeTargetPose` / `interpolatePose` / `azimuthFrom`；Task 2 的 `glandById` / `FOCUS_DURATION_MS`；Task 4 的 `GlandLayer` / `MARKER_RADIUS`
- Produces：
  - `AnatomyScene` props：`{ selectedId: GlandId | null; onSelect: (id: GlandId | null) => void }` —— 注意 `onSelect` 接受 `null`，供点空白处取消选中
  - `BodyModel`、`CameraRig` 为内部组件，不被 `src/scene/` 之外引用

**验证方式说明：** 本 task 的产物是 WebGL 外壳，无法在 jsdom 中自动化测试（`<Canvas>` 需要真实 WebGL 上下文）。它的正确性由两部分保证：(a) 其中全部数学已被 Task 3 的单测覆盖，`CameraRig` 只是薄壳；(b) 本 task 以 `npm run verify` + **人工目视验收清单**收尾。这是本骨架中唯一不做自动化断言的一层，属于有意的取舍。

- [ ] **Step 1: 实现 `src/scene/BodyModel.tsx`**

坐标系与 `data/glands.ts` 完全一致：原点在双脚间地面，总高 1.75。

```tsx
import { DoubleSide } from 'three'

const BODY_COLOR = '#9FD4E8'
const BODY_OPACITY = 0.15

/**
 * 半透明人体 mannequin 占位（Design.md §4、§20）。
 * 用基础几何体拼接，不依赖任何外部 3D 资产。
 * depthWrite={false} 让体内的腺体 marker 能透出来。
 */
export function BodyModel() {
  return (
    <group name="body-model">
      {/* 头 */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.105, 24, 24]} />
        <BodyMaterial />
      </mesh>

      {/* 颈 */}
      <mesh position={[0, 1.475, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.13, 20]} />
        <BodyMaterial />
      </mesh>

      {/* 躯干 */}
      <mesh position={[0, 1.18, 0]}>
        <capsuleGeometry args={[0.155, 0.34, 6, 20]} />
        <BodyMaterial />
      </mesh>

      {/* 骨盆 */}
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.14, 0.1, 6, 20]} />
        <BodyMaterial />
      </mesh>

      {/* 手臂 */}
      <mesh position={[-0.225, 1.13, 0]}>
        <capsuleGeometry args={[0.042, 0.5, 6, 16]} />
        <BodyMaterial />
      </mesh>
      <mesh position={[0.225, 1.13, 0]}>
        <capsuleGeometry args={[0.042, 0.5, 6, 16]} />
        <BodyMaterial />
      </mesh>

      {/* 腿 */}
      <mesh position={[-0.075, 0.42, 0]}>
        <capsuleGeometry args={[0.065, 0.7, 6, 16]} />
        <BodyMaterial />
      </mesh>
      <mesh position={[0.075, 0.42, 0]}>
        <capsuleGeometry args={[0.065, 0.7, 6, 16]} />
        <BodyMaterial />
      </mesh>
    </group>
  )
}

function BodyMaterial() {
  return (
    <meshStandardMaterial
      color={BODY_COLOR}
      transparent
      opacity={BODY_OPACITY}
      depthWrite={false}
      roughness={0.6}
      side={DoubleSide}
    />
  )
}
```

- [ ] **Step 2: 实现 `src/scene/CameraRig.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import {
  OVERVIEW_POSE,
  azimuthFrom,
  computeTargetPose,
  interpolatePose,
} from '../domain/cameraFocus'
import { FOCUS_DURATION_MS } from '../domain/constants'
import { glandById } from '../domain/glandRegistry'
import type { CameraPose, GlandId } from '../types/gland'

interface CameraRigProps {
  selectedId: GlandId | null
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}

interface Transition {
  from: CameraPose
  to: CameraPose
  startedAt: number
}

/**
 * 相机聚焦的薄壳。全部数学在 domain/cameraFocus.ts 中且已被单测覆盖，
 * 这里只做三件事：读当前机位、推进 t、把结果写回 camera 与 controls。
 */
export function CameraRig({ selectedId, controlsRef }: CameraRigProps) {
  const camera = useThree((state) => state.camera)
  const transition = useRef<Transition | null>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) {
      return
    }

    const from: CameraPose = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
    }

    // 保留用户当前已转到的水平角度，聚焦不打断旋转（Design.md §12）。
    const azimuth = azimuthFrom(from.position, from.target)
    const to =
      selectedId === null ? OVERVIEW_POSE : computeTargetPose(glandById(selectedId), azimuth)

    transition.current = { from, to, startedAt: performance.now() }
    // camera 与 controlsRef 是稳定引用，只需在 selectedId 变化时重新起动画。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useFrame(() => {
    const active = transition.current
    const controls = controlsRef.current
    if (!active || !controls) {
      return
    }

    const t = (performance.now() - active.startedAt) / FOCUS_DURATION_MS
    const pose = interpolatePose(active.from, active.to, t)

    camera.position.set(pose.position[0], pose.position[1], pose.position[2])
    controls.target.set(pose.target[0], pose.target[1], pose.target[2])
    controls.update()

    if (t >= 1) {
      transition.current = null
    }
  })

  return null
}
```

- [ ] **Step 3: 实现 `src/scene/AnatomyScene.tsx`**

```tsx
import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { OVERVIEW_POSE } from '../domain/cameraFocus'
import type { GlandId } from '../types/gland'
import { BodyModel } from './BodyModel'
import { CameraRig } from './CameraRig'
import { GlandLayer } from './GlandLayer'

interface AnatomySceneProps {
  selectedId: GlandId | null
  /** 传 null 表示取消选中（点击空白处）。 */
  onSelect: (id: GlandId | null) => void
}

export function AnatomyScene({ selectedId, onSelect }: AnatomySceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  return (
    <Canvas
      camera={{
        position: [OVERVIEW_POSE.position[0], OVERVIEW_POSE.position[1], OVERVIEW_POSE.position[2]],
        fov: 40,
      }}
      // Design.md §25：pixelRatio = min(devicePixelRatio, 2)
      dpr={[1, 2]}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <directionalLight position={[-2, 1, -3]} intensity={0.4} />

      <BodyModel />
      <GlandLayer selectedId={selectedId} onSelect={onSelect} />

      <OrbitControls
        ref={controlsRef}
        target={[OVERVIEW_POSE.target[0], OVERVIEW_POSE.target[1], OVERVIEW_POSE.target[2]]}
        // Design.md §11
        enablePan={false}
        enableZoom
        minPolarAngle={1.0}
        maxPolarAngle={2.1}
        minDistance={0.3}
        maxDistance={4}
        enableDamping
        dampingFactor={0.08}
      />

      <CameraRig selectedId={selectedId} controlsRef={controlsRef} />
    </Canvas>
  )
}
```

- [ ] **Step 4: 把场景接进 `src/App.tsx`（临时接线，Task 6 会完成 UI）**

```tsx
import { useState } from 'react'
import { AnatomyScene } from './scene/AnatomyScene'
import type { GlandId } from './types/gland'

export function App() {
  const [selectedId, setSelectedId] = useState<GlandId | null>(null)

  return (
    <div className="app">
      <header className="app__header">
        <h1>ENDOCRINE ATLAS</h1>
        <span className="app__subtitle">内分泌系统</span>
      </header>
      <main className="app__body">
        <AnatomyScene selectedId={selectedId} onSelect={setSelectedId} />
      </main>
    </div>
  )
}
```

- [ ] **Step 5: 跑完整 verify**

Run: `npm run verify`
Expected: 全绿（Task 1–4 的全部测试仍通过，typecheck 与 build 成功）。

**排障：**
- 若 `three-stdlib` 无法解析：它是 drei 的依赖，通常已在 `node_modules` 中。若 `tsc` 仍报错，执行 `npm install -D three-stdlib`。
- 若 `capsuleGeometry` 报参数错误：three 的 `CapsuleGeometry` 签名为 `(radius, length, capSegments, radialSegments)`，`length` 指**不含两端半球**的圆柱段长度。
- 若 `controlsRef` 类型不匹配（`RefObject<OrbitControlsImpl>` 不可赋给 `RefObject<OrbitControlsImpl | null>`）：这是 React 18 与 19 的 `useRef` 类型差异 —— React 19 的 `useRef<T>(null)` 返回 `RefObject<T | null>`，React 18 返回 `RefObject<T>`。若 Task 1 Step 4 走了 React 18 降级路径，把 `CameraRig` 的 props 类型改为 `React.RefObject<OrbitControlsImpl>` 即可。

- [ ] **Step 6: 人工目视验收**

Run: `npm run dev`，在浏览器中逐条确认：

- [ ] 深色背景上出现半透明人体轮廓（头/颈/躯干/骨盆/双臂/双腿）
- [ ] 体内可见 10 个发光小球，且初始亮度一致（无任何一个被强调）
- [ ] 小球位置符合直觉：2 个在头部、1 个在颈前、2 个在上腹两侧、1 个在上腹中线、2 个在盆腔、2 个在盆腔下方
- [ ] 左右拖动能水平旋转人体，模型保持居中
- [ ] 上下拖动的角度受限，**无法**转到头顶正上方或脚底正下方
- [ ] 滚轮能缩放
- [ ] 拖动**不会**平移模型
- [ ] 点击任一小球：相机在约 0.7 秒内平滑移向它，**不是瞬移**
- [ ] 聚焦后仍能看到周边解剖结构（例如点甲状腺后，头和躯干仍在视野内 —— 这是 `Design.md` §10 的核心要求）
- [ ] 聚焦后继续左右拖动，旋转仍然正常，选中的小球始终可辨认
- [ ] 点击另一个小球，相机平滑转移
- [ ] 点击空白处，相机平滑回到概览
- [ ] 浏览器控制台无报错

任何一条不满足，先修复再进入 Step 7。Ctrl+C 停止 dev server。

- [ ] **Step 7: Commit**

```bash
git add src/scene src/App.tsx
git commit -m "feat(scene): 半透明人体 + 相机装置 + 场景组装

BodyModel 用基础几何体拼 mannequin，opacity .15 且 depthWrite=false，
让体内的腺体透出来（Design.md §13 的视觉层级）。

CameraRig 刻意做成薄壳：读机位 → 推进 t → 写回。全部数学在
domain/cameraFocus.ts 且已被 Task 3 单测覆盖。它每次起动画前用
azimuthFrom 读出用户当前的水平角度并传给 computeTargetPose，
因此聚焦不会重置用户已经转到的视角。

本层是骨架中唯一不做自动化断言的部分（<Canvas> 需要真实 WebGL），
由 commit 前的人工目视清单验收。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: UI 组件、完整接线与端到端冒烟

**Files:**
- Create: `src/ui/Header.tsx`, `src/ui/ResetButton.tsx`, `src/ui/ControlsHint.tsx`, `src/ui/KnowledgeCard.tsx`, `README.md`
- Modify: `src/App.tsx`（完成接线）, `src/index.css`（补全布局样式）
- Test: `tests/app.smoke.test.tsx`

**Interfaces:**
- Consumes: Task 5 的 `AnatomyScene`；Task 2 的 `findGland` / `allGlands` / `GlandId`
- Produces: 完整可用的应用

- [ ] **Step 1: 写失败的测试 `tests/app.smoke.test.tsx`**

关键手法：用 `vi.mock` 把 `AnatomyScene` 替换成渲染 7 个按钮的桩件，从而绕开 WebGL，在纯 DOM 层验证接线。

**内容一致性断言**是这个测试最重要的部分 —— 它逐条比对卡片上的文字与 `data/glands.ts`，因此任何把教育内容硬编码进组件的做法都会立刻红灯（`Design.md` §15）。

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { allGlands } from '../src/domain/glandRegistry'
import type { GlandId } from '../src/types/gland'

vi.mock('../src/scene/AnatomyScene', () => ({
  AnatomyScene: ({ onSelect }: { onSelect: (id: GlandId | null) => void }) => (
    <div data-testid="scene-stub">
      {allGlands().map((gland) => (
        <button key={gland.id} type="button" onClick={() => onSelect(gland.id)}>
          {`select-${gland.id}`}
        </button>
      ))}
      <button type="button" onClick={() => onSelect(null)}>
        select-none
      </button>
    </div>
  ),
}))

// App 必须在 vi.mock 之后 import，才能拿到被替换的 AnatomyScene。
const { App } = await import('../src/App')

describe('App 端到端冒烟', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始态：有标题与操作提示，无知识卡', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ENDOCRINE ATLAS')
    expect(screen.getByText(/点击腺体查看信息/)).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it.each(allGlands().map((g) => [g.id, g] as const))(
    '选中 %s 后，卡片内容逐条与 data/glands.ts 一致',
    async (id, gland) => {
      const user = userEvent.setup()
      render(<App />)

      await user.click(screen.getByRole('button', { name: `select-${id}` }))

      const card = screen.getByRole('complementary')
      expect(card).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(gland.chineseName)
      expect(card).toHaveTextContent(gland.name)
      expect(card).toHaveTextContent(gland.location)
      for (const hormone of gland.hormones) {
        expect(card).toHaveTextContent(hormone)
      }
      for (const fn of gland.functions) {
        expect(card).toHaveTextContent(fn)
      }
    },
  )

  it('切换选中时卡片内容随之更换', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-thyroid' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('甲状腺')

    await user.click(screen.getByRole('button', { name: 'select-ovary' }))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('卵巢')
    expect(screen.queryByText('甲状腺')).not.toBeInTheDocument()
  })

  it('点击重置按钮后卡片消失，回到初始态', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-pancreas' }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '重新查看全部' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByText(/点击腺体查看信息/)).toBeInTheDocument()
  })

  it('卡片上的关闭按钮也能取消选中', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-adrenal' }))
    await user.click(screen.getByRole('button', { name: '关闭' }))

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('场景传回 null 时取消选中', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'select-testis' }))
    expect(screen.getByRole('complementary')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'select-none' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test -- tests/app.smoke.test.tsx`
Expected: FAIL。当前 `App` 里没有 `ControlsHint`、没有 `KnowledgeCard`、没有重置按钮。

- [ ] **Step 3: 实现 `src/ui/Header.tsx`**

```tsx
import type { ReactNode } from 'react'

export function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header className="app__header">
      <h1>ENDOCRINE ATLAS</h1>
      <span className="app__subtitle">内分泌系统</span>
      <div className="app__header-actions">{actions}</div>
    </header>
  )
}
```

- [ ] **Step 4: 实现 `src/ui/ResetButton.tsx`**

```tsx
/** Design.md §23。文案固定为 "重新查看全部"，app.smoke 测试按此名称定位。 */
export function ResetButton({ onReset }: { onReset: () => void }) {
  return (
    <button type="button" className="reset-button" onClick={onReset}>
      重新查看全部
    </button>
  )
}
```

- [ ] **Step 5: 实现 `src/ui/ControlsHint.tsx`**

```tsx
/** Design.md §8：初始就让用户知道怎么操作。 */
export function ControlsHint() {
  return (
    <p className="controls-hint">
      <span>点击腺体查看信息</span>
      <span className="controls-hint__sep">·</span>
      <span>拖动模型可以旋转</span>
      <span className="controls-hint__sep">·</span>
      <span>滚轮缩放</span>
    </p>
  )
}
```

- [ ] **Step 6: 实现 `src/ui/KnowledgeCard.tsx`**

内容全部来自 `findGland`。**不得**在此文件中出现任何腺体的具体教育文案。

```tsx
import { findGland } from '../domain/glandRegistry'
import type { GlandId } from '../types/gland'

interface KnowledgeCardProps {
  selectedId: GlandId | null
  onClose: () => void
}

/** Design.md §17。所有文案来自 domain/glandRegistry，此处不硬编码任何内容。 */
export function KnowledgeCard({ selectedId, onClose }: KnowledgeCardProps) {
  const gland = findGland(selectedId)
  if (!gland) {
    return null
  }

  return (
    <aside className="knowledge-card" aria-label="腺体知识卡">
      <div className="knowledge-card__title" style={{ borderColor: gland.color }}>
        <h2>{gland.chineseName}</h2>
        <p className="knowledge-card__en">{gland.name}</p>
      </div>

      <section className="knowledge-card__section">
        <h3>📍 在哪里？</h3>
        <p>{gland.location}</p>
      </section>

      <section className="knowledge-card__section">
        <h3>🧪 分泌什么？</h3>
        <ul>
          {gland.hormones.map((hormone) => (
            <li key={hormone}>{hormone}</li>
          ))}
        </ul>
      </section>

      <section className="knowledge-card__section">
        <h3>💡 有什么作用？</h3>
        <ul>
          {gland.functions.map((fn) => (
            <li key={fn}>{fn}</li>
          ))}
        </ul>
      </section>

      <button type="button" className="knowledge-card__close" onClick={onClose}>
        关闭
      </button>
    </aside>
  )
}
```

- [ ] **Step 7: 完成 `src/App.tsx` 接线**

`selectedId` 同时喂给 `AnatomyScene` 与 `KnowledgeCard`，两者互不知晓（`Design.md` §28）。

```tsx
import { useState } from 'react'
import { AnatomyScene } from './scene/AnatomyScene'
import { ControlsHint } from './ui/ControlsHint'
import { Header } from './ui/Header'
import { KnowledgeCard } from './ui/KnowledgeCard'
import { ResetButton } from './ui/ResetButton'
import type { GlandId } from './types/gland'

export function App() {
  const [selectedId, setSelectedId] = useState<GlandId | null>(null)

  return (
    <div className="app">
      <Header actions={<ResetButton onReset={() => setSelectedId(null)} />} />

      <main className="app__body">
        <div className="app__viewer">
          <AnatomyScene selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="app__panel">
          <KnowledgeCard selectedId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      </main>

      <footer className="app__footer">
        <ControlsHint />
      </footer>
    </div>
  )
}
```

- [ ] **Step 8: 补全 `src/index.css`**

在 Task 1 已有内容的基础上追加。布局按 `Design.md` §7（viewer ≈68%，card ≈32%）与 §24（<768px 纵向堆叠）。

```css
.app__header-actions {
  margin-left: auto;
}

.reset-button {
  background: transparent;
  border: 1px solid #33414d;
  color: var(--muted);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
}

.reset-button:hover {
  border-color: #4d6274;
  color: var(--text);
}

.app__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 68fr 32fr;
}

.app__viewer {
  min-width: 0;
  min-height: 0;
}

.app__panel {
  border-left: 1px solid #263039;
  background: var(--panel);
  overflow-y: auto;
  padding: 1.2rem;
}

.knowledge-card__title {
  border-left: 3px solid;
  padding-left: 0.75rem;
  margin-bottom: 1.2rem;
}

.knowledge-card__title h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.knowledge-card__en {
  margin: 0.2rem 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.knowledge-card__section {
  padding: 0.9rem 0;
  border-top: 1px solid #263039;
}

.knowledge-card__section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 500;
}

.knowledge-card__section p,
.knowledge-card__section li {
  margin: 0.3rem 0;
  font-size: 0.95rem;
  line-height: 1.65;
}

.knowledge-card__section ul {
  margin: 0;
  padding-left: 1.1rem;
}

.knowledge-card__close {
  margin-top: 1rem;
  width: 100%;
  background: transparent;
  border: 1px solid #33414d;
  color: var(--muted);
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
}

.knowledge-card__close:hover {
  border-color: #4d6274;
  color: var(--text);
}

.app__footer {
  border-top: 1px solid #263039;
  padding: 0.6rem 1.4rem;
}

.controls-hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.controls-hint__sep {
  opacity: 0.4;
}

@media (max-width: 768px) {
  .app__body {
    grid-template-columns: 1fr;
    grid-template-rows: 55fr 45fr;
  }

  .app__panel {
    border-left: none;
    border-top: 1px solid #263039;
  }
}
```

- [ ] **Step 9: 跑测试确认通过**

Run: `npm test -- tests/app.smoke.test.tsx`
Expected: PASS。

**排障：**
- 若 `vi.mock` 未生效（测试里仍尝试渲染真的 `<Canvas>`）：确认 mock 路径 `'../src/scene/AnatomyScene'` 与 `App.tsx` 里的 import 指向同一模块，且 `App` 是用顶层 `await import()` 引入的。
- 若 `getByRole('complementary')` 找不到：`<aside>` 只有在**不是**页面主要地标嵌套中时才映射到 `complementary` role。确认 `KnowledgeCard` 的 `<aside>` 不在 `<main>` 内部 —— 上面的 `App.tsx` 把它放在 `.app__panel` 里而该 div 在 `<main>` 内，此时 role 仍为 `complementary`（因为有 `aria-label`）。若仍失败，改用 `screen.getByLabelText('腺体知识卡')`。

- [ ] **Step 10: 跑完整 verify**

Run: `npm run verify`
Expected: 全绿，全部 5 个测试文件通过。

- [ ] **Step 11: 人工目视验收**

Run: `npm run dev`，确认：

- [ ] 左侧 3D 视图约占 2/3，右侧面板约占 1/3
- [ ] 初始右侧面板为空，底部显示操作提示
- [ ] 点击腺体：相机平滑聚焦 **且** 右侧出现知识卡，内容正确
- [ ] 卡片左侧色条颜色与该腺体 marker 颜色一致
- [ ] 点击「关闭」或右上角「重新查看全部」：卡片消失，相机平滑回到概览
- [ ] 把浏览器窗口拉窄到 768px 以下：变成上下堆叠，仍然可用
- [ ] 控制台无报错

- [ ] **Step 12: 写 `README.md`**

```markdown
# Endocrine Atlas · 内分泌系统交互图谱

面向初中生的内分泌腺解剖交互可视化。选中腺体 → 相机聚焦 → 阅读知识卡。

## 快速开始

需要 Node.js ≥ 20。

    npm install
    npm run dev

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run typecheck` | TypeScript 检查 |
| `npm test` | 跑一次测试 |
| `npm run test:watch` | 测试 watch 模式 |
| `npm run verify` | **typecheck + test + build**，交付前的单一判据 |

## 架构

三层严格单向依赖：

    data/      纯数据，零 import
      ↑
    domain/    纯函数，零 React 零 three
      ↑
    scene/ ui/ React 薄壳

这个方向是刻意的。相机聚焦的数学被挤出 `useFrame` 放进
`domain/cameraFocus.ts`，因而无需 WebGL 就能完整单测 —— 这是
"聚焦时不要贴脸、要保留周边解剖上下文" 这类要求能被自动化验证的前提。

## 坐标系

`+Y` 上 · `+X` 观察者右侧（人体左侧）· `+Z` 腹侧。
原点在双脚之间的地面，模型总高 `1.75` 单位（≈米）。

全部腺体坐标在 `src/data/glands.ts`，由 `tests/data.test.ts` 校验
落在人体包围盒内、成对器官左右对称、解剖高度序正确。

## 测试分层

jsdom 没有 WebGL，所以按 "需要多少 3D" 分层：

| 文件 | 工具 | 覆盖 |
|---|---|---|
| `tests/data.test.ts` | Vitest | 数据完整性与解剖不变量 |
| `tests/cameraFocus.test.ts` | Vitest | 聚焦数学，含防贴脸回归 |
| `tests/scene.test.tsx` | `@react-three/test-renderer`（无需 WebGL） | 场景图、点击、高亮 |
| `tests/app.smoke.test.tsx` | RTL + jsdom（mock 掉 Canvas） | DOM 层接线与内容一致性 |

`src/scene/AnatomyScene.tsx`（`<Canvas>` 外壳）是唯一不做自动化断言的
一层 —— 它需要真实 WebGL 上下文。其中的数学已被 `cameraFocus.test.ts`
覆盖，`CameraRig` 只是薄壳。

## 如何替换腺体造型

当前 7 个腺体共用一个发光小球占位。要换成真实造型：

**只改 `src/scene/GlandMarker.tsx`** —— 把其中的 `<sphereGeometry>`
换成按 `gland.id` 分派的造型组件。

`GlandLayer` / `CameraRig` / `domain/` / `data/` / `ui/` 全部无需改动，
因为它们只依赖 `Gland` 类型与 `positions`，不依赖几何体。

改完后 `tests/scene.test.tsx` 中断言 marker 数量与坐标的用例应继续通过；
若不通过，说明新造型破坏了 "一个 position 对应一个可点击 Mesh" 的契约。

## 文档

- `Design.md` — 上游需求规格（35 节）
- `docs/superpowers/specs/` — 设计方案
- `docs/superpowers/plans/` — 实现计划
```

- [ ] **Step 13: 最后跑一次完整 verify**

Run: `npm run verify`
Expected: 全绿。

- [ ] **Step 14: Commit**

```bash
git add src/ui src/App.tsx src/index.css tests/app.smoke.test.tsx README.md
git commit -m "feat(app): 打通 选中 -> 高亮 -> 聚焦 -> 卡片 + 端到端冒烟

selectedId 同时喂给 AnatomyScene 与 KnowledgeCard，两者互不知晓
（Design.md §28）。KnowledgeCard 的文案全部来自 glandRegistry，
文件里没有任何腺体的具体内容。

app.smoke.test.tsx 用 vi.mock 换掉 AnatomyScene 绕开 WebGL，在纯
DOM 层逐条比对卡片文字与 data/glands.ts —— 任何把教育内容硬编码
进组件的做法都会立刻红灯，这是 Design.md §15 的自动化执法。

README 记录了架构为何是这个方向，以及下一轮替换腺体造型时唯一需要
改的文件。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## 完成判据

全部 6 个 task 完成后，以下必须全部成立：

- [ ] `npm run verify` 全绿
- [ ] 5 个测试文件全部通过：`toolchain` / `data` / `cameraFocus` / `scene` / `app.smoke`
- [ ] `npm run dev` 下 Task 5 Step 6 与 Task 6 Step 11 的目视清单逐条满足
- [ ] `git log` 呈现 7 个 commit（含前置的 spec 与需求归档 2 个）
- [ ] 无任何文件超过约 150 行
- [ ] `src/ui/` 与 `src/scene/` 下没有任何文件直接 `import` `data/glands.ts`
- [ ] `src/domain/` 下没有任何文件 `import` `react` 或 `three`

## 本轮之后的下一步

按 `README.md` 的「如何替换腺体造型」一节，为 7 个腺体建各自的几何造型
（`Design.md` §14）。只改 `src/scene/GlandMarker.tsx`。
