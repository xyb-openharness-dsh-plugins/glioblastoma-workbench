-- GBM 专属表草案（Phase1 · schema/draft/，未冻结、不执行）
-- 四契约（ZERO-TO-DEV §1.2）：
--   ① 看法恒不为结论：全文件无 is_conclusion / is_progression / 提示复发 类列
--   ③ 更正只新增版本：业务表带 revision/更正走新增行，不覆盖
--   ④ 事实四层（文档/候选/记录/指标）不合并：本文件只有"记录"层
-- 通用 8 张 + 指标 3 张 + 档案级表：等 family-landscape 调研回来后并入 0002 草案文件。
-- 硬约束对齐（DEV-REQUIREMENTS §三）：D4 in_use；D5 分节 *_title；G1 三态；G3 并列事实；G5 visibility。

-- ── G1 分子标志物：三态是产品红线 ───────────────────────────────
CREATE TABLE molecular_marker (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  marker TEXT NOT NULL CHECK (marker IN (
    'IDH1_R132H','IDH2','MGMT_PROMOTER','P19Q_CODEL','TERT_PROMOTER',
    'EGFR_AMP','CDKN2AB_DEL','BRAF_V600E','MMR_MSI','OTHER')),
  status TEXT NOT NULL CHECK (status IN ('detected','not_detected','not_tested')),
  method TEXT,                -- 检测方法原文（IHC/NGS/焦磷酸测序…，未披露写 NULL）
  specimen_date TEXT,         -- 标本/报告日期
  report_doc_id INTEGER,      -- 关联文档四层的 docs.id（可空：口述/转述来源）
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1   -- 契约③：更正新增行不覆盖
);
-- 查询恒 ORDER BY rowid（D1）；marker 标题映射表（D5 分节）
CREATE TABLE molecular_marker_title ( marker TEXT PRIMARY KEY, title TEXT NOT NULL, ord INTEGER NOT NULL DEFAULT 0 );

-- ── 手术记录：切除程度是独立事实线 ─────────────────────────────
CREATE TABLE surgery_record (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  surgery_date TEXT NOT NULL,
  resection_degree TEXT CHECK (resection_degree IN ('GTR','NTR','STR','BIOPSY','OTHER')) ,  -- 全切/近全切/部分/活检；医生报告原文，产品不判定
  intraop_notes TEXT,         -- 术中唤醒/黄荧光/导航等，报告原文摘录
  hospital TEXT,
  pathology_summary TEXT,     -- 病理结论摘录（WHO 2021 分级等，抄写不判断）
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);

-- ── 放化疗周期：Stupp 同步段 + 辅助 TMZ 段 + 短程放疗（老年路径）──
CREATE TABLE onco_cycle (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('CONCURRENT_RT_TMZ','ADJUVANT_TMZ','SHORT_RT','REIRRADIATION','OTHER')),
  cycle_number INTEGER,      -- 辅助 TMZ 第 n 周期（28 天日历 D1–D5）
  start_date TEXT, end_date TEXT,
  rt_total_gy REAL, rt_fractions INTEGER,          -- 放疗剂量/分割（同步 60Gy/30f 或短程，抄报告）
  tmz_regimen TEXT,          -- '75mg/m2_daily'|'150-200mg/m2_D1-5' 等方案原文
  status TEXT CHECK (status IN ('planned','ongoing','completed','stopped','changed')),
  stop_reason TEXT,
  ord INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
);

-- ── G2 电场治疗（TTFields）：日记录 ────────────────────────────
CREATE TABLE ttfields_daily (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  record_date TEXT NOT NULL,
  wear_hours REAL,           -- 当日佩戴小时数（目标语境 ≥18h/天由解释层给出，本表不存结论）
  arrays_changed_front INTEGER CHECK (arrays_changed_front IN (0,1)),
  arrays_changed_back INTEGER CHECK (arrays_changed_back IN (0,1)),
  skin_reaction TEXT,        -- 头皮反应患者描述（抄写；分级走指标层 kind='qual'）
  device_note TEXT,          -- 设备报警/月度使用率报告摘录
  ord INTEGER NOT NULL DEFAULT 0
);

