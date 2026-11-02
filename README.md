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

## 🚀 快速开始

```bash
git clone <本仓库地址>
cd ai-trade-workbench
npm install        # 国内网络慢可用: npm install --registry=https://registry.npmmirror.com
npm run dev        # 打开 http://localhost:5173（API 服务自动同起在 5189）
```

- **默认密码 `admin123`**（登录后请立即在「设置 → 账号安全」修改；可用 `.env` 的 `ADMIN_PASSWORD` 自定义初始密码）
- 首次启动自动生成 `data/` 目录（内置示例数据，可随意删改）；全部业务数据都在本地 JSON 文件，零数据库
- 生产部署：`npm run build && npm start` → http://localhost:5189（单端口含前端，改 `PORT` 环境变量换端口）

## 🔗 对接独立站（询盘自动同步）

1. 部署好 [AI-Trade-OfficialSite-Admin](../AI-Trade-OfficialSite-Admin) 独立站
2. 独立站 Admin「询盘管理 → API Keys」签发一把 Key（明文只显示一次）
3. 本工作台「设置 → 独立站对接」填站点地址 + Key → **测试连接** → **立即同步**
4. 之后可打开「每日自动同步」：新询盘自动进询盘池，并生成 48h 内回复待办

## 🛠️ 技术形态

React 18 + Vite + Express + JSON 文件存储（`data/*.json`）——零数据库、`npm run dev` 一键起（API 5189 + 前端 5173 代理）。单管理员鉴权（bcrypt + HMAC 签名 cookie）。设计令牌与独立站模板同源（`src/styles.css` 改 4 个 HSL 变量换肤）。

## 🗺️ 开发路线

- [x] **P0**：repo 初始化 + 数据模型定义 + 同步契约冻结
- [x] **P4**（2026-11-02）：八大模块全部实现 + 独立站同步客户端（测试连接/立即同步/每日自动/去重/48h 待办）——与实站 E2E 打通
- [x] **P5 起步**：内置 6 条场景提示词（变量自动填充）；完整 12 条 × 三工具版本随课程提供
- [ ] **P6**：小白文档 + FAQ 手册

详见 `docs/ROADMAP.md`。

## 🤖 用 AI 扩展功能

仓库内置 `prompts/` 提示词库（P5 提供）：新增行业字段、改看板分组、加统计报表——把提示词丢给 CodeX / WorkBuddy / Trae 即可，不需要自己会写代码。

## 📄 License

MIT — 可免费商用与二次开发。
