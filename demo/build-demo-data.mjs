#!/usr/bin/env node
/**
 * build-demo-data.mjs — 演示数据唯一来源（ZERO-TO-DEV §1.4）
 *
 * 被 import 时只返回 buildDemoProfiles() 纯数据，不碰磁盘；
 * 直接运行时写 prototypes/v0.2/demo-data.js（M2）。
 * demo/demo-data.sqlite 在 G3 冻结 schema 后由本脚本同一数据源产出（M3，见 DEV-PLAN）。
 *
 * 演示律（D7）：化验/体征 2–4 周一点延续到今天；影像/随访按真实频率不加密。
 * 双主体：DEMO-2 以照护者代记为主（author_role=CAREGIVER），DEMO-1 患者自记为主。
 * 数据为合成演示，人物与数值不指向任何真实患者；试验条目取自真实登记库样例（登记状态，未核实）。
 */

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'prototypes', 'v0.2', 'demo-data.js');

const DATA_START = '2026-04-24';
const TODAY = '2026-10-24'; // 演示"今天"，两档案共用

// 化验点序列：从 start 到 TODAY，每 stepDays 一点（D7 演示律），value 按 profile 曲线
function labSeries(start, values) {
  // values: [{d, v, src}] 直接给定（演示数据显式可读优于生成器魔法数）
  return values.map((p) => ({ d: p.d, v: p.v, src: p.src ?? '演示数据（合成）' }));
}

function buildDemoProfiles() {
  return {
    meta: {
      dataStart: DATA_START,
      today: TODAY,
      disclaimer: '演示数据（合成）：人物、数值与时间线不指向任何真实患者。',
      trialNote: '试验条目为真实登记库样例，登记状态，未核实。',
    },
    profiles: [buildProfile1(), buildProfile2()],
  };
}

