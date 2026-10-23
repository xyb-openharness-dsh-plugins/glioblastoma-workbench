# research/glioblastoma-cancer · GBM 2026 临床试验数据包

> 采集工具：unified-trial-mcp v0.3.1（MCP stdio，唯一入口）
> 采集脚本：`scripts/fetch-glioblastoma-trials-2026.mjs`（`--dry-run` 支持；同口径重跑可复现）
> 口径与诚实边界：见 `docs/CLINICAL-DATA-2026.md`；本 README 记录实跑终态。

## 文件

| 文件 | 内容 |
| --- | --- |
| `trials-2026.jsonl` | 每行一条试验（含 mergedSources、registryNumbers、来源 URL、快照日） |
| `glioblastoma_cancer_trials_2026.sqlite` | `trials`（记录）+ `source_statuses`（逐源终态）两张表 |
| `manifest.json` | 记录数一致性断言 + 文件 sha256 + 诚实边界声明 |

## 最近一次采集终态（快照 2026-10-24）

| 来源 | 终态 | 说明 |
| --- | --- | --- |
| chinadrugtrials（CDE） | SUCCESS（84 条） | 在线（Cookie 合法） |
| ctv | SUCCESS（英文词 24 条；中文词 NO_RESULTS 属预期，索引为英文） | 本地子集索引 |
| chictr_online | FAILED（两轮重试仍失败，非短时限流；首轮探测时可出数） | **未查过，不计入覆盖**；后续会话补采 |
| ictrp | FAILED（两轮重试仍失败） | **未查过，不计入覆盖**；后续会话补采 |
| xyb_chinadrugtrials_archive | NO_RESULTS / SUCCESS(0) | 离线包仅胰腺癌覆盖，GBM 无覆盖属正常 |
| chictr_pancreatic_archive | NEEDS_SETUP | 同上，未配置 GBM 语料（本就不适用） |

**纪律**：FAILED/NEEDS_SETUP 状态的缺失不得解读为"不存在相关试验"；补采后本表与 manifest 同步更新。

## 使用边界（产品文案必读）

- 所有登记状态一律显示"登记状态，未核实"；登记 ≠ 有效 ≠ 安全 ≠ 可入组。
- 同一登记号（NCT/ChiCTR/CDE）合并，其余并排保留来源。
- 检索命中的 TMZ 生物等效性研究等非介入性研究属登记事实，产品展示时按 studyType 原文标注，不筛选、不隐藏。
