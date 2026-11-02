# 架构与二次开发指南

> 5 分钟看懂工作台怎么运转、往哪里下刀。二开提示词（可直接丢给 AI）见 `prompts/extend-prompts.md`。

## 目录地图

```
AI-Trade-Workbench/
├── seeds/            # 模板数据（首次启动复制到 data/；含 12 条提示词）
├── data/             # 你的业务数据（JSON 文件，gitignore；备份=拷这个目录）
├── server/           # Express API（纯 JS，零框架魔法）
│   ├── index.js      # 全部路由：鉴权/客户/询盘/报价/订单/任务/同步/备份
│   ├── store.js      # JSON 文件存取（原子写入）
│   └── auth.js       # bcrypt 密码 + HMAC 签名 cookie
└── src/              # React 前端（Vite + TS + Tailwind）
    ├── App.tsx       # 布局 + 登录守卫 + 路由
    ├── api.ts        # 统一请求封装（401 自动跳登录）
    ├── utils.ts      # 日期/CSV 工具
    └── views/        # 12 个页面（对应侧栏 8 大模块）
```

## 数据流（一句话版）

**页面 fetch `/api/*` → server 读写 `data/*.json` → 页面重载列表。没有数据库、没有缓存层，所见即所得。**

三个关键机制（都在 `server/index.js`，各约 10 行）：

1. **跟进节奏引擎**：`cadenceNextFollowUp(grade, date)` —— 记跟进不指定日期时按 A+7/B+14/C+30/D+45 自动推，并 `syncFollowUpTask` 生成 `fu-<clientId>` 提醒任务
2. **任务完成回写**：带 clientId 的任务标记 done → 客户时间线自动追加「跟进任务完成」+ 推进 lastFollowUp
3. **同步客户端**：`doSync()` 增量拉独立站（契约见 docs/CONTRACT-inquiry-sync.md）→ 去重入库 + 生成 48h 回复待办；每小时定时器检查 ≥24h 自动触发

## 常见二开场景

**加字段**：`src/types.ts` 加类型 → `views/` 对应表单/展示加一行 → server 的 POST/PUT 用 `Object.assign` 天然放行（无需改）。

**加页面**：`views/` 新建组件 → `App.tsx` 的 NAV 数组和 Routes 各加一行。

**改节奏规则**：`server/index.js` 顶部 `GRADE_CADENCE_DAYS` 一个对象搞定。

**加一块数据**：`seeds/` 加 `xxx.json`（空数组）→ server 加 GET/POST 路由 → 前端加页面。参考 tasks 的实现照抄即可。
