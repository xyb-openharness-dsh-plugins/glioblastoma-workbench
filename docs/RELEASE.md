# 发布与回滚记录

版本/tag/commit：... 变更的功能 ID：... 用户授权范围：...
源码检查：... 包检查/大小/hash：... 实机证据：...
README/许可证/素材来源/运行依赖/更新说明：...
演示数据清单已清理或明确示例环境：...
数据库迁移与旧包兼容：... 可用备份：...
市场分发来源：npm / Release tarball / 默认分支源码 / 不投稿（选一并说明依据）：...

若任务要求本机更新：最终已安装版本/Profile/打开确认本次修改：...。若仅推送Git：明确此范围，不声称本机已更新。仅安装后仍旧版或异常时附源码→构建物→包→Profile→运行界面的诊断证据，不每次重复整链排查。

| 动作 | 目标 | 真实结果/URL/证据 | 状态 |
| --- | --- | --- | --- |
| 本地安装 | Desktop/profile | | 未执行 |
| Git push | 远端/分支/commit | | 未执行 |
| Release/npm | tag/产物/hash | | 未执行 |
| 市场 PR | 官方目录仓库 | | 未执行 |
| 上架 | 公开 catalog | | 未执行 |

市场状态说明：GitHub Release 不会自动成为市场安装来源。核对已有目录条目/开放PR；若未声明 tarball，市场按目录协议使用默认分支源码（或适用的npm来源）。普通代码版本升级不重复创建目录PR；切换安装来源或修改目录元数据时，在原条目PR中更新。市场PR提交、合并、目录可见、Desktop可安装分别记录，不混称“已上架”。

回滚步骤/数据兼容检查/已知限制：...

工作台市场发布另按 docs/10-MARKET-PUBLISHING.md 执行，附 templates/MARKET-ACCEPTANCE.md 的指定版本手工确认。官方指南复核日期/来源：... 最终安装来源：... 用户确认的项目与执行者：... PR URL/最新提交检查实际执行结果：... 市场目录可见与可安装证据：...。未授权投稿时标不适用，不把 Git push 当市场发布。

## 0.1.0 装机记录（M6 · 2026-10-24）

| 项 | 值 |
| --- | --- |
| tgz | `release/xyb-community-glioblastoma-workbench-0.1.0.tgz`（3.6MB/42 文件，sha256 `83bc29e2…f4e546f`） |
| 安装 | `NODE_OPTIONS= npx --yes pnpm@10.15.0 add -w file:…` → `harness/profiles/web`（+1 包，4.8s） |
| 依赖声明 | ✅ `package.json` 含 `@xyb-community/glioblastoma-workbench: file:…` |
| 解包 | ✅ node_modules 内 dsh/lib/public/schema/demo 齐全 |
| harness.log | ✅ 无 import failed（日志最近一次启动为 10-20，装机后未重启） |
| state.json added | ⏳ 未出现（需用户在 dsh-desktop 内"添加工作台"；家族统一路径） |
| **UI 加载/业务验证（V2/V3）** | **未验证**——待用户：重启 dsh-desktop → 工作台列表添加 → 走核心流程（打开/切页/AI 面板/数据落盘/重开资料还在/版本首屏） |

## 0.1.1 装机记录（M6 修复轮 · 2026-10-24）

| 项 | 值 |
| --- | --- |
| 根因 | ① 包缺 `dsh` 块与 patch `config.root`（服务 404）② 违反 06 号"本地包递增版本"规则：同版号 0.1.0 重打包换内容，宿主版本簿记冲突（用户报"tar包版本号不对"）③ public/ 三处降级字面量与 server 测试断言写死版本 |
| 修复 | 0684aa7（接线）+ 8569055/527192f（v0.1.1：VERSION/package.json/public 三处/断言改唯一源），check 全绿 47/47、版本十处同源 |
| tgz | `xyb-community-glioblastoma-workbench-0.1.1.tgz`（sha256 `e2d18b55…fb69b09`，npm shasum be2d49aa） |
| 安装 | 按 06 号文档乳腺癌首装实录：`NODE_OPTIONS= corepack pnpm remove -w` + `add -w --save-exact file:…0.1.1.tgz`（corepack 遵循 profile packageManager 10.34.5） |
| 验证 | 装机副本五要素 ✅：version 0.1.1 / dsh 块 / patch config.root / file: 依赖 / bundles 登记在册（用户 UI 添加时宿主已登记） |
| 待用户 | 重启 DSH Desktop → 工作台应能连接服务（数据目录 harness/glioblastoma-workbench/）→ 走核心流程 |

