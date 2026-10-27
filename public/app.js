'use strict';
/* 小星宝 StarPal v0.1.6 — 胶质母细胞瘤（GBM）工作台开发版（M5）。
   与 prototypes/v0.2/app.js 的关系：渲染函数与事件结构逐字沿用（ui-parity 逐字符比对 #main）；
   差别只有定点替换的五处——数据加载走 /api/bootstrap、AI 五态、面板宽度持久化、
   版本首屏、启动异步化。不要在这里手抄重写渲染函数。
   红线：无判读字段；private 不进 看板/一图秀/导出 三出口；未检测≠阴性；分类序列只画节点不连线；
   禁词（建议治疗/可能复发/可以停药/无需就医/推荐方案/治愈率/生存率）不出现在产品自己的句子中。 */ // wording-allow: 红线自检清单本身要出现禁词（否定语境）

/* ---------------- 外壳注入（服务端渲染 index.html 时替换；直开时用字面量兑底） ---------------- */
/* API_BASE = 宿主挂载前缀（宿主模式 `/api/glioblastoma-workbench`，独立启动为空串）。
   接口路径本身已带 `/api`，所以这里只禁止**以 `/api` 结尾**（否则会拼成 `/api/api/...`）；
   宿主前缀里有 `/api` 是正常的，不能因此抛错——0.1.3 首版在这里 `includes('/api')` 抛异常，
   整个 app.js 直接不执行，界面全白。 */
const API_BASE = (document.documentElement.dataset.apiBase || '').replace(/\/+$/, ''); /* 只约束结尾，不约束包含 */
const RUNTIME = document.documentElement.dataset.runtime || 'standalone';
if (/(^|\/)api$/.test(API_BASE)) throw new Error('API_BASE 不能以 /api 结尾（接口路径自带 /api）');
const WB_LAYOUT = window.__WB_LAYOUT__ && window.__WB_LAYOUT__.agentPane
  ? window.__WB_LAYOUT__.agentPane
  : { min: 25, max: 45, default: 35, step: 2, storageKey: 'gbm-starpal.agent.w' };

const APP_INFO = Object.assign({
  version: '0.1.8',
  build: '2026-10-28',
  channel: 'beta',
  channelLabel: '开发版 · 数据仅在本机',
  brand: '小星宝 StarPal',
  en: 'glioblastoma'
}, window.__WB_INFO__ || {});
APP_INFO.displayVersion = `v${APP_INFO.version}`;

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let uidSeq = 0;
const uid = (p) => p + (++uidSeq);
const DAY = 86400000;

/* ---------------- icons & nav ---------------- */
const icons = {
  home: 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  tumor: 'M12 3a6 6 0 0 1 6 6c0 3-2 4-2 6H8c0-2-2-3-2-6a6 6 0 0 1 6-6ZM9 21h6M12 7v3',
  calendar: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2m4 0h2',
  wave: 'M2 14c2-4 4-4 6 0s4 4 6 0 4-4 6 0M2 8c2-4 4-4 6 0',
  mri: 'M4 12a8 8 0 0 1 16 0v8H4Zm0 4h16M9 12a3 3 0 0 1 6 0',
  lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10',
  symptom: 'M12 3v4m0 4v2m0 4v4M5 8l3 2m8 0 3-2M5 19l3-2m8 0 3 2',
  food: 'M7 3v7a2 2 0 0 0 4 0V3M9 12v9m5-18c2 0 3 2 3 5s-1 4-2 4v9',
  care: 'M12 20.3c-4.6-2.9-7.4-5.6-7.4-9A4.1 4.1 0 0 1 12 8.4a4.1 4.1 0 0 1 7.4 2.9c0 3.4-2.8 6.1-7.4 9Z',
  visit: 'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16M9 15l2 2 4-4'
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[k]}"/></svg>`;

/* 页面树（PROTOTYPE-BRIEF §3，唯一权威：10 一级 / 27 二级） */
const PAGES = [
  ['dash', '看板', 'home'], ['tumor', '我的瘤', 'tumor'], ['chemo', '放化疗日历', 'calendar'],
  ['ttf', '电场治疗', 'wave'], ['mri', '随访影像', 'mri'], ['lab', '指标与用药', 'lab'],
  ['symptom', '症状与发作', 'symptom'], ['nutrition', '营养与体重', 'food'],
  ['care', '照护与家事', 'care'], ['followup', '复诊与试验', 'visit']
];
const SUBPAGES = {
  tumor: [['molecular', '分子档案'], ['surgery', '手术与切除'], ['pathology', '病理与报告原文']],
  chemo: [['stupp', 'Stupp 日程'], ['cycles', 'TMZ 周期'], ['changes', '方案与变更']],
  ttf: [['wear', '佩戴与时长'], ['arrays', '贴片与头皮'], ['usage', '设备使用率']],
  mri: [['parallel', 'MRI 并列'], ['questions', '问题清单'], ['archive', '影像档案']],
  lab: [['blood', '血象'], ['steroid', '激素剂量'], ['metabolic', '肝肾与电解质'], ['lab-panorama', '病情一图']],
  symptom: [['seizure', '癫痫事件'], ['edema', '脑水肿与症状'], ['risks', '感染与血栓']],
  nutrition: [['intake', '进食与体重'], ['concerns', '当下困扰']],
  care: [['feelings', '当下感受'], ['cognition', '认知与人格'], ['decisions', '照护决策与 ACP']],
  followup: [['schedule', '复查节奏'], ['prepare', '就诊准备'], ['trials', '试验线索'], ['enrolled', '已收藏'], ['followup-archive', '资料档案']]
};
const SUBTITLES = {
  dash: '把今天能做的一件事放在最前面；事实、原话和想问的事分开摆。',
  tumor: '报告说什么就记什么；解释只解释名词，不做判断。',
  chemo: '28 天周期里今天是第几天、该不该吃，计划与实际分开留痕。',
  ttf: '戴了多久、贴片与头皮的情况，逐日记下来；目标由治疗团队解释。',
  mri: '历次报告并排，只摆事实与原话，不做判读。',
  lab: '病情一图把治疗与指标放回同一段时间；数值照抄报告，分级只对照国际标准区间。',
  symptom: '发作、水肿与风险各走各的轨道；记录不分因果。',
  nutrition: '体重与进食只记事实；激素期与疾病期的语境分开说明。',
  care: '感受、认知与决策都有位置；私密内容默认不出现在导出。',
  followup: '复查节奏、就诊准备、试验线索与资料档案分开放；线索不是推荐。'
};

/* ---------------- 指标目录（与一图秀同一来源） ---------------- */
const CATALOG = {
  WBC: { name: '白细胞', unit: '10⁹/L', cat: '血象', color: '#2F5D8A', dec: 1 },
  ANC: { name: '中性粒细胞', unit: '10⁹/L', cat: '血象', color: '#4a7ba6', dec: 1 },
  PLT: { name: '血小板', unit: '10⁹/L', cat: '血象', color: '#7fa3c0', dec: 0 },
  HGB: { name: '血红蛋白', unit: 'g/L', cat: '血象', color: '#a3bfd4', dec: 0 },
  DEXA: { name: '地塞米松', unit: 'mg/日', cat: '激素', color: '#9a6410', dec: 0 },
  WEIGHT: { name: '体重', unit: 'kg', cat: '体格与代谢', color: '#2f6f66', dec: 1 },
  NA: { name: '血钠', unit: 'mmol/L', cat: '体格与代谢', color: '#5f8d86', dec: 0 },
  KPS: { name: 'KPS 评分', unit: '/100', cat: '功能评估', color: '#8B87A3', dec: 0, categorical: true }
};
const CAT_ORDER = ['血象', '激素', '体格与代谢', '功能评估'];
/* CTCAE v5.0 绝对阈值型（23 号 §2：血液四项；单位 g/dL→g/L 已在注释换算，HGB 不设 G4 数值级） */
const CTCAE = {
  WBC: { term: '白细胞减少', unit: '10⁹/L', levels: [[3.5, 1], [3.0, 2], [2.0, 3], [1.0, 4]] },
  ANC: { term: '中性粒细胞减少', unit: '10⁹/L', levels: [[2.0, 1], [1.5, 2], [1.0, 3], [0.5, 4]] },
  PLT: { term: '血小板减少', unit: '10⁹/L', levels: [[125, 1], [75, 2], [50, 3], [25, 4]] },
  HGB: { term: '贫血', unit: 'g/L', levels: [[120, 1], [100, 2], [80, 3]] }
};
/* 区间语义：各级为 [下界, 上界)；末级只有上界（如 WBC G4 <1.0）。等号归上一级。 */
function ctcaeGrade(code, v) {
  const c = CTCAE[code];
  if (!c) return null;
  const i = c.levels.findIndex(([lo]) => v < lo);
  if (i === -1) return null;
  const f = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  const upper = c.levels[i][0];
  const lower = i + 1 < c.levels.length ? c.levels[i + 1][0] : null;
  const range = lower === null ? `<${f(upper)} ${c.unit}` : `${f(lower)}–<${f(upper)} ${c.unit}`;
  return { g: c.levels[i][1], range };
}

/* ---------------- AI 协助示例（INTERACTION-DESIGN §四：填入输入框但不自动发送） ---------------- */
const AI_DEMOS = {
  dash: { prompt: '帮我把这周的重要变化排成一段话，复诊时照着说。', cand: { title: '本周变化摘要（演示候选）', fields: [['最近 MRI', '2026-09-25 · 结论原文已登记'], ['最近 KPS', '75/100（医生评估原文）'], ['当前激素', '地塞米松 2mg/日']], src: '看板摘要（演示）' } },
  tumor: { prompt: '帮我把分子报告里 IDH 和 MGMT 两个字解释成大白话。', cand: { title: '术语解释候选（演示）', fields: [['IDH1 R132H', '未检出（免疫组化 2026-05-06）'], ['MGMT 启动子甲基化', '未检出（焦磷酸测序）'], ['口径', '只解释名词，不预测疗效']], src: '分子档案（演示）' } },
  chemo: { prompt: '今天吃完药吐了一次，帮我记到周期日记里。', cand: { title: '周期事件候选（演示）', fields: [['日期', '2026-10-24'], ['事件', '呕吐一次'], ['归档', '入周期记录；是否顺延由治疗团队判断']], src: 'Stupp 日程（演示）' } },
  ttf: { prompt: '贴片下缘有点红，今天戴了 14 小时，帮我记一下。', cand: { title: '电场日记录候选（演示）', fields: [['佩戴时长', '14 小时'], ['头皮情况', '发红（部位待核对）'], ['记录类型', '日记录 + 头皮反应']], src: '佩戴与时长（演示）' } },
  mri: { prompt: '我拍了一份新 MRI 报告，帮我登记日期、结论原文和当时激素。', cand: { title: 'MRI 登记候选（演示）', fields: [['日期', '2026-09-25'], ['结论原文', '术区强化范围较前略增大，假性进展待排；建议灌注成像'], ['当时激素', '地塞米松 2mg/日']], src: '最近一次报告（演示）' } },
  lab: { prompt: '我拍了张化验单，帮我把白细胞数值读出来登记。', cand: { title: '指标数值候选（演示）', fields: [['WBC', '3.8 10⁹/L'], ['日期', '2026-10-12'], ['来源', '复查血常规']], src: '血象（演示）' } },
  symptom: { prompt: '凌晨他抽了一分半，左手抖，是我看到的。', cand: { title: '发作事件候选（演示）', fields: [['时间', '凌晨（待核对具体时刻）'], ['时长', '约 1.5 分钟'], ['类型', '局灶性（待核对）'], ['目击', '照护者代记']], src: '癫痫事件（演示）' } },
  nutrition: { prompt: '今天吃得下，早上称了 77.8 公斤，帮我记一下。', cand: { title: '营养日记录候选（演示）', fields: [['进食', '吃得下'], ['体重', '77.8 kg'], ['日期', '2026-10-24']], src: '进食与体重（演示）' } },
  care: { prompt: '帮我记一条照护者感受：这两天他话变少了，我心里没底。', cand: { title: '感受候选（演示 · 默认私密）', fields: [['内容', '这两天他话变少了，我心里没底'], ['记录人', '照护者'], ['可见性', 'private（默认不进导出）']], src: '当下感受（演示）' } },
  followup: { prompt: '帮我把复诊要问的几条整理成清单。', cand: { title: '问题清单候选（演示）', fields: [['问题 1', '是否需要灌注成像'], ['问题 2', '激素减量后影像怎么读'], ['来源', '场景页生成']], src: '就诊准备（演示）' } }
};

/* ---------------- state ---------------- */
const state = {
  page: 'dash', sub: {}, profileId: 'demo1',
  range: 'all', zoom: 100,
  sel: { demo1: ['WBC', 'DEXA', 'KPS'], demo2: ['WEIGHT', 'NA', 'KPS'] },
  toggles: { treatment: true, keypoints: true },
  pin: null, flipped: new Set(),
  agent: { open: false, w: agentWidthFromStorage(), draft: null, cand: null, phase: 'idle', degraded: RUNTIME === 'standalone' },
  cfg: {
    root: '/Users/demo/Documents/StarPal（演示）', size: { doc: 3.2, derived: 0.8, db: 0.4 },
    backupAt: '2026-10-23 22:10', tokenState: 'none', tokenMasked: null, consent: false
  },
  /* 逐档案的可编辑内存态 */
  mem: {
    demo1: {
      questions: [
        { id: 'q1', text: '是否需要灌注成像（或磁共振波谱）来鉴别？', asked: false, src: 'MRI 并列 · 2026-09-25 报告后生成' },
        { id: 'q2', text: '激素试减之后的影像变化怎么看？', asked: false, src: '激素剂量 · 场景生成' },
        { id: 'q3', text: '第 4 周期 D1 前血象要查哪几项？', asked: false, src: 'Stupp 日程 · 2026-10-28 前' }
      ],
      seizures: [], cogEvents: [], topics: [], savedTrials: [], meals: []
    },
    demo2: {
      questions: [
        { id: 'q1', text: '灌注成像结果什么时候出、怎么看？', asked: false, src: '就诊准备 · 2026-10-02 门诊后' },
        { id: 'q2', text: '如果都不做再放疗，接下来观察什么？', asked: true, src: '照护决策 · 与医生讨论后' }
      ],
      seizures: [], cogEvents: [], topics: [], savedTrials: [], meals: []
    }
  },
  toastTimer: null
};
/* 数据唯一入口：/api/bootstrap（readmodels 把库里的行还原成 demo-data.js 同一形状）。
   首屏先空态，boot() 异步填充后 render——启动异步化（定点替换 5/5）。 */
let DATA = { profiles: [], meta: {} };
const profiles = () => DATA.profiles;
const profile = () => DATA.profiles.find((p) => p.id === state.profileId) || DATA.profiles[0];
const mem = () => state.mem[state.profileId];
const TODAY = DATA.meta.today || '2026-10-24';
/* private 三出口过滤（看板摘要 / 一图秀 / 导出预览 / AI 上下文默认）共用此函数 */
const sharedOnly = (p) => (p.viewpoints || []).filter((v) => v.visibility !== 'private');
const privateCount = (p) => (p.viewpoints || []).filter((v) => v.visibility === 'private').length;

/* ---------------- 通用 UI ---------------- */
const btn = (text, action, cls = '', attr = '') => `<button class="${cls}" data-action="${action}" ${attr}>${text}</button>`;
const go = (text, page, sub = '', cls = '') => btn(text, 'go', cls, `data-page="${page}" data-sub="${esc(sub)}"`);
const pill = (text, cls = '') => `<span class="pill ${cls}">${esc(text)}</span>`;
const shortDate = (d) => String(d).slice(5).replace('-', '.');
const longDate = (d) => String(d).replace(/-/g, '.');
const fmtNum = (v, dec) => (dec === 0 ? String(Math.round(v)) : Number(v).toFixed(dec ?? 1));
const addDays = (d, n) => longDate(new Date(Date.parse(d) + n * DAY)).replace(/\./g, '-');
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

function toast(t, opts = {}) {
  clearTimeout(state.toastTimer);
  const el = $('#toast');
  el.innerHTML = esc(t) + (opts.back ? ` <button class="toast-back" data-action="go" data-page="dash">回到看板</button>` : '');
  el.classList.add('visible');
  state.toastTimer = setTimeout(() => el.classList.remove('visible'), 4200);
}
function openModal(title, body, foot = '', eyebrow = '小星宝 · 交互演示') {
  $('#dialog-title').textContent = title;
  $('#dialog-eyebrow').textContent = eyebrow;
  $('#dialog-body').innerHTML = body;
  $('#dialog-foot').innerHTML = foot;
  if (!$('#dialog').open) $('#dialog').showModal();
  document.body.style.overflow = 'hidden';
}
const closeModal = () => { if ($('#dialog').open) $('#dialog').close(); };
$('#dialog').addEventListener('close', () => { document.body.style.overflow = ''; });

function navigate(page, sub) {
  state.page = page;
  if (sub) state.sub[page] = sub;
  try { history.replaceState(null, '', '#' + page + (sub ? '/' + sub : '')); } catch (e) { /* file:// 下忽略 */ }
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
const section = (title, desc = '', action = '') => `<div class="section-title"><div><h2>${title}</h2>${desc ? `<p>${esc(desc)}</p>` : ''}</div>${action}</div>`;
const backRow = () => state.page === 'dash' ? '' : `<div class="back-row"><button class="text-button" data-action="go" data-page="dash">← 回到看板</button></div>`;
const aiBtn = (label = 'AI 协助示例') => btn(`${label}`, 'ai-draft', 'soft', `data-ai="${state.page}"`);
function head(title, desc, action = '') {
  return `<div class="page-head"><div><span class="eyebrow">STARPAL / GLIOBLASTOMA WORKBENCH</span><h1>${title}</h1><p>${desc}</p></div><div class="actions">${action}</div></div>`;
}
const subnav = () => {
  const items = SUBPAGES[state.page]; if (!items) return '';
  const sel = state.sub[state.page] || items[0][0];
  return `<nav class="subnav" role="tablist" aria-label="${PAGES.find((p) => p[0] === state.page)[1]}二级页面">${items.map(([k, s]) => `<button role="tab" aria-selected="${sel === k}" data-action="sub" data-sub="${k}">${esc(s)}</button>`).join('')}</nav>`;
};
const subLabel = (page) => {
  const items = SUBPAGES[page]; if (!items) return '';
  const k = state.sub[page] || items[0][0];
  return items.find((x) => x[0] === k)[1];
};
const pageHeadFor = (desc, action = '') => head(subLabel(state.page), desc, action ? `${action}${aiBtn()}` : aiBtn()) + subnav();

/* ⋯ 更多菜单（手工通道收敛口：手工补一条 / 改这一条 / 看原文） */
const moreMenu = (items) => `<details class="more-menu"><summary aria-label="更多操作">⋯</summary><div class="menu">${items.map(([t, a, attr]) => `<button data-action="${a}" ${attr || ''}>${esc(t)}</button>`).join('')}</div></details>`;

/* ---------------- 时间与治疗条 ---------------- */
function seriesAll(code) {
  const p = profile();
  const m = CATALOG[code];
  if (!m) return [];
  if (code === 'KPS') return (p.metrics.qual.KPS || []).map((x) => ({ d: x.d, v: x.v, src: x.src, label: x.label }));
  const arr = (p.metrics.numeric || {})[code] || [];
  return arr.map((x) => ({ d: x.d, v: x.v, src: x.src }));
}
function profileStart(p) {
  const dates = [];
  Object.values(p.metrics.numeric || {}).forEach((a) => a.forEach((x) => dates.push(Date.parse(x.d))));
  (p.metrics.qual.KPS || []).forEach((x) => dates.push(Date.parse(x.d)));
  p.surgery.forEach((s) => dates.push(Date.parse(s.date)));
  return Math.min(...dates) - 7 * DAY;
}
function profileEnd(p) {
  const dates = [Date.parse(TODAY)];
  Object.values(p.metrics.numeric || {}).forEach((a) => a.forEach((x) => dates.push(Date.parse(x.d))));
  (p.metrics.qual.KPS || []).forEach((x) => dates.push(Date.parse(x.d)));
  ((p.ttfields && p.ttfields.daily) || []).forEach((x) => dates.push(Date.parse(x.date)));
  return Math.max(...dates);
}
function treatmentBands(p) {
  const out = [];
  p.surgery.forEach((s) => out.push({ kind: 'surgery', label: s.degree === 'GTR' ? '全切' : '部分切除', date: s.date, color: '#1F4262' }));
  const onc = p.oncology;
  if (onc.concurrent) out.push({ kind: 'rt', label: '放疗 ' + (onc.concurrent.rt.match(/\d+\s*次/) ? onc.concurrent.rt.match(/\d+\s*次/)[0] : '30 次'), from: onc.concurrent.from, to: onc.concurrent.to, color: '#2F5D8A' });
  (onc.adjuvantCycles || []).forEach((c) => out.push({ kind: 'tmz', label: c.plan.includes('×12') ? 'TMZ C1–12' : `TMZ C${c.n}`, from: c.from, to: c.to, d1: addDays(c.from, c.delayDays || 0), color: '#4a7ba6' }));
  const tt = p.ttfields;
  if (tt.started && tt.daily.length) {
    const weeks = {};
    tt.daily.forEach((d) => {
      const t = Date.parse(d.date); const wk = new Date(t); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7));
      const key = wk.toISOString().slice(0, 10);
      (weeks[key] = weeks[key] || { from: key, to: key, hours: 0 }).hours += d.wearHours;
      if (d.date > weeks[key].to) weeks[key].to = d.date;
    });
    Object.values(weeks).forEach((w) => out.push({ kind: 'ttf', label: '', from: w.from, to: addDays(w.from, 5), color: '#2f6f66' })); /* 周聚合带，留 1 天缝 */
  }
  return out;
}

