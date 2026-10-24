#!/usr/bin/env node
/**
 * 客户端外壳 × 宿主契约的联合探针（0.1.4）。
 *
 * 为什么需要它：装机副本能不能点出原生 AI 会话，取决于**宿主怎么调用我们**，静态检查看不出来。
 * 这里按 asar 里真实的宿主实现搭一个最小外壳：
 * - `window.__ModuleLoader__.load({ id, factory })`，`require('react')` 由外壳提供（与 Desktop 一致）；
 * - `desktopWorkbenches.register(meta, Panel)` 收下组件；
 * - **`conversation` prop 恒非空**（宿主在本工作台 active 时总是传一个 display:none 的容器）
 *   ——0.1.3 就是被这一点骗了：把 Boolean(conversation) 当成"已有会话"，
 *   按钮一上来就是「收起 AI 对话」，点击只切显隐，永远走不到 ensureSession；
 * - `ensureSession({ folder })` 复刻宿主的硬校验：folder 不是非空字符串就抛
 *   「创建会话需要业务项目文件夹。」，成功后把会话绑定给本工作台并通知订阅者。
 *
 * 断言：初始是「AI 对话」→ 点击真的调起会话（folder 非空、草稿填入）→ 面板可见 →
 * 再点收起（DOM 不卸载）→ 再点打开 → splitter 键盘 Home/End 到 45/25。
 *
 * 用法：`node scripts/probe-client-session.mjs`；退出码 0/1。依赖本机 Chrome。
 */
import { createServer } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, sleep, stopChrome } from './cdp.mjs';
import { HEALTH_PATH } from '../lib/routes.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'shots', 'dev');
mkdirSync(SHOTS, { recursive: true });
const CDP_PORT = Number(process.env.GBM_SESSION_CDP_PORT || 9345);
const REACT_DIR = process.env.GBM_REACT_DIR
  || '/Users/qinxiaoqiang/.workbuddy/binaries/node/workspace/node_modules';

/* 假的"业务目录"：宿主真实场景下是 harness/glioblastoma-workbench，这里用临时目录代替 */
const FAKE_DIR = mkdtempSync(join(homedir(), '.xyb-gbm-session-'));
const CLIENT = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8');

