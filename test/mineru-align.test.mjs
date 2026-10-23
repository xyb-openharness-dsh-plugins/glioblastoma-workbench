/**
 * MinerU 对齐与协议单测（M5，18 号 v2 §8/§13/§14 判据）。
 * 重点含反例（§8.1）：**先剥标签会把整表压成一行且抽不出任何指标**——防止后人把顺序调回去。
 * 客户端协议用注入 fetch，不联网、不读真实凭据。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import {
  htmlTablesToPipes, splitMarkdownRow, alignPositional, normalizeUnit, stripLatex,
  parseResultValue, extractTableCandidates, extractReportDate, extractCandidates, buildMetricMatcher,
  GBM_METRIC_ENTRIES,
} from '../dsh/gbmparse.js';
import { MineruClient, MineruError, MINERU_MODEL_DEFAULT, MINERU_MODEL_FALLBACK, modelFallbackWorthy, resolveToken } from '../dsh/mineru.js';

/* ---------------- htmlTablesToPipes 四细节（18 号 §8.1） ---------------- */

test('HTML 表转竖线表：首行当表头并补分隔行', () => {
  const md = '<table><tr><td>项目</td><td>结果</td></tr><tr><td>白细胞</td><td>4.2</td></tr></table>';
  const out = htmlTablesToPipes(md).split('\n').filter(Boolean);
  assert.equal(out[0], '| 项目 | 结果 |');
  assert.equal(out[1], '| --- | --- |');
  assert.equal(out[2], '| 白细胞 | 4.2 |');
});

test('colspan 补空位（不是复制）——列数对齐，单位列不重复数值', () => {
  const md = '<table><tr><td>项目</td><td>结果</td><td>单位</td></tr><tr><td>白细胞</td><td colspan="2">4.2</td></tr></table>';
  const row2 = htmlTablesToPipes(md).split('\n').filter(Boolean)[2];
  assert.deepEqual(splitMarkdownRow(row2), ['白细胞', '4.2', '']);
});

test("单元格内的 | 换成 /，不撑出多列", () => {
  const md = '<table><tr><td>a|b</td><td>1</td></tr></table>';
  const row = htmlTablesToPipes(md).split('\n')[1];
  assert.deepEqual(splitMarkdownRow(row), ['a/b', '1']);
});

test("colspan=\"2\" 的正则必须能匹配（\"?' 是字面单引号陷阱）", () => {
  const md = '<table><tr><td>x</td></tr><tr><td colspan="2">y</td></tr></table>';
  const row = htmlTablesToPipes(md).split('\n').filter(Boolean)[2];
  assert.deepEqual(splitMarkdownRow(row), ['y', '']); // 补出了空位 = 匹配上了
});

/* ---------------- 位置对齐（§8） ---------------- */

test('位置对齐：第 i 个指标配第 i 个数值/单位', () => {
  const match = buildMetricMatcher(GBM_METRIC_ENTRIES);
  const rows = alignPositional(
    match,
    ['项目', '白细胞', '血小板'],
    ['结果', '4.2', '210'],
    ['单位', '10^9/L', '10^9/L'],
  );
  assert.deepEqual(rows, [
    { code: 'WBC', valueText: '4.2', valueNum: 4.2, unit: '10⁹/L' },
    { code: 'PLT', valueText: '210', valueNum: 210, unit: '10⁹/L' },
  ]);
});

test('数量不一致 → 整行放弃（null），不猜', () => {
  const match = buildMetricMatcher(GBM_METRIC_ENTRIES);
  assert.equal(alignPositional(match, ['白细胞', '血小板'], ['4.2']), null);
});

test('不等式 <0.5 原样保留、数值留空（替用户下结论）', () => {
  assert.deepEqual(parseResultValue('<0.5'), { valueText: '<0.5', valueNum: null });
  assert.deepEqual(parseResultValue('4.2'), { valueText: '4.2', valueNum: 4.2 });
  assert.equal(parseResultValue('3.5-9.5'), null, '参考区间不当结果');
});

/* ---------------- 单位先剥 LaTeX（§7.1） ---------------- */

test('单位先剥 LaTeX 壳：$10^9/L$ → 10⁹/L，\\mu → μ，10^{9} → 10^9', () => {
  assert.equal(normalizeUnit('$10^9/L$'), '10⁹/L');
  assert.equal(normalizeUnit('$10^{9}/L$'), '10⁹/L');
  assert.equal(normalizeUnit('\\(\\mu mol/L\\)'), 'μmol/L');
  assert.equal(normalizeUnit('$\\mu$mol/L'), 'μmol/L');
  assert.equal(stripLatex('\\text{mmol}/L'), 'mmol/L');
  assert.equal(normalizeUnit('g/L'), 'g/L');
  assert.equal(normalizeUnit('mÉvotre奇葩'), 'mÉvotre奇葩', '认不出的只剥壳保留原文，不推断');
});

/* ---------------- 反例：先剥标签会串位（§8.1，防回归） ---------------- */