/* ---------------- 一图秀（16 号合同：R1–R12） ---------------- */
const CW = 980, CH = 432, CX0 = 56, CX1 = 950, CY0 = 148, CY1 = 372;
const LANES = { rt: 36, tmz: 58, ttf: 80 };

function domain() {
  const p = profile();
  const end = profileEnd(p);
  const months = { '3m': 3, '6m': 6, '12m': 12 }[state.range];
  const start = months ? new Date(new Date(end).setMonth(new Date(end).getMonth() - months)) : new Date(profileStart(p));
  const span = end - start.getTime();
  const kept = span * state.zoom / 100;
  return [end - kept, end];
}
const inDomain = (d, t0, t1) => { const t = Date.parse(d); return t >= t0 && t <= t1; };
const xOf = (t, t0, t1) => CX0 + (t - t0) / Math.max(1, t1 - t0) * (CX1 - CX0);
function smoothPath(coords) { /* 单调三次（Hermite→Bezier），同族骨架实现 */
  if (!coords.length) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  return coords.reduce((d, p, i) => {
    if (!i) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = coords[i - 1], before = coords[i - 2] || prev, after = coords[i + 1] || p;
    const c1x = prev.x + (p.x - before.x) / 6, c1y = prev.y + (p.y - before.y) / 6;
    const c2x = p.x - (after.x - prev.x) / 6, c2y = p.y - (after.y - prev.y) / 6;
    return `${d} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');
}
function seriesFor(code, t0, t1) {
  const m = CATALOG[code];
  const all = seriesAll(code);
  if (!all.length) return { code, m, lo: 0, hi: 1, span: 1, pts: [], all };
  const vals = all.map((p) => p.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || Math.max(Math.abs(hi) * 0.08, 1); /* 零跨度兜底 */
  return { code, m, lo, hi, span, pts: all.filter((p) => inDomain(p.d, t0, t1)), all };
}
function monthTicks(t0, t1) {
  const out = []; const d = new Date(t0); let cur = new Date(d.getFullYear(), d.getMonth(), 1);
  if (cur.getTime() < t0) cur.setMonth(cur.getMonth() + 1);
  while (cur.getTime() <= t1) {
    const x = xOf(cur.getTime(), t0, t1);
    if (x > CX0 + 6 && x < CX1 - 6) out.push({ x, label: `${cur.getFullYear() % 100}-${String(cur.getMonth() + 1).padStart(2, '0')}` });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return out.length > 7 ? out.filter((_, i) => i % 2 === 0) : out;
}
function chartSVG(t0, t1) {
  const p = profile();
  const sel = state.sel[state.profileId];
  const series = sel.map((c) => seriesFor(c, t0, t1)).filter((s) => s.pts.length);
  if (!series.length) {
    return `<div class="empty"><h3>这个时间窗里没有所选指标</h3><p>扩大时间范围，或在左侧加选一个指标。</p></div>`;
  }
  const bands = state.toggles.treatment ? treatmentBands(p).filter((b) => {
    const t = b.date ? Date.parse(b.date) : null;
    const f = t !== null ? t : Date.parse(b.from), e = t !== null ? t : Date.parse(b.to);
    return e >= t0 && f <= t1;
  }) : [];
  const yOf = (s, v) => CY1 - (v - s.lo) / s.span * (CY1 - CY0);
  const grid = [0, 1, 2, 3, 4].map((i) => { const y = CY0 + i * (CY1 - CY0) / 4; return `<line class="grid" x1="${CX0}" x2="${CX1}" y1="${y}" y2="${y}"/>`; }).join('');

  /* 治疗条分层（R3）：放疗 / TMZ（含 D1–5 标记）/ 电场周聚合带 各占独立泳道；手术=菱形+竖虚线 */
  const strip = [];
  bands.forEach((b) => {
    if (b.kind === 'surgery') {
      const x = xOf(Date.parse(b.date), t0, t1).toFixed(1);
      strip.push(`<g><path d="M ${x} ${LANES.rt - 5} l4.5 4.5 -4.5 4.5 -4.5 -4.5 Z" fill="${b.color}"/><text x="${(+x + 8).toFixed(1)}" y="${LANES.rt + 8}" font-size="9" fill="${b.color}" font-weight="600">${esc(b.label)}</text></g>`);
      strip.push(`<line x1="${x}" x2="${x}" y1="${CY0}" y2="${CY1}" stroke="${b.color}" stroke-width="1.2" stroke-dasharray="3 6" opacity=".4"/>`);
    } else if (b.kind === 'rt') {
      const x1 = Math.max(xOf(Date.parse(b.from), t0, t1), CX0), x2 = Math.min(xOf(Date.parse(b.to), t0, t1), CX1);
      strip.push(`<g><rect x="${x1.toFixed(1)}" y="${LANES.rt}" width="${Math.max(x2 - x1, 7).toFixed(1)}" height="8" rx="4" fill="${b.color}" opacity=".3"/><text x="${(x1 + 1).toFixed(1)}" y="${(LANES.rt - 4).toFixed(1)}" font-size="9" fill="${b.color}" font-weight="500">${esc(b.label)}</text></g>`);
    } else if (b.kind === 'tmz') {
      const x1 = Math.max(xOf(Date.parse(b.from), t0, t1), CX0), x2 = Math.min(xOf(Date.parse(b.to), t0, t1), CX1);
      const d1x = xOf(Date.parse(b.d1), t0, t1), d5x = xOf(Date.parse(b.d1) + 4 * DAY, t0, t1);
      strip.push(`<g><rect x="${x1.toFixed(1)}" y="${LANES.tmz}" width="${Math.max(x2 - x1, 7).toFixed(1)}" height="8" rx="4" fill="${b.color}" opacity=".26"/><rect x="${d1x.toFixed(1)}" y="${(LANES.tmz - 1).toFixed(1)}" width="${Math.max(Math.min(d5x, x2) - d1x, 2).toFixed(1)}" height="10" rx="2" fill="${b.color}" opacity=".55"/><text x="${(x1 + 1).toFixed(1)}" y="${(LANES.tmz - 4).toFixed(1)}" font-size="8.5" fill="${b.color}" font-weight="500">${esc(b.label)}${esc(b.d1 > b.from ? '（顺延后）' : '')}</text></g>`);
    } else if (b.kind === 'ttf') {
      const x1 = Math.max(xOf(Date.parse(b.from), t0, t1), CX0), x2 = Math.min(xOf(Date.parse(b.to), t0, t1), CX1);
      strip.push(`<rect x="${x1.toFixed(1)}" y="${LANES.ttf}" width="${Math.max(x2 - x1, 3).toFixed(1)}" height="7" rx="3" fill="${b.color}" opacity=".24"/>`);
    }
  });
  const rowLabels = state.toggles.treatment ? `<text x="6" y="${LANES.rt + 7}" font-size="8.5" fill="#9aa7b4">放疗</text><text x="6" y="${LANES.tmz + 7}" font-size="8.5" fill="#9aa7b4">TMZ</text><text x="6" y="${LANES.ttf + 6}" font-size="8.5" fill="#9aa7b4">电场</text>` : '';

  /* 末点标签三向避让（R4）：13px 最小间距 + 右缘内锚 + 溢出整体上移 */
  const lastPos = series.map((s) => {
    const c = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    const last = c[c.length - 1];
    return { s, x: last.x, y: last.y, v: s.pts[s.pts.length - 1].v };
  }).sort((a, b) => a.y - b.y);
  let cursor = -Infinity;
  for (const it of lastPos) { it.ly = Math.max(it.y, cursor + 13); cursor = it.ly; }
  const overflow = lastPos.length ? Math.max(0, lastPos[lastPos.length - 1].ly - (CY1 + 2)) : 0;
  if (overflow) for (const it of lastPos) it.ly -= overflow;

  const lines = series.map((s, si) => {
    const coords = s.pts.map((p) => ({ x: xOf(Date.parse(p.d), t0, t1), y: yOf(s, p.v) }));
    /* R2 单点不连线；分类序列（KPS）只画节点不连线（红线） */
    const canLine = !s.m.categorical && s.pts.length > 1;
    const path = canLine ? `<path class="line" d="${smoothPath(coords)}" stroke="${s.m.color}" pathLength="1"/>` : '';
    const dots = coords.map((c, i) => {
      const p = s.pts[i];
      const isLast = i === s.pts.length - 1;
      const r = isLast ? 5.2 : 4;
      const active = state.pin && state.pin.code === s.code && state.pin.date === p.d;
      return `<circle class="pt${active ? ' active' : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${r}" fill="${s.m.color}" data-action="pin" data-code="${s.code}" data-date="${p.d}"><title>${esc(s.m.name)} ${fmtNum(p.v, s.m.dec)} ${esc(s.m.unit)} · ${p.d}</title></circle>`;
    }).join('');
    const lp = lastPos.find((x) => x.s === s);
    const nearRight = lp.x > CX1 - 46;
    const lx = nearRight ? lp.x - 8 : lp.x + 8;
    const label = state.toggles.keypoints
      ? `<text class="delta-tag" x="${lx.toFixed(1)}" y="${(lp.ly + 4 + (si % 2 ? -11 : 0)).toFixed(1)}" text-anchor="${nearRight ? 'end' : 'start'}" fill="${s.m.color}">${fmtNum(lp.v, s.m.dec)}</text>` : '';
    return `<g>${path}${dots}${label}</g>`;
  }).join('');
  const ticks = monthTicks(t0, t1).map((t) => `<line class="axis" x1="${t.x.toFixed(1)}" x2="${t.x.toFixed(1)}" y1="${CY1}" y2="${CY1 + 5}"/><text class="tick" x="${t.x.toFixed(1)}" y="${CY1 + 18}" text-anchor="middle">${t.label}</text>`).join('');
  const singleNotes = series.filter((s) => !s.m.categorical && s.pts.length === 1).map((s) => `${s.m.name}只有 1 次记录，暂不连线`).join('；');
  return `<svg class="chart" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="多指标时间轴：每条线按该指标全部记录范围缩放，不代表不同指标数值可比；共 ${series.length} 条序列">
    ${grid}${ticks}${strip.join('')}${rowLabels}${lines}
    <text class="tick" x="${CX0}" y="${CY1 + 36}">↑ 每条线按该指标全部记录范围缩放，不代表不同指标数值可比${singleNotes ? '；' + esc(singleNotes) : ''}</text>
  </svg>`;
}

/* ---------------- 指标卡（3D 翻转 / 分类卡不翻） ---------------- */
function metricCard(code) {
  const m = CATALOG[code];
  const all = seriesAll(code);
  if (!all.length) {
    /* M2：无记录的指标仍列出，不编分级 */
    const ct = CTCAE[code];
    return `<div class="ccard" aria-label="${esc(m.name)}：暂无记录">
      <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}</span>
      <span class="name">${esc(m.name)}${ct ? ` · ${esc(ct.term)}可对照` : ''}</span>
      <span class="na">这个档案里还没有${esc(m.name)}的记录。没显示不等于正常——下次化验后登记进来。</span>
      <span class="rec">${moreMenu([['手工补一条', 'manual-add', `data-code="${code}"`], ['AI 协助登记', 'ai-draft', `data-ai="lab"`]])}</span>
    </div>`;
  }
  if (m.categorical) {
    return `<div class="ccard" aria-label="${esc(m.name)}：分类记录，只列各次结果，不做趋势线">
      <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)} · 分类序列</span>
      <span class="name">${esc(m.name)}</span>
      <span class="val">${fmtNum(all[all.length - 1].v, 0)}<small>/100</small></span>
      <span class="vals">${all.slice(-4).map((x) => `<span><b>${esc(x.label || fmtNum(x.v, 0))}</b><br>${shortDate(x.d)}</span>`).join('')}</span>
      <span class="rec">${all.length} 次记录 · ${shortDate(all[all.length - 1].d)} · 分类记录不连线不翻转</span>
    </div>`;
  }
  const pts = all, last = pts[pts.length - 1], prev = pts[pts.length - 2];
  const diff = prev ? last.v - prev.v : 0;
  const unit = m.unit ? `<small>${esc(m.unit)}</small>` : '';
  const arrow = prev ? (diff > 0 ? '↑' : diff < 0 ? '↓' : '→') : '';
  const gr = CTCAE[code] ? ctcaeGrade(code, last.v) : null;
  const grBadge = gr ? pill(`对照 CTCAE v5.0 · ${gr.g} 级`, gr.g >= 3 ? 'red' : gr.g === 2 ? 'yellow' : 'grey') : '';
  const backPts = pts.slice(-5);
  const bw = 168, bh = 54, bpad = 6;
  const vals = backPts.map((x) => x.v);
  const blo = Math.min(...vals), bhi = Math.max(...vals);
  const bspan = bhi - blo || 1;
  const bx = (i) => bpad + (backPts.length === 1 ? (bw - bpad * 2) / 2 : i / (backPts.length - 1) * (bw - bpad * 2));
  const by = (v) => bh - bpad - (v - blo) / bspan * (bh - bpad * 2);
  const path = backPts.length > 1 ? `<path class="sp-line" d="${smoothPath(backPts.map((x, i) => ({ x: bx(i), y: by(x.v) })))}" stroke="${m.color}" pathLength="1"/>` : '';
  const dots = backPts.map((x, i) => `<circle class="sp-dot" cx="${bx(i).toFixed(1)}" cy="${by(x.v).toFixed(1)}" r="2.8" fill="${m.color}"/>`).join('');
  const ct = CTCAE[code];
  const backRange = ct ? `对照 CTCAE v5.0 ${ct.term}：本值${gr ? `落 ${gr.g} 级区间（${gr.range}）` : '未进入该标准的降低分级区间（该标准只对降低侧分级），因此不显示徽章'}。对照不是诊断。` : `全期 ${fmtNum(Math.min(...vals), m.dec)}–${fmtNum(Math.max(...vals), m.dec)} ${esc(m.unit)}。`;
  return `<button class="mcard" aria-pressed="${state.flipped.has(code)}" data-action="flip" data-code="${code}" aria-label="${esc(m.name)}，最新 ${fmtNum(last.v, m.dec)} ${esc(m.unit)}，点击查看最近 ${backPts.length} 次记录与参考区间">
    <span class="mcard-inner">
      <span class="mface front" aria-hidden="true">
        <span class="cat"><i style="background:${m.color}"></i>${esc(m.cat)}${ct ? ' · 有 CTCAE 对照' : ''}</span>
        <span class="name">${esc(m.name)}${grBadge}</span>
        <span class="val">${fmtNum(last.v, m.dec)}${unit}</span>
        <span class="delta">${prev ? `${arrow} 较前次 <em>${diff > 0 ? '+' : ''}${fmtNum(diff, m.dec)}</em>` : '仅 1 次记录'}</span>
        <span class="rec">共 ${pts.length} 次 · ${shortDate(last.d)}</span>
        <span class="meta"><span>${esc(last.src || '')}</span><span class="hint">点开看趋势与区间</span></span>
      </span>
      <span class="mface back" aria-hidden="true">
        <span class="cat">最近 ${backPts.length} 次 · ${esc(m.cat)}</span>
        <span class="name">${esc(m.name)}</span>
        <span class="count">${esc(backRange)}</span>
        <svg class="spark" viewBox="0 0 ${bw} ${bh}" aria-hidden="true"><line class="base" x1="${bpad}" x2="${bw - bpad}" y1="${bh - bpad}" y2="${bh - bpad}"/>${path}${dots}</svg>
        <span class="spark-labels"><span>${esc(shortDate(backPts[0].d))}</span><span>${fmtNum(backPts[0].v, m.dec)} → ${fmtNum(last.v, m.dec)}</span><span>${esc(shortDate(last.d))}</span></span>
        <span class="foot">仅回顾已核对记录 · 对照不是诊断</span>
      </span>
    </span>
  </button>`;
}

/* ---------------- 36 号 §2.6 看板状态卡（疾病概要的触发器） ----------------
   四件硬结构：卡头（D+N eyebrow）／大字天数（锚点日派生，不手填）／现状行（阶段原文 + 状态 + 下次）／
   出口按钮排（主=当前阶段核心页，副=疾病概要浮窗）。
   天数一律由「手术日 = Day 0」派生：换演示日期或换档案时天数自己跟着变，不出现写死的 175。 */
const DP_TRIGGER_ATTR = 'data-primer-open';
function statusCard(p) {
  const surg = (p.surgery && p.surgery[0]) || null;
  const anchor = surg ? surg.date : null;
  const dayN = anchor ? daysBetween(anchor, TODAY) : null;
  const onc = p.oncology || {};
  const cyc = onc.adjuvantCycles || [];
  const lastCyc = cyc[cyc.length - 1];
  const nextDate = ((onc.nextOn || '').match(/\d{4}-\d{2}-\d{2}/) || [])[0] || null;
  /* nextOn 是「2026-10-28（第 4 周期 D1，待复诊确认血象）」：事项取括号原文，
     不能把日期再抄一遍（曾渲染成「2026.10.28（2026-10-28）」）。 */
  const nextWhat = ((onc.nextOn || '').match(/[（(]([^）)]*)[）)]/) || [])[1] || '';
  const nextIn = nextDate ? daysBetween(TODAY, nextDate) : null;
  const phase = String(p.stageLine || '').split('→').pop().trim();
  const summaryBtn = `<button type="button" class="text-button" ${DP_TRIGGER_ATTR} aria-haspopup="dialog" aria-controls="disease-primer" aria-label="疾病概要：定义、医学资料与指南情况、治疗全景、发展趋势">疾病概要：胶质母细胞瘤是什么？</button>`;

  /* 没有锚点：整卡「待初始化」，指向补记录，不用一个假天数糊过去。 */
  if (dayN === null) {
    return `<div class="card" style="border-left:3px solid var(--brand);margin-bottom:16px">
      <span class="eyebrow">状态卡 · 待初始化</span>
      <p style="margin:8px 0 0"><b>还没有手术日期</b>（Day 0），天数与阶段无法派生。补上手术记录后这张卡自己算。</p>
      <div class="actions" style="margin-top:12px">${go('去补手术记录', 'tumor', 'surgery', 'primary')}${summaryBtn}</div>
    </div>`
  }

  /* 状态只写「日期到了没有」这类事实，不写「稳定 / 好转 / 进展」。 */
  const status = lastCyc
    ? (lastCyc.to && lastCyc.to < TODAY
        ? `第 ${lastCyc.n} 周期已结束（${longDate(lastCyc.to)}）· ${nextDate ? '等下一周期 D1' : '等复诊排期'}`
        : `第 ${lastCyc.n} 周期进行中（${longDate(lastCyc.from)} 起）`)
    : '尚无辅助化疗记录';

  return `<div class="card" style="border-left:3px solid var(--brand);margin-bottom:16px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div style="min-width:0">
        <span class="eyebrow">D+${dayN} 状态卡 · ${nextIn !== null && nextIn >= 0 ? `距下次 ${nextIn} 天` : '下次待通知'}</span>
        <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin:4px 0 2px">
          <div style="font-size:28px;font-weight:700;color:var(--brand);line-height:1.1">第 ${dayN} 天</div>
          <small style="color:var(--muted);font-size:11px">锚点 ${longDate(anchor)}${surg.degreeLabel ? ' · ' + esc(surg.degreeLabel) : ''} · 自动派生，不手填</small>
        </div>
      </div>
      ${pill(nextDate ? `下次 ${shortDate(nextDate)}` : '下次待通知', 'blue')}
    </div>
    <p style="margin:8px 0 0;font-size:12.5px;line-height:1.7">
      <b>阶段原文</b>：${esc(phase)}　·　<b>状态</b>：${esc(status)}<br>
      <b>下次</b>：${nextDate ? `${longDate(nextDate)}${nextWhat ? '（' + esc(nextWhat) + '）' : ''}` : '待医院排期'}
    </p>
    <p class="small-note" style="margin:4px 0 0">诊断原文：${esc(p.diagnosis)} · ${p.age} 岁 · 演示数据</p>
    <div class="actions" style="margin-top:12px">
      ${go('看放化疗日历（按天）→', 'chemo', 'stupp', 'primary')}
      ${summaryBtn}
    </div>
  </div>`
}

/* ---------------- 看板 ---------------- */
function nextCycleInfo(p) {
  const onc = p.oncology;
  const cyc = onc.adjuvantCycles || [];
  if (!cyc.length) return null;
  const last = cyc[cyc.length - 1];
  const d1 = addDays(last.from, last.delayDays || 0);
  const d1n = parseInt(onc.nextOn, 10) ? null : onc.nextOn;
  return { last, d1, nextText: onc.nextOn };
}
function pageDash() {
  const p = profile();
  const m = mem();
  const nc = nextCycleInfo(p);
  const tt = p.ttfields;
  const lastWBC = (p.metrics.numeric.WBC || []).slice(-1)[0];
  const wbcLow = (p.metrics.numeric.WBC || []).slice().sort((a, b) => a.v - b.v)[0];
  const nextMri = p.mri[p.mri.length - 1];
  const nextOnDays = nextMri && nextMri.next.includes('2026-11-06') ? daysBetween(TODAY, '2026-11-06') : null;
  const kpsLast = (p.metrics.qual.KPS || []).slice(-1)[0];
  const dexLast = p.steroids[p.steroids.length - 1];

  /* 双主体 8 入口（INTERACTION-DESIGN §二） */
  const selfEntries = [
    ['◷', '今天 D 几、该不该吃', nc ? (nc.nextText ? '下一周期 D1 待复诊确认 · 今天是休息日' : '见 Stupp 日程') : '辅助 TMZ 已完成', 'chemo', 'stupp'],
    ['◐', '血象提醒', lastWBC ? `最近 WBC ${fmtNum(lastWBC.v, 1)}（${shortDate(lastWBC.d)}）${wbcLow && wbcLow.v < 3.0 ? ' · 历史低点 ' + fmtNum(wbcLow.v, 1) + ' 曾按医嘱顺延' : ''}` : '本档案暂无血象记录（不编数据）', 'lab', 'blood'],
    ['▤', '下次复查', nextOnDays !== null ? `2026-11-06 复查 MRI + 复诊讨论（${nextOnDays} 天后）` : (nextMri ? nextMri.next : '待医院通知'), 'followup', 'schedule'],
    ['◎', '看看我的瘤', p.diagnosis, 'tumor', 'molecular']
  ];
  const careEntries = [
    ['⌁', '贴片换了吗 / 今天戴够了吗', tt.started ? `昨日 ${fmtNum(tt.daily[tt.daily.length - 1].wearHours, 1)}h · 目标语境由治疗团队解释` : '未开始电场治疗（是否适用由治疗团队解释）', 'ttf', 'wear'],
    ['⚡', '记一次发作', p.seizures.length ? `已有 ${p.seizures.length} 条事件记录` : '还没有发作记录；有就记一条', 'symptom', 'seizure'],
    ['✎', '最近在想的事', `${m.questions.filter((q) => !q.asked).length} 条想问的事待问`, 'care', 'feelings'],
    ['☰', '今天他该做什么', nc ? (tt.started ? '服药休息日 · 电场照常佩戴' : '服药休息日') : '按医嘱休息 · 复诊讨论前整理问题', 'chemo', 'stupp']
  ];
  const duo = (title, cls, entries) => `<div class="duo-col ${cls}"><span class="duo-tag"><i></i>${title}</span>
    <div class="task-grid">${entries.map(([g, t, d, page, sub]) => `<button class="task-entry" data-action="go" data-page="${page}" data-sub="${sub}">
      <span class="entry-icon">${g}</span><b>${esc(t)}</b><span>${esc(d)}</span><span class="arrow">→</span></button>`).join('')}</div></div>`;

  const recentCards = state.sel[state.profileId].filter((c) => c !== 'KPS').slice(0, 3);

  return `${head('看板', SUBTITLES.dash, aiBtn())}
    ${statusCard(p)}
    <div class="stage-strip"><span class="eyebrow">当前阶段 · 引用医生语境</span><b>${esc(p.stageLine)}</b><small>${esc(p.diagnosis)} · ${p.age} 岁 · 演示数据</small></div>
    ${duo('本人 · 现在可以做', 'self', selfEntries)}
    ${duo('照护者 · 现在可以做', 'care', careEntries)}
    <div class="change-strip">
      <div class="chg"><span>最近 KPS（医生评估原文）</span><b>${kpsLast ? `${esc(kpsLast.label)} · ${longDate(kpsLast.d)}` : '—'}</b><p>分类记录，只列数值不做趋势</p></div>
      <div class="chg"><span>最近 MRI（结论原文）</span><b>${longDate(nextMri.date)} · 「${esc(nextMri.excerpt)}」</b><p>判读归神经影像与治疗团队 · 本台不做判读</p></div>
      <div class="chg"><span>最近激素调整</span><b>${dexLast ? `${dexLast.kind === 'INCREASE' ? '加量至' : dexLast.kind === 'DECREASE' ? '减量至' : dexLast.mg === 0 ? '停用' : '调整至'} ${dexLast.mg}mg/日 · ${shortDate(dexLast.date)}` : '—'}</b><p>${esc(dexLast ? dexLast.note : '')}</p></div>
      <div class="actions">${go('看 MRI 并列', 'mri', 'parallel', 'soft')}${go('看激素阶梯', 'lab', 'steroid', 'soft')}</div>
    </div>
    ${section('接下来 · 4 个指标卡', '点数值卡翻到背面看参考区间与最近 5 次；分类记录（KPS）不翻不连线。', go('看病情一图秀', 'lab', 'lab-panorama', 'primary'))}
    <div class="dash-cols">
      <div class="metric-grid">${recentCards.map(metricCard).join('')}${metricCard('KPS')}</div>
      <div class="stack">
        <div class="card accent">
          <div class="card-head"><div><h3>双主体说明</h3><p>照护者代记的条目会带「照护者代记」徽章；本人的私密感受默认不进摘要与导出。</p></div>${pill(`已隐藏 ${privateCount(p)} 条私密记录`, 'mist')}</div>
          <p class="small-note" style="margin:0">本页摘要只引用已登记事实与报告原文；${esc(DATA.meta.disclaimer)}</p>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>想问的事</h3><p>${m.questions.filter((q) => !q.asked).length} 条待问 · ${m.questions.length} 条累计</p></div>${go('去问题清单', 'mri', 'questions')}</div>
          ${m.questions.slice(0, 2).map((q) => `<div class="row"><div class="row-main"><div><b>${esc(q.text)}</b><p>${esc(q.src)}</p></div></div>${pill(q.asked ? '已问' : '待问', q.asked ? 'green' : 'grey')}</div>`).join('') || '<p class="small-note" style="margin:0">还没有记录。</p>'}
        </div>
      </div>
    </div>`;
}

/* ---------------- 我的瘤 ---------------- */
const MOL_META = {
  detected: { label: '检出', cls: 'green' },
  not_detected: { label: '未检出', cls: 'grey' },
  not_tested: { label: '未检测', cls: 'dashed' }
};
function pageMolecular() {
  const p = profile();
  const items = p.molecular;
  const n = { detected: 0, not_detected: 0, not_tested: 0 };
  items.forEach((x) => n[x.status]++);
  return `${pageHeadFor('每项标志物按 检出 / 未检出 / 未检测 三态记录；解释只解释名词，不做判断。')}
    <div class="notice blue"><b>未检测不等于阴性。</b>报告里没有的项目按「未检测」记，不会补成阴性；${n.not_tested} 项未检测属于正常情况，是否补测由医生结合方案决定。</div>
    <div class="mol-grid">
      ${items.map((x) => {
    const meta = MOL_META[x.status];
    return `<div class="mol-card ${x.status === 'not_tested' ? 'notested' : ''}">
          <div class="mol-head"><b>${esc(x.marker)}</b>${pill(meta.label, meta.cls)}</div>
          ${x.value ? `<div class="val">报告原文：${esc(x.value)}</div>` : ''}
          <p>${esc(x.explain)}</p>
          <div class="mol-meta">${x.method ? `方法 ${esc(x.method)} · ${esc(x.date)}` : '未送检 · 无方法与日期'} ${moreMenu([['手工补一项标志物', 'manual-add', `data-code="${esc(x.marker)}"`], ['改这一条', 'manual-edit', `data-code="${esc(x.marker)}"`]])}</div>
          <div class="actions" style="margin-top:9px">${btn('把这个问题记下来', 'q-from-term', 'soft', `data-term="${esc(x.marker)}"`)}</div>
        </div>`;
  }).join('')}
    </div>
    <p class="small-note">本页解释是「名词解释」不是「病情判断」；对治疗与预后的含义请医生结合全部结果说明。</p>`;
}
function pageSurgery() {
  const p = profile();
  return `${pageHeadFor('医生写的 GTR / STR 是什么意思：这里抄录报告原文，并给一句名词解释。')}
    ${p.surgery.map((s) => `<div class="card" style="margin-bottom:14px">
      <div class="card-head"><div><span class="eyebrow">${longDate(s.date)} · ${esc(s.hospital)}</span><h2 style="margin-top:4px">${s.degree === 'GTR' ? 'GTR · 全切' : 'STR · 部分切除'}</h2><p>${esc(s.degreeLabel)}</p></div>${pill(s.degree, s.degree === 'GTR' ? 'green' : 'blue')}</div>
      <div class="notice plain" style="margin-bottom:10px"><b>名词解释：</b>${s.degree === 'GTR' ? 'GTR（全切）指手术肉眼/影像下病变组织完全切除，是外科记录用语，不是疗效结论。' : 'STR（部分切除）指病变组织部分切除，切除范围与位置、安全边界有关，不等于"没切干净"。'}具体含义与后续安排由治疗团队解释。</div>
      <div class="row"><div class="row-main"><div><b>术中记录（原文摘抄）</b><p>${esc(s.notes)}</p></div></div>${moreMenu([['看原文', 'src', 'data-src="手术记录 · ' + esc(s.date) + '"'], ['改这一条', 'manual-edit', 'data-code="surgery"']])}</div>
    </div>`).join('')}
    <div class="grid two">
      <div class="card"><div class="card-head"><div><h3>这一页不做什么</h3></div></div>
        <div class="flag-list"><div>不计算切除率、不推断"切多少才够"</div><div>不给二次手术时机建议</div><div>术中记录只抄原文，不改写</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>手术时间会出现在</h3></div></div>
        <div class="flag-list"><div>一图秀：菱形节点 + 竖虚线（去「指标与用药 · 血象」看）</div><div>放化疗日历：同步期的起点参考</div></div>
        <div class="actions" style="margin-top:12px">${go('去病情一图看节点', 'lab', 'lab-panorama', 'soft')}</div>
      </div>
    </div>`;
}
function pagePathology() {
  const p = profile();
  return `${pageHeadFor('报告原文逐项抄录：数值、方法与日期照抄，本页不追加解释。')}
    <div class="card" style="margin-bottom:14px">
      <div class="card-head"><div><h3>病理与分子报告 · 逐项原文</h3><p>${p.molecular.length} 项 · 检出 ${p.molecular.filter((x) => x.status === 'detected').length} / 未检出 ${p.molecular.filter((x) => x.status === 'not_detected').length} / 未检测 ${p.molecular.filter((x) => x.status === 'not_tested').length}</p></div>${pill('原文抄录', 'grey')}</div>
      <div class="table-wrap"><table><thead><tr><th>项目</th><th>结果（原文）</th><th>方法</th><th>日期</th><th>出处</th></tr></thead><tbody>
        ${p.molecular.map((x) => `<tr><td><b>${esc(x.marker)}</b></td><td>${esc(x.value || MOL_META[x.status].label)}${pill(MOL_META[x.status].label, MOL_META[x.status].cls)}</td><td class="muted">${esc(x.method || '—')}</td><td class="num">${esc(x.date || '—')}</td><td class="muted">${esc(x.hospital || '病理报告（演示）')}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">「结果」列照抄报告；徽章只标记三态（检出/未检出/未检测），不是判断。</p>
    </div>
    <div class="help-box">原件存放在你选的资料目录（见 设置 · 工作区），本台不上传云端。若报告有更新版本，将作为新版本登记，不覆盖旧记录。</div>`;
}

/* ---------------- 放化疗日历 ---------------- */
function stuppToday(p) {
  const nc = nextCycleInfo(p);
  if (!nc) return { headline: '辅助 TMZ 已完成', detail: (p.oncology.recurrence ? p.oncology.recurrence.note : '') };
  const nd = p.oncology.nextOn ? p.oncology.nextOn.match(/2026-\d\d-\d\d/) : null;
  if (nd) {
    const gap = daysBetween(TODAY, nd[0]);
    return { headline: `今天是休息日（不服药）`, detail: `下一周期 D1：${longDate(nd[0])}（${gap} 天后，待复诊确认血象）` };
  }
  return { headline: '周期间歇期', detail: nc.nextText || '' };
}
function calGrid(fromDate, days, marks, today) {
  const cells = [];
  const startT = Date.parse(fromDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(startT + i * DAY);
    const iso = longDate(d).replace(/\./g, '-');
    const pad = d.getDay() === 0 || d.getDay() === 6;
    const mark = marks[iso];
    cells.push(`<div class="cal-cell ${mark ? mark.cls : ''} ${pad ? 'pad' : ''} ${iso === today ? 'today' : ''}"><span class="d">D${Math.floor(i / 7) + 1}·${(i % 7) + 1}</span><span class="t">${shortDate(iso)}${mark ? mark.t : ''}</span></div>`);
  }
  return cells.join('');
}
function pageStupp() {
  const p = profile();
  const onc = p.oncology;
  const td = stuppToday(p);
  const c = onc.concurrent;
  const cyc = onc.adjuvantCycles || [];
  const last = cyc[cyc.length - 1];
  /* 最近一个已完成周期的 28 天网格（D1–5 按实际起点高亮；周末弱化） */
  let gridHtml = '';
  if (last) {
    const d1 = addDays(last.from, last.delayDays || 0);
    const marks = {};
    for (let i = 0; i < 5; i++) marks[addDays(d1, i)] = { cls: 'tmx', t: '服药' };
    gridHtml = `<div class="card" style="margin-bottom:14px">
      <div class="cal-head"><div><h3>第 ${last.n} 周期 · 28 天网格（实际）</h3><p>计划 D1 ${shortDate(last.from)}${last.delayDays ? ` → 实际 D1 ${shortDate(d1)}（顺延 ${last.delayDays} 天）` : ''}</p></div>${pill(last.delayDays ? `顺延 ${last.delayDays} 天` : '按计划', last.delayDays ? 'yellow' : 'green')}</div>
      <div class="cal-grid">${calGrid(last.from, 28, marks, TODAY)}</div>
      <div class="cal-legend"><span><i></i>D1–5 服药日（实际）</span><span><i class="dot"></i>今天（${shortDate(TODAY)}）</span><span>虚线格=周末</span></div>
      <p class="small-note">记录：${esc(last.took)}</p>
    </div>`;
  }
  return `${pageHeadFor('同步放化疗 + 辅助 TMZ 的 28 天节奏；今天该不该吃，看今日卡。')}
    <div class="plan-card" style="margin-bottom:14px">
      <div>
        <span class="eyebrow">今日卡 · ${longDate(TODAY)}</span>
        <div class="big" style="margin-top:4px">${esc(td.headline)}</div>
        <p style="font-size:12px;margin-top:6px">${esc(td.detail)}</p>
        <div class="actions" style="margin-top:12px">${btn('已服', 'dose-log', 'soft', 'data-kind="took"')}${btn('吐了一次', 'dose-log', 'soft', 'data-kind="vomit"')}</div>
        <p class="small-note">吐了算不算漏服、要不要补，由治疗团队判断；记录只为复诊时说得清。${moreMenu([['手工补一条', 'manual-add', 'data-code="cycle"'], ['改这一条', 'manual-edit', 'data-code="cycle"']])}</p>
      </div>
      <div style="text-align:right">${pill('同步期已完成', 'green')}
        <p style="font-size:11px;margin-top:8px">${onc.nextOn ? esc(onc.nextOn) : '辅助期已完成'}</p>
      </div>
    </div>
    <div class="cal-wrap">
      <div>
        ${gridHtml || `<div class="empty"><h3>本档案没有 28 天周期网格</h3><p>辅助周期记录为整段登记（见「TMZ 周期」）。</p></div>`}
        ${p.id === 'demo2' && onc.recurrence ? `<div class="notice warn" style="margin-top:14px"><b>当前阶段（引用记录原文）：</b>「${esc(onc.recurrence.note)}」</div>` : ''}
      </div>
      <div class="rt-count">
        <span class="eyebrow">同步期放疗</span>
        <div class="big" style="margin-top:4px">30<small>/ 30 次</small></div>
        <p class="small-note">${esc(c.rt)} · ${longDate(c.from)} – ${longDate(c.to)}</p>
        <div class="progress"><i style="width:100%"></i></div>
        <p class="small-note">同步 TMZ：${esc(c.tmz)} · 状态 ${esc(c.status)}</p>
      </div>
    </div>
    <div class="help-box">「Stupp 方案」指 手术同步放化疗 + 辅助替莫唑胺（TMZ） 的通用方案结构名词；本台只按你的记录展示日程，不改剂量、不判断漏服。</div>`;
}
function pageCycles() {
  const p = profile();
  const cyc = p.oncology.adjuvantCycles || [];
  return `${pageHeadFor('每个周期的计划与实际分开记；顺延、减量都留原因。', go('看 Stupp 日程', 'chemo', 'stupp', 'soft'))}
    <div class="card">
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>周期</th><th>计划 D1</th><th>实际 D1</th><th>顺延</th><th>执行记录</th><th>剂量调整</th></tr></thead><tbody>
        ${cyc.map((c) => `<tr class="done"><td><b>第 ${c.n} 周期</b></td><td class="num">${esc(c.from)}</td><td class="num">${addDays(c.from, c.delayDays || 0)}</td><td class="num">${c.delayDays ? `+${c.delayDays} 天` : '—'}</td><td>${esc(c.took)}</td><td class="muted">${esc(c.adjust || '足量（未记录调整）')}</td></tr>`).join('')}
        ${p.id === 'demo1' ? `<tr class="next"><td><b>第 4 周期</b></td><td class="num">2026-10-28</td><td class="num">待复诊确认</td><td class="num">—</td><td>尚未开始</td><td class="muted">—</td></tr>` : ''}
      </tbody></table></div>
      <p class="small-note">「计划日」来自初始方案，「实际日」来自执行记录；两者都保留，才能回答"当时为什么改"。</p>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>血象与顺延的对应</h3><p>只并列时间先后，不判断因果。</p></div></div>
        ${p.id === 'demo1' ? `<div class="row"><div class="row-main"><div><b>2026-08-24 WBC 2.8</b><p>辅助 C2 低点（复查血常规）</p></div></div>${pill('记录', 'grey')}</div>
        <div class="row"><div class="row-main"><div><b>第 3 周期顺延 7 天</b><p>医嘱：血象低顺延（记录原文照抄）</p></div></div>${pill('医嘱', 'blue')}</div>` : `<div class="row"><div class="row-main"><div><b>第 9 周期起减量 25%</b><p>血象原因，医嘱（记录原文照抄）</p></div></div>${pill('医嘱', 'blue')}</div>`}
      </div>
      <div class="card"><div class="card-head"><div><h3>想问的事</h3></div></div>
        <div class="flag-list"><div>顺延对整个疗程节奏的影响</div><div>下周期前血象查哪几项、什么时候查</div></div>
        <div class="actions" style="margin-top:12px">${go('写进问题清单', 'mri', 'questions', 'soft')}</div>
      </div>
    </div>`;
}
function pageChanges() {
  const p = profile();
  const rows = [];
  if (p.id === 'demo1') {
    rows.push(['2026-06-26', '同步放化疗完成', '放疗 30/30 次 + 同步 TMZ 完成（记录原文）', 'green']);
    rows.push(['2026-09-07', '第 3 周期顺延 7 天', '医嘱：血象低顺延', 'yellow']);
    rows.push(['2026-09-10', '开始电场治疗', '医嘱安排（佩戴记录见「电场治疗」）', 'blue']);
  } else {
    rows.push(['2025-05-28', '同步放化疗完成', '放疗 30/30 次 + 同步 TMZ 完成', 'green']);
    rows.push(['2025-08', '第 9 周期起 TMZ 减量 25%', '血象原因，医嘱', 'yellow']);
    rows.push(['2026-03-01', '辅助 TMZ 12 周期完成', '末次 2026-02（记录原文）', 'green']);
    rows.push(['2026-09-14', '进入复发评估期（引用医生语境）', 'MRI 强化增大后，与医生讨论后续选择（本台不推荐任何选项）', 'orange']); // wording-allow: 复发=引用医生语境的记录原文（demo 数据流），非产品判断
  }
  return `${pageHeadFor('方案怎么改的、什么时候改的，逐条留痕；本台不评价改动。')}
    <div class="card">
      ${rows.map(([d, t, note, cls]) => `<div class="milestone on"><span class="dot"></span><div><b>${longDate(d)} · ${esc(t)}</b><p>${esc(note)}</p></div>${pill('留痕', cls)}</div>`).join('')}
      <p class="small-note" style="margin-top:10px">变更留痕只记录"发生了什么"；是否换方案、何时换，由治疗团队判断。</p>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>留痕三原则</h3></div></div>
        <div class="flag-list"><div>计划与实际同时保留，不互相覆盖</div><div>变更原因照抄医嘱原文</div><div>不推断"改对了没有"</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>下一步</h3></div></div>
        <p class="small-note" style="margin:0">${p.id === 'demo1' ? '第 4 周期 D1 待复诊确认血象后开始。' : '后续选择正在与医生讨论；讨论结果可在「照护决策与 ACP」记录话题状态。'}</p>
        <div class="actions" style="margin-top:12px">${p.id === 'demo1' ? go('看复查节奏', 'followup', 'schedule', 'soft') : go('去决策话题', 'care', 'decisions', 'soft')}</div>
      </div>
    </div>`;
}

/* ---------------- 电场治疗 ---------------- */
function ttfEmpty(text, hint, ctaPage, ctaSub) {
  return `<div class="empty"><h3>未开始电场治疗</h3><p>${esc(text)}（是否适用由治疗团队解释）</p><p class="small-note">${esc(hint)}</p><div class="actions" style="justify-content:center;margin-top:12px">${go(ctaPage === 'dash' ? '回到看板' : '去佩戴页看说明', ctaPage || 'ttf', ctaSub || 'wear', 'soft')}</div></div>`;
}
function pageWear() {
  const p = profile();
  const tt = p.ttfields;
  if (!tt.started) {
    return `${pageHeadFor('日佩戴时长、周统计与目标语境；全部来自设备报告或本人记录。')}
      ${ttfEmpty('本档案未开始电场治疗', '这里不编造佩戴数据；开始后会逐日显示佩戴条形。', 'dash', '')}`;
  }
  const daily = tt.daily;
  const last14 = daily.slice(-14);
  const weeks = {};
  daily.forEach((d) => {
    const t = new Date(Date.parse(d.date)); const wk = new Date(t); wk.setDate(wk.getDate() - ((wk.getDay() + 6) % 7));
    const key = wk.toISOString().slice(0, 10);
    (weeks[key] = weeks[key] || []).push(d.wearHours);
  });
  const wkList = Object.entries(weeks).map(([k, arr]) => ({ k, avg: arr.reduce((a, b) => a + b, 0) / arr.length, n: arr.length })).slice(-4);
  const goal = 18;
  const maxH = Math.max(...daily.map((d) => d.wearHours), 20);
  return `${pageHeadFor('日佩戴条形 + 周统计；≥18 小时的目标语境由治疗团队解释，本页只记录。')}
    <div class="notice plain">${esc(tt.targetHint || '治疗目标语境：每天佩戴时长越长越好——目标由治疗团队解释，本页只记录。')}</div>
    <div class="card" style="margin-bottom:14px">
      <div class="card-head"><div><h3>最近 14 天佩戴时长</h3><p>条形=设备/本人记录；横线=18 小时语境线（不是达标线判定）</p></div>${pill(`昨日 ${fmtNum(daily[daily.length - 1].wearHours, 1)}h`, 'blue')}</div>
      <div class="wear-chart">
        ${last14.map((d) => `<div class="wear-bar ${d.wearHours >= goal * 0.9 ? 'near' : ''} ${d.skin ? 'has-skin' : ''}" style="height:${Math.max(Math.round(d.wearHours / maxH * 118), 3)}px" title="${d.date} · ${d.wearHours}h${d.skin ? ' · 头皮:' + d.skin : ''}"></div>`).join('')}
        <i class="goal-line" style="bottom:${Math.round(goal / maxH * 124)}px"></i>
        <span class="goal-label" style="bottom:${Math.round(goal / maxH * 124) + 4}px">18h 语境线</span>
      </div>
      <div class="wear-weeks">
        ${wkList.map((w) => `<div class="wk-tile"><span>周 ${shortDate(w.k)} 起 · ${w.n} 天</span><b>${fmtNum(w.avg, 1)} h/日</b></div>`).join('')}
      </div>
      <div class="axis-note wear-note">琥珀色条=当天同时记了头皮反应（见「贴片与头皮」）。是否"够"、要不要调整，由治疗团队按设备报告与头皮情况解释。</div>
    </div>
    <div class="card">
      <div class="card-head"><div><h3>今日快记（滑条 5 秒）</h3><p>默认带出昨日时长，拖一下即可。</p></div></div>
      <div class="zoom"><input type="range" min="0" max="24" step="0.5" value="${daily[daily.length - 1].wearHours}" data-action="wear-slide" aria-label="今日佩戴时长（小时）"><span class="wear-val">${fmtNum(daily[daily.length - 1].wearHours, 1)} h</span></div>
      <div class="actions" style="margin-top:10px">${btn('记今天的时长', 'wear-save', 'soft')}${moreMenu([['手工补一条', 'manual-add', 'data-code="wear"'], ['改这一条', 'manual-edit', 'data-code="wear"']])}</div>
    </div>`;
}
function pageArrays() {
  const p = profile();
  const tt = p.ttfields;
  if (!tt.started) {
    return `${pageHeadFor('贴片更换与头皮反应时间线；记录原文照抄，不给护理处方。')}
      ${ttfEmpty('本档案未开始电场治疗，无贴片与头皮记录', '开始佩戴后，更换日期与皮肤反应会按天排在这里。', 'dash', '')}`;
  }
  const items = tt.daily.slice().reverse().filter((d) => d.arraysChanged || d.skin);
  const labelOf = (v) => v === 'front' ? '前贴片' : v === 'back' ? '后贴片' : '前 + 后贴片';
  return `${pageHeadFor('换了哪片、头皮有什么反应，按天排成时间线；记录原文照抄。', go('看设备使用率', 'ttf', 'usage', 'soft'))}
    <div class="card">
      <div class="arr-tl">
        ${items.map((d) => `<div class="arr-item ${d.skin ? 'skin' : 'swap'}">
          <span class="tl-dot"></span>
          <div>${d.arraysChanged ? `<b>更换 ${labelOf(d.arraysChanged)}</b>` : ''}${d.skin ? `<b class="${d.arraysChanged ? '' : ''}">头皮反应记录</b><p>「${esc(d.skin)}」</p>` : ''}</div>
          <small>${shortDate(d.date)}</small>
        </div>`).join('')}
      </div>
      <p class="small-note">头皮反应要不要处理、要不要停戴，由设备护士与治疗团队判断；本页只留记录原文。</p>
      ${btn('记一次头皮反应', 'skin-log', 'soft', 'style="margin-top:10px"')}
    </div>
    <div class="help-box">贴片按医嘱/设备方说明更换；本台不判断"该不该抠、该不该停"。出现破皮、渗液等情况按治疗团队给出的联系方式联系。</div>`;
}
function pageUsage() {
  const p = profile();
  const tt = p.ttfields;
  if (!tt.started || !tt.monthlyUsage.length) {
    return `${pageHeadFor('设备月报里的使用率，按月登记；没有月报就不显示。')}
      ${tt.started ? `<div class="empty"><h3>还没有月度使用率记录</h3><p>设备月报（每月一份）登记后会出现在这里；本页不按日估算。</p></div>` : ttfEmpty('本档案未开始电场治疗，无月度使用率', '开始后按设备月报登记。', 'dash', '')}
      <div class="card"><div class="card-head"><div><h3>月报怎么进来的</h3></div></div>
        <div class="flag-list"><div>设备供应商每月出具使用率月报（PDF）</div><div>导入后作为候选逐项核对，确认后入事实层</div><div>核对界面每项都可以"不对，改一下"</div></div>
      </div>`;
  }
  return `${pageHeadFor('月度使用率来自设备月报；本页不按日估算、不做达标判断。')}
    <div class="grid two">
      ${tt.monthlyUsage.map((u) => `<div class="card"><div class="card-head"><div><h3>${u.month}</h3><p>来源：${esc(u.src)}</p></div>${pill(`${Math.round(u.rate * 100)}%`, 'blue')}</div>
        <div class="progress"><i style="width:${Math.round(u.rate * 100)}%"></i></div>
        <p class="small-note">使用率含义与"多少算合适"由治疗团队结合设备报告解释。</p></div>`).join('')}
      <div class="card"><div class="card-head"><div><h3>与佩戴页的关系</h3></div></div>
        <div class="flag-list"><div>「佩戴与时长」记每日小时数（本人/设备同步）</div><div>本页只登记月报口径的使用率</div><div>两者口径不同，不互相换算</div></div>
        <div class="actions" style="margin-top:12px">${go('去看每日佩戴', 'ttf', 'wear', 'soft')}</div>
      </div>
    </div>`;
}

/* ---------------- 随访影像 ---------------- */
function pageMriParallel() {
  const p = profile();
  const m = mem();
  const list = p.mri.slice().reverse();
  return `${pageHeadFor('历次 MRI 逐条并排：结论原文 / 当时激素 / 当时 KPS——只并列事实，不做判读。')}
    <div class="notice warn"><b>本页不做判读。</b>报告结论是影像科医生写的原文；对报告倾向的判断归神经影像与治疗团队。这里把每次检查的语境（当时激素、当时 KPS）并排摆出来，供复诊时对照。</div>
    <div class="mri-row">
      ${list.map((x) => `<div class="mri-card">
        <div class="mri-date"><b>${longDate(x.date)}</b>${moreMenu([['看原文', 'src', 'data-src="MRI 报告 · ' + esc(x.date) + '"'], ['手工补一条', 'manual-add', 'data-code="mri"'], ['改这一条', 'manual-edit', 'data-code="mri"']])}</div>
        <blockquote>「${esc(x.excerpt)}」</blockquote>
        <div class="mri-ctx">${pill(`当时激素 ${x.dexAtTime}mg/日`, 'yellow')}${pill(`当时 KPS ${x.kpsAtTime}/100`, 'grey')}</div>
        <div class="mri-next">下一步（报告/医嘱原文）：${esc(x.next)}</div>
      </div>`).join('')}
    </div>
    ${section('这次我想问医生', '勾选会存进问题清单（fact 区），复诊导出自动带上。')}
    <div class="card">
      ${[
    ['是否需要灌注成像（或磁共振波谱）进一步鉴别？'],
    ['激素试减之后的影像变化怎么看？'],
    ['下一次 MRI 安排在什么时候、做哪些序列？']
  ].map(([q]) => `<label class="q-item"><input type="checkbox" data-action="ask-pick" data-q="${esc(q)}"><div style="flex:1;min-width:0"><b style="font-weight:500">${esc(q)}</b><p class="muted">场景生成 · 可编辑</p></div></label>`).join('')}
      <div class="actions" style="margin-top:12px">${btn('把勾选的存进问题清单', 'ask-save', 'soft')}${go('去编辑全部问题', 'mri', 'questions', 'text-button')}</div>
    </div>`;
}
function pageMriQuestions() {
  const m = mem();
  return `${pageHeadFor('问题清单是"患者想问的"，不是产品判断的；可编辑、可勾已问。')}
    <div class="card">
      ${m.questions.map((q) => `<div class="q-item">
        <input type="checkbox" ${q.asked ? 'checked' : ''} data-action="q-asked" data-id="${q.id}" aria-label="已问过：${esc(q.text)}">
        <div style="flex:1;min-width:0"><b style="font-weight:500">${esc(q.text)}</b><p class="muted">${esc(q.src)}</p></div>
        ${pill(q.asked ? '已问' : '待问', q.asked ? 'green' : 'grey')}
        ${moreMenu([['改这一条', 'manual-edit', `data-id="${q.id}"`]])}
      </div>`).join('') || '<div class="empty"><h3>还没有问题</h3><p>可以从「MRI 并列」的场景勾选生成，或直接添加。</p></div>'}
      <div class="actions" style="margin-top:12px">${btn('＋ 加一个问题', 'q-add', 'soft')}</div>
    </div>
    <div class="help-box">导出到「就诊准备」时，问题清单进入 fact 区（想问的事）；「我的看法/担心」单独一区并标注不是医生结论。</div>`;
}
function pageMriArchive() {
  const p = profile();
  return `${pageHeadFor('登记每一份影像报告：日期、结论原文、出处；原件留在你的资料目录。', btn('＋ 登记一份 MRI', 'mri-add', 'primary'))}
    <div class="card">
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>日期</th><th>类型</th><th>结论原文（首句）</th><th>登记来源</th><th>状态</th></tr></thead><tbody>
        ${p.mri.map((x) => `<tr><td class="num">${esc(x.date)}</td><td><b>MRI（增强）</b></td><td>「${esc(x.excerpt)}」</td><td class="muted">报告原件（演示）</td><td>${pill('已核对', 'green')}</td></tr>`).join('')}
        <tr><td class="num">2026-11-06</td><td><b>MRI（增强）</b></td><td>已预约，尚未检查</td><td class="muted">医院预约</td><td>${pill('待检查', 'grey')}</td></tr>
      </tbody></table></div>
      <p class="small-note">导入 PDF 报告走「AI 协助」候选通道：解析出日期/结论/激素后逐项核对，确认才入事实层；拒收无副作用。</p>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>登记三字段</h3><p>手工登记只填 3 项，其余交给核对。</p></div></div>
        <div class="flag-list"><div>检查日期</div><div>结论原文（照抄，不缩写）</div><div>当时激素 mg/日（记不清可留空）</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>原件去哪了</h3></div></div>
        <p class="small-note" style="margin:0">存放在 设置 · 工作区 的资料目录；云端解析（MinerU）需在 设置 · 文档解析 配置 Token，未配置时 TXT/MD/CSV 仍本机解析。</p>
        <div class="actions" style="margin-top:12px">${btn('打开设置', 'settings', 'soft')}</div>
      </div>
    </div>`;
}

/* ---------------- 指标与用药 ---------------- */
function chartBlock() {
  const p = profile();
  const [t0, t1] = domain();
  const sel = state.sel[state.profileId];
  const series = sel.map((c) => seriesFor(c, t0, t1)).filter((s) => s.pts.length);
  const pinData = state.pin ? seriesAll(state.pin.code).find((x) => x.d === state.pin.date) : null;
  const groups = CAT_ORDER.map((cat) => ({ cat, codes: Object.keys(CATALOG).filter((c) => CATALOG[c].cat === cat) }));
  return `<div class="overview">
    <aside class="rail" aria-label="筛选与指标选择">
      <details class="pick" ${sel.length && window.innerWidth > 900 ? 'open' : ''}>
        <summary>选择指标 <small>最多 4 个 · 已选 ${sel.length}</small></summary>
        <div class="metric-list">
          ${groups.map((g) => `<div class="cat-label">${esc(g.cat)}</div>${g.codes.map((c) => `<label class="metric-pick"><input type="checkbox" ${sel.includes(c) ? 'checked' : ''} data-action="sel" data-code="${c}"><i style="background:${CATALOG[c].color}"></i><span>${esc(CATALOG[c].name)}${CATALOG[c].categorical ? '（分类）' : ''}</span><small>${seriesAll(c).length || '无'}次</small></label>`).join('')}`).join('')}
        </div>
      </details>
      <section><h3>显示</h3>
        <div class="chips">
          <button class="chip" aria-pressed="${state.toggles.treatment}" data-action="toggle" data-key="treatment">治疗条</button>
          <button class="chip" aria-pressed="${state.toggles.keypoints}" data-action="toggle" data-key="keypoints">末点数值</button>
        </div>
      </section>
      <section><h3>时间窗缩放</h3>
        <div class="zoom"><input type="range" min="40" max="100" value="${state.zoom}" data-action="zoom" aria-label="时间窗缩放"><span>${state.zoom}%</span></div>
        <p class="small-note">右端锚定最新记录；40% 表示只看最近四成时间。</p>
      </section>
      <section><h3>口径</h3><p class="small-note">每条线按该指标全部记录的最小值–最大值归一化；治疗条在独立泳道，不压曲线；KPS 是分类序列，只画节点不连线。</p></section>
    </aside>
    <div class="timeline-main">
      <div class="chart-panel">
        <div class="chart-top">
          <div><h2 style="font-size:14px">一图秀 · ${series.length} 条序列 · ${state.range === 'all' ? '全期' : '近 ' + state.range.replace('m', ' 月')}</h2><p class="small-note">悬停看数值，点击固定详情；手术=菱形+竖虚线，放疗/TMZ/电场为独立泳道。</p></div>
          <div class="chips">${[['3m', '近 3 月'], ['6m', '近 6 月'], ['12m', '近 12 月'], ['all', '全期']].map(([k, l]) => `<button class="chip" aria-pressed="${state.range === k}" data-action="range" data-range="${k}">${l}</button>`).join('')}</div>
        </div>
        <div class="legend">${series.map((s) => `<span><i style="background:${s.m.color}"></i><b>${esc(s.m.name)}</b><span class="range">全期 ${fmtNum(s.lo, s.m.dec)}–${fmtNum(s.hi, s.m.dec)} ${esc(s.m.unit)}</span></span>`).join('')}</div>
        <p class="scroll-hint small-note">图表可左右滑动</p>
        <div class="chart-wrap">${chartSVG(t0, t1)}</div>
        ${pinData ? `<div class="pin"><div><b>${esc(CATALOG[state.pin.code].name)} · ${fmtNum(pinData.v, CATALOG[state.pin.code].dec)} ${esc(CATALOG[state.pin.code].unit)}</b><p>${longDate(pinData.d)} · 来源：${esc(pinData.src || '')}</p></div><button class="icon-button" data-action="unpin" aria-label="关闭详情">×</button></div>` : ''}
      </div>
    </div>
  </div>`;
}
function pageLabPanorama() {
  /* 16 号合同的整页视图（P0-②：独立「病情一图」页签，不缩嵌） */
  const groups = CAT_ORDER.map((cat) => ({ cat, codes: Object.keys(CATALOG).filter((c) => CATALOG[c].cat === cat) }));
  return `${pageHeadFor('治疗、检验与功能评分放回同一段时间里，看见变化发生在哪一步；每条线独立归一化，互不可比。')}
    <div class="notice plain">手术（菱形+竖虚线）、放疗与 TMZ 周期（28 天条，D1–5 深色标记）、电场佩戴（周聚合带）分层在独立泳道，不压曲线；KPS 是分类序列，<b>只画节点不连线</b>；悬停看数值，点击固定详情。</div>
    ${chartBlock()}
    ${section('指标卡片', '与左侧指标目录同一来源（组名/顺序/项数一致）；点卡片翻到背面看区间与最近 5 次。')}
    ${groups.map((g) => `<div class="metric-group"><div class="metric-group-head"><h3>${esc(g.cat)}</h3><span>${g.codes.length} 项</span></div><div class="metric-grid">${g.codes.map(metricCard).join('')}</div></div>`).join('')}
    <p class="small-note">私密内容不进本图；图的口径见左下「口径」说明。</p>`;
}
function pageBlood() {
  const p = profile();
  return `${pageHeadFor('血象四项（WBC/ANC/PLT/HGB）：数值照抄报告，分级只对照 CTCAE v5.0 客观区间；多指标趋势在「病情一图」。', go('看病情一图', 'lab', 'lab-panorama', 'soft'))}
    ${section('血象卡 · 3D 翻转看区间', '有 CTCAE 对照的四项；无记录的照常列出，不编分级。')}
    <div class="metric-grid">${['WBC', 'ANC', 'PLT', 'HGB'].map(metricCard).join('')}</div>
    <div class="notice" style="margin-top:14px"><b>对照不是诊断。</b>徽章只表示"这个数值落在 CTCAE v5.0 的哪一级区间"，是否处理、要不要调整用药由治疗团队判断；ANC/PLT/HGB 本档案暂无记录时不显示分级。</div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>感受与指标并排</h3><p>两侧各自带日期与来源，不合成因果句。</p></div></div>
        <div class="row"><div class="row-main"><div><b>记录到的感受</b><p>${p.id === 'demo1' ? '同期乏力记录（周期日记）' : '本档案暂无感受记录'}</p></div></div>${pill('表达面', 'grey')}</div>
        <div class="row"><div class="row-main"><div><b>记录到的指标</b><p>${p.id === 'demo1' ? 'WBC 最低 2.8（2026-08-24，对照 2 级）' : '暂无血象指标'}</p></div></div>${pill('指标面', 'grey')}</div>
        <p class="small-note">只把已记录的内容并列摆出，不推断因果，也不判断是否需要处理。</p>
        <div class="actions" style="margin-top:10px">${btn('记一次感受（如乏力）', 'feel-log', 'soft')}</div>
      </div>
      <div class="card"><div class="card-head"><div><h3>何时查血象</h3><p>周期语境，医嘱为准。</p></div></div>
        <div class="flag-list"><div>同步期每周一次（本档案记录口径）</div><div>辅助期每周期 D1 前后（医嘱安排）</div><div>具体项目与频率以治疗团队医嘱为准</div></div>
        <div class="actions" style="margin-top:12px">${go('看周期表', 'chemo', 'cycles', 'soft')}</div>
      </div>
    </div>`;
}
function pageSteroid() {
  const p = profile();
  const kindMap = { START: '开始', DECREASE: '减量', INCREASE: '加量', STOP: '停用' };
  const symptomEvents = [];
  p.seizures.forEach((s) => symptomEvents.push({ d: s.onset.slice(0, 10), t: `发作事件（${s.type === 'FOCAL' ? '局灶性' : '先兆'}）`, note: s.trigger || '' }));
  if (p.id === 'demo1') {
    symptomEvents.push({ d: '2026-09-26', t: '头痛', note: 'MRI 后头痛，医嘱激素加回（记录原文）' });
  } else {
    symptomEvents.push({ d: '2026-09-14', t: '症状波动', note: '医嘱调整激素（记录原文）' });
  }
  symptomEvents.sort((a, b) => a.d.localeCompare(b.d));
  return `${pageHeadFor('地塞米松 mg/日 的阶梯时间线，与症状并排——看得见"减量→症状出现"的时间先后，不判断因果。')}
    <div class="ster-lane">
      <div class="card"><div class="card-head"><div><h3>激素阶梯（mg/日）</h3><p>每次调整照抄医嘱</p></div>${pill(`${p.steroids.length} 次调整`, 'blue')}</div>
        ${p.steroids.map((s) => `<div class="step ${s.kind === 'INCREASE' ? 'up' : ''} ${s.kind === 'STOP' ? 'stop' : ''}">
          <span class="step-date">${shortDate(s.date)}</span>
          <div class="step-main"><b>${kindMap[s.kind]} → ${s.mg} mg/日</b><p>${esc(s.note)}</p></div>
          ${pill(kindMap[s.kind], s.kind === 'INCREASE' ? 'yellow' : s.kind === 'STOP' ? 'green' : 'grey')}
        </div>`).join('')}
        <div class="actions" style="margin-top:12px">${btn('记一次调整', 'ster-log', 'soft')}${moreMenu([['改这一条', 'manual-edit', 'data-code="steroid"']])}</div>
      </div>
      <div class="card"><div class="card-head"><div><h3>同期症状/事件（同轴并排）</h3><p>与左侧同一时间轴；只并列先后</p></div></div>
        ${symptomEvents.map((e) => `<div class="step"><span class="step-date">${shortDate(e.d)}</span><div class="step-main"><b>${esc(e.t)}</b><p>${esc(e.note)}</p></div>${pill('记录', 'grey')}</div>`).join('')}
        <p class="axis-note">激素加不加回去、减多快，都由治疗团队判断；本页不出现"建议"字样。</p>
      </div>
    </div>
    <div class="help-box">把「当时激素」和 MRI 并排的语境，也出现在「随访影像 · MRI 并列」——同一份事实，两处引用。</div>`;
}
function pageMetabolic() {
  const p = profile();
  const codes = ['NA'].filter((c) => (p.metrics.numeric[c] || []).length);
  if (!codes.length) {
    return `${pageHeadFor('肝肾功能与电解质：数值照抄化验单原文；本档案没有记录就明说。')}
      <div class="empty"><h3>本档案暂无肝肾电解质记录</h3><p>没有显示不等于正常。下次生化报告出来后，可从化验单拍照走候选核对，或手工抄数值登记。</p>
      <div class="actions" style="justify-content:center;margin-top:12px">${aiBtn('AI 协助登记化验单')}${btn('手工补一条', 'manual-add', 'soft', 'data-code="NA"')}</div></div>
      <div class="card"><div class="card-head"><div><h3>这一页记什么</h3></div></div>
        <div class="flag-list"><div>血钠（NA）等电解质数值（照抄原文）</div><div>肝肾功能（ALT/AST/肌酐等，按化验单参考区间显示）</div><div>换医院后参考区间不同，不合并"正常/异常"判断</div></div>
      </div>`;
  }
  return `${pageHeadFor('电解质与代谢数值照抄化验单；不同医院参考区间不合并判断。')}
    <div class="metric-grid" style="margin-bottom:14px">${codes.map(metricCard).join('')}</div>
    <div class="card">
      <div class="card-head"><div><h3>${codes[0] === 'NA' ? '血钠' : ''}记录明细</h3><p>来源：${esc((p.metrics.numeric[codes[0]][0] || {}).src || '')}</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>日期</th><th>数值</th><th>单位</th><th>来源</th></tr></thead><tbody>
        ${p.metrics.numeric[codes[0]].map((x) => `<tr><td class="num">${esc(x.d)}</td><td class="num"><b>${fmtNum(x.v, 0)}</b></td><td>mmol/L</td><td class="muted">${esc(x.src)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">参考区间因实验室而异，本页不做"正常/异常"着色；血钠与症状的关系由医生解释。</p>
    </div>`;
}

/* ---------------- 症状与发作 ---------------- */
const SEIZURE_TYPE = { FOCAL: '局灶性', AURA: '先兆', GTC: '全面强直阵挛' };
function pageSeizure() {
  const p = profile();
  const m = mem();
  const all = [...p.seizures, ...m.seizures];
  return `${pageHeadFor('每次发作一张事件卡（时间/时长/类型/诱因/谁看到的）；抗癫痫药单独一栏。')}
    ${all.length ? all.map((s) => `<div class="card" style="margin-bottom:12px">
      <div class="card-head"><div><span class="eyebrow">${esc(s.onset)}</span><h3 style="margin-top:4px">${SEIZURE_TYPE[s.type] || esc(s.type)}发作 · ${s.durationMin} 分钟</h3><p>诱因：${esc(s.trigger || '未记录')}</p></div>
      <div class="actions">${pill(s.witnessedBy === 'CAREGIVER' ? '照护者代记' : '本人记录', s.witnessedBy === 'CAREGIVER' ? 'mist' : 'blue')}${moreMenu([['改这一条', 'manual-edit', 'data-code="seizure"']])}</div></div>
      <p>${esc(s.note || '')}</p>
    </div>`).join('') : `<div class="empty"><h3>还没有发作事件</h3><p>有事件就记一条：四个必填项（什么时候/多久/什么样子/谁看到的），保存即生成事件卡。</p></div>`}
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>抗癫痫药（AED）</h3><p>独立轨道，不与发作事件混排</p></div>${pill(`${p.aeds.length} 种`, 'blue')}</div>
        ${p.aeds.map((a) => `<div class="row"><div class="row-main"><div><b>${esc(a.drug)} · ${esc(a.dose)}</b><p>${longDate(a.from)} 起${a.to ? ' – ' + longDate(a.to) : ' · 服用中'}${a.levelNote ? ' · ' + esc(a.levelNote) : ''}</p></div></div>${pill(a.to ? '已结束' : '服用中', a.to ? 'grey' : 'green')}</div>`).join('')}
        <p class="small-note">剂量调整、要不要查血药浓度，由医生决定；漏服一次怎么处理请问医生（见下方事件卡的诱因记录）。</p>
      </div>
      <div class="card"><div class="card-head"><div><h3>记一次发作</h3><p>照护者代记会显示徽章；复诊时自动汇入就诊准备。</p></div></div>
        <div class="actions">${btn('＋ 记一次', 'seizure-add', 'primary')}</div>
        <p class="small-note">说不清的地方先留空，比编一个准。医生问得最多的四项就是表单的四项。</p>
      </div>
    </div>`;
}
function pageEdema() {
  const p = profile();
  const dex = p.steroids;
  const kindMap = { START: '开始', DECREASE: '减量', INCREASE: '加量', STOP: '停用' };
  const sym = p.id === 'demo1'
    ? [{ d: '2026-09-26', t: '头痛', note: 'MRI 后头痛，医嘱激素加回（记录原文）' }]
    : [{ d: '2026-09-14', t: '症状波动', note: '医嘱调整激素（记录原文）' }, { d: '2026-09-30', t: '症状波动', note: '医嘱调整激素（记录原文）' }];
  return `${pageHeadFor('脑水肿相关症状与激素用量同一根时间轴：先后看得见，因果不判断。')}
    <div class="notice plain">「水肿症状与激素并排」是 GBM 随访里的常见对照需求：头痛、恶心、肢体无力等记录，与激素加减量并排摆出。加不加药由治疗团队判断，本台不出建议。</div>
    <div class="ster-lane">
      <div class="card"><div class="card-head"><div><h3>激素（同轴上排）</h3></div></div>
        ${dex.map((s) => `<div class="step ${s.kind === 'INCREASE' ? 'up' : ''} ${s.kind === 'STOP' ? 'stop' : ''}"><span class="step-date">${shortDate(s.date)}</span><div class="step-main"><b>${kindMap[s.kind]} → ${s.mg}mg/日</b><p>${esc(s.note)}</p></div>${pill('激素', 'yellow')}</div>`).join('')}
      </div>
      <div class="card"><div class="card-head"><div><h3>症状（同轴下排）</h3></div></div>
        ${sym.map((e) => `<div class="step"><span class="step-date">${shortDate(e.d)}</span><div class="step-main"><b>${esc(e.t)}</b><p>${esc(e.note)}</p></div>${pill('症状', 'grey')}</div>`).join('')}
        <div class="actions" style="margin-top:12px">${btn('记一次症状', 'sym-log', 'soft')}</div>
      </div>
    </div>
    <div class="help-box">"症状变化是不是水肿引起的"归医生判断；这里能做的是把两边的时间先摆对。</div>`;
}
function pageRisks() {
  const p = profile();
  const m = mem();
  return `${pageHeadFor('感染、发热与血栓风险的记录轨道；只记发生过什么。')}
    <div class="card">
      <div class="card-head"><div><h3>感染 / 血栓记录</h3><p>本档案 ${(m.seizures.length || 0) + 0} 条相关记录</p></div>${btn('记一条', 'risk-log', 'soft')}</div>
      <div class="empty" style="margin-top:0"><h3>还没有记录</h3><p>发热（体温、时间）、寒战、腿肿疼痛、气短等按条记录；记录会并列出现在就诊准备的事实区。</p></div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>为什么单独一条轨道</h3></div></div>
        <div class="flag-list"><div>激素与化疗期间感染表现可能不典型</div><div>卧床时间长时血栓风险变化，需要记录事实供医生评估</div><div>本台不给"什么体温该去急诊"的阈值，按治疗团队交代的口径执行</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>和治疗团队约好的联系方式</h3></div></div>
        <p class="small-note" style="margin:0">把团队交代的联系电话/通道记在纸条或手机里；紧急情况按他们交代的方式联系。本台不代拨、不分诊。</p>
      </div>
    </div>`;
}

/* ---------------- 营养与体重 ---------------- */
function pageIntake() {
  const p = profile();
  const wt = (p.metrics.numeric.WEIGHT || []);
  const trend = wt.length > 1 ? wt[wt.length - 1].v - wt[0].v : 0;
  const m = mem();
  return `${pageHeadFor('体重线 + 进食三选一快记；激素期与疾病期两种语境分开说明，只记事实。')}
    <div class="grid two">
      <div class="card"><div class="card-head"><div><h3>体重</h3><p>${wt.length} 次记录 · 全期 ${trend > 0 ? '+' : ''}${fmtNum(trend, 1)} kg</p></div>${pill(p.id === 'demo1' ? '激素期语境' : '疾病期语境', 'grey')}</div>
        ${wt.length ? metricCard('WEIGHT') : '<div class="empty" style="margin-top:0"><h3>暂无体重记录</h3><p>每周同一时间、同一台秤称一次即可。</p></div>'}
        <div class="actions" style="margin-top:12px">
          <input type="number" step="0.1" inputmode="decimal" id="wt-quick" placeholder="今日体重 kg" style="max-width:150px" aria-label="今日体重（公斤）">
          ${btn('快记', 'wt-save', 'soft')}
        </div>
      </div>
      <div class="card"><div class="card-head"><div><h3>进食三选一</h3><p>吃得下 / 勉强 / 吃不下</p></div></div>
        <div class="chips">${['吃得下', '勉强', '吃不下'].map((x) => `<button class="chip" data-action="meal-log" data-meal="${x}">${x}</button>`).join('')}</div>
        <div class="divider"></div>
        <div class="card-head" style="margin-bottom:6px"><div><h3>双语境说明（只记事实）</h3></div></div>
        <div class="flag-list">
          <div><b>语境一 · 激素期：</b>「胃口大开、体重涨」是激素使用期的常见现象记录语境——${p.id === 'demo1' ? '本档案体重上升期的记录即按此语境标注' : '本档案当前不在激素增食欲语境'}；是否调整由治疗团队判断。</div>
          <div><b>语境二 · 疾病期：</b>「吃不下、体重降」同样只是记录，不指向任何结论；${p.id === 'demo2' ? '本档案体重下降期的记录按此语境标注' : ''}原因归医生判断。</div>
          <div><b>口径：</b>本台不给饮食处方、不算热量目标。</div>
        </div>
      </div>
    </div>
    ${m.meals.length ? `<div class="card" style="margin-top:14px"><div class="card-head"><div><h3>最近进食记录</h3></div></div>${m.meals.slice(-5).reverse().map((x) => `<div class="row"><div class="row-main"><div><b>${esc(x.meal)}</b><p>${esc(x.d)}</p></div></div>${pill('已记录', 'grey')}</div>`).join('')}</div>` : ''}`;
}
function pageConcerns() {
  return `${pageHeadFor('只记"卡在哪一步"：恶心、味觉、口腔、便秘，逐条记录；不给处方。')}
    <div class="grid three">
      <div class="topic-card"><h3>恶心 / 呕吐</h3><p>记发生时间、持续多久、与服药的时间关系（如 D 几）。呕吐已服药物怎么算，问治疗团队，本台不判断。</p><div class="actions">${btn('记一次', 'concern-log', 'soft', 'data-kind="恶心/呕吐"')}</div></div>
      <div class="topic-card"><h3>味觉改变</h3><p>记"什么味道变了"，比记"难吃"更有用；通常随治疗结束逐渐恢复，恢复节奏因人而异。</p><div class="actions">${btn('记一次', 'concern-log', 'soft', 'data-kind="味觉改变"')}</div></div>
      <div class="topic-card"><h3>便秘 / 口腔不适</h3><p>止痛药、活动减少都可能相关；只记次数与程度，处置问治疗团队。</p><div class="actions">${btn('记一次', 'concern-log', 'soft', 'data-kind="便秘/口腔"')}</div></div>
    </div>
    <div class="notice plain" style="margin-top:14px">要不要用营养补充剂、要不要营养科会诊，由治疗团队判断；工作台不提供食谱与剂量。</div>`;
}

/* ---------------- 照护与家事 ---------------- */
const TOPIC_LABEL = { MOOD: '情绪', CARE_BURDEN: '照护负担', COGNITION_CHANGE: '认知变化', DECISION_ACP: '决策与 ACP' };
function pageFeelings() {
  const p = profile();
  const m = mem();
  const extra = m.viewpoints || [];
  const all = [...p.viewpoints, ...extra];
  return `${pageHeadFor('本人与照护者的感受分开记录；private 默认不进摘要、导出与 AI 上下文。')}
    <div class="notice mist"><b>私密边界：</b>标「private」的记录只在本页可见；看板摘要、一图秀、导出与 AI 上下文都不带。要共享时可改为 shared。</div>
    ${all.map((v) => `<div class="saved-item ${v.visibility === 'private' ? 'private' : ''}">
      <b>${longDate(v.date)} · ${v.role === 'PATIENT' ? '本人' : '照护者'} · ${TOPIC_LABEL[v.topic] || esc(v.topic)}</b>
      <p>${esc(v.content)}</p>
      <small>${v.visibility === 'private' ? 'private · 仅本页可见，不进导出' : 'shared · 可进入导出的看法区'} ${moreMenu([['改这一条', 'manual-edit', 'data-code="viewpoint"']])}</small>
      <div class="actions" style="margin-top:6px">${pill(v.role === 'PATIENT' ? '本人' : '照护者', v.role === 'PATIENT' ? 'blue' : 'mist')}${pill(v.visibility === 'private' ? 'private' : 'shared', v.visibility === 'private' ? 'mist' : 'green')}</div>
    </div>`).join('')}
    <div class="actions" style="margin-top:14px">${btn('记一句感受', 'feel-add', 'primary')}</div>
    <div class="help-box">这里是"发生了什么的记录"。要不要寻求心理支持、要不要用药，由本人与治疗团队决定；工作台不做情绪评估。</div>`;
}
function pageCognition() {
  const p = profile();
  const m = mem();
  const moca = p.cog.filter((x) => x.scale === 'MOCA');
  const kps = p.cog.filter((x) => x.scale === 'KPS');
  const events = m.cogEvents;
  return `${pageHeadFor('认知与人格的变化按事件记录；量表分数并列展示，不做趋势线。')}
    <div class="ster-lane">
      <div class="card"><div class="card-head"><div><h3>认知变化事件</h3><p>${events.length} 条 · 什么变了/什么时候/影响</p></div>${btn('记一个变化', 'cog-add', 'primary')}</div>
        ${events.length ? events.map((e) => `<div class="row"><div class="row-main"><div><b>${esc(e.what)}</b><p>${esc(e.when)} · 影响：${esc(e.impact)}</p></div></div>${pill(e.by === 'CAREGIVER' ? '照护者记' : '本人记', e.by === 'CAREGIVER' ? 'mist' : 'blue')}</div>`).join('')
    : `<div class="empty" style="margin-top:0"><h3>还没有认知变化记录</h3><p>记"什么变了、什么时候、对生活的影响"三件事就够；MoCA 分数由医生评，不自己打分。</p></div>`}
        <p class="small-note">认知变化是不是病情相关，由医生判断；本页不说"这是恶化的信号"。</p>
      </div>
      <div class="card"><div class="card-head"><div><h3>MoCA 分数并列</h3><p>${moca.length} 次 · 医生评估</p></div>${pill('不画趋势线', 'grey')}</div>
        ${moca.map((x) => `<div class="step"><span class="step-date">${shortDate(x.date)}</span><div class="step-main"><b>${x.score} / ${x.max}</b><p>${esc(x.note || '医生评估（原文记录）')}</p></div>${pill('MOCA', 'blue')}</div>`).join('')}
        <div class="divider"></div>
        <div class="card-head" style="margin-bottom:6px"><div><h3>KPS 并列</h3><p>分类记录，只列数值</p></div></div>
        ${kps.map((x) => `<div class="step"><span class="step-date">${shortDate(x.date)}</span><div class="step-main"><b>${x.score} / 100</b><p>医生评估（原文记录）</p></div>${pill('KPS', 'grey')}</div>`).join('')}
        <p class="axis-note">评分变化的意义请医生解释，本页只记分。</p>
      </div>
    </div>`;
}
function pageDecisions() {
  const p = profile();
  const m = mem();
  const all = [...p.decisions, ...m.topics];
  const ST = { open: ['未谈', 'grey'], discussed: ['谈过', 'blue'], filed: ['已归档', 'green'] };
  return `${pageHeadFor('决策话题三态（未谈/谈过/已归档）；ACP 只列话题与信息，不出答案。')}
    <div class="card">
      ${all.map((t) => `<div class="row">
        <div class="row-main"><div><b>${esc(t.topic)}</b><p>${esc(t.note || '—')}</p></div></div>
        <div class="actions">${pill(ST[t.status][0], ST[t.status][1])}${moreMenu([['改这一条', 'manual-edit', 'data-code="topic"'], ['更新状态', 'topic-cycle', `data-topic="${esc(t.topic)}"`]])}</div>
      </div>`).join('') || '<div class="empty"><h3>还没有话题</h3><p>先开一个话题，写清楚"想和谁谈、什么时候谈"。</p></div>'}
      <div class="actions" style="margin-top:12px">${btn('＋ 开一个话题', 'topic-add', 'primary')}</div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>ACP 信息整理（只列话题不列答案）</h3></div></div>
        <div class="flag-list">
          <div>想和谁谈：家人名单与各自的角色</div>
          <div>什么时候谈：找一个安静、不赶时间的场合</div>
          <div>谈什么：治疗选择边界、照护地点、重要的人与事</div>
          <div>记录到哪：本页留痕，状态从"未谈"推进到"谈过"</div>
        </div>
        <p class="small-note">本台不按病程弹"该谈临终了"，也不评价任何选择。</p>
      </div>
      <div class="card"><div class="card-head"><div><h3>为什么话题不进 AI 生成</h3></div></div>
        <p class="small-note" style="margin:0">临终与照护话题只能由家人自己开启（红线）；AI 通道对决策话题只做"记录整理"，不生成话题建议。</p>
      </div>
    </div>`;
}

/* ---------------- 复诊与试验 ---------------- */
function pageSchedule() {
  const p = profile();
  const last = p.mri[p.mri.length - 1];
  return `${pageHeadFor('复查节奏的语境与下次安排；节奏由治疗团队定，本台只记录。')}
    <div class="ww-hero" style="background:var(--brand-soft);border:1px solid #d9e5f0;border-radius:16px;padding:20px 22px;margin-bottom:16px">
      <span class="eyebrow">MRI 节奏语境</span>
      <div style="font-size:20px;font-weight:600;margin-top:5px">随访期 MRI 常按 8–12 周一次安排</div>
      <p style="font-size:12.5px;margin-top:6px;max-width:66ch">具体间隔由治疗团队按术后时间、治疗阶段与上次影像决定；本台记录"医生说过什么"，不排计划。</p>
    </div>
    <div class="card">
      <div class="card-head"><div><h3>已登记的安排</h3><p>来自报告「下一步」与医院预约</p></div>${pill('医院安排', 'blue')}</div>
      ${p.mri.slice().reverse().map((x, i) => `<div class="milestone ${i === 0 ? 'on' : ''}"><span class="dot"></span><div><b>${longDate(x.date)} · MRI（增强）</b><p>「${esc(x.next)}」</p></div><small>${i === 0 ? '最近一次' : '既往'}</small></div>`).join('')}
      ${p.id === 'demo1' ? `<div class="milestone on"><span class="dot"></span><div><b>2026-11-06 · 复查 MRI + 复诊讨论</b><p>${daysBetween(TODAY, '2026-11-06')} 天后 · 已预约（演示）</p></div><small>下次</small></div>` : `<div class="milestone on"><span class="dot"></span><div><b>复诊讨论后续治疗选择</b><p>「${esc(last.next)}」</p></div><small>待安排</small></div>`}
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><div class="card-head"><div><h3>每次复查带什么</h3></div></div>
        <div class="flag-list"><div>历次 MRI 报告与光盘（本台「影像档案」可核对清单）</div><div>最近血常规/生化单据</div><div>正在服用的全部药物清单（含抗癫痫药）</div><div>电场佩戴月报（如适用）</div><div>问题清单（就诊准备导出）</div></div>
      </div>
      <div class="card"><div class="card-head"><div><h3>下一步</h3></div></div>
        <p class="small-note" style="margin:0">复诊前把想问的写下来；导出会自动过滤私密内容。</p>
        <div class="actions" style="margin-top:12px">${go('去就诊准备', 'followup', 'prepare', 'primary')}</div>
      </div>
    </div>`;
}
function exportMarkdown(p) {
  const m = mem();
  const lines = ['# 复诊摘要（演示）· ' + TODAY, '', '> 以下内容由本人与照护者整理，不是医生结论。', ''];
  lines.push('## 一、想问的事', '');
  m.questions.filter((q) => !q.asked).forEach((q, i) => lines.push(`${i + 1}. ${q.text}`, `   - 来源：${q.src}`));
  lines.push('', '## 二、事实区（已核对记录）', '');
  lines.push(`- 当前阶段（引用医生语境）：${p.stageLine}`);
  p.mri.forEach((x) => lines.push(`- MRI ${x.date}：「${x.excerpt}」（当时激素 ${x.dexAtTime}mg/日 · 当时 KPS ${x.kpsAtTime}/100）`));
  const kps = p.metrics.qual.KPS || [];
  if (kps.length) lines.push(`- KPS 最近一次：${kps[kps.length - 1].label}（${kps[kps.length - 1].d}，医生评估原文）`);
  const wbc = (p.metrics.numeric.WBC || []).slice(-1)[0];
  if (wbc) lines.push(`- WBC 最近一次：${fmtNum(wbc.v, 1)} 10⁹/L（${wbc.d}，${wbc.src}）`);
  const dex = p.steroids[p.steroids.length - 1];
  if (dex) lines.push(`- 激素最近一次：${dex.mg}mg/日（${dex.date}，${dex.note}）`);
  const cyc = p.oncology.adjuvantCycles || [];
  if (cyc.length) lines.push(`- TMZ 周期：最近第 ${cyc[cyc.length - 1].n} 周期（${cyc[cyc.length - 1].took}）`);
  if (p.ttfields.started) lines.push(`- 电场：${shortDate(p.ttfields.started)} 开始 · 月使用率 ${Math.round((p.ttfields.monthlyUsage[0] || { rate: 0 }).rate * 100)}%（${(p.ttfields.monthlyUsage[0] || { src: '—' }).src}）`);
  const seizures = p.seizures;
  if (seizures.length) lines.push(`- 发作事件：${seizures.length} 条（最近 ${seizures[seizures.length - 1].onset}，${SEIZURE_TYPE[seizures[seizures.length - 1].type]}）`);
  const shared = sharedOnly(p);
  lines.push('', '## 三、看法区（shared）', '', '> 记录者自己的看法与担心，不是医生结论。', '');
  if (!shared.length) lines.push('（无共享的看法记录）');
  shared.forEach((v) => lines.push(`- ${v.date} · ${v.role === 'PATIENT' ? '本人' : '照护者'}：${v.content}`));
  const hid = privateCount(p);
  lines.push('', '## 四、口径说明', '', '- 已隐藏 ' + hid + ' 条私密记录（当下感受中 visibility=private）。', '- 判读归神经影像与治疗团队；本摘要不含判读。', '- 演示数据：人物、数值与时间线不指向任何真实患者。');
  return { md: lines.join('\n'), hid };
}
function pagePrepare() {
  const p = profile();
  const m = mem();
  const { md, hid } = exportMarkdown(p);
  return `${pageHeadFor('fact / view 两区导出预览；私密内容自动过滤，首行声明"不是医生结论"。', btn('生成摘要并预览', 'export', 'primary'))}
    <div class="notice blue"><b>导出前核对：</b>私密记录默认不出现——当前已隐藏 ${hid} 条（当下感受 private）。看法区只保留 visibility=shared 的记录，且每条都带"不是医生结论"标注。</div>
    <div class="card">
      <div class="card-head"><div><h3>问题清单（fact 区来源）</h3><p>${m.questions.filter((q) => !q.asked).length} 条待问</p></div>${go('去编辑', 'mri', 'questions')}</div>
      ${m.questions.slice(0, 4).map((q) => `<div class="row"><div class="row-main"><div><b>${esc(q.text)}</b><p>${esc(q.src)}</p></div></div>${pill(q.asked ? '已问' : '待问', q.asked ? 'green' : 'grey')}</div>`).join('')}
    </div>
    <div class="card" style="margin-top:14px">
      <div class="card-head"><div><h3>导出预览</h3><p>顺序固定：声明 → 想问的事 → 事实区 → 看法区（shared）→ 口径说明</p></div>${pill(`${hid} 条已过滤`, 'mist')}</div>
      <pre class="export-pre">${esc(md)}</pre>
    </div>`;
}
const CHANNELS = [
  ['chinadrugtrials', 'CDE 药物临床试验登记', '演示样例 1 条'],
  ['chictr_online', 'ChiCTR（实时）', '演示样例 1 条'],
  ['ctv', 'ClinicalTrials.gov / CTV', '演示样例 1 条'],
  ['ictrp', 'WHO ICTRP', '未取样例']
];
function pageTrials() {
  const p = profile();
  const m = mem();
  return `${pageHeadFor('试验线索只写药名/期别与登记状态；「登记状态，未核实」常驻。')}
    <div class="notice warn"><b>${esc(DATA.meta.trialNote)}</b>是否适合入组必须由研究团队评估；本台不排序、不评分、不预测获益，也不做药物说明。</div>
    ${p.trials.map((t) => `<div class="trial-card">
      <div class="card-head"><div><span class="eyebrow">${esc(t.key)} · ${esc(t.phase)} 期别</span><h3 style="margin-top:4px">${esc(t.title)}</h3><p>来源通道：${esc(t.source)}</p></div>${pill(t.status.includes('招募中') ? '登记状态，未核实' : t.status, 'yellow')}</div>
      <div class="actions">${btn(m.savedTrials.includes(t.key) ? '已收藏' : '收藏', 'trial-save', m.savedTrials.includes(t.key) ? 'soft' : 'primary', `data-key="${esc(t.key)}"`)}${go('看入组要问什么', 'followup', 'prepare', 'soft')}</div>
    </div>`).join('')}
    ${section('四通道口径（GBM）', '多通道结果只在确认同一登记身份时合并，其余并排保留。')}
    <div class="channel-grid">
      ${CHANNELS.map(([k, n, s]) => `<div class="channel-tile ${s.includes('未取') ? 'off' : ''}"><b>${esc(n)}</b><span>${esc(s)}${s.includes('未取') ? ' · 如实标注，不假装已查' : ''}</span></div>`).join('')}
      <div class="channel-tile off"><b>ChiCTR 离线语料 / 既往归档</b><span>未配置（无 GBM 覆盖）</span></div>
    </div>
    <p class="small-note">数据截止 ${esc(DATA.meta.today || TODAY)}；每次采集条数与校验值写入 manifest（见 设置 · 临床数据包）。</p>`;
}
function pageFollowupArchive() {
  /* P0-①：S13「资料档案」页签——文档三态列表 + 导入 PDF（演示）+ 候选核对静态示意 */
  const p = profile();
  const ST = { done: ['已入事实', 'green'], review: ['待核对', 'yellow'], parse: ['待解析', 'dashed'] };
  const docs = [
    { name: `病理报告_${p.id === 'demo2' ? '2025-04' : '2026-05'}.pdf`, imp: p.id === 'demo2' ? '2025-04-05' : '2026-05-08', st: 'done' },
    ...p.mri.map((x, i) => ({ name: `MRI 报告_${x.date}.pdf`, imp: x.date < '2026-09' ? x.date : (p.id === 'demo1' ? '2026-09-26' : '2026-09-15'), st: i === p.mri.length - 1 ? 'review' : 'done' })),
    { name: '化验单_2026-10-12.jpg', imp: p.id === 'demo1' ? '2026-10-13' : '2026-10-10', st: 'parse' }
  ];
  return `${pageHeadFor('文档按 待解析 → 待核对 → 已入事实 三态流转；解析候选永不直接入库，逐项核对后才进事实层。', btn('导入 PDF', 'import-pdf', 'primary'))}
    <div class="card" style="margin-bottom:14px">
      <div class="card-head"><div><h3>文档列表</h3><p>${docs.length} 份 · 原件只存本机资料目录（见 设置 · 工作区）</p></div>${pill(`${docs.filter((d) => d.st === 'done').length} 份已入事实`, 'green')}</div>
      <div class="table-wrap"><table class="cycle-table"><thead><tr><th>文件名</th><th>导入日期</th><th>状态</th><th>说明</th></tr></thead><tbody>
        ${docs.map((d) => `<tr><td><b>${esc(d.name)}</b></td><td class="num">${esc(d.imp)}</td><td>${pill(ST[d.st][0], ST[d.st][1])}</td><td class="muted">${d.st === 'done' ? '关键字段已核对并入事实层' : d.st === 'review' ? '解析完成，等待逐项核对' : '尚未解析（未配置 Token 时 TXT/MD/CSV 仍可本机解析）'}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="small-note">更正=登记新版本；界面不出现"不可恢复"式表述，旧记录始终保留。</p>
    </div>
    <div class="grid two">
      <div>
        ${section('候选核对（静态示意）', '一切解析/AI 产出都是候选；每项都可以"不对，改一下"。')}
        <div class="agent-cand" style="border-color:#e0d8c9">
          <b>解析候选 · 来自 化验单_2026-10-12.jpg</b>
          <p class="cand-title">血常规字段候选</p>
          <ul>
            <li><span>WBC</span><b>3.8 10⁹/L</b></li>
            <li><span>采样日期</span><b>2026-10-12</b></li>
            <li><span>来源页</span><b>报告第 1 页</b></li>
          </ul>
          <small>逐项核对后才入事实层；拒收无副作用</small>
          <div class="actions">
            <button class="primary" data-action="cand-ok">确认入事实层</button>
            <button class="soft" data-action="cand-fix">不对，改一下</button>
            <button class="soft" data-action="cand-reject">不用这条</button>
          </div>
        </div>
      </div>
      <div class="card"><div class="card-head"><div><h3>三态怎么走</h3></div></div>
        <div class="milestone"><span class="dot"></span><div><b>待解析</b><p>导入后未解析；TXT/MD/CSV 不需 Token 也能本机解析</p></div>${pill('1', 'dashed')}</div>
        <div class="milestone"><span class="dot"></span><div><b>待核对</b><p>解析出候选字段，等待本人逐项确认</p></div>${pill('1', 'yellow')}</div>
        <div class="milestone on"><span class="dot"></span><div><b>已入事实</b><p>核对通过的候选进入事实层，一图秀/卡片/导出同步可用</p></div>${pill(String(docs.filter((d) => d.st === 'done').length), 'green')}</div>
        <p class="small-note">解析失败时原件保留，可重试；云端解析（MinerU）需在 设置 · 文档解析 配置 Token。</p>
        <div class="actions" style="margin-top:12px">${btn('打开解析设置', 'settings', 'soft', 'data-tab="parse"')}</div>
      </div>
    </div>`;
}
function pageEnrolled() {
  const p = profile();
  const m = mem();
  const saved = p.trials.filter((t) => m.savedTrials.includes(t.key));
  return `${pageHeadFor('收藏只是备忘，不代表已联系或符合条件；状态以登记平台为准。')}
    ${saved.length ? saved.map((t) => `<div class="trial-card">
      <div class="card-head"><div><span class="eyebrow">${esc(t.key)} · ${esc(t.phase)} 期别</span><h3 style="margin-top:4px">${esc(t.title)}</h3><p>收藏于 ${TODAY}（演示）</p></div>${pill('登记状态，未核实', 'yellow')}</div>
      <div class="actions">${btn('取消收藏', 'trial-save', 'soft', `data-key="${esc(t.key)}"`)}</div>
    </div>`).join('') : `<div class="empty"><h3>还没有收藏</h3><p>在「试验线索」点收藏，这里会留下带日期的备忘。</p><div class="actions" style="justify-content:center;margin-top:12px">${go('回试验线索', 'followup', 'trials', 'soft')}</div></div>`}
    <div class="help-box">就诊时把收藏的登记号带给医生；"适不适合"由研究团队逐条核对入组标准。</div>`;
}

/* ---------------- render ---------------- */
const RENDERERS = {
  dash: pageDash,
  tumor: () => { const k = state.sub.tumor || 'molecular'; return k === 'surgery' ? pageSurgery() : k === 'pathology' ? pagePathology() : pageMolecular(); },
  chemo: () => { const k = state.sub.chemo || 'stupp'; return k === 'cycles' ? pageCycles() : k === 'changes' ? pageChanges() : pageStupp(); },
  ttf: () => { const k = state.sub.ttf || 'wear'; return k === 'arrays' ? pageArrays() : k === 'usage' ? pageUsage() : pageWear(); },
  mri: () => { const k = state.sub.mri || 'parallel'; return k === 'questions' ? pageMriQuestions() : k === 'archive' ? pageMriArchive() : pageMriParallel(); },
  lab: () => { const k = state.sub.lab || 'blood'; return k === 'lab-panorama' ? pageLabPanorama() : k === 'steroid' ? pageSteroid() : k === 'metabolic' ? pageMetabolic() : pageBlood(); },
  symptom: () => { const k = state.sub.symptom || 'seizure'; return k === 'edema' ? pageEdema() : k === 'risks' ? pageRisks() : pageSeizure(); },
  nutrition: () => { const k = state.sub.nutrition || 'intake'; return k === 'concerns' ? pageConcerns() : pageIntake(); },
  care: () => { const k = state.sub.care || 'feelings'; return k === 'cognition' ? pageCognition() : k === 'decisions' ? pageDecisions() : pageFeelings(); },
  followup: () => { const k = state.sub.followup || 'schedule'; return k === 'prepare' ? pagePrepare() : k === 'trials' ? pageTrials() : k === 'enrolled' ? pageEnrolled() : k === 'followup-archive' ? pageFollowupArchive() : pageSchedule(); }
};
function render() {
  const page = RENDERERS[state.page] || pageDash;
  const p = profile();
  const subs = SUBPAGES[state.page];
  $('#nav').innerHTML = PAGES.map(([id, label, ic]) => `<button class="nav-button" aria-current="${state.page === id ? 'page' : 'false'}" data-action="go" data-page="${id}">${icon(ic)}<span>${label}</span>${subs && id === state.page && SUBPAGES[id] ? `<span class="nav-count">${SUBPAGES[id].length}</span>` : ''}</button>`).join('');
  $('#breadcrumb').textContent = PAGES.find((x) => x[0] === state.page)[1] + (subs ? ' / ' + subLabel(state.page) : '');
  $('#profile-name').textContent = `${p.name}的资料`;
  $('#profile-meta').textContent = `${p.age} 岁 · ${p.diagnosis.split('·')[0]}`;
  $('#profile-avatar').textContent = p.name[0];
  $('#profile-btn').setAttribute('aria-label', `切换演示档案，当前为${p.name}`);
  $('#main').innerHTML = `<div class="page-enter">${backRow()}${page()}</div>`;
  $('#app-version').textContent = APP_INFO.displayVersion;
  $('#app-build').textContent = APP_INFO.build;
  $('#ver-chip').textContent = APP_INFO.displayVersion;
  $('#ready-store').innerHTML = `<i></i><span>资料目录</span><b>已激活</b>`;
  renderAgent();
}
/* ---------------- AI 面板（20 号合同：开/收/调宽 25–45%，收起不结束会话） ---------------- */
/* 宽度档唯一来源是 lib/layout.js（经服务端注入 WB_LAYOUT）；持久化读回必须过夹取。 */
function clampAgentW(w) { return Math.min(WB_LAYOUT.max, Math.max(WB_LAYOUT.min, w)); }
function agentWidthFromStorage() {
  try { return clampAgentW(parseFloat(localStorage.getItem(WB_LAYOUT.storageKey)) || WB_LAYOUT.default); }
  catch (e) { return WB_LAYOUT.default; }
}
function agentWidthToStorage(w) {
  try { localStorage.setItem(WB_LAYOUT.storageKey, String(clampAgentW(w))); } catch (e) { /* 私密模式等场景不硬失败 */ }
}
/* AI 五态（顶栏唯一开合入口；20 号合同）：idle/连接中/就绪(收起入口)/隐藏(重开)/暂不可用。
   独立运行没有宿主会话服务 → 面板以降级说明打开（不假装接通、不自建聊天框）。 */
const AGENT_LABELS = {
  idle: 'AI 对话',
  connecting: '正在连接…',
  ready: '收起 AI 对话',
  hidden: '打开 AI 对话',
  unavailable: 'AI 对话暂不可用',
};
function agentPhase() {
  const a = state.agent;
  if (a.phase === 'unavailable') return 'unavailable';
  if (a.phase === 'connecting') return 'connecting';
  if (a.open) return 'ready';
  return a.phase === 'hidden' ? 'hidden' : 'idle';
}
function renderAgent() {
  const a = state.agent;
  $('#agent-splitter').hidden = !a.open;
  $('#agent-pane').hidden = !a.open;
  $('#agent-toggle').setAttribute('aria-expanded', String(a.open));
  $('#agent-toggle').dataset.agentState = agentPhase();
  $('#agent-toggle').textContent = AGENT_LABELS[agentPhase()];
  $('#agent-toggle').disabled = agentPhase() === 'unavailable';
  $('#agent-toggle').title = agentPhase() === 'unavailable'
    ? '独立运行模式没有宿主会话服务；面板以演示与草稿暂存形态打开，不会发送内容'
    : agentPhase() === 'connecting' ? '正在连接会话服务…' : '';
  document.documentElement.style.setProperty('--agent-w', a.w + '%');
  $('#agent-splitter').setAttribute('aria-valuenow', String(Math.round(a.w)));
  if (!a.open) return;
  const body = $('.agent-body');
  const demo = a.draft && AI_DEMOS[a.draft] ? AI_DEMOS[a.draft] : null;
  const candHtml = demo && demo.cand ? `<div class="agent-cand">
      <b>演示候选 · 未发送（一切 AI 产出都是候选）</b>
      <p class="cand-title">${esc(demo.cand.title)}</p>
      <ul>${demo.cand.fields.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>
      <small>来源：${esc(demo.cand.src)} · 逐项核对后才入事实层；拒收无副作用</small>
      <div class="actions">
        <button class="primary" data-action="cand-ok">确认入事实层</button>
        <button class="soft" data-action="cand-fix">不对，改一下</button>
        <button class="soft" data-action="cand-reject">不用这条</button>
      </div>
    </div>` : '';
  const staticNote = state.agent.degraded
    ? `<div class="notice plain"><b>AI 对话暂不可用（开发版降级）：</b>独立运行模式没有宿主会话服务，本面板只做演示与草稿暂存，不会发送任何内容。三个出路：① 装入 DSH Desktop 后由宿主接入会话；② 把提示词复制到别处使用；③ 稍后在宿主里重试。</div>`
    : `<div class="notice plain">这是<b>演示面板</b>：原型未接入真实 AI，不会发送任何内容；真实版本走宿主接口接入。</div>`;
  const demoMsgs = `<div class="agent-msg user"><b>示例输入</b><p>把最近三次 MRI 的结论原文排在一起。</p></div>
    <div class="agent-msg bot"><b>演示回复（未接通）</b><p>真实版本会基于「MRI 并列」的已核对记录生成草稿；本原型不生成内容。</p></div>`;
  body.innerHTML = candHtml + staticNote + (candHtml ? '' : demoMsgs) + `<p class="small-note">私密内容（visibility=private 的感受记录）默认不进入 AI 上下文；需要带入时逐条显式勾选。输入框里的草稿只保存在本页，不会自动发送。</p>`;
  const input = $('.agent-foot input');
  if (demo && input) { input.value = demo.prompt; input.setAttribute('aria-label', 'AI 草稿（待你发送，演示不发送）'); }
}
function setAgent(open) {
  const a = state.agent;
  if (open) {
    if (a.phase === 'idle') {
      a.phase = 'connecting';
      renderAgent();
      /* 连接探测：宿主运行才有真实会话服务；独立运行降级为演示面板（不阻塞打开） */
      setTimeout(() => {
        if (RUNTIME === 'host' && window.parent === window) {
          /* 宿主形态但没有父窗口（异常装载）：服务缺失才禁用，文案「AI 对话暂不可用」+ 降级原因 */
          a.phase = 'unavailable';
          a.open = false;
        } else {
          a.phase = 'ready';
          if (RUNTIME === 'standalone') a.degraded = true;
          a.open = true;
        }
        renderAgent();
      }, 180);
      return;
    }
    a.open = true;
    renderAgent();
    return;
  }
  a.open = false;
  a.phase = 'hidden'; /* 收起只切显示，不结束会话；草稿与输入保留 */
  agentWidthToStorage(a.w);
  renderAgent();
}
function agentResize(deltaPct) {
  state.agent.w = clampAgentW(state.agent.w + deltaPct);
  agentWidthToStorage(state.agent.w);
  renderAgent();
}
(function agentSplitterInit() {
  const sp = $('#agent-splitter');
  let dragging = false;
  sp.addEventListener('pointerdown', (e) => {
    dragging = true; sp.setPointerCapture(e.pointerId); e.preventDefault();
  });
  sp.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = $('.stage').getBoundingClientRect(); /* 按容器 rect 夹取，不用 window 宽 */
    const pct = ((rect.right - e.clientX) / rect.width) * 100;
    state.agent.w = clampAgentW(pct);
    agentWidthToStorage(state.agent.w);
    renderAgent();
  });
  const end = () => { dragging = false; };
  sp.addEventListener('pointerup', end); sp.addEventListener('pointercancel', end);
  sp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { agentResize(2); e.preventDefault(); } /* 变窄 */
    else if (e.key === 'ArrowRight') { agentResize(-2); e.preventDefault(); } /* 变宽 */
    else if (e.key === 'Home') { state.agent.w = clampAgentW(WB_LAYOUT.max); agentWidthToStorage(state.agent.w); renderAgent(); e.preventDefault(); }
    else if (e.key === 'End') { state.agent.w = clampAgentW(WB_LAYOUT.min); agentWidthToStorage(state.agent.w); renderAgent(); e.preventDefault(); }
  });
})();

