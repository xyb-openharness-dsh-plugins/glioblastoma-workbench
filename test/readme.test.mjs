/**
 * README 真实性回归。
 *
 * 触发原因：0.1.5 之前 README 还停在脚手架文案——"这是接入骨架，尚未实现真实业务"、
 * "无业务数据库、无演示患者"，与实际能力（10 页 30 视图、SQLite、演示档案、MinerU 候选链）相反。
 * 对外可见的说明一旦落后于产品，比没有 README 更容易误导。
 *
 * 这里锁四件事：版本与包名同源、相对链接可达、没有过期陈述、致谢段在位。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { version } from '../lib/version.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

test('README 版本与包名同源（VERSION → lib/version.js → README）', () => {
  assert.ok(readme.includes(`**v${version}**`), `README 没写当前版本 v${version}`);
  assert.equal(pkg.version, version, 'package.json 版本必须与 VERSION 一致');
  assert.match(readme, new RegExp(`/releases/tag/v${version.replace(/\./g, '\\.')}`), 'Release 链接要指向当前版本');
});

test('README 里的 tgz 文件名与包名/版本一致', () => {
  const tgz = `${pkg.name.replace('@', '').replace('/', '-')}-${version}.tgz`;
  assert.ok(readme.includes(tgz), `README 应写实际产物名 ${tgz}`);
});

test('README 的相对链接都指向仓库内真实存在的文件', () => {
  const links = [...readme.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  const local = links.filter((href) => !/^(https?:|mailto:|#)/.test(href));
  assert.ok(local.length > 0, 'README 应有指向文档的相对链接');
  const missing = local.filter((href) => !existsSync(join(ROOT, href.split('#')[0])));
  assert.deepEqual(missing, [], `README 有死链：${missing.join(', ')}`);
});

test('README 不再残留脚手架/空壳陈述', () => {
  for (const stale of ['这是接入骨架', '尚未实现真实业务', '无业务数据库', '无演示患者']) {
    assert.equal(readme.includes(stale), false, `README 仍有过期陈述：${stale}`);
  }
  // 反向核对：已实现的能力要写出来，不能只删不加
  for (const fact of ['30 个视图', 'SQLite', 'ensureSession', '候选']) {
    assert.ok(readme.includes(fact), `README 应说明已实现的能力：${fact}`);
  }
});

test('README 末尾保留贡献者致谢', () => {
  const at = readme.indexOf('## 贡献者与致谢');
  assert.ok(at > 0, 'README 必须有「贡献者与致谢」段');
  const tail = readme.slice(at);
  for (const who of [/小\s*x\s*宝\s*社区/, /DataElement/, /sam/, /hhx/, /繁华/]) {
    assert.match(tail, who, `致谢段缺少 ${who}`);
  }
});
