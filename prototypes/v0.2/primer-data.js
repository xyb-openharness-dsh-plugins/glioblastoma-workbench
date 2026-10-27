/* 小星宝 StarPal · 疾病概要数据（36 号 v2）
 * 口径：docs/DISEASE-PRIMER.md；规范：starter docs/36-DISEASE-PRIMER.md。
 * 全部内容属第 ② 层（解释）：只写定义、文件、指南列举过的手段、已发生的变化。
 * 任何「你该怎么办」的判断都不在这里，固定出口是「这一句需要问你的医生」。
 *
 * 原件状态照实写：
 *   - 国家卫健委《脑胶质瘤诊疗指南（2022 年版）》全文 PDF 已取得并核数（research-notes/medical-constraints.md）；
 *   - CACA 2022 精简版本地存档已核数，但期刊文章页不可验证（DOI 403、cjco.cn 证书失效），
 *     公开层按「未取得原件，据二次来源」写；
 *   - CACA V2.0_2025、CSCO、NCCN 原文均未取得（登录墙 / 订阅），页码一律「页码待核」。
 *
 * 链接（36 号 §2.5）：2026-10-27 逐条用 verify-links.mjs 真浏览器验活，只收 OK 的 https。
 *   url         = 原件链接（已取得原件的行必须有）
 *   secondaryUrl= 未取得原件时的二次来源链接
 *   两者都拿不到的（CSCO）不编链接，note 写明为什么没有。
 */