/* ---------------- 弹窗 ---------------- */
function openProfiles() {
  openModal('切换演示档案', `<div class="notice plain">两套档案各带完整时间线；切换后指标序列、治疗条与页面数据全部换源，私密记录互不可见。</div>
    ${profiles().map((p) => `<button class="profile-row ${p.id === state.profileId ? 'on' : ''}" data-action="pick-profile" data-id="${p.id}"><div><b>${esc(p.name)} · ${p.age} 岁 · ${p.primaryRole === 'PATIENT' ? '本人主导' : '照护者主导'}</b><p>${esc(p.diagnosis)} · ${esc(p.stageLine)}</p></div><span class="profile-caret">${p.id === state.profileId ? '当前' : '切换'}</span></button>`).join('')}`,
    '<button data-action="close">关闭</button>', '小星宝 · 演示');
}
function openSettings(tab) {
  const c = state.cfg;
  const tokStates = [['none', '未配置（当前）', 'TXT/MD/CSV 仍本机解析；PDF 云端解析需配置 Token'], ['ok', '已配置', '只显示后 4 位；保存时先校验，失败区分 401 / 429 / 网络错误'], ['fail', '校验失败', 'Token 未通过校验；原件保留，可重试']];
  openModal('设置', `<div class="cfg-tabs" role="tablist">
      <button role="tab" aria-selected="${tab !== 'parse' && tab !== 'data'}" data-action="cfg-tab" data-tab="ws">工作区</button><button role="tab" aria-selected="${tab === 'parse'}" data-action="cfg-tab" data-tab="parse">文档解析</button><button role="tab" aria-selected="${tab === 'data'}" data-action="cfg-tab" data-tab="data">临床数据包</button>
    </div>
    <div style="margin-top:16px" class="cfg-block" data-tab="ws" ${tab && tab !== 'ws' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">资料目录</h3>
      <p class="small-note">业务数据放在你选的目录里；主目录、根目录、桌面根会被拒绝。</p>
      <div class="path-row"><code>${esc(c.root)}</code><button class="soft" data-action="pick-root">更改位置</button></div>
      <div class="grid three" style="margin-top:12px">
        <div class="stat-tile"><span>原件</span><b>${c.size.doc} GB</b></div>
        <div class="stat-tile"><span>派生</span><b>${c.size.derived} GB</b></div>
        <div class="stat-tile"><span>数据库</span><b>${c.size.db} GB</b></div>
      </div>
      <p class="small-note">上次备份：${esc(c.backupAt)}（演示值）</p>
    </div>
    <div class="cfg-block" style="margin-top:12px" data-tab="parse" ${tab !== 'parse' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">文档解析（MinerU）Token 三态</h3>
      <label class="check-row"><input type="checkbox" ${c.consent ? 'checked' : ''} data-action="consent"><span>我知道选中的文件会被上传到云端解析；不勾选不会上传。</span></label>
      <div class="token-states">
        ${tokStates.map(([k, t, d]) => `<div class="token-state ${c.tokenState === k ? 'cur' : ''}"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}
      </div>
      <p class="small-note">当前状态：<b>${c.mineru ? (c.mineru.configured ? `已配置 · ${esc(c.mineru.source === 'env' ? '环境变量生效' : '本机密钥文件生效')}` : '未配置') : (c.tokenState === 'none' ? '未配置' : c.tokenState === 'ok' ? '已配置' : '校验失败')}</b>${c.mineru && !c.mineru.configured ? ' —— TXT/MD/CSV 仍本机解析，功能不受影响；需要解析 PDF 时再配置。' : ''}${c.mineru && c.mineru.error ? ` 读取异常：${esc(c.mineru.error)}` : ''}</p>
      <div class="token-row">${c.mineru && c.mineru.configured ? `<code class="masked">${esc(c.mineru.masked)}</code><small class="muted" style="font-size:10.5px">${esc(c.mineru.file || '')}</small>` : ''}<button class="soft" data-action="token-config">配置 Token</button></div>
    </div>
    <div class="cfg-block" style="margin-top:12px" data-tab="data" ${tab !== 'data' ? 'hidden' : ''}>
      <h3 style="font-size:12.5px">临床数据包（试验线索来源）</h3>
      <div class="grid two" style="margin-top:6px">
        <div class="stat-tile"><span>数据包</span><b>CLINICAL-DATA-2026</b></div>
        <div class="stat-tile"><span>数据截止</span><b>${esc(DATA.meta.today || TODAY)}</b></div>
      </div>
      <div class="channel-grid" style="margin-top:10px">
        ${CHANNELS.map(([k, n, s]) => `<div class="channel-tile ${s.includes('未取') ? 'off' : ''}"><b>${esc(n)}</b><span>${esc(s)}</span></div>`).join('')}
        <div class="channel-tile off"><b>ChiCTR 离线语料</b><span>未配置（无 GBM 覆盖）</span></div>
        <div class="channel-tile off"><b>既往工作台归档</b><span>未配置（无 GBM 覆盖）</span></div>
      </div>
      <p class="small-note">四通道终态如实标注；0 条结果必须带该来源自己的覆盖声明，「没查到」不等于「不存在」。登记状态一律显示「登记状态，未核实」。</p>
    </div>`, '<button class="primary" data-action="close">完成</button>', '小星宝 · 设置');
}
function openAbout() {
  openModal('关于小星宝', `<div class="about" style="display:grid;grid-template-columns:96px minmax(0,1fr);gap:16px;align-items:start">
    <span class="brand-mark" style="width:96px;height:96px;border-radius:18px;display:grid;place-items:center;background:var(--brand-soft);border:1px solid var(--line)">
      <svg viewBox="0 0 48 48" width="64" height="64" aria-hidden="true"><circle cx="24" cy="24" r="19" fill="#E9F0F7"/><path d="M24 8l2.6 9.4L36 20l-9.4 2.6L24 32l-2.6-9.4L12 20l9.4-2.6Z" fill="#2F5D8A"/><circle cx="35.5" cy="33.5" r="2.6" fill="#E8590C"/></svg>
    </span>
    <div>
      <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap"><b style="font-size:22px">${APP_INFO.displayVersion}</b>${pill('交互原型', 'blue')}</div>
      <p style="font-size:12px;margin:8px 0 10px">胶质母细胞瘤（GBM）患者与照护者的病程整理工具。本原型不提供诊断、治疗或用药建议；判读归神经影像与治疗团队。</p>
      <div style="display:grid;gap:5px;font-size:11.5px">
        <div><span class="muted">版本　</span>${APP_INFO.displayVersion} · ${APP_INFO.build}</div>
        <div><span class="muted">渲染　</span>零依赖 HTML/CSS/JS，无网络请求</div>
        <div><span class="muted">渠道　</span>${esc(APP_INFO.channelLabel)}</div>
        <div><span class="muted">数据　</span>${esc(DATA.meta.disclaimer || '')}</div>
      </div>
    </div>
  </div>`, '<button data-action="close">关闭</button>', '小星宝 · 关于');
}
function openHelp() {
  openModal('原型操作说明', `<div class="notice blue">这是一个<b>交互原型</b>：所有资料为模拟，状态只在内存，刷新重置；未连接 AI、DSH、真实文件或数据库。</div>
    <div class="flag-list">
      <div>看板：双主体 8 入口（本人 4 + 照护者 4）</div>
      <div>右上「AI 对话」：开/收起面板，拖动或方向键调宽（25%–45%）</div>
      <div>每页「AI 协助示例」：把预写提示词填入面板输入框，不自动发送</div>
      <div>「指标与用药 · 病情一图」是多指标一图秀：选指标（≤4）、缩放、点击数据点固定详情</div>
      <div>「复诊与试验 · 资料档案」看文档三态（待解析/待核对/已入事实）与候选核对示意</div>
      <div>指标卡点击翻面看参考区间；KPS 是分类卡，不翻不连线</div>
      <div>「就诊准备」可预览导出；私密记录自动过滤</div>
      <div>页面 hash 可分享，例如 <code>#lab/steroid</code></div>
    </div>`, '<button data-action="close">知道了</button>', '小星宝 · 操作说明');
}
function openExport() {
  const p = profile();
  const { md, hid } = exportMarkdown(p);
  openModal('复诊摘要（导出预览）', `<p class="small-note" style="margin-bottom:10px">已自动过滤 ${hid} 条私密记录；首行声明"不是医生结论"。</p>
    <pre class="export-pre" style="max-height:46vh;overflow:auto">${esc(md)}</pre>`,
    '<button data-action="close">关闭</button><button class="primary" data-action="copy-md">复制 Markdown</button>', '小星宝 · 导出');
}
function openAddQuestion() {
  openModal('加一个问题', `<label class="form-label">问题</label><input id="new-q" placeholder="例如：下次 MRI 需要加做灌注吗？">`,
    '<button data-action="close">取消</button><button class="primary" data-action="save-q">保存</button>', '小星宝 · 问题清单');
}
function openAddView() {
  openModal('记一句感受', `<p class="small-note" style="margin-bottom:10px">默认 private：只在本页可见，不进摘要、导出与 AI 上下文。</p>
    <textarea id="new-view" placeholder="例如：这两天睡不好，报告的几个字一直在脑子里。"></textarea>
    <label class="check-row"><input type="checkbox" id="new-shared"><span>改为 shared（进入导出的看法区）</span></label>`,
    '<button data-action="close">取消</button><button class="primary" data-action="save-view">保存</button>', '小星宝 · 当下感受');
}
function openSeizureForm() {
  openModal('记一次发作（4 个必填）', `
    <div class="form-grid">
      <div><label class="form-label">什么时候 *</label><input id="sz-when" type="datetime-local"></div>
      <div><label class="form-label">多久（分钟）*</label><input id="sz-dur" type="number" step="0.5" min="0" inputmode="decimal"></div>
      <div><label class="form-label">什么样子 *（类型单选）</label><select id="sz-type"><option value="FOCAL">局灶性</option><option value="AURA">先兆</option><option value="GTC">全面强直阵挛</option></select></div>
      <div><label class="form-label">谁看到的 *</label><select id="sz-by"><option value="CAREGIVER">照护者（代记）</option><option value="PATIENT">本人</option></select></div>
      <div class="wide"><label class="form-label">诱因 / 备注（选填）</label><input id="sz-note" placeholder="例如：清晨空腹 / 漏服一次药"></div>
    </div>`,
    '<button data-action="close">取消</button><button class="primary" data-action="save-seizure">保存事件卡</button>', '小星宝 · 癫痫事件');
}
function openMriForm() {
  openModal('登记一份 MRI（3 个字段）', `
    <div class="form-grid">
      <div><label class="form-label">检查日期 *</label><input id="mri-d" type="date"></div>
      <div><label class="form-label">当时激素（mg/日，可留空）</label><input id="mri-dex" type="number" min="0" step="0.5" inputmode="decimal"></div>
      <div class="wide"><label class="form-label">结论原文（照抄）*</label><textarea id="mri-x" placeholder="照抄报告结论一行，不缩写、不解读"></textarea></div>
    </div>`,
    '<button data-action="close">取消</button><button class="primary" data-action="save-mri">登记</button>', '小星宝 · 影像档案');
}
function openCogForm() {
  openModal('记一个认知变化', `
    <div class="form-grid">
      <div class="wide"><label class="form-label">什么变了 *</label><input id="cg-what" placeholder="例如：把妹妹认成阿姨"></div>
      <div><label class="form-label">什么时候 *</label><input id="cg-when" type="date"></div>
      <div><label class="form-label">记录人</label><select id="cg-by"><option value="CAREGIVER">照护者</option><option value="PATIENT">本人</option></select></div>
      <div class="wide"><label class="form-label">对生活的影响</label><input id="cg-imp" placeholder="例如：夜间不肯睡"></div>
    </div>`,
    '<button data-action="close">取消</button><button class="primary" data-action="save-cog">保存</button>', '小星宝 · 认知与人格');
}
function openTopicForm() {
  openModal('开一个话题', `
    <label class="form-label">话题 *</label><input id="tp-name" placeholder="例如：想和谁谈、什么时候谈">
    <label class="form-label" style="margin-top:12px">一句备注</label><input id="tp-note" placeholder="例如：先和大女儿通个气">`,
    '<button data-action="close">取消</button><button class="primary" data-action="save-topic">保存</button>', '小星宝 · 照护决策');
}

/* ---------------- actions ---------------- */
const ACTIONS = {
  go(el) { navigate(el.dataset.page, el.dataset.sub || ''); },
  sub(el) { navigate(state.page, el.dataset.sub); },
  range(el) { state.range = el.dataset.range; render(); },
  toggle(el) { state.toggles[el.dataset.key] = !state.toggles[el.dataset.key]; render(); },
  sel(el) {
    const arr = state.sel[state.profileId];
    const c = el.dataset.code;
    if (el.checked) {
      if (arr.length >= 4) { el.checked = false; toast('最多同时看 4 个指标；先取消一个再加。'); return; }
      arr.push(c);
    } else {
      if (arr.length === 1) { el.checked = true; toast('至少留一个指标。'); return; }
      state.sel[state.profileId] = arr.filter((x) => x !== c);
    }
    render();
  },
  pin(el) { state.pin = { code: el.dataset.code, date: el.dataset.date }; render(); },
  unpin() { state.pin = null; render(); },
  flip(el) {
    const c = el.dataset.code;
    if (state.flipped.has(c)) state.flipped.delete(c); else state.flipped.add(c);
    el.setAttribute('aria-pressed', state.flipped.has(c));
  },
  'agent-toggle'() { setAgent(!state.agent.open); },
  'agent-hide'() { setAgent(false); toast('已收起面板（会话保留，草稿不丢）'); },
  'ai-draft'(el) {
    const key = el.dataset.ai || state.page;
    state.agent.draft = AI_DEMOS[key] ? key : null;
    if (!state.agent.open) setAgent(true); else renderAgent();
    const input = $('.agent-foot input');
    if (AI_DEMOS[key] && input) input.value = AI_DEMOS[key].prompt;
    toast('已把示例提示词填入 AI 面板（待你发送，不会自动发出）');
  },
  'cand-ok'() { toast('演示：核对通过后进入事实层（原型仅示意）', { back: true }); },
  'cand-fix'() { toast('演示：进入逐项修改（每项都可以改）'); },
  'cand-reject'() { state.agent.draft = null; renderAgent(); toast('已拒收这条候选（无副作用）'); },
  'import-pdf'() { toast('解析能力在开发版提供（MinerU）'); },
  profiles() { openProfiles(); },
  async settings(el) {
    /* 开发版：先取本机真实 Token 状态（三态：未配置 / 文件生效 / env 生效；响应无原文） */
    try {
      const res = await fetch(`${API_BASE}/api/glioblastoma/settings/mineru`, { credentials: 'same-origin' });
      if (res.ok) state.cfg.mineru = await res.json();
    } catch (e) { state.cfg.mineru = null; /* 接口不可达时回落原型静态示意 */ }
    openSettings(el && el.dataset.tab);
  },
  'open-store'() { openSettings('ws'); },
  about() { openAbout(); },
  help() { openHelp(); },
  export() { openExport(); },
  close() { closeModal(); },
  src(el) { openModal('来源', `<p style="font-size:12.5px">${esc(el.dataset.src)}</p><p class="small-note">原型不打开真实文件；接入后这里会跳到该页并高亮。</p>`, '<button data-action="close">关闭</button>', '原文出处'); },
  'font-toggle'() { document.body.classList.toggle('large'); $('#font-toggle').setAttribute('aria-pressed', document.body.classList.contains('large')); },
  'pick-root'() {
    const bad = prompt('输入资料目录的绝对路径（演示：输入 /Users/demo 会被拒绝）', state.cfg.root);
    if (bad === null) return;
    if (['/', '/Users/demo', '/Users/demo/Desktop'].includes(bad.trim())) { toast('已拒绝：不能选主目录、根目录或桌面根'); return; }
    state.cfg.root = bad.trim(); toast('资料目录已更新（原型仅内存）'); openSettings('ws');
  },
  'token-config'() {
    const m = state.cfg.mineru;
    openModal('文档解析 Token（MinerU）', `
      <p class="small-note" style="margin-bottom:10px">Token 只保存在本机密钥文件（600 权限），界面只显示掩码与来源，不回显原文。</p>
      ${m && m.error ? `<div class="notice warn" style="margin-bottom:10px">${esc(m.error)}</div>` : ''}
      <label class="form-label">Token（sk- 开头）</label>
      <input id="mineru-token" type="password" autocomplete="new-password" placeholder="${m && m.configured ? '已配置，留空保持不变；填写则覆盖' : 'sk-...'}">
      ${m && m.configured ? `<p class="small-note">当前生效：${esc(m.masked)} · ${esc(m.sourceLabel)}</p>` : '<p class="small-note">尚未配置：扫描件与照片的自动识别用不了；TXT / MD / CSV 仍在本机解析。</p>'}
      <p class="small-note">申请 / 重置入口：${esc((m || {}).tokenUrl || 'https://mineru.net/apiManage/token')}</p>`,
      '<button data-action="close">取消</button><button class="soft" data-action="token-clear">清除本机 Token</button><button class="primary" data-action="token-save">校验并保存</button>', '小星宝 · 文档解析');
  },
  async 'token-save'() {
    const t = ($('#mineru-token') || {}).value || '';
    if (!t.trim()) { toast('先粘贴一个 Token（sk- 开头）'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/glioblastoma/settings/mineru`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: t.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast(`保存失败（${data.code || res.status}）：${data.error || ''}`); return; }
      state.cfg.mineru = data; state.cfg.tokenState = 'ok'; state.cfg.tokenMasked = data.masked;
      closeModal(); toast(`已保存：${data.masked} · ${data.sourceLabel}`); openSettings('parse');
    } catch (e) { toast(`保存失败：网络不可达（${esc(e.message)}）`); }
  },
  async 'token-clear'() {
    try {
      const res = await fetch(`${API_BASE}/api/glioblastoma/settings/mineru`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      const data = await res.json();
      state.cfg.mineru = data; state.cfg.tokenState = data.configured ? 'ok' : 'none';
      closeModal(); toast(data.configured ? `本机文件已清除；当前生效：${data.masked}（${data.sourceLabel}）` : '已清除；回到未配置状态');
      openSettings('parse');
    } catch (e) { toast(`清除失败：${esc(e.message)}`); }
  },
  'manual-add'() { toast('演示：手工补一条走小表单（字段 ≤6）；原型未接表单'); },
  'manual-edit'() { toast('演示：改这一条=登记新版本，旧记录保留（不出现"不可恢复"）'); },
  'q-add'() { openAddQuestion(); },
  'q-from-term'(el) {
    const term = el.dataset.term;
    mem().questions.push({ id: uid('q'), text: `${term} 这个结果对我的情况意味着什么，请医生解释`, asked: false, src: `分子档案 · ${TODAY} 生成` });
    toast('已加入问题清单（fact 区）', { back: true }); render();
  },
  'q-asked'(el) {
    const q = mem().questions.find((x) => x.id === el.dataset.id);
    if (q) { q.asked = el.checked; toast(q.asked ? '已标记"已问"' : '恢复为待问'); }
  },
  'ask-save'() {
    const picked = $$('#main .q-item input[data-action="ask-pick"]').filter((i) => i.checked).map((i) => i.dataset.q);
    if (!picked.length) { toast('先勾选至少一条'); return; }
    const m = mem();
    picked.forEach((q) => { if (!m.questions.some((x) => x.text === q)) m.questions.push({ id: uid('q'), text: q, asked: false, src: `MRI 并列 · ${TODAY} 勾选` }); });
    toast(`已存 ${picked.length} 条进问题清单`, { back: true }); render();
  },
  'seizure-add'() { openSeizureForm(); },
  'mri-add'() { openMriForm(); },
  'cog-add'() { openCogForm(); },
  'topic-add'() { openTopicForm(); },
  'feel-add'() { openAddView(); },
  'topic-cycle'(el) {
    const p = profile();
    const t = p.decisions.find((x) => x.topic === el.dataset.topic) || mem().topics.find((x) => x.topic === el.dataset.topic);
    if (!t) return;
    t.status = t.status === 'open' ? 'discussed' : t.status === 'discussed' ? 'filed' : 'open';
    toast('话题状态已更新（讨论状态，不是医学结论）'); render();
  },
  'trial-save'(el) {
    const m = mem(); const k = el.dataset.key;
    m.savedTrials = m.savedTrials.includes(k) ? m.savedTrials.filter((x) => x !== k) : [...m.savedTrials, k];
    toast(m.savedTrials.includes(k) ? '已收藏（登记状态，未核实）' : '已取消收藏'); render();
  },
  'dose-log'(el) {
    const kind = el.dataset.kind === 'took' ? '已服' : '呕吐一次';
    if (el.dataset.kind === 'vomit') mem().questions.push({ id: uid('q'), text: '服药后呕吐怎么算、要不要补，请治疗团队说明', asked: false, src: `Stupp 日程 · ${TODAY}` });
    toast(kind === '已服' ? '已记录服药' : '已记录呕吐一次，并生成一条"问医生"条目', { back: true });
  },
  'wear-save'() {
    const v = parseFloat(($('.zoom input[data-action="wear-slide"]') || {}).value);
    toast(Number.isFinite(v) ? `已记录今日佩戴 ${fmtNum(v, 1)} 小时（演示仅内存）` : '先拖动滑条选择时长', { back: true });
  },
  'skin-log'() { toast('演示：头皮反应记录走 4 字段小表单（部位/表现/拍照/日期）'); },
  'ster-log'() { toast('演示：激素调整由对话候选或阶梯图上的小表单登记；医嘱原文照抄'); },
  'sym-log'() { toast('已记一次症状（演示仅内存）'); },
  'risk-log'() { toast('已记一条风险记录（演示仅内存）'); },
  'feel-log'() { toast('已记一次感受（表达面与指标面分开存放，不合成因果句）'); },
  'concern-log'(el) { toast(`已记一次「${el.dataset.kind}」（演示仅内存）`); },
  'meal-log'(el) { mem().meals.push({ meal: el.dataset.meal, d: TODAY }); toast(`已记：${el.dataset.meal}`); render(); },
  'wt-save'() {
    const v = parseFloat(($('#wt-quick') || {}).value);
    toast(Number.isFinite(v) && v > 0 ? `已记录体重 ${v} kg（演示仅内存）` : '先输入一个体重数字', { back: true });
  }
};

