/**
 * MinerU 设置层（18 号 v2 §5.3）：Token 读写 + 状态的**唯一实现**。
 *
 * 三个使用者（解析客户端、设置路由、页面状态）都走这一份，杜绝“界面说已保存、
 * 解析读不到”的分叉。规则：
 * - 优先级：显式传参 > 密钥文件 > 环境变量（v2 纠正项：文件在前、env 只兜底）；
 * - 唯一密钥文件 mineru.json（没有 YAML 分支）；判断顺序：显式 env 指定文件 >
 *   仓库内 .secrets/mineru.json（仅当已存在）> 用户目录；
 * - 读：ENOENT 返回空串；文件存在但不是合法 JSON **抛错**，不当“没配”（否则用户
 *   以为保存失败，实际是文件被写坏）；
 * - 写：先校验再落盘（校验失败不创建文件）→ 同目录 tmp → chmod 600 → rename（原子），
 *   目录 700，保留其它键，坏文件不覆盖（不静默重建）；
 * - 清除：只删 token 键；文件因此变空才删文件；本来不存在是幂等成功；不动环境变量。
 * - Token 原文永不回给界面 / 不进日志 / 不进错误消息（只给掩码与来源）。
 */
import {
  chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

/** Token 申请/重置地址：前后端的约定标记（错误消息里带它 = Token 故障提醒） */
export const MINERU_TOKEN_URL = 'https://mineru.net/apiManage/token';

/** 显式指定密钥文件的环境变量（测试/排障用，让用例互不干扰） */
export const MINERU_SECRET_ENV = 'STARPAL_MINERU_SECRET';
/** 环境变量 Token（优先级最低，只在文件缺失时兜底） */
export const MINERU_TOKEN_ENV = 'MINERU_TOKEN';

const REPO_SECRET = fileURLToPath(new URL('../.secrets/mineru.json', import.meta.url));

/** 用户目录落点：包目录会随插件升级整份替换，写在包里的 Token 会静默消失 */
export function userSecretFile() {
  return join(homedir(), '.starpal', 'secrets', 'mineru.json');
}

/** 当前生效的密钥文件：显式 env 指定 > 已存在的包内文件 > 用户目录 */
export function secretFile(env = process.env) {
  const explicit = env[MINERU_SECRET_ENV];
  if (explicit && explicit.trim()) return explicit.trim();
  if (existsSync(REPO_SECRET)) return REPO_SECRET;
  return userSecretFile();
}

export class SettingsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SettingsError';
    this.code = code;
  }
}

/** 掩码：前 3 位 + **** + 后 4 位；短 Token 只给星号。不可反推。 */
export function maskToken(token) {
  const s = String(token ?? '').trim();
  if (!s) return '';
  if (s.length <= 8) return '****';
  return `${s.slice(0, 3)}****${s.slice(-4)}`;
}

/**
 * 读 Token。ENOENT → 空串；非法 JSON → 抛 SettingsError('BAD_SECRET_FILE')。
 * @returns {{token: string, source: 'file'|'env'|'none', file?: string, masked: string}}
 */
export function readMineruToken({ env = process.env } = {}) {
  const file = secretFile(env);
  if (existsSync(file)) {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      throw new SettingsError(
        'BAD_SECRET_FILE',
        `无法读取密钥文件：${file} 不是合法 JSON（应为 {"token": "sk-..."}）；请修正或删除该文件后重试。`,
      );
    }
    const t = typeof parsed?.token === 'string' ? parsed.token.trim() : '';
    if (t) return { token: t, source: 'file', file, masked: maskToken(t) };
  }
  const fromEnv = env[MINERU_TOKEN_ENV];
  if (fromEnv && fromEnv.trim()) {
    const t = fromEnv.trim();
    return { token: t, source: 'env', file, masked: maskToken(t) };
  }
  return { token: '', source: 'none', file, masked: '' };
}

/** 校验：空 / 太短(<8) / 太长(>1024) / 含空白 / 非 [A-Za-z0-9._-]。不猜上游规则。 */
export function validateMineruToken(token) {
  const t = String(token ?? '');
  if (!t) throw new SettingsError('invalid_token', 'Token 不能为空');
  if (t.length < 8) throw new SettingsError('invalid_token', 'Token 太短（少于 8 位）');
  if (t.length > 1024) throw new SettingsError('invalid_token', 'Token 太长（超过 1024 位）');
  if (/\s/.test(t)) throw new SettingsError('invalid_token', 'Token 里不能有空格或换行（复制时可能带上了别的内容）');
  if (!/^[A-Za-z0-9._-]+$/.test(t)) throw new SettingsError('invalid_token', 'Token 只能包含字母、数字、点、下划线和连字符');
  return t;
}

