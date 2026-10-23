#!/usr/bin/env node
/**
 * 版本号一致性校验（E1，M5）。
 *
 * 单一来源：VERSION。核对所有“会显示给人看”的地方：原型（冻结 0.2.0）、
 * public/index.html 首屏降级值、lib/version.js（生成物）、package.json、dsh/index.js STATUS。
 *
 * v1.2 陷阱：lib/version.js 的 commit 行记录**生成时**的 HEAD，一提交就落后一格——
 * 这里忽略 commit 行比对，另用 `git merge-base --is-ancestor <recorded> HEAD` 核真实性
 * （用 spawnSync().status === 0 判，不看输出——成功时没有输出）。
 * 退出码 0/1。
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const problems = [];
const checks = [];

function check(name, actual, expected) {
  const ok = actual === expected;
  checks.push({ name, actual, expected, ok });
  if (!ok) problems.push(`${name}：期望 ${expected}，实际 ${actual ?? '（未找到）'}`);
}

const version = read('VERSION').trim();
if (!SEMVER.test(version)) {
  console.error(`✗ VERSION 不是合法语义化版本：${version}`);
  process.exit(1);
}

/* 0) 原型 v0.2 已冻结在 0.2.0（原型是验收基准，不跟着当前版本漂移） */
const FROZEN_PROTOTYPE = '0.2.0';
const protoApp = read('prototypes/v0.2/app.js');
check('prototypes/v0.2/app.js APP_INFO.version（冻结）', protoApp.match(/version:\s*'([^']+)'/)?.[1], FROZEN_PROTOTYPE);
const protoHtml = read('prototypes/v0.2/index.html');
check('prototypes/v0.2/index.html <title>（冻结）', protoHtml.match(/<title>[^<]*?v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)<\/title>/)?.[1], FROZEN_PROTOTYPE);

/* 1) public/index.html：首屏降级值必须跟当前版本（运行时由 bootstrap 覆盖；锁住降级值防旧版闪现） */
const pub = read('public/index.html');
check('public/index.html <title>', pub.match(/<title>[^<]*?v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)<\/title>/)?.[1], version);
const pubLiterals = [...new Set([...pub.matchAll(/v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/g)].map((x) => x[1]))];
check('public/index.html 版本字面量（去重）', pubLiterals.join(', '), version);
const pubBuild = pub.match(/build: '(\d{4}-\d{2}-\d{2})'/)?.[1];
check('public/index.html __WB_INFO__ build', pubBuild, read('lib/version.js').match(/export const build = '([^']+)'/)?.[1]);

/* 2) public/app.js 降级字面量与 lib/version.js 生成内容一致 */
const appJs = read('public/app.js');
check('public/app.js APP_INFO 降级 version', appJs.match(/version: '([^']+)'/)?.[1], version);
check('public/app.js API 兜底通道', appJs.includes('beta') ? 'beta' : 'none',
  read('lib/version.js').match(/export const channel = '([^']+)'/)?.[1]);

/* 3) lib/version.js（生成物；忽略 commit 行——它必然滞后一格，真实性单独核） */
if (existsSync(join(root, 'lib/version.js'))) {
  const v = read('lib/version.js');
  check('lib/version.js version', v.match(/export const version = '([^']+)'/)?.[1], version);
  const commit = v.match(/export const commit = '([^']+)'/)?.[1];
  if (commit && commit !== 'local') {
    /* 用退出码判，不看输出：成功时 --is-ancestor 没有输出（假 hash / 非祖先 → 非 0） */
    const r = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', commit, 'HEAD'], { encoding: 'utf8' });
    check('lib/version.js commit 真实且是 HEAD 祖先', r.status === 0 ? 'yes' : 'no', 'yes');
  }
} else {
  problems.push('缺少 lib/version.js（页面与包的唯一版本来源），请运行 npm run build:version');
}

/* 4) package.json */
const pkg = JSON.parse(read('package.json'));
check('package.json version', pkg.version, version);

const pad = (s, n) => String(s ?? '（未找到）').padEnd(n);
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${pad(c.name, 46)} ${c.actual ?? '—'}`);

if (problems.length) {
  console.error('\n版本号不一致：');
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\n改版本先改 VERSION，再跑 npm run build:version；其余位置与它对齐。');
  process.exit(1);
}
console.log(`\n✓ 版本号一致：v${version}（共核对 ${checks.length} 处）`);
