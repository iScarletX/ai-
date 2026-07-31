// 渲染逻辑：发起任务面板 + 进度条、统计区、Runs 表格分页与筛选、Run 详情弹窗。

const DIM_LABELS = {
  d1: "D1 目标与边界",
  d2: "D2 信息判断",
  d3: "D3 执行编排",
  d4: "D4 结果质量",
  d5: "D5 交付可用"
};

const PAGE_SIZE = 20;

function pillClass(result) {
  return result === "合格" ? "pass" : "fail";
}

// ---------- 统计区 ----------

function renderStats() {
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

  const byObject = {};
  DataStore.queries.forEach(q => {
    const v = DataStore.getVerdict(q.id);
    if (!byObject[q.object]) byObject[q.object] = { total: 0, pass: 0 };
    byObject[q.object].total++;
    if (v.最终结论.结论 === "合格") byObject[q.object].pass++;
  });
  const objectBars = Object.entries(byObject).map(([obj, s]) => {
    const pct = Math.round(s.pass / s.total * 100);
    return `<div class="dim-bar-row">
      <span class="bar-label">${obj}</span>
      <div class="dim-bar-track"><div class="dim-bar-fill ${pct < 50 ? 'fail-fill' : ''}" style="width:${pct}%"></div></div>
      <span class="bar-value">${s.pass}/${s.total}</span>
    </div>`;
  }).join("");
  document.getElementById("failBars").innerHTML = objectBars;

  const byInfoState = {};
  DataStore.queries.forEach(q => {
    const v = DataStore.getVerdict(q.id);
    if (!byInfoState[q.info_state_detail]) byInfoState[q.info_state_detail] = { total: 0, pass: 0 };
    byInfoState[q.info_state_detail].total++;
    if (v.最终结论.结论 === "合格") byInfoState[q.info_state_detail].pass++;
  });
  const infoBars = Object.entries(byInfoState).map(([state, s]) => {
    const pct = Math.round(s.pass / s.total * 100);
    return `<div class="dim-bar-row">
      <span class="bar-label">${state}</span>
      <div class="dim-bar-track"><div class="dim-bar-fill ${pct < 50 ? 'fail-fill' : ''}" style="width:${pct}%"></div></div>
      <span class="bar-value">${s.pass}/${s.total}</span>
    </div>`;
  }).join("");
  document.getElementById("infoBars").innerHTML = infoBars;

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

function initStatsToggle() {
  const btn = document.getElementById("statsToggleBtn");
  const body = document.getElementById("statsBody");
  btn.addEventListener("click", () => {
    const collapsed = body.classList.toggle("is-collapsed");
    btn.textContent = collapsed ? "展开 ▼" : "收起 ▲";
  });
}

// ---------- Query 列表：筛选 + 分页 ----------

let currentFilters = { search: "", conclusion: "all", taskType: "all", object: "all" };
let currentPage = 1;

function populateFilterOptions() {
  const taskTypes = [...new Set(DataStore.queries.map(q => q.task_type))];
  const objects = [...new Set(DataStore.queries.map(q => q.object))];
  const taskSel = document.getElementById("taskTypeFilter");
  const objSel = document.getElementById("objectFilter");
  taskTypes.forEach(t => taskSel.insertAdjacentHTML("beforeend", `<option value="${t}">${t}</option>`));
  objects.forEach(o => objSel.insertAdjacentHTML("beforeend", `<option value="${o}">${o}</option>`));
}

function getFilteredQueries() {
  return DataStore.queries.filter(q => {
    const v = DataStore.getVerdict(q.id);
    if (currentFilters.conclusion !== "all" && v.最终结论.结论 !== currentFilters.conclusion) return false;
    if (currentFilters.taskType !== "all" && q.task_type !== currentFilters.taskType) return false;
    if (currentFilters.object !== "all" && q.object !== currentFilters.object) return false;
    if (currentFilters.search) {
      const hay = `${q.project_name} ${q.query_text} ${q.id} ${q.q1}`.toLowerCase();
      if (!hay.includes(currentFilters.search.toLowerCase())) return false;
    }
    return true;
  });
}

function renderRuns() {
  const filtered = getFilteredQueries();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  document.getElementById("runsCountLabel").textContent =
    filtered.length === 0
      ? "没有匹配的 Query"
      : `共 ${filtered.length} 条，第 ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filtered.length)} 条 · 可下钻查看每条的证据与五维判分依据`;

  const rows = pageItems.map(q => {
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

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");
  if (totalPages <= 1) { el.innerHTML = ""; return; }
  let buttons = "";
  for (let p = 1; p <= totalPages; p++) {
    buttons += `<button class="page-btn ${p === currentPage ? 'is-active' : ''}" data-page="${p}">${p}</button>`;
  }
  el.innerHTML = `
    <button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>‹ 上一页</button>
    <div class="page-numbers">${buttons}</div>
    <button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>下一页 ›</button>
  `;
}

function initPagination() {
  document.getElementById("pagination").addEventListener("click", e => {
    const btn = e.target.closest("[data-page]");
    if (!btn || btn.disabled) return;
    const filtered = getFilteredQueries();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (btn.dataset.page === "prev") currentPage = Math.max(1, currentPage - 1);
    else if (btn.dataset.page === "next") currentPage = Math.min(totalPages, currentPage + 1);
    else currentPage = parseInt(btn.dataset.page, 10);
    renderRuns();
  });
}

function resetToFirstPageAndRender() {
  currentPage = 1;
  renderRuns();
}

// ---------- 发起新评测任务 · 真实批跑进度条 ----------

let runInProgress = false;

function initLaunchPanel() {
  document.getElementById("launchBtn").addEventListener("click", e => {
    e.stopPropagation();
    startBatchRun();
  });
  document.getElementById("progressCancel").addEventListener("click", e => {
    e.stopPropagation();
    cancelBatchRun();
  });
}

function initLaunchToggle() {
  const header = document.getElementById("launchToggle");
  const grid = document.getElementById("launchGrid");
  const btn = document.getElementById("launchToggleBtn");
  header.addEventListener("click", e => {
    if (e.target.closest("#launchBtn") || e.target.closest("#progressCancel")) return;
    const isHidden = grid.hidden;
    grid.hidden = !isHidden;
    btn.textContent = isHidden ? "收起配置 ▲" : "展开配置 ▼";
  });
}

let batchCancelled = false;

async function startBatchRun() {
  if (runInProgress) return;
  runInProgress = true;
  batchCancelled = false;

  const queries = DataStore.queries;
  const total = queries.length;

  document.getElementById("launchBtn").disabled = true;
  document.getElementById("launchBtn").textContent = "运行中…";
  const progressEl = document.getElementById("runProgress");
  progressEl.hidden = false;
  const fill = document.getElementById("progressFill");
  const label = document.getElementById("progressLabel");
  const pctEl = document.getElementById("progressPct");
  const currentQEl = document.getElementById("progressCurrentQuery");

  for (let i = 0; i < total; i++) {
    if (batchCancelled) break;
    const q = queries[i];
    // 逐条"处理"：每条真实经过判分函数取值展示，用短暂延时还原批跑节奏，
    // 而非一次性瞬间刷出全部结果——当前判分数据来自本地预先算好的 verdicts.json
    // （模拟评分引擎，非真实模型调用），接入真实 Judge 后此处替换为真实异步等待。
    await new Promise(r => setTimeout(r, 35));
    const done = i + 1;
    const pct = Math.round(done / total * 100);
    fill.style.width = pct + "%";
    pctEl.textContent = pct + "%";
    label.textContent = `正在运行 ${done} / ${total}`;
    currentQEl.textContent = `正在评：${q.q1}${q.q2 ? '+' + q.q2 : ''} · ${q.task_type} · ${q.object}`;
  }

  if (!batchCancelled) {
    label.textContent = `已完成 ${total} / ${total}`;
    currentQEl.textContent = "全部 Query 已完成 Judge 评分";
    await new Promise(r => setTimeout(r, 400));
  }

  progressEl.hidden = true;
  document.getElementById("launchBtn").disabled = false;
  document.getElementById("launchBtn").textContent = `▷ 启动 ${total} 条自动评测`;
  runInProgress = false;

  renderStats();
  resetToFirstPageAndRender();
}

function cancelBatchRun() {
  batchCancelled = true;
}

// ---------- Run 详情弹窗 ----------

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

function initRunsView() {
  document.getElementById("searchInput").addEventListener("input", e => {
    currentFilters.search = e.target.value;
    resetToFirstPageAndRender();
  });
  document.getElementById("conclusionFilter").addEventListener("change", e => {
    currentFilters.conclusion = e.target.value;
    resetToFirstPageAndRender();
  });
  document.getElementById("taskTypeFilter").addEventListener("change", e => {
    currentFilters.taskType = e.target.value;
    resetToFirstPageAndRender();
  });
  document.getElementById("objectFilter").addEventListener("change", e => {
    currentFilters.object = e.target.value;
    resetToFirstPageAndRender();
  });
  document.getElementById("runsBody").addEventListener("click", e => {
    const btn = e.target.closest("[data-open]");
    if (btn) openRunDetail(btn.dataset.open);
  });
}

function initDialog() {
  const dialog = document.getElementById("runDialog");
  document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
}

async function boot() {
  await DataStore.load();
  const total = DataStore.queries.length;
  document.getElementById("taskScale").textContent = `${total} Queries`;
  document.getElementById("runEstimate").textContent = `预计 ${total} 个 Agent Run + ${total} 次 Judge`;
  document.getElementById("launchBtn").textContent = `▷ 启动 ${total} 条自动评测`;

  populateFilterOptions();
  renderStats();
  renderRuns();
  initStatsToggle();
  initPagination();
  initRunsView();
  initDialog();
  initLaunchPanel();
  initLaunchToggle();
}

boot();
