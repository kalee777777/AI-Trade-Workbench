# 询盘同步 API 契约 v1（独立站 ⇄ 工作台）

> 本文档在两个仓库中各存一份，**内容必须保持一致**；变更契约需双仓库同步修改并升版本号。

## 同步模型

**工作台拉取独立站（Pull）**。工作台运行在学员本地/私网（无公网地址），独立站部署在公网——由工作台持 API Key 主动增量拉取。

```
工作台（本地）── GET /api/sync/inquiries?since=… ──▶ 独立站（公网）
                      ◀──────── JSON 询盘列表 ────────┘
```

- API Key 由独立站 **Admin 后台 → 询盘管理 → API Keys** 签发（P2 提供；明文仅创建时显示一次，可随时吊销）
- Key 仅授权读取询盘集合，不能读写任何其他资源
- 幂等：工作台按 `id` 去重；增量用 `since`（ISO 8601，取上次同步返回的最大 `createdAt`）

## 接口定义

### GET /api/sync/inquiries

| 项 | 值 |
|---|---|
| Header | `X-Api-Key: <key>` |
| Query | `since`（可选，ISO 8601）· `limit`（默认 50，最大 100）· `cursor`（可选，翻页） |

**200 响应**

```json
{
  "inquiries": [
    {
      "id": "INQ-20261102-0007",
      "createdAt": "2026-11-02T08:14:00.000Z",
      "name": "John Smith",
      "email": "john@buyer.com",
      "company": "Buyer Inc.",
      "country": "United States",
      "phone": "+1 555 000 0000",
      "product": "product-a",
      "message": "Need 500 units of Product A, CIF Los Angeles.",
      "source": "product-page",
      "pageUrl": "https://example.com/products/product-a",
      "status": "new"
    }
  ],
  "nextCursor": "INQ-20261102-0007",
  "hasMore": false
}
```

**错误**：`401` 未带 Key · `403` Key 无效/已吊销 · `429` 超限流（60 次/小时/Key）

## 工作台侧流程（AI-Trade-Workbench 实现）

1. 设置页填「站点 URL + API Key」→ 测试连接（拉 1 条验证）
2. 手动「立即同步」或每日自动同步
3. 新询盘入询盘池（来源标「独立站」）→ 提示一键分级（A–D）→ 一键转客户（email 去重）→ 自动生成 48h 回复待办

## v2（预留，双向）

- `PATCH /api/sync/inquiries/:id`：工作台回写处理状态（已回复/已成交），Admin 后台同步可见
