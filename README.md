# AI 自动评测 · 互动影游 Agent 五维评测

依据飞书文档设计与实现：

- **评分标准**：《互动影游 Agent 五维评测执行标准》
- **Query 数据**：《测评Query构建》XHkZeV 子表（98 条真实构造 Query）

目标：把 Longbean 平台"AI 自动评测"页面背后的真实逻辑设计出来——对每一条 Query，严格按五维标准打出 D1–D5 分数，取代人工逐条评审。

本仓库为 **private**，不通过 GitHub Pages 公开发布。查看方式：clone 本仓库或下载 ZIP 后，直接在浏览器打开 `index.html`（纯静态页面，零构建依赖，不需要安装任何东西、不需要跑任何命令）。

## 打开方式

1. `git clone` 本仓库，或点 GitHub 页面上的 “Code → Download ZIP”
2. 双击 `index.html`，浏览器会自动打开首页
3. 首页有两个入口，分别对应下面两个交付物

## 两个交付物

- **`spec/index.html`** — 项目说明书：完整设计思路、流程图、五维标准详解、双门槛机制讲解，复杂概念点击即弹窗展开详情
- **`demo/index.html`** — AI 评测工作台：98 条真实 Query 全部装入，跑出五维判分结果，可逐条下钻查看证据与结论，并可与"人工评审视角"对照

## 目录结构

```
index.html          — 首页，链接到下面两个交付物
spec/                — 交付物1：项目说明书
  index.html
  spec.css
  spec.js
  judge-system-prompt.md   — Judge 完整指令，严格对齐标准原文，未添加标准之外的字段
  object-rubrics.json      — 维度4门槛二 · 6类对象检查清单，逐条对应标准原表
demo/                — 交付物2：AI 评测工作台演示页
  index.html
  styles.css
  js/
    data-loader.js         — 加载 Query / 模拟运行结果 / 判分结果
    render.js               — 渲染工作台界面与详情弹窗
  data/
    queries.json         — 98 条真实 Query（含项目背景、主任务类型、对象、信息状态、Query原文）
    simulated_runs.json  — 模拟 Agent 运行结果
    verdicts.json         — 按五维标准跑出的判分结果（D1-D5 + 双门槛 + 严重错误 + 最终结论）
    rubrics.json           — 对象内容检查清单（供前端展示用）
```

## 重要边界（诚实披露，不是隐藏问题）

**当前演示页里的"Agent 运行结果"是模拟构造的，不是从 NexPlay 真实执行拿到的。** 用途是验证评分引擎逻辑本身是否正确可用——即：给定一套 Agent 行为描述，Judge 能否严格按照标准的五维规则（含维度4的双门槛联动、严重错误一票否决、最早错误归因）算出正确结论。

真实数据接入后的替换方式：把 `demo/data/simulated_runs.json` 换成 NexPlay 真实产出的执行记录，判分逻辑（`spec/judge-system-prompt.md` 定义的规则）与输出字段结构不需要改动。

## 数据来源与依据

严格依据以下两份飞书文档构建，不掺入其他推断或凭空设计的规则：

1. 《互动影游 Agent 五维评测执行标准》—— D1-D5 定义、双门槛机制、严重错误清单、结论映射、标准输出格式，均逐句核对自原文
2. 《测评Query构建》XHkZeV 子表 —— 98 条真实构造 Query，覆盖 13 个虚构项目、6 种主任务类型、6 类对象、5 种信息状态