/* 外壳页：模拟 Desktop 的模块加载器 + desktopWorkbenches 服务 */
const PAGE = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>宿主外壳探针</title>
<style>html,body{margin:0;height:100%;background:#fff}#host{height:100%;display:flex}</style>
<script src="/react.js"></script><script src="/react-dom.js"></script>
</head><body><div id="host"></div>
<script>
window.__hits = [];
window.__draft = null;
window.__panel = null;
const DIR = ${JSON.stringify(FAKE_DIR)};
let bound = null;              // 绑给本工作台的会话
let subscribers = [];
function notify() { subscribers.forEach((fn) => { try { fn() } catch (e) {} }) }

window.__ModuleLoader__ = {
  load({ id, factory }) {
    window.__loadedId = id;
    const require = (name) => {
      if (name === 'react') return React;
      if (name === 'react-dom') return ReactDOM;
      throw new Error('unexpected require: ' + name);
    };
    const mod = factory(require);
    window.__mod = mod;
    // 宿主在插件 apply 时注入 ctx（这里只给用得到的三个服务）
    const ctx = {
      effect: (fn) => { const dispose = fn(); return dispose; },
      desktopWorkbenches: {
        register: (meta, Panel) => { window.__meta = meta; window.__panel = Panel; },
        // 复刻宿主：folder 必须是非空字符串，否则拒绝
        ensureSession: async ({ folder } = {}) => {
          window.__hits.push({ folder: folder === undefined ? null : folder });
          if (typeof folder !== 'string' || !folder.trim()) throw new Error('创建会话需要业务项目文件夹。');
          bound = 'sess-1';
          notify();
          return bound;
        },
        currentSession: () => bound,
        ownsSession: (id) => Boolean(bound) && id === bound,
        subscribe: (fn) => { subscribers.push(fn); return () => { subscribers = subscribers.filter((x) => x !== fn) } },
      },
      sessions: {
        list: { getSnapshot: () => ({ current: bound, byId: {} }) },
        scope: (id) => ({
          get: (name) => (name === 'conversation' ? {
            input: { for: () => ({
              state: { getSnapshot: () => ({ draft: '', occurrences: [], phase: 'plain' }) },
              setDraft: (value) => { window.__draft = value },
            }) },
          } : null),
        }),
      },
    };
    mod.apply(ctx);
  },
};

window.addEventListener('load', () => {
  // 宿主外壳：conversation 恒非空（display:none 的容器），这就是 0.1.3 踩的坑
  const conversation = React.createElement('div', { style: { display: 'contents' } },
    React.createElement('div', { id: 'native-conversation', style: { padding: 12, font: '12px sans-serif' } }, '原生会话（探针占位）'));
  const Panel = window.__panel;
  ReactDOM.createRoot(document.getElementById('host')).render(React.createElement(Panel, { conversation }));
});
</script>
<!-- 顺序很关键：必须在 ModuleLoader/ctx 定义之后、load 事件之前执行，与 Desktop 的注入时机一致 -->
<script src="/client.js"></script>
</body></html>`;

const routes = {
  '/': () => ['text/html; charset=utf-8', PAGE],
  '/react.js': () => ['text/javascript; charset=utf-8', readFileSync(join(REACT_DIR, 'react/umd/react.development.js'), 'utf8')],
  '/react-dom.js': () => ['text/javascript; charset=utf-8', readFileSync(join(REACT_DIR, 'react-dom/umd/react-dom.development.js'), 'utf8')],
  '/client.js': () => ['text/javascript; charset=utf-8', CLIENT],
  '/ui/': () => ['text/html; charset=utf-8', '<!doctype html><meta charset="utf-8"><body data-probe="ui">业务界面占位</body>'],
  [HEALTH_PATH]: () => ['application/json; charset=utf-8', JSON.stringify({ ok: true, dir: FAKE_DIR })],
};

const server = createServer((req, res) => {
  const path = (req.url || '/').split('?')[0];
  const hit = routes[path];
  if (!hit) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return; }
  const [type, body] = hit();
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const PORT = server.address().port;

/* 探针页 = 上面的 PAGE；client.js 走 /client.js 路由，执行时机与 Desktop 注入一致 */

const chrome = await launchChrome({ port: CDP_PORT });
const { cdp } = chrome;
const problems = [];
const out = {};

const evalJs = (expr) => cdp.eval(expr);
const waitFor = async (expr, ms = 6000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await evalJs(expr)) return true;
    await sleep(120);
  }
  return false;
};

try {
  // 固定视口，否则默认窗口可能窄于 NARROW_BELOW（760），外壳会切成抽屉式、不出 splitter
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  if (!(await waitFor("Boolean(document.querySelector('header button'))"))) {
    throw new Error('面板没有渲染出顶栏按钮');
  }
  out.loadedId = await evalJs('window.__loadedId');
  out.metaTitle = await evalJs('window.__meta && window.__meta.title');
  out.customFrame = await evalJs('window.__meta && window.__meta.customFrame');

  const label = () => evalJs("document.querySelector('header button').textContent");
  const paneDisplay = () => evalJs("(() => { const a = document.querySelector('aside'); return a ? getComputedStyle(a).display : 'missing' })()");

  /* ① 初始：没有会话时按钮必须是"建立会话"，不能是"收起" */
  out.labelBeforeClick = await label();
  if (out.labelBeforeClick !== 'AI 对话') problems.push(`初始按钮文案是「${out.labelBeforeClick}」，应为「AI 对话」`);
  out.paneBeforeClick = await paneDisplay();
  if (out.paneBeforeClick !== 'none') problems.push(`初始 aside display=${out.paneBeforeClick}，应为 none`);

  /* ② 点击 → 必须真的调 ensureSession，且 folder 非空 */
  await evalJs("document.querySelector('header button').click()");
  await waitFor('window.__hits.length > 0');
  await sleep(500);
  out.ensureCalls = await evalJs('JSON.stringify(window.__hits)');
  const hits = JSON.parse(out.ensureCalls || '[]');
  if (hits.length !== 1) problems.push(`ensureSession 调用 ${hits.length} 次，应为 1 次`);
  if (!hits[0] || hits[0].folder !== FAKE_DIR) problems.push(`ensureSession folder=${JSON.stringify(hits[0]?.folder)}，应为 ${FAKE_DIR}`);

  out.draftFilled = await evalJs('typeof window.__draft === "string" && window.__draft.includes("小星宝")');
  if (!out.draftFilled) problems.push('开场白没有填进原生草稿');

  out.paneAfterClick = await paneDisplay();
  if (out.paneAfterClick !== 'flex') problems.push(`调起会话后 aside display=${out.paneAfterClick}，应为 flex`);
  out.nativeVisible = await evalJs("(() => { const n = document.getElementById('native-conversation'); return Boolean(n) && getComputedStyle(n).display !== 'none' })()");
  if (!out.nativeVisible) problems.push('原生会话挂载点不可见');
  out.labelAfterOpen = await label();
  if (out.labelAfterOpen !== '收起 AI 对话') problems.push(`会话就绪后按钮是「${out.labelAfterOpen}」，应为「收起 AI 对话」`);
  out.note = await evalJs("document.querySelector('header').textContent.includes('会话已就绪')");
  if (!out.note) problems.push('顶栏没有「会话已就绪」提示');

  await cdp.send('Page.captureScreenshot', { format: 'png' }).then(({ data }) =>
    writeFileSync(join(SHOTS, 'client-session-0.1.4.png'), Buffer.from(data, 'base64')));

  /* ③ 收起 = 只隐藏，DOM 不能卸载（卸载会丢输入框状态） */
  await evalJs("document.querySelector('header button').click()");
  await sleep(250);
  out.paneAfterCollapse = await paneDisplay();
  out.nativeStillMounted = await evalJs("Boolean(document.getElementById('native-conversation'))");
  if (out.paneAfterCollapse !== 'none') problems.push(`收起后 aside display=${out.paneAfterCollapse}，应为 none`);
  if (!out.nativeStillMounted) problems.push('收起把原生会话卸载了（宿主明确禁止）');
  out.labelAfterCollapse = await label();
  if (out.labelAfterCollapse !== '打开 AI 对话') problems.push(`收起后按钮是「${out.labelAfterCollapse}」，应为「打开 AI 对话」`);
  out.ensureCallsAfterCollapse = await evalJs('window.__hits.length');
  if (out.ensureCallsAfterCollapse !== 1) problems.push('收起/展开又调了一次 ensureSession（应回到同一会话，不新建）');

  /* ④ 再打开 → 同一个会话 */
  await evalJs("document.querySelector('header button').click()");
  await sleep(250);
  out.paneReopened = await paneDisplay();
  if (out.paneReopened !== 'flex') problems.push('再打开 AI 对话失败');

  /* ⑤ 宽度可调：键盘 Home/End 到 45/25，aria-valuenow 同步 */
  const splitter = "document.querySelector('[role=separator]')";
  out.splitterExists = await evalJs(`Boolean(${splitter})`);
  if (!out.splitterExists) problems.push('找不到 splitter（role=separator）');
  await evalJs(`(() => { const s = ${splitter}; s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })); })()`);
  await sleep(200);
  out.widthAtHome = await evalJs(`${splitter}.getAttribute('aria-valuenow')`);
  await evalJs(`(() => { const s = ${splitter}; s.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })); })()`);
  await sleep(200);
  out.widthAtEnd = await evalJs(`${splitter}.getAttribute('aria-valuenow')`);
  if (out.widthAtHome !== '45') problems.push(`Home 后 aria-valuenow=${out.widthAtHome}，应为 45`);
  if (out.widthAtEnd !== '25') problems.push(`End 后 aria-valuenow=${out.widthAtEnd}，应为 25`);

  /* ⑥ 全轮 0 JS 报错、0 失败请求 */
  out.jsErrors = cdp.errors.slice();
  out.badResponses = cdp.badResponses.slice();
  if (out.jsErrors.length) problems.push(`JS 报错：${out.jsErrors.join(' | ')}`);
  if (out.badResponses.length) problems.push(`失败请求：${out.badResponses.join(' | ')}`);
} catch (error) {
  problems.push(`探针异常：${error?.message ?? error}`);
} finally {
  await stopChrome(chrome);
  server.close();
}

console.log(JSON.stringify({ ok: problems.length === 0, problems, ...out }, null, 2));
process.exit(problems.length === 0 ? 0 : 1);
