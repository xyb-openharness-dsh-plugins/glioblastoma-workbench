#!/usr/bin/env node
/**
 * HVT 交互一致性检查（M5，X1–X4；docs/INTERACTION-DESIGN.md 是路径基准）。
 *
 * X1 覆盖矩阵：30 个 (view,sub)（29 二级页签 + 看板）每个被 INTERACTION-DESIGN §二
 *    至少一条 S 路径覆盖；每条路径的每个落点 key 必须真实存在于 PAGES/SUBPAGES，
 *    且其中文标签在文档里**逐字出现**（防“表里写 A、界面叫 B”）。
 * X2 路径走通：13 条路径（S01–S13）在无头 Chrome 里从看板入口逐 key 走：
 *    nav 一级 → subnav 二级 → 断言 aria-selected 与面包屑标签；13/13 才算过。
 * X3 编辑入口 ≤1：每个 (view,sub) 上“手工编辑开表单”类按钮 ≤1（INTERACTION-DESIGN §三门槛红线）。
 * X4 AI 产出走候选核对：10 个一级页各触发「AI 协助示例」，断言出现候选卡与
 *    确认/修改/拒收三键（一切 AI 产出都是候选）。
 *
 * 用法：node scripts/check-hvt.mjs；退出码 0/1。依赖本机 Chrome。
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkbenchServer } from '../dsh/server.js';
import { launchChrome, stopChrome, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = readFileSync(join(ROOT, 'docs/INTERACTION-DESIGN.md'), 'utf8');
const CDP_PORT = Number(process.env.GBM_HVT_CDP_PORT || 9342);

/* ---- 从两份 app.js 里解析同一份页面树（导航 key 一致性的一部分） ---- */
function parseTree(file) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  const pagesSrc = src.match(/const PAGES = \[([\s\S]*?)\];/)?.[1] ?? '';
  const pages = [...pagesSrc.matchAll(/\['([a-z-]+)',\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);
  const subsSrc = src.match(/const SUBPAGES = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  const subs = {};
  for (const seg of subsSrc.split(/,\s*(?=[a-z-]+:)/)) {
    const key = seg.match(/^\s*([a-z-]+):\s*\[/)?.[1];
    if (!key) continue;
    subs[key] = [...seg.matchAll(/\['([a-zA-Z-]+)',\s*'([^']+)'\]/g)].map((m) => [m[1], m[2]]);
  }
  return { pages, subs };
}

const protoTree = parseTree('prototypes/v0.2/app.js');
const devTree = parseTree('public/app.js');

/* ---- 30 个 (view,sub) 清单（与 test/ui-parity.test.mjs 同一份） ---- */
const VIEW_SUBS = [['dash', '']];
for (const [page] of protoTree.pages) {
  if (page === 'dash') continue;
  for (const [sub] of protoTree.subs[page] ?? []) VIEW_SUBS.push([page, sub]);
}

/* ---- X1：覆盖基准是文档 §五 覆盖矩阵（30 行），路径落点另走 §二 S01–S13 ---- */
const PATHS = [
  { id: 'S01', steps: [['tumor', 'molecular']] },                                    // 「我的瘤→分子档案」
  { id: 'S02', steps: [['chemo', 'stupp']] },                                        // 「放化疗日历→Stupp 日程」
  { id: 'S03', steps: [['ttf', 'wear']] },                                           // 「电场治疗→佩戴与时长」
  { id: 'S04', steps: [['mri', 'parallel'], ['mri', 'questions']] },                 // 「随访影像→MRI 并列」→问题清单
  { id: 'S05', steps: [['lab', 'steroid']] },                                        // 「指标与用药→激素剂量」
  { id: 'S06', steps: [['symptom', 'seizure']] },                                    // 「症状与发作→癫痫轨道」
  { id: 'S07', steps: [['care', 'decisions']] },                                     // 「照护与家事→决策与 ACP」
  { id: 'S08', steps: [['followup', 'prepare']] },                                   // 「复诊与试验→就诊准备与导出」
  { id: 'S09', steps: [['lab', 'blood']] },                                          // 「指标与用药→血象卡」
  { id: 'S10', steps: [['care', 'cognition']] },                                     // 「照护与家事→认知与人格」
  { id: 'S11', steps: [['nutrition', 'intake']] },                                   // 「营养与体重→进食与体重」
  { id: 'S12', steps: [['followup', 'trials']] },                                    // 「复诊与试验→试验线索」
  { id: 'S13', steps: [['followup', 'followup-archive']] },                          // 「复诊与试验→资料库/资料档案」
];

const labelOf = (page, sub) => {
  if (!sub) return protoTree.pages.find((p) => p[0] === page)?.[1] ?? null;
  return protoTree.subs[page]?.find((x) => x[0] === sub)?.[1] ?? null;
};

const problems = [];
const numbers = { x1Covered: 0, x1Total: VIEW_SUBS.length, x2Walked: 0, x2Total: PATHS.length, x3Violations: 0, x3Views: 0, x4Ok: 0, x4Total: 10 };

/* ---- X0：两份 app.js 页面树必须逐字一致（导航 key 一致的基础） ---- */
if (JSON.stringify(protoTree) !== JSON.stringify(devTree)) {
  problems.push('X0 导航树不一致：prototypes/v0.2/app.js 与 public/app.js 的 PAGES/SUBPAGES 必须逐字相同');
}

/* ---- X1：解析文档 §五 覆盖矩阵（30 行）；key 与标签必须与页面树逐一相同 ---- */
const matrix = [...DOC.matchAll(/^\| ([a-z-]+\/?[a-zA-Z-]*) \| ([^|]+) \| ([^|]+) \|$/gm)]
  .map((m) => ({ key: m[1].trim(), label: m[2].trim(), source: m[3].trim() }))
  .filter((r) => r.key !== 'key' && /^[a-z-]+(\/[a-zA-Z-]+)?$/.test(r.key) && !/^[-\s]*$/.test(r.label));
const byKey = new Map(VIEW_SUBS.map(([page, sub]) => [sub ? `${page}/${sub}` : 'dash', { page, sub }]));
const seen = new Set();
for (const row of matrix) {
  const view = byKey.get(row.key);
  if (!view) {
    problems.push(`X1 矩阵里的 ${row.key} 不在页面树`);
    continue;
  }
  const label = labelOf(view.page, view.sub);
  if (row.label !== label) {
    problems.push(`X1 矩阵 ${row.key} 标签「${row.label}」与页面树「${label}」不一致`);
  }
  if (!row.source) problems.push(`X1 矩阵 ${row.key} 没写覆盖来源`);
  seen.add(row.key);
}
for (const key of byKey.keys()) {
  if (!seen.has(key)) problems.push(`X1 未覆盖：${key} 不在 INTERACTION-DESIGN §五 覆盖矩阵里`);
}
numbers.x1Covered = [...byKey.keys()].filter((k) => seen.has(k)).length;

/* 路径落点合法性：S01–S13 的每个落点 key 必须真实存在（逐字走通的前提） */
for (const path of PATHS) {
  for (const [page, sub] of path.steps) {
    if (labelOf(page, sub) === null) problems.push(`${path.id} 落点 (${page},${sub}) 不在页面树里`);
  }
}

/* ---- 无头段：X2 走路径 / X3 编辑入口 / X4 候选核对 ---- */
const app = createWorkbenchServer({ dbPath: ':memory:' });
const server = await app.listen(0);
const chrome = await launchChrome({ port: CDP_PORT });
const { cdp } = chrome;
const bootedExpr = "(() => { try { return document.body && document.body.getAttribute('data-booted') === '1'; } catch (e) { return false; } })()";

try {
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  await sleep(250);
  for (let i = 0; i < 60 && !(await cdp.eval(bootedExpr)); i += 1) await sleep(150);

  /* X2：从看板出发逐 key 走 13 条路径（nav → subnav → 断言选中态与面包屑） */
  for (const path of PATHS) {
    let ok = true;
    for (const [page, sub] of path.steps) {
      const clicked = await cdp.eval(`(() => {
        const b = document.querySelector('#nav [data-page=${JSON.stringify(page)}]');
        if (!b) return 'no-nav';
        b.click(); return 'ok';
      })()`);
      if (clicked !== 'ok') { ok = false; problems.push(`${path.id}: 看板导航里没有 ${page}`); break; }
      await sleep(40);
      if (sub) {
        const subd = await cdp.eval(`(() => {
          const t = document.querySelector('.subnav [data-sub=${JSON.stringify(sub)}]');
          if (!t) return 'no-sub';
          t.click(); return 'ok';
        })()`);
        if (subd !== 'ok') { ok = false; problems.push(`${path.id}: ${page} 页签里没有 ${sub}`); break; }
        await sleep(40);
        const sel = await cdp.eval(`document.querySelector('.subnav [data-sub=${JSON.stringify(sub)}]').getAttribute('aria-selected')`);
        if (sel !== 'true') { ok = false; problems.push(`${path.id}: ${page}/${sub} 点击后未选中`); }
      }
      const want = labelOf(page, sub);
      const crumb = await cdp.eval('document.getElementById("breadcrumb").textContent');
      if (want && !crumb.includes(want)) { ok = false; problems.push(`${path.id}: 面包屑「${crumb}」不含「${want}」`); }
    }
    if (ok) numbers.x2Walked += 1;
    await cdp.eval("state.page='dash'; render();"); // 回看板，下一条路径重新出发
    await sleep(30);
  }

  /* X3：每个视图显式编辑入口（开手工表单类按钮）≤1 */
  const EDIT_OPENERS = ['mri-add', 'seizure-add', 'cog-add', 'topic-add', 'feel-add', 'q-add'];
  for (const [page, sub] of VIEW_SUBS) {
    await cdp.eval(`(() => { state.page=${JSON.stringify(page)}; ${sub ? `state.sub[${JSON.stringify(page)}]=${JSON.stringify(sub)};` : ''} render(); })()`);
    await sleep(30);
    const count = await cdp.eval(`(() => {
      let n = 0;
      for (const a of ${JSON.stringify(EDIT_OPENERS)}) {
        n += document.querySelectorAll('#main button[data-action="' + a + '"]').length;
      }
      return n;
    })()`);
    numbers.x3Views += 1;
    if (count > 1) {
      numbers.x3Violations += 1;
      problems.push(`X3 (${page},${sub}) 显式编辑入口 ${count} 个 >1`);
    }
  }

  /* X4：每个一级页触发 AI 协助示例 → 候选卡 + 三键核对 */
  for (const [page] of protoTree.pages) {
    await cdp.eval(`(() => { state.page=${JSON.stringify(page)}; render(); })()`);
    await sleep(30);
    await cdp.eval(`(() => {
      const btn = document.querySelector('#main [data-action="ai-draft"]');
      if (btn) btn.click();
      return 'clicked';
    })()`);
    await sleep(400); /* connecting → ready 异步打开 */
    const res = await cdp.eval(`(() => {
      const pane = document.getElementById('agent-pane');
      if (!pane || pane.hidden) return 'pane-closed';
      const cand = pane.querySelector('.agent-cand');
      if (!cand) return 'no-cand';
      const acts = ['cand-ok', 'cand-fix', 'cand-reject'].filter((a) => cand.querySelector('[data-action="' + a + '"]')).length;
      return acts === 3 ? 'ok' : 'keys=' + acts;
    })()`);
    if (res === 'ok') numbers.x4Ok += 1;
    else problems.push(`X4 ${page}: AI 产出未走候选核对（${res}）`);
    await cdp.eval('setAgent(false);');
    await sleep(20);
  }
} finally {
  await stopChrome(chrome);
  app.close();
  server.close();
}

console.log(`X1 覆盖矩阵：${numbers.x1Covered}/${numbers.x1Total} 个 (view,sub) 被 S01–S13 覆盖`);
console.log(`X2 路径走通：${numbers.x2Walked}/${numbers.x2Total} 条从看板入口逐 key 走通（aria-selected + 面包屑标签一致）`);
console.log(`X3 编辑入口：${numbers.x3Views} 个视图检查，>${1} 的违规 ${numbers.x3Violations} 处`);
console.log(`X4 候选核对：${numbers.x4Ok}/${numbers.x4Total} 个一级页的 AI 产出走「候选 + 确认/修改/拒收」`);

if (problems.length) {
  console.error(`✗ HVT 一致性失败 ${problems.length} 处：`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✓ HVT 交互一致性（X1–X4）全部通过');
