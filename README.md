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
git clone https://github.com/kalee777777/AI-Trade-Workbench.git
cd AI-Trade-Workbench
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

## 📧 对接 Gmail（询盘自动进池）

让询盘邮件自动流进询盘池（与独立站表单并列为第二进食管）：

1. Google 账号开启两步验证 → 生成[应用密码](https://myaccount.google.com/apppasswords)（**不是登录密码**）
2. 复制 `.env.example` 为 `.env`，填 `GMAIL_USER` / `GMAIL_APP_PASSWORD`
3. 重启工作台 —— 自动每 15 分钟拉取：规则清洗（机器信/订阅信/中文日常信出局）→ 评分判断是否询盘 → 抽取姓名/公司/国家/产品/正文入池（蓝标 📧 Gmail）

增量断点续传（`data/gmail-state.json`），永不重复入池；凭据只在本机 `.env`（gitignored）。手动触发：登录后 `POST /api/gmail/pull`。

**P1 · AI 分诊（可选）**：在 `.env` 里配任意 OpenAI 兼容端点（`LLM_API_BASE` / `LLM_API_KEY` / `LLM_MODEL`，GLM、DeepSeek、Ollama 都行），规则初筛通过的邮件会再送 LLM 精判：识别真假询盘、自动 **A/B/C/D 分级**、修正姓名/公司/国家/产品、生成一句话采购信号（⚡ 显示在询盘卡上）。LLM 失败自动回落纯规则模式，永不阻塞入池。

**懒人通道**：自己只做「生成应用密码」一步，其余交给你的 AI Agent —— 抄 [prompts/gmail-setup.md](prompts/gmail-setup.md) 的提示词填上邮箱/密码/Key 即可；手动验证用 `npm run gmail:pull`。

## 🛠️ 技术形态

React 18 + Vite + Express + JSON 文件存储（`data/*.json`）——零数据库、`npm run dev` 一键起（API 5189 + 前端 5173 代理）。单管理员鉴权（bcrypt + HMAC 签名 cookie）。设计令牌与独立站模板同源（`src/styles.css` 改 4 个 HSL 变量换肤）。

## 🗺️ 开发路线

- [x] **P0**：repo 初始化 + 数据模型定义 + 同步契约冻结
- [x] **P4**（2026-11-02）：八大模块全部实现 + 独立站同步客户端（测试连接/立即同步/每日自动/去重/48h 待办）——与实站 E2E 打通
- [x] **P5 起步**：内置 6 条场景提示词（变量自动填充）；完整 12 条 × 三工具版本随课程提供
- [ ] **P6**：小白文档 + FAQ 手册

详见 `docs/ROADMAP.md`。

## 🤖 用 AI 扩展功能

- **业务向 12 条场景提示词**（App 内「AI 提示词」页）：开发信首信/跟进激活/询盘回复/报价跟进/价格谈判/催尾款/客户背调/市场摸底/询盘分级/周复盘/沉睡唤醒/样品推进——`{{your_name}}` 等变量用你的设置自动填充，一键复制即用
- **三工具指南** [`prompts/TOOLS-GUIDE.md`](prompts/TOOLS-GUIDE.md)：CodeX/WorkBuddy/Trae 各自强项、业务提示词通用用法、工程提示词三工具模板
- **二开提示词** [`prompts/extend-prompts.md`](prompts/extend-prompts.md)：换肤/加字段/改看板/加统计页/导报告——写明涉及文件，AI 不用猜
- 完整行业话术库（1+7 开发信序列全量版）随课程提供

## 📚 文档导航

| 文档 | 内容 |
|---|---|
| [部署与数据说明 DEPLOY](docs/DEPLOY.md) | 本地/VPS 部署、数据备份与搬家、升级 |
| [常见问题 FAQ](docs/FAQ.md) | 忘记密码、端口关系、同步失败等 12 类排查 |
| [架构与二开 EXTEND](docs/EXTEND.md) | 目录地图、跟进节奏引擎等三大机制、加字段/加页面 |
| [同步契约 CONTRACT](docs/CONTRACT-inquiry-sync.md) | 询盘同步 API v1（与独立站仓库同文） |
| [三工具指南](prompts/TOOLS-GUIDE.md) · [二开提示词](prompts/extend-prompts.md) | CodeX/WorkBuddy/Trae 用法 + 6 条现成二开提示词 |

## 📄 License

MIT — 可免费商用与二次开发。
