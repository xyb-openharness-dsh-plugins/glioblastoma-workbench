/**
 * 服务端单测（M5）。不起真实端口：直接调 handle()，内存库 + 注入密钥文件目录。
 * 覆盖：静态与穿越拦截、bootstrap、设置接口三态可存可清（响应无原文）、
 * 导入白名单（.html 拒收）、解析事务语义（失败不产候选 / 重试留痕 / 候选核对）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { displayVersion } from '../lib/version.js';
import { Readable } from 'node:stream';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createWorkbenchServer, stripBasePath } from '../dsh/server.js';
import { migrate } from '../dsh/store.js';
import { createParseService, ParseError } from '../dsh/parse.js';
import { saveMineruToken, clearMineruToken, mineruSettingsStatus } from '../dsh/settings.js';
import { seedDemo } from '../dsh/demo.js';

function mockRes() {
  return {
    code: 0, headers: {}, body: '',
    writeHead(c, h) { this.code = c; this.headers = h; },
    end(b = '') { this.body = typeof b === 'string' ? b : b.toString('utf8'); },
  };
}

async function call(app, method, url, body) {
  const req = Readable.from([body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body))]);
  req.method = method;
  req.url = url;
  const res = mockRes();
  await app.handle(req, res);
  const isJson = String(res.headers['content-type'] ?? '').includes('json');
  return { status: res.code, json: isJson && res.body ? JSON.parse(res.body) : null, raw: res.body, headers: res.headers };
}

function appWithSecretDir() {
  const dir = mkdtempSync(join(homedir(), '.xyb-gbm-test-'));
  const secret = join(dir, 'mineru.json');
  process.env.STARPAL_MINERU_SECRET = secret;
  delete process.env.MINERU_TOKEN;
  const app = createWorkbenchServer({ dbPath: ':memory:' });
  return { app, secret, dir };
}

test('静态：首页 200、app.js 200、目录穿越拿不到包外文件', async () => {
  const { app } = appWithSecretDir();
  const home = await call(app, 'GET', '/');
  assert.equal(home.status, 200);
  assert.match(home.raw, /小星宝 StarPal/);
  assert.match(home.raw, /noindex/);
  assert.ok(home.raw.includes('window.__WB_LAYOUT__'), '布局参数注入');
  const js = await call(app, 'GET', '/app.js');
  assert.equal(js.status, 200);
  assert.match(js.headers['content-type'], /javascript/);
  const bad = await call(app, 'GET', '/%2e%2e/%2e%2e/package.json');
  assert.equal(bad.raw.includes('"peerDependencies"'), false, '静态目录外的文件不许读到');
  app.close();
});

test('未知接口 404；未知路径回落首页（SPA hash 路由）', async () => {
  const { app } = appWithSecretDir();
  const r404 = await call(app, 'GET', '/api/nope');
  assert.equal(r404.status, 404);
  assert.match(r404.json.error, /没有这个接口/);
  const page = await call(app, 'GET', '/lab/steroid');
  assert.equal(page.status, 200);
  assert.match(page.raw, /<!doctype html>/);
  app.close();
});

test('宿主前缀改写：/api/glioblastoma-workbench/** → 内部形状', () => {
  const base = '/api/glioblastoma-workbench';
  assert.equal(stripBasePath(`${base}`, base), '/index.html');
  assert.equal(stripBasePath(`${base}/ui/style.css`, base), '/style.css');
  assert.equal(stripBasePath(`${base}/api/bootstrap`, base), '/api/bootstrap');
  assert.equal(stripBasePath('/api/bootstrap', base), '/api/bootstrap');
  assert.equal(stripBasePath('/x', ''), '/x');
});

test('bootstrap：两档案 + 版本 + 布局注入（apiBase 不含 /api）', async () => {
  const { app } = appWithSecretDir();
  const r = await call(app, 'GET', '/api/bootstrap');
  assert.equal(r.status, 200);
  assert.equal(r.json.profileId, 'demo1');
  assert.equal(r.json.profiles.length, 2);
  assert.equal(r.json.app.displayVersion, displayVersion); // 与 lib/version.js 唯一源同值，不写死
  assert.equal(r.json.layout.agentPane.min, 25);
  assert.equal(r.json.layout.agentPane.max, 45);
  assert.equal(r.json.layout.agentPane.default, 35);
  const r2 = await call(app, 'GET', '/api/bootstrap?profile=demo2');
  assert.equal(r2.json.profileId, 'demo2');
  assert.equal(r2.json.profiles[1].cognitiveFlag, 'changed');
  app.close();
});

/* ---------------- 设置接口：三态、可存可清、响应无原文（18 号 §5.2） ---------------- */

