/**
 * 解析编排（M5，18 号 v2 §14 部件四）：读原件 → 调 MinerU → 事务写候选 + 置状态。
 *
 * 失败语义（§9，事务原子）：
 * - 候选写入 + document=parsed + job=succeeded 同一事务；
 * - 任一步失败：事务回滚（候选 0 条）、document=parse_failed、job=failed（错误码与原文留在任务行）；
 * - 重试**新增一条** parse_job 行，旧失败记录留着（历史不重置）；
 * - “解析中”不写进 document.status（库里只有 pending/parsed/parse_failed 三个终态）。
 *
 * 文件白名单与实测一致：`.html` 拒收（-10002）；`.txt/.md/.csv` 本版本未接本地解析，
 * 如实报错，不假装能解析。
 */
import { createHash } from 'node:crypto';
import { extractCandidates } from './gbmparse.js';
import { SettingsError } from './settings.js';

const CLOUD_OK = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff']);
const LOCAL_ONLY = new Set(['.txt', '.md', '.csv']);

export class ParseError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'ParseError';
    this.code = code;
    this.status = status;
  }
}

export const maxImportBytes = 200 * 1024 * 1024; // 18 号 §11：单文件 200MB

function extOf(name) {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name ?? ''));
  return m ? `.${m[1].toLowerCase()}` : '';
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {object} opts today() 日期源；makeClient() 造 MinerU 客户端（测试注入假客户端）
 */
