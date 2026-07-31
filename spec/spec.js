// 项目说明书交互脚本：流程图节点、五维卡片点击弹出详情弹窗。

const FLOW_NODES = [
  {
    title: "① Query 输入",
    desc: "取自飞书《测评Query构建》XHkZeV，98 条真实构造 Query，每条携带主任务类型/对象/信息状态/项目背景/原文。",
    detail: `
      <h4>字段来源</h4>
      <p>严格取自标准第四部分"Query信息"定义的输入字段：Q编号、主任务类型、对象、信息状态、项目编号、题材画风多样化、建议数量、覆盖Query示例、预期首轮关键行为、预期调用tool。</p>
      <h4>数据构成</h4>
      <ul>
        <li>13 个虚构项目（P01–P13），覆盖不同题材与画风</li>
        <li>6 类主任务类型：新建内容/修改内容/评审内容/查询与决策/执行操作/故障恢复</li>
        <li>6 类对象：跨模块／综合任务/大纲/角色场景道具资产/分集剧情/分镜视频/封面</li>
        <li>5 种信息状态：足够/缺失可自动补齐/缺失必须用户补充/模糊/冲突</li>
      </ul>
    `
  },
  {
    title: "② Agent 真实执行（待接入）",
    desc: "每条 Query 交给 NexPlay 真实执行，产出真实产物与执行过程记录——当前演示页用模拟数据代替，验证评分引擎逻辑。",
    detail: `
      <h4>标准要求的证据类型</h4>
      <ul>
        <li>用户当前请求及已确认的历史信息</li>
        <li>当前选中的项目、人物、分集、镜头或资产</li>
        <li>实际 Skill / 工具调用（对象、版本、输入、参数）</li>
        <li>工具真实返回结果</li>
        <li>执行前后的项目状态变化</li>
        <li>最终交付物及状态说明</li>
      </ul>
      <h4>证据优先级（关键约束）</h4>
      <p>真实项目状态或正式资产 ＞ 工具返回 ＞ 调用记录 ＞ 最终回复 ＞ Agent 自我描述。<b>Agent 说"已经完成"不能单独证明任务完成</b>——Judge 不得仅凭最终回复文本下结论。</p>
    `
  },
  {
    title: "③ Judge 五维判分",
    desc: "严格按标准逐维打分：D1目标理解 → D2信息判断 → D3执行编排 → D4双门槛结果质量 → D5交付可用性，同时独立判定严重错误。",
    detail: `
      <h4>判分顺序与独立性</h4>
      <p>五个维度各自独立评 0/1 分，互不影响——<b>高分不能抵消任何一个维度的 0 分</b>。严重错误检查独立于五维判断，命中任一严重错误直接判不合格，不受总分影响。</p>
      <h4>最早错误归因</h4>
      <p>同一因果链（如"理解错对象→调错Skill→生成错资产→交付错引用"）只在最早出错的维度记一次分，下游连带问题不重复扣分，但作为影响记录附带说明。</p>
    `
  },
  {
    title: "④ 结果输出",
    desc: "输出格式严格对齐标准第四部分模板：Query信息回填 + 五维必检项与分数证据 + 严重错误判定 + 最终结论。",
    detail: `
      <h4>结论映射规则</h4>
      <ul>
        <li>命中一票否决 → 不合格</li>
        <li>未命中一票否决，但存在关键维度0分 → 不合格</li>
        <li>五个维度均为1分 → 合格</li>
        <li>五个维度均为1分，且存在惊艳可核验的亮点 → 合格，并标注优质case</li>
      </ul>
      <h4>用途</h4>
      <p>可直接与人工评审员在盲评台产出的结果并列对比，二者共用同一份评分标准，分别独立留存原始评分。</p>
    `
  }
];

