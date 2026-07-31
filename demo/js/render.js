// 渲染逻辑：总览统计、Runs 表格与筛选、规则页、Run 详情弹窗。

const DIM_LABELS = {
  d1: "D1 目标与边界",
  d2: "D2 信息判断",
  d3: "D3 执行编排",
  d4: "D4 结果质量",
  d5: "D5 交付可用"
};

const RULE_CARDS = [
  {
    key: "d1", title: "维度1｜目标与边界理解",
    desc: "Agent 是否准确理解用户最终目标、任务对象、操作范围，以及哪些内容必须保持不变。",
    detail: {
      必检项: ["用户最终目标", "具体任务对象", "操作范围", "明确约束", "保持项或禁止项"],
      给分: [
        "0分：目标/对象/范围理解错误；操作错项目、集数、人物、镜头或资产；扩大任务范围；破坏保持项。",
        "1分：正确识别目标、对象、范围、约束和保持项，严格在授权范围内完成任务。"
      ]
    }
  },
  {
    key: "d2", title: "维度2｜信息判断与追问",
    desc: "Agent 是否正确判断信息状态，采取正确动作：直接执行、自动补齐、追问、消歧或确认冲突。",
    detail: {
      信息状态对照: [
        "足够 → 不追问，直接回答或执行",
        "缺失但可自动补齐 → 从已有来源补齐后继续",
        "缺失且必须用户补充 → 只追问当前真正阻塞的一项",
        "模糊 → 先利用上下文消歧，仍不明确再问一个具体问题",
        "冲突 → 明确指出冲突并确认，不得静默覆盖"
      ],
      给分: [
        "0分：信息状态判断错误；信息足够却反复追问；能自动补齐却让用户重复提供；擅自覆盖冲突内容。",
        "1分：正确识别信息状态，并采取对应的执行/补齐/追问/消歧/冲突确认行为。"
      ]
    }
  },
  {
    key: "d3", title: "维度3｜执行编排与状态控制",
    desc: "Agent 是否采取正确动作，以正确对象、顺序、参数和状态控制完成任务。",
    detail: {
      任务意图对照: [
        "新建内容 → 调用正确新建链路，产生真实新对象",
        "修改内容 → 定位正确已有对象和版本，最小必要修改",
        "评审内容 → 只读引用证据，不擅自写回项目",
        "查询与决策 → 检索并回答，不修改项目",
        "执行操作 → 必须真实调用，检查执行状态",
        "故障恢复 → 只处理失败单元，不重复成功内容"
      ],
      给分: [
        "0分：没有真实执行；调用错误能力；对象/版本/顺序/参数错误；失败后虚报成功。",
        "1分：采用正确动作，真实完成必要调用，正确处理对象、版本、顺序、参数和状态。"
      ]
    }
  },
  {
    key: "d4", title: "维度4｜结果正确性与专业质量（双门槛）",
    desc: "先过门槛一（Query 指令遵循），再过门槛二（对象内容标准）。任一不过，维度4直接为0。",
    detail: {
      门槛一: ["动作是否做对", "对象是否做对", "Query原文要求是否全部做到", "保持项/禁止项/同步项是否满足"],
      门槛二: "按 Query 的「对象」字段加载对应检查清单（大纲/角色场景道具资产/分集剧情/分镜视频/封面/跨模块），逐项通过才算过。",
      给分: ["门槛一不过 → 直接0分，停止检查门槛二。", "门槛一+门槛二全过 → 1分。"]
    }
  },
  {
    key: "d5", title: "维度5｜交付完整性与可用性",
    desc: "Agent 是否交付了用户真正需要的结果，结果是否完整、真实、可定位、可供下一步使用。",
    detail: {
      交付顺序: "结果 → 必要说明（范围/保持项/限制）→ 下一步",
      给分: [
        "0分：缺少正式产物、关键字段、编号、版本、引用或状态；交付与真实执行不一致；下游无法使用。",
        "1分：完整交付必要产物和状态，编号引用正确，范围清楚，下游能够继续使用。"
      ]
    }
  }
];

function pillClass(result) {
  return result === "合格" ? "pass" : "fail";
}

