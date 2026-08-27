# Endocrine Atlas — 骨架设计（Skeleton Design）

日期：2026-08-26
状态：已确认，待实现
上游需求文档：`Design.md`（35 节完整 spec）
参考项目：`thebuggeddev/anatomy`（仅借鉴交互范式与 `tests/` 布局，不采用其 Next.js + Cloudflare 栈）

---

## 1. 本轮目标

交付一个**可运行、可测试的完整骨架**：`选中腺体 → 高亮 → 相机聚焦 → 知识卡` 这条主链路端到端真实可用且被测试覆盖。

腺体的真实 3D 造型**本轮不做**，全部用统一的发光小球 marker 占位。占位点被隔离在单一组件 `GlandMarker.tsx` 内，后续替换造型时其余代码零改动。

### 本轮明确不做

- 7 个腺体各自的解剖造型（甲状腺双叶、胰腺弯曲体等）
- 视觉打磨、动画曲线调优、字体排版精修
- 响应式细节优化（只保证 <768px 布局不崩）
- Playwright / 浏览器 E2E
- CI 配置
- `Design.md` §34 列出的全部 Non-Goals

---

## 2. 架构：三层单向依赖

核心原则：**把最难的逻辑挤出 React 和 WebGL**，因为只有纯函数才能被廉价、可靠地测试。

```
data/      纯数据，零依赖
   ↑
domain/    纯函数，零 React、零 three
   ↑
scene/ + ui/    React 薄壳
```

依赖方向严格单向。`domain/` 不得 import `react` 或 `three`；`data/` 不得 import 任何东西。

### 目录结构

```
Endocrine-Atlas/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts              # 同时承载 vitest 配置
├─ .gitignore
├─ README.md
├─ Design.md                   # 上游需求（已存在）
├─ docs/superpowers/specs/     # 本文档
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                  # 布局 + 唯一的 useState
│  ├─ index.css
│  ├─ types/
│  │  └─ gland.ts              # Gland / GlandId / Vec3 / CameraPose
│  ├─ data/
│  │  └─ glands.ts             # 7 条完整教育内容（唯一真源 SSOT）
│  ├─ domain/
│  │  ├─ glandRegistry.ts      # byId / all / exists —— 唯一查询入口
│  │  ├─ cameraFocus.ts        # ★ 纯数学：目标机位 + 缓动插值
│  │  └─ constants.ts          # 人体包围盒、聚焦距离阈值、时长
│  ├─ scene/
│  │  ├─ AnatomyScene.tsx      # <Canvas> + lights + OrbitControls
│  │  ├─ BodyModel.tsx         # 半透明 mannequin 占位
│  │  ├─ GlandMarker.tsx       # ★ 统一发光小球 —— 未来唯一替换点
│  │  ├─ GlandLayer.tsx        # data → markers，展开成对器官
│  │  └─ CameraRig.tsx         # useFrame 薄壳，只调 domain 纯函数
│  ├─ ui/
│  │  ├─ Header.tsx
│  │  ├─ KnowledgeCard.tsx
│  │  ├─ ControlsHint.tsx
│  │  └─ ResetButton.tsx
│  └─ test/
│     └─ setup.ts              # jsdom 环境补丁
└─ tests/                      # 顶层 tests/，借鉴 anatomy 仓库布局
   ├─ data.test.ts
   ├─ cameraFocus.test.ts
   ├─ scene.test.tsx
   └─ app.smoke.test.tsx
```

**约束**：单文件不超过约 150 行。超出即说明职责过多，应拆分。

---

## 3. 技术栈

按 `Design.md` §3。**不引入 Next.js**（参考项目用了，但上游 spec 明确禁止，且本项目无 SSR 需求）。

运行时依赖：`react`、`react-dom`、`three`、`@react-three/fiber`、`@react-three/drei`