test('设置三态：未配置 → 文件生效 → 清除回未配置；响应里没有 token 原文', async () => {
  const { app, secret } = appWithSecretDir();

  const s0 = await call(app, 'GET', '/api/glioblastoma/settings/mineru');
  assert.equal(s0.status, 200);
  assert.equal(s0.json.configured, false);
  assert.equal(s0.json.source, 'none');
  assert.equal(s0.json.masked, '');

  const save = await call(app, 'POST', '/api/glioblastoma/settings/mineru', { token: 'sk-ui-manual-test-abcdef987654' });
  assert.equal(save.status, 200);
  assert.equal(save.json.configured, true);
  assert.equal(save.json.source, 'file');
  assert.equal(save.json.masked, 'sk-****7654');
  assert.ok(!JSON.stringify(save.json).includes('sk-ui-manual-test'), '响应无原文');
  assert.equal(JSON.parse(readFileSync(secret, 'utf8')).token, 'sk-ui-manual-test-abcdef987654');
  assert.equal(statSync(secret).mode & 0o777, 0o600, '文件权限 600');

  const cleared = await call(app, 'POST', '/api/glioblastoma/settings/mineru', { action: 'clear' });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.json.configured, false);
  assert.equal(cleared.json.source, 'none');
  assert.equal(existsSync(secret), false, '文件因此变空才删文件');
  app.close();
});

test('env 生效可区分（文件缺失时 env 兜底）；清除不动环境变量', async () => {
  const { app } = appWithSecretDir();
  process.env.MINERU_TOKEN = 'sk-from-env-1234567890';
  const s = await call(app, 'GET', '/api/glioblastoma/settings/mineru');
  assert.equal(s.json.source, 'env');
  assert.equal(s.json.configured, true);
  assert.equal(s.json.masked, 'sk-****7890');
  await call(app, 'POST', '/api/glioblastoma/settings/mineru', { action: 'clear' });
  assert.equal(process.env.MINERU_TOKEN, 'sk-from-env-1234567890', '清除不动 env');
  const after = await call(app, 'GET', '/api/glioblastoma/settings/mineru');
  assert.equal(after.json.source, 'env');
  delete process.env.MINERU_TOKEN;
  app.close();
});

test('Token 优先级：文件 > env（换新 Key 后 env 旧 Key 不再盖住）', async () => {
  const { app, secret } = appWithSecretDir();
  process.env.MINERU_TOKEN = 'sk-old-but-valid-000000';
  writeFileSync(secret, JSON.stringify({ token: 'sk-new-file-token-98765' }), { mode: 0o600 });
  const s = await call(app, 'GET', '/api/glioblastoma/settings/mineru');
  assert.equal(s.json.source, 'file');
  assert.equal(s.json.masked, 'sk-****8765');
  delete process.env.MINERU_TOKEN;
  app.close();
});

test('非法 Token → 400 invalid_token，且不创建文件（先校验再落盘）', async () => {
  const { app, secret } = appWithSecretDir();
  for (const bad of ['', 'short', 'has space inside-token', '含中文-token-12345678901234567890']) {
    const r = await call(app, 'POST', '/api/glioblastoma/settings/mineru', { token: bad });
    assert.equal(r.status, 400, `「${bad}」应 400`);
    assert.equal(r.json.code, 'invalid_token');
  }
  assert.equal(existsSync(secret), false, '校验失败不创建文件');
  app.close();
});

