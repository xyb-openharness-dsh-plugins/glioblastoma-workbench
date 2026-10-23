# 设计独立审查记录（DESIGN-REVIEW）

## 评审元信息

| 项 | 值 |
| --- | --- |
| 轮次 | 1（G1 前独立评审） |
| 实际模型 | GLM-5.3（account:zai-start-plan） |
| 推理档位 | max |
| 审查人/Agent | 独立子代理（与设计主线隔离；非设计者自审） |
| 日期 | 2026-10-24 |
| 对象版本 | git HEAD `6721109`（G1 签认包组装态） |
| 输入范围 | SPEC.md / SCENARIOS.md / PATIENT-FLOW.md / INTERACTION-DESIGN.md / DIFF-MATRIX.md / USER-RESEARCH.md + research-notes/user-research.md（§2/§3/§8/§9 抽查）/ DEV-REQUIREMENTS-2026-10-24.md；基准：26-CANCER-FEATURE-LINES.md、22-PHASES-AND-GATES.md、prompts/NEW-CANCER-WORKBENCH.md §七 |
| 检验项 | NEW-CANCER-WORKBENCH §七 12 项 + 用户补充 2 项（⑧医学来源、⑬交互门槛），共 13 项 |
| 结论 | **需修订后签**（P0×2，均为签认包内部一致性修复，无方向性重做） |

---

## 一、逐项结论表（13 项）

