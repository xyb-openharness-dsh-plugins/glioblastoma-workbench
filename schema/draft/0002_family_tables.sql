-- 家族通用表草案（Phase1 · schema/draft/，未冻结、不执行）
-- 结构平移自 lymphoma v0.3.0 的 29 表骨架（research-notes/family-landscape.md §二），
-- GBM 适配点：viewpoint/decision_checklist 已在 0001_gbm_specific.sql（带 author_role + visibility，
-- 故本文件通用组为 7 张而非 8 张）；导入三表按 starter 18-MINERU-PARSING v2 语义。
-- 语义红线（家族 SCHEMA-SPEC）：只增不覆盖；缺测写 NULL；事件日期不得未来（task.due_on 豁免）；
-- 导入不克隆；私密默认关；不落派生结论（无预后表、无判读表）。
-- 硬约束对齐：D1 ORDER BY rowid；D3 显式 null；D4 in_use；D5 分节 *_title；D9 迁移只增不改。

-- ── 档案级（2）──────────────────────────────────────────────
CREATE TABLE workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),          -- 全局单行
  data_root TEXT,                                  -- 用户确认的资料目录
  schema_version TEXT NOT NULL,
  dataset_state TEXT                               -- 临床数据包来源/版本/核验（设置页第三区同源）
);
CREATE TABLE profile (
  id TEXT PRIMARY KEY,                             -- demo: p1/p2；真机：用户档案
  name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT,
  primary_role TEXT CHECK (primary_role IN ('PATIENT','CAREGIVER')),   -- 双主体：主记录人（GBM 新增）
  cognitive_flag TEXT CHECK (cognitive_flag IN ('stable','changed')),  -- 认知状态标记（GBM 新增，仅展示用）
  created_at TEXT NOT NULL
);

-- ── 指标（3）──────────────────────────────────────────────
CREATE TABLE metric_def (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,                          -- 血象/激素/电解质/体征…
  color TEXT,
  is_numeric INTEGER NOT NULL DEFAULT 1,           -- 0 = 分类序列，不进趋势（KPS/发作类型）
  ctcae_rule TEXT,                                 -- 绝对阈值 or ×ULN 型标识（23 号）；NULL = 不分级
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE metric_point (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  code TEXT NOT NULL REFERENCES metric_def(code),
  measured_at TEXT NOT NULL,
  value_num REAL,                                  -- '<0.5' 类画不出但显示 → value_text 保原文（D3）
  value_text TEXT,
  source_note TEXT,                                -- 来源（"C3D22 化验单"）
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE lab_result (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  panel TEXT,                                      -- 单据级归档：报告名/医院
  ref_range TEXT,                                  -- 本单参考范围原文（×ULN 型必需，23 号）
  document_id INTEGER REFERENCES document(id)
);

-- ── 通用（7；viewpoint 在 0001）───────────────────────────
CREATE TABLE adverse_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  term TEXT NOT NULL,                              -- 患者语言描述
  ctcae_grade INTEGER,                             -- 原值照抄（有则记）；NULL = 未分级
  attribution_note TEXT,                           -- "XX 药相关"必须是医生/记录原文
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE symptom_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  symptom TEXT NOT NULL,
  severity_text TEXT,                              -- 患者自述词
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),  -- 双源标签（GBM 新增，ICC 证据）
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE nutrition_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  intake_level TEXT CHECK (intake_level IN ('OK','REDUCED','MINIMAL')),       -- 吃得下/勉强/吃不下
  weight_kg REAL,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE question (                            -- 想问的事（fact/view 两区导出）
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fact','view')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  asked_on TEXT,                                   -- 勾"已问过"
  from_scenario TEXT,                              -- 来源场景 S 编号（交互路径文档同源）
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE task (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_on TEXT,                                     -- 唯一允许未来日期
  done INTEGER NOT NULL DEFAULT 0,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE document (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,                            -- 同哈希不重复导入（不重置已解析状态）
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','parsed','parse_failed')),
  -- 注意 18 号 v2：状态只有 待解析/待核对/解析失败 三个终态，"解析中"只在内存/任务表，绝不写本列
  imported_at TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE saved_trial (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  trial_key TEXT NOT NULL,                         -- 只存 key+日期，无药物说明（家族 D22）
  saved_at TEXT NOT NULL
);

-- ── 导入件（3，0002 迁移位；18 号 v2 语义）──────────────
CREATE TABLE import_file (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  byte_size INTEGER NOT NULL,
  mime TEXT,
  in_use INTEGER NOT NULL DEFAULT 1                -- D4：using 是保留字
);
CREATE TABLE parse_job (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  requested_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('running','succeeded','failed')),  -- 重试新增行，旧失败记录保留
  error_code TEXT,                                 -- NO_TOKEN/UNAUTHORIZED/TASK_FAILED/TIMEOUT/NO_MARKDOWN/NETWORK
  error_message TEXT
);
CREATE TABLE candidate (
  id INTEGER PRIMARY KEY,
  parse_job_id INTEGER NOT NULL REFERENCES parse_job(id),
  field_name TEXT NOT NULL,
  value_text TEXT,
  value_num REAL,
  unit TEXT,                                       -- 已剥 LaTeX 壳并归一（18 号 §7.1）
  confirmed INTEGER NOT NULL DEFAULT 0,            -- 逐项核对；失败事务绝不产候选
  confirmed_at TEXT,
  target_table TEXT,
  target_id INTEGER
);
