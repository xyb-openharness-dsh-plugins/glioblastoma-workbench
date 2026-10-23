/**
 * GBM 报告抽取（M5，18 号 v2 §14 部件三）：MinerU markdown → 候选。只抄写，不判断。
 *
 * 顺序红线（18 号 §8.1）：**先 `htmlTablesToPipes()` 转竖线表，再按位置对齐**，
 * 绝不能先剥标签——先剥会把整表压成一行，8 个指标写成同一个数，静默错读不报错。
 * 单位红线（§7.1）：**先剥 LaTeX 外壳**（`$10^9/L$`、`\mu`、`\text{}`、`10^{9}`）再归一；
 * 认不出的只剥壳、不推断。
 *
 * 抽取规则（§7 表）：指标名只认字典（拉丁名词边界）；不等式 `<0.5` 原样保留、数值留空；
 * 指标数与数值数不一致整行放弃；抽不到返回空数组（让用户手填），不硬凑。
 */
const numRe = /^[<>≥≤]?\s*\d+(?:\.\d+)?$/;

/* GBM 指标字典：code + 名称/别名（与 metric_def 同一份口径；KPS 走量表不进这里） */
export const GBM_METRIC_ENTRIES = [
  { code: 'WBC', names: ['白细胞', 'WBC', '白细胞计数', '白血球'] },
  { code: 'ANC', names: ['中性粒细胞', 'ANC', '中性粒细胞绝对值', '嗜中性粒细胞'] },
  { code: 'PLT', names: ['血小板', 'PLT', '血小板计数'] },
  { code: 'HGB', names: ['血红蛋白', 'HGB', 'Hb', '血色素'] },
  { code: 'NA', names: ['血钠', '钠', 'Na', '血清钠', '钠离子'] },
  { code: 'K', names: ['血钾', '钾', 'K', '血清钾', '钾离子'] },
  { code: 'CREA', names: ['肌酐', 'Cr', 'CREA', '血肌酐'] },
  { code: 'WEIGHT', names: ['体重', 'weight', 'kg'] },
];

/** 拉丁名要词边界：`Cr` 不会匹配肌酐之外的字符，`K` 不会吃进 `KPS`。 */
export function buildMetricMatcher(entries) {
  if (!Array.isArray(entries)) throw new TypeError('entries must be an array');
  const matchers = [];
  for (const entry of entries) {
    if (!entry?.code || !Array.isArray(entry.names)) continue;
    for (const name of entry.names) {
      if (typeof name !== 'string' || !name.trim()) continue;
      const latin = /^[A-Za-z0-9\-\s]+$/.test(name.trim());
      const re = latin
        ? new RegExp(`(?<![A-Za-z0-9])${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`)
        : null;
      matchers.push({ code: entry.code, name: name.trim(), re });
    }
  }
  return (text) => {
    if (typeof text !== 'string') return null;
    for (const m of matchers) {
      if (m.re ? m.re.test(text) : text.includes(m.name)) return m.code;
    }
    return null;
  };
}

/** `<0.5` 原样保留、valueNum 置空——折成 0.5 就是替患者下结论。 */
export function parseResultValue(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim();
  if (!t || !numRe.test(t)) return null;
  const m = t.match(/^([<>≥≤])\s*(\d+(?:\.\d+)?)$/);
  if (m) return { valueText: t, valueNum: null };
  const n = Number(t);
  return Number.isFinite(n) ? { valueText: t, valueNum: n } : null;
}

/**
 * LaTeX 剥壳（§7.1）：`$...$` / `\(...\)` / `\[...\]` / `\mu` / `\text{}` / `\mathrm{}` /
 * `10^{9}` → `10^9`。认不出也只剥壳、不推断。
 */