| # | 检验项 | 结论 | 要点与证据 |
| --- | --- | --- | --- |
| ① | 是否以医生任务冒充患者需要 | **PASS** | 页面树由三流反推（PATIENT-FLOW:5-6,31-46），每条线挂患者原话（DIFF-MATRIX:18-29）；lymphoma 的「疗效评估」等医生侧二级已剔除（DIFF-MATRIX:37 对照可见）；KPS/GTR/STR 均按「医生写下的话」框架做事实陈列而非评估任务（PATIENT-FLOW:10-11） |
| ② | 患者证据是否成立（0 访谈如实标注） | **PASS** | USER-RESEARCH:4「未做真实访谈」+ §一表「真实访谈 0」（USER-RESEARCH.md:10）；素材层诚实声明与引语纪律齐备（research-notes/user-research.md:6-7）；SCENARIOS 各行 ⏳/设计假设标注到位（SCENARIOS:13,19,37,61 等）。保留见 P1-3（「患者原话」栏目名与设计假设句的张力） |
| ③ | 是否把解释价值过度收紧成记录本 | **WARN** | 解释价值主体保留：S01 每项标志物人话解释+「解释不是判断」常驻（SCENARIOS:11）、S04 预生成患者真会问的问题（SCENARIOS:29）、AI 通道含术语候选与问题清单建议（INTERACTION-DESIGN:10,81）。但「复发后还有哪些路（卫健委 9 类选项）」的信息内容落点不明：USER-RESEARCH:34 称「复发页只列存在哪些路」，页面树无复发页，S07 是讨论话题清单非治疗选项教育（见 P1-2） |
| ④ | 营养/心理/照护是否只有名称没有内容 | **WARN** | 照护最实：S07 全路径+三态话题+private 流向（SCENARIOS:46-49；INTERACTION-DESIGN:52-55）。营养有输入/操作/回顾但薄：S11 仅一行、证据=设计假设（SCENARIOS:61），「吞咽呛咳」主题只出现在 DIFF-MATRIX:27 无场景承接。心理=当下感受有 CRUD 通道（INTERACTION-DESIGN:79）但 USER-RESEARCH:21 承诺的「支持资源页只列可核实条目」在 27 页签中无落点（见 P1-1） |
| ⑤ | 四核心模块是否完整（一图秀挂载偏离） | **WARN** | ①②④在页面树有落点；**③「独立病情一图秀」（SPEC.md:61）在页面树无任何挂载点**——指标与用药三个二级为血象/激素剂量/肝肾与电解质（SPEC.md:46），10 线 27 签无一图秀入口，与 §6「独立」字样自相矛盾。影响评估与建议见 P0-2 |
| ⑥ | 患者/照护者冲突与负担是否被处理 | **PASS** | 双源标签落地：author_role 落记录行（SPEC.md:29）、witnessed_by 代记徽章必选（SCENARIOS:41；INTERACTION-DESIGN:74）；ICC 证据如实引用并转化为设计（USER-RESEARCH:19，ICC 0.09–0.50、22% 高估/13% 低估 → 双源模型）；private 流向：G5 三出口过滤为单一函数（DEV-REQUIREMENTS:71）、S07/S08 双场景、流三导出过滤（PATIENT-FLOW:26-28）。保留缺口：素材层 8.3「自报 vs 代记对照视图」（research-notes/user-research.md:280）未进一期功能范围（随 H1/H10 验证，可接受） |
| ⑦ | 范围是否过大/缩水 | **PASS** | 10 一级/27 二级在家族阈值上限内（26 号:34-36 一级 8–10/二级 24–30；DIFF-MATRIX:48 自查）；MinerU/模型路由/全病程均有用户确认留痕（DEV-REQUIREMENTS:84-92；DESIGN-SESSION DESIGN-01~08）；删减有据（疗效评估、观察等待为 lymphoma 侧医生/惰性场景）；「明确不做」清单齐备（SPEC.md:88-89）。体量大但由骨架复用+四文档互锁约束，未见缩水 |
| ⑧ | 医学来源是否当前适用且如实标注 | **PASS** | 卫健委 2022 全文 PDF 已取得并核数（USER-RESEARCH:15,33）；CACA V2.0_2025 与 CSCO 2024/2025 登录墙未取得、NCCN 未取得均写明（USER-RESEARCH:36），且「拿到前 SPEC 不写按最新指南设计」（USER-RESEARCH:42）；SPEC 全文无「最新指南」宣称；试验两通道 FAILED 如实落库（USER-RESEARCH:43；DEV-REQUIREMENTS:80） |
| ⑨ | 场景/功能/验收是否同源一致（S→F→A） | **WARN** | S01–S12 路径与页面 key 逐一对上（INTERACTION-DESIGN §二 vs SPEC §4/PATIENT-FLOW:33-44）；**断链一处：S13 两处引用「复诊与试验→资料库」（SCENARIOS:63；INTERACTION-DESIGN:68），但复诊与试验二级=复查节奏/就诊准备与导出/试验线索/入组问题（SPEC.md:50；PATIENT-FLOW:44），无「资料库」页签**（P0-1）。弱锚点：当下困扰/设备使用率/感染与血栓/入组问题四个二级无 S 锚（P1-5/P2-3） |
| ⑩ | 未知与假设是否被伪装成事实 | **WARN** | 素材层纪律好（快照/全文分级、改写标注、引文级不可引用数字均写明）；但 SCENARIOS 的「患者原话」栏目内含设计假设句（S02:16/19、S05:34/37、S11:61 证据行均标「设计假设」），PATIENT-FLOW 三流正文将其按真实原话沿用（PATIENT-FLOW:9,17,25）——证据行诚实、栏目名失真（P1-3） |
| ⑪ | 差异化是否真实（抽查 3 条线 vs lymphoma） | **PASS** | 抽查：电场治疗整线 lymphoma 无对应（DIFF-MATRIX:23）✔；随访影像独立成线+禁判读列，lymphoma PET 只在检查与指标内（DIFF-MATRIX:24）✔；照护与家事由心理支持 2 二级升主体线 3 二级（DIFF-MATRIX:28）✔。一级一致率 1/10=10%（DIFF-MATRIX:49）。最弱为营养与体重 2/2 重名（DIFF-MATRIX:42），其「差异化在内容不在壳」需 G2 实测佐证（P1-4） |
| ⑫ | 红线：判读字段/建议文案/未检测≠阴性/private 三出口/AI 候选闭环 | **PASS** | 判读：无判读列+无 is_progression 断言（SPEC.md:56；SCENARIOS:30；DEV-REQUIREMENTS:69 G3）✔；建议文案：E2 词表+S02/S05「不判断/不建议」+CRUD「无建议文案」（DEV-REQUIREMENTS:59；INTERACTION-DESIGN:78）✔；未检测≠阴性：G1 三态契约（DEV-REQUIREMENTS:67；SCENARIOS:11；INTERACTION-DESIGN:76）✔；private 三出口：G5 过滤收敛单函数+三出口单测（DEV-REQUIREMENTS:71）✔；AI 候选闭环：「一切 AI 产出都是候选→核对→确认，拒收零副作用」+MinerU 候选永不直接入库（INTERACTION-DESIGN:10-11；SPEC.md:9）✔。附注：VTE 红旗（唯一允许的主动就医提示，USER-RESEARCH:35）在 G1 包无落点，归 P1-5 |
| ⑬ | 交互门槛：AI 默认+手工收敛是否贯彻全部 CRUD | **WARN** | 总原则与门槛红线清晰（INTERACTION-DESIGN:6-11,85：显式编辑≤1/页、表单字段≤6、数字键盘、更正=新增版本）；S01–S12 均有 AI 默认+手工收敛双通道。遗漏：CRUD 矩阵（INTERACTION-DESIGN:70-83）未覆盖 schema 草案已列实体——surgery_record（手术与切除）、方案与变更、aed_medication（S06:41 提及抗癫痫药清单但无维护通道）、MoCA 分数（S10:65 并列展示但无录入通道）；DIFF-MATRIX:58 已列这些表，schema↔交互断链。另电场 AI 通道「设备月报导入」括号化且中国电场证据素材层自认不足（USER-RESEARCH:21），不宜在 G2 前当可用能力宣示（P2-2） |

