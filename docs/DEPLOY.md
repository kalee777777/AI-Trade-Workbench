# 部署与数据说明（小白版）

> 工作台是你的**私人业务数据库**，默认跑在自己电脑上，数据不出本机。常见报错见 [FAQ](./FAQ.md)。

## 本地运行（默认用法，10 分钟）

```bash
# 1. 安装 Node.js 20+（nodejs.org 下载 LTS）
# 2. 克隆并安装
git clone https://github.com/<你的用户名>/AI-Trade-Workbench.git
cd AI-Trade-Workbench
npm install        # 慢就用：npm install --registry=https://registry.npmmirror.com
# 3. 启动（一条命令同时起 API + 前端）
npm run dev        # 打开 http://localhost:5173
```

默认密码 `admin123`，登录后立即到「设置 → 账号安全」修改。首次启动自动生成 `data/` 目录（内置示例数据，随意删改）。

## 生产模式（单端口）

```bash
npm run build
npm start          # http://localhost:5189（前端+API 同端口；PORT 环境变量可改）
```

## 放到 VPS / 公司内网（可选）

```bash
git clone … && cd AI-Trade-Workbench
npm ci && npm run build
PORT=5189 pm2 start npm --name workbench -- start
# Nginx 反代 5189；如需公网访问请务必：改成强密码 + 上 HTTPS + 限制来源 IP
```

## 数据在哪、怎么备份、怎么搬家

- **全部业务数据**在 `data/` 目录的 JSON 文件里（clients/inquiries/quotes/orders/tasks/prompts/settings）——零数据库
- **备份**：① App 内「设置 → 导出备份 JSON」；② 直接拷贝 `data/` 目录
- **换电脑**：新机器装好环境 → 把整个项目拷过去（或重新 clone 后）→ 把旧 `data/` 目录覆盖进去 → 启动即恢复
- **升级版本**：`git pull && npm install && npm run build`（data/ 目录不受影响）

## 对接独立站（询盘自动同步）

见仓库 README「对接独立站」一节：独立站签发 API Key → 本台「设置 → 独立站对接」填入 → 测试连接 → 立即同步 / 每日自动同步。