function renderOverview() {
  const verdicts = Object.values(DataStore.verdicts);
  const total = verdicts.length;
  const pass = verdicts.filter(v => v.最终结论.结论 === "合格").length;
  const severe = verdicts.filter(v => v.严重错误.是否命中 === "是").length;
  const avgScore = (verdicts.reduce((s, v) => s + v.最终结论.总分, 0) / total).toFixed(2);

  document.getElementById("summaryStrip").innerHTML = `
    <div class="summary-item"><span>Query 总数</span><strong>${total}</strong><small>飞书《测评Query构建》XHkZeV</small></div>
    <div class="summary-item"><span>五维全通过率</span><strong>${Math.round(pass/total*100)}%</strong><small>${pass} / ${total} 条合格</small></div>
    <div class="summary-item"><span>严重错误命中</span><strong>${severe}</strong><small>一票否决，不受总分影响</small></div>
    <div class="summary-item"><span>平均总分</span><strong>${avgScore}</strong><small>满分 5（每维 0/1）</small></div>
  `;

  const dimKeys = ["d1", "d2", "d3", "d4", "d5"];
  const dimBars = dimKeys.map(k => {
    const dimVerdicts = verdicts.map(v => v.维度评测.find(d => d.key === k));
    const passCount = dimVerdicts.filter(d => d.分数 === 1).length;
    const pct = Math.round(passCount / total * 100);
    return `<div class="dim-bar-row">
      <span class="bar-label">${DIM_LABELS[k]}</span>
      <div class="dim-bar-track"><div class="dim-bar-fill" style="width:${pct}%"></div></div>
      <span class="bar-value">${passCount}/${total}</span>
    </div>`;
  }).join("");
  document.getElementById("dimBars").innerHTML = dimBars;

  const failCounts = {};
  dimKeys.forEach(k => failCounts[k] = 0);
  verdicts.forEach(v => { if (v.最早失败维度) failCounts[v.最早失败维度]++; });
  const maxFail = Math.max(1, ...Object.values(failCounts));
  const failBars = dimKeys.map(k => {
    const pct = Math.round(failCounts[k] / maxFail * 100);
    return `<div class="dim-bar-row">
      <span class="bar-label">${DIM_LABELS[k]}</span>
      <div class="dim-bar-track"><div class="dim-bar-fill fail-fill" style="width:${pct}%"></div></div>
      <span class="bar-value">${failCounts[k]} 条</span>
    </div>`;
  }).join("");
  document.getElementById("failBars").innerHTML = failBars;

  const byTaskType = {};
  DataStore.queries.forEach(q => {
    const v = DataStore.getVerdict(q.id);
    if (!byTaskType[q.task_type]) byTaskType[q.task_type] = { total: 0, pass: 0 };
    byTaskType[q.task_type].total++;
    if (v.最终结论.结论 === "合格") byTaskType[q.task_type].pass++;
  });
  const rows = Object.entries(byTaskType).map(([type, s]) => `
    <tr>
      <td>${type}</td>
      <td>${s.total}</td>
      <td>${s.pass}</td>
      <td>${Math.round(s.pass / s.total * 100)}%</td>
    </tr>`).join("");
  document.getElementById("taskTypeTable").innerHTML = `
    <thead><tr><th>主任务类型</th><th>Query 数</th><th>合格数</th><th>合格率</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

let currentFilters = { search: "", conclusion: "all", taskType: "all", object: "all" };

function populateFilterOptions() {
  const taskTypes = [...new Set(DataStore.queries.map(q => q.task_type))];
  const objects = [...new Set(DataStore.queries.map(q => q.object))];
  const taskSel = document.getElementById("taskTypeFilter");
  const objSel = document.getElementById("objectFilter");
  taskTypes.forEach(t => taskSel.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`));
  objects.forEach(o => objSel.insertAdjacentHTML("beforeend", `<option value="${o}">${o}</option>`));
}

function renderRuns() {
  const rows = DataStore.queries
    .filter(q => {
      const v = DataStore.getVerdict(q.id);
      if (currentFilters.conclusion !== "all" && v.最终结论.结论 !== currentFilters.conclusion) return false;
      if (currentFilters.taskType !== "all" && q.task_type !== currentFilters.taskType) return false;
      if (currentFilters.object !== "all" && q.object !== currentFilters.object) return false;
      if (currentFilters.search) {
        const hay = `${q.project_name} ${q.query_text} ${q.id} ${q.q1}`.toLowerCase();
        if (!hay.includes(currentFilters.search.toLowerCase())) return false;
      }
      return true;
    })
    .map(q => {
      const v = DataStore.getVerdict(q.id);
      const dims = ["d1", "d2", "d3", "d4", "d5"].map(k => {
        const d = v.维度评测.find(x => x.key === k);
        return `<div class="mini-dim ${d.分数 === 1 ? 'pass' : 'fail'}">${d.分数}</div>`;
      }).join("");
      const earliestLabel = v.最早失败维度 ? DIM_LABELS[v.最早失败维度] : "—";
      return `<tr data-query-id="${q.id}">
        <td><strong>${q.q1}${q.q2 ? '+' + q.q2 : ''}</strong><br><span style="color:var(--text-muted);font-size:11px">${q.id}</span></td>
        <td>${q.project_id} · ${q.project_name}</td>
        <td>${q.task_type}<br><span style="color:var(--text-muted);font-size:11px">${q.object}</span></td>
        <td>${q.info_state_detail}</td>
        <td><div class="mini-dims">${dims}</div></td>
        <td>${earliestLabel}</td>
        <td><span class="status-pill ${pillClass(v.最终结论.结论)}">${v.最终结论.结论}</span></td>
        <td><button class="text-btn" data-open="${q.id}">证据</button></td>
      </tr>`;
    }).join("");
  document.getElementById("runsBody").innerHTML = rows || `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px">没有匹配的 Query</td></tr>`;
}