开发依赖：`vite`、`@vitejs/plugin-react`、`typescript`、`vitest`、`jsdom`、`@testing-library/react`、`@testing-library/jest-dom`、`@react-three/test-renderer`、`@types/react`、`@types/react-dom`、`@types/three`

**不引入**：状态管理库（`Design.md` §27）、动画库（§3，用 `useFrame` 手写插值）、CSS 框架（手写 `index.css`，规模不值得引框架）。

Node 版本要求：≥ 20（Vite 7 / Vitest 3 的下限）。

---

## 4. 坐标系与解剖定位

### 坐标系定义（全局唯一，`Design.md` §29）

| 轴 | 含义 |
|---|---|
| `+Y` | 上（头顶方向） |
| `+X` | 观察者右侧 = **人体的左侧**（标准解剖学正面视角） |
| `+Z` | 前（腹侧 / anterior） |

**原点在双脚之间的地面**。模型总高 **1.75 单位**（≈ 米，人体尺度）。

人体包围盒（用于数据校验断言）：
`x ∈ [-0.30, 0.30]`，`y ∈ [0, 1.75]`，`z ∈ [-0.20, 0.20]`

### 腺体初始坐标

按人体比例推导（1.75m 身高），本轮直接采用，后续可视觉微调：

| 腺体 | positions | 解剖依据 |
|---|---|---|
| 下丘脑 hypothalamus | `[[0, 1.655, -0.01]]` | 脑底中央，垂体正上方 |
| 垂体 pituitary | `[[0, 1.630, -0.01]]` | 颅底蝶鞍，下丘脑正下方 |
| 甲状腺 thyroid | `[[0, 1.470, 0.05]]` | C5–T1，气管前方 |
| 肾上腺 adrenal | `[[-0.06, 1.130, -0.06], [0.06, 1.130, -0.06]]` | T12，双肾上方，腹膜后 |
| 胰腺 pancreas | `[[0, 1.080, -0.02]]` | L1–L2，上腹部，胃后下方 |
| 卵巢 ovary | `[[-0.05, 0.930, -0.01], [0.05, 0.930, -0.01]]` | 盆腔内，左右各一 |
| 睾丸 testis | `[[-0.025, 0.840, 0.05], [0.025, 0.840, 0.05]]` | 耻骨联合下方，体外偏前 |

**一致性检查**：肾上腺 (1.130) 高于胰腺 (1.080) —— 符合 T12 高于 L1–L2；下丘脑 (1.655) 高于垂体 (1.630) —— 符合 `Design.md` §5。

---

## 5. 数据模型

### `types/gland.ts`

```ts
export type Vec3 = readonly [number, number, number]

export type GlandId =
  | 'hypothalamus' | 'pituitary' | 'thyroid'
  | 'adrenal' | 'pancreas' | 'ovary' | 'testis'

export interface Gland {
  readonly id: GlandId
  readonly name: string            // 英文名，卡片次级标签
  readonly chineseName: string     // 中文名，卡片主标题
  /** 一条数据 → 一个或多个 marker。成对器官 length === 2。 */
  readonly positions: readonly Vec3[]
  readonly location: string        // 一句话位置描述
  readonly hormones: readonly string[]
  readonly functions: readonly string[]   // 1–3 条
  readonly color: string           // marker 颜色，hex
  /** 相机聚焦时与腺体质心的距离，保留周边解剖上下文。 */
  readonly focusDistance: number
}

export interface CameraPose {
  readonly position: Vec3
  readonly target: Vec3
}
```

### 成对器官的处理（`Design.md` §19）

关键决策：`positions` 是**数组**而非单个 `Vec3`。

- 单发器官 `length === 1`，成对器官 `length === 2`
- `GlandLayer` 遍历 `positions` 渲染多个 marker，但它们共享同一个 `gland.id`
- `selectedGlandId` 始终是单值 → **一条知识条目对应多个 marker，天然不重复**
- 相机聚焦时对 `positions` 取**质心**

