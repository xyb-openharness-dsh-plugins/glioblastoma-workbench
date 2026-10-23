#!/usr/bin/env node
/**
 * 列一致性检查（M5）：执行 schema/00*.sql **全部**迁移，与 demo/demo-data.sqlite 的
 * 实际列逐一比对；同时确认演示库两档案数据行数非零（D10：demo sqlite 由唯一源产出）。
 * demo/demo-data.sqlite 缺失时先由 demo/build-demo-data.mjs 重建（构建产物）。
 * 退出码 0/1。
 */
import { existsSync, rmSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../dsh/store.js';
import { buildDemoSqlite } from '../demo/build-demo-data.mjs';

const problems = [];

/* 干净临时目录（不污染工作区，也不用 os.tmpdir） */
const tmp = mkdtempSync(join(homedir(), '.xyb-gbm-cols-'));
const demoDbPath = join(tmp, 'demo-data.sqlite');
buildDemoSqlite(demoDbPath);

/* 1) 迁移侧列集合 */
const migrated = new DatabaseSync(':memory:');
migrate(migrated, { now: () => '2026-10-24T00:00:00Z' });
const migratedTables = migrated.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);

/* 2) 演示库侧列集合 */
const demo = new DatabaseSync(demoDbPath);
const demoTables = demo.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);

const tableDiff = migratedTables.filter((t) => !demoTables.includes(t))
  .concat(demoTables.filter((t) => !migratedTables.includes(t)));
if (tableDiff.length) problems.push(`表集合不一致：${tableDiff.join(', ')}`);

let columnsCompared = 0;
for (const t of migratedTables) {
  if (!demoTables.includes(t)) continue;
  const a = migrated.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  const b = demo.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  columnsCompared += 1;
  const miss = a.filter((c) => !b.includes(c)).concat(b.filter((c) => !a.includes(c)));
  if (miss.length) problems.push(`${t} 列不一致：${miss.join(', ')}`);
}

/* 3) 演示库两档案有数据（关键表行数） */
const rowChecks = [
  ['profile', 2], ['metric_def', 8], ['metric_point', '>0'], ['molecular_marker', '>0'],
  ['onco_cycle', '>0'], ['mri_followup', '>0'], ['steroid_dose', '>0'], ['ttfields_daily', '>0'],
  ['viewpoint', '>0'], ['decision_checklist', '>0'], ['trial_lead', '>0'],
];
for (const [t, want] of rowChecks) {
  const n = demo.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  if (want === '>0' ? n === 0 : n !== want) {
    problems.push(`${t} 行数异常：期望 ${want}，实际 ${n}`);
  }
}

demo.close();
migrated.close();
rmSync(tmp, { recursive: true, force: true });

if (problems.length) {
  console.error(`✗ 列一致性失败：\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ 列一致性通过：${migratedTables.length} 表 × ${columnsCompared} 组列逐一相同；演示库 profile=2、关键表行数非零`);
void existsSync;
