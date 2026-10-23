# HTML 交互原型确认记录（PROTOTYPE-REVIEW）· v0.2

状态：**已确认（G2 已签，2026-10-24）**。签认人 samqin123（用户，会话原话"确认"）；允许实施范围：全部 30 (view,sub) + 设置 3 页签。旧版（27 页签）冻结于 git 6721109。

- HTML 实际路径/版本/SHA-256：`prototypes/v0.2/`，git `66f18de+`（2026-10-24 评审修订版），app.js `901c7cb5…292dc5f9a07c`（133,191 字节）
- 当前 SPEC/场景/数据模型版本：SPEC v0.1 + SCENARIOS S01–S17（含 S13b）+ PATIENT-FLOW（10 线 29 页签，评审修订后）+ INTERACTION-DESIGN v1 + schema/draft/0001
- 预览环境：`file://` 直开（零依赖）；无头走查 1440×900 + 390px 双档，2026-10-24
- 模拟数据界限：demo-data.js 为唯一源（build-demo-data.mjs 生成）；AI 面板为静态候选卡演示，未接宿主会话；MinerU 未接（M5）
- 视图：10 一级 + 29 二级 = 30 (view,sub) + 设置 3 页签；核心任务按 INTERACTION-DESIGN §二 13 条路径可走通

## 自验数字（构建方无头走查）

截图 56 张（28×2 档案）；横向溢出 **0**；error **0** / 4xx **0**；断言 **62/62**；面板宽度 25%–45% 实测钳制；一图秀 2 数值线+KPS 分类节点（无 path、末点避让、归一化水印）；禁词 **0**（源码+渲染）；private 三出口过滤 + 导出披露"已隐藏 N 条"；未检测=虚线徽章；DEMO-2 电场空态。

## 独立视觉抽查（2026-10-24）

- mri-parallel-demo1：**通过**（三卡并排、"本页不做判读"常驻、原文引用可区分、无倾向文案）。
- dash-main-demo1：**通过**（双主体 8 入口对称、四点位完整、深青蓝到位、无禁词）。
- 记入 G2 走查清单：关键变化条信息密度偏高（真机确认）；血象提醒卡一处文字目视核对。

## 一图秀核对（ONE-CHART-SPEC C1–C12）

数值线独立归一化 ✅；分类序列只节点不连线 ✅；末点 13px 避让 ✅；治疗条分层（surgery 点/放疗段/TMZ 周期/电场周带）✅；单点不连线 ✅；≤4 指标 ✅；归一化水印 ✅。**挂载位置偏离**：当前在 指标与用药·血象 顶部，家族惯例为独立一级页 → G1 待决（建议挂为"看板"唯一二级，见下）。

## 已知遗留

1. ~~一图秀挂载位~~ **已修复（评审 P0-②）**：独立页签 lab·病情一图 + 看板一步入口；lab·blood 原位移除（断言 chart-panel=0）。
2. ~~资料库断链~~ **已修复（评审 P0-①）**：followup·资料档案（三态文档列表 + 导入 toast + 候选核对示意卡）。
3. 「⋯ 更多」手工补/改为 toast 级演示；真实表单 6 个（发作/MRI/认知/话题/问题/感受）——M5 补全。
4. AI 面板静态候选卡；M5 接宿主，降级路径按家族契约。
5. 面板宽度/内存态刷新重置（原型约定）。
6. 资料档案列表与候选卡为静态示意（未接真实解析，按契约——M5 MinerU 六部件）。

## 评审修订版自验（2026-10-24）

截图 60 张（30 组合 × 2 档案，全量重拍）；断言 **71/71**；error 0 / 4xx 0 / 溢出 0；aria-selected 与内容指纹 0 失败。

| 模块/功能ID | 对应 HTML | 实际走查证据 | 用户确认依据/人/日期 | 未确认项 | 允许实施范围 |
| --- | --- | --- | --- | --- | --- |
| F-DASH | dash-main ×2 档案 | dash-main-demo{1,2}.png | **待 G2** | 入口密度 | — |
| F-TUMOR | tumor-molecular/surgery/pathology | 6 张 | **待 G2** | — | — |
| F-CHEMO | chemo-stupp/cycles/changes | 6 张 | **待 G2** | — | — |
| F-TTF | ttf-wear/arrays/usage | 6 张（DEMO-2 空态） | **待 G2** | — | — |
| F-MRI | mri-parallel/questions/archive | 6 张 | **待 G2** | — | — |
| F-LAB | lab-blood/steroid/metabolic | 6 张 | **待 G2** | 一图秀挂载位 | — |
| F-SYM | symptom-seizure/edema/risks | 6 张 | **待 G2** | — | — |
| F-NUT | nutrition-intake/concerns | 4 张 | **待 G2** | — | — |
| F-CARE | care-feelings/cognition/decisions | 6 张 | **待 G2** | — | — |
| F-FU | followup-schedule/prepare/trials/enrolled | 8 张 | **待 G2** | — | — |
| F-SET | 设置弹窗 3 页签 | 走查含 | **待 G2** | MinerU 三态实测（M5） | — |

版本号显示（P1）：原型页脚展示 0.1.0-demo；三处同源在 M5 build-version 后核验。
用户反馈及修订：待 G2。