// ── DEMO-1 周建国 58 男 · 新诊断，Stupp 同步放化疗结束 → 辅助 TMZ 第 3 周期，电场 6 周 ──
function buildProfile1() {
  return {
    id: 'demo1',
    name: '周建国（演示）',
    age: 58,
    gender: '男',
    diagnosis: '胶质母细胞瘤（IDH 野生型，WHO 4 级）· 右颞',
    stageLine: '新诊断 · 术后 Stupp 同步放化疗完成 → 辅助 TMZ 第 3 周期',
    primaryRole: 'PATIENT', // 患者自记为主，家属偶代记
    cognitiveFlag: 'stable',
    molecular: [ // 三态红线（G1）：未检测 ≠ 阴性
      { marker: 'IDH1 R132H', status: 'not_detected', method: '免疫组化', date: '2026-05-06', explain: '未检出突变。这属于"IDH 野生型"语境，与检出型的预后语境不同——具体含义请医生解释，这里不做判断。' },
      { marker: 'IDH2', status: 'not_tested', method: null, date: null, explain: '未检测。未检测不等于阴性，报告里没有的项目按"未检测"记。' },
      { marker: 'MGMT 启动子甲基化', status: 'not_detected', method: '焦磷酸测序', date: '2026-05-06', explain: '报告写"未甲基化"。它与替莫唑胺敏感性的关系是医生选方案时参考的信息之一——本页只解释名词，不预测疗效。' },
      { marker: '1p/19q 共缺失', status: 'not_detected', method: 'FISH', date: '2026-05-06', explain: '未见共缺失。若出现共缺失，病理会结合形态考虑少突胶质细胞瘤方向——判断归病理医生。' },
      { marker: 'TERT 启动子', status: 'not_tested', method: null, date: null, explain: '未检测。' },
      { marker: 'EGFR 扩增', status: 'not_tested', method: null, date: null, explain: '未检测。' },
      { marker: 'Ki-67', status: 'detected', method: '免疫组化', date: '2026-05-06', value: '约 40%', explain: '增殖活性指标，报告原文数值照抄，不做解读。' },
      { marker: 'CDKN2A/B 缺失', status: 'not_tested', method: null, date: null, explain: '未检测。' },
    ],
    surgery: [
      { date: '2026-05-02', degree: 'STR', degreeLabel: '部分切除（医生报告原文）', notes: '术中导航 + 黄荧光；术后一过性语言欠流畅', hospital: '市神经外科中心（演示）' },
    ],
    oncology: {
      concurrent: { kind: 'CONCURRENT_RT_TMZ', from: '2026-05-18', to: '2026-06-26', rt: '60Gy/30 次（每周 5 次）', tmz: '75mg/m² 每日（同步期）', status: 'completed' },
      adjuvantCycles: [
        { n: 1, from: '2026-07-06', to: '2026-08-02', plan: 'D1–5 服药', took: 'D1–5 完成，D3 呕吐一次已记', delayDays: 0, adjust: null },
        { n: 2, from: '2026-08-03', to: '2026-08-30', plan: 'D1–5 服药', took: 'D1–5 完成', delayDays: 0, adjust: null },
        { n: 3, from: '2026-08-31', to: '2026-09-27', plan: 'D1–5 服药', took: 'D2 血象低，医生嘱顺延 7 天', delayDays: 7, adjust: null },
      ],
      nextOn: '2026-10-28（第 4 周期 D1，待复诊确认血象）',
    },
    ttfields: {
      started: '2026-09-10',
      daily: ttfDaily('2026-09-10', TODAY), // 日佩戴时长 + 贴片/头皮
      monthlyUsage: [ { month: '2026-09', rate: 0.68, src: '设备月报（演示）' } ],
      targetHint: '治疗目标语境：每天佩戴时长越长越好（临床研究语境 ≥18 小时/天）——目标由治疗团队解释，本页只记录。',
    },
    mri: [ // 并列事实（G3）：无判读字段
      { date: '2026-05-16', excerpt: '术后复查：术区改变为主，残余强化灶较术前缩小', dexAtTime: 4, kpsAtTime: 80, next: '同步放化疗结束后复查' },
      { date: '2026-07-03', excerpt: '术区强化范围较前片相仿，水肿同前；放化疗后改变待排', dexAtTime: 2, kpsAtTime: 80, next: '2 个月后复查' },
      { date: '2026-09-25', excerpt: '术区强化范围较前略增大，假性进展待排；建议灌注成像', dexAtTime: 2, kpsAtTime: 75, next: '已预约 2026-11-06 复查 + 复诊讨论' },
    ],
    steroids: [
      { date: '2026-05-02', mg: 8, kind: 'START', note: '术后开始' },
      { date: '2026-05-20', mg: 4, kind: 'DECREASE', note: '医嘱减量' },
      { date: '2026-06-15', mg: 2, kind: 'DECREASE', note: '医嘱减量' },
      { date: '2026-07-01', mg: 1, kind: 'DECREASE', note: '停药前过渡' },
      { date: '2026-07-08', mg: 0, kind: 'STOP', note: '停用' },
      { date: '2026-09-26', mg: 2, kind: 'INCREASE', note: 'MRI 后头痛，医嘱加回' },
    ],
    seizures: [
      { onset: '2026-04-25 07:10', durationMin: 1.5, type: 'FOCAL', trigger: '清晨空腹', witnessedBy: 'CAREGIVER', note: '愣神 + 右手摸索动作，事后本人无记忆' },
      { onset: '2026-09-12 21:40', durationMin: 1, type: 'AURA', trigger: '漏服抗癫痫药一次（前夜）', witnessedBy: 'PATIENT', note: '似曾相识感，未发展为发作' },
    ],
    aeds: [
      { drug: '左乙拉西坦', dose: '500mg 每日两次', from: '2026-04-26', to: null, levelDate: '2026-08-20', levelNote: '血药浓度在参考范围（报告原文）' },
    ],
    cog: [
      { date: '2026-05-20', scale: 'MOCA', score: 25, max: 30, by: 'CLINICIAN' },
      { date: '2026-09-26', scale: 'MOCA', score: 23, max: 30, by: 'CLINICIAN', note: '评分变化的意义请医生解释，本页只记分' },
      { date: '2026-05-16', scale: 'KPS', score: 80, max: 100, by: 'CLINICIAN' },
      { date: '2026-09-25', scale: 'KPS', score: 75, max: 100, by: 'CLINICIAN' },
    ],
    metrics: {
      numeric: {
        WBC: labSeries('2026-05', [
          { d: '2026-05-18', v: 6.2, src: '同步化疗前基线' }, { d: '2026-06-01', v: 4.1, src: '同步期每周血常规' }, { d: '2026-06-15', v: 3.6, src: '同步期' }, { d: '2026-06-29', v: 4.4, src: '同步期' },
          { d: '2026-07-13', v: 3.9, src: '辅助 C1D8' }, { d: '2026-07-27', v: 3.2, src: '辅助 C1D22' }, { d: '2026-08-10', v: 3.4, src: '辅助 C2' }, { d: '2026-08-24', v: 2.8, src: '辅助 C2（低点）' },
          { d: '2026-09-07', v: 3.1, src: 'C3 顺延后' }, { d: '2026-09-21', v: 3.5, src: 'C3' }, { d: '2026-10-12', v: 3.8, src: '复查血常规' },
        ].filter(Boolean)),
        ANC: null, HGB: null, PLT: null, DEXA: null, WEIGHT: null, NA: null, K: null, CREA: null,
      },
      // 完整 9 线由 expandMetrics 生成（见下），保持每档案"两条数值线 + 一个分类序列"同构（ZERO-TO-DEV §1.4）
    },
    viewpoints: [
      { role: 'PATIENT', visibility: 'private', date: '2026-09-26', topic: 'MOOD', content: '看到"增大"两个字，全家都乱了。我想问清楚但不敢问。' },
      { role: 'CAREGIVER', visibility: 'private', date: '2026-09-27', topic: 'CARE_BURDEN', content: '他这两天话变少，不知道是激素还是病。我也快撑不住了。' },
    ],
    decisions: [
      { topic: '如果确认复发，是否考虑二次手术', status: 'discussed', note: '10-02 与女儿通了电话，还没有和医生谈' },  // wording-allow: 复发=引用报告/登记原文语境（记录原文照抄），非产品判断
      { topic: '预立照护：想和谁谈、什么时候谈', status: 'open', note: null },
    ],
    trials: demoTrials(),
  };
}

