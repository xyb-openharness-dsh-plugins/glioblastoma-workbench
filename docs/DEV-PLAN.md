# 开发计划（DEV-PLAN）· 唯一里程碑来源

> 里程碑只认本文。闸口标准见 `22-PHASES-AND-GATES.md`；本文与它冲突时闸口文档为准。
> 认领 issue：xyb-openharness-dsh-plugins/.github#12（2026-10-24 /claim）。

| 里程碑 | 内容 | 交付物 | 状态 | 闸口 |
| --- | --- | --- | --- | --- |
| M0 骨架 | 认领、建仓、init、文档体系、DEV-REQUIREMENTS | 本文件 + 强约束清单 | ✅ 2026-10-24 | — |
| M1 调研SPEC | 十轴调研、USER-RESEARCH、SCENARIOS、PATIENT-FLOW、DIFF-MATRIX、SPEC/四核心模块 | docs/ 研究套装 | ✅ 2026-10-24 | **G1 已签**（samqin123） |
| M2 原型 | demo 数据、prototypes/v0.2 四件套、schema 草案（`schema/draft/` 不冻结） | 可点 HTML demo | ✅ 2026-10-24 | **G2 已签**（samqin123） |
| M3 数据模型 | `schema/0001_initial.sql` + freeze-contract.md（sha256） | 冻结的数据契约 | ✅ 2026-10-24 | **G3 已冻结**（sha256 8b08f68f…，27 表实测） |
| M4 临床库 | 在线四通道采集 2026 GBM 试验 → manifest/jsonl/sqlite/README + CLINICAL-DATA-2026.md | research/glioblastoma-cancer/ 四件套 | ⏳（采集脚本可与 M1 并行） | — |
| M5 开发版 | dsh 六步移植 + MinerU 六部件（18 号 v2） + test 三件 + `npm run check` 全绿 + **HVT 交互一致性** | 可运行开发版 | ✅ 2026-10-24（check 8 闸全绿独立复跑、47/47 单测、ui-parity 60/60 逐字符、HVT 30/30+13/13、0002 增量迁移待用户追认） | V1 包级 ✅ |
| M6 装机 | dsh-desktop pnpm 实装、宿主信号判据、截图归档 | 装机实测记录 | 🔶 包级已装（依赖/解包/日志 ✅）；UI 加载与业务验证**未验证**（待用户桌面端添加并走流程，见 docs/RELEASE.md） | V2 装机（进行中） |
| M7 发布 | tag/release、CHANGELOG、经验回流 starter（LESSONS/CHANGELOG 记一条） | v0.1.0 release | ⏳ | V3 业务验证 |

## 执行纪律

- G1/G2 未签不写业务代码；schema 在 Phase1 只是草案，G3 未过不建表不写迁移。
- M4 采集口径先行（关键词、四通道、`--dry-run` 可复现），与 M1 并行，落库等 G3。
- 每阶段汇报 5 行内：做了什么/关键文件/实测数字/仍缺什么/下一步。
- 阶段末 git 分主题提交（数据层/原型/开发版/文档），push 走分支→PR，不直推保护分支。

## 2026-10-24 进展

- M0 完成：issue #12 认领（claimed 标签+指派）、私有仓建立、starter init（139 文件、staticPass true、0.1.0）、文档体系 8 件、DEV-REQUIREMENTS-2026-10-24.md。
- M1 完成（待 G1 签认）：三路调研（医学 24 源含卫健委 2022 PDF 核数 / 用户研究 18 假设 0 访谈如实 / 家族结构实测）、USER-RESEARCH / SCENARIOS（S01–S17）/ PATIENT-FLOW（三流反推 10 线 27 页签）/ DIFF-MATRIX 全量（与 lymphoma 一级重名率 10%）/ SPEC v0.1。
- M4 v1 完成：108 条（CDE 84 + CTV 24）四类终态如实入库；chictr_online/ictrp 两轮 FAILED（未查过，不计覆盖），补采待后续会话；demo-data.js 已生成。
- M2 完成（待 G2 签认）：prototypes/v0.2 四件套（git 6721109）——28 视图×2 档案 56 截图全绿（溢出 0 / error 0 / 断言 62/62 / private 三出口过滤 / 禁词 0）；INTERACTION-DESIGN（AI 协助默认+手工收敛，用户 2026-10-24 补充）落地；遗留 6 项见 PROTOTYPE-REVIEW（一图秀挂载位 G1 待决）。
- 两个关键研究发现已入设计：代记双源标签（author_role，ICC 证据）；ACP 从新诊断期即启用（84.1% 家属代决证据）。
- M5 完成（2026-10-24）：34 文件；schema 0002 增量迁移（12 列+3 表，冻结合同已记行，**待用户追认**）；遗留：资料档案导入 UI 原型静态（API 已实测）、真实 MinerU 在线解析与 .txt/.md/.csv 本地通道未做（M6 前）、装机属 M6。
- 2026-10-24 追加：交互路径设计已制度化为家族规范回流中（starter 分支 feat/interaction-design-gate：HTML 前输入 + HVT 一致性验证，来源 GBM 首次实践）；GBM 自身 M5/V1 验收同步引入该检查项（上行）。schema 草案补全：0002_family_tables.sql（档案 2+指标 3+通用 7+导入 3，viewpoint 在 0001）。
