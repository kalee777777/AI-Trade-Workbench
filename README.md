# AI Trade Workbench（轻量外贸业务员 AI 工作台）

> English: A lightweight AI-powered workbench for foreign-trade salespeople — clients, inquiries, quotes, orders, tasks and a built-in AI prompt library. Runs locally with zero database setup. (中文文档如下)

面向外贸业务员 / SOHO / 小团队的**轻量 AI 工作台**：客户分层台账、询盘池、报价、订单追踪、任务看板、内置 AI 提示词库——数据全部存在本地 JSON 文件，零数据库、零上云，克隆即用。

配套姊妹项目：**[AI-Trade-OfficialSite-Admin](../AI-Trade-OfficialSite-Admin)**（带 Admin 后台的 SEO 友好外贸独立站模板）——独立站询盘表单收到的客户询单，可一键同步进本工作台的询盘池统一跟进（契约见 `docs/CONTRACT-inquiry-sync.md`）。

---

## 🧩 八大模块

| # | 模块 | 解决什么 |
|---|---|---|
| 1 | 📊 工作台首页 | 今日待办 / 待跟进客户提醒 / 本周数据 |
| 2 | 👥 客户管理 | 四层台账（潜在/意向/成交/沉睡）+ 跟进时间线 + **A+7/B+14/C+30/D+45 节奏自动提醒** |
| 3 | 📥 询盘池 | 手动登记 + **独立站同步** + A–D 分级 + 一键转客户 |
| 4 | 💰 报价管理 | 报价记录 / 状态流转 / 报价转订单 / HTML 模板打印 |
| 5 | 📦 订单追踪 | 外贸八阶段进度（PI→定金→生产→验货→出货→尾款→提单→收货） |
| 6 | ✅ 任务看板 | 待办看板 + 客户跟进专区（今日行动/近期排程/等待池）+ 完成自动回写客户时间线 |
| 7 | 🤖 AI 提示词库 | 客户开发/开发信/询盘回复/谈判/催款场景提示词，变量槽自动填充，一键复制 |
| 8 | ⚙️ 设置 | 个人信息（喂给提示词库）/ **独立站对接（URL+API Key）** / 数据备份恢复 |

## 🚀 快速开始（P4 开发完成后可用）

```bash
git clone <本仓库地址>
cd ai-trade-workbench
npm install
npm run dev        # 打开 http://localhost:5188
```

## 🛠️ 技术形态

React 18 + Vite + Express + JSON 文件存储（`data/*.json`）——已验证的极简架构：零数据库、单端口、数据随时备份/导出 CSV。单管理员账号。

## 🗺️ 开发路线

- [x] **P0**：repo 初始化 + 数据模型定义 + 同步契约冻结
- [ ] **P4**（11/10–11/19）：八大模块实现 + 独立站同步客户端 + 备份导出
- [ ] **P5**：AI 提示词库内容（约 12 条场景 × CodeX/WorkBuddy/Trae 三版本）
- [ ] **P6**：小白文档 + FAQ

详见 `docs/ROADMAP.md`。

## 🤖 用 AI 扩展功能

仓库内置 `prompts/` 提示词库（P5 提供）：新增行业字段、改看板分组、加统计报表——把提示词丢给 CodeX / WorkBuddy / Trae 即可，不需要自己会写代码。

## 📄 License

MIT — 可免费商用与二次开发。
