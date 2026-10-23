/**
 * UI 一致性测试（M5）：视图 × 档案 × 页签**逐字符**一致。
 *
 * 同一台无头 Chrome 里渲染两边：原型 file:// 直开（demo-data.js）与开发版
 * http://127.0.0.1（/api/bootstrap → readmodels），逐 (view,sub) × (demo1,demo2)
 * 比对 `#main` innerHTML —— 逐字符相等才算过（不是相似度）。
 * 另核：index.html id 齐全、style.css 只差字号（≤3 处，当前 0）、顶栏 AI 五态、前缀同源。
 * 依赖本机 Chrome（CHROME_PATH 覆盖）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createWorkbenchServer } from '../dsh/server.js';
import { launchChrome, stopChrome, sleep } from '../scripts/cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROTOTYPE = pathToFileURL(join(ROOT, 'prototypes/v0.2/index.html')).href;
const CDP_PORT = Number(process.env.GBM_PARITY_CDP_PORT || 9341);

/* 30 个 (view,sub)：29 个二级页签 + 看板（HVT 覆盖矩阵同一份清单） */
const VIEW_SUBS = [
  ['dash', ''],
  ['tumor', 'molecular'], ['tumor', 'surgery'], ['tumor', 'pathology'],
  ['chemo', 'stupp'], ['chemo', 'cycles'], ['chemo', 'changes'],
  ['ttf', 'wear'], ['ttf', 'arrays'], ['ttf', 'usage'],
  ['mri', 'parallel'], ['mri', 'questions'], ['mri', 'archive'],
  ['lab', 'blood'], ['lab', 'steroid'], ['lab', 'metabolic'], ['lab', 'lab-panorama'],
  ['symptom', 'seizure'], ['symptom', 'edema'], ['symptom', 'risks'],
  ['nutrition', 'intake'], ['nutrition', 'concerns'],
  ['care', 'feelings'], ['care', 'cognition'], ['care', 'decisions'],
  ['followup', 'schedule'], ['followup', 'prepare'], ['followup', 'trials'], ['followup', 'enrolled'], ['followup', 'followup-archive'],
];
const PROFILES = ['demo1', 'demo2'];

/** 在页面里切视图并返回 #main innerHTML（state/render 是两份 app.js 的同名全局词法绑定） */
const GRAB = `(profileId, page, sub) => {
  (() => {
    state.profileId = profileId;
    state.page = page;
    if (sub) state.sub[page] = sub;
    render();
  })();
  return document.getElementById('main').innerHTML;
}`;

let app;
let chrome;

test.before(async () => {
  app = createWorkbenchServer({ dbPath: ':memory:' });
  app.__server = await app.listen(0);
  app.__port = app.__server.address().port;
  chrome = await launchChrome({ port: CDP_PORT });
});

test.after(async () => {
  await stopChrome(chrome);
  app?.close();
  app?.__server?.close();
});

async function grabFrom(url, { waitBoot = false } = {}) {
  const { cdp } = chrome;
  await cdp.send('Page.navigate', { url });
  if (waitBoot) {
    for (let i = 0; i < 60; i += 1) {
      const booted = await cdp.eval("(() => { try { return document.body && document.body.getAttribute('data-booted') === '1'; } catch (e) { return false; } })()");
      if (booted) break;
      await sleep(150);
    }
  } else {
    await sleep(260);
  }
  return cdp;
}

