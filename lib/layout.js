/**
 * 面板布局参数（M5）。本文件是面板参数的**唯一来源**（F3）：
 * - 宿主面板合同（PANEL）给 cordis.patch.yml / dsh 清单 / register 用；
 * - Agent 面板（页面内 AI 对话栏）的宽度档给 public/app.js 用——由服务端在
 *   渲染 index.html 时注入 `window.__WB_LAYOUT__`，页面里不许再出现第二份 25/35/45。
 *
 * 依据：docs/20-AGENT-PANE-DESIGN §2（customFrame 展开态 35%，可拖 25%–45%）、
 * prompts/DSH-AGENT-PANE-INTEGRATION（基线 35% / 25%–45% / 键盘与鼠标同精度）。
 * 本工作台走 customFrame（register 见 lib/client.js）：宿主不再按 businessWidth 分栏，
 * 但 register 仍校验取值区间，所以照样传合法值。
 */

/** 宿主面板参数（customFrame 下主要供注册校验与备案） */
export const PANEL = Object.freeze({
  businessSide: 'left',      // 业务区在左、原生会话在最右（家族统一，不许各仓自定）
  businessWidth: 0.65,       // 与 AGENT_PANE.default 互补（0.65 + 0.35 = 1）
  customFrame: true,
});

/** 宿主允许的 businessWidth 区间（越界 register 直接抛错） */
export const HOST_LIMITS = Object.freeze({ min: 0.25, max: 0.7 });

/** 页面内 AI 对话面板（右侧）的宽度档：百分比、键鼠同精度步进 */
export const AGENT_PANE = Object.freeze({
  side: 'right',
  min: 25,
  max: 45,
  default: 35,
  step: 2,          // 键盘 ←/→ 步进 = 拖动最小有效刻度（同精度）
  storageKey: 'gbm-starpal.agent.w',
});

/** 读回持久化宽度时必须过一遍夹取（旧版本/手改可能存了越界值） */
export function clampAgentWidth(w) {
  const n = Number(w);
  if (!Number.isFinite(n)) return AGENT_PANE.default;
  return Math.min(AGENT_PANE.max, Math.max(AGENT_PANE.min, Math.round(n * 10) / 10));
}

/** 注入页面的布局参数（唯一入口；public/app.js 只读它，不自带常量） */
export function clientLayout() {
  return {
    agentPane: { ...AGENT_PANE },
  };
}

/** 自检：返回问题清单，空数组表示合法。参数可注入，便于单测覆盖越界情形。 */
export function assertPanelConfig(config = PANEL, agent = AGENT_PANE) {
  const problems = [];
  if (!['left', 'right'].includes(config.businessSide)) {
    problems.push(`businessSide 只能是 left/right，当前 ${config.businessSide}`);
  }
  if (config.customFrame !== true) {
    problems.push('本工作台为可拖可收起必须 customFrame: true，当前不是');
  }
  const w = config.businessWidth;
  if (!(typeof w === 'number' && w >= HOST_LIMITS.min && w <= HOST_LIMITS.max)) {
    problems.push(`businessWidth 必须在 ${HOST_LIMITS.min}–${HOST_LIMITS.max} 之间，当前 ${w}`);
  }
  if (Math.abs(w + agent.default - 1) > 1e-9) {
    problems.push(`businessWidth(${w}) 与 AGENT_PANE.default(${agent.default}) 必须互补为 1`);
  }
  if (!(agent.min < agent.default && agent.default < agent.max)) {
    problems.push(`AGENT_PANE 必须 min < default < max，当前 ${agent.min}/${agent.default}/${agent.max}`);
  }
  if (agent.side !== 'right') problems.push('AI 面板固定在右侧（用户确认过），不许改');
  return problems;
}
