# 常见问题与报错排查（FAQ）

| 症状 | 原因与解法 |
|---|---|
| 双击 `index.html` 打不开 | 这是 Node 应用不是静态网页：用 `npm run dev`（开发，:5173）或 `npm run build && npm start`（生产，:5189） |
| 5173 和 5189 什么关系 | dev 模式：前端 5173 + API 5189 同时起（Vite 代理转发）；生产模式合并成一个 5189 |
| 忘记密码 | 打开 `data/settings.json`，把 `"auth": { "passwordHash": "…" }` 里的哈希值改成空字符串 `""`，重启后恢复默认 `admin123` |
| 「独立站对接」测试连接失败 | ① 站点地址要带 `https://` 且不带末尾斜杠；② 403=Key 被吊销，去独立站后台重新签发；③ 超时=站点没上线或地址写错 |
| 同步报「站点返回 5xx」 | 独立站那边出错：打开站点首页确认能访问；Vercel 部署的检查是否配了数据库 |
| 同步导入了重复询盘？ | 不会——按询盘 ID 去重；但同一询盘在两台工作台会各自导入一份（各自独立数据库） |
| 我改了 `seeds/prompts.json` 但 App 里没变 | seeds 只在**首次启动**复制到 `data/`；之后改 `data/prompts.json`（或删掉它重启重新灌入） |
| 换了台电脑数据全没了 | 数据在旧电脑的 `data/` 目录——按 DEPLOY.md「搬家」一节整目录拷贝 |
| `npm install` 很慢 | 国内镜像：`npm install --registry=https://registry.npmmirror.com` |
| 端口被占 EADDRINUSE | `PORT=5190 npm start` 换端口（dev 的 API 端口改 `server/index.js` 顶部默认值或 vite.config.ts 代理目标） |
| 打印报价单样式乱 | 用浏览器打印（⌘/Ctrl+P），边距选「默认」、勾选「背景图形」 |
| 跟进节奏不对（下次跟进日期） | 规则：A+7/B+14/C+30/D+45 天，从**事件日**起算；记跟进时可手动指定日期覆盖 |
