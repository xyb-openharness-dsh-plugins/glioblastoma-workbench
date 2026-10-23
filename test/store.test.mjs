/**
 * 数据层单测（M5）：迁移幂等 / 播种幂等 / **readmodels parity**（唯一验收）。
 * 全部内存库，不落盘、不依赖本机资料目录。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../dsh/store.js';
import { seedDemo } from '../dsh/demo.js';
import { buildBootstrap } from '../dsh/readmodels.js';
import { finalize, writeDemoToDb } from '../demo/build-demo-data.mjs';

const NOW = () => '2026-10-24T00:00:00Z';

function fresh() {
  return new DatabaseSync(':memory:');
}
function seededDb() {
  const db = fresh();
  migrate(db, { now: NOW });
  seedDemo(db);
  return db;
}

test('迁移幂等：两个迁移文件各执行一次，重跑不再执行', () => {
  const db = fresh();
  const first = migrate(db, { now: NOW });
  assert.equal(first.executed.length, 2); // 0001 冻结结构 + 0002 parity 补列
  const second = migrate(db, { now: () => '2026-10-24T00:00:01Z' });
  assert.equal(second.executed.length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM schema_version').get().n, 2);
  db.close();
});

test('冻结保护：改 0001 内容后重跑迁移必须报错（不许改绿——这里断言它红）', () => {
  const db = fresh();
  migrate(db, { now: NOW });
  db.prepare('UPDATE schema_version SET checksum = ? WHERE version = 1').run('deadbeef');
  assert.throws(() => migrate(db, { now: NOW }), /冻结后被改动/);
  db.close();
});

test('播种幂等：库里已有档案整批跳过，不叠加', () => {
  const db = seededDb();
  const before = db.prepare('SELECT COUNT(*) AS n FROM profile').get().n;
  const again = seedDemo(db);
  assert.equal(again.seeded, false);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profile').get().n, before);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metric_point').get().n,
    db.prepare('SELECT COUNT(*) AS n FROM metric_point').get().n);
  db.close();
});

test('parity（唯一验收）：readmodels.buildBootstrap === finalize() 逐键一致', () => {
  const db = seededDb();
  const out = buildBootstrap(db, { today: () => '2026-10-24' });
  const want = finalize();
  assert.deepEqual(out, want);
  db.close();
});

test('parity 关键形状抽查：分类不补 unit、可选键不出现、D8 无中间量键', () => {
  const db = seededDb();
  const out = buildBootstrap(db, { today: () => '2026-10-24' });
  const [d1, d2] = out.profiles;

  assert.equal(d1.id, 'demo1');
  assert.equal(d1.age, 58);
  assert.equal(d2.age, 63);
  assert.deepEqual(Object.keys(d1.metrics.qual), ['KPS']);           // kind!=='numeric' 才还原到 qual
  assert.ok(!('unit' in d1.metrics.qual.KPS[0]), '分类序列不补 unit');
  assert.ok(!('recurrence' in d1.oncology), 'demo1 没有 recurrence，键不许出现');
  assert.ok(!('nextOn' in d2.oncology), 'demo2 没有 nextOn，键不许出现');
  assert.equal(d1.molecular.find((m) => m.marker === 'Ki-67').value, '约 40%');
  assert.ok(!('value' in d1.molecular[0]), '无原值的条目不出现 value 键');
  assert.equal(d1.ttfields.daily.length, 45);
  assert.equal(d2.ttfields.daily.length, 0);
  assert.equal(d2.ttfields.started, null);                            // D3：显式 null
  assert.equal(d1.metrics.numeric.WBC.length, 11);
  assert.equal(d2.metrics.numeric.NA.length, 5);
  assert.deepEqual(Object.keys(d1.metrics.numeric).sort(), ['DEXA', 'WBC', 'WEIGHT']);
  assert.equal(d1.viewpoints[0].visibility, 'private');
  assert.equal(d2.viewpoints[1].visibility, 'shared');
  db.close();
});

test('ord 语义（D1/D2）：molecular 按 ord 还原，与 finalize 顺序一致（不是 rowid 序）', () => {
  const db = seededDb();
  const out = buildBootstrap(db, { today: () => '2026-10-24' });
  const got = out.profiles[0].molecular.map((m) => m.marker);
  const want = finalize().profiles[0].molecular.map((m) => m.marker);
  assert.deepEqual(got, want);
  db.close();
});

test('单事务失败回滚：中途撞约束，前面已写的行也一并回滚', () => {
  const db = fresh();
  migrate(db, { now: NOW });
  db.prepare("INSERT INTO profile (id, name, created_at) VALUES ('demo1', '占位', '2026-10-24')").run();
  assert.throws(() => writeDemoToDb(db, finalize()), /UNIQUE constraint failed/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM metric_def').get().n, 0, '回滚后 metric_def 不留半截');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM workspace').get().n, 0, '回滚后 workspace 不留半截');
  db.close();
});

test('G1/G6 红线落库断言：分子三态枚举齐全；癫痫轨道独立（不进 metric_point）', () => {
  const db = seededDb();
  const states = db.prepare('SELECT DISTINCT status FROM molecular_marker ORDER BY status').all().map((r) => r.status);
  assert.deepEqual(states, ['detected', 'not_detected', 'not_tested']); // 未检测 ≠ 阴性，三态都在
  const seizureCodes = db.prepare("SELECT COUNT(*) AS n FROM metric_point WHERE code LIKE '%seizure%'").get().n;
  assert.equal(seizureCodes, 0, '发作事件不在指标轨道（G6）');
  const badCols = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    .map((r) => r.name)
    .filter((t) => /progression|conclusion/.test(t));
  assert.deepEqual(badCols, [], '无判读类表（G3）');
  db.close();
});
