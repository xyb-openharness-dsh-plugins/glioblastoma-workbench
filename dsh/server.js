/**
 * 本机服务（M5）。零依赖 http：静态托管 public/ + /api/* 读写本机库。
 *
 * 只监听 127.0.0.1；不做鉴权/外网/多用户/云同步。
 * 路由形状：独立启动走 `/api/...`；宿主前缀（/api/glioblastoma-workbench）由
 * stripBasePath 剥掉后保持内部形状不变。apiBase 注入页面时**不含 /api**（F3）。
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, openDb, todayISO } from './store.js';
import { buildBootstrap } from './readmodels.js';
import { seedIfEmpty } from './demo.js';
import { createParseService, ParseError } from './parse.js';
import {
  clearMineruToken, mineruSettingsStatus, saveMineruToken, SettingsError,
} from './settings.js';
import { APP_INFO } from '../lib/version.js';
import { clientLayout } from '../lib/layout.js';

export const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
export const DEFAULT_DB = fileURLToPath(new URL('../workspace/xyb-glioblastoma.sqlite', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * 宿主前缀下的路径 → 本服务认识的路径（宿主把 /api/glioblastoma-workbench/** 整段转来）：
 * `<base>` / `<base>/` → /index.html；`<base>/ui/xxx` → /xxx；`<base>/api/xxx` → /api/xxx。
 * 独立启动 base 为空串，原样返回。
 */
export function stripBasePath(pathname, base = '') {
  const path = String(pathname ?? '/');
  if (!base || !path.startsWith(base)) return path;
  const rest = path.slice(base.length);
  if (!rest || rest === '/') return '/index.html';
  if (rest === '/ui') return '/index.html';
  if (rest.startsWith('/ui/')) return rest.slice(3);
  return rest;
}

