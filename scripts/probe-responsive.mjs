#!/usr/bin/env node
/**
 * 窄宽自适应探针（0.1.5）。
 *
 * 背景：AI 会话面板打开后业务区只剩 60%–75% 宽，看板的「最近 KPS / 最近 MRI / 最近激素」
 * 三块被压成一列列竖排单字（用户截图）。根因不是断点不够，而是卡内**横向排列**
 * （标签 / 值 / 注并排）在窄容器里被压到每列只剩一两字宽。
 *
 * 判定规则（可复用，别的病种工作台也能照这套扫）：
 * 1. `正文竖排`：元素宽度 < 3em 且文本 ≥ 6 字 → 说明一行只放得下 1–2 个字，必是挤压；
 * 2. `横向溢出`：body.scrollWidth > innerWidth + 1（页面被撑出横向滚动）；
 * 3. `溢出容器`：元素 scrollWidth > clientWidth + 2 且没有 overflow 滚动（内容被裁）。
 *
 * 默认 8 档宽度（1300→620）× 10 个一级页：1300 = 面板收起，940 = AI 面板开（业务宽约 65%），
 * 780/620 = 窄窗与手机。可用 GBM_RESP_WIDTHS / GBM_RESP_PAGES 覆盖。
 *
 * 用法：`node scripts/probe-responsive.mjs`；退出码 0/1。依赖本机 Chrome。
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkbenchServer } from '../dsh/server.js';
import { launchChrome, sleep, stopChrome } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs', 'shots', 'dev');
mkdirSync(SHOTS, { recursive: true });
const CDP_PORT = Number(process.env.GBM_RESP_CDP_PORT || 9347);
const WIDTHS = (process.env.GBM_RESP_WIDTHS || '1300,1100,1000,940,860,780,700,620').split(',').map(Number);
const PAGES = (process.env.GBM_RESP_PAGES || 'dash,tumor,chemo,ttf,mri,lab,symptom,nutrition,care,followup').split(',');

const dir = mkdtempSync(join(homedir(), '.xyb-gbm-resp-'));
const app = createWorkbenchServer({ dbPath: join(dir, 'xyb-glioblastoma.sqlite') });
const server = await app.listen(0);
const PORT = server.address().port;

/* 页内扫描：返回竖排/溢出嫌疑元素。规则写在一处，页面里也照这个跑。 */
const SCAN = `(() => {
  const bad = [];
  const em = (el) => parseFloat(getComputedStyle(el).fontSize) || 12;
  const textOf = (el) => (el.textContent || '').replace(/\\s+/g, '');
  const walk = document.querySelectorAll('#main *');
  for (const el of walk) {
    if (el.closest('svg') || el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const text = textOf(el);
    // 只看"直接承载文字"的元素，避免父容器重复计数
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\\s+/g, '');
    if (own.length < 6) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.width < em(el) * 3) {
      bad.push({ kind: '竖排单字', sel: el.className || el.tagName, w: Math.round(rect.width), text: own.slice(0, 18) });
    }
  }
  const overflow = [];
  for (const el of document.querySelectorAll('#main *')) {
    const cs = getComputedStyle(el);
    // 只算"真的会把文字裁掉"的容器：overflow 可见的溢出不是裁切（如装饰圆环、阴影）；
    // 横向可滚动的容器是有意为之（表格、长路径），单独由 .scroll-hint 提示。
    if (!['hidden', 'clip'].includes(cs.overflowX) && !['hidden', 'clip'].includes(cs.overflow)) continue;
    if (!(el.textContent || '').trim()) continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.display !== 'inline') {
      overflow.push({ sel: el.className || el.tagName, scrollW: el.scrollWidth, clientW: el.clientWidth });
    }
  }
  return JSON.stringify({
    bodyScrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    vertical: bad.slice(0, 12),
    clipped: overflow.slice(0, 8),
  });
})()`;

const ch = await launchChrome({ port: CDP_PORT });
const { cdp } = ch;
const problems = [];
const report = {};

try {
  for (const width of WIDTHS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const page of PAGES) {
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/#${page}` });
      await sleep(220);
      // 等首屏渲染完成
      for (let i = 0; i < 40 && !(await cdp.eval("document.body && document.body.getAttribute('data-booted') === '1'")); i += 1) await sleep(120);
      await sleep(200);
      const raw = await cdp.eval(SCAN);
      const data = JSON.parse(raw || '{}');
      const key = `${width}/${page}`;
      report[key] = data;
      if (data.bodyScrollW > data.innerW + 1) {
        problems.push(`${key}：横向溢出 scrollWidth=${data.bodyScrollW} > innerWidth=${data.innerW}`);
      }
      for (const v of data.vertical || []) problems.push(`${key}：竖排单字 .${v.sel} 宽 ${v.w}px 「${v.text}」`);
      for (const c of data.clipped || []) problems.push(`${key}：内容被裁 .${c.sel} ${c.scrollW}>${c.clientW}`);
      if (width === 940 && page === 'dash') {
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(SHOTS, 'responsive-940-dash.png'), Buffer.from(shot.data, 'base64'));
      }
    }
  }
} catch (error) {
  problems.push(`探针异常：${error?.message ?? error}`);
} finally {
  await stopChrome(ch);
  server.close();
}

console.log(JSON.stringify({ ok: problems.length === 0, problems, report }, null, 2));
process.exit(problems.length === 0 ? 0 : 1);
