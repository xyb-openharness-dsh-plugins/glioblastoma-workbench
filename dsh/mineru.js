/**
 * MinerU 云端解析客户端（M5，18 号 v2 §14 部件一）。
 *
 * 只走 HTTP API v4 四步（不包装本机 CLI）：
 *   ① POST /file-urls/batch 申请上传链接 → ② PUT 上传原件（**不设 Content-Type**）
 *   → ③ GET /extract-results/batch/{id} 轮询 → ④ GET full_zip_url 解包取 full.md。
 *
 * 边界（18 号 §1/§9）：
 * - Token 只从 settings.js（唯一实现）来：显式 > 密钥文件 > 环境变量；错误里只有来源与掩码；
 * - 默认模型 pipeline（家族统一）；**只有“接口不接受这个模型参数”才回退 vlm**，
 *   文件本身失败（TASK_FAILED，含 .html 的 -10002）不换模型重试；
 * - 401/403 → UNAUTHORIZED，不重试（Token 故障的出路见 settings 的三个动作）；
 * - zip 里没有 full.md 就是失败（NO_MARKDOWN），不返回半份结果当成功。
 */
import { readMineruToken } from './settings.js';
import { readZip } from '../lib/zip.js';

export const MINERU_BASE_URL = 'https://mineru.net/api/v4';
export const MINERU_MODEL_DEFAULT = 'pipeline';
export const MINERU_MODEL_FALLBACK = 'vlm';

export class MineruError extends Error {
  constructor(code, message, detail = null) {
    super(message);
    this.name = 'MineruError';
    this.code = code;
    this.detail = detail;
  }
}

export function maskToken(token) {
  const s = String(token ?? '').trim();
  if (!s) return '(空)';
  if (s.length <= 8) return '****';
  return `${s.slice(0, 3)}****${s.slice(-2)}`;
}

/** Token 解析：显式 > 文件 > env。三处都没有 → NO_TOKEN（不静默匿名请求）。 */
export function resolveToken({ token = null, env = process.env } = {}) {
  if (token && token.trim()) return { token: token.trim(), source: 'explicit', masked: maskToken(token) };
  const r = readMineruToken({ env });
  if (r.token) return { token: r.token, source: r.source === 'env' ? 'env:MINERU_TOKEN' : 'secret-file', masked: r.masked };
  throw new MineruError(
    'NO_TOKEN',
    '没有 MinerU Token：先在 设置 → 文档解析 里填写保存，或配置环境变量 MINERU_TOKEN。'
    + `申请/重置入口：https://mineru.net/apiManage/token`,
  );
}

/**
 * 模型回退判定（18 号 §9）：只有“接口不接受 model_version 这个参数/取值”才值得换模型重试。
 * 文件类型被拒（如 .html 的 -10002“cannot process html files”）是文件本身失败——
 * 换模型重试只是多烧一次额度，结论还是失败，不许回退。
 */
