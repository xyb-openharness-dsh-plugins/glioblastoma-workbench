# 互动设计记录

状态：设计者待对齐。继承用户已明确的决定，未核实的配置素材不自动视为设计确认。
当前阶段/范围：designer-alignment → research → scenarios → specification → independent-review → prototype → implementation；已有项目从当前未决项继续，不重复重置。
设计提示词：docs/DESIGN-PROMPT.md；设计者章程：docs/DESIGNER-BRIEF.md；实际独立审查：docs/DESIGN-REVIEW.md。
权威内容：docs/BRIEF.md、docs/SPEC.md；UI 与数据设计链接：...

| 决策 ID | 待解决的问题 | 用户已确认内容/来源 | Agent 建议及原因 | 待确认项 | 确认人/日期 | 影响功能 ID |
| --- | --- | --- | --- | --- | --- | --- |
| DESIGN-01 | 移植样板 | lymphoma v0.3.0（用户 2026-10-24 AskUserQuestion 确认） | 同左；本地最新且结构对齐 | — | 已确认 | 全部 |
| DESIGN-02 | 服务主体 | 双主体并重（患者+照护者代记，用户同上） | 同左；ICC 代记证据支持双源标签 | 看板双入口形态细节 | 已确认 | F-DASH/F-CARE |
| DESIGN-03 | 病程覆盖 | 全病程含复发与照护决策/ACP 信息整理（用户同上） | 同左；84.1% 家属代决证据 → ACP 新诊断期即可用 | — | 已确认 | F-CARE/F-MRI |
| DESIGN-04 | MinerU 接入 | 本轮接入 18 号 v2 六部件（用户同上） | 同左 | — | 已确认 | F-SET/解析链 |
| DESIGN-05 | 品牌三变量 | — | 组织色 #2F5D8A 深青蓝 / 行动色家族橙 / 分区色 #8B87A3 雾紫灰；情绪=清晰理性+温和支持 | 品牌名（占位"小星宝 StarPal"） | **待 G1** | 全部 |
| DESIGN-06 | 页面树 10 线 27 页签 | — | PATIENT-FLOW 反推总表 + DIFF-MATRIX 全量（一级重名率 10%） | 线名/切分确认 | **待 G1** | 全部 |
| DESIGN-07 | 二期边界 | — | S14–S17 留二期（SCENARIOS） | 确认不进一期 | **待 G1** | — |
| DESIGN-08 | 录入双通道 | **AI 协助为默认、手工可及但入口收敛**（用户 2026-10-24 会话补充："大部分患者不懂数据库，编辑功能太多会让交互门槛更高"） | 已沉淀 docs/INTERACTION-DESIGN.md（场景路径 S01–S13 + CRUD 通道矩阵） | G1 时随包签认 | 用户已定原则，细节待 G1 | 全部录入交互 |

**G1 签认记录（2026-10-24）**：签认包 = SPEC v0.1 + SCENARIOS（S01–S17 含 S13b）+ PATIENT-FLOW + DIFF-MATRIX + USER-RESEARCH + INTERACTION-DESIGN + DEV-REQUIREMENTS-2026-10-24 + DESIGN-REVIEW（修订闭环）。**确认人：samqin123（用户），原话"确认"，渠道会话**。确认范围：① 页面树 10 线 29 页签（电场/随访影像独立成线、复诊与试验合并）② 品牌：占位名"小星宝 StarPal" + 深青蓝组织色 ③ 二期边界 S14–S17 不进一期。评审 P0×2 已修复留痕（commit 66f18de/0995ccc）。
**G2 签认记录（2026-10-24）**：原型 prototypes/v0.2（git 0995ccc 修订版，app.js sha256 901c7cb5…）60 截图 + 71/71 断言 + 独立视觉抽查通过。**确认人：samqin123（用户），同批"确认"**。允许实施范围：全部 30 (view,sub) + 设置 3 页签；MinerU 资料档案页为静态示意，M5 按 18 号 v2 实装。旧版（评审前 27 页签版）冻结保留于 git 6721109。
**G3 冻结记录（2026-10-24）**：schema/0001_initial.sql（27 表）内存实测通过，sha256 \`8b08f68f0029b48cc06afb11c3c06e3f9c65b4cae2c4fab7e6761b04ac514ac0\` 落入 schema/freeze-contract.md；此后结构变更只增 000N 迁移。

本轮已写入的章节：...
下一轮最关键的问题（1–3 个相关问题）：...
确认时展示的原型版本/hash、实际预览方式：...
变更：旧决定 → 新决定、原因、受影响数据/API/原型/验收项：...

用户回答后由 Agent 更新对应文档；本记录只保留决策和指向，不重复复制完整需求。

HTML原型关口：路径/版本/hash、实际预览证据、用户确认范围/原话/日期；未确认则业务开发待开始。
数据演进关口：SCHEMA变化矩阵、领域/流程/读模型边界、兼容与迁移未决项。