export function createParseService(db, { today = () => new Date().toISOString(), makeClient = null } = {}) {
  const q = (sql, ...a) => db.prepare(sql).all(...a);
  const one = (sql, ...a) => db.prepare(sql).get(...a) ?? null;
  const run = (sql, ...a) => db.prepare(sql).run(...a);

  function importDocument({ profileId, filename, bytes, mime = null }) {
    if (!bytes || bytes.length === 0) throw new ParseError('EMPTY_FILE', '文件内容为空', 400);
    if (bytes.length > maxImportBytes) {
      throw new ParseError('TOO_LARGE', `文件超过上限（${Math.round(maxImportBytes / 1024 / 1024)} MB）`, 413);
    }
    const name = String(filename ?? '原件');
    const ext = extOf(name);
    if (ext === '.html' || ext === '.htm') {
      // 18 号 v2：v4 批量接口拒收 HTML（-10002）——留着一个一定失败的入口等于骗用户
      throw new ParseError('HTML_NOT_SUPPORTED', '不支持导入 .html 文件（云端解析通道不接收 HTML）；请另存为 PDF 后再试。', 400);
    }
    if (LOCAL_ONLY.has(ext)) {
      throw new ParseError('LOCAL_PARSE_NOT_READY', `${ext} 属于本机解析文件；本版本尚未接入本地解析通道，请先不要导入。`, 400);
    }
    if (!CLOUD_OK.has(ext)) {
      throw new ParseError('BAD_TYPE', `不支持的文件类型 ${ext || '(无扩展名)'}；云端通道支持 PDF / 图片。`, 400);
    }

    const sha = createHash('sha256').update(bytes).digest('hex');
    // 重复导入按 (主体, 文件哈希) 去重：不新建文档、不重置已解析状态（§9）
    const existing = one(
      'SELECT id, file_name, status, imported_at FROM document WHERE profile_id = ? AND file_name = ? AND sha256 = ?',
      profileId, name, sha,
    );
    if (existing) {
      return { documentId: existing.id, deduped: true, status: existing.status };
    }
    const t = today();
    const info = run(
      'INSERT INTO document (profile_id, file_name, sha256, status, imported_at, ord) VALUES (?, ?, ?, ?, ?, 0)',
      profileId, name, sha, 'pending', t,
    );
    const docId = Number(info.lastInsertRowid);
    run('INSERT INTO import_file (document_id, byte_size, mime, in_use) VALUES (?, ?, ?, 1)', docId, bytes.length, mime);
    return { documentId: docId, deduped: false, status: 'pending' };
  }

  /** 文档列表 + 解析任务历史 + 未决候选。 */
  function listDocuments(profileId) {
    const docs = q('SELECT id, file_name, status, imported_at FROM document WHERE profile_id = ? ORDER BY rowid', profileId);
    return docs.map((d) => ({
      id: d.id,
      fileName: d.file_name,
      status: d.status,
      importedAt: d.imported_at,
      jobs: q('SELECT id, requested_at, state, error_code, error_message FROM parse_job WHERE document_id = ? ORDER BY rowid', d.id),
      candidates: q('SELECT id, field_name, value_text, value_num, unit, confirmed, confirmed_at FROM candidate WHERE parse_job_id IN (SELECT id FROM parse_job WHERE document_id = ?) ORDER BY rowid', d.id),
    }));
  }

  /**
   * 跑一次解析（一次 HTTP 事务语义，不是数据库事务挂网络：网络段在事务外，
   * 落库段一个事务——失败时库里只会多一行 failed 任务，候选 0 条）。
   */
  async function runParse({ documentId, bytes, filename, client = null }) {
    const doc = one('SELECT * FROM document WHERE id = ?', documentId);
    if (!doc) throw new ParseError('NO_DOCUMENT', `原件不存在：${documentId}`, 404);
    if (!bytes || bytes.length === 0) throw new ParseError('NO_FILE', '原件文件不在了（资料目录可能被移动）；重新导入一次即可', 409);

    const jobInfo = run(
      'INSERT INTO parse_job (document_id, requested_at, state) VALUES (?, ?, ?)',
      documentId, today(), 'running',
    );
    const jobId = Number(jobInfo.lastInsertRowid);

    let parsed;
    try {
      const mineru = client ?? makeClient?.() ?? null;
      if (!mineru) throw new ParseError('NO_CLIENT', '未配置解析客户端（内部错误）', 500);
      parsed = await mineru.parse({ bytes, filename: filename ?? doc.file_name });
    } catch (e) {
      const code = e?.code && typeof e.code === 'string' ? e.code : 'TASK_FAILED';
      run('UPDATE parse_job SET state = ?, error_code = ?, error_message = ? WHERE id = ?',
        'failed', code, String(e?.message ?? e), jobId);
      run("UPDATE document SET status = 'parse_failed' WHERE id = ?", documentId);
      // 失败不产候选（候选 0 条、不静默降级）；错误前缀只留最外层一句
      return { documentId, jobId, state: 'failed', errorCode: code, error: String(e?.message ?? e) };
    }

    const cands = extractCandidates(parsed.markdown);
    db.exec('BEGIN');
    try {
      for (const c of cands) {
        run(
          'INSERT INTO candidate (parse_job_id, field_name, value_text, value_num, unit, confirmed, confirmed_at, target_table, target_id) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, NULL)',
          jobId, c.fieldName, c.valueText, c.valueNum, c.unit, 'metric_point',
        );
      }
      run("UPDATE document SET status = 'parsed' WHERE id = ?", documentId);
      run("UPDATE parse_job SET state = 'succeeded' WHERE id = ?", jobId);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      run('UPDATE parse_job SET state = ?, error_code = ?, error_message = ? WHERE id = ?',
        'failed', 'WRITE_FAILED', String(e?.message ?? e), jobId);
      run("UPDATE document SET status = 'parse_failed' WHERE id = ?", documentId);
      return { documentId, jobId, state: 'failed', errorCode: 'WRITE_FAILED', error: String(e?.message ?? e) };
    }
    return { documentId, jobId, state: 'succeeded', candidates: cands.length, markdownChars: parsed.markdown.length };
  }

  /**
   * 候选核对：accept = 逐项确认（写事实层 metric_point；接受≠审核，无审核字段）；
   * reject = 不用这条（零副作用删除该候选行）。
   */
  function decideCandidate({ candidateId, action }) {
    const c = one(
      `SELECT c.*, j.document_id, d.profile_id FROM candidate c
       JOIN parse_job j ON j.id = c.parse_job_id JOIN document d ON d.id = j.document_id
       WHERE c.id = ?`, candidateId,
    );
    if (!c) throw new ParseError('NO_CANDIDATE', `候选不存在：${candidateId}`, 404);
    if (c.confirmed === 1) return { candidateId, already: 'confirmed' };
    if (action === 'reject') {
      run('DELETE FROM candidate WHERE id = ?', candidateId);
      return { candidateId, rejected: true };
    }
    if (action !== 'accept') throw new ParseError('BAD_ACTION', `action 只能是 accept / reject，收到 ${action}`, 400);

    run('BEGIN');
    try {
      run('UPDATE candidate SET confirmed = 1, confirmed_at = ? WHERE id = ?', today(), candidateId);
      // 指标类候选 → 事实层（value_num 可为空：不等式候选只抄原文）
      if (c.target_table === 'metric_point' && c.field_name) {
        const def = one('SELECT code FROM metric_def WHERE label = ?', c.field_name);
        if (def) {
          run(
            'INSERT INTO metric_point (profile_id, code, measured_at, value_num, value_text, source_note, revision) VALUES (?, ?, ?, ?, ?, ?, 1)',
            c.profile_id, def.code, today().slice(0, 10), c.value_num, c.value_text, `文档解析候选核对（${c.field_name}）`,
          );
        }
      }
      run('COMMIT');
    } catch (e) {
      run('ROLLBACK');
      throw e;
    }
    return { candidateId, confirmed: true };
  }

  /** 供路由把 SettingsError 翻成 400/500（文件坏 = 环境问题，不归用户）。 */
  function mapError(e) {
    if (e instanceof ParseError) return { status: e.status, code: e.code, message: e.message };
    if (e instanceof SettingsError) {
      return { status: e.code === 'settings_write_failed' ? 500 : 400, code: e.code, message: e.message };
    }
    return { status: 400, code: 'PARSE_FAILED', message: String(e?.message ?? e) };
  }

  return { importDocument, listDocuments, runParse, decideCandidate, mapError };
}
