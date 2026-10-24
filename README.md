# 小星宝 StarPal · 胶质母细胞瘤工作台

面向胶质母细胞瘤（GBM）患者与照护者的**本机资料整理工作台**：把散落的手术、病理与分子检测、
MRI 随访、放化疗与电场治疗、血象与症状记录整理成可核对、可回溯的资料，并整理成复诊时能带着走的问题清单。

> 本工作台只提供信息，**不做诊断、不做处置建议**。判读与决定由患者及其神经肿瘤治疗团队做出。
> 用户自己记下的担心或判断按"一条信息"保存，并标注"不是医生结论"，不进趋势、不进摘要事实区。

- 当前版本：**v0.1.5**（开发版 · 数据仅在本机）
- 宿主形态：DSH Desktop 工作台（customFrame，可拉起原生会话）
- 许可证：UNLICENSED · 仓库私有 · **未上架市场**

## 现在能做什么

- **10 个一级页 / 30 个视图**（看板、我的瘤、放化疗日历、电场治疗、随访影像、指标与用药、
  症状与发作、营养与体重、照护与家事、复诊与试验），另含设置 3 页签。
- **双主体记录**：本人记录与照护者代记分开标注；本人的私密感受默认不进摘要与导出。
- **AI 会话（原生）**：顶栏「AI 对话」用宿主 `ensureSession` 建会话并绑定到本工作台，
  开场白只填进**草稿**、不自动发送；面板可收起（不结束会话）、可拖宽 25%–45%。
- **资料导入（候选制）**：PDF/图片经 MinerU 解析出的内容**一律先成候选**，由用户逐条核对后才进事实层；
  解析失败不产出候选。
- **一图秀**：多指标时间轴按各指标自身范围缩放，手术 / 放疗 / 电场分层在独立泳道；
  KPS 属分类序列，只画节点不连线。
- **你的看法单独存放**：记 viewpoint 并标"不是医生结论"。
- 标准 / 大字两档字号；窄宽（AI 面板展开或窗口变窄）按 1180 / 900 两档降列，
  规则见 [docs/RESPONSIVE-RULES.md](docs/RESPONSIVE-RULES.md)。

## 安装

需要 Node.js 22+ 与 DSH Desktop。当前只提供**本机 tgz**（未上架市场）：
[Release v0.1.5](https://github.com/xyb-openharness-dsh-plugins/glioblastoma-workbench/releases/tag/v0.1.5)
的 `xyb-community-glioblastoma-workbench-0.1.5.tgz`
（sha256 `6198b41e534607e19ac974ebc764b47471aaf4a836e2a327e30e32b20177dc35`）。

```bash
cd ~/Library/Application\ Support/dsh-desktop/harness/profiles/web
NODE_OPTIONS= corepack pnpm add -w --save-exact file:/绝对路径/xyb-community-glioblastoma-workbench-0.1.5.tgz
```

装完重启 DSH Desktop → 设置 → 通用 → 启用工作台 → 添加「小星宝」。同版号内容变更时宿主不会替换，
必须先 `remove -w` 再 `add -w`。

## 数据与隐私

- 业务库是 SQLite，放在宿主分配的目录 `harness/glioblastoma-workbench/`，原件放其下 `imports/`。
- 不联网、不上传、不做云同步；MinerU Token 只走环境变量 `MINERU_TOKEN` 或 `.secrets/mineru.json`（已忽略）。
- 仓库内演示档案（周建国 · 演示 等）全部虚构，仅用于开发验收。

## 边界

- 不提供诊断、分级判读、用药或治疗选择建议；不推荐医院或医生，也不做排序。
- 报告结论按**原文**引用，并注明"判读归神经影像与治疗团队"。
- 事实、候选、用户核对记录、专业判断四层分开存放、不合并；更正只新增版本，不改写历史。
- 缺值就是缺值：不把 NULL 当 0，缺健侧不生成差值。

## 开发与检查

```bash
npm install
npm run check        # 版本同源 → 客户端产物 → 语法 → 冻结合同 → 文案红线 → 密钥 → 单测 → 包检查
npm run probe        # 业务界面无头实测（30 视图溢出/报错/一图秀）
npm run probe:client # 宿主外壳探针：AI 会话拉起、收起不卸载、拖宽
npm run probe:resp   # 窄宽自适应：8 档宽度 × 10 页扫竖排单字/溢出/裁切
npm run pack:check   # npm pack --dry-run
```

- 版本唯一来源是仓库根 `VERSION`；页面顶栏 / 页脚 / 关于三处同源渲染，禁止手写第二份。
- 数据库迁移只增不改（`schema/0001_initial.sql`、`schema/0002_candidate_dates.sql` 已冻结，
  改结构只能新增 `000N_`）。
- 原型 `prototypes/v0.2/` 是 G2 闸口产物，`public/style.css` 与它必须逐行一致
  （`test/ui-parity.test.mjs`）。
- 开发顺序、里程碑与闸口见 [AGENTS.md](AGENTS.md)、[docs/DEV-PLAN.md](docs/DEV-PLAN.md)；
  发布与装机记录见 [docs/RELEASE.md](docs/RELEASE.md)；逐版变更见 [CHANGELOG.md](CHANGELOG.md)；
  设计决策台账见 [docs/DESIGN-SESSION.md](docs/DESIGN-SESSION.md)。

## 版本与发布

- Git tag `vX.Y.Z` + GitHub Release 附 tgz，与 `VERSION` 同步；
  流程见 [docs/06-VALIDATION-AND-RELEASE.md](docs/06-VALIDATION-AND-RELEASE.md)、[docs/RELEASE.md](docs/RELEASE.md)。
- **"推了 Git"不等于"上架"**：市场收录要仓库公开 + 目录条目 PR 合并 + 实机可装三层齐全；
  本仓库当前私有，属未投稿状态。

## 贡献者与致谢

感谢以下社区与个人：

- **小 x 宝社区** —— 品牌气质与家族工作台（小粉宝 / 小莲宝 / 小铃铛等）的交互范式来源。
- **DataElement 社区** —— DSH 工作台规范与站点选择工作台的实现参考。
- **sam / hhx / 繁华** —— 脚手架、装机契约与实机验证的持续投入。❤️

工程实现另外参考了家族姊妹工作台 cervical-workbench（customFrame 分栏与窄宽自适应）与
lymphoma-workbench（宿主接入层与装机契约）。宿主契约以 DSH Desktop 打包内 `app.asar` 的实际实现为准，
本项目为此沉淀了 `scripts/probe-client-session.mjs` 与 `scripts/probe-responsive.mjs` 两个探针。

Logo 与素材来源、使用限制见 [assets/README.md](assets/README.md)。项目由社区脚手架
`xyb-workbench-starter` 初始化（来源记录见 `.dsh-wb-starter.json`），升级脚手架不覆盖本项目。