## 0.1.2 装机记录（M6 修复轮二 · 2026-10-24）

| 项 | 值 |
| --- | --- |
| 根因 | `lib/client.js` 仍是 starter 占位（43 行）：只渲染"接入骨架／服务已连接"卡片，从不加载 `public/` 真实界面；register 未带 `layout`，宿主按默认分栏排版。服务端链路正常（`/ui/`、`/api/health`、`/api/bootstrap` 实测 200） |
| 修复 | 新增 `src/client.js`（customFrame 外壳）+ `scripts/build-client.mjs` → 生成 `lib/client.js`（472 行）；`lib/routes.js` 统一 `HOST_BASE/UI_ENTRY/HEALTH_PATH`；`AGENT_PANE` 补 `ratioStep/narrowBelowPx/drawerMaxPx`，`assertPanelConfig` 互补判据修正；`npm run check` 加 `build-client --check`；`test/client.test.mjs` 8 项回归 |
| 检查 | `npm run check` 55/55 全绿，版本十处同源 v0.1.2 |
| tgz | `release/xyb-community-glioblastoma-workbench-0.1.2.tgz`（43 文件 / 3.58 MB，shasum `256eaa30…`） |
| 安装 | `harness/profiles/web`：`NODE_OPTIONS= corepack pnpm remove -w` + `add -w --save-exact file:…0.1.2.tgz`（pnpm 10.34.5） |
| 装机副本五要素 | ✅ version 0.1.2 / ✅ `dsh` 块 / ✅ patch `config.root` / ✅ `file:` 依赖 / ✅ bundles 登记；✅ 客户端 472 行、骨架文案 0 处 |
| 待用户 | 重启 DSH Desktop → 打开小星宝 → 业务区应为真实界面；AI 面板可拖 25%–45%、可收起不结束会话 |

## 0.1.3 装机记录（M6 修复轮三 · 2026-10-24）

| 项 | 值 |
| --- | --- |
| 根因 | `public/app.js:12` `if (API_BASE.includes('/api')) throw` —— 宿主前缀 `/api/glioblastoma-workbench` 含 `/api`，整个 app.js 不执行，业务区全白（0.1.2 客户端外壳本身是对的） |
| 修复 | 守卫改 `/(^|\/)api$/` 只约束结尾；新增回归测试第 9 项 |
| 验证 | 真实 Chrome + 装机副本 + 装机库副本：`data-booted=1`、看板 1755 字、10 页 0 报错 0 失败请求、演示数据加载；截图 `docs/shots/dev/host-dash-0.1.3.png` |
| tgz | `release/xyb-community-glioblastoma-workbench-0.1.3.tgz`（43 文件 / 3.6 MB，shasum `71050630…`） |
| 装机 | `harness/profiles/web` remove + add `--save-exact file:…0.1.3.tgz`；依赖与 bundles 双登记 |
| 检查 | `npm run check` 56/56 全绿，版本十处同源 v0.1.3 |

## 0.1.4 装机记录（M6 修复轮四 · 2026-10-24）

