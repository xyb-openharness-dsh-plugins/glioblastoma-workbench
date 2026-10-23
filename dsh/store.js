/**
 * 业务库 store（M5）。三件事：开库 / 迁移（执行 schema/00*.sql）/ 关库。
 *
 * 迁移执行器语义与家族一致（lymphoma dsh/migrate.js 平移）：
 * 按文件名顺序执行、记录 schema_version、已执行文件 sha256 被改动即报错（冻结保护）。
 *
 * 写入语义（家族契约）：只增不覆盖；缺测写 NULL（读模型按 === null 分支，D3）；
 * 列名 in_use（D4）；INSERT 一律显式列名 + 显式问号数（D9）。
 *
 * 不做：预后评分、推荐、判读——这些列在库里不存在（freeze-contract 四契约①）。
 */
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_DIR = fileURLToPath(new URL('../schema/', import.meta.url));
const FILE_RE = /^(\d{4})_([a-z0-9_]+)\.sql$/;

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function todayISO(now = new Date()) {
  const d = new Date(now);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 按编号排序的迁移文件列表。不认识的文件名不猜，直接报错。 */
export function migrationFiles(dir = SCHEMA_DIR) {
  const sqlFiles = readdirSync(dir).filter((f) => f.endsWith('.sql'));
  const unknown = sqlFiles.filter((f) => !FILE_RE.test(f));
  if (unknown.length) {
    throw new Error(`schema/ 里有不符合 NNNN_name.sql 的文件：${unknown.join(', ')}`);
  }
  return sqlFiles.sort((a, b) => Number(a.slice(0, 4)) - Number(b.slice(0, 4)));
}

/**
 * 执行未应用的迁移；已应用的跳过（幂等），但校验其内容没被改过（冻结保护）。
 * @param {import('node:sqlite').DatabaseSync} db
 */
export function migrate(db, { dir = SCHEMA_DIR, now = () => new Date().toISOString() } = {}) {
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version    INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    checksum   TEXT NOT NULL
  )`);

  const applied = new Map(
    db.prepare('SELECT version, name, checksum FROM schema_version').all().map((r) => [r.version, r]),
  );

  const executed = [];
  for (const file of migrationFiles(dir)) {
    const version = Number(file.slice(0, 4));
    const sql = readFileSync(join(dir, file), 'utf8');
    const checksum = sha256(sql);

    const done = applied.get(version);
    if (done) {
      if (done.checksum !== checksum) {
        throw new Error(`${file} 冻结后被改动（${done.checksum} → ${checksum}），请新增 NNNN_*.sql 而不是改历史迁移`);
      }
      continue;
    }

    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_version (version, name, applied_at, checksum) VALUES (?, ?, ?, ?)')
        .run(version, file, now(), checksum);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw new Error(`${file} 执行失败：${error.message}`);
    }
    executed.push(file);
  }

  return { executed, applied: db.prepare('SELECT version, name FROM schema_version ORDER BY version').all() };
}

/** 开库（执行迁移）+ 基础工作区状态。 */
export function openDb(path, { runMigrate = true, now = () => new Date().toISOString() } = {}) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  if (runMigrate) migrate(db, { now });
  return db;
}

export function closeDb(db) {
  db.close();
}

/**
 * 轻量 store：工作区状态 + 少量受控写入。读模型在 readmodels.js（parity 层），
 * 解析/导入写入口在 parse.js——这里只放两类都依赖的共同件。
 */
export function createStore(db, { today = todayISO } = {}) {
  const q = (sql, ...args) => db.prepare(sql).all(...args);
  const one = (sql, ...args) => db.prepare(sql).get(...args) ?? null;
  const run = (sql, ...args) => db.prepare(sql).run(...args);

  return {
    db,
    today,

    /** 工作区行（workspace 单行，id=1）。dataset_state 存演示数据集元信息 JSON。 */
    workspace() {
      const w = one('SELECT * FROM workspace WHERE id = 1');
      let meta = null;
      if (w?.dataset_state) {
        try { meta = JSON.parse(w.dataset_state); } catch { meta = null; /* 坏 JSON 不当作已配置 */ }
      }
      return { root: w?.data_root ?? '', schemaVersion: w?.schema_version ?? null, meta };
    },

    setWorkspace(patch) {
      const cur = one('SELECT * FROM workspace WHERE id = 1');
      const next = {
        data_root: patch.root !== undefined ? patch.root : (cur?.data_root ?? null),
        schema_version: patch.schemaVersion ?? cur?.schema_version ?? '0002',
        dataset_state: patch.datasetState !== undefined ? patch.datasetState : (cur?.dataset_state ?? null),
      };
      run(
        `INSERT INTO workspace (id, data_root, schema_version, dataset_state) VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data_root=excluded.data_root,
           schema_version=excluded.schema_version, dataset_state=excluded.dataset_state`,
        next.data_root, next.schema_version, next.dataset_state,
      );
      return this.workspace();
    },

    /** 库里是否已有演示档案（播种幂等判据：有 profile 整批跳过）。 */
    hasProfiles() {
      return one('SELECT COUNT(*) AS n FROM profile').n > 0;
    },

    tables() {
      return q("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .map((r) => r.name);
    },

    columns(table) {
      return q(`PRAGMA table_info(${JSON.stringify(table).slice(1, -1)})`).map((c) => c.name);
    },
  };
}