/* ---------------- events ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'pick-profile') {
    state.profileId = el.dataset.id;
    state.pin = null; state.flipped = new Set(); state.agent.draft = null;
    closeModal();
    toast(`已切换到 ${profile().name}（演示档案）；指标与治疗条已换源`);
    render();
    return;
  }
  if (a === 'cfg-tab') {
    $$('.cfg-tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b === el)));
    $$('.cfg-block[data-tab]').forEach((b) => { b.hidden = b.dataset.tab !== el.dataset.tab; });
    return;
  }
  if (a === 'copy-md') {
    const { md } = exportMarkdown(profile());
    navigator.clipboard?.writeText(md).then(() => toast('已复制 Markdown（若浏览器拒绝则复制失败）')).catch(() => toast('复制失败：浏览器未授权剪贴板'));
    return;
  }
  if (a === 'save-q') {
    const text = ($('#new-q')?.value || '').trim();
    if (!text) { toast('问题为空，未保存'); return; }
    mem().questions.push({ id: uid('q'), text, asked: false, src: `本人添加 · ${TODAY}` });
    closeModal(); render(); toast('已加入问题清单');
    return;
  }
  if (a === 'save-view') {
    const text = ($('#new-view')?.value || '').trim();
    if (!text) { toast('内容为空，未保存'); return; }
    const shared = $('#new-shared')?.checked;
    const p = profile();
    p.viewpoints = p.viewpoints || [];
    p.viewpoints.push({ role: 'CAREGIVER', visibility: shared ? 'shared' : 'private', date: TODAY, topic: 'MOOD', content: text });
    closeModal(); render(); toast(shared ? '已记录（shared，进入导出看法区）' : '已记录（private，仅本页可见）');
    return;
  }
  if (a === 'save-seizure') {
    const when = $('#sz-when')?.value, dur = parseFloat($('#sz-dur')?.value);
    if (!when || !Number.isFinite(dur)) { toast('什么时候、多久两项必填'); return; }
    mem().seizures.push({ onset: when.replace('T', ' '), durationMin: dur, type: $('#sz-type').value, trigger: $('#sz-note').value || '未记录', witnessedBy: $('#sz-by').value, note: '本人在原型中记录（演示）' });
    closeModal(); render(); toast('已生成事件卡，复诊时会带上', { back: true });
    return;
  }
  if (a === 'save-mri') {
    const d = $('#mri-d')?.value, x = $('#mri-x')?.value?.trim();
    if (!d || !x) { toast('日期与结论原文必填'); return; }
    profile().mri.push({ date: d, excerpt: x, dexAtTime: parseFloat($('#mri-dex')?.value) || 0, kpsAtTime: null, next: '新登记，待复诊讨论' });
    closeModal(); render(); toast('已登记（结论照抄原文）', { back: true });
    return;
  }
  if (a === 'save-cog') {
    const what = $('#cg-what')?.value?.trim(), when = $('#cg-when')?.value;
    if (!what || !when) { toast('什么变了、什么时候两项必填'); return; }
    mem().cogEvents.push({ what, when, impact: $('#cg-imp')?.value || '未记录', by: $('#cg-by').value });
    closeModal(); render(); toast('已记录认知变化事件', { back: true });
    return;
  }
  if (a === 'save-topic') {
    const name = $('#tp-name')?.value?.trim();
    if (!name) { toast('话题名为空，未保存'); return; }
    mem().topics.push({ topic: name, status: 'open', note: $('#tp-note')?.value || null });
    closeModal(); render(); toast('话题已开启（未谈）');
    return;
  }
  const fn = ACTIONS[a];
  if (fn) fn(el);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'zoom') { state.zoom = Number(el.value); render(); }
  else if (a === 'sel') ACTIONS.sel(el);
  else if (a === 'q-asked') ACTIONS['q-asked'](el);
  else if (a === 'wear-slide') { const s = el.parentElement.querySelector('.wear-val'); if (s) s.textContent = fmtNum(Number(el.value), 1) + ' h'; }
  else if (a === 'consent') { state.cfg.consent = el.checked; toast(el.checked ? '已同意云端解析' : '已取消；不会上传文件'); }
});
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.matches('input[data-action="wear-slide"]')) {
    const s = el.parentElement.querySelector('.wear-val');
    if (s) s.textContent = fmtNum(Number(el.value), 1) + ' h';
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('#dialog').open) closeModal();
});

/* 直达 hash：#page 或 #page/sub（sub 用 key） */
function applyHash() {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!hash) return false;
  const [p, s] = hash.split('/');
  if (!RENDERERS[p]) return false;
  state.page = p;
  if (s && SUBPAGES[p] && SUBPAGES[p].some(([k]) => k === s)) state.sub[p] = s;
  return true;
}
/* 启动异步化（定点替换 5/5）：先空态引导，再取 /api/bootstrap 填 DATA 与 APP_INFO，最后按 hash 渲染。
   失败如实显示错误与重试入口，不拿演示数据冒充本机数据。 */
