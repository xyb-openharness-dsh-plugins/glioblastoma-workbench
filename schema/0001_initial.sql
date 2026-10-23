-- 0001_initial.sql · GBM 工作台初始迁移（G3 冻结版 · 2026-10-24）
-- 来源：schema/draft/{0001_gbm_specific,0002_family_tables}.sql 合并（草稿留档）。
-- 顺序：档案级 → 指标 → 通用 → GBM 专属 → 导入件。共 27 表。
-- 冻结规则：本文件 sha256 记入 schema/freeze-contract.md；此后结构变更只能新增 000N_*.sql（ALTER 追加），
--   不改本文件、不写 UPDATE/DELETE 迁移。
-- 四契约（ZERO-TO-DEV §1.2）：① 无判读列（无 is_conclusion/is_progression）② 缺测 NULL ≠ 0
--   ③ 更正只新增版本（revision/is_current 思想；触发器禁改禁删在 store 层执行）④ 事实四层不合并。
-- 硬约束：D1 复合主键查询 ORDER BY rowid；D3 可选显式 NULL；D4 列名 in_use；D5 分节 *_title；D9 显式列名。

-- ═══ 档案级（2）═══

CREATE TABLE workspace (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data_root TEXT,
  schema_version TEXT NOT NULL,
  dataset_state TEXT
);

CREATE TABLE profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date TEXT,
  gender TEXT,
  primary_role TEXT CHECK (primary_role IN ('PATIENT','CAREGIVER')),
  cognitive_flag TEXT CHECK (cognitive_flag IN ('stable','changed')),
  created_at TEXT NOT NULL
);

-- ═══ 指标（3）═══