export function stripLatex(unit) {
  let t = String(unit ?? '').trim();
  if (!t) return '';
  t = t.replace(/^\$\s*(.+?)\s*\$$/, '$1');           // $10^9/L$
  t = t.replace(/^\\\(\s*(.+?)\s*\\\)$/, '$1');       // \(10^9/L\)
  t = t.replace(/^\\\[\s*(.+?)\s*\\\]$/, '$1');       // \[10^9/L\]
  t = t.replace(/\\(?:text|mathrm|mathtt)\{([^{}]*)\}/g, '$1');
  t = t.replace(/\$\\mu\$/g, 'μ'); // $\mu$mol/L 这种行内壳
  t = t.replace(/\\mu\b/g, 'μ');
  t = t.replace(/\^\{(\d+)\}/g, '^$1');               // 10^{9} → 10^9
  t = t.replace(/_\{([^{}]*)\}/g, '_$1');
  return t.trim();
}

const UNIT_MAP = [
  [/^10\^9\s*\/\s*L$/i, '10⁹/L'],
  [/^10\^12\s*\/\s*L$/i, '10¹²/L'],
  [/^umol\s*\/\s*L$/i, 'μmol/L'],
  [/^μmol\s*\/\s*L$/i, 'μmol/L'],
  [/^mmol\s*\/\s*L$/i, 'mmol/L'],
  [/^mg\s*\/\s*(dl|dL)$/i, 'mg/dL'],
  [/^ug\s*\/\s*(ml|mL)$/i, 'μg/mL'],
  [/^g\s*\/\s*L$/i, 'g/L'],
  [/^mmol\/L$/i, 'mmol/L'],
];

/** 单位归一：先剥 LaTeX 再查表（比对时忽略空格——`\mu mol/L` 与 `μmol/L` 是同一个单位）；认不出保留剥壳原文，绝不猜。 */
export function normalizeUnit(unit) {
  if (typeof unit !== 'string') return null;
  const t = stripLatex(unit);
  if (!t) return null;
  const flat = t.replace(/\s+/g, '');
  for (const [re, out] of UNIT_MAP) if (re.test(flat)) return out;
  return /^[^|<>]+$/.test(flat) ? t : null;
}

/** 位置对齐（§8）：第 i 个指标配第 i 个数值/单位；数量不一致**整行放弃**（返回 null）。 */
export function alignPositional(match, labels, values, units = []) {
  if (typeof match !== 'function' || !Array.isArray(labels) || !Array.isArray(values)) return null;
  if (labels.length === 0 || labels.length !== values.length) return null;
  if (units.length && units.length !== labels.length) return null;
  const rows = [];
  for (let i = 0; i < labels.length; i++) {
    const metric = match(labels[i]);
    const value = parseResultValue(values[i]);
    if (!metric || !value) continue;
    rows.push({
      code: metric,
      valueText: value.valueText,
      valueNum: value.valueNum,
      unit: units.length ? normalizeUnit(units[i]) : null,
    });
  }
  return rows;
}

/**
 * `<table><tr><td>` → 竖线表（§8.1，最坑的一条）。四个细节缺一静默少列：
 * colspan 补空位（不是复制）；正则 `["']?`；单元格内 `|` 换 `/`；首行当表头并补 `| --- |` 分隔行。
 */
export function htmlTablesToPipes(markdown) {
  if (typeof markdown !== 'string') return '';
  return markdown.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    const trs = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const lines = trs.map((tr) => {
      const tds = tr.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
      const cells = [];
      for (const td of tds) {
        const attrs = (td.match(/^<t[dh][^>]*>/i) || [''])[0];
        const span = Number((attrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1);
        const text = td
          .replace(/^<t[dh][^>]*>/i, '')
          .replace(/<\/t[dh]>$/i, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\|/g, '/')
          .replace(/\s+/g, ' ')
          .trim();
        cells.push(text, ...Array(Math.max(0, span - 1)).fill(''));
      }
      return `| ${cells.join(' | ')} |`;
    });
    if (!lines.length) return '';
    const sep = `| ${lines[0].split('|').slice(1, -1).map(() => '---').join(' | ')} |`;
    return `\n${lines[0]}\n${sep}\n${lines.slice(1).join('\n')}\n`;
  });
}

