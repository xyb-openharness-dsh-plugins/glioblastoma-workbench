#!/usr/bin/env node
/**
 * 生成 lib/version.js（M5）。唯一来源：仓库根 VERSION。lib/version.js 是生成物，不手改（E1）。
 *
 * 版本陷阱（ZERO-TO-DEV §2.3 v1.2）：commit 行记录的是**生成时**的 HEAD，一提交就落后一格。
 * 所以 --check 比对时**忽略 commit 行**；commit 的真实性由 scripts/check-version.mjs 用
 * `git merge-base --is-ancestor <recorded> HEAD`（spawnSync().status === 0）核。
 *
 * 用法：
 *   node scripts/build-version.mjs           写入（内容没变不落盘）
 *   node scripts/build-version.mjs --check   只校验（忽略 commit 行），不一致退出码 1
 *
 * 渠道 STARPAL_CHANNEL 三选一：prototype / beta / stable。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'lib', 'version.js');
const checkOnly = process.argv.includes('--check');

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const CHANNELS = ['prototype', 'beta', 'stable'];
const CHANNEL_LABELS = {
  prototype: '交互原型 · 未接入 DSH',
  beta: '开发版 · 数据仅在本机',
  stable: '正式版 · 数据仅在本机',
};

const raw = readFileSync(join(root, 'VERSION'), 'utf8').trim();
if (!SEMVER.test(raw)) {
  console.error(`✗ VERSION 不是合法语义化版本：${raw}`);
  process.exit(1);
}

const channel = process.env.STARPAL_CHANNEL || 'prototype';
if (!CHANNELS.includes(channel)) {
  console.error(`✗ STARPAL_CHANNEL 只能是 ${CHANNELS.join(' / ')}，收到：${channel}`);
  process.exit(1);
}

function git(args) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const commit = git(['rev-parse', '--short', 'HEAD']) || 'local';
const build = git(['log', '-1', '--format=%cs']) || 'local';

const generated = `// 本文件由 scripts/build-version.mjs 生成，请勿手改。
// 唯一来源：仓库根目录的 VERSION。改版本先改 VERSION，再跑 npm run build:version。
export const version = '${raw}'
export const build = '${build}'
export const channel = '${channel}'
export const commit = '${commit}'

export const displayVersion = \`v\${version}\`
export const channelLabel = '${CHANNEL_LABELS[channel]}'

export const APP_INFO = Object.freeze({
  version,
  displayVersion,
  build,
  channel,
  channelLabel,
  commit,
})
`;

/** 忽略 commit 行的比对（commit 必然滞后一格，逐字比对会永远假红） */
function sameIgnoringCommit(a, b) {
  const strip = (s) => s.split('\n').filter((l) => !/^export const commit = /.test(l)).join('\n');
  return strip(a) === strip(b);
}

if (checkOnly) {
  if (!existsSync(target)) {
    console.error('✗ 缺少 lib/version.js，请先运行 npm run build:version');
    process.exit(1);
  }
  if (!sameIgnoringCommit(readFileSync(target, 'utf8'), generated)) {
    console.error('✗ lib/version.js 与 VERSION 不同步（已忽略 commit 行），请运行 npm run build:version');
    process.exit(1);
  }
  console.log(`✓ lib/version.js 与 VERSION 同步（忽略 commit 行）：v${raw}（build ${build} · ${channel}）`);
  process.exit(0);
}

if (existsSync(target) && sameIgnoringCommit(readFileSync(target, 'utf8'), generated)) {
  console.log(`= lib/version.js 未变化：v${raw}（build ${build} · ${channel}）`);
  process.exit(0);
}

writeFileSync(target, generated);
console.log(`✓ 已生成 lib/version.js：v${raw}（build ${build} · ${channel}）`);
