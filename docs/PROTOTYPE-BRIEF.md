# prototypes/v0.2 构建任务书（M2 · G2 前置）

> 本文件是原型构建的完整契约。构建完成后本文件改作 PROTOTYPE-REVIEW 的底稿。
> 数据源：`demo/build-demo-data.mjs`（已生成 `prototypes/v0.2/demo-data.js`，禁止手改 demo-data.js）。

## 1. 交付物（四件套）

`prototypes/v0.2/{index.html, style.css, app.js, demo-data.js}`——`file://` 直接可开、无构建、无外部依赖（CDN 禁用；图标全内联 svg 带宽高）。

## 2. 骨架来源与换肤规则

- 骨架抄 `/Users/qinxiaoqiang/Downloads/lymphoma-workbench/prototypes/v0.1/`（index.html 结构、style.css 令牌骨架、app.js 的 PAGES/SUBPAGES 常量结构、state 模型、navigate/subnav、hash 路由、一图秀 SVG 段、3D 指标卡段）。
- **只换 3 个品牌变量 + 品牌字 + 英文名**（ZERO-TO-DEV §1.4）：
  - 组织色 → 深青蓝 `#2F5D8A`（沉稳，神经语境；接替薄荷绿的组织职能）
  - 行动色 → 家族橙沿用（行动语义跨家族一致，找到骨架中的 accent 值照抄）
  - 低强度分区色 → 雾紫灰 `#8B87A3`
  - 品牌字「小星宝 StarPal」（占位名），英文名 `glioblastoma`，页脚判读归属句换"判读归神经影像与治疗团队"。
- taste 决策（已定，勿再改）：情绪=清晰理性（主）+温和支持（辅）；颜色 ≤4 原则沿用家族语义 token。

## 3. 页面树（唯一权威，10 一级 / 27 二级 + 设置弹窗）

| 一级（key） | 二级（sub key） | 每页核心内容契约 |
| --- | --- | --- |
| 看板 dash | —（无二级） | 定调条（stageLine）→ 双主体 4 入口（本人：今天 D 几/该不该吃、血象提醒、下次复查；照护者：贴片换了吗、今天他该做什么）→ 关键变化条（最近 KPS/MRI/激素变化）→ 接下来 4 指标卡 |
| 我的瘤 tumor | molecular / surgery / pathology | molecular：8 项三态卡（检出/未检出/未检测不同徽章，未检测≠阴性常驻句）+ 人话解释 + method/date；surgery：GTR/STR + 术中记录；pathology：报告原文逐项（Ki-67 值等） |
| 放化疗日历 chemo | stupp / cycles / changes | stupp：28 天日历网格高亮 D1–5 + 放疗 30 次计数条；cycles：周期表（计划/实际/顺延原因）；changes：方案变更留痕 |
| 电场治疗 ttf | wear / arrays / usage | wear：日佩戴条形 + 周统计 + ≥18h 目标语境线（目标解释常驻"由治疗团队解释"）；arrays：贴片更换与头皮反应时间线；usage：月度使用率 |
| 随访影像 mri | parallel / questions / archive | parallel：历次 MRI 并排卡（结论原文/当时激素/当时 KPS），**禁任何判读字段**；questions：问题清单（可编辑、可勾已问）；archive：报告登记列表 |
| 指标与用药 lab | blood / steroid / metabolic | blood：WBC/ANC/PLT/HGB 指标卡（3D 翻转，背面参考区间）CTCAE 徽章；steroid：激素 mg/日 阶梯时间线与症状并排；metabolic：肝肾电解质 |
| 症状与发作 symptom | seizure / edema / risks | seizure：发作事件卡（类型/时长/诱因/witnessedBy 双主体徽章）+ AED 清单，独立轨道；edema：症状与激素同轴；risks：感染/血栓记录 |
| 营养与体重 nutrition | intake / concerns | 体重线 + 进食记录；激素期"胃口大开体重涨" vs 疾病期"吃不下"双语境三说明（只记事实） |
| 照护与家事 care | feelings / cognition / decisions | feelings：viewpoint 卡（visibility=private 徽章，作者角色徽章 PATIENT/CAREGIVER）；cognition：认知变化事件 + MoCA 分并列（不做趋势线）；decisions：决策话题清单（open/discussed/filed 三态）+ ACP 信息整理（不出建议） |
| 复诊与试验 followup | schedule / prepare / trials / enrolled | schedule：8–12 周 MRI 节奏语境；prepare：fact/view 两区导出预览（private 自动过滤，首行"不是医生结论"）；trials：线索卡（只写药名/期别+"登记状态，未核实"常驻）；enrolled：已收藏 |
| 设置（弹窗） | workspace / parse / data | 资料目录状态 / MinerU Token 三态（未配置文案含"TXT/MD/CSV 仍本机解析"）/ 临床数据包来源与版本（本 demo 数据截止 2026-10-24，四通道终态如实） |

## 4. 一图秀（16 号合同）

数值线（WBC、DEXA/WEIGHT/NA 各档案 2 条）+ 治疗条分层：surgery（点）/ 放疗段（条）/ TMZ 周期（28 天条 D1–5 标记）/ 电场佩戴（周聚合带）；KPS 为分类序列**只画节点不连线**；单调三次插值、末点 13px 三向避让、独立归一化、≤4 指标、单点不连线。

## 5. 四必查件（自验，逐条出数字）

1. 页签穷举：每个 (view, sub) 一一对应，`aria-selected` 与内容指纹匹配；**不能先抓完按钮再点**（render() 重建 DOM）。
2. 右上角 AI 面板能开/收起/调宽（25%–45%），`#agent-splitter`/`#agent-hide`/`#agent-label` 齐全。
3. 一图秀按 §4 合同。
4. 3D 指标卡整卡 180° 翻转、背面迷你折线；分类记录不翻不连线。
另：`body.scrollWidth === window.innerWidth`（无横向溢出）；控制台 0 error；0 个 4xx；页脚贴底；`[hidden]{display:none!important}`；字号基线 12.5px/大字 15px。

## 6. 双主体与红线（产品红线，违反即返工）

- 代记徽章：seizure witnessedBy、viewpoint author_role 显式显示。
- private 内容三出口过滤：一图秀/看板摘要/导出预览都不出现 visibility=private 的 viewpoint 内容（写一个 `sharedOnly()` 过滤函数三处引用）。
- 文案红线禁词：建议治疗/可能复发/可以停药/无需就医/推荐方案/治愈率/生存率；"复发"只允许出现在引用报告原文的语境（如 stageLine"复发评估期"是引用医生语境，需走 wording-allow 白名单思路——原型阶段先确保不出现在产品自己的建议性句子中）。
- 无判读：MRI 并列页不出现"更像假性进展/提示进展"类文案；问题清单是"患者想问的"不是"产品判断的"。
- 空态：DEMO-2 的电场线全空（ttfields.started=null）——空态文案"未开始电场治疗（是否适用由治疗团队解释）"，不许编数据。

## 7. 验收命令

浏览器直开 `file:///Users/qinxiaoqiang/Downloads/glioblastoma-workbench/prototypes/v0.2/index.html`；切换档案 DEMO-1/DEMO-2 各走一遍页面树；无头走查可用 `npx playwright` 或系统 Chrome headless（截图存 `docs/shots/`，命名 `{view}-{sub}-{profile}.png`）。
