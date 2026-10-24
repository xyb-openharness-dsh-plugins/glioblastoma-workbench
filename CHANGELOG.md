# Changelog

## 0.1.4（2026-10-24）· M6 修复轮四：AI 对话拉不起原生会话（customFrame 三要求落地）

- 现象（用户）：界面能显示，但点「AI 对话」拉不起 DSH 原生会话面板。
- 根因一（主因，客户端）：把宿主传的 `conversation` prop 当"已有会话"判据。
  宿主在 customFrame 下**只要本工作台是 active 就恒传**这个容器（内容 display:none），
  所以 `Boolean(conversation)` 恒为真 → 按钮一上来就是「收起 AI 对话」→ 点击只切显隐，
  永远走不到 `ensureSession`，原生会话根本不会被创建，面板里只剩一块空的会话区。
- 根因二（服务端）：`/api/health` 不返回 `dir`，客户端传 `folder: null`，
  宿主的 `ensureSession` 抛「创建会话需要业务项目文件夹。」——就算点了也一定失败。
- 修复：
  - 会话判据改成问宿主：`ownedSession()`（`desktopWorkbenches.currentSession()` +
    `ownsSession()`），`subscribe` + 400ms 轮询双同步；没有会话时按钮就是"建立会话"。
  - `health` 新增 `dir`（资料目录优先，否则库所在目录 = 宿主分配的 `config.root`）。
  - `openAgent` 自己校验 dir，缺目录时给可执行提示，不再把 null 丢给宿主。
  - 原生会话挂载点**无条件渲染**，只用 `display` 控制（宿主明确禁止 remount 输入树）。
  - 没有会话时面板里给引导块 + 「调起 AI 会话」按钮，不留白。
  - `snapWidth` 边界原样落地：`0.25` 不在 0.02 网格上，先对齐再钳位会得到 `0.26`，
    与 `aria-valuenow` 宣称的 25% 不符（探针实测抓到）。
- 新增 `scripts/probe-client-session.mjs`（`npm run probe:client`）：按 asar 里的真实宿主实现
  搭最小外壳（ModuleLoader + register + **恒非空的 conversation** + 复刻 ensureSession 校验），
  真实 Chrome 里点按钮验证：初始「AI 对话」→ 点击调起（folder 非空、草稿填入、面板 flex、
  原生挂载点可见）→ 收起（DOM 不卸载、不新建会话）→ 再打开 → Home/End 到 45/25 → 0 报错。
- 检查：`npm run check` 62/62 全绿，版本十处同源 v0.1.4；`npm run probe` 业务界面回归
  （30 视图 0 溢出、0 JS 报错、0 失败请求、v0.1.4 三处显示一致）。
- 截图：`docs/shots/dev/client-session-0.1.4.png`。

## 0.1.3（2026-10-24）· M6 修复轮三：页面 API_BASE 守卫误杀宿主前缀（白屏根因）

- 根因：`public/app.js` 第 12 行 `if (API_BASE.includes('/api')) throw`。宿主前缀是
  `/api/glioblastoma-workbench`，含 `/api` → 抛异常 → 整个 app.js 不执行，iframe 里只剩
  顶栏/导航/页脚，业务区全白（截图可见）。真实浏览器控制台原文：
  `Error: API_BASE 不许含 /api（F3：接口路径自带 /api） at ui/app.js:12`。
- 修复：守卫改为只约束结尾 `/(^|\/)api$/`（防止拼成 `/api/api/...`），宿主前缀与独立启动
  的空串都放行。F3 原意（接口路径自带 /api）不变。
- 新增回归测试：`test/client.test.mjs` 第 9 项，读 `public/app.js` 源码断言守卫既接受
  `''` 与 `HOST_BASE`，又拒绝 `/api`、`/x/api`。
- 验证（真实 Chrome，装机副本 0.1.3，宿主模式 + 装机库副本）：`data-booted=1`、看板正文
  1755 字、10 个一级页逐页 0 报错 0 失败请求、演示数据（周建国 · 演示）正常加载。
  截图 `docs/shots/dev/host-dash-0.1.3.png`。
- tgz `release/xyb-community-glioblastoma-workbench-0.1.3.tgz`（43 文件 / 3.6 MB，shasum `71050630…`）已装机。
- 待用户：重启 DSH Desktop 后打开小星宝确认。

## 0.1.2（2026-10-24）· M6 修复轮二：客户端入口从脚手架占位换成家族 customFrame 外壳

- 根因：`lib/client.js` 一直是 starter 占位（43 行）。它只渲染"接入骨架／服务已连接"卡片，
  **从不请求 `public/` 的真实界面**——所以装进 Desktop 后面板里没有业务 UI，register 也没带
  `layout`（宿主按默认分栏排版）。服务端链路本身是好的（`/api/glioblastoma-workbench/ui/`、
  `/api/health`、`/api/bootstrap` 实测 200）。
- 修复：新增 `src/client.js`（472 行，家族 customFrame 外壳：顶栏 `header` + iframe 业务区 +
  可拖可键盘的 AI 会话面板）+ `scripts/build-client.mjs`（注入包名/仓库/路由/版本/布局参数），
  生成 `lib/client.js`；`npm run check` 增加 `build-client --check` 同步闸。
- 新增 `lib/routes.js`：`HOST_BASE` / `UI_ENTRY` / `HEALTH_PATH` 唯一来源，`dsh/workbench.js`
  改为从这里取并在原位重新导出（对外导出名不变）。
- `lib/layout.js`：`AGENT_PANE` 补 `ratioStep: 0.02` / `narrowBelowPx: 760` / `drawerMaxPx: 420`；
  `assertPanelConfig` 互补判据修正为百分点的 `default / 100`（原来 0.65 + 35 恒失败）。
- 新增 `test/client.test.mjs` 8 项：占位文案回归、ModuleLoader 身份、iframe 指向 UI_ENTRY、
  健康检查同源、register 带 customFrame+layout、三档宽度按比例注入、收起不卸载、根节点首元素为 header。
- 版本 0.1.2 十处同源；`npm run check` 55/55 全绿；tgz `release/xyb-community-glioblastoma-workbench-0.1.2.tgz`
  （43 文件 / 3.58 MB，shasum `256eaa30…`）已装入 `harness/profiles/web`（依赖 + bundles 双登记，装机副本 472 行）。
- 待用户：重启 DSH Desktop → 打开小星宝 → 确认业务区是真实界面（不再是"接入骨架"卡片）。

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