export function modelFallbackWorthy({ apiCode = null, message = '' } = {}) {
  const m = String(message);
  if (/html|file\s*type/i.test(m)) return false; // 文件问题，不是模型参数问题
  return /model[ _-]?version/i.test(m) || /模型版本/i.test(m)
    || (/invalid\s+(parameter|param)/i.test(m) && /model/i.test(m));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class MineruClient {
  /**
   * @param {object} opts
   * @param {string} [opts.token] 不给就按 resolveToken 顺序找
   * @param {string} [opts.baseUrl]
   * @param {Function} [opts.fetchImpl] 注入用（单测不联网）
   * @param {number} [opts.requestTimeoutMs]
   */
  constructor({
    token = null, baseUrl = MINERU_BASE_URL, fetchImpl = null,
    requestTimeoutMs = 60000, env = process.env,
  } = {}) {
    const resolved = resolveToken({ token, env });
    this.token = resolved.token;
    this.tokenSource = resolved.source;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    this.requestTimeoutMs = requestTimeoutMs;
    /** 最近一次 createUploadBatch 实际提交的模型（单测断言默认值用） */
    this.lastModelVersion = null;
  }

  get maskedToken() {
    return maskToken(this.token);
  }

  async #request(method, path, { body = null, raw = false } = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers = { Authorization: `Bearer ${this.token}`, Accept: '*/*' };
    if (body !== null && !raw) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body: raw ? body : body === null ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new MineruError('TIMEOUT', `MinerU 请求超时（${method} ${url}）`, { url });
      }
      const hint = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.https_proxy
        ? '；当前版本的内置请求不走系统代理（HTTP_PROXY/HTTPS_PROXY 已设置但不会生效）'
        : '';
      throw new MineruError('NETWORK', `请求 MinerU 失败：${error.message}${hint}`, { url });
    }

    if (response.status === 401 || response.status === 403) {
      throw new MineruError(
        'UNAUTHORIZED',
        `MinerU 拒绝了这个 Token（HTTP ${response.status}，来源 ${this.tokenSource}，key=${this.maskedToken}）。`
        + `申请/重置入口：https://mineru.net/apiManage/token`,
        { status: response.status },
      );
    }

    if (raw) {
      if (!response.ok) throw new MineruError('UPLOAD_FAILED', `上传文件失败：HTTP ${response.status}`);
      return null;
    }

    let json = null;
    try {
      json = await response.json();
    } catch {
      throw new MineruError('BAD_RESPONSE', `MinerU 返回的不是 JSON（HTTP ${response.status}）`, { url });
    }
    if (json?.code !== 0) {
      const message = String(json?.msg ?? '未知错误');
      const code = /token|auth|权限|登录/i.test(message) ? 'UNAUTHORIZED' : 'API_ERROR';
      const err = new MineruError(code, `MinerU 接口报错（code=${json?.code}）：${message}`, {
        apiCode: json?.code, traceId: json?.trace_id,
      });
      throw err;
    }
    return json;
  }

  /** ① 申请上传链接。返回 batchId 与一一对应的 PUT 地址。 */
  async createUploadBatch({
    files, enableFormula = true, enableTable = true, language = 'ch',
    modelVersion = MINERU_MODEL_DEFAULT, pageRanges = null,
  }) {
    if (!Array.isArray(files) || files.length === 0) {
      throw new MineruError('BAD_INPUT', 'createUploadBatch 需要至少一个文件');
    }
    const body = {
      enable_formula: enableFormula,
      enable_table: enableTable,
      language,
      model_version: modelVersion, // 显式写死，不把口径交给服务端默认（2026-10-22 家族决定）
      files: files.map((f) => ({ name: f.name, ...(f.dataId ? { data_id: f.dataId } : {}) })),
    };
    if (pageRanges) body.page_ranges = pageRanges;
    this.lastModelVersion = modelVersion;

    const json = await this.#request('POST', '/file-urls/batch', { body });
    const batchId = json?.data?.batch_id;
    const urls = json?.data?.file_urls;
    if (!batchId || !Array.isArray(urls) || urls.length !== files.length) {
      throw new MineruError('BAD_RESPONSE', '申请上传链接的返回不完整（缺 batch_id 或 file_urls 数量对不上）', {
        got: json?.data,
      });
    }
    return { batchId, uploadUrls: urls };
  }

  /** ② 上传原件：raw 通道，**不带 Content-Type**（设了会被拒）。 */
  async uploadFile(uploadUrl, bytes) {
    await this.#request('PUT', uploadUrl, { body: bytes, raw: true });
    return { ok: true };
  }

  /** ③ 查一次批次结果。 */
  async getBatchResult(batchId) {
    const json = await this.#request('GET', `/extract-results/batch/${batchId}`);
    const results = json?.data?.extract_result;
    if (!Array.isArray(results)) {
      throw new MineruError('BAD_RESPONSE', '批次结果里没有 extract_result 数组', { got: json?.data });
    }
    return results.map((r) => ({
      fileName: r.file_name ?? null,
      state: r.state ?? null,
      zipUrl: r.full_zip_url ?? null,
      errMsg: r.err_msg ?? null,
      progress: r.extract_progress ?? null,
    }));
  }

  /** ③ 轮询到全部结束（done / failed）或超时。 */
  async waitForBatch(batchId, { intervalMs = 3000, timeoutMs = 300000, onProgress = null } = {}) {
    const startedAt = Date.now();
    for (;;) {
      const results = await this.getBatchResult(batchId);
      if (onProgress) onProgress(results);
      const pending = results.filter((r) => r.state !== 'done' && r.state !== 'failed');
      if (pending.length === 0) return results;
      if (Date.now() - startedAt > timeoutMs) {
        throw new MineruError(
          'TIMEOUT',
          `等了 ${Math.round(timeoutMs / 1000)} 秒还没解析完（batch=${batchId}，仍在 ${[...new Set(pending.map((p) => p.state))].join('/')}）`,
          { batchId },
        );
      }
      await sleep(intervalMs);
    }
  }

  /** ④ 下载结果压缩包（内存态，不落盘）。 */
  async downloadZip(zipUrl) {
    let response;
    try {
      response = await this.fetchImpl(zipUrl, { signal: AbortSignal.timeout(this.requestTimeoutMs) });
    } catch (error) {
      throw new MineruError('NETWORK', `下载解析结果失败：${error.message}`, { zipUrl });
    }
    if (!response.ok) throw new MineruError('DOWNLOAD_FAILED', `下载解析结果失败：HTTP ${response.status}`, { zipUrl });
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * 完整跑一遍（四步 + 解包）。任一环节失败抛异常，**不返回半份结果**。
   * 模型回退：仅当接口报“不接受 model_version 参数”时，用 vlm 重试一次。
   */
  async parse({
    bytes, filename, intervalMs = 3000, timeoutMs = 300000,
    modelVersion = MINERU_MODEL_DEFAULT, language = 'ch',
  }) {
    if (!bytes || bytes.length === 0) throw new MineruError('BAD_INPUT', '文件内容为空，不提交解析');
    if (!filename || !filename.trim()) throw new MineruError('BAD_INPUT', '缺少文件名（MinerU 按扩展名判类型）');

    const runOnce = async (model) => {
      const { batchId, uploadUrls } = await this.createUploadBatch({
        files: [{ name: filename.trim() }], language, modelVersion: model,
      });
      await this.uploadFile(uploadUrls[0], bytes);
      const results = await this.waitForBatch(batchId, { intervalMs, timeoutMs });
      return { batchId, first: results[0] };
    };

    let out;
    try {
      out = await runOnce(modelVersion);
    } catch (e) {
      if (e instanceof MineruError && e.code === 'API_ERROR' && modelVersion !== MINERU_MODEL_FALLBACK
        && modelFallbackWorthy({ apiCode: e.detail?.apiCode, message: e.message })) {
        out = await runOnce(MINERU_MODEL_FALLBACK); // 仅这一种情况换模型
      } else {
        throw e;
      }
    }

    const first = out.first;
    if (first.state !== 'done') {
      throw new MineruError('TASK_FAILED', `MinerU 解析失败：${first.errMsg || first.state}`, { batchId: out.batchId });
    }
    if (!first.zipUrl) throw new MineruError('BAD_RESPONSE', '解析完成但没有返回 full_zip_url', { batchId: out.batchId });

    const zipBuffer = await this.downloadZip(first.zipUrl);
    let zip;
    try {
      zip = readZip(zipBuffer);
    } catch (error) {
      throw new MineruError('BAD_ZIP', `解析结果不是可读的 ZIP：${error.message}`, { batchId: out.batchId });
    }
    if (!zip.has('full.md')) {
      throw new MineruError('NO_MARKDOWN', `解析结果里没有 full.md（实际条目：${zip.names.slice(0, 8).join(', ')}）`, {
        names: zip.names,
      });
    }

    const markdown = zip.text('full.md');
    const contentListName = zip.names.find((n) => n.endsWith('_content_list.json')) ?? null;
    let contentList = null;
    if (contentListName) {
      try {
        contentList = JSON.parse(zip.text(contentListName));
      } catch (error) {
        throw new MineruError('BAD_CONTENT_LIST', `content_list 不是合法 JSON：${error.message}`, { contentListName });
      }
    }
    const pagesFromList = Array.isArray(contentList) && contentList.length
      ? Math.max(...contentList.map((item) => (Number.isInteger(item?.page_idx) ? item.page_idx + 1 : 0)))
      : null;

    return {
      batchId: out.batchId,
      zipUrl: first.zipUrl,
      markdown,
      contentList,
      pages: first.progress?.total_pages ?? pagesFromList ?? null,
      names: zip.names,
    };
  }
}

export function createMineruClient(options = {}) {
  return new MineruClient(options);
}