// ── DEMO-2 李秀兰 63 女 · 复发线，照护者代记为主 ──  // wording-allow: 复发=引用报告/登记原文语境（记录原文照抄），非产品判断
function buildProfile2() {
  return {
    id: 'demo2',
    name: '李秀兰（演示）',
    age: 63,
    gender: '女',
    diagnosis: '胶质母细胞瘤（IDH 野生型）· 左额 · 2025-03 确诊',
    stageLine: '复发评估期 · 术后 14 个月 MRI 强化增大',  // wording-allow: 复发=引用报告/登记原文语境（记录原文照抄），非产品判断
    primaryRole: 'CAREGIVER', // 照护者代记为主（双主体）
    cognitiveFlag: 'changed', // 认知状态标记：有变化
    molecular: [
      { marker: 'IDH1 R132H', status: 'not_detected', method: '免疫组化', date: '2025-04-02', explain: 'IDH 野生型语境（见 DEMO-1 同款解释）。' },
      { marker: 'MGMT 启动子甲基化', status: 'detected', method: '焦磷酸测序', date: '2025-04-02', explain: '报告写"甲基化阳性"。它与替莫唑胺敏感性的关系由医生结合方案解释——本页只记结果与名词。' },
      { marker: '1p/19q 共缺失', status: 'not_tested', method: null, date: null, explain: '未检测。' },
      { marker: 'TERT 启动子', status: 'detected', method: 'NGS', date: '2025-04-02', explain: '检出。含义请医生解释。' },
    ],
    surgery: [
      { date: '2025-03-28', degree: 'GTR', degreeLabel: '全切（医生报告原文）', notes: '术后顺利', hospital: '省人民医院（演示）' },
    ],
    oncology: {
      concurrent: { kind: 'CONCURRENT_RT_TMZ', from: '2025-04-20', to: '2025-05-28', rt: '60Gy/30 次', tmz: '75mg/m² 每日', status: 'completed' },
      adjuvantCycles: [{ n: 1, from: '2025-06-08', to: '2026-03-01', plan: 'D1–5 ×12 周期', took: '完成 12 周期（末次 2026-02）', delayDays: 0, adjust: '第 9 周期起减量 25%（血象，医嘱）' }],
      recurrence: { note: '2026-09 复发评估期：再放疗 / 洛莫司汀 / 临床试验正在与医生讨论（本产品不推荐任何选项）' },  // wording-allow: 复发=引用报告/登记原文语境（记录原文照抄），非产品判断
    },
    ttfields: { started: null, daily: [], monthlyUsage: [], targetHint: null },
    mri: [
      { date: '2026-04-20', excerpt: '术区稳定，无新强化', dexAtTime: 0, kpsAtTime: 80, next: '3 个月后复查' },
      { date: '2026-09-14', excerpt: '术区强化范围较前增大，周围水肿增多；复发与假性进展待鉴别', dexAtTime: 4, kpsAtTime: 60, next: '复诊讨论再照射与系统治疗选择' },  // wording-allow: 复发=引用报告/登记原文语境（记录原文照抄），非产品判断
    ],
    steroids: [
      { date: '2026-09-14', mg: 4, kind: 'INCREASE', note: 'MRI 后医嘱加量' },
      { date: '2026-09-30', mg: 6, kind: 'INCREASE', note: '症状波动，医嘱调整' },
      { date: '2026-10-15', mg: 4, kind: 'DECREASE', note: '症状稍稳，医嘱减量' },
    ],
    seizures: [],
    aeds: [{ drug: '左乙拉西坦', dose: '1000mg 每日两次', from: '2025-03-29', to: null, levelDate: null, levelNote: null }],
    cog: [
      { date: '2026-04-20', scale: 'MOCA', score: 24, max: 30, by: 'CLINICIAN' },
      { date: '2026-09-14', scale: 'MOCA', score: 18, max: 30, by: 'CLINICIAN', note: '分数变化由医生解释' },
      { date: '2026-04-20', scale: 'KPS', score: 80, max: 100, by: 'CLINICIAN' },
      { date: '2026-09-14', scale: 'KPS', score: 60, max: 100, by: 'CLINICIAN' },
    ],
    metrics: null, // 由 expandMetrics 按档案状态生成（见下）
    viewpoints: [
      { role: 'CAREGIVER', visibility: 'private', date: '2026-09-15', topic: 'COGNITION_CHANGE', content: '妈妈开始把妹妹认成阿姨，晚上不肯睡。' },
      { role: 'CAREGIVER', visibility: 'shared', date: '2026-10-02', topic: 'DECISION_ACP', content: '和医生谈了再放疗的利弊，还谈了"如果都不做"这个选项——记下来怕忘了她说过不想再受罪。' },
    ],
    decisions: [
      { topic: '再放疗 vs 系统治疗 vs 临床试验', status: 'discussed', note: '10-02 门诊已谈，等灌注成像结果' },
      { topic: '若病情进展，转入安宁照护的时机', status: 'open', note: '家人之间还没统一，想找机会聊' },
    ],
    trials: demoTrials().slice(0, 2),
  };
}

