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
