# 接通 Gmail 询盘管道 · 一键提示词

学员只需自己做**一件 Agent 替代不了的事**（Google 的安全设计，谁也绕不开）：

> **生成应用密码**（2 分钟）：开启[两步验证](https://myaccount.google.com/security) → 打开 [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → 起名 `trade-workbench` → 复制 16 位密码（**不是你的 Gmail 登录密码！**）

然后把下面提示词填好【】抄给你的 Agent（ZCode / WorkBuddy / Trae 均可），其余全部自动：

---

```
我的询盘邮箱和 AI Key 如下，请帮我接通 AI-Trade-Workbench 工作台的 Gmail 询盘管道：

- Gmail 邮箱：【you@gmail.com】
- Gmail 应用密码（16 位，不是登录密码）：【abcd efgh ijkl mnop】
- LLM 端点：【https://open.bigmodel.cn/api/paas/v4】（没有就留空=纯规则模式）
- LLM Key：【sk-...】
- LLM 模型：【glm-4.6】

请按顺序执行：
1. 在项目根目录创建 .env（参考 .env.example 的键名），写入 GMAIL_USER /
   GMAIL_APP_PASSWORD / GMAIL_POLL_MINUTES=15 / LLM_API_BASE / LLM_API_KEY / LLM_MODEL。
   写之前确认 .env 在 .gitignore 里（必须永不提交）。
2. 运行 npm run gmail:pull 做首次拉取，把 fetched / kept / skipped 数字告诉我。
3. 如果 kept > 0：启动工作台（npm run dev），我登录后到询盘池确认蓝标「📧 Gmail」
   的询盘、看看 A/B/C/D 分级和 ⚡ 采购信号是否合理。
4. 如果 kept = 0 且 fetched > 0：把跳过明细给我看，判断是我的邮件确实不是询盘，
   还是规则太严需要调阈值。
5. 最后重启工作台让每 15 分钟自动轮询生效。
安全红线：我的邮箱密码和 Key 只允许写进 .env 本地文件，不得打印到终端回显之外的
任何地方、不得写入任何会提交到 git 的文件。
```

---

## Agent 执行对照表（自查用）

| 步骤 | 命令/动作 | 成功标志 |
|---|---|---|
| 1 配置 | 写 `.env` | `git status` 看不到 .env |
| 2 首拉 | `npm run gmail:pull` | `✓ 拉取完成 {fetched, kept, skipped}` |
| 3 查池 | `npm run dev` → 询盘池 | 蓝标 📧 Gmail + 分级 + ⚡信号 |
| 4 常驻 | 重启服务 | 启动日志 `[gmail] 询盘管道已启用` |

## 常见故障速查

- `IMAP 认证失败` → 应用密码不对（去 Google 重新生成；确认账号开了两步验证）
- `LLM 分诊失败(回落规则层)` → LLM key/端点/模型名三者不匹配；询盘照常入池，只是没分级
- `kept=0` → 收件箱确实没新询盘，或邮件全被规则拦（把跳过明细发给 Agent 分析阈值）
