#!/usr/bin/env node
/**
 * 医疗表述红线检查（E2）。
 *
 * 红线词（DEV-REQUIREMENTS §三 E2）：建议治疗 / 可能复发 / 可以停药 / 无需就医 /
 * 推荐方案 / 治愈率 / 生存率；另按任务口径：**「复发」单独出现只允许引用报告原文语境**。
 *
 * 扫描范围：dsh / lib / public / demo（会被用户读到或变成界面数据的实现文件）。
 * 不扫 docs / prompts / prototypes / research：前者是讨论稿，后者是已签认基准，各自有评审。
 *
 * 两种放行：① 否定语境（命中词前 12 字内出现 不/勿/禁/别 等）；② 行末 `wording-allow` 标注
 * （引用报告原文语境的「复发」走这条，需写明理由）。
 *
 * 用法：node scripts/check-wording.mjs；退出码 0 通过 / 1 命中。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['dsh', 'lib', 'public', 'demo'];
const EXTS = new Set(['.js', '.mjs', '.cjs', '.html', '.css']);

const RULES = [
  { id: 'treatment-advice', re: /建议\s*(进行|做|用|接受|采用|考虑)?\s*(治疗|手术|化疗|放疗|用药|服药|加药|减药)/g },
  { id: 'recommend-plan', re: /推荐\s*(方案|治疗|用药|剂量|药物)/g },
  { id: 'stop-medication', re: /(可以|可|建议|不妨)\s*停\s*(药|用|服)/g },
  { id: 'skip-care', re: /(不用|无需|不必|没必要)\s*(就医|复查|去医院|看医生)/g },
  { id: 'recurrence-claim', re: /(可能|大概率|一定|肯定|不会)\s*复发/g },
  { id: 'cure-rate', re: /治愈率|生存率/g },
  { id: 'recurrence-mention', re: /复发/g }, // 单独出现：默认命中，需否定语境或 wording-allow（引用原文语境）
];

const NEGATION = /[不勿禁别]$|不构成|不代表|不做|不提供|不作为|不出现|不许|不推荐|不等于/;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (st.isFile() && EXTS.has(extname(entry))) out.push(full);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(join(root, d)));
const hits = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('wording-allow')) return; // 行末标注放行（须写明理由）
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        const before = line.slice(Math.max(0, m.index - 12), m.index);
        if (NEGATION.test(before)) continue;
        hits.push({ file: relative(root, file), line: i + 1, rule: rule.id, text: m[0] });
      }
    }
  });
}

if (!files.length) {
  console.log('= 没有可扫描的实现文件，本次跳过');
  process.exit(0);
}

if (hits.length) {
  console.error(`✗ 文案红线命中 ${hits.length} 处：\n`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  [${h.rule}]  「${h.text}」`);
  console.error('\n改法：产品句子改成"记录/整理/带去问医生"；引用报告原文语境的「复发」在行末加 // wording-allow: 理由。');
  process.exit(1);
}

console.log(`✓ 文案红线通过（${files.length} 个实现文件，0 处命中）`);