const LAB_TABLE_MD = [
  '# 血常规',
  '<table><tr><td>项目</td><td>结果</td><td>单位</td></tr>',
  '<tr><td>白细胞</td><td>4.2</td><td>$10^9/L$</td></tr>',
  '<tr><td>血小板</td><td>210</td><td>$10^9/L$</td></tr></table>',
].join('\n');

test('正路：先 htmlTablesToPipes 再对齐 → 两条候选、值与单位都对', () => {
  const cands = extractTableCandidates(LAB_TABLE_MD);
  assert.equal(cands.length, 2);
  assert.deepEqual(cands[0], { code: 'WBC', valueText: '4.2', valueNum: 4.2, unit: '10⁹/L' });
  assert.deepEqual(cands[1], { code: 'PLT', valueText: '210', valueNum: 210, unit: '10⁹/L' });
});

test('反例（18 号 §8.1）：先剥标签 → 整表压成一行、抽不出任何指标', () => {
  const collapsed = LAB_TABLE_MD.replace(/<[^>]+>/g, ''); // 错误顺序：先剥标签
  assert.ok(!collapsed.includes('|'), '表格已不是竖线表（压成一行连续文本）');
  assert.ok(/白细胞4\.2/.test(collapsed.replace(/\s+/g, '')), '数值黏连（串位现场）');
  const cands = extractTableCandidates(collapsed);
  assert.equal(cands.length, 0, '先剥标签后一个指标都抽不出——这正是本反例要守住的红线');
});

test('extractCandidates：带报告日期；日期标签行优先且拒绝非法日历日', () => {
  const md = `${LAB_TABLE_MD}\n采样日期：2026-02-31\n报告日期：2026-10-12`;
  const cands = extractCandidates(md);
  assert.equal(cands[0].date, '2026-10-12', '2026-02-31 不是合法日期，取下一个合法日期');
  assert.equal(cands[0].fieldName, '白细胞');
});

/* ---------------- MineruClient 协议（四步 / PUT 无 Content-Type / 401 不重试 / 模型回退） ---------------- */