function renderRules() {
  document.getElementById("ruleGrid").innerHTML = RULE_CARDS.map(c => `
    <div class="rule-card" data-rule="${c.key}">
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <span class="rule-tag">点击查看详情</span>
    </div>`).join("");
}

function openRuleDetail(key) {
  const card = RULE_CARDS.find(c => c.key === key);
  const dialog = document.getElementById("runDialog");
  document.getElementById("dialogTitle").textContent = card.title;
  document.getElementById("dialogMeta").textContent = "五维评测规则详情";
  document.getElementById("verdictStrip").innerHTML = "";
  document.getElementById("dialogQueryText").parentElement.style.display = "none";
  const detailHtml = Object.entries(card.detail).map(([k, v]) => {
    const body = Array.isArray(v) ? `<ul style="margin:6px 0 0;padding-left:18px">${v.map(x => `<li style="margin-bottom:4px">${x}</li>`).join("")}</ul>` : `<p style="margin:6px 0 0">${v}</p>`;
    return `<div class="dim-detail is-open"><div class="dim-detail-head"><strong>${k}</strong></div><div class="dim-detail-body" style="display:block">${body}</div></div>`;
  }).join("");
  document.getElementById("dimDetailList").innerHTML = detailHtml;
  document.getElementById("severeBlock").innerHTML = "";
  document.getElementById("summaryBlock").innerHTML = "";
  dialog.showModal();
}

function checklistLine(label, verdict) {
  const cls = verdict === "通过" ? "v-pass" : verdict === "不通过" ? "v-fail" : "v-na";
  return `<div class="checklist-line"><span>${label}</span><span class="${cls}">${verdict}</span></div>`;
}