| 项 | 值 |
| --- | --- |
| 现象 | 业务界面正常，但点「AI 对话」拉不起 DSH 原生会话面板（用户反馈） |
| 根因一（主因） | 客户端把宿主传的 `conversation` prop 当作"已有会话"判据。customFrame 下宿主**只要本工作台 active 就恒传**这个容器（内容 `display:none`），于是按钮一上来是「收起 AI 对话」，点击只切显隐、永远走不到 `ensureSession`，会话根本不会被创建 |
| 根因二 | `/api/health` 不返回 `dir`，客户端 `ensureSession({ folder: null })`，宿主抛「创建会话需要业务项目文件夹。」 |
| 修复 | 会话判据改问宿主 `ownedSession()`（`currentSession` + `ownsSession`）+ `subscribe`/400ms 轮询；`health` 增 `dir`（资料目录优先，否则库所在目录）；`openAgent` 自校验 dir；原生挂载点无条件渲染只用 `display`；无会话时给引导块与「调起 AI 会话」按钮；`snapWidth` 边界原样落地（0.25 不在 0.02 网格，先对齐再钳位会变 0.26） |
| 验证 | 新增 `npm run probe:client`（按 asar 真实宿主实现搭最小外壳，`conversation` 恒非空）：初始「AI 对话」→ 点击 ensureSession（folder 非空、草稿填入、面板 flex、原生挂载点可见）→ 收起（DOM 不卸载、会话数不变）→ 再打开 → Home/End = 45/25 → 0 JS 报错 0 失败请求；截图 `docs/shots/dev/client-session-0.1.4.png` |
| 回归 | `npm run check` 62/62 全绿、版本十处同源 v0.1.4；`npm run probe` 业务界面 30 视图 0 溢出 0 报错 |
| tgz | `release/xyb-community-glioblastoma-workbench-0.1.4.tgz`（43 文件 / 3.58 MB，sha256 `3d0e0d23…f850524`） |
| 装机 | `harness/profiles/web`：`NODE_OPTIONS= corepack pnpm remove -w` + `add -w --save-exact file:…0.1.4.tgz`；五要素 ✅（version / `dsh` 块 / patch `config.root` / `file:` 依赖 / `bundles` 登记）；装机副本 `lib/client.js` 517 行、`hasConversation` 0 处、`health` 含 `dir` |
| 待用户 | 重启 DSH Desktop → 打开小星宝 → 点顶栏「AI 对话」应真的新建并绑定原生会话，草稿已填（不自动发送）；再点收起不结束会话；拖分隔边 25%–45% |

## 0.1.5 装机记录（显示修复 · 2026-10-24）

| 项 | 值 |
| --- | --- |
| 现象 | AI 对话面板展开后业务区约 65% 宽，看板「最近 KPS / MRI / 激素」三块被压成竖排单字；用户截图指出，并对照宫颈癌工作台 |
| 根因 | `.change-strip` flex+space-between+flex:1，且 `.chg` 内部横排（span/b/p 并排）→ 每块仅约 100px，三行文字各缩到 20px；`.flag-list div` 用 flex 把 `<b>` 标签变成可收缩项 → 30px |
| 修复 | 外框改 grid（3×`minmax(0,1fr)` + 按钮 auto）、卡内改纵向；断点 ≤1180 降 2 列 / ≤900 降 1 列；竖线仅 ≥1181；flag-list 去 flex、圆点绝对定位 |
| 新增检查 | `npm run probe:resp`（8 档宽度 × 10 页，扫竖排单字/横向溢出/内容被裁）+ `test/responsive.test.mjs` 4 项结构断言 |
| 验证 | 仓库版：8×10 全量 0 命中；装机副本（940px）：`grid-template-columns` 解析为两列各 298px、`.chg` 宽 298、竖排元素 0、横向溢出 0、0 JS 报错，截图 `docs/shots/dev/installed-940-dash-0.1.5.png` |
| 检查 | `npm run check` 66/66 全绿，版本十处同源 v0.1.5；原型 `prototypes/v0.2/style.css` 同步（逐行一致，G2 闸口不破），台账 DESIGN-09 已记 |
| tgz | `release/xyb-community-glioblastoma-workbench-0.1.5.tgz`（43 文件 / 3.58 MB，sha256 `6198b41e…77dc35`） |
| 装机 | `harness/profiles/web` remove + add `--save-exact file:…0.1.5.tgz`；依赖与 bundles 双登记，副本 `VERSION=0.1.5`、含新 grid 规则 |
| 待用户 | 重启 DSH Desktop → 打开小星宝 → 展开 AI 对话，看板三块应两列且文字横排；再缩窄窗口应降到单列 |