/** `| a | b |` 行拆单元格；HTML 表必须先转换。 */
export function splitMarkdownRow(line) {
  if (typeof line !== 'string') return null;
  const t = line.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return null;
  return t.slice(1, -1).split('|').map((c) => c.trim());
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 合法日历日校验：`2026-02-31` 这种不认。 */
export function isValidDate(s) {
  const m = DATE_RE.exec(String(s ?? ''));
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/**
 * 抽候选：两种版式（§8）——①整表塞一格的横表（按位置对齐，数量不一致整行放弃）；
 * ②一指标一行的竖表（值=其后第一个数，单位=其后第一个非数单元）。
 * 输入可以是 markdown 全文（先 htmlTablesToPipes 再逐行）或已拆的行数组。抽不到返回 []。
 */
export function extractTableCandidates(lines, entries = GBM_METRIC_ENTRIES) {
  const match = buildMetricMatcher(entries);
  const raw = Array.isArray(lines) ? lines : htmlTablesToPipes(String(lines ?? '')).split('\n');
  const rows = raw
    .map(splitMarkdownRow)
    .filter(Boolean)
    .filter((cells) => !cells.every((c) => /^[-:\s]*$/.test(c)));
  const out = [];
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].filter((c) => match(c)).length < 2) continue;
    const valueRow = rows[i + 1];
    if (valueRow.filter((c) => numRe.test(c)).length === 0) break;
    const after = rows[i + 2] ?? [];
    const units = after.length === valueRow.length && after.length > 0
      && after.every((c) => !numRe.test(c)) && after.some((c) => c) ? after : [];
    const aligned = alignPositional(match, rows[i], valueRow, units);
    if (aligned) out.push(...aligned);
    return out;
  }
  for (const cells of rows) {
    if (cells.filter((c) => match(c)).length !== 1) continue;
    const mi = cells.findIndex((c) => match(c));
    for (let j = mi + 1; j < cells.length; j++) {
      const value = parseResultValue(cells[j]);
      if (!value) continue;
      const unitCell = cells.slice(j + 1).find((c) => c && !numRe.test(c)) ?? null;
      out.push({ code: match(cells[mi]), valueText: value.valueText, valueNum: value.valueNum, unit: normalizeUnit(unitCell) });
      break;
    }
  }
  return out;
}

const DATE_LABEL_RE = /(采样|报告|检验|检查|送检|签发)[^\n]{0,12}日?期?/;
const ANY_DATE_RE = /(\d{4})-(\d{2})-(\d{2})/g;

/**
 * 报告日期：先看带标签的行，再看前 30 行的第一个日期；都不合法返回 null（不编）。
 */
export function extractReportDate(markdown) {
  const md = htmlTablesToPipes(String(markdown ?? ''));
  const lines = md.split('\n');
  const labeled = lines.find((l) => DATE_LABEL_RE.test(l) && ANY_DATE_RE.test(l));
  const scopes = [labeled, lines.slice(0, 30).join('\n')];
  for (const scope of scopes) {
    if (!scope) continue;
    ANY_DATE_RE.lastIndex = 0;
    let m;
    while ((m = ANY_DATE_RE.exec(scope)) !== null) {
      const s = m[0];
      if (isValidDate(s)) return s;
    }
  }
  return null;
}

/** code → 展示名（候选列表用；与 metric_def 同名）。 */
export function metricLabel(code, entries = GBM_METRIC_ENTRIES) {
  const first = entries.find((e) => e.code === code);
  return first ? first.names[0] : code;
}

/**
 * markdown → 候选（服务端入口）：抽数值 + 报告日期，字段名/单位/值原样。
 * 只产候选，不写库；失败不产候选（调用方 parse.js 的事务语义）。
 */
export function extractCandidates(markdown, { entries = GBM_METRIC_ENTRIES } = {}) {
  const rows = extractTableCandidates(markdown, entries);
  const date = extractReportDate(markdown);
  return rows.map((r) => ({
    fieldName: metricLabel(r.code, entries),
    code: r.code,
    valueText: r.valueText,
    valueNum: r.valueNum,
    unit: r.unit,
    date,
  }));
}
