# Changelog

## 0.1.0（2026-10-24）· M0 骨架

- 认领：xyb-openharness-dsh-plugins/.github#12（胶质母细胞瘤，T1，/claim 已触发）。
- 建仓：xyb-openharness-dsh-plugins/glioblastoma-workbench（private）。
- starter init（dsh-wb-cli 1.4.3，139 文件，business-first 0.65），基线 `npm run check` staticPass=true。
- 文档体系：DEV-REQUIREMENTS-2026-10-24 / DEV-PLAN / DIFF-MATRIX / PATIENT-FLOW / CLINICAL-DATA-2026 落地。
- 决策记录：样板 lymphoma v0.3.0；双主体；全病程；MinerU 18 号 v2 接入（M5）。

## 0.1.0（2026-10-24 · M5 开发版）
- dsh 六件套（index/server/store/workbench/demo/readmodels）+ MinerU 六部件（mineru/settings/gbmparse/parse + 设置接口 GET/POST /api/glioblastoma/settings/mineru，18 号 v2 口径）。
- public/ 四件套自 prototypes/v0.2 复制定点替换：/api/bootstrap 数据加载、AI 五态、面板宽度持久化、版本首屏、启动异步化；ui-parity 60/60 逐字符一致。
- schema/0002_parity_columns.sql（ALTER 追加 12 列 + 3 新表；0001 未动，sha256 复算一致）。
- 脚本与验收：npm run check 全绿；HVT 一致性 X1–X4（check-hvt.mjs）；无头实测 probe-headless.mjs 出数字，截图 docs/shots/dev/。

## 0.1.0（2026-10-24）· M5 开发版

- dsh 十件（六件套 + mineru/settings/gbmparse/parse，18 号 v2 六部件）；public 四件复制原型定点替换（5 处）；scripts 十件（含 hvt/probe）；test 四套 47 项。
- npm run check 8 道闸全绿（独立复跑）；ui-parity 30 视图×2 档案逐字符 60/60；HVT 交互一致性 X1-X4 全过（30/30 覆盖、13/13 路径、编辑入口违规 0、AI 候选 10/10）。
- schema/0002_parity_columns.sql：增量迁移（12 列 + ttfields_meta/monthly + trial_lead），0001 未动，冻结合同追加记录——待用户追认。
- 已知未做：资料档案导入 UI（原型静态）、真实 MinerU 在线解析、.txt/.md/.csv 本地通道、dsh-desktop 装机（M6）。