这样全流程零特判分支，§19 的要求自动满足。

### 教育内容（`Design.md` §16，初中生水平）

| id | 中文 / 英文 | 位置 | 激素 | 作用 |
|---|---|---|---|---|
| `hypothalamus` | 下丘脑 / Hypothalamus | 大脑底部，垂体的正上方 | 释放激素 | 指挥垂体工作，是内分泌系统的"总开关"；调节体温、饥饿和睡眠 |
| `pituitary` | 垂体 / Pituitary | 大脑底部，约一颗豌豆大小 | 生长激素 | 促进身体长高长壮；指挥其他内分泌腺工作 |
| `thyroid` | 甲状腺 / Thyroid | 颈部前方，气管两侧 | 甲状腺激素 | 调节新陈代谢；参与生长发育；影响神经系统兴奋性 |
| `adrenal` | 肾上腺 / Adrenal Glands | 左右两个肾脏的上方，各一个 | 肾上腺素 | 紧张或危险时让心跳加快、呼吸加深；帮助身体应对压力 |
| `pancreas` | 胰腺 / Pancreas | 上腹部，胃的后下方 | 胰岛素 | 降低血糖，调节糖类代谢；分泌不足会引起糖尿病 |
| `ovary` | 卵巢 / Ovaries | 女性下腹部盆腔内，左右各一 | 雌性激素 | 促进女性生殖器官发育；激发并维持女性第二性征 |
| `testis` | 睾丸 / Testes | 男性阴囊内，左右各一 | 雄性激素 | 促进男性生殖器官发育；激发并维持男性第二性征 |

命名注记：参考图使用「胰岛」（强调其内分泌部分），`Design.md` §18 写作「胰腺」。**按用户决定采用「胰腺」**，`location` 相应写作"上腹部，胃的后下方"（若用「胰岛」则应写"位于胰腺之中"）。`hormones` 仍为「胰岛素」—— 它由胰腺中的胰岛分泌，两种命名下都成立。

配色（`Design.md` §21，克制、非霓虹）：
`hypothalamus #7C9EF0`、`pituitary #9B8CF0`、`thyroid #F0968C`、`adrenal #F0C46A`、`pancreas #7FD1A8`、`ovary #E68FC0`、`testis #6FC3D9`

---

## 6. 相机聚焦（本设计的核心）

`Design.md` §10 将相机聚焦标为 critical milestone。若把它写在 `useFrame` 里，它将永远无法被测试。因此拆为纯函数。

### `domain/cameraFocus.ts`

```ts
/** 给定腺体与当前方位角，算出目标机位。保留用户的水平旋转（Design.md §12）。 */
export function computeTargetPose(gland: Gland, azimuth: number): CameraPose

/** t ∈ [0,1]，easeInOutCubic 缓动。t 越界时钳制。 */
export function interpolatePose(from: CameraPose, to: CameraPose, t: number): CameraPose

/** 质心，成对器官取两点中点。 */
export function centroid(positions: readonly Vec3[]): Vec3

/** 概览机位，Reset 时的目标。 */
export const OVERVIEW_POSE: CameraPose
```

`computeTargetPose` 的行为：

1. `center = centroid(gland.positions)`
2. `distance = max(gland.focusDistance, MIN_FOCUS_DISTANCE)`
3. 沿传入的 `azimuth` 与固定的小仰角，在 `center` 周围球面上取 `position`
4. `target = center`

**传入 `azimuth` 而非内部固定**，是为了满足 `Design.md` §12：聚焦后用户拖动旋转，不能打断 OrbitControls，也不能在聚焦瞬间把用户已转到的角度重置掉。

### `domain/constants.ts`

```ts
export const MIN_FOCUS_DISTANCE = 0.35   // 防"贴脸"，保留周边解剖上下文
export const FOCUS_DURATION_MS = 700     // Design.md §10 要求 500–900ms
export const BODY_BOUNDS = { … }         // 见 §4
```