**计数：PASS 7 / WARN 6 / FAIL 0。**

---

## 二、P0–P2 问题清单

### P0（签认包内部矛盾，G1 签字前必须修复）

**P0-1 S13 引用不存在的「资料库」页签（S→F 断链）**
- 问题：SCENARIOS:63 与 INTERACTION-DESIGN:68 均把 S13 路径定义为「复诊与试验 → 资料库」，但页面树复诊与试验线四个二级中无「资料库」（SPEC.md:50；PATIENT-FLOW:44）。签认该页面树即签认一个场景走不通的树，G2 走查脚本按 §二逐场景点一遍会在 S13 断。
- 建议：二选一并在文档留痕——(a) 复诊与试验增设「资料库」二级（27→28，仍在 24–30 阈值内），承接 PDF 导入/原件档案；(b) S13 改指既有页（病理与报告原文/影像档案）并说明原件统一入口。
- 落点：docs/SPEC.md §4、docs/PATIENT-FLOW.md 反推总表、docs/SCENARIOS.md S13、docs/INTERACTION-DESIGN.md §二 S13。

**P0-2 核心模块③「独立病情一图秀」在页面树无挂载点（SPEC §6 与 §4 自相矛盾）**
- 问题：SPEC.md:61 宣称四核心模块③为「**独立**病情一图秀（数值线+Stupp 治疗条+电场佩戴带；KPS/发作只节点）」，其内容横跨放化疗日历/电场/症状/指标四条线；但 SPEC §4 十线 27 签无一图秀入口，当前设计实际挂在指标页顶部而非独立页。影响：(1) 语义错位——挂在「指标与用药」下会被读成"指标趋势图"，削弱"全病程一屏回顾"的核心价值（流三复查恐慌时刻最需要，而流三路径不经过指标线，PATIENT-FLOW:26）；(2) 验收锚点漂移——G2 四必查件含「一图秀规范」（SPEC.md:66）、16 号 C1–C12 断言与 G5 三出口过滤单测中「一图秀出口」（DEV-REQUIREMENTS:71）都需要确定的页面锚点，挂载未定义则走查与单测无落点；(3) 与 16 号/24 号家族惯例不符——两规范中一图秀与指标页是共享目录的两个并列界面（16-ONE-CHART-SPEC.md:3；24-METRIC-TREND-TAB-DESIGN.md:35「去一图秀看趋势」）。
- 建议（推荐方案 A）：看板增加一步可达入口（「接下来」卡或顶栏固定入口），页面本体作为「指标与用药」第四二级页签「病情一图」（27→28），SPEC §4/§6 同步改名与挂载说明；方案 B：保持指标页顶部挂载，但 SPEC §6 ③ 删除「独立」字样、写明挂载决策与理由，并在 G2 必查件与三出口单测中注明检查位置。无论 A/B，ONE-CHART 项目口径页须写明锚点。
- 落点：docs/SPEC.md §4/§6/§7、docs/PATIENT-FLOW.md 反推总表、docs/DEV-REQUIREMENTS-2026-10-24.md §三 G5 与 §二、docs/ONE-CHART-SPEC.md（项目口径）。

