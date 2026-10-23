/**
 * 包入口：DSH 插件的服务端侧（M5）。
 *
 * 宿主要的四样（workbench-standard §3.4）：name / inject / apply 在 dsh/workbench.js
 * （零依赖、可单测）；Config 在本文件——官方要求它必须是 Schemastery schema，那是
 * 宿主提供的 peer 依赖，本仓库装不上，只把这一行留在入口。
 *
 * 独立启动走 `npm start -- --workspace 目录`（scripts/dev-server.mjs），同一份
 * createWorkbenchServer()，basePath 为空串。
 */
import Schema from '@deepseek-ai/schemastery';
import { version, displayVersion, channel, channelLabel, build, commit } from '../lib/version.js';

export { createWorkbenchServer, stripBasePath } from './server.js';
export {
  PLUGIN_ID, API_PREFIX, HOST_BASE, UI_ENTRY, DB_FILE, name, inject, apply, createHostHandler, mountedServer,
} from './workbench.js';
export { migrate, openDb, closeDb, createStore, todayISO } from './store.js';
export { buildBootstrap } from './readmodels.js';
export { seedDemo, seedIfEmpty } from './demo.js';
export { SettingsError } from './settings.js';
export { MineruError, MineruClient, MINERU_MODEL_DEFAULT, MINERU_MODEL_FALLBACK } from './mineru.js';
export { ParseError } from './parse.js';

/** Config 必须是 Schemastery schema，普通对象会被宿主拒绝。root 由 cordis.patch.yml 给。 */
export const Config = Schema.object({
  root: Schema.string().required(),
});

/** 挂载能力已实现；是否真的装在某台 Desktop 上，只有装机后才知道（M6 之前不写“装机通过”）。 */
export const HOST_ADAPTER_READY = true;

export const STATUS = Object.freeze({
  version,
  displayVersion,
  channel,
  channelLabel,
  build,
  commit,
  pluginId: 'glioblastoma-workbench-main',
  apiPrefix: 'glioblastoma',
  dbFile: 'xyb-glioblastoma.sqlite',
  hostAdapter: 'implemented',
  installed: false,
  standalone: 'npm start',
  note: '宿主接入层已完成；装机验证（M6）需要装到 DSH Desktop 并重启 Harness 后才能确认。',
});