const DIM_CARDS = [
  {
    title: "维度1｜目标与边界理解", short: "Agent 是否准确理解用户目标、任务对象、操作范围和保持项。",
    detail: `
      <h4>必检项</h4>
      <ul><li>用户最终目标</li><li>具体任务对象</li><li>操作范围</li><li>明确约束</li><li>保持项或禁止项</li></ul>
      <h4>怎么给分</h4>
      <p><b>0分：</b>目标/对象/范围理解错误；操作错项目、集数、人物、镜头或资产；扩大任务范围；破坏保持项。</p>
      <p><b>1分：</b>正确识别目标、对象、范围、约束和保持项，严格在授权范围内完成任务。</p>
      <h4>标准示例</h4>
      <p>用户要求"把第3集男主的核心情绪从恐惧改成愤怒，其他内容不变"——改写整部作品或改错人物记0分；只修改第3集男主相关内容记1分。</p>
    `
  },
  {
    title: "维度2｜信息判断与追问", short: "信息状态判断是否正确，追问是否只问最阻塞的一项。",
    detail: `
      <h4>信息状态 → 预期行为</h4>
      <ul>
        <li>足够 → 不追问，直接回答或执行</li>
        <li>缺失但可自动补齐 → 从已有来源自动补齐后继续</li>
        <li>缺失且必须用户补充 → 只追问当前真正阻塞的一项</li>
        <li>模糊 → 先利用上下文消歧，仍不明确再问一个具体问题</li>
        <li>冲突 → 明确指出冲突并确认，不得静默覆盖</li>
      </ul>
      <h4>追问前查找顺序</h4>
      <p>当前请求 → 当前选中对象 → 项目现有内容 → 用户材料 → 上游已生成内容 → 工具返回。不要让用户重复提供系统中已存在的信息。</p>
    `
  },
  {
    title: "维度3｜执行编排与状态控制", short: "是否采取正确动作，真实完成调用，正确处理对象/版本/顺序/参数。",
    detail: `
      <h4>任务意图 → 正确动作</h4>
      <ul>
        <li>新建内容 → 调用正确新建链路，产生真实新对象</li>
        <li>修改内容 → 定位正确已有对象和版本，最小必要修改</li>
        <li>评审内容 → 只读引用证据，不擅自写回项目</li>
        <li>查询与决策 → 检索并回答，不修改项目</li>
        <li>执行操作 → 必须真实调用，检查执行状态</li>
        <li>故障恢复 → 只处理失败单元，保留原输入，最多重试两次</li>
      </ul>
      <h4>正式生产任务必须真实执行</h4>
      <p>大纲、角色/场景/道具设定、资产图片、分集剧情、分镜/视频、封面等，若用户要求创建或修改，必须有真实调用和真实产物，<b>不能用文字回复模拟</b>。</p>
    `
  },
  {
    title: "维度4｜结果正确性与专业质量（双门槛）", short: "先过Query指令遵循门槛，再过对象内容标准门槛，任一不过直接0分。",
    detail: `<p>详见下方"维度4 双门槛机制"专门章节。</p>`
  },
  {
    title: "维度5｜交付完整性与可用性", short: "结果是否完整、真实、可定位、可供下一步直接使用。",
    detail: `
      <h4>最终回复顺序</h4>
      <p>结果 → 必要说明（范围/保持项/限制）→ 下一步</p>
      <h4>任务意图 → 必要交付</h4>
      <ul>
        <li>新建内容 → 新产物、对象/资产编号、真实状态、必要关联</li>
        <li>修改内容 → 修改结果、修改位置、影响范围、未修改内容说明</li>
        <li>评审内容 → 问题、证据、严重度、修改建议</li>
        <li>查询与决策 → 明确答案、依据、限制或不确定性</li>
        <li>执行操作 → 执行对象、执行结果、成功或失败状态</li>
        <li>故障恢复 → 已成功部分、失败部分、重试次数、剩余问题</li>
      </ul>
    `
  }
];

const OUTPUT_SCHEMA_TEXT = `Query信息:
  Q:
  主任务类型:
  对象:
  信息状态:
  项目编号:
  题材画风多样化:
  建议数量:
  覆盖Query示例:
  预期首轮关键行为:
  预期调用tool:

维度评测:
  - 维度: 维度1｜目标与边界理解
    必检项: {用户最终目标, 具体任务对象, 操作范围, 明确约束, 保持项或禁止项: 通过/不通过/不适用}
    分数: 0 / 1
    证据:
    理由:

  - 维度: 维度2｜信息判断与追问
    必检项: {信息状态判断正确, 信息足够时直接执行, 可自动补齐时先补齐,
             必须追问时只问阻塞项, 模糊或冲突时正确处理: 通过/不通过/不适用}
    分数: 0 / 1
    证据:
    理由:

  - 维度: 维度3｜执行编排与状态控制
    必检项: {任务意图正确, 动作与主任务类型一致, Skill或tool正确, 对象和版本正确,
             调用顺序正确, 参数正确, 执行状态和重试处理正确: 通过/不通过/不适用}
    分数: 0 / 1
    证据:
    理由:

  - 维度: 维度4｜结果正确性与专业质量
    Query指令门槛: {主任务类型一致, 对象一致, Query明确要求全部完成,
                    保持项禁止项和同步要求满足: 通过/不通过/不适用}
    本条启用对象:
    对象内容门槛:
      # 系统按"对象"打印对应对象的全部必检项
    分数: 0 / 1
    证据:
    理由:

  - 维度: 维度5｜交付完整性与可用性
    必检项: {正式结果已交付, 必要编号完整, 版本引用和状态正确,
             修改影响和保持项说明完整, 失败和剩余问题如实说明,
             下游可以直接使用, 主任务类型对应的必要交付完整: 通过/不通过/不适用}
    分数: 0 / 1
    证据:
    理由:

严重错误:
  是否命中: 是 / 否
  类型:
  证据:

最终结论:
  总分: 0—5
  结论: 合格 / 不合格
  优质case: 是 / 否
  优质case证据:
  总结:`;