### P1（G1 签认时需补齐落点或明确延后理由）

**P1-1 「支持资源页」无落点**——USER-RESEARCH:21 承诺「支持资源页只列可核实条目」（含中国 4 条待核实患教资源），27 页签无此页。建议：照护与家事增设二级或并入某二级的区块，或将资源内容显式延后并从 USER-RESEARCH 措辞中改为「资源清单（待挂载）」。落点：docs/SPEC.md §4、docs/USER-RESEARCH.md §二.3。

**P1-2 「复发后存在哪些路」选项内容落点不明**——USER-RESEARCH:33-34 称 demo 与字段对齐卫健委「复发后 9 类选项」且「复发页只列存在哪些路」，但页面树无复发页；S07 是讨论话题清单，试验线索只给登记卡。建议：明确该信息内容挂在「照护决策与 ACP」的话题背景资料或「方案与变更」的语境说明，或显式标注为二期；避免审阅者误以为存在未列页面。落点：docs/USER-RESEARCH.md §五、docs/SPEC.md §4。

**P1-3 设计假设句以「患者原话」栏目呈现**——S02/S05/S11 的引语证据行标「设计假设」，但栏目名为「患者原话」，PATIENT-FLOW 三流正文按真实原话沿用；与素材层「中文句为改写、非一手引语」的纪律（research-notes/user-research.md:212）不一致。建议：栏目名改为「患者原话/假设情境」，或在句内加〔假设〕标记；访谈回填后替换。落点：docs/SCENARIOS.md、docs/PATIENT-FLOW.md。

**P1-4 营养与体重线差异化仅停留在声明**——2/2 二级与 lymphoma 同名（DIFF-MATRIX:42），「差异化在内容不在壳」依赖激素双线语境与吞咽呛咳主题，但 S11 只有一行、无路径细节、证据=设计假设，吞咽呛咳无任何场景承接。建议：S11 路径补体重/进食双语境的具体卡与操作（INTERACTION-DESIGN §二已有一半），并在 G2 必查件加「营养线 GBM 语境非 lymphoma 复读」目视项。落点：docs/SCENARIOS.md S11、docs/INTERACTION-DESIGN.md §二、docs/DIFF-MATRIX.md §三。

**P1-5 感染与血栓页签无场景、无路径、无 CRUD 通道；VTE 红旗无落点**——USER-RESEARCH:35 明示「VTE 红旗是唯一允许的主动就医指引式提示（23 号分级语境）」，但 S 清单/交互路径/CRUD 矩阵均未提及该页与其红旗规则。建议：补一条 P1 场景（含"不做什么"边界）或在 SCENARIOS 显式标注「家族 23 号契约继承、GBM 词表 G3 定」，避免红线能力凭空消失。落点：docs/SCENARIOS.md、docs/INTERACTION-DESIGN.md §三。