// 电场日记录（演示 45 天，佩戴依从性从 60% 爬到 85% 的自然曲线；头皮反应两段）
function ttfDaily(from, to) {
  const out = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  let i = 0;
  while (d <= end) {
    const ds = d.toISOString().slice(0, 10);
    const ramp = Math.min(0.85, 0.6 + i * 0.006);
    const hours = Math.round((18 * ramp + (i % 7 === 3 ? -2.5 : 0.5)) * 10) / 10; // 每周四换贴片日略低
    out.push({
      date: ds,
      wearHours: Math.max(4, hours),
      arraysChanged: i % 4 === 0 ? 'front+back' : i % 4 === 2 ? 'front' : null,
      skin: i === 10 ? '额部贴片下红痒（记录原文）' : i === 11 ? '额部红痒，已联系设备护士' : i === 30 ? '枕部轻度脱屑' : null,
    });
    d.setDate(d.getDate() + 1);
    i += 1;
  }
  return out;
}

// 试验线索：真实登记库样例（title 原样，状态统一"登记状态，未核实"）
function demoTrials() {
  return [
    { key: 'CTR20232481', title: '评估电场治疗联合替莫唑胺在新诊断胶质母细胞瘤中的研究（演示样例）', phase: 'III', status: '招募中（登记状态，未核实）', source: 'chinadrugtrials' },
    { key: 'ChiCTR2600127958', title: 'TNFSF9 在胶质母细胞瘤中的作用研究（演示样例）', phase: '观察性', status: '招募中（登记状态，未核实）', source: 'chictr_online' },
    { key: 'NCT00000000', title: '复发胶质母细胞瘤 溶瘤病毒 研究（演示样例）', phase: 'I/II', status: '招募中（登记状态，未核实）', source: 'ctv' },  // wording-allow: 复发=引用报告/登记原文语境（记录原文照抄），非产品判断
  ];
}

