#!/usr/bin/env node
/**
 * 冻结合同校验（G3/M5）：
 * 1. schema/0001_initial.sql 的 sha256 与 freeze-contract.md 登记值逐字一致（冻结未破坏）；
 * 2. 全部迁移在内存库可执行、可重跑（幂等）；
 * 3. 0001 建 27 表（+0002 的 3 新表 = 30）；
 * 4. 判读红线：全库无 is_conclusion / is_progression 类列（freeze-contract 四契约①）。
 * 退出码 0/1。
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];

/* 1) 冻结 sha256 复算 */
const sql1 = readFileSync(join(root, 'schema/0001_initial.sql'), 'utf8');
const sha = createHash('sha256').update(sql1, 'utf8').digest('hex');
const contract = readFileSync(join(root, 'schema/freeze-contract.md'), 'utf8');
const recorded = contract.match(/\|\s*sha256\s*\|\s*`?([0-9a-f]{64})`?/)?.[1];
if (!recorded) {
  problems.push('freeze-contract.md 里读不到 sha256 登记值');
} else if (recorded !== sha) {
  problems.push(`0001_initial.sql 冻结破坏：登记 ${recorded}，实算 ${sha}`);
}

/* 2) 迁移可执行 + 幂等 + 3) 表数 + 4) 判读红线 */
const { migrate } = await import('../dsh/store.js');
const db = new DatabaseSync(':memory:');
let ran;
try {
  ran = migrate(db, { now: () => '2026-10-24T00:00:00Z' });
  const again = migrate(db, { now: () => '2026-10-24T00:00:01Z' });
  if (again.executed.length !== 0) problems.push(`迁移不幂等：第二次又执行了 ${again.executed.join(', ')}`);
} catch (e) {
  problems.push(`迁移执行失败：${e.message}`);
  db.close();
  console.error(`✗ ${problems.join('；')}`);
  process.exit(1);
}

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
const expected0001 = 27;
const expectedTotal = 31; // 0001 的 27 + 0002 新表 3（ttfields_meta / ttfields_monthly / trial_lead）+ schema_version 登记表
if (tables.length !== expectedTotal) {
  problems.push(`表数不对：期望 ${expectedTotal}（0001=${expected0001} + 0002 新表 3），实际 ${tables.length}`);
}

const forbidden = [];
for (const t of tables) {
  for (const c of db.prepare(`PRAGMA table_info(${t})`).all()) {
    if (/is_conclusion|is_progression|recommend/i.test(c.name)) forbidden.push(`${t}.${c.name}`);
  }
}
if (forbidden.length) problems.push(`出现判读/推荐类列（四契约①/G3）：${forbidden.join(', ')}`);

const versions = db.prepare('SELECT version, name FROM schema_version ORDER BY version').all();
db.close();

if (problems.length) {
  console.error(`✗ 冻结合同校验失败：\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ 冻结合同：0001 sha256 一致（${sha.slice(0, 12)}…）· 迁移 ${ran.executed.length} 个文件幂等 · ${tables.length} 表（0001 建 ${expected0001} + 0002 新表 3 + schema_version）· 判读列 0 · schema_version=[${versions.map((v) => v.name).join(' → ')}]`);
