// 数据加载：读取静态 JSON（模拟数据），供 render.js 使用。
// 所有路径均为相对路径，纯静态托管即可运行，无需后端。

const DataStore = {
  queries: [],
  verdicts: {},
  rubrics: {},

  async load() {
    const [queries, verdicts, rubrics] = await Promise.all([
      fetch('data/queries.json').then(r => r.json()),
      fetch('data/verdicts.json').then(r => r.json()),
      fetch('data/rubrics.json').then(r => r.json())
    ]);
    this.queries = queries;
    this.verdicts = verdicts;
    this.rubrics = rubrics;
    return this;
  },

  getVerdict(id) {
    return this.verdicts[id];
  }
};