// 指标线展开：保证两档案默认视图同构（两条数值线 + 一个分类序列）
// DEMO-1: WBC + DEXA 数值线，KPS 分类序列；DEMO-2: 体重 + NA 数值线，KPS 分类序列
function expandMetrics(p) {
  if (p.id === 'demo1') {
    return {
      numeric: {
        WBC: p.metrics.numeric.WBC,
        DEXA: [
          { d: '2026-05-02', v: 8 }, { d: '2026-05-20', v: 4 }, { d: '2026-06-15', v: 2 }, { d: '2026-07-01', v: 1 }, { d: '2026-07-08', v: 0 },
          { d: '2026-09-26', v: 2 },
        ].map((x) => ({ ...x, src: '激素记录（地塞米松 mg/日）' })),
        WEIGHT: [
          { d: '2026-05-18', v: 72 }, { d: '2026-06-15', v: 73.5 }, { d: '2026-07-13', v: 75 }, { d: '2026-08-10', v: 76.2 }, { d: '2026-09-07', v: 77 }, { d: '2026-10-12', v: 77.8 },
        ].map((x) => ({ ...x, src: '家中体重秤（激素期体重上升语境见营养页说明）' })),
      },
      qual: {
        KPS: p.cog.filter((c) => c.scale === 'KPS').map((c) => ({ d: c.date, label: `${c.score}/100`, v: c.score, src: '医生评估（原文记录）' })),
      },
    };
  }
  return {
    numeric: {
      WEIGHT: [
        { d: '2026-04-24', v: 58 }, { d: '2026-05-22', v: 57.4 }, { d: '2026-06-19', v: 56.8 }, { d: '2026-07-17', v: 55.9 }, { d: '2026-08-14', v: 54.7 }, { d: '2026-09-11', v: 53.2 }, { d: '2026-10-09', v: 52.4 },
      ].map((x) => ({ ...x, src: '照护者代记·家中晨重' })),
      NA: [
        { d: '2026-04-24', v: 139 }, { d: '2026-06-19', v: 136 }, { d: '2026-08-14', v: 132 }, { d: '2026-09-14', v: 128 }, { d: '2026-10-09', v: 131 },
      ].map((x) => ({ ...x, src: '生化报告（原文数值）' })),
    },
    qual: {
      KPS: p.cog.filter((c) => c.scale === 'KPS').map((c) => ({ d: c.date, label: `${c.score}/100`, v: c.score, src: '医生评估（原文记录）' })),
    },
  };
}

