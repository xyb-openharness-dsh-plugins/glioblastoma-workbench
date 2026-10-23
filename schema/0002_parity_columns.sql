-- 0002_parity_columns.sql · 演示数据读模型 parity 补列（M5，2026-10-24）
-- 依据：freeze-contract.md 冻结规则第 2 条——结构变更只能新增 000N_*.sql（ALTER 追加 / 新表），不改 0001。
-- 缺列来源（M5 移植实测发现，已在交付报告记录）：0001 冻结时按“事实最小集”设计，
--   未覆盖 demo-data.js 形状里的以下字段；不补列则 readmodels parity（唯一验收）无法成立。
-- 规则：只 ADD COLUMN / 新表；不 UPDATE、不 DELETE、不改 0001；所有新列可空或有默认值。

-- 档案级：诊断行与阶段行（引用医生语境的展示行，非判读）
ALTER TABLE profile ADD COLUMN diagnosis TEXT;
ALTER TABLE profile ADD COLUMN stage_line TEXT;

-- 放化疗周期：执行记录原文 / 顺延天数 / 剂量调整原文 / 下一节点 / 复发评估语境（引用原文）
--   delay_days=0 表示按计划；NULL 表示未记录（与 0 区分，D3）
ALTER TABLE onco_cycle ADD COLUMN rt_regimen TEXT;
ALTER TABLE onco_cycle ADD COLUMN took_note TEXT;
ALTER TABLE onco_cycle ADD COLUMN delay_days INTEGER;
ALTER TABLE onco_cycle ADD COLUMN dose_adjust TEXT;
ALTER TABLE onco_cycle ADD COLUMN next_on TEXT;
ALTER TABLE onco_cycle ADD COLUMN recurrence_note TEXT;

-- 发作事件补充备注（记录原文）
ALTER TABLE seizure_event ADD COLUMN note TEXT;

-- 抗癫痫药血药浓度结论（报告原文）
ALTER TABLE aed_medication ADD COLUMN level_note TEXT;

-- 量表分数附注（只抄分语境说明，不做趋势解读）
ALTER TABLE cog_assessment ADD COLUMN note TEXT;

-- 分子标志物报告原值（如 Ki-67 约 40%；照抄原文，不折算）
ALTER TABLE molecular_marker ADD COLUMN value_text TEXT;

-- 电场治疗档案级信息：开始日与目标语境说明（G2：无“该不该戴”判断，target_hint 只存说明文字）
CREATE TABLE ttfields_meta (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL UNIQUE REFERENCES profile(id),
  started_on TEXT,
  target_hint TEXT
);

-- 电场设备月报使用率（按月登记，不按日估算；来源随行保存）
CREATE TABLE ttfields_monthly (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  month TEXT NOT NULL,
  rate REAL NOT NULL,
  source_note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 试验线索登记样例（登记状态，未核实；演示/采集样例，不做推荐）
CREATE TABLE trial_lead (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  trial_key TEXT NOT NULL,
  title TEXT NOT NULL,
  phase TEXT,
  status_text TEXT,
  source_channel TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