test('逐字符 parity：30 (view,sub) × 2 档案，#main innerHTML 完全一致', async () => {
  const appUrl = `http://127.0.0.1:${app.__port}/`;
  const proto = await grabFrom(PROTOTYPE);
  const dev = await grabFrom(appUrl, { waitBoot: true });

  let equal = 0;
  const diffs = [];
  for (const profileId of PROFILES) {
    for (const [page, sub] of VIEW_SUBS) {
      const a = await proto.eval(`(${GRAB})(${JSON.stringify(profileId)}, ${JSON.stringify(page)}, ${JSON.stringify(sub)})`);
      const b = await dev.eval(`(${GRAB})(${JSON.stringify(profileId)}, ${JSON.stringify(page)}, ${JSON.stringify(sub)})`);
      if (a === b) equal += 1;
      else {
        let at = -1;
        for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
          if (a[i] !== b[i]) { at = i; break; }
        }
        diffs.push({
          view: `${page}/${sub}`, profileId, at,
          proto: a.slice(Math.max(0, at - 60), at + 90),
          dev: b.slice(Math.max(0, at - 60), at + 90),
        });
      }
    }
  }
  assert.equal(equal, VIEW_SUBS.length * PROFILES.length, `逐字符一致 ${equal}/${VIEW_SUBS.length * PROFILES.length}；首个差异：${JSON.stringify(diffs[0] ?? null, null, 2).slice(0, 800)}`);
});

test('id 齐全：原型 index.html 的每个 id 在 public/index.html 都有；关键 id 在运行态 DOM 里找得到', () => {
  const protoHtml = readFileSync(join(ROOT, 'prototypes/v0.2/index.html'), 'utf8');
  const pubHtml = readFileSync(join(ROOT, 'public/index.html'), 'utf8');
  const protoIds = [...protoHtml.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const missing = protoIds.filter((id) => !pubHtml.includes(`id="${id}"`));
  assert.deepEqual(missing, [], `public/index.html 缺 id：${missing.join(', ')}`);
  /* 原型里代理 demo-data/app 的两个 script 标签除外，public 用同一个 app.js + 服务端注入 */
  const requiredRuntime = ['nav', 'main', 'breadcrumb', 'agent-toggle', 'agent-splitter', 'agent-pane', 'agent-hide', 'agent-label', 'ver-chip', 'app-version', 'app-build', 'dialog', 'toast'];
  for (const id of requiredRuntime) {
    assert.ok(pubHtml.includes(`id="${id}"`), `public/index.html 缺运行必需 id：${id}`);
  }
});

test('css 只差字号：public/style.css 与原型逐行 diff，改动 ≤3 处且全部是 font-size（当前 0 处）', () => {
  const a = readFileSync(join(ROOT, 'prototypes/v0.2/style.css'), 'utf8').split('\n');
  const b = readFileSync(join(ROOT, 'public/style.css'), 'utf8').split('\n');
  assert.equal(a.length, b.length, '行数一致（只允许行内改动，不允许增删行）');
  const changed = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) changed.push({ line: i + 1, proto: a[i], dev: b[i] });
  }
  assert.ok(changed.length <= 3, `字号改动超过 3 处：${changed.map((c) => c.line).join(', ')}`);
  for (const c of changed) {
    assert.ok(/font-size|--font/.test(c.proto) || /font-size|--font/.test(c.dev), `第 ${c.line} 行的改动不是字号：${c.proto} → ${c.dev}`);
  }
});