-- ── G3 随访影像：只并列事实，无任何判读列 ───────────────────────
CREATE TABLE mri_followup (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  exam_date TEXT NOT NULL,
  report_excerpt TEXT,        -- 报告结论原文摘录（"术区强化范围较前增大"这类话只抄不判）
  steroid_mg_at_time REAL,    -- 当时地塞米松 mg/日（可 NULL）
  kps_at_time INTEGER,        -- 当时 KPS（可 NULL）
  next_exam_plan TEXT,        -- 报告/医嘱写的下次计划（抄写）
  report_doc_id INTEGER,
  ord INTEGER NOT NULL DEFAULT 0
);

-- ── G4 激素剂量：与症状同轴（症状在通用 symptom 表）────────────
CREATE TABLE steroid_dose (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  change_date TEXT NOT NULL,
  dexamethasone_mg REAL NOT NULL,     -- 当时日剂量
  change_kind TEXT CHECK (change_kind IN ('START','INCREASE','DECREASE','STOP','STEADY')),
  reason_note TEXT,                    -- 医嘱语境摘录；产品不给减量建议（G4 红线）
  ord INTEGER NOT NULL DEFAULT 0
);

-- ── G6 癫痫独立事件轨道 ────────────────────────────────────────
CREATE TABLE seizure_event (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  onset_at TEXT NOT NULL,              -- 发作时间（可含日期时间）
  duration_min REAL,
  seizure_type TEXT CHECK (seizure_type IN ('AURA','FOCAL','FOCAL_TO_BILATERAL','GENERALIZED','UNKNOWN')),
  trigger_note TEXT,                   -- 诱因（漏药/睡眠/发热…，照护者代记常见）
  witnessed_by TEXT CHECK (witnessed_by IN ('PATIENT','CAREGIVER','OTHER')),  -- 双主体：谁看到的
  ord INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE aed_medication (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  drug TEXT NOT NULL,
  dose TEXT,
  start_date TEXT, end_date TEXT,
  level_checked_date TEXT,             -- 血药浓度监测日（数值走指标层）
  ord INTEGER NOT NULL DEFAULT 0
);

-- ── 双主体与照护（G5/G7）──────────────────────────────────────
CREATE TABLE viewpoint (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('PATIENT','CAREGIVER')),   -- 谁写的
  visibility TEXT NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared','private')),  -- 数据结构属性（26号§4.3）
  topic TEXT CHECK (topic IN ('MOOD','COGNITION_CHANGE','CARE_BURDEN','FAMILY','DECISION_ACP','OTHER')),
  content TEXT NOT NULL,
  record_date TEXT NOT NULL,
  ord INTEGER NOT NULL DEFAULT 0
);
-- 照护决策线索：只整理信息不做判断（G7）
CREATE TABLE decision_checklist (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  topic TEXT NOT NULL,        -- 如"驾照与安全""预立照护话题""照护安排"
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','discussed','filed')),  -- 讨论状态，不是医学结论
  note TEXT,
  ord INTEGER NOT NULL DEFAULT 0
);

-- ── 认知/功能量表（数值型，入库只抄分）─────────────────────────
CREATE TABLE cog_assessment (
  id INTEGER PRIMARY KEY,
  subject_id TEXT NOT NULL,
  assess_date TEXT NOT NULL,
  scale TEXT NOT NULL CHECK (scale IN ('MOCA','MMSE','KPS','OTHER')),
  score REAL,
  score_max REAL,
  done_by TEXT CHECK (done_by IN ('SELF','CAREGIVER','CLINICIAN')),
  ord INTEGER NOT NULL DEFAULT 0
);