### `scene/CameraRig.tsx`（薄壳）

职责仅三件事：
1. `selectedGlandId` 变化时记录 `fromPose` 与开始时间
2. `useFrame` 中按 `elapsed / FOCUS_DURATION_MS` 推进 `t`，调 `interpolatePose`
3. 把结果写入 `camera.position` 与 OrbitControls 的 `target`

**不含任何数学**。所有计算在 `domain/` 内且已被单测覆盖。

### OrbitControls 配置（`Design.md` §11）

```
enablePan: false          // 禁用平移，模型保持居中
enableZoom: true
minPolarAngle: ~1.0 rad   // 限制垂直旋转，防止翻转到头顶
maxPolarAngle: ~2.1 rad   // 防止从脚底往上看
```

---

## 7. 状态与数据流

`Design.md` §27：状态需求极小，一个 `useState` 足够，不引 Zustand/Redux。

```
App.tsx
  const [selectedId, setSelectedId] = useState<GlandId | null>(null)
        │
        ├──→ AnatomyScene ──→ GlandLayer  (高亮 / dim)
        │                 └──→ CameraRig   (聚焦)
        │
        └──→ KnowledgeCard (通过 glandRegistry.byId 取内容)
```

`KnowledgeCard` 与 `CameraRig` **互不知晓**，都只消费 `selectedId`（`Design.md` §28）。

`glandRegistry` 是数据的唯一查询入口 —— UI 组件不直接 import `data/glands.ts`，避免内容硬编码进组件（`Design.md` §15）。

### 视觉状态（`Design.md` §13）

腺体 opacity 取决于**是否已有选中项**：

| 对象 | `selectedId === null`（概览态） | 已选中某腺体 |
|---|---|---|
| 人体 mannequin | 0.15 | 0.15 |
| 该腺体 | 0.75 | **1.0** + emissive 增强 + 轻微放大 |
| 其余腺体 | 0.75 | 0.55 |

概览态下所有腺体一律 0.75，无强弱之分 —— `Design.md` §8 要求初始状态不得有任何腺体被强调。

---

## 8. 测试策略

难点：jsdom 中没有 WebGL 上下文，R3F 组件无法用常规方式渲染。解法是**按"需要多少 3D"分层**。

### 层 1 — `tests/data.test.ts`（纯 Vitest，无 DOM）

最有价值的一层：后续往数据里加内容时挡住腐坏。

- 恰好 7 个腺体，且 id 集合等于 `GlandId` 全集
- id 唯一
- `chineseName` / `name` / `location` / `color` 非空
- `hormones.length >= 1`；`functions.length` 在 1–3 之间（`Design.md` §16）
- 所有 `positions` 落在 `BODY_BOUNDS` 内
- 成对器官（`positions.length === 2`）满足左右对称：`p0.x === -p1.x`，且 y、z 相等
- `focusDistance > 0`
- 解剖顺序不变量：`hypothalamus.y > pituitary.y > thyroid.y > adrenal.y > pancreas.y > ovary.y > testis.y`

### 层 2 — `tests/cameraFocus.test.ts`（纯 Vitest，无 DOM）

- `centroid` 单点返回自身；两点返回中点
- `interpolatePose(a, b, 0)` 深等于 `a`；`t=1` 深等于 `b`
- `t` 越界钳制（`-1 → a`，`2 → b`）
- 沿 t 递增，到**目标机位** `to.position` 的距离单调不增（注意断言对象是 `to.position` 而非 `to.target`：插值路径是直线，到线段终点的距离必然单调，但到线外一点的距离是 t 的抛物线，可能先减后增）
- **防贴脸回归**：对全部 7 个腺体，`|computeTargetPose(g, θ).position − centroid(g.positions)| >= MIN_FOCUS_DISTANCE`
- `computeTargetPose` 的 `target` 等于质心
- 传入不同 `azimuth` 产生不同 `position`，但 `target` 不变