export function createWorkbenchServer({
  dbPath = DEFAULT_DB,
  publicDir = PUBLIC_DIR,
  seed = true,
  today = () => todayISO(),
  now = () => new Date().toISOString(),
  /** 宿主给的前缀；独立启动为空串 */
  basePath = '',
  /** 注入页面的接口基址，**不含 /api** */
  apiBase = '',
  /** standalone | host，只影响页面运行形态提示 */
  runtime = 'standalone',
  onWorkspace = null,
} = {}) {
  const pageApiBase = apiBase || basePath; // 页面拼 `${API_BASE}/api/xxx`，基址里不能再含 /api
  const pageRuntime = runtime === 'host' ? 'host' : 'standalone';
  const notifyWorkspace = typeof onWorkspace === 'function' ? onWorkspace : null;

  let db = openDb(dbPath, { now });
  if (seed) seedIfEmpty(db);
  let store = createStore(db, { today });
  const parses = createParseService(db, { today });
  const root = resolve(publicDir);
  const dbDir = dirname(resolve(dbPath));

  /* 原件存放：资料目录 <root>/imports 优先；没选目录落库目录旁，不猜别的位置 */
  const importsDir = () => {
    const base = store.workspace().root ? join(store.workspace().root, 'imports') : join(dbDir, 'imports');
    mkdirSync(base, { recursive: true });
    return base;
  };

  async function readBody(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (!chunks.length) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw Object.assign(new Error('请求体不是合法 JSON'), { status: 400 });
    }
  }

  const json = (res, code, data) => {
    const body = JSON.stringify(data);
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
    res.end(body);
  };

  const routes = {
    /* ---------------- 读 ---------------- */
    'GET /api/health': () => ({
      ok: true,
      version: APP_INFO.version,
      displayVersion: APP_INFO.displayVersion,
      apiVersion: 'v1',
      capabilities: ['health', 'bootstrap', 'mineru-parse', 'mineru-settings'],
    }),

    'GET /api/bootstrap': ({ url }) => {
      const pid = url.searchParams.get('profile') || undefined;
      const boot = buildBootstrap(db, { today });
      const want = pid && boot.profiles.some((p) => p.id === pid) ? pid : boot.profiles[0]?.id;
      return {
        profileId: want,
        ...boot,
        app: { ...APP_INFO },
        layout: clientLayout(),
        runtime: pageRuntime,
        workspace: store.workspace(),
      };
    },

    /* ---------------- 文档解析设置（18 号 v2 §5.2：GET 三态 + POST 存/清；响应无原文） ---------------- */
    'GET /api/glioblastoma/settings/mineru': () => mineruSettingsStatus(),
    'POST /api/glioblastoma/settings/mineru': ({ body }) => {
      if (body && body.action === 'clear') return clearMineruToken();
      const token = String(body?.token ?? '');
      return saveMineruToken(token);
    },

    /* ---------------- 导入与解析（18 号 v2 §9 事务语义） ---------------- */
    'GET /api/imports': ({ url }) => parses.listDocuments(url.searchParams.get('profile')),
    'POST /api/import': ({ body }) => {
      const buf = Buffer.from(String(body?.dataBase64 ?? ''), 'base64');
      const made = parses.importDocument({
        profileId: body.profileId, filename: body.filename, bytes: buf, mime: body.mime ?? null,
      });
      if (!made.deduped) {
        const dir = importsDir();
        const rel = `${String(body.filename ?? '原件').slice(0, 64)}.${made.documentId}`;
        writeFileSync(join(dir, rel), buf);
      }
      return made;
    },
    'POST /api/parse': async ({ body }) => {
      const doc = store.db.prepare('SELECT id, file_name FROM document WHERE id = ?').get(body.documentId);
      if (!doc) throw Object.assign(new ParseError('NO_DOCUMENT', `原件不存在：${body.documentId}`, 404));
      const dir = importsDir();
      let bytes = null;
      const abs = resolve(dir, `${doc.file_name.slice(0, 64)}.${doc.id}`);
      if (abs.startsWith(dir + sep) && existsSync(abs)) bytes = readFileSync(abs);
      return parses.runParse({ documentId: body.documentId, bytes, filename: doc.file_name });
    },
    'POST /api/candidates/decide': ({ body }) => parses.decideCandidate({
      candidateId: body.candidateId, action: body.action,
    }),
  };

  /** 页面占位替换：接口基址 / 运行形态 / 布局参数（面板宽度档唯一来源 lib/layout.js）。 */
  function renderPage(html) {
    return html
      .split('{{WB_API_BASE}}').join(pageApiBase)
      .split('{{WB_RUNTIME}}').join(pageRuntime)
      .split('{{WB_LAYOUT}}').join(JSON.stringify(clientLayout()));
  }

  async function handle(req, res) {
    const raw = new URL(req.url ?? '/', 'http://127.0.0.1');
    const url = basePath
      ? new URL(`${stripBasePath(raw.pathname, basePath)}${raw.search}`, 'http://127.0.0.1')
      : raw;

    if (url.pathname.startsWith('/api/')) {
      const key = `${req.method} ${url.pathname}`;
      const route = routes[key];
      if (!route) return json(res, 404, { error: `没有这个接口：${key}` });
      try {
        const body = req.method === 'POST' ? await readBody(req) : {};
        const data = await route({ url, body, req });
        return json(res, 200, data ?? { ok: true });
      } catch (e) {
        if (e instanceof SettingsError) {
          return json(res, e.code === 'settings_write_failed' ? 500 : 400, { error: e.message, code: e.code });
        }
        if (e instanceof ParseError) {
          return json(res, e.status, { error: e.message, code: e.code });
        }
        return json(res, e.status ?? 400, { error: e.message });
      }
    }

    /* 静态文件：只允许 publicDir 内，防目录穿越 */
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    const file = resolve(root, rel === '' ? 'index.html' : rel);
    if (file !== root && !file.startsWith(root + sep)) return json(res, 403, { error: '越出静态目录' });
    try {
      const st = await stat(file);
      const target = st.isDirectory() ? join(file, 'index.html') : file;
      const type = MIME[extname(target)] ?? 'application/octet-stream';
      let buf = await readFile(target);
      if (type.startsWith('text/html')) buf = Buffer.from(renderPage(buf.toString('utf8')), 'utf8');
      res.writeHead(200, { 'content-type': type, 'content-length': buf.length, 'cache-control': 'no-cache' });
      return res.end(buf);
    } catch {
      /* SPA：未知路径回首页由前端按 hash 渲染 */
      try {
        let buf = await readFile(join(root, 'index.html'));
        buf = Buffer.from(renderPage(buf.toString('utf8')), 'utf8');
        res.writeHead(200, { 'content-type': MIME['.html'], 'content-length': buf.length });
        return res.end(buf);
      } catch {
        return json(res, 404, { error: '找不到页面文件（public/index.html）' });
      }
    }
  }

  return {
    handle,
    basePath,
    apiBase: pageApiBase,
    runtime: pageRuntime,
    db,
    store,
    close() {
      db.close();
    },
    listen(port = 8791, host = '127.0.0.1') {
      const server = createServer(handle);
      return new Promise((ok) => server.listen(port, host, () => ok(server)));
    },
  };
}