const OBJECT_RUBRICS_SUMMARY = `
<h4>大纲</h4>
<p>题材主题符合Query、玩家身份与失败条件明确、主要冲突成立、关键事件有因果关系、主配角有行动动机、互动选择有不同后果、结局与铺垫一致、体量合理、能为下游提供依据（共9项）</p>
<h4>角色、场景、道具资产</h4>
<p>身份年龄职业性格动机符合大纲、人物区分明确、外观符合身份题材时代、标志特征前后一致、场景符合设定、道具功能明确、图片忠实设定且风格统一、音色符合人物且前后一致等（共23项连续检查，原文不分子清单）</p>
<h4>分集剧情</h4>
<p>推进主线、事件有前因后果、行为符合动机、选择有真实代价、分支汇合结局关系正确、台词符合人物、正确引用已有资产、与前后集连续（共12项）</p>
<h4>分镜视频</h4>
<p>完整覆盖目标剧情、镜头有叙事功能、构图合理、动作方向连续、视频忠实分镜、无变形穿模闪烁、片段能衔接、声音匹配（共15项连续检查）</p>
<h4>封面</h4>
<p>准确表达类型与冲突、关键人物可识别、与角色资产一致、标题清楚无乱码、层级明确、有吸引力、符合尺寸场景要求（共7项，主流程外加分项）</p>
`;

function openDetail(title, html) {
  document.getElementById('detailTitle').textContent = title;
  document.getElementById('detailBody').innerHTML = html;
  document.getElementById('detailDialog').showModal();
}

function renderFlow() {
  const html = FLOW_NODES.map((n, i) => `
    <div class="flow-node" data-idx="${i}">
      <h4>${n.title}</h4>
      <p>${n.desc}</p>
      <span class="flow-hint">点击查看详情 →</span>
    </div>
    ${i < FLOW_NODES.length - 1 ? '<div class="flow-connector">↓</div>' : ''}
  `).join('');
  document.getElementById('flowDiagram').innerHTML = html;
  document.querySelectorAll('.flow-node').forEach(node => {
    node.addEventListener('click', () => {
      const n = FLOW_NODES[node.dataset.idx];
      openDetail(n.title, n.detail);
    });
  });
}

function renderDimCards() {
  const html = DIM_CARDS.map((d, i) => `
    <div class="dim-card" data-idx="${i}">
      <div class="dim-card-main"><h4>${d.title}</h4><p>${d.short}</p></div>
      <div class="dim-card-arrow">→</div>
    </div>
  `).join('');
  document.getElementById('dimCards').innerHTML = html;
  document.querySelectorAll('.dim-card').forEach(card => {
    card.addEventListener('click', () => {
      const d = DIM_CARDS[card.dataset.idx];
      openDetail(d.title, d.detail);
    });
  });
}

document.getElementById('outputSchemaBlock').textContent = OUTPUT_SCHEMA_TEXT;

document.getElementById('viewRubricsBtn').addEventListener('click', () => {
  openDetail('6 类对象内容检查清单（维度4 门槛二）', OBJECT_RUBRICS_SUMMARY);
});

document.getElementById('closeDetail').addEventListener('click', () => {
  document.getElementById('detailDialog').close();
});
document.getElementById('detailDialog').addEventListener('click', e => {
  if (e.target === document.getElementById('detailDialog')) document.getElementById('detailDialog').close();
});

renderFlow();
renderDimCards();
