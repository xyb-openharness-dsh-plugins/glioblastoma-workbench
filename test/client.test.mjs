/**
 * 客户端入口单测（M6 修复轮）。
 *
 * 背景：0.1.0/0.1.1 装进 Desktop 后，面板显示的是脚手架骨架（"接入骨架／服务已连接"），
 * 真实界面 `public/` 根本没被加载——因为 `lib/client.js` 一直是脚手架占位（43 行），
 * 而 `public/` 里的 app.js 只有在 iframe 指向 `${HOST_BASE}/ui/` 时才会被请求。
 *
 * 这里锁住三件事，防止再退回占位：
 * 1. `lib/client.js` 与 `src/client.js` 生成物一致（build:client --check 的库内副本）；
 * 2. iframe 指向 lib/routes.js 的 UI_ENTRY，且注入的是真实现 customFrame 三件套；
 * 3. register 带 layout（缺失时宿主按默认分栏排版，业务区被拉满）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_BASE, UI_ENTRY, HEALTH_PATH } from '../lib/routes.js';
import { PANEL, AGENT_PANE } from '../lib/layout.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const client = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

test('客户端不是脚手架占位：不再渲染"接入骨架"文案', () => {
  assert.ok(!client.includes('接入骨架'), 'lib/client.js 里还有脚手架骨架文案');
  assert.ok(!client.includes('business 功能待按 spec 实现'));
  assert.ok(client.split('\n').length > 300, `lib/client.js 只有 ${client.split('\n').length} 行，疑似占位未生成`);
});

test('客户端入口身份与包名一致', () => {
  assert.ok(client.includes(`id: '${pkg.name}'`), 'ModuleLoader id 应等于 package.json 的 name');
  assert.ok(client.includes('__ModuleLoader__.load'), '必须走宿主提供的 ModuleLoader，不能用原生 ESM');
});

test('iframe 指向 lib/routes.js 的 UI_ENTRY（业务界面唯一入口）', () => {
  assert.ok(client.includes(`const UI_ENTRY = '${UI_ENTRY}'`), 'UI_ENTRY 注入值应与 lib/routes.js 一致');
  assert.ok(client.includes('src: UI_ENTRY'), 'iframe 必须用 UI_ENTRY，不能另拼路径');
  assert.ok(UI_ENTRY.startsWith(HOST_BASE), 'UI_ENTRY 必须挂在宿主前缀下');
});

test('健康检查地址与宿主前缀同源', () => {
  assert.ok(client.includes(`const HEALTH_PATH = '${HEALTH_PATH}'`));
  assert.ok(HEALTH_PATH.startsWith(HOST_BASE));
});

test('register 带 customFrame 与 layout（缺 layout 宿主会按默认分栏排版）', () => {
  assert.ok(client.includes('customFrame: CUSTOM_FRAME'));
  assert.ok(client.includes('layout: { businessSide: BUSINESS_SIDE, businessWidth: BUSINESS_WIDTH }'));
  assert.equal(PANEL.customFrame, true);
  assert.equal(PANEL.businessWidth + AGENT_PANE.default / 100, 1);
});

test('会话面板三档注入成比例而不是百分点', () => {
  assert.ok(client.includes(`const AGENT_DEFAULT = Number('${AGENT_PANE.default / 100}')`));
  assert.ok(client.includes(`const AGENT_MIN = Number('${AGENT_PANE.min / 100}')`));
  assert.ok(client.includes(`const AGENT_MAX = Number('${AGENT_PANE.max / 100}')`));
  assert.ok(client.includes(`const AGENT_STEP = Number('${AGENT_PANE.ratioStep}')`));
});

test('收起只隐藏不卸载：原生会话用 display 控制', () => {
  assert.ok(client.includes("display: paneVisible ? 'flex' : 'none'"));
  assert.ok(client.includes("role: 'separator'"), 'splitter 必须可键盘调整');
});

test('根节点首个子元素是 header 并避让窗口按钮', () => {
  assert.ok(client.includes('var(--dsh-frame-leading-clearance, 12px)'));
  // 根节点 = h('div', { style: rootStyle }, <第一个子元素>)，第一个子元素必须是语义 <header>
  const at = client.indexOf('style: rootStyle },');
  assert.ok(at > 0, '找不到根节点写法');
  const firstChild = client.slice(at, at + 200).split('\n').map((line) => line.trim()).filter(Boolean)[1];
  assert.match(firstChild, /^h\('header',/, `根节点第一个子元素是 ${firstChild}，必须是 h('header')`);
});

test('页面 API_BASE 守卫接受宿主前缀（0.1.2 白屏回归）', () => {
  // 0.1.2 首版把 F3 写成 includes('/api') 就抛错，宿主前缀 /api/glioblastoma-workbench
  // 含 /api → app.js 整段不执行，界面全白。守卫只能约束结尾，不能约束包含。
  const app = readFileSync(join(ROOT, 'public', 'app.js'), 'utf8');
  assert.equal(app.includes("API_BASE.includes('/api')"), false, 'API_BASE 守卫不能再用 includes(\'/api\')');
  const guard = /if \(\/(.+?)\/\.test\(API_BASE\)\)/.exec(app);
  assert.ok(guard, '找不到 API_BASE 守卫正则');
  const reject = new RegExp(guard[1]);
  assert.equal(reject.test(''), false, '独立启动（空串）不该被拒');
  assert.equal(reject.test(HOST_BASE), false, `宿主前缀 ${HOST_BASE} 不该被拒`);
  assert.equal(reject.test('/api'), true, '/api 结尾应被拒');
  assert.equal(reject.test('/x/api'), true, '/x/api 结尾应被拒');
});

test('会话判据来自会话归属，不是宿主给的 conversation 容器（0.1.4 拉不起 pane 回归）', () => {
  // 宿主在 customFrame 下**总是**传一个 conversation 容器（本工作台 active 时 display:none），
  // 所以 Boolean(conversation) 恒为真。0.1.3 用它判断"已有会话"，按钮一上来就是
  // 「收起 AI 对话」，点击只切显隐，永远走不到 ensureSession → 原生 pane 永远拉不起来。
  assert.equal(client.includes('const hasConversation = Boolean(conversation)'), false,
    '不能用 Boolean(conversation) 判断是否已有会话');
  assert.ok(client.includes('const hasSession = Boolean(sessionId)'),
    '会话判据必须来自 desktopWorkbenches 的会话归属（ownedSession）');
  assert.ok(client.includes('const [sessionId, setSessionId] = React.useState(() => ownedSession())'),
    '初值必须问宿主当前会话归属');
});

test('没有会话时按钮是"建立会话"，不是切显隐', () => {
  const at = client.indexOf('function onAgentClick()');
  assert.ok(at > 0, '找不到 onAgentClick');
  const body = client.slice(at, at + 260);
  assert.match(body, /if \(!hasSession\) \{ void openAgent\(\); return \}/,
    'onAgentClick 必须在没有会话时调用 openAgent（ensureSession）');
});

test('原生会话挂载点始终在树上，只用 display 控制（卸载会丢输入框状态）', () => {
  assert.ok(client.includes("conversation ? h('div', { style: { display: hasSession ? 'contents' : 'none' } }, conversation) : null"),
    'conversation 必须无条件渲染，仅切换 display');
});

test('openAgent 走 defaultWorkspace + newSession；缺目录时交给宿主提示选目录', () => {
  assert.ok(client.includes('defaultWorkspace?.()?.workspaceId'), '必须优先取默认工作区');
  assert.ok(client.includes('newSession(workspaceId)'), '创建必须走 newSession(workspaceId)');
  assert.ok(!client.includes('ensureSession({'), '禁止 ensureSession({}) 兜底');
  assert.ok(client.includes('再次点击「AI 对话」重试'), '取消/失败都要给可执行的重试提示');
});

test('宽度边界原样落地（0.25 不在 0.02 网格上，先对齐再钳位会得到 0.26）', () => {
  // 0.1.4 探针实测：End 键本该到 25%，实际落在 26%，与 aria-valuenow 宣称值不符。
  assert.ok(client.includes('if (n <= AGENT_MIN) return AGENT_MIN'), 'snapWidth 必须先判下边界');
  assert.ok(client.includes('if (n >= AGENT_MAX) return AGENT_MAX'), 'snapWidth 必须先判上边界');
  assert.equal(AGENT_PANE.min % 2, 1, '前提：最小值不在 2% 步进网格上（0.25 / 0.02 = 12.5）');
});
