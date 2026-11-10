# 小星宝 StarPal · 胶质母细胞瘤工作台

面向胶质母细胞瘤（GBM）患者与照护者的**本机资料整理工作台**：把散落的手术、病理与分子检测、
MRI 随访、放化疗与电场治疗、血象与症状记录整理成可核对、可回溯的资料，并整理成复诊时能带着走的问题清单。

> 本工作台只提供信息，**不做诊断、不做处置建议**。判读与决定由患者及其神经肿瘤治疗团队做出。
> 用户自己记下的担心或判断按"一条信息"保存，并标注"不是医生结论"，不进趋势、不进摘要事实区。

- 当前版本：**v0.1.9**（开发版 · 数据仅在本机）
- 宿主形态：DSH Desktop 工作台（customFrame，可拉起原生会话）
- 许可证：UNLICENSED · 仓库私有 · **未上架市场**

## 疾病概要

> 四段固定：定义 → 医学资料规范和指南情况 → 目前治疗全景概要 → 发展趋势。整体属**解释层**（第 ② 层）：
> 只整理公开信息，不判断你的病情。原型看板右上角的「?」看同一份内容的整页版。
> 原件状态照实写：国家卫健委 2022 版全文已取得；CACA 2022 精简版本地存档已核数，但公开原件不可验证
> （期刊 DOI 403、cjco.cn 证书失效），按二次来源标注；CACA V2.0_2025、CSCO、NCCN 原文均未取得
> （登录墙 / 订阅），页码一律「页码待核」。

### 定义

胶质母细胞瘤（GBM）是起源于中枢神经系统的弥漫性胶质瘤。WHO 2021 分类要求「整合诊断」——组织学所见与分子标记一起写进诊断，单看形态已经不够。

据国家卫健委 2022 年版指南原文：IDH 野生且 H3 野生的弥漫性胶质瘤，出现坏死 / 微血管增生，或 TERT 突变、EGFR 扩增、+7/-10 三者之一，即可诊断为「胶质母细胞瘤，IDH 野生型」。本台记录的分子项包括 IDH、MGMT 启动子甲基化、TERT、EGFR、+7/-10、H3 等，一律照报告原文，不由工作台推断。

本台不以 TNM 作默认结构：记录的是手术与切除范围、病理与分子、MRI 随访、放化疗与电场治疗、KPS 与症状。指南原文提到「假性进展」的语境多见于同步放化疗结束后 3 个月内；本台只记录影像结论原文与日期，不判断是进展还是假性进展。

