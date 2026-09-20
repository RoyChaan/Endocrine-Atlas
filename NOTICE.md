# 第三方素材与授权

`LICENSE` 里的 MIT 只覆盖**本仓库的源代码**（`src/`、`tests/`、`scripts/`、
`tools/`、配置与文档）。`public/models/` 下的 3D 资产各有各的来源与权利人，
**不随 MIT 一并转授**。逐项如下。

## 人体：`public/models/body.glb`

| | |
|---|---|
| 来源 | [MakeHuman](https://github.com/makehumancommunity/makehuman) 的基础网格 `base.obj` 与 `macrodetails` 系列形变表 |
| 许可 | **CC0 1.0**（公有领域）。2020-09 由版权方 Data Collection AB 明确释出，声明写在 `base.obj` 文件头部 |
| 署名要求 | 无。此处列出仅为溯源 |
| 本仓库做了什么 | `scripts/build-body.mjs` 叠加形变表、切臂、删除网格内部几何、归一化后导出 GLB |

## 腺体：`public/models/{brain,thyroid,adrenal,pancreas,ovary,testis}.glb`

| | |
|---|---|
| 来源 | 第三方 3D 生成服务 **Tripo** 按本项目需求生成 |
| 许可 | **由生成方账号持有，未作公开授权。** 这六个文件不在本仓库的 MIT 许可范围内 |
| 可以做什么 | 克隆本仓库、在本地运行与学习本项目 |
| 不可以做什么 | 将这些 GLB 单独取出再分发、商用，或用于本项目以外的用途。需要的话请自行向 Tripo 确认授权条款 |
| 本仓库做了什么 | `scripts/build-organs.sh` 将原始导出（每个约 200 万面 / 57 MB）减面压缩到约 4.5 万面 / 1.5 MB |

## 运行时依赖

[React](https://github.com/facebook/react)、[three.js](https://github.com/mrdoob/three.js)、
[@react-three/fiber](https://github.com/pmndrs/react-three-fiber)、
[@react-three/drei](https://github.com/pmndrs/drei) 均为 MIT。
完整清单见 `package.json` 与 `package-lock.json`。

## 教学内容

`src/data/glands.ts` 里每条腺体的「位置」与「功能」两句是**初中生物教材原文**，
为保证学生对着课本背诵时措辞一致而未作改写。这部分文字的著作权归教材版权方，
**不适用本仓库的 MIT 许可**，此处按教学目的作简短引用。复用本项目时请自行替换
或确认授权。其余代码注释、界面文案随代码适用 MIT。

---

若你认为本仓库中的某项素材侵犯了你的权利，请提 issue，我会尽快移除。