function openRunDetail(queryId) {
  const q = DataStore.queries.find(x => x.id === queryId);
  const v = DataStore.getVerdict(queryId);
  const dialog = document.getElementById("runDialog");

  document.getElementById("dialogTitle").textContent = `${q.q1}${q.q2 ? '+' + q.q2 : ''} · ${q.project_name}`;
  document.getElementById("dialogMeta").textContent = `${q.id} · ${q.task_type} / ${q.object} · 信息状态：${q.info_state_detail}`;
  document.getElementById("dialogQueryText").parentElement.style.display = "block";
  document.getElementById("dialogQueryText").textContent = q.query_text || "（该行为同轮合并组的子对象，Query 文案见锚点行）";

  const run = DataStore.getRun(queryId);
  document.getElementById("agentOutputBlock").style.display = "block";
  if (run && run.agent_trace) {
    const t = run.agent_trace;
    document.getElementById("agentOutputBody").innerHTML = `
      <div class="agent-output-row"><span class="ao-label">意图识别</span><span>${t.intent_resolved}</span></div>
      <div class="agent-output-row"><span class="ao-label">信息处理</span><span>${t.info_handling}</span></div>
      <div class="agent-output-row"><span class="ao-label">调用的 Skill/工具</span><span>${t.skills_called && t.skills_called.length ? t.skills_called.join('；') : '（未调用）'}</span></div>
      <div class="agent-output-row"><span class="ao-label">项目状态变化</span><span>${t.state_diff}</span></div>
      <div class="agent-output-row"><span class="ao-label">产物</span><span>${t.artifact}</span></div>
      <div class="agent-output-row"><span class="ao-label">最终回复</span><span>${t.final_reply}</span></div>
      <p class="ao-note">以上为当前模拟数据构造的 Agent 运行记录，用于验证下方五维判分逻辑；接入 NexPlay 后将替换为真实执行证据，字段结构不变。</p>
    `;
  } else {
    document.getElementById("agentOutputBody").innerHTML = `<p class="ao-note">未找到本条 Query 对应的 Agent 运行记录。</p>`;
  }

  document.getElementById("verdictStrip").innerHTML = `
    <div class="verdict-item"><span>最终结论</span><strong class="${v.最终结论.结论==='合格'?'pass':'fail'}">${v.最终结论.结论}</strong></div>
    <div class="verdict-item"><span>总分</span><strong>${v.最终结论.总分} / 5</strong></div>
    <div class="verdict-item"><span>最早失败维度</span><strong>${v.最早失败维度 ? DIM_LABELS[v.最早失败维度] : '无'}</strong></div>
    <div class="verdict-item"><span>严重错误</span><strong class="${v.严重错误.是否命中==='是'?'fail':'pass'}">${v.严重错误.是否命中}</strong></div>
  `;

  const dimHtml = v.维度评测.map(d => {
    let bodyHtml = "";
    if (d.key === "d4") {
      bodyHtml += `<div style="font-weight:600;font-size:12px;margin-bottom:4px">Query 指令门槛</div>`;
      bodyHtml += Object.entries(d["Query指令门槛"]).map(([k, val]) => checklistLine(k, val)).join("");
      bodyHtml += `<div style="font-weight:600;font-size:12px;margin:10px 0 4px">本条启用对象：${d["本条启用对象"]}</div>`;
      const gate2 = d["对象内容门槛"];
      if (Object.keys(gate2).length) {
        bodyHtml += Object.entries(gate2).map(([k, val]) => checklistLine(k, val)).join("");
      } else {
        bodyHtml += `<div style="color:var(--text-muted);font-size:12px">门槛一未通过，未进入门槛二检查（符合标准：指令不遵循时停止后续内容检查）。</div>`;
      }
    } else {
      bodyHtml = Object.entries(d.必检项).map(([k, val]) => checklistLine(k, val)).join("");
    }
    bodyHtml += `<div class="evidence-row"><b>证据：</b>${d.证据}<br><b>理由：</b>${d.理由}</div>`;
    return `<div class="dim-detail">
      <div class="dim-detail-head" data-toggle>
        <strong>${d.name}</strong>
        <span class="status-pill ${d.分数===1?'pass':'fail'}">${d.分数}</span>
      </div>
      <div class="dim-detail-body">${bodyHtml}</div>
    </div>`;
  }).join("");
  document.getElementById("dimDetailList").innerHTML = dimHtml;

  document.getElementById("severeBlock").innerHTML = v.严重错误.是否命中 === "是"
    ? `<b style="color:var(--fail)">严重错误命中：</b>${v.严重错误.类型}<br><span style="color:var(--text-muted)">${v.严重错误.证据}</span>`
    : `<b style="color:var(--pass)">严重错误检查：</b>6 类均未命中`;

  document.getElementById("summaryBlock").innerHTML = `<b>总结：</b>${v.最终结论.总结}`;

  dialog.showModal();

  dialog.querySelectorAll(".dim-detail-head[data-toggle]").forEach(head => {
    head.addEventListener("click", () => head.closest(".dim-detail").classList.toggle("is-open"));
  });
}

function initNav() {
  document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item[data-view]").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const view = btn.dataset.view;
      document.querySelectorAll(".view").forEach(v => v.classList.toggle("is-active", v.dataset.view === view));
    });
  });
}

function initRunsView() {
  document.getElementById("searchInput").addEventListener("input", e => {
    currentFilters.search = e.target.value;
    renderRuns();
  });
  document.getElementById("conclusionFilter").addEventListener("change", e => {
    currentFilters.conclusion = e.target.value;
    renderRuns();
  });
  document.getElementById("taskTypeFilter").addEventListener("change", e => {
    currentFilters.taskType = e.target.value;
    renderRuns();
  });
  document.getElementById("objectFilter").addEventListener("change", e => {
    currentFilters.object = e.target.value;
    renderRuns();
  });
  document.getElementById("runsBody").addEventListener("click", e => {
    const btn = e.target.closest("[data-open]");
    if (btn) openRunDetail(btn.dataset.open);
  });
}

function initRulesView() {
  document.getElementById("ruleGrid").addEventListener("click", e => {
    const card = e.target.closest(".rule-card");
    if (card) openRuleDetail(card.dataset.rule);
  });
}

function initDialog() {
  const dialog = document.getElementById("runDialog");
  document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
}

async function boot() {
  await DataStore.load();
  initNav();
  populateFilterOptions();
  renderOverview();
  renderRuns();
  renderRules();
  initRunsView();
  initRulesView();
  initDialog();
}

boot();