async function loadBootstrap() {
  const res = await fetch(`${API_BASE}/api/bootstrap?profile=${encodeURIComponent(state.profileId)}`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`bootstrap ${res.status}`);
  const boot = await res.json();
  DATA = { meta: boot.meta, profiles: boot.profiles };
  if (boot.profileId && DATA.profiles.some((x) => x.id === boot.profileId)) state.profileId = boot.profileId;
  if (boot.app) {
    APP_INFO.version = boot.app.version;
    APP_INFO.build = boot.app.build;
    APP_INFO.channel = boot.app.channel;
    APP_INFO.channelLabel = boot.app.channelLabel;
    APP_INFO.displayVersion = `v${boot.app.version}`;
  }
  if (boot.workspace) {
    state.cfg.root = boot.workspace.root || state.cfg.root;
    state.cfg.workspaceStatus = boot.workspace.schemaVersion ? '已连接本机库' : state.cfg.workspaceStatus;
  }
  if (boot.meta && boot.meta.today) { /* TODAY 是 const，由 boot 后的渲染统一取 DATA.meta.today */ }
}
(async function boot() {
  document.body.setAttribute('data-booting', '1');
  $('#font-toggle').addEventListener('click', () => ACTIONS['font-toggle']());
  try {
    await loadBootstrap();
  } catch (e) {
    $('#main').innerHTML = `<div class="wb-boot"><b>本机服务没有连上</b><span>确认 npm start 已在运行（127.0.0.1），然后刷新这一页。</span><small>${esc(e.message)}</small></div>`;
    document.body.removeAttribute('data-booting');
    return;
  }
  applyHash();
  render();
  document.body.removeAttribute('data-booting');
  document.body.setAttribute('data-booted', '1');
})();
window.addEventListener('hashchange', () => {
  if (document.body.getAttribute('data-booted') !== '1') return; /* 启动未完成不渲染（DATA 还没到） */
  if (!applyHash()) return;
  render();
  $('#main').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
});