/** 同目录原子写：tmp → chmod 600 → rename（跨文件系统 rename 不是原子操作，所以必须同目录） */
function atomicWrite(file, text) {
  const dir = dirname(file);
  mkdirSync(dir, { recursive: true });
  try {
    chmodSync(dir, 0o700);
  } catch { /* 目录已存在且权限不允许改时不硬失败（Windows 等平台无意义） */ }
  const tmp = join(dir, `.mineru.${process.pid}.${Date.now()}.tmp`);
  writeFileSync(tmp, text, { mode: 0o600 });
  chmodSync(tmp, 0o600);
  renameSync(tmp, file);
}

/** 保存：校验 → 读旧保留其它键 → 原子写 600 → 返回状态。坏文件不覆盖（抛错给路径）。 */
export function saveMineruToken(token, { env = process.env } = {}) {
  const t = validateMineruToken(token);
  const file = secretFile(env);
  let keep = {};
  if (existsSync(file)) {
    try {
      keep = JSON.parse(readFileSync(file, 'utf8'));
      if (!keep || typeof keep !== 'object' || Array.isArray(keep)) keep = {};
    } catch (e) {
      throw new SettingsError(
        'settings_write_failed',
        `密钥文件已损坏（${file} 不是合法 JSON），为避免销毁现场未覆盖；请修正或删除该文件后重试。`,
      );
    }
  }
  atomicWrite(file, `${JSON.stringify({ ...keep, token: t }, null, 2)}\n`);
  return mineruSettingsStatus({ env });
}

/** 清除：只删 token 键；文件因此变空才删文件；不存在时幂等成功；不动环境变量。 */
export function clearMineruToken({ env = process.env } = {}) {
  const file = secretFile(env);
  if (existsSync(file)) {
    let keep = {};
    try {
      keep = JSON.parse(readFileSync(file, 'utf8'));
      if (!keep || typeof keep !== 'object' || Array.isArray(keep)) keep = {};
    } catch (e) {
      throw new SettingsError(
        'settings_write_failed',
        `密钥文件已损坏（${file} 不是合法 JSON），为避免销毁现场未清除；请修正或删除该文件后重试。`,
      );
    }
    delete keep.token;
    if (Object.keys(keep).length === 0) {
      rmSync(file);
    } else {
      atomicWrite(file, `${JSON.stringify(keep, null, 2)}\n`);
    }
  }
  return mineruSettingsStatus({ env });
}

/** 状态（GET /api/glioblastoma/settings/mineru 的返回体）：掩码 + 路径 + 来源，**无原文**。 */
export function mineruSettingsStatus({ env = process.env } = {}) {
  const file = secretFile(env);
  const home = homedir();
  const shown = file.startsWith(home) ? file.replace(home, '~') : file;
  try {
    const r = readMineruToken({ env });
    const permissions = r.source === 'file' && existsSync(file)
      ? `0${(statSync(file).mode & 0o777).toString(8)}`
      : undefined;
    return {
      configured: r.token !== '',
      source: r.source, // 'file' | 'env' | 'none'
      sourceLabel: r.source === 'file'
        ? `已保存于 ${shown}`
        : r.source === 'env'
          ? `临时使用环境变量 ${MINERU_TOKEN_ENV}（未写入文件）`
          : `尚未配置 Token：扫描件与照片的自动识别会用不了；TXT / MD / CSV 仍在本机解析。`,
      masked: r.masked,
      file: shown,
      fileExists: existsSync(file),
      tokenUrl: MINERU_TOKEN_URL,
      permissions,
      error: undefined,
    };
  } catch (e) {
    /* 坏文件：给 error 说明，不当“未配置” */
    return {
      configured: false,
      source: 'none',
      sourceLabel: '无法读取密钥文件',
      masked: '',
      file: shown,
      fileExists: existsSync(file),
      tokenUrl: MINERU_TOKEN_URL,
      permissions: undefined,
      error: e.message,
    };
  }
}