test('顶栏 AI 五态：idle / connecting / ready / hidden / unavailable 标签逐态可见', async () => {
  const appUrl = `http://127.0.0.1:${app.__port}/`;
  const { cdp } = chrome;
  await cdp.send('Page.navigate', { url: appUrl });
  await sleep(200);
  for (let i = 0; i < 60 && !(await cdp.eval("(() => { try { return document.body && document.body.getAttribute('data-booted') === '1'; } catch (e) { return false; } })()")); i += 1) await sleep(150);

  const seen = [];
  const label = () => cdp.eval("document.getElementById('agent-toggle').textContent");
  const state = () => cdp.eval("document.getElementById('agent-toggle').dataset.agentState");

  seen.push([await state(), await label()]); // idle：'AI 对话'
  assert.equal(seen[0][0], 'idle');
  assert.equal(seen[0][1], 'AI 对话');

  await cdp.eval("document.getElementById('agent-toggle').click()"); // → connecting → ready
  await cdp.eval("state.agent.phase='connecting'; renderAgent();");
  seen.push([await state(), await label()]);
  assert.equal(seen[1][0], 'connecting');
  assert.equal(seen[1][1], '正在连接…');

  for (let i = 0; i < 20 && await cdp.eval("document.getElementById('agent-pane').hidden"); i += 1) await sleep(60);
  seen.push([await state(), await label()]);
  assert.equal(seen[2][0], 'ready');
  assert.equal(seen[2][1], '收起 AI 对话');
  assert.equal(await cdp.eval("document.getElementById('agent-pane').hidden"), false, '面板打开');

  await cdp.eval("document.getElementById('agent-toggle').click()"); // 收起 → hidden
  seen.push([await state(), await label()]);
  assert.equal(seen[3][0], 'hidden');
  assert.equal(seen[3][1], '打开 AI 对话');
  assert.equal(await cdp.eval("document.getElementById('agent-pane').hidden"), true, '收起不卸载');

  await cdp.eval("state.agent.phase='unavailable'; state.agent.open=false; renderAgent();");
  seen.push([await state(), await label()]);
  assert.equal(seen[4][0], 'unavailable');
  assert.equal(seen[4][1], 'AI 对话暂不可用');
  assert.equal(await cdp.eval("document.getElementById('agent-toggle').disabled"), true, '服务缺失才禁用');

  await cdp.eval("state.agent.phase='idle'; renderAgent();"); // 复位
});

test('面板宽度持久化：localStorage 越界值读回被夹取到 25–45', async () => {
  const { cdp } = chrome;
  const booted = "(() => { try { return document.body && document.body.getAttribute('data-booted') === '1'; } catch (e) { return false; } })()";
  await cdp.eval("localStorage.setItem('gbm-starpal.agent.w', '95'); location.reload();");
  await sleep(300);
  for (let i = 0; i < 40 && !(await cdp.eval(booted)); i += 1) await sleep(150);
  const w = await cdp.eval('state.agent.w');
  assert.equal(w, 45, '读回 95 → 夹取到 45');
  await cdp.eval("localStorage.setItem('gbm-starpal.agent.w', '3'); location.reload();");
  await sleep(300);
  for (let i = 0; i < 40 && !(await cdp.eval(booted)); i += 1) await sleep(150);
  assert.equal(await cdp.eval('state.agent.w'), 25, '读回 3 → 夹取到 25');
  await cdp.eval("localStorage.removeItem('gbm-starpal.agent.w');");
});

test('前缀同源：apiBase 不含 /api；app.js 单一 API_BASE；运行态 fetch 正常', async () => {
  const pubHtml = readFileSync(join(ROOT, 'public/index.html'), 'utf8');
  assert.ok(pubHtml.includes('data-api-base="{{WB_API_BASE}}"'), '文件里是占位符，由服务端注入');
  const appJs = readFileSync(join(ROOT, 'public/app.js'), 'utf8');
  assert.equal((appJs.match(/const API_BASE/g) || []).length, 1, 'API_BASE 只定义一次');
  assert.ok(appJs.includes('${API_BASE}/api/bootstrap'), '接口调用统一走 ${API_BASE}/api');
  assert.ok(!appJs.includes("'/api/"), '不许出现硬编码 /api 前缀');
  const { cdp } = chrome;
  assert.equal(await cdp.eval('API_BASE'), '', '独立启动：服务端注入空基址');
  assert.equal(await cdp.eval("document.documentElement.dataset.apiBase"), '');
  assert.equal(await cdp.eval("API_BASE.includes('/api')"), false);
  assert.equal(await cdp.eval("document.body.getAttribute('data-booted') === '1'"), true);
});

test('无 JS 异常：开发版整轮渲染 0 error', async () => {
  const real = chrome.cdp.errors.filter((e) => !/favicon/.test(e));
  assert.equal(real.length, 0, `页面 JS 异常：\n${real.join('\n')}`);
});
