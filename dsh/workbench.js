/**
 * 宿主接入层（M5）。workbench ≈ lymphoma host 层：零依赖、可单测。
 *
 * 三件事：① 宿主 webServer 前缀请求交给同一个 handler（路径改写在 server.js）；
 * ② 先过 connection.requestRejection，没通过不碰业务；③ 业务库放宿主分配目录。
 * `Config` 留在 dsh/index.js（Schemastery 是宿主 peer 依赖，本文件不引，保持可测）。
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkbenchServer } from './server.js';

/** 插件条目 id：与 cordis.patch.yml 的 insert[].id 同值 */
export const PLUGIN_ID = 'glioblastoma-workbench-main';
/** 主题前缀（设置接口路径 /api/<API_PREFIX>/settings/mineru 与库文件名共用它） */
export const API_PREFIX = 'glioblastoma';
/** 宿主挂载前缀：宿主按这个前缀把请求整段转给本工作台 */
export const HOST_BASE = `/api/${API_PREFIX}-workbench`;
/** 面板 iframe src */
export const UI_ENTRY = `${HOST_BASE}/ui/`;
/** 业务库文件名（DB_FILE） */
export const DB_FILE = 'xyb-glioblastoma.sqlite';

/** 宿主没给配置目录时（只可能发生在测试里）退回包内位置，不在用户目录乱建 */
const FALLBACK_DB = fileURLToPath(new URL('../workspace/xyb-glioblastoma.sqlite', import.meta.url));

export const name = PLUGIN_ID;
export const inject = ['webServer', 'connection'];

function sendJson(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** 造宿主 handler：requestRejection 返回 undefined 放行、数字拒；没有该方法一律 403。 */
export function createHostHandler(server, ctx = null) {
  return async function hostHandler(req, res) {
    const rejection = ctx?.connection?.requestRejection?.(req);
    if (!ctx?.connection?.requestRejection || rejection !== undefined) {
      sendJson(res, rejection || 403, { error: '需要通过 DSH 本机授权会话访问这个工作台' });
      return;
    }
    await server.handle(req, res);
  };
}

/** 最近一次挂载的 server（测试与诊断用；cordis 的 apply 不能用返回值传实例）。 */
let MOUNTED = null;
export function mountedServer() {
  return MOUNTED;
}

/**
 * 宿主调用。注册 prefix 路由。**非 async、无返回值**（cordis 对 apply 返回值严格检查）。
 * @param {object} ctx 至少要有 webServer、connection、effect
 * @param {{ root?: string }} [config] root 是宿主分配给本工作台的目录
 */
export function apply(ctx, config = {}) {
  const root = typeof config?.root === 'string' && config.root ? config.root : null;
  if (root) mkdirSync(root, { recursive: true });
  const dbPath = root ? join(root, DB_FILE) : FALLBACK_DB;

  const server = createWorkbenchServer({
    dbPath,
    basePath: HOST_BASE,
    apiBase: HOST_BASE,
    runtime: 'host',
  });
  MOUNTED = server;

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'prefix',
      path: HOST_BASE,
      handler: createHostHandler(server, ctx),
    }),
    `${PLUGIN_ID}: api`,
  );
}
