# 数据模型 v1（data/*.json，零数据库）

> 实体与关键字段定义。P4 实现时以此为唯一参照；字段增补需更新本文件并升版本。

## Client（客户）

```jsonc
{
  "id": "cl-0001",                  // 自增或 slug
  "name": "Acme Trading Co., Ltd.", // 公司名（原文）
  "country": "United States",
  "contact": "John Smith · Purchasing Manager",
  "email": "john@acme.com",
  "phone": "+1 555 000 0000",
  "grade": "B",                      // A/B/C/D 分级 → 决定跟进节奏
  "stage": "potential",              // potential 潜在 / intent 意向 / won 成交 / dormant 沉睡
  "source": "website",               // website 独立站 / manual / platform / exhibition / social / outreach
  "product": "Product A",
  "tags": ["US", "OEM"],
  "notes": "",
  "lastFollowUp": "2026-11-01",
  "nextFollowUp": "2026-11-15",      // 自动按节奏推导：A+7 / B+14 / C+30 / D+45 天
  "timeline": [
    { "date": "2026-11-01", "content": "Sent first reply with catalog", "method": "email", "result": "awaiting reply", "nextStep": "Follow up if no reply in 5 days" }
  ]
}
```

## Inquiry（询盘）

```jsonc
{
  "id": "INQ-20261102-0007",        // 独立站同步沿用站点 id；手动登记 INQ-local-xxx
  "receivedAt": "2026-11-02T08:14:00.000Z",
  "name": "John Smith",
  "email": "john@buyer.com",
  "company": "Buyer Inc.",
  "country": "United States",
  "phone": "+1 555 000 0000",
  "product": "product-a",
  "message": "Need 500 units of Product A, CIF Los Angeles.",
  "source": "website",               // website / manual / platform / exhibition / social
  "sourceDetail": "product-page",    // 独立站带回的原始 source
  "pageUrl": "https://example.com/products/product-a",
  "status": "new",                   // new / graded / replied / quoted / won / closed
  "grade": null,                     // A/B/C/D，分级后回填
  "clientId": null,                  // 转客户后回填
  "taskId": null                     // 48h 回复待办回填
}
```

## Quote（报价）

```jsonc
{
  "id": "QT-20261102-01",
  "clientId": "cl-0001",
  "items": [
    { "name": "Product A", "spec": "1.5m × 2.0m, Q235B", "qty": 500, "unit": "pcs", "unitPrice": 12.5, "currency": "USD" }
  ],
  "validUntil": "2026-12-02",
  "status": "draft",                 // draft / sent / confirmed / expired
  "note": ""
}
```

## Order（订单）

```jsonc
{
  "id": "PO-20261115-01",
  "clientId": "cl-0001",
  "quoteId": "QT-20261102-01",
  "amount": 6250,
  "currency": "USD",
  "depositPct": 30,
  "stages": {                         // 外贸八阶段，值为完成日期（null=未到）
    "pi": "2026-11-15", "deposit": "2026-11-16", "production": null,
    "inspection": null, "shipment": null, "balance": null, "bl": null, "received": null
  },
  "status": "in_production"
}
```

## Task（任务）

```jsonc
{
  "id": "t-0001",
  "title": "Reply to INQ-20261102-0007 within 48h",
  "clientId": null,                   // 关联客户（跟进任务必填）
  "due": "2026-11-04",
  "execState": "pending",             // pending / scheduled / sent / awaiting
  "done": false,
  "createdAt": "2026-11-02T09:00:00.000Z"
}
```

## PromptTemplate（AI 提示词）

```jsonc
{
  "id": "p-first-email",
  "category": "outreach",            // outreach / followup / reply / quote / negotiate / payment / research
  "tool": "all",                      // all / codex / workbuddy / trae
  "scene": "开发信首信",
  "title": "Cold outreach first email",
  "body": "Write a first-touch email to {{name}} at {{company}} ...",  // {{变量槽}} 自动填充
  "example": "……"
}
```

## SiteLink（独立站对接配置）

```jsonc
{
  "url": "https://example.com",
  "apiKey": "sk-site-…",
  "lastSyncAt": "2026-11-02T09:00:00.000Z",
  "autoSync": true                    // 每日自动同步开关
}
```

## 派生规则（服务端实现）

- **跟进节奏**：记跟进事件不显式指定下次跟进日时，按 `grade` 推导 nextFollowUp（A+7 / B+14 / C+30 / D+45 天，自事件日起算）并生成提醒任务
- **任务完成回写**：带 clientId 的任务标记 done → 客户时间线自动追加条目 + 推进 lastFollowUp
- **询盘转客户**：以 email 与现有客户去重；命中则只追加时间线，未命中则新建客户（grade 待定，默认 C）
