/**
 * 读模型（M5）。把库里的行还原成 prototypes/v0.2/demo-data.js 的**同一形状**——
 * parity 是这一层唯一的验收标准（test/store.test.mjs 用 deepEqual 钉住）。
 *
 * 家族契约落地：
 * - 有 ord 的表 ORDER BY ord（D2：不叠 DESC）；无 ord 的事件表 ORDER BY rowid（D1）。
 * - 可选字段还原成 null（D3：读模型按 === null 分支）；**形状里本来没有的键不补**
 *   （D8：多一个键 parity 就红）——如分类序列不补 unit、demo1 没有 recurrence 键。
 * - kind !== 'numeric' 的指标才出现在 qual 分组（D6 语义：分类不进数值趋势）。
 * - 派生值（年龄、切除程度标签、KPS 标签）读取时算、不落库。
 */
import { todayISO } from './store.js';

/** 切除程度 → 展示标签（演示形状是固定句式；此处是抄录规则的展开，不是判读） */
const DEGREE_LABEL = {
  GTR: '全切（医生报告原文）',
  NTR: '近全切（医生报告原文）',
  STR: '部分切除（医生报告原文）',
  BIOPSY: '活检（医生报告原文）',
};

/** 年龄：出生日 → 演示“今天”的周岁（不落库，读取时算） */
function ageAt(birthDate, today) {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00`);
  const t = new Date(`${today}T00:00:00`);
  if (Number.isNaN(b.getTime()) || Number.isNaN(t.getTime())) return null;
  let age = t.getFullYear() - b.getFullYear();
  const beforeBirthday = t.getMonth() < b.getMonth()
    || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * 把已播种的库还原成 demo-data.js 顶层形状。
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function buildBootstrap(db, { today = todayISO() } = {}) {
  const q = (sql, ...args) => db.prepare(sql).all(...args);
  const one = (sql, ...args) => db.prepare(sql).get(...args) ?? null;

  const ws = one('SELECT * FROM workspace WHERE id = 1');
  let meta = { dataStart: today, today, disclaimer: '', trialNote: '' };
  if (ws?.dataset_state) {
    try { meta = { ...meta, ...JSON.parse(ws.dataset_state) }; } catch { /* 坏 JSON 不当作已配置 */ }
  }
  const T = meta.today || today;
  const titles = new Map(q('SELECT marker, title FROM molecular_marker_title ORDER BY ord, marker').map((r) => [r.marker, r.title]));

  const profiles = q('SELECT * FROM profile ORDER BY id').map((p) => {
    const pid = p.id;

    const molecular = q('SELECT * FROM molecular_marker WHERE profile_id = ? ORDER BY ord, rowid', pid).map((m) => {
      const item = {
        marker: titles.get(m.marker) ?? m.marker,
        status: m.status,
        method: m.method ?? null,
        date: m.specimen_date ?? null,
        explain: m.note ?? '',
      };
      if (m.value_text !== null && m.value_text !== undefined) item.value = m.value_text;
      return item;
    });

    const surgery = q('SELECT * FROM surgery_record WHERE profile_id = ? ORDER BY ord, rowid', pid).map((s) => ({
      date: s.surgery_date,
      degree: s.resection_degree,
      degreeLabel: DEGREE_LABEL[s.resection_degree] ?? `${s.resection_degree}（医生报告原文）`,
      notes: s.intraop_notes ?? '',
      hospital: s.hospital ?? '',
    }));

    const concurrentRow = one(
      "SELECT * FROM onco_cycle WHERE profile_id = ? AND kind = 'CONCURRENT_RT_TMZ' ORDER BY rowid LIMIT 1", pid,
    );
    const adjuvantRows = q(
      "SELECT * FROM onco_cycle WHERE profile_id = ? AND kind = 'ADJUVANT_TMZ' ORDER BY ord, rowid", pid,
    );
    const oncology = {};
    if (concurrentRow) {
      oncology.concurrent = {
        kind: concurrentRow.kind,
        from: concurrentRow.start_date,
        to: concurrentRow.end_date,
        rt: concurrentRow.rt_regimen ?? '',
        tmz: concurrentRow.tmz_regimen ?? '',
        status: concurrentRow.status ?? 'completed',
      };
    }
    if (adjuvantRows.length) {
      oncology.adjuvantCycles = adjuvantRows.map((c) => ({
        n: c.cycle_number,
        from: c.start_date,
        to: c.end_date,
        plan: c.tmz_regimen ?? '',
        took: c.took_note ?? '',
        delayDays: c.delay_days ?? 0,
        adjust: c.dose_adjust ?? null,
      }));
    }
    if (concurrentRow?.next_on) oncology.nextOn = concurrentRow.next_on;
    if (concurrentRow?.recurrence_note) oncology.recurrence = { note: concurrentRow.recurrence_note };

    const ttMeta = one('SELECT * FROM ttfields_meta WHERE profile_id = ?', pid);
    const ttfields = {
      started: ttMeta?.started_on ?? null,
      daily: q('SELECT * FROM ttfields_daily WHERE profile_id = ? ORDER BY ord, rowid', pid).map((d) => ({
        date: d.record_date,
        wearHours: d.wear_hours,
        arraysChanged: d.arrays_changed_front === 1 && d.arrays_changed_back === 1
          ? 'front+back'
          : d.arrays_changed_front === 1 ? 'front' : d.arrays_changed_back === 1 ? 'back' : null,
        skin: d.skin_reaction ?? null,
      })),
      monthlyUsage: q('SELECT * FROM ttfields_monthly WHERE profile_id = ? ORDER BY ord, rowid', pid).map((m) => ({
        month: m.month,
        rate: m.rate,
        src: m.source_note ?? '',
      })),
      targetHint: ttMeta?.target_hint ?? null,
    };

    const mri = q('SELECT * FROM mri_followup WHERE profile_id = ? ORDER BY ord, rowid', pid).map((x) => ({
      date: x.exam_date,
      excerpt: x.report_excerpt ?? '',
      dexAtTime: x.steroid_mg_at_time ?? 0,
      kpsAtTime: x.kps_at_time ?? null,
      next: x.next_exam_plan ?? '',
    }));

    const steroids = q('SELECT * FROM steroid_dose WHERE profile_id = ? ORDER BY ord, rowid', pid).map((s) => ({
      date: s.change_date,
      mg: s.dexamethasone_mg,
      kind: s.change_kind,
      note: s.reason_note ?? '',
    }));

    const seizures = q('SELECT * FROM seizure_event WHERE profile_id = ? ORDER BY ord, rowid', pid).map((s) => ({
      onset: s.onset_at,
      durationMin: s.duration_min,
      type: s.seizure_type,
      trigger: s.trigger_note ?? '',
      witnessedBy: s.witnessed_by,
      note: s.note ?? null,
    }));

    const aeds = q('SELECT * FROM aed_medication WHERE profile_id = ? ORDER BY ord, rowid', pid).map((a) => ({
      drug: a.drug,
      dose: a.dose ?? '',
      from: a.start_date ?? '',
      to: a.end_date ?? null,
      levelDate: a.level_checked_date ?? null,
      levelNote: a.level_note ?? null,
    }));

    const cog = q('SELECT * FROM cog_assessment WHERE profile_id = ? ORDER BY ord, rowid', pid).map((x) => {
      const item = {
        date: x.assess_date,
        scale: x.scale,
        score: x.score,
        max: x.score_max,
        by: x.done_by,
      };
      if (x.note !== null && x.note !== undefined) item.note = x.note;
      return item;
    });

    /* 指标：numeric 分组只收数值点；分类（KPS，is_numeric=0）从 cog_assessment 还原，不补 unit */
    const numeric = {};
    for (const pt of q(
      `SELECT mp.code, mp.measured_at, mp.value_num, mp.source_note
       FROM metric_point mp JOIN metric_def md ON md.code = mp.code
       WHERE mp.profile_id = ? AND md.is_numeric = 1 ORDER BY mp.code, mp.rowid`, pid,
    )) {
      (numeric[pt.code] = numeric[pt.code] || []).push({
        d: pt.measured_at,
        v: pt.value_num,
        src: pt.source_note ?? '',
      });
    }
    const qual = {};
    const kpsRows = cog.filter((x) => x.scale === 'KPS');
    if (kpsRows.length) {
      qual.KPS = kpsRows.map((x) => ({
        d: x.date,
        label: `${x.score}/100`,
        v: x.score,
        src: x.by === 'CLINICIAN' ? '医生评估（原文记录）' : '自查记录',
      }));
    }
    const metrics = { numeric, qual };

    const viewpoints = q('SELECT * FROM viewpoint WHERE profile_id = ? ORDER BY ord, rowid', pid).map((v) => ({
      role: v.author_role,
      visibility: v.visibility,
      date: v.record_date,
      topic: v.topic,
      content: v.content,
    }));

    const decisions = q('SELECT * FROM decision_checklist WHERE profile_id = ? ORDER BY ord, rowid', pid).map((d) => ({
      topic: d.topic,
      status: d.status,
      note: d.note ?? null,
    }));

    const trials = q('SELECT * FROM trial_lead WHERE profile_id = ? ORDER BY ord, rowid', pid).map((t) => ({
      key: t.trial_key,
      title: t.title,
      phase: t.phase ?? '',
      status: t.status_text ?? '',
      source: t.source_channel ?? '',
    }));

    return {
      id: pid,
      name: p.name,
      age: ageAt(p.birth_date, T),
      gender: p.gender ?? '',
      diagnosis: p.diagnosis ?? '',
      stageLine: p.stage_line ?? '',
      primaryRole: p.primary_role ?? 'PATIENT',
      cognitiveFlag: p.cognitive_flag ?? 'stable',
      molecular,
      surgery,
      oncology,
      ttfields,
      mri,
      steroids,
      seizures,
      aeds,
      cog,
      metrics,
      viewpoints,
      decisions,
      trials,
    };
  });

  return { meta, profiles };
}
