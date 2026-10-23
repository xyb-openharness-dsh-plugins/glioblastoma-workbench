#!/usr/bin/env node
/**
 * 本机启动（开发用）。npm start [-- --workspace <目录>] [-- --port 8791] [-- --no-seed]
 *   STARPAL_DB 指定业务库路径，默认 ./workspace/xyb-glioblastoma.sqlite（DB_FILE 名见 dsh/index.js）。
 * 只监听 127.0.0.1；空库自动播种演示档案（幂等：已有档案整批跳过）。
 */
import { mkdirSync, mkdtempSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkbenchServer } from '../dsh/server.js';
import { APP_INFO } from '../lib/version.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const port = Number(process.env.PORT || (portIdx >= 0 ? args[portIdx + 1] : 8791));

/* --workspace <目录>：用户选的资料目录（原件/导出落这里）；缺省开一个干净的临时演示目录 */
const wsIdx = args.indexOf('--workspace');
let workspaceDir = null;
if (wsIdx >= 0 && args[wsIdx + 1]) {
  workspaceDir = resolve(args[wsIdx + 1]);
  mkdirSync(workspaceDir, { recursive: true });
}

const dbPath = process.env.STARPAL_DB
  ? resolve(process.env.STARPAL_DB)
  : (workspaceDir ? join(workspaceDir, 'xyb-glioblastoma.sqlite') : resolve(root, 'workspace/xyb-glioblastoma.sqlite'));
mkdirSync(dirname(dbPath), { recursive: true });

/* 无 --workspace 时给一个干净临时目录放原件（重复跑不污染数据；不用 os.tmpdir） */
if (!workspaceDir) {
  workspaceDir = mkdtempSync(join(homedir(), '.xyb-gbm-dev-'));
}

const app = createWorkbenchServer({
  dbPath,
  seed: !args.includes('--no-seed'),
  onWorkspace: null,
});
app.store.setWorkspace({ root: workspaceDir });

const server = await app.listen(port);

const close = () => {
  server.close();
  app.close();
  process.exit(0);
};
process.on('SIGINT', close);
process.on('SIGTERM', close);

console.log(`小星宝 StarPal 本机工作台（${APP_INFO.displayVersion} ${APP_INFO.channelLabel}）：http://127.0.0.1:${port}/`);
console.log(`  业务库 ${dbPath}`);
console.log(`  资料目录 ${workspaceDir}（导入原件落此处 imports/）`);
console.log('  Ctrl+C 停止');
