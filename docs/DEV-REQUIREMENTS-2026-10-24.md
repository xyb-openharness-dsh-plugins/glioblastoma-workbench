# 开发强约束（DEV-REQUIREMENTS）· 2026-10-24

> 体例照 ZERO-TO-DEV §0.2。本文是本仓唯一强约束清单：每条必须能被某条命令或某张截图验证，写不出验证方式的约束不进本文。
> 错误来源标注家族级事故的出处（轮次/仓库），本仓首踩时追补"本仓错误来源"。

## 一、范围（交付物 × 落点 × 怎么验）

| # | 交付物 | 落点 | 怎么验 |
| --- | --- | --- | --- |
| R1 | 患者工作台开发版（dsh 六件套） | `dsh/{index,server,store,workbench,demo,readmodels}.js` | `npm run check` 全绿 + 无头实测出数字 |
| 2 | 前端（原型同构） | `public/{index.html,style.css,shell.css,app.js}` | `test/ui-parity.test.mjs` 逐字符一致 |
| 3 | schema + 冻结合同 | `schema/0001_initial.sql` + `freeze-contract.md` | sha256 复算一致；`check-demo-columns.mjs` |
| 4 | 2026 临床试验库 | `research/glioblastoma-cancer/` 四件套 | manifest=jsonl=sqlite 行数断言 |
| 5 | HTML 原型四件套 | `prototypes/v0.2/` | `file://` 直开 + 四必查件走查 |
| 6 | MinerU 解析六部件（18 号 v2） | `dsh/{mineru,settings,gbmparse,parse}.js` + 设置页 + `parse_job` 表 | 18 号 §13 采纳清单逐项 + 单测 |
| 7 | 文档体系 | `docs/` 本清单 + DIFF-MATRIX 等 8 件 | G1/G2/G3 签认留痕 |

## 二、照抄样板的产品要求（不许按比例缩减）

来源：lymphoma-workbench v0.3.0（移植样板）+ 家族契约（starter 02/03/07/20 号）。

- 顶栏三段式 + AI 五态（占位/无会话/创建中/就绪/降级）；Agent 面板在**右侧**，25%–45% 可拖宽、可独立隐藏/重开（`prompts/DSH-AGENT-PANE-INTEGRATION.md`）。
- 一图秀严格按 16 号规范：单调三次插值、末点 13px 避让、分类序列只画节点不连线、指标独立归一化。
- 3D 指标卡整卡 180° 翻转、背面迷你折线；分类记录不翻不连线。
- 字号基线 12.5px（大字 15px）；`[hidden]{display:none!important}`；页脚贴底。
- 设置页为一期功能（`docs/SETTINGS-DESIGN.md`）：资料目录状态、文档解析（MinerU Token 三态）、临床数据包来源/版本。

## 三、硬约束（每条带错误来源）

### 数据层（家族级，事故出处：starter LESSONS + ZERO-TO-DEV）

| # | 约束 | 错误来源 |
| --- | --- | --- |
| D1 | 复合主键表裸 `SELECT` 必须 `ORDER BY rowid` | 早期癌种读模型乱序，parity 红 |
| D2 | 手写倒序数组只 `ORDER BY ord` 不叠 `DESC` | 双重排序反序 |
| D3 | 可选字段显式写 `null`；读模型按 `=== null` 分支 | undefined/null 分支漏判 |
| D4 | 列名 `in_use`（`using` 是 SQLite 保留字） | 迁移直接报错 |
| D5 | 每节 `{title, rows}` 都有对应 `*_title` 列 | 发布前补列走 ALTER 的教训 |
| D6 | 分类指标 `dec IS NULL` 且 `kind ∈ {grade,qual}` | 分级卡串位 |
| D7 | 化验/体征 2–4 周一点延续到今天；影像/随访按真实频率**不加密** | 演示数据失真 |
| D8 | `events`/`docs`/`candidates` 快照里是**定长数组**；`assemble()` 中间量必须解构 | 多一个键 parity 就红 |
| D9 | 迁移只增不改；INSERT 写显式列名 + 显式问号数 | 升级丢列 |
| D10 | 演示数据唯一来源 `demo/build-demo-data.mjs`，同时产 sqlite 与 demo-data.js | 双数据源分叉 |

### 前端（家族级）

