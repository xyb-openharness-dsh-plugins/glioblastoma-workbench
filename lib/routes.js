/**
 * 宿主路由常量（唯一来源，M6 修复轮新增）。
 *
 * 为什么单独一个文件：`scripts/build-client.mjs` 生成客户端时也要取这几个值，
 * 但它不能 import `dsh/workbench.js`——那里会牵进 `dsh/server.js`（用到 node:sqlite），
 * 构建期不需要数据库。抽到只依赖字面量的文件后，构建、宿主挂载、页面注入三处同源。
 *
 * 改这里就同时改了：宿主前缀路由、iframe src、页面 data-api-base、客户端 health 地址。
 */

/** 宿主挂载前缀：宿主按这个前缀把请求整段转给本工作台 */
export const HOST_BASE = '/api/glioblastoma-workbench';

/** 主题段名（库文件名、设置接口路径、健康检查路由共用） */
export const API_PREFIX_NAME = 'glioblastoma';

/** 面板 iframe src */
export const UI_ENTRY = `${HOST_BASE}/ui/`;

/** 健康检查（宿主前缀之后再由 server 路由到 /api/health） */
export const HEALTH_PATH = `${HOST_BASE}/api/health`;