CREATE TABLE metric_def (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit TEXT,
  category TEXT NOT NULL,
  color TEXT,
  is_numeric INTEGER NOT NULL DEFAULT 1,
  ctcae_rule TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE metric_point (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  code TEXT NOT NULL REFERENCES metric_def(code),
  measured_at TEXT NOT NULL,
  value_num REAL,
  value_text TEXT,
  source_note TEXT,
  revision INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE lab_result (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  panel TEXT,
  ref_range TEXT,
  document_id INTEGER
);

-- ═══ 通用（7；viewpoint 归入 GBM 专属组，带双主体字段）═══

CREATE TABLE adverse_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  term TEXT NOT NULL,
  ctcae_grade INTEGER,
  attribution_note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE symptom_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  symptom TEXT NOT NULL,
  severity_text TEXT,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE nutrition_log (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  intake_level TEXT CHECK (intake_level IN ('OK','REDUCED','MINIMAL')),
  weight_kg REAL,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE question (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('fact','view')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  asked_on TEXT,
  from_scenario TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE task (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_on TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE document (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','parsed','parse_failed')),
  imported_at TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE saved_trial (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  trial_key TEXT NOT NULL,
  saved_at TEXT NOT NULL
);

-- ═══ GBM 专属（12）═══

-- 分子标志物三态（G1 红线：未检测 ≠ 阴性）
CREATE TABLE molecular_marker (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profile(id),
  marker TEXT NOT NULL CHECK (marker IN (
    'IDH1_R132H','IDH2','MGMT_PROMOTER','P19Q_CODEL','TERT_PROMOTER',
    'EGFR_AMP','CDKN2AB_DEL','BRAF_V600E','MMR_MSI','OTHER')),
  status TEXT NOT NULL CHECK (status IN ('detected','not_detected','not_tested')),
  method TEXT,
  specimen_date TEXT,
  report_doc_id INTEGER,
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE molecular_marker_title (
  marker TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 手术与切除程度（医生报告原文，产品不判定）
CREATE TABLE surgery_record (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  surgery_date TEXT NOT NULL,
  resection_degree TEXT CHECK (resection_degree IN ('GTR','NTR','STR','BIOPSY','OTHER')),
  intraop_notes TEXT,
  hospital TEXT,
  pathology_summary TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);

-- 放化疗周期（Stupp 同步段 / 辅助 TMZ / 短程放疗 / 再照射）
CREATE TABLE onco_cycle (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('CONCURRENT_RT_TMZ','ADJUVANT_TMZ','SHORT_RT','REIRRADIATION','OTHER')),
  cycle_number INTEGER,
  start_date TEXT,
  end_date TEXT,
  rt_total_gy REAL,
  rt_fractions INTEGER,
  tmz_regimen TEXT,
  status TEXT CHECK (status IN ('planned','ongoing','completed','stopped','changed')),
  stop_reason TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);

-- 电场治疗日记录（G2：无"该不该戴"判断）
CREATE TABLE ttfields_daily (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  wear_hours REAL,
  arrays_changed_front INTEGER CHECK (arrays_changed_front IN (0,1)),
  arrays_changed_back INTEGER CHECK (arrays_changed_back IN (0,1)),
  skin_reaction TEXT,
  device_note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 随访影像并列事实（G3 红线：无判读列）
CREATE TABLE mri_followup (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  report_excerpt TEXT,
  steroid_mg_at_time REAL,
  kps_at_time INTEGER,
  next_exam_plan TEXT,
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 激素剂量（G4：与症状同轴，无减量建议）
CREATE TABLE steroid_dose (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  change_date TEXT NOT NULL,
  dexamethasone_mg REAL NOT NULL,
  change_kind TEXT CHECK (change_kind IN ('START','INCREASE','DECREASE','STOP','STEADY')),
  reason_note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 癫痫独立事件轨道（G6：不并入指标趋势）
CREATE TABLE seizure_event (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  onset_at TEXT NOT NULL,
  duration_min REAL,
  seizure_type TEXT CHECK (seizure_type IN ('AURA','FOCAL','FOCAL_TO_BILATERAL','GENERALIZED','UNKNOWN')),
  trigger_note TEXT,
  witnessed_by TEXT CHECK (witnessed_by IN ('PATIENT','CAREGIVER','OTHER')),
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE aed_medication (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  drug TEXT NOT NULL,
  dose TEXT,
  start_date TEXT,
  end_date TEXT,
  level_checked_date TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 双主体看法（G5：visibility 是数据结构属性；26 号 §4.3）
CREATE TABLE viewpoint (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),
  visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private')),
  topic TEXT CHECK (topic IN ('MOOD','COGNITION_CHANGE','CARE_BURDEN','FAMILY','DECISION_ACP','OTHER')),
  content TEXT NOT NULL,
  record_date TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 照护决策线索（G7：讨论状态，非医学结论）
CREATE TABLE decision_checklist (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','discussed','filed')),
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- 认知/功能量表（只抄分，不做趋势解读）
CREATE TABLE cog_assessment (
  id INTEGER PRIMARY KEY,
  profile_id TEXT NOT NULL,
  assess_date TEXT NOT NULL,
  scale TEXT NOT NULL CHECK (scale IN ('MOCA','MMSE','KPS','OTHER')),
  score REAL,
  score_max REAL,
  done_by TEXT CHECK (done_by IN ('SELF','CAREGIVER','CLINICIAN')),
  ord INTEGER NOT NULL DEFAULT 0
);

-- ═══ 导入件（3，18 号 v2 语义）═══

CREATE TABLE import_file (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  byte_size INTEGER NOT NULL,
  mime TEXT,
  in_use INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE parse_job (
  id INTEGER PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES document(id),
  requested_at TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('running','succeeded','failed')),
  error_code TEXT,
  error_message TEXT
);

CREATE TABLE candidate (
  id INTEGER PRIMARY KEY,
  parse_job_id INTEGER NOT NULL REFERENCES parse_job(id),
  field_name TEXT NOT NULL,
  value_text TEXT,
  value_num REAL,
  unit TEXT,
  confirmed INTEGER NOT NULL DEFAULT 0,
  confirmed_at TEXT,
  target_table TEXT,
  target_id INTEGER
);