**来源**：国家卫健委 · 脑胶质瘤诊疗指南（2022 年版）· 2022 · [原件已取得 · 打开/下载 ↗](https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml) · 页码待核 ｜ WHO · Classification of Tumours of the Central Nervous System, 5th ed. · 2021 · [未取得原件，据二次来源 ↗](https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Central-Nervous-System-Tumours-2021) · 页码待核 ｜ CACA · 脑胶质瘤诊疗指南（2022 精简版）· 2022 · [未取得原件，据二次来源 ↗](https://www.medsci.cn/guideline/show_article.do?id=2379e1c003e9a140) · 页码待核（期刊 DOI 403、cjco.cn 证书失效）

### 医学资料规范和指南情况

| 机构 | 文件 | 版本 / 年份 | 原件 | 本台的用途 |
|---|---|---|---|---|
| 国家卫健委 | 脑胶质瘤诊疗指南（2022 年版） | 2022（国卫办医函〔2022〕104 号） | [已取得 · 全文 PDF 已提取](https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml) | 手术、放疗、替莫唑胺同步 / 辅助、老年 KPS 分层、复发后选项的原文依据 |
| CACA | 脑胶质瘤诊疗指南（2022 精简版） | 2022（中国肿瘤临床 49(16):811-818） | [未取得原件 · 期刊页 403，据二次来源](https://www.medsci.cn/guideline/show_article.do?id=2379e1c003e9a140) | 中文规范层的对照口径（本地存档已核数，公开原件不可验证） |
| CACA | 脑胶质瘤诊疗指南 V2.0_2025 | V2.0_2025（20250110；平台记为 2024-12-20） | [未取得原件 · 平台页需登录下载](https://cacaguidelines.cacakp.com/pdflist/detail?id=415) | 只登记其存在与版本号，推荐分级未核实，不引用条文 |
| CSCO | CSCO 脑胶质瘤诊疗指南 | 2024 / 2025（具体版本号仍未核实） | 未取得原件 · 官网无公开文件页，检索仅见会议报道 | 只登记其存在，不引用条文 |
| NCCN | NCCN Guidelines · Central Nervous System Cancers | V3.2026（2026-10-27 官网核到版本号） | [未取得原件 · PDF 需注册](https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1425) | 范围参照；随访节奏目前依据二手实践卡，不当作原文 |
| WHO | Classification of Tumours of the Central Nervous System, 5th ed. | 2021（IARC 出版，第 6 卷） | [未取得原件 · IARC 书目页](https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Central-Nervous-System-Tumours-2021) | 整合诊断与命名的口径 |

本台的中文规范以国家卫健委 2022 版为主，NCCN 仅作范围参照；两者版本差要写清，不合并、不互相填补。CACA V2.0_2025 与 CSCO 在官方平台 / 出版物之外未取得全文，取得前不写「按最新指南设计」，也不引用其具体条文。未取得原件的文件只记「存在」与「大致讲什么」，页码一律写待核。

**来源**：见上表逐行。

### 目前治疗全景概要

下面按期别与线序列出指南里出现过的手段类别。这是「世界上大致有哪些办法」的地图，不是给你排的先后顺序，也不含任何剂量、疗程与适用条件。

- **新诊断（初治）**：手术（切除范围按术后记录原文照抄）；常规分割放疗与短程放疗；替莫唑胺同步放化疗；替莫唑胺辅助治疗；电场治疗（TTFields）。
- **老年 / KPS 分层情形**：据国家卫健委 2022 版原文，>70 岁、KPS≥60 者短程或常规放疗联合替莫唑胺被列出，KPS<60 者短程放疗或替莫唑胺单药被列出；NCCN 对 KPS≥60 的老年患者另列电场治疗（本条转述自二手资料，原件未取得）。
- **复发后**：指南另列一组选项（本项目记录为「9 类选项清单」），再次手术、再次放疗、全身治疗与临床试验都在这一组里出现；本台尚未逐条整理，具体条目待取得原文后补。
- **贯穿全程**：随访影像的指南语境节奏为放疗后 2–8 周首次复查 MRI、之后每 2–4 个月 × 3 年、再每 3–6 个月长期随访（本条目前依据二手实践卡，原文未取得，本台只记医生给的实际日期）；癫痫、激素使用、血象与 KPS 按记录原文呈现，不给处理建议。

> 以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。

**来源**：国家卫健委 · 脑胶质瘤诊疗指南（2022 年版）· 2022 · [原件已取得 · 打开/下载 ↗](https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml) · 页码待核 ｜ NCCN · NCCN Guidelines · Central Nervous System Cancers · V3.2026（2026-10-27 核） · [未取得原件，据二次来源 ↗](https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1425) · 页码待核

### 发展趋势

这一段只写已经发生的事：哪份文件换了版本、哪一年发布、分类体系改了什么。不写预测，不做评价，也不给任何倾向。

- 2021 年：WHO 中枢神经系统肿瘤分类第 5 版（WHO CNS5）发布，诊断改为整合诊断（组织学 + 分子），「胶质母细胞瘤，IDH 野生型」成为独立诊断类型。
- 2022 年：国家卫健委《脑胶质瘤诊疗指南（2022 年版）》发布。
- 2022 年：CACA《脑胶质瘤诊疗指南》2022 精简版发布。
- 2025 年：CACA《脑胶质瘤诊疗指南》V2.0_2025 版存在；本项目未取得全文，推荐分级未核实。
- 2024 / 2025 年：CSCO 脑胶质瘤分子诊疗相关版本存在；本项目未取得全文，具体版本号未核实。

**来源**：WHO · Classification of Tumours of the Central Nervous System, 5th ed. · 2021 · [未取得原件，据二次来源 ↗](https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Central-Nervous-System-Tumours-2021) · 页码待核 ｜ 国家卫健委 · 脑胶质瘤诊疗指南（2022 年版）· 2022 · [原件已取得 · 打开/下载 ↗](https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml) · 页码待核 ｜ CACA · 脑胶质瘤诊疗指南（2022 精简版 / V2.0_2025）· 2022 / 2025 · [未取得原件，据二次来源 ↗](https://cacaguidelines.cacakp.com/pdflist/detail?id=415) · 页码待核（2022 精简版期刊页 403，二次来源另见 MedSci；V2.0_2025 本台未取得） ｜ CSCO · CSCO 脑胶质瘤诊疗指南 · 2024 / 2025（未核实）· 未取得原件 · 未找到可达的公开文件页，不编链接

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
[Release v0.1.8](https://github.com/xyb-openharness-dsh-plugins/glioblastoma-workbench/releases/tag/v0.1.9)
的 `xyb-community-glioblastoma-workbench-0.1.9.tgz`
（sha256 `6bef9f33e8256f5c18e5c707cf92dd6d43bd656f47979a3d852781da82dcf525`）。

```bash
cd ~/Library/Application\ Support/dsh-desktop/harness/profiles/web
NODE_OPTIONS= corepack pnpm add -w --save-exact file:/绝对路径/xyb-community-glioblastoma-workbench-0.1.9.tgz
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