function finalize() {
  const data = buildDemoProfiles();
  data.profiles = data.profiles.map((p) => ({ ...p, metrics: expandMetrics(p) }));
  // 清掉 demo1 构造期的占位 metrics（保持 demo-data.js 干净：无中间量键——D8）
  for (const p of data.profiles) {
    if (p.id === 'demo1') delete p._placeholder;
  }
  return data;
}

/**
 * 直接运行时写两份产物（同一数据源，D10）：
 *   prototypes/v0.2/demo-data.js（原型直开）+ demo/demo-data.sqlite（按冻结 schema 全迁移建库）。
 */
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../dsh/store.js';

const SQLITE_OUT = join(ROOT, 'demo', 'demo-data.sqlite');

/* ---------------- sqlite 写入（M5）：finalize() 形状 → 冻结 schema 全量行 ---------------- */

/* 指标字典（与原型 app.js CATALOG 同一份口径；ord=CATALOG 顺序） */
const METRIC_DEFS = [
  ['WBC', '白细胞', '10⁹/L', '血象', '#2F5D8A', 1, 'ctcae-v5-absolute', 1],
  ['ANC', '中性粒细胞', '10⁹/L', '血象', '#4a7ba6', 1, 'ctcae-v5-absolute', 2],
  ['PLT', '血小板', '10⁹/L', '血象', '#7fa3c0', 1, 'ctcae-v5-absolute', 3],
  ['HGB', '血红蛋白', 'g/L', '血象', '#a3bfd4', 1, 'ctcae-v5-absolute', 4],
  ['DEXA', '地塞米松', 'mg/日', '激素', '#9a6410', 1, null, 5],
  ['WEIGHT', '体重', 'kg', '体格与代谢', '#2f6f66', 1, null, 6],
  ['NA', '血钠', 'mmol/L', '体格与代谢', '#5f8d86', 1, null, 7],
  ['KPS', 'KPS 评分', '/100', '功能评估', '#8B87A3', 0, null, 8],
];

/* 分子标志物：显示名 ↔ schema CHECK 枚举（0001 冻结值） */
const MARKER_CODE = {
  'IDH1 R132H': 'IDH1_R132H',
  'IDH2': 'IDH2',
  'MGMT 启动子甲基化': 'MGMT_PROMOTER',
  '1p/19q 共缺失': 'P19Q_CODEL',
  'TERT 启动子': 'TERT_PROMOTER',
  'EGFR 扩增': 'EGFR_AMP',
  'CDKN2A/B 缺失': 'CDKN2AB_DEL',
  'BRAF V600E': 'BRAF_V600E',
  'MMR/MSI': 'MMR_MSI',
  'Ki-67': 'OTHER',
};

/* 演示年龄 → 出生日期（readmodels 按 meta.today 推回同一整数年龄） */
const BIRTH_DATE = { demo1: '1968-04-24', demo2: '1963-02-08' };

/**
 * 把 finalize() 的演示数据写入已迁移的库。单事务、失败整体回滚；幂等由调用方保证
 * （库里有 profile 就不该走到这里——dsh/demo.js 的 seedDemo 负责判重）。
 */
