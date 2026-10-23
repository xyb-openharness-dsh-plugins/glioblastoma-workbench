# 临床试验数据 2026（CLINICAL-DATA-2026）

> 规程（ZERO-TO-DEV §1.3）：唯一入口 unified-trial-mcp（`~/Downloads/unified_search_trials`）；
> 脚本 `scripts/fetch-glioblastoma-trials-2026.mjs` 支持 `--dry-run`，同口径重跑可复现。
> 状态：M4 执行时填数据；本文先钉口径与诚实边界。

## 通道覆盖（就绪/超时/未配置/部分覆盖/截断，逐源终态落库）

| 通道 | 覆盖 | 说明 |
| --- | --- | --- |
| ictrp（WHO ICTRP） | 在线，将查 | 全球广度 |
| ctv（Veeva CTV / ClinicalTrials.gov 深度） | 在线，将查 | 本地索引 |
| chictr_online（ChiCTR 实时） | 在线，将查 | 中国注册 |
| chinadrugtrials（CDE，含 PI） | 在线，将查 | 中国药审 |
| ChiCTR 离线语料 | **未配置（无 GBM 覆盖）** | 离线语料仅胰腺癌，不假装已查 |
| 小胰宝归档 | **未配置（无 GBM 覆盖）** | 同上 |

## 诚实边界（不可让步）

- "0 条结果"必须带该来源自己的覆盖声明；"没查到"≠"不存在"。
- 登记状态一律显示"登记状态，未核实"；登记 ≠ 有效 ≠ 安全 ≠ 可入组。
- 多通道结果只在"确认同一登记身份"时合并，其余并排保留来源。
- 数据截止日、每次采集的条数与 sha256 写进 manifest；manifest 记录数 = jsonl 行数 = sqlite 行数。

## 采集关键词口径（M4 前冻结，中英双语）

- 中文：胶质母细胞瘤 / 胶质瘤四级 / 复发胶质母细胞瘤 / 神经胶质瘤
- 英文：glioblastoma / GBM / glioblastoma multiforme / recurrent glioblastoma / high-grade glioma（检索用，入库保留原文）
- 成分词（第二层筛选，不作为主检索）：IDH / MGMT / TTFields / tumor treating fields / 电场

## 交付物（M4）

`research/glioblastoma-cancer/{manifest.json, trials-2026.jsonl, glioblastoma_cancer_trials_2026.sqlite, README.md}`
