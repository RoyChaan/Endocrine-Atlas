# Endocrine Atlas · 内分泌系统交互图谱

面向初中生的内分泌腺解剖可视化。点腺体 → 相机聚焦 → 读知识卡。

线上：<https://endocrine-atlas.pages.dev>

## 开始

需要 Node ≥ 20。

    npm install
    npm run dev

纯静态前端，没有后端。`npm run build` 出的 `dist/` 可直接托管到任何静态空间。

## 命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm test` | 测试 |
| `npm run verify` | typecheck + test + build，交付前的单一判据 |

## 许可

代码 MIT，见 [`LICENSE`](LICENSE)。3D 模型素材的授权另见 [`NOTICE.md`](NOTICE.md)。