export function writeDemoToDb(db, data) {
  const run = (sql, ...a) => db.prepare(sql).run(...a);
  db.exec('BEGIN');
  try {
    run('INSERT INTO workspace (id, data_root, schema_version, dataset_state) VALUES (1, NULL, ?, ?)',
      '0002', JSON.stringify(data.meta));

    for (const [code, label, unit, category, color, isNumeric, ctcaeRule, ord] of METRIC_DEFS) {
      run('INSERT INTO metric_def (code, label, unit, category, color, is_numeric, ctcae_rule, ord) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        code, label, unit, category, color, isNumeric, ctcaeRule, ord);
    }

    /* 分子标志物标题字典：全局一份（表 PK 是 marker，不随档案重复登记） */
    const titles = new Map();
    for (const p of data.profiles) {
      p.molecular.forEach((x) => {
        const code = MARKER_CODE[x.marker] ?? 'OTHER';
        if (!titles.has(code)) titles.set(code, x.marker);
      });
    }
    let ti = 0;
    for (const [code, title] of titles) {
      ti += 1;
      run('INSERT INTO molecular_marker_title (marker, title, ord) VALUES (?, ?, ?)', code, title, ti);
    }

    for (const p of data.profiles) {
      run(`INSERT INTO profile (id, name, birth_date, gender, primary_role, cognitive_flag, created_at, diagnosis, stage_line)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p.id, p.name, BIRTH_DATE[p.id] ?? null, p.gender, p.primaryRole, p.cognitiveFlag, `${data.meta.dataStart}T00:00:00`, p.diagnosis, p.stageLine);

      p.molecular.forEach((x, i) => {
        run(`INSERT INTO molecular_marker (profile_id, marker, status, method, specimen_date, note, ord, revision, value_text)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          p.id, MARKER_CODE[x.marker] ?? 'OTHER', x.status, x.method ?? null, x.date ?? null, x.explain ?? null, i + 1, x.value ?? null);
      });

      p.surgery.forEach((s, i) => {
        run(`INSERT INTO surgery_record (profile_id, surgery_date, resection_degree, intraop_notes, hospital, pathology_summary, report_doc_id, ord, revision)
             VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 1)`,
          p.id, s.date, s.degree, s.notes, s.hospital, i + 1);
      });

      const onc = p.oncology;
      const c = onc.concurrent;
      run(`INSERT INTO onco_cycle (profile_id, kind, cycle_number, start_date, end_date, rt_total_gy, rt_fractions,
             tmz_regimen, status, stop_reason, ord, revision, rt_regimen, took_note, delay_days, dose_adjust, next_on, recurrence_note)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, 0, 1, ?, NULL, NULL, NULL, ?, ?)`,
        p.id, c.kind, c.from, c.to, 60, 30, c.tmz, c.status, c.rt, onc.nextOn ?? null, onc.recurrence?.note ?? null);
      (onc.adjuvantCycles || []).forEach((cy, i) => {
        run(`INSERT INTO onco_cycle (profile_id, kind, cycle_number, start_date, end_date, rt_total_gy, rt_fractions,
               tmz_regimen, status, stop_reason, ord, revision, rt_regimen, took_note, delay_days, dose_adjust, next_on, recurrence_note)
             VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'completed', NULL, ?, 1, NULL, ?, ?, ?, NULL, NULL)`,
          p.id, 'ADJUVANT_TMZ', cy.n, cy.from, cy.to, cy.plan, i + 1, cy.took ?? null, cy.delayDays ?? 0, cy.adjust ?? null);
      });

      const tt = p.ttfields;
      run('INSERT INTO ttfields_meta (profile_id, started_on, target_hint) VALUES (?, ?, ?)',
        p.id, tt.started ?? null, tt.targetHint ?? null);
      tt.daily.forEach((d, i) => {
        const front = d.arraysChanged === 'front+back' || d.arraysChanged === 'front' ? 1 : 0;
        const back = d.arraysChanged === 'front+back' || d.arraysChanged === 'back' ? 1 : 0;
        run(`INSERT INTO ttfields_daily (profile_id, record_date, wear_hours, arrays_changed_front, arrays_changed_back, skin_reaction, device_note, ord)
             VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
          p.id, d.date, d.wearHours, front, back, d.skin ?? null, i + 1);
      });
      tt.monthlyUsage.forEach((u, i) => {
        run('INSERT INTO ttfields_monthly (profile_id, month, rate, source_note, ord) VALUES (?, ?, ?, ?, ?)',
          p.id, u.month, u.rate, u.src, i + 1);
      });

      p.mri.forEach((x, i) => {
        run(`INSERT INTO mri_followup (profile_id, exam_date, report_excerpt, steroid_mg_at_time, kps_at_time, next_exam_plan, report_doc_id, ord)
             VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
          p.id, x.date, x.excerpt, x.dexAtTime, x.kpsAtTime, x.next, i + 1);
      });

      p.steroids.forEach((s, i) => {
        run('INSERT INTO steroid_dose (profile_id, change_date, dexamethasone_mg, change_kind, reason_note, ord) VALUES (?, ?, ?, ?, ?, ?)',
          p.id, s.date, s.mg, s.kind, s.note, i + 1);
      });

      (p.seizures || []).forEach((s, i) => {
        run(`INSERT INTO seizure_event (profile_id, onset_at, duration_min, seizure_type, trigger_note, witnessed_by, ord, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          p.id, s.onset, s.durationMin, s.type, s.trigger, s.witnessedBy, i + 1, s.note ?? null);
      });

      (p.aeds || []).forEach((a, i) => {
        run(`INSERT INTO aed_medication (profile_id, drug, dose, start_date, end_date, level_checked_date, ord, level_note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          p.id, a.drug, a.dose, a.from, a.to ?? null, a.levelDate ?? null, i + 1, a.levelNote ?? null);
      });

      (p.cog || []).forEach((x, i) => {
        run(`INSERT INTO cog_assessment (profile_id, assess_date, scale, score, score_max, done_by, ord, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          p.id, x.date, x.scale, x.score, x.max, x.by, i + 1, x.note ?? null);
      });

      for (const [code, pts] of Object.entries(p.metrics.numeric)) {
        for (const pt of pts) {
          run('INSERT INTO metric_point (profile_id, code, measured_at, value_num, value_text, source_note, revision) VALUES (?, ?, ?, ?, NULL, ?, 1)',
            p.id, code, pt.d, pt.v, pt.src);
        }
      }

      (p.viewpoints || []).forEach((v, i) => {
        run('INSERT INTO viewpoint (profile_id, author_role, visibility, topic, content, record_date, ord) VALUES (?, ?, ?, ?, ?, ?, ?)',
          p.id, v.role, v.visibility, v.topic, v.content, v.date, i + 1);
      });

      (p.decisions || []).forEach((d, i) => {
        run('INSERT INTO decision_checklist (profile_id, topic, status, note, ord) VALUES (?, ?, ?, ?, ?)',
          p.id, d.topic, d.status, d.note ?? null, i + 1);
      });

      (p.trials || []).forEach((t, i) => {
        run('INSERT INTO trial_lead (profile_id, trial_key, title, phase, status_text, source_channel, ord) VALUES (?, ?, ?, ?, ?, ?, ?)',
          p.id, t.key, t.title, t.phase, t.status, t.source, i + 1);
      });
    }

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** 重建演示 sqlite（全迁移 + 写入）。库文件已存在则先删——构建产物，不迁就旧内容。 */
export function buildDemoSqlite(path) {
  const db = new DatabaseSync(path);
  try {
    db.exec('PRAGMA foreign_keys = ON');
    migrate(db);
    if (db.prepare('SELECT COUNT(*) AS n FROM profile').get().n > 0) {
      throw new Error('演示库目标不为空；buildDemoSqlite 要求从空库开始');
    }
    writeDemoToDb(db, finalize());
    return path;
  } finally {
    db.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('build-demo-data.mjs')) {
  const data = finalize();
  mkdirSync(dirname(OUT), { recursive: true });
  const js = `// 由 demo/build-demo-data.mjs 生成——唯一数据源，勿手改（ZERO-TO-DEV §1.4）\nconst DEMO_DATA = ${JSON.stringify(data, null, 2)};\n`;
  writeFileSync(OUT, js + `if (typeof module !== 'undefined') module.exports = DEMO_DATA;\n`);
  console.log(`demo-data.js → ${OUT}（profiles=${data.profiles.length}）`);
  mkdirSync(dirname(SQLITE_OUT), { recursive: true });
  rmSync(SQLITE_OUT, { force: true });
  buildDemoSqlite(SQLITE_OUT);
  console.log(`demo-data.sqlite → ${SQLITE_OUT}（迁移全执行后写入）`);
}

export { buildDemoProfiles, finalize };

