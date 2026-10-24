# Schema 冻结合同（G3）· 2026-10-24

| 项 | 值 |
| --- | --- |
| 文件 | `schema/0001_initial.sql` |
| sha256 | `8b08f68f0029b48cc06afb11c3c06e3f9c65b4cae2c4fab7e6761b04ac514ac0` |
| 表数 | 27（档案 2 + 指标 3 + 通用 7 + GBM 专属 12 + 导入 3） |
| 冻结日 | 2026-10-24（用户 G1/G2 确认后执行；G3 签认人 samqin123） |
| 验证 | 内存库实测 27 表全建；判读列断言 PASS（无 is_conclusion/is_progression 类列） |

## 内容边界

档案级：workspace / profile（双主体 primary_role + cognitive_flag）。
指标：metric_def（is_numeric=0 不进趋势）/ metric_point（value_num+value_text 双轨）/ lab_result（ref_range 原文）。
通用：adverse_event / symptom_log（author_role 双源）/ nutrition_log / question（fact/view + from_scenario）/ task / document（三态，"解析中"不落库）/ saved_trial。
GBM 专属：molecular_marker(+title)（三态）/ surgery_record / onco_cycle / ttfields_daily / mri_followup（并列事实）/ steroid_dose / seizure_event / aed_medication / viewpoint（visibility 数据结构属性）/ decision_checklist / cog_assessment。
导入：import_file（in_use）/ parse_job（重试留痕）/ candidate（逐项核对）。

## 冻结规则

1. 本文件 sha256 与 `schema/0001_initial.sql` 实算一致才可继续；不一致即冻结破坏，停线排查。
2. 结构变更**只能新增** `000N_*.sql`（ALTER 追加 / 新表），不修改 0001，不写 UPDATE/DELETE 迁移。
3. 分节补列（如 `\*_title`）走 ALTER 追加（D5 教训）。
4. 解冻（极端情况）需用户书面确认并在本文件追加解冻记录。

## 变更记录（0001 冻结后追加）

| 日期 | 文件 | 内容 | 依据 |
| --- | --- | --- | --- |
| 2026-10-24（M5） | `0002_parity_columns.sql` | ALTER 追加 8 列（profile×2 / onco_cycle×6 / seizure_event / aed_medication / cog_assessment / molecular_marker 共 12 列）+ 新表 3 张（ttfields_meta / ttfields_monthly / trial_lead） | 冻结规则 2/3：0001 未动（sha256 仍为上表值）；缺列在 M5 移植 parity 实测中发现，属“发布前发现漏列走 ALTER”的家族既有路径（ZERO-TO-DEV §1.2 / D5） |

## 追认记录

| 日期 | 迁移 | 追认 |
| --- | --- | --- |
| 2026-10-24 | `0002_parity_columns.sql`（ALTER 12 列 + ttfields_meta / ttfields_monthly / trial_lead 3 表） | **用户追认 ✅**（原话"确认0002"，会话） |
