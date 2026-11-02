# 工作台二次开发提示词（AI 帮你改这个工作台）

> 复制 → 粘给 CodeX / Trae（工程类，建议这两个；用法差异见 TOOLS-GUIDE.md）。
> 每条已写明涉及文件，AI 不用猜。改前 commit，改坏 `git checkout -- .` 还原。

## 1. 一键换肤（改 4 个变量）

```text
把本工作台品牌色换成我的主色 #______：先换算 HEX→HSL，然后只改 src/styles.css 里 :root 的
--brand / --brand-dark / --brand-light / --brand-tint 四个变量（dark 明度约降 15%，light 约升 12%，
tint 为明度 95%+ 浅底）。其他文件一律不动。
```

## 2. 给客户档案加字段

```text
给客户档案增加字段「______」：
1. src/types.ts 的 Client 接口加该字段（string 类型）
2. server/index.js 的 POST /api/clients 与 PUT /api/clients/:id 路由接受该字段（Object.assign 已通用，确认无需白名单即可跳过）
3. src/views/Clients.tsx：新增客户表单加输入框、列表加一列（窄列）
4. src/views/ClientDetail.tsx：档案区展示该字段
改完跑 npx tsc --noEmit 验证。
```

## 3. 任务看板加一个分组

```text
给 src/views/Tasks.tsx 的任务看板增加一个分组「______」（与现有"今日行动/近期排程/等待池"并列），
分组条件：______。保持现有卡片结构和交互不变，四列布局改为自动换行。
```

## 4. 加一个月度统计页

```text
给工作台新增「统计」页（侧栏入口 src/App.tsx 的 NAV 数组加一项，路由同现有模式）：
新建 src/views/Stats.tsx，从 /api/clients、/api/inquiries、/api/quotes、/api/orders 拉全量数据，
用纯 CSS 柱状条（div 宽度百分比，不引图表库）展示：① 近 6 个月新增客户/询盘数 ② 各等级客户分布
③ 报价转化率（confirmed/总数）④ 订单八阶段分布。样式复用 .card/.th/.td 工具类。
```

## 5. 导出月度跟进报告

```text
在 src/views/Dashboard.tsx 加一个「导出本月报告」按钮：点击后把本月（当月 1 日起）的客户时间线条目、
新询盘、完成任务汇总成一个 Markdown 字符串，用 Blob 下载为 report-YYYY-MM.md。不引入新依赖。
```

## 6. 想要更野的？

把需求描述清楚（效果导向：「我想一眼看到每个客户最近 30 天跟了几次」），交给 AI 自由发挥；
记得先 `git add -A && git commit` 存档，不满意就还原。
