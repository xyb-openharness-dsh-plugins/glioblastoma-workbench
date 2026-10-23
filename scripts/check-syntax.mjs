#!/usr/bin/env node
/**
 * 语法检查（M5）：对 dsh / lib / scripts / test / public 的 JS/MJS 跑 `node --check`。
 * 退出码：0 全过；1 有失败。
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['dsh', 'lib', 'scripts', 'test', 'public'];
const EXTS = new Set(['.js', '.mjs']);

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (st.isFile() && EXTS.has(extname(entry))) out.push(full);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(join(root, d))).sort();
const failed = [];
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    failed.push([f, String(e.stderr ?? e.message).split('\n').slice(0, 4).join('\n')]);
  }
}

if (failed.length) {
  console.error(`✗ 语法检查失败 ${failed.length}/${files.length}：`);
  for (const [f, msg] of failed) console.error(`  ${f}\n${msg}`);
  process.exit(1);
}
console.log(`✓ 语法检查通过（${files.length} 个 JS/MJS 文件）`);