**P1-6 CRUD 矩阵缺 4 类实体通道**——surgery_record、方案与变更、aed_medication、MoCA 分数已进 schema 草案清单（DIFF-MATRIX:58）且页面有二级（手术与切除/方案与变更），但 CRUD 矩阵（INTERACTION-DESIGN:70-83）无对应行，录入双通道原则未覆盖。建议：矩阵补行（均可按「AI 候选+≤6 字段手工表单」模板）；MoCA 明确「医生写的分数」事实录入口径。落点：docs/INTERACTION-DESIGN.md §三。

### P2（可带入 G2 前处理）

**P2-1 visibility 默认值口径需统一**——26 号 §4.3 要求默认 shared（26-CANCER-FEATURE-LINES.md:129-131），INTERACTION-DESIGN:79 写「感受默认 private 可选 shared」，lymphoma 心理线亦有 is_private 默认先例（DIFF-MATRIX:28）。G3 冻结前须写明：viewpoint 默认 shared、心理区例外 private 的契约与理由。落点：docs/DEV-REQUIREMENTS-2026-10-24.md G5、docs/INTERACTION-DESIGN.md §三。

**P2-2 电场「设备月报导入」AI 通道依据薄弱**——INTERACTION-DESIGN:80 括号化列出，而素材层明确中国电场费用/渠道「未找到可靠来源」（USER-RESEARCH:21；research-notes 缺口 4）。建议标注「格式未验证、G2 不宣示可用」，手工滑条为主通道。落点：docs/INTERACTION-DESIGN.md §三。

**P2-3 弱锚点二级留痕**——当下困扰/设备使用率/入组问题三个二级无专属 S 锚（家族标准件理由部分已写，DIFF-MATRIX:42,44）。按 26 号 §7 自检第 3 问，各补一句所接的患者原话或标注「家族契约保留」。落点：docs/PATIENT-FLOW.md 反推总表、docs/DIFF-MATRIX.md §三。

---

## 三、显式保留缺口（评审确认可带过、不许伪装已解决）

1. 真实访谈 0（USER-RESEARCH §六.1）：6–10 个中国家庭访谈计划在 G1 后执行，F 层中文改写句回填前不得当作一手引语对外。
2. 指南登录墙 3 项（CACA V2.0_2025 / CSCO 2024/2025 / NCCN）未取得；取得前不写「按最新指南设计」。
3. 试验两通道（chictr_online/ictrp）两轮 FAILED，覆盖缺口如实落库；离线语料仅胰腺癌覆盖（DEV-REQUIREMENTS:80）。
4. 中国电场治疗可及性/费用证据不足；电场页不出费用信息。
5. H1–H18 需求假设待验证（素材层 §9），优先 H1–H4；双源对照视图、照护者情绪自检（素材层 8.3）未进一期，随 H1/H10 验证再定。
6. 本评审只审设计方案，不代表发布已授权、包已安装、Desktop 已加载或市场已收录；发布证据在 `docs/RELEASE.md`、`docs/ACCEPTANCE.md`。

---

## 四、总体判断

**需修订后签。**

- 无红线违反（⑫ 全过）、无医生任务冒充（① 过）、证据诚实框架成立（②⑧ 过）、差异化真实（⑪ 过）——方向与架构可签。
- 但签认对象自身存在两处内部矛盾（P0-1 幽灵页签、P0-2 核心模块③挂载缺失），直接签字会让 G2 走查脚本与「一图秀规范」必查件无落点；两处均为文档一致性修复（合计约半天工作量），修复并留痕后即可签。
- P1 六项建议随 P0 一并在 G1 包内补齐落点或显式标注延后；P2 三项可带入 G2 前处理。
- 修复后无需重新独立评审：P0/P1 均不改变价值主张、建议边界、主场景与一期范围（NEW-CANCER-WORKBENCH §七 的「先讨论再改 SPEC」条件不触发，直接修订留痕即可）。