/** 构造最小 stored/deflate zip（零依赖写入，供 §④ 解包测试） */
function makeZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, text] of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = deflateRawSync(Buffer.from(text, 'utf8'));
    const crc = 0; // readZip 不校验 CRC，这里只为测试解包路径
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(text.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(text.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const body = Buffer.concat([...locals, ...centrals]);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([body, eocd]);
}

function jsonResponse(status, obj) {
  return { ok: status < 400, status, json: async () => obj };
}

function makeHappyFetch(zipEntries) {
  const calls = [];
  let uploadUrl = '';
  let batchId = 'B1';
  const zip = makeZip(zipEntries);
  const fetchImpl = async (url, init = {}) => {
    calls.push({ method: init.method ?? 'GET', url: String(url), headers: init.headers ?? {}, body: init.body ?? null });
    const u = String(url);
    if (u.endsWith('/file-urls/batch')) {
      uploadUrl = 'https://put.example/obj1';
      return jsonResponse(200, { code: 0, data: { batch_id: batchId, file_urls: [uploadUrl] } });
    }
    if (u.startsWith('https://put.example/')) return { ok: true, status: 200 };
    if (u.includes('/extract-results/batch/')) {
      return jsonResponse(200, { code: 0, data: { extract_result: [{ state: 'done', full_zip_url: 'https://zip.example/out.zip' }] } });
    }
    if (u === 'https://zip.example/out.zip') return { ok: true, status: 200, arrayBuffer: async () => zip };
    throw new Error(`测试未覆盖的 URL：${u}`);
  };
  return { fetchImpl, calls };
}

const MD_WITH_TABLE = '<table><tr><td>项目</td><td>结果</td><td>单位</td></tr><tr><td>白细胞</td><td>3.8</td><td>$10^9/L$</td></tr></table>';

test('四步顺序 + PUT 不带 Content-Type + 默认 pipeline + zip 解包取 full.md', async () => {
  const { fetchImpl, calls } = makeHappyFetch([['full.md', MD_WITH_TABLE], ['a_content_list.json', '[{"page_idx":0}]']]);
  const client = new MineruClient({ token: 'sk-test-token-123456', fetchImpl });
  const out = await client.parse({ bytes: Buffer.from('%PDF-1.4 demo'), filename: 'lab.pdf', intervalMs: 1 });

  assert.equal(calls[0].method, 'POST');
  assert.ok(calls[0].url.endsWith('/file-urls/batch'));
  assert.equal(JSON.parse(calls[0].body).model_version, MINERU_MODEL_DEFAULT);
  assert.equal(MINERU_MODEL_DEFAULT, 'pipeline');
  assert.equal(calls[1].method, 'PUT');
  assert.ok(calls[1].url.startsWith('https://put.example/'));
  assert.ok(!Object.keys(calls[1].headers).some((k) => k.toLowerCase() === 'content-type'), '上传不许带 Content-Type');
  assert.equal(calls[2].method, 'GET');
  assert.ok(calls[2].url.includes(`/extract-results/batch/B1`));
  assert.equal(calls[3].url, 'https://zip.example/out.zip');
  assert.ok(out.markdown.includes('白细胞'));
  assert.equal(out.pages, 1, '页数从 content_list 的 page_idx 上限推');
});

test('显式传模型不被默认值覆盖', async () => {
  const { fetchImpl, calls } = makeHappyFetch([['full.md', '# t']]);
  const client = new MineruClient({ token: 'sk-test-token-123456', fetchImpl });
  await client.parse({ bytes: Buffer.from('x'), filename: 'a.pdf', modelVersion: 'vlm', intervalMs: 1 });
  assert.equal(JSON.parse(calls[0].body).model_version, 'vlm');
});

test('401 → UNAUTHORIZED 且不重试（Token 故障没有“再试一次”）', async () => {
  let count = 0;
  const fetchImpl = async () => {
    count += 1;
    return jsonResponse(401, { code: 401, msg: 'user token expired' });
  };
  const client = new MineruClient({ token: 'sk-expired-token-999', fetchImpl });
  await assert.rejects(() => client.parse({ bytes: Buffer.from('x'), filename: 'a.pdf', intervalMs: 1 }),
    (e) => e instanceof MineruError && e.code === 'UNAUTHORIZED');
  assert.equal(count, 1, '401 不重试');
});

test('模型回退判定：只有“接口不接受 model_version 参数”才回退', async () => {
  assert.equal(modelFallbackWorthy({ message: 'param model_version invalid' }), true);
  assert.equal(modelFallbackWorthy({ message: "model_version 'pipeline' cannot process html files" }), false, '文件类型失败不换模型');
  assert.equal(modelFallbackWorthy({ message: '网络错误' }), false);

  // 回退路径真的会重试 vlm 一次
  let call = 0;
  const zip = makeZip([['full.md', '# ok']]);
  const fetchImpl = async (url, init = {}) => {
    const u = String(url);
    if (u.endsWith('/file-urls/batch')) {
      call += 1;
      if (call === 1) return jsonResponse(200, { code: 1, msg: 'param model_version not supported' });
      return jsonResponse(200, { code: 0, data: { batch_id: 'B2', file_urls: ['https://put.example/o2'] } });
    }
    if (u.startsWith('https://put.example/')) return { ok: true, status: 200 };
    if (u.includes('/extract-results/batch/')) return jsonResponse(200, { code: 0, data: { extract_result: [{ state: 'done', full_zip_url: 'https://zip.example/o2.zip' }] } });
    if (u === 'https://zip.example/o2.zip') return { ok: true, status: 200, arrayBuffer: async () => zip };
    throw new Error(`测试未覆盖：${u}`);
  };
  const client = new MineruClient({ token: 'sk-test-token-123456', fetchImpl });
  await client.parse({ bytes: Buffer.from('x'), filename: 'a.pdf', intervalMs: 1 });
  assert.equal(client.lastModelVersion, MINERU_MODEL_FALLBACK);
  assert.equal(MINERU_MODEL_FALLBACK, 'vlm');
});

test('state=failed → TASK_FAILED，不换模型重试（文件本身失败）', async () => {
  let batchCalls = 0;
  const fetchImpl = async (url) => {
    const u = String(url);
    if (u.endsWith('/file-urls/batch')) {
      batchCalls += 1;
      return jsonResponse(200, { code: 0, data: { batch_id: 'B3', file_urls: ['https://put.example/o3'] } });
    }
    if (u.startsWith('https://put.example/')) return { ok: true, status: 200 };
    return jsonResponse(200, { code: 0, data: { extract_result: [{ state: 'failed', err_msg: 'page limit exceeded' }] } });
  };
  const client = new MineruClient({ token: 'sk-test-token-123456', fetchImpl });
  await assert.rejects(() => client.parse({ bytes: Buffer.from('x'), filename: 'a.pdf', intervalMs: 1, timeoutMs: 300 }),
    (e) => e instanceof MineruError && e.code === 'TASK_FAILED');
  assert.equal(batchCalls, 1, '文件失败不换模型、不多花额度');
});

test('zip 里没有 full.md → NO_MARKDOWN（不返回半份结果）', async () => {
  const { fetchImpl } = makeHappyFetch([['layout.json', '{}']]);
  const client = new MineruClient({ token: 'sk-test-token-123456', fetchImpl });
  await assert.rejects(() => client.parse({ bytes: Buffer.from('x'), filename: 'a.pdf', intervalMs: 1 }),
    (e) => e instanceof MineruError && e.code === 'NO_MARKDOWN');
});

test('resolveToken：三处都没有 → NO_TOKEN（不静默匿名请求）', () => {
  assert.throws(() => resolveToken({ env: {} }), (e) => e instanceof MineruError && e.code === 'NO_TOKEN');
  assert.deepEqual(resolveToken({ token: ' sk-explicit-abc123 ', env: {} }).token, 'sk-explicit-abc123');
});