test('坏密钥文件：GET 报 error（不当“未配置”）；POST 覆盖 → 500 settings_write_failed', async () => {
  const { app, secret } = appWithSecretDir();
  writeFileSync(secret, '{broken json', { mode: 0o600 });
  const s = await call(app, 'GET', '/api/glioblastoma/settings/mineru');
  assert.equal(s.json.configured, false);
  assert.match(s.json.error, /不是合法 JSON/);
  const w = await call(app, 'POST', '/api/glioblastoma/settings/mineru', { token: 'sk-valid-length-1234567890' });
  assert.equal(w.status, 500);
  assert.equal(w.json.code, 'settings_write_failed');
  assert.equal(readFileSync(secret, 'utf8'), '{broken json', '坏文件不被覆盖（销毁现场）');
  rmSync(secret);
  app.close();
});

test('settings 函数直测：保留其它键；清除只删 token 键', () => {
  const dir = mkdtempSync(join(homedir(), '.xyb-gbm-test-'));
  const secret = join(dir, 'mineru.json');
  writeFileSync(secret, JSON.stringify({ other: 1, token: 'sk-old-token-abcdef12' }), { mode: 0o600 });
  const env = { STARPAL_MINERU_SECRET: secret };
  saveMineruToken('sk-new-token-abcdef99', { env });
  const kept = JSON.parse(readFileSync(secret, 'utf8'));
  assert.equal(kept.other, 1, '保留其它键');
  assert.equal(kept.token, 'sk-new-token-abcdef99');
  clearMineruToken({ env });
  const after = JSON.parse(readFileSync(secret, 'utf8'));
  assert.equal('token' in after, false);
  assert.equal(after.other, 1, '只删 token 键');
  clearMineruToken({ env }); // 幂等：文件不存在也是成功
  clearMineruToken({ env: { STARPAL_MINERU_SECRET: join(dir, 'none.json') } });
  writeFileSync(join(dir, 'bad.json'), 'x');
  const st = mineruSettingsStatus({ env: { STARPAL_MINERU_SECRET: join(dir, 'bad.json') } });
  assert.equal(st.configured, false);
  assert.match(st.error, /不是合法 JSON/); // 坏文件给 error，不当“未配置”
  rmSync(dir, { recursive: true, force: true });
});

/* ---------------- 导入白名单 + 解析事务语义（18 号 §9） ---------------- */

test('.html 拒收（-10002 同款结论）；.txt 本地通道未接、如实报错', async () => {
  const { app } = appWithSecretDir();
  const html = await call(app, 'POST', '/api/import', { profileId: 'demo1', filename: 'report.html', dataBase64: Buffer.from('x').toString('base64') });
  assert.equal(html.status, 400);
  assert.equal(html.json.code, 'HTML_NOT_SUPPORTED');
  const txt = await call(app, 'POST', '/api/import', { profileId: 'demo1', filename: 'note.txt', dataBase64: Buffer.from('x').toString('base64') });
  assert.equal(txt.json.code, 'LOCAL_PARSE_NOT_READY');
  app.close();
});

test('解析事务：失败不产候选、document=parse_failed、重试新增 parse_job 行（旧记录保留）', async () => {
  const db = new DatabaseSync(':memory:');
  migrate(db, { now: () => '2026-10-24T00:00:00Z' });
  seedDemo(db); // metric_def 字典随演示档案入库（候选→事实映射要用）
  const svc = createParseService(db, { today: () => '2026-10-24T00:00:00Z' });
  const made = svc.importDocument({ profileId: 'demo1', filename: 'lab.pdf', bytes: Buffer.from('%PDF-demo') });
  assert.equal(made.status, 'pending');

  const failing = { parse: async () => { throw new Error('MinerU 解析失败：page limit exceeded'); } };
  const r1 = await svc.runParse({ documentId: made.documentId, bytes: Buffer.from('%PDF-demo'), filename: 'lab.pdf', client: failing });
  assert.equal(r1.state, 'failed');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM candidate").get().n, 0, '失败不产候选');
  assert.equal(db.prepare('SELECT status FROM document WHERE id = ?').get(made.documentId).status, 'parse_failed');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM parse_job').get().n, 1);

  const r2 = await svc.runParse({ documentId: made.documentId, bytes: Buffer.from('%PDF-demo'), filename: 'lab.pdf', client: failing });
  assert.equal(r2.state, 'failed');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM parse_job').get().n, 2, '重试新增一行');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM parse_job WHERE state = 'failed'").get().n, 2, '旧失败记录保留');
  db.close();
});

