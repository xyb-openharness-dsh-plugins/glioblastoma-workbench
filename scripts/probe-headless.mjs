#!/usr/bin/env node
/**
 * 无头实测（M5 验收 F4：必须出数字，不口头说"没问题"）。
 *
 * 数字：导航数、AI 面板宽度（默认 35 / 拖宽 45 / 键盘最窄 25 / 收起）、
 * 30 个视图 bodyScrollW vs innerWidth、控制台 error 与网络 4xx 计数、
 * 一图秀 numericLines 与分类节点数（KPS 只节点不连线）。
 * 截图存 docs/shots/dev/。干净目录跑（mkdtemp 到主目录下，不用 os.tmpdir）。
 *
 * 用法：node scripts/probe-headless.mjs；退出码 0/1。依赖本机 Chrome。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkbenchServer } from '../dsh/server.js';
import { launchChrome, stopChrome, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'shots', 'dev');
mkdirSync(SHOTS, { recursive: true });
const CDP_PORT = Number(process.env.GBM_PROBE_CDP_PORT || 9343);

const workspaceDir = mkdtempSync(join(homedir(), '.xyb-gbm-probe-'));
const dbPath = join(workspaceDir, 'xyb-glioblastoma.sqlite');
const app = createWorkbenchServer({ dbPath });
const server = await app.listen(0);
const port = server.address().port;
const URL_APP = `http://127.0.0.1:${port}/`;

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const errors = cdp.errors;
const badResponses = cdp.badResponses;
try {
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(300);
  const bootedExpr = "(() => { try { return document.body && document.body.getAttribute('data-booted') === '1'; } catch (e) { return false; } })()";
  for (let i = 0; i < 60 && !(await cdp.eval(bootedExpr)); i += 1) await sleep(150);

  const out = {};

  /* 导航数 */
  out.navButtons = await cdp.eval("document.querySelectorAll('#nav .nav-button').length");

  /* 面板宽度三态：默认开 35 → splitter 拖到 45 → 键盘 End 25 → 收起 */
  await cdp.eval("document.getElementById('agent-toggle').click()");
  await sleep(400);
  out.agentPane = {};
  out.agentPane.defaultPct = await cdp.eval('state.agent.w');
  out.agentPane.openHidden = await cdp.eval("document.getElementById('agent-pane').hidden");
  out.agentPane.splitterAriaNow = await cdp.eval("document.getElementById('agent-splitter').getAttribute('aria-valuenow')");
  await cdp.eval("document.getElementById('agent-splitter').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));");
  out.agentPane.widePct = await cdp.eval('state.agent.w');
  await cdp.eval("document.getElementById('agent-splitter').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));");
  out.agentPane.narrowPct = await cdp.eval('state.agent.w');
  const panePx = await cdp.eval("Math.round(document.getElementById('agent-pane').getBoundingClientRect().width)");
  const winPx = await cdp.eval('window.innerWidth');
  out.agentPane.panePxAtNarrow = panePx;
  out.agentPane.panePctOfStage = Math.round((panePx / (await cdp.eval("document.querySelector('.stage').getBoundingClientRect().width"))) * 10) / 10;
  await cdp.eval("document.getElementById('agent-hide').click()");
  out.agentPane.collapsedHidden = await cdp.eval("document.getElementById('agent-pane').hidden");
  out.agentPane.collapsedLabel = await cdp.eval("document.getElementById('agent-toggle').textContent");

  /* 版本首屏 */
  out.version = {
    chip: await cdp.eval("document.getElementById('ver-chip').textContent"),
    footer: await cdp.eval("document.getElementById('app-version').textContent"),
    title: await cdp.eval('document.title'),
  };

  /* 30 个视图：横向溢出检查（bodyScrollW === innerWidth） */
  const VIEW_SUBS = [
    ['dash', ''], ['tumor', 'molecular'], ['tumor', 'surgery'], ['tumor', 'pathology'],
    ['chemo', 'stupp'], ['chemo', 'cycles'], ['chemo', 'changes'],
    ['ttf', 'wear'], ['ttf', 'arrays'], ['ttf', 'usage'],
    ['mri', 'parallel'], ['mri', 'questions'], ['mri', 'archive'],
    ['lab', 'blood'], ['lab', 'steroid'], ['lab', 'metabolic'], ['lab', 'lab-panorama'],
    ['symptom', 'seizure'], ['symptom', 'edema'], ['symptom', 'risks'],
    ['nutrition', 'intake'], ['nutrition', 'concerns'],
    ['care', 'feelings'], ['care', 'cognition'], ['care', 'decisions'],
    ['followup', 'schedule'], ['followup', 'prepare'], ['followup', 'trials'], ['followup', 'enrolled'], ['followup', 'followup-archive'],
  ];
  let overflow = 0;
  const overflowAt = [];
  for (const [page, sub] of VIEW_SUBS) {
    await cdp.eval(`(() => { state.page=${JSON.stringify(page)}; ${sub ? `state.sub[${JSON.stringify(page)}]=${JSON.stringify(sub)};` : ''} render(); })()`);
    await sleep(40);
    const d = await cdp.eval('document.body.scrollWidth - window.innerWidth');
    if (d > 1) { overflow += 1; overflowAt.push(`${page}/${sub}(+${d}px)`); }
  }
  out.bodyScrollEqualsInner = { views: VIEW_SUBS.length, overflow, overflowAt };

  /* 一图秀：数值线条数与分类节点数（demo1：WBC/DEXA 两条数值线 + KPS 节点） */
  await cdp.eval("(() => { state.page='lab'; state.sub.lab='lab-panorama'; state.profileId='demo1'; render(); })()");
  await sleep(80);
  out.chart = await cdp.eval(`(() => {
    const svg = document.querySelector('.chart-wrap svg.chart');
    if (!svg) return { numericLines: 0, kpsNodes: 0 };
    const lines = svg.querySelectorAll('path.line').length;
    const circles = [...svg.querySelectorAll('circle.pt')];
    const kpsIdx = svg.getAttribute('aria-label');
    return { numericLines: lines, ptNodes: circles.length, ariaHasSeries: kpsIdx };
  })()`);

  /* 网络与错误 */
  out.jsErrors = errors.length;
  out.consoleErrorSamples = errors.slice(0, 3);
  out.netFailed = badResponses.length;
  const statuses = await cdp.eval("performance.getEntriesByType('resource').map((e) => e.responseStatus).filter((s) => s && s >= 400)");
  out.http4xx = statuses.length;

  /* 截图（首屏 / 一图秀 / AI 面板开 / demo2 档案） */
  async function shot(name) {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(r.data, 'base64'));
  }
  await cdp.eval("(() => { state.page='dash'; render(); })()");
  await sleep(120);
  await shot('01-dash-demo1');
  await cdp.eval("(() => { state.page='lab'; state.sub.lab='lab-panorama'; render(); })()");
  await sleep(120);
  await shot('02-lab-panorama');
  await cdp.eval("(() => { state.page='mri'; state.sub.mri='parallel'; state.profileId='demo2'; render(); })()");
  await sleep(120);
  await shot('03-mri-parallel-demo2');
  await cdp.eval("(() => { state.profileId='demo1'; setAgent(true); })()");
  await sleep(500);
  await shot('04-agent-pane-open');

  console.log(JSON.stringify(out, null, 2));
  console.log(`截图目录：${SHOTS}`);
  const pass = out.jsErrors === 0 && out.http4xx === 0 && out.bodyScrollEqualsInner.overflow === 0
    && out.navButtons === 10 && out.agentPane.defaultPct === 35;
  console.log(pass ? '✓ 无头实测通过' : '✗ 无头实测未达门槛');
  process.exitCode = pass ? 0 : 1;
} finally {
  await stopChrome(ch);
  app.close();
  server.close();
}