| # | 约束 | 错误来源 |
| --- | --- | --- |
| F1 | 图标 key 走别名兜底；内联 svg 必须给宽高 | 图标塌陷 |
| F2 | 二级页签按 `state.sub` 分流且穷举测试（不能先抓按钮再点，`render()` 重建 DOM） | 页签错配 |
| F3 | `apiBase` 不含 `/api`；面板参数唯一来源 `lib/layout.js` | 前缀拼接 404 |
| F4 | 无头实测必须出数字：导航数/面板宽度/`bodyScrollW===innerWidth`/error 与 4xx 计数 | 口头"没问题"不算验收 |

### 工程（家族级）

| # | 约束 | 错误来源 |
| --- | --- | --- |
| E1 | `VERSION` 唯一来源；`lib/version.js` 是生成物不手改 | 三处版本不同源 |
| E2 | 文案红线禁「建议治疗/可能复发/可以停药/无需就医/推荐方案/治愈率/生存率」；免责句放否定语境 | 发布检查红线 |
| E3 | 密钥不进源码/日志/发布包；`.gitignore` 含 `.secrets/` | 假 Token 落过工作区 |
| E4 | 不许换名复用样板业务字段；差异必须 DIFF-MATRIX 有据 | "换名癌种"反模式 |

### 本癌种专属（GBM，2026-10-24 起效）

| # | 约束 | 验证方式 | 依据 |
| --- | --- | --- | --- |
| G1 | 分子标志物（IDH1/2、MGMT 甲基化、1p/19q、TERT、EGFR）必须三态：检出/未检出/**未检测**；未检测 ≠ 阴性 | 读模型断言 + 界面三态走查 | 认领 issue 差异化矩阵 #1 |
| G2 | TTFields 电场档案：佩戴时长按**日**记录、贴片更换与皮肤反应独立轨道；不做"该不该戴"判断 | 文案红线扫描（无建议类词） | 矩阵 #2 |
| G3 | 随访影像页只**并列事实**（MRI 结论/当时激素用量/当时 KPS），禁任何判读性字段 | schema 无 `is_progression` 类列；词表测试 | 矩阵 #3（假性进展红线） |
| G4 | 激素剂量时间线与症状记录**同轴并排**，无减量建议 | parity + 红线扫描 | 矩阵 #4 |
| G5 | 双主体：记录行带 `visibility ∈ {shared,private}`（数据结构属性，非界面开关）；一图秀/摘要/导出**三处出口各自过滤**（过滤收敛为一个函数） | 三出口过滤单测 | 矩阵 #5（26 号 §4.3） |
| G6 | 癫痫发作为独立事件轨道，不并入化验/体征趋势 | 读模型断言 | 矩阵 #6 |
| G7 | 照护者线（决策清单/ACP 信息整理）只做信息整理，不出判断、不做疾病阶段强制 | 文案红线 | NEW-CANCER-WORKBENCH §四 |
| G8 | MinerU 按 18 号 v2 六部件：默认 `pipeline`、Token 文件优先、唯一 `mineru.json`、设置页 GET+POST 可存可清、`.html` 拒收、表格先 `htmlTablesToPipes()` 再对齐、单位先剥 LaTeX 壳、失败不产候选 | 18 号 §13 清单逐项 + `test/mineru-align.test.mjs` 含反例 | 18-MINERU-PARSING v2 |

## 四、本轮明确未做（不许在验收里算通过）

- dsh-desktop 装机（M6 之前不写"装机通过"）；市场投稿；真实病例数据。
- 扫描件/图片 OCR 质量、双栏排版、多页报告解析质量——18 号"未验证"清单原样继承，不写成"已支持"。
- 离线试验语料（ChiCTR/CDE/CTV 本地索引仅有胰腺癌覆盖）：GBM 只走在线四通道，覆盖缺口如实落库。

## 五、我替你定的默认值（可回退）

| 默认 | 理由 |
| --- | --- |
| 移植样板 = lymphoma v0.3.0 | 用户 2026-10-24 确认；本地最新且结构对齐 |
| 服务主体 = 双主体并重（患者 + 照护者代记） | 用户确认；GBM 认知受损特性 |
| 病程 = 全病程（含复发与照护决策/ACP 信息整理） | 用户确认；中位生存 15–20 月回避不了 |
| MinerU 本轮接入（M5 六部件） | 用户确认；18 号 v2 已标准化 |
| 品牌 = 占位名「小星宝」（StarPal），认领 issue 已标注 | 家族惯例占位，发布前可改 |
| 采集年份 = 2026（在线四通道） | 用户指定；unified-trial-mcp 规程 |
| 模型路由 = 主线 GLM-5.3，批量检索/核对经动态工作流路由 GLM-5.3-Flash | 用户 2026-10-24 确认可行 |