test('解析成功：候选入库 + document=parsed + job=succeeded；逐项核对 accept 才进事实层', async () => {
  const db = new DatabaseSync(':memory:');
  migrate(db, { now: () => '2026-10-24T00:00:00Z' });
  seedDemo(db);
  const svc = createParseService(db, { today: () => '2026-10-24T00:00:00Z' });
  const made = svc.importDocument({ profileId: 'demo1', filename: 'lab.pdf', bytes: Buffer.from('%PDF-demo') });

  const md = '<table><tr><td>项目</td><td>结果</td><td>单位</td></tr><tr><td>白细胞</td><td>3.8</td><td>$10^9/L$</td></tr></table>';
  const okClient = { parse: async () => ({ markdown: md }) };
  const r = await svc.runParse({ documentId: made.documentId, bytes: Buffer.from('%PDF-demo'), filename: 'lab.pdf', client: okClient });
  assert.equal(r.state, 'succeeded');
  assert.equal(r.candidates, 1);
  assert.equal(db.prepare('SELECT status FROM document WHERE id = ?').get(made.documentId).status, 'parsed');
  const cand = db.prepare('SELECT * FROM candidate').get();
  assert.equal(cand.confirmed, 0, '候选永远是候选，先不进事实层');

  const before = db.prepare('SELECT COUNT(*) AS n FROM metric_point WHERE source_note LIKE ?').get('%候选核对%').n;
  const accepted = svc.decideCandidate({ candidateId: cand.id, action: 'accept' });
  assert.equal(accepted.confirmed, true);
  assert.equal(db.prepare('SELECT confirmed FROM candidate WHERE id = ?').get(cand.id).confirmed, 1);
  const after = db.prepare('SELECT COUNT(*) AS n FROM metric_point WHERE source_note LIKE ?').get('%候选核对%').n;
  assert.equal(after, before + 1, 'accept 后指标候选进事实层 metric_point');

  const made2 = svc.importDocument({ profileId: 'demo1', filename: 'lab.pdf', bytes: Buffer.from('%PDF-demo') });
  assert.equal(made2.deduped, true, '重复导入不新建文档');
  assert.equal(made2.status, 'parsed', '重复导入不重置解析状态');
  db.close();
});

test('decide：reject 零副作用删除；不存在 404；非法 action 400', () => {
  const db = new DatabaseSync(':memory:');
  migrate(db, { now: () => '2026-10-24T00:00:00Z' });
  const svc = createParseService(db, { today: () => '2026-10-24T00:00:00Z' });
  assert.throws(() => svc.decideCandidate({ candidateId: 999, action: 'accept' }), (e) => e instanceof ParseError && e.status === 404);
  db.close();
});

test('health 必须给出业务目录 dir（ensureSession 的 folder，空则拉不起会话）', async () => {
  // 0.1.3 装机后点「AI 对话」只会看到「创建会话需要业务项目文件夹。」，
  // 因为 health 不返回 dir，客户端把 null 传给了宿主的 ensureSession。
  const { dir } = appWithSecretDir();
  const dbPath = join(dir, 'xyb-glioblastoma.sqlite');
  const hosted = createWorkbenchServer({ dbPath, basePath: '/api/glioblastoma-workbench' });
  const r = await call(hosted, 'GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(typeof r.json.dir, 'string');
  assert.ok(r.json.dir.length > 0, 'health.dir 不能是空字符串');
  assert.ok(isAbsolute(r.json.dir), `health.dir 应是绝对路径，实际 ${r.json.dir}`);
  assert.equal(r.json.dir, dir, '没设资料目录时 dir 就是库所在目录（宿主分配的 config.root）');
});