window.DISEASE_PRIMER = {
  brand: '小星宝 StarPal',
  name: '胶质母细胞瘤',
  en: 'Glioblastoma（GBM）',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '胶质母细胞瘤（GBM）是起源于中枢神经系统的弥漫性胶质瘤。WHO 2021 分类要求「整合诊断」——'
        + '组织学所见与分子标记一起写进诊断，单看形态已经不够。',
      points: [
        'WHO 2021 版（第 5 版）要求整合诊断：组织学 + 分子；病理报告通常分层写整合诊断 / 组织学诊断 / 分子诊断。',
        '据国家卫健委 2022 年版指南原文：IDH 野生且 H3 野生的弥漫性胶质瘤，出现坏死 / 微血管增生，或 TERT 突变、EGFR 扩增、+7/-10 三者之一，即可诊断为「胶质母细胞瘤，IDH 野生型」。',
        '本台记录的分子项包括 IDH、MGMT 启动子甲基化、TERT、EGFR、+7/-10、H3 等，一律照报告原文，不由工作台推断。',
        '本台不以 TNM 作默认结构：记录的是手术与切除范围、病理与分子、MRI 随访、放化疗与电场治疗、KPS 与症状。',
        '指南原文提到「假性进展」的语境多见于同步放化疗结束后 3 个月内；本台只记录影像结论原文与日期，不判断是进展还是假性进展。'
      ],
      sources: [
        {
          org: '国家卫健委', doc: '脑胶质瘤诊疗指南（2022 年版）', version: '2022', original: true, page: '页码待核',
          url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml'
        },
        {
          org: 'WHO', doc: 'Classification of Tumours of the Central Nervous System, 5th ed.（IARC，第 6 卷）', version: '2021', original: false, page: '页码待核',
          secondaryUrl: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Central-Nervous-System-Tumours-2021'
        },
        {
          org: 'CACA', doc: '脑胶质瘤诊疗指南（2022 精简版）', version: '2022', original: false, page: '页码待核',
          secondaryUrl: 'https://www.medsci.cn/guideline/show_article.do?id=2379e1c003e9a140',
          note: '期刊页 DOI 403、cjco.cn 证书失效，公开层按二次来源'
        }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这台工作台里出现的每一条「该查什么、该怎么记」，都应能追到下面某一份文件。'
        + '本项目只取得国家卫健委 2022 版与 CACA 2022 精简版的全文；其余版本只知其存在，表格里照实写。'
        + '「原件」一列可点的才是真拿到了，点不开的说明没拿到。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          ['国家卫健委', '脑胶质瘤诊疗指南（2022 年版）', '2022（国卫办医函〔2022〕104 号）',
            { text: '已取得 · 全文 PDF 已提取', url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml' },
            '手术、放疗、TMZ 同步 / 辅助、老年 KPS 分层、复发后选项的原文依据'],
          ['CACA', '脑胶质瘤诊疗指南（2022 精简版）', '2022（中国肿瘤临床 49(16):811-818）',
            { text: '未取得原件 · 期刊页 403，据二次来源', url: 'https://www.medsci.cn/guideline/show_article.do?id=2379e1c003e9a140' },
            '中文规范层的对照口径（本地存档已核数，公开原件不可验证）'],
          ['CACA', '脑胶质瘤诊疗指南 V2.0_2025', 'V2.0_2025（20250110；平台记为 2024-12-20）',
            { text: '未取得原件 · 平台页需登录下载', url: 'https://cacaguidelines.cacakp.com/pdflist/detail?id=415' },
            '只登记其存在与版本号，推荐分级未核实，不引用条文'],
          ['CSCO', 'CSCO 脑胶质瘤诊疗指南', '2024 / 2025（具体版本号仍未核实）',
            { text: '未取得原件', nolink: true, note: '官网无公开文件页，检索仅见会议报道' },
            '只登记其存在，不引用条文'],
          ['NCCN', 'NCCN Guidelines · Central Nervous System Cancers', 'V3.2026（2026-10-27 官网核到版本号）',
            { text: '未取得原件 · PDF 需注册后下载', url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1425' },
            '范围参照；随访节奏目前依据二手实践卡，不当作原文'],
          ['WHO', 'Classification of Tumours of the Central Nervous System, 5th ed.', '2021（IARC 出版，第 6 卷）',
            { text: '未取得原件 · IARC 出版物页可查书目', url: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Central-Nervous-System-Tumours-2021' },
            '整合诊断与命名的口径']
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」。版本号必须写清：同一份指南隔一年，条目会变。',
        '本台的中文规范以国家卫健委 2022 版为主，NCCN 仅作范围参照；两者版本差要写清，不合并、不互相填补。',
        'CACA V2.0_2025 与 CSCO 在官方平台 / 出版物之外未取得全文，取得前不写「按最新指南设计」，也不引用其具体条文。',
        '未取得原件的文件只记「存在」与「大致讲什么」，页码一律写待核。'
      ],
      sources: [
        {
          org: '国家卫健委', doc: '脑胶质瘤诊疗指南（2022 年版）', version: '2022', original: true, page: '页码待核',
          url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml'
        },
        {
          org: 'CACA', doc: '脑胶质瘤诊疗指南（2022 精简版）', version: '2022', original: false, page: '页码待核',
          secondaryUrl: 'https://www.medsci.cn/guideline/show_article.do?id=2379e1c003e9a140',
          note: '期刊页 DOI 403、cjco.cn 证书失效，公开层按二次来源'
        },
        {
          org: 'CACA', doc: '脑胶质瘤诊疗指南 V2.0_2025', version: '2025', original: false, page: '页码待核',
          secondaryUrl: 'https://cacaguidelines.cacakp.com/pdflist/detail?id=415',
          note: '平台页可查，下载需登录'
        },
        {
          org: 'CSCO', doc: 'CSCO 脑胶质瘤诊疗指南', version: '2024 / 2025（未核实）', original: false, nolink: true, page: '页码待核',
          note: '未找到可达的公开文件页，不编链接'
        },
        {
          org: 'NCCN', doc: 'NCCN Guidelines · Central Nervous System Cancers', version: 'V3.2026（2026-10-27 核）', original: false, page: '页码待核',
          secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1425'
        },
        {
          org: 'WHO', doc: 'Classification of Tumours of the Central Nervous System, 5th ed.', version: '2021', original: false, page: '页码待核',
          secondaryUrl: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Central-Nervous-System-Tumours-2021'
        }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面按期别与线序列出指南里出现过的手段类别。这是「世界上大致有哪些办法」的地图，不是给你排的先后顺序，'
        + '也不含任何剂量、疗程与适用条件——那些必须由医生按你的病理、分子结果、年龄与 KPS 决定。',
      groups: [
        {
          label: '新诊断（初治）',
          points: [
            '手术：切除范围按术后记录原文照抄（全切 / 次全切 / 部分），本台不判读切除程度、不把影像残留换算成等级。',
            '放疗：常规分割放疗与短程放疗都被列出；选哪一种与年龄、KPS 等情形有关。',
            '同步化疗：替莫唑胺（TMZ）同步放化疗是长期存在的选项。',
            '辅助化疗：TMZ 辅助治疗被列出，周期数与剂量按医嘱记录，本台不给方案。',
            '电场治疗（TTFields）：被列为治疗手段之一，适用条件按医生判断。'
          ]
        },
        {
          label: '老年 / KPS 分层情形',
          points: [
            '据国家卫健委 2022 版原文：>70 岁、KPS≥60 者，短程或常规放疗联合 TMZ 被列出；KPS<60 者，短程放疗或 TMZ 单药被列出。',
            'NCCN 对 KPS≥60 的老年患者另列电场治疗；本条转述自二手资料，原件未取得（PDF 需注册）。'
          ]
        },
        {
          label: '复发后',
          points: [
            '指南对复发后的处理另列一组选项（本项目记录为「9 类选项清单」），本台尚未逐条整理，具体条目待取得原文后补。',
            '再次手术、再次放疗、全身治疗与临床试验都在这一组里出现；选哪一个由治疗团队按复发情形判断。'
          ]
        },
        {
          label: '贯穿全程的两件事',
          points: [
            '随访影像：指南语境的节奏是放疗后 2–8 周首次复查 MRI，之后每 2–4 个月 × 3 年，再每 3–6 个月长期随访；本条目前依据二手实践卡，原文未取得，本台只记医生给的实际日期。',
            '症状与支持治疗：癫痫、激素使用、血象与 KPS 按记录原文呈现；本台不给处理建议。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        {
          org: '国家卫健委', doc: '脑胶质瘤诊疗指南（2022 年版）', version: '2022', original: true, page: '页码待核',
          url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml'
        },
        {
          org: 'NCCN', doc: 'NCCN Guidelines · Central Nervous System Cancers', version: 'V3.2026（2026-10-27 核）', original: false, page: '页码待核',
          secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1425'
        }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事：哪份文件换了版本、哪一年发布、分类体系改了什么。'
        + '不写预测，不做评价，也不给任何倾向；查不到版本号的不写。',
      points: [
        '2021 年：WHO 中枢神经系统肿瘤分类第 5 版（WHO CNS5，IARC 第 6 卷）出版，诊断改为整合诊断（组织学 + 分子），「胶质母细胞瘤，IDH 野生型」成为独立诊断类型。',
        '2022-04：国家卫健委办公厅印发肿瘤和血液病相关病种诊疗指南（2022 年版），含《脑胶质瘤诊疗指南（2022 年版）》，文号国卫办医函〔2022〕104 号。',
        '2022 年：CACA《脑胶质瘤诊疗指南（精简版）》发表于《中国肿瘤临床》第 49 卷第 16 期（811-818 页）。',
        '2024-12-20 / 2025-01-10：CACA《脑胶质瘤诊疗指南》更新为 V2.0_2025，平台记录发布日期 2024-12-20、版本号 20250110；本项目未取得全文，推荐分级未核实。',
        'CSCO 脑胶质瘤相关版本在 2024、2025 年度指南会中均有更新记录；本项目未取得全文，具体版本号未核实。'
      ],
      sources: [
        {
          org: 'WHO', doc: 'Classification of Tumours of the Central Nervous System, 5th ed.', version: '2021', original: false, page: '页码待核',
          secondaryUrl: 'https://publications.iarc.who.int/Book-And-Report-Series/Who-Classification-Of-Tumours/Central-Nervous-System-Tumours-2021'
        },
        {
          org: '国家卫健委', doc: '脑胶质瘤诊疗指南（2022 年版）', version: '2022', original: true, page: '页码待核',
          url: 'https://www.nhc.gov.cn/yzygj/c100068/202204/0c1f7d3aca0545abbeb02030ce255930.shtml'
        },
        {
          org: 'CACA', doc: '脑胶质瘤诊疗指南（2022 精简版 / V2.0_2025）', version: '2022 / 2025', original: false, page: '页码待核',
          secondaryUrl: 'https://cacaguidelines.cacakp.com/pdflist/detail?id=415',
          note: '2022 精简版期刊页 403，二次来源另见 MedSci；V2.0_2025 本台未取得'
        },
        {
          org: 'CSCO', doc: 'CSCO 脑胶质瘤诊疗指南', version: '2024 / 2025（未核实）', original: false, nolink: true, page: '页码待核',
          note: '未找到可达的公开文件页，不编链接'
        }
      ]
    }
  ]
}
