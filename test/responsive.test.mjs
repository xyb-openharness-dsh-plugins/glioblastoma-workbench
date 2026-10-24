/**
 * 窄宽自适应回归（0.1.5）。
 *
 * 背景：AI 会话面板打开后业务区只剩 60%–75% 宽，看板「最近 KPS / MRI / 激素」三块
 * 被压成一列列竖排单字；营养页「语境一 · 激素期：」同病。根因都是**卡内横向排列**
 * （标签、值、说明并排）在窄容器里被压到每项只剩一两字宽。
 *
 * 这里只锁"结构性规则"，像素级效果交给 `npm run probe:resp` 在真实 Chrome 里量。
 * 规则与取值见 docs/RESPONSIVE-RULES.md。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(join(ROOT, 'public', 'style.css'), 'utf8');

const rule = (selector) => {
  const at = css.indexOf(`${selector}{`);
  assert.ok(at > 0, `找不到规则 ${selector}`);
  const end = css.indexOf('}', at);
  return css.slice(at + selector.length + 1, end);
};

test('看板「最近变化」三块：卡内纵向，不许横排', () => {
  const body = rule('.change-strip .chg');
  assert.match(body, /flex-direction:column/, '标签/值/注必须纵向堆叠，横排会在窄宽下被压成竖排单字');
  assert.match(body, /min-width:0/, '必须允许收缩，否则窄宽下撑破容器');
  assert.ok(!/flex:1(?!\d)/.test(rule('.change-strip')), '外层不要再用 flex:1 让宽度由内容牵动');
});

test('看板「最近变化」用 grid 定列宽，且按钮不参与挤占', () => {
  const body = rule('.change-strip');
  assert.match(body, /display:grid/);
  assert.match(body, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\) auto/, '三块等分 + 按钮列自适应');
});

test('窄宽断点：1180 降 2 列、900 降 1 列', () => {
  const at1180 = css.indexOf('@media(max-width:1180px)');
  const at900 = css.indexOf('@media(max-width:900px)');
  assert.ok(at1180 > 0 && at900 > 0);
  const block1180 = css.slice(at1180, at900);
  const block900 = css.slice(at900, css.indexOf('@media(max-width:600px)'));
  assert.match(block1180, /\.change-strip\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(block900, /\.change-strip\{grid-template-columns:minmax\(0,1fr\)\}/);
});

test('说明列表（flag-list）不能用 flex 包住行内标签', () => {
  const body = rule('.flag-list div');
  assert.ok(!/display:flex/.test(body), 'flex 会把 <b>标签</b> 变成可收缩项，窄宽下逐字竖排');
  assert.match(body, /padding-left:14px/, '圆点改用绝对定位后，正文要让出位置');
  assert.match(rule('.flag-list div::before'), /position:absolute/);
});