### 层 3 — `tests/scene.test.tsx`（`@react-three/test-renderer`）

R3F 官方测试渲染器，**不需要 WebGL**，可直接断言场景图。

- `GlandLayer` 渲染出的 marker 总数 = 所有 `positions` 之和（单发 + 成对 = 10）
- 覆盖全部 7 个 `gland.id`
- 点击某个 marker 触发 `onSelect` 并携带正确 id
- 成对器官的任一 marker 被点击，都产生同一个 id
- 选中态下该 marker 的 material 参数与未选中态不同

### 层 4 — `tests/app.smoke.test.tsx`（RTL + jsdom，mock 掉 Canvas）

用 `vi.mock` 把 `AnatomyScene` 替换为一个渲染 7 个按钮的桩件，从而在纯 DOM 层验证接线。

- 初始渲染：Header 出现、`ControlsHint` 出现、`KnowledgeCard` 不出现
- 选中后：卡片出现，其中文名 / 位置 / 激素 / 作用**逐条与 `data/glands.ts` 一致**（防止内容被硬编码进组件）
- 切换选中：卡片内容随之更换
- 点击 Reset：卡片消失，回到初始态

### 不做

Playwright / 浏览器 E2E —— 本项目无后端、无路由、无鉴权，E2E 的边际价值不足以抵消维护成本。若将来需要视觉回归，再单独立项。

### 命令

```
npm run dev       vite
npm run build     tsc --noEmit && vite build
npm test          vitest run
npm run test:watch  vitest
npm run verify    tsc --noEmit && vitest run && vite build
```

`npm run verify` 是"这版能不能交"的**单一判据**。

---

## 9. 布局（`Design.md` §7、§24）

桌面优先：

```
┌──────────────────────────────────────────────┐
│ Header: ENDOCRINE ATLAS / 内分泌系统  [重置]  │
├───────────────────────────┬──────────────────┤
│                           │                  │
│   AnatomyScene  ~68%      │  KnowledgeCard   │
│                           │      ~32%        │
│                           │                  │
├───────────────────────────┴──────────────────┤
│ ControlsHint: 点击腺体查看信息 / 拖动旋转     │
└──────────────────────────────────────────────┘
```

`< 768px` 时改为纵向堆叠（场景在上、卡片在下）。仅保证可用，不做深度移动端优化。

---

## 10. git 作为开发日志

不采用 `Design.md` §32 的 Day 1–10 时间线。改为按**可验证里程碑**提交，每个 commit 落地时 `npm run verify` 必须为绿。

```
chore: 初始化 vite + react + ts + vitest 工具链
feat(data): 7 个腺体作为唯一真源
test(data): 数据完整性护栏
feat(domain): 相机聚焦纯数学
test(domain): 聚焦不变量（含防贴脸）
feat(scene): canvas + mannequin + 统一 marker
test(scene): 场景图与点击（r3f test-renderer）
feat(ui): header / 知识卡 / 提示 / 重置
feat(app): 打通 选中 → 高亮 → 聚焦 → 卡片
test(app): DOM 层冒烟
docs: README + 腺体造型替换指南
```

远端 `origin` 为 `github.com/RoyChaan/Endocrine-Atlas`（当前零 commit）。**本轮只做本地 commit，不 push**，由用户 review 后自行决定推送时机。

---

## 11. 未来替换点

本骨架为下一轮（真实腺体造型）预留的唯一接缝：

`scene/GlandMarker.tsx` 现在渲染统一的 `sphereGeometry`。下一轮改为按 `gland.id` 分派到各自的造型组件（`<ThyroidMesh/>`、`<PancreasMesh/>` …）。

`GlandLayer`、`CameraRig`、`domain/`、`data/`、`ui/` 全部无需改动 —— 因为它们只依赖 `Gland` 类型与 `positions`，不依赖几何体。
