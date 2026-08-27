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

`CameraRig` 只做三件事：读当前机位、推进 `t`、把结果写回 camera 与
OrbitControls。它不含任何数学。

## 坐标系

`+Y` 上 · `+X` 观察者右侧（人体左侧）· `+Z` 腹侧。
原点在双脚之间的地面，模型总高 `1.75` 单位（≈米）。

全部腺体坐标在 `src/data/glands.ts`，由 `tests/data.test.ts` 校验
落在人体包围盒内、成对器官左右对称、解剖高度序正确。

## 成对器官

`Gland.positions` 是**数组**而非单个坐标。单发器官 `length === 1`，
肾上腺 / 卵巢 / 睾丸 `length === 2`。

一条知识条目渲染出多个 marker，但它们共享同一个 `gland.id`，所以
`selectedGlandId` 始终是单值。不需要重复的知识条目，也不需要任何
特判分支。

## 测试分层

jsdom 没有 WebGL，所以按 "需要多少 3D" 分层：

| 文件 | 工具 | 覆盖 |
|---|---|---|
| `tests/data.test.ts` | Vitest | 数据完整性与解剖不变量 |
| `tests/cameraFocus.test.ts` | Vitest | 聚焦数学，含防贴脸回归 |
| `tests/scene.test.tsx` | `@react-three/test-renderer`（无需 WebGL） | 场景图、点击、高亮 |
| `tests/app.smoke.test.tsx` | RTL + jsdom（mock 掉 Canvas） | DOM 层接线与内容一致性 |
| `tests/toolchain.test.tsx` | Vitest | 工具链自检 |

`src/scene/AnatomyScene.tsx`（`<Canvas>` 外壳）是唯一不做自动化断言的
一层 —— 它需要真实 WebGL 上下文。其中的数学已被 `cameraFocus.test.ts`
覆盖，`CameraRig` 只是薄壳。它由浏览器中的人工目视清单验收。

`tests/data.test.ts` 的护栏有效性经过变异检验：故意删掉一条腺体、把
甲状腺移出人体、破坏成对器官对称、让 `functions` 超出 3 条上限、把
肾上腺降到胰腺之下 —— 每一项都被对应的断言抓到。

## 独立小窗

`Gland.hasInset` 决定某个腺体是否**额外**在 3D 区右下角给一个小窗。

这是附加的细节视图，**不把腺体从人体里拿走** —— 全部 7 个腺体都嵌在
人体内，`scene/GlandLayer` 一个不落地渲染。睾丸开这个标志，是因为它在
半透明 mannequin 的盆腔下方不易看清（参考图也为它单开了一个小框）。

因此 `insetGlands()` 是 `allGlands()` 的**子集**，不是另一半。

两个入口完全等效：点小窗和点体内的 marker 都把 `selectedGlandId` 设为
`testis`，主相机同样居中放大聚焦过去，小窗同步进入高亮态。带小窗的腺体
在 `domain/cameraFocus.ts` 的 `poseForSelection` 里不享受任何特殊分支。

## 两个 WebGL 层面的坑

**OrbitControls 的阻尼残留。** 拖动结束后 `enableDamping` 会在内部留下
一份 `sphericalDelta`。`CameraRig` 每帧写好机位后调用 `controls.update()`，
这份残留角速度会被重新叠加回去 —— 表现为"点了重置只转回去一半"。
`CameraRig` 在每次起动画前临时关掉阻尼跑一次 `update()` 把它排空
（非阻尼分支会应用一次后将 delta 归零）。

**后台标签页不渲染。** R3F 靠 `requestAnimationFrame` 驱动，隐藏的标签页
里 rAF 不触发，canvas 会停在 HTML 默认的 300×150 且一片空白。调试时若
整个 3D 区是黑的，先确认 `document.visibilityState === 'visible'` 再怀疑代码。

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
