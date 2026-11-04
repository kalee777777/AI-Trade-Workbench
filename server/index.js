import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, save, newId, ensureData } from './store.js';
import { gmailConfigured, pullGmail, ATT_DIR } from './gmail.mjs';
import {
  COOKIE_NAME, COOKIE_OPTIONS, getSettings, saveSettings, isDefaultPassword,
  verifyPassword, setPassword, createSessionToken, verifySessionToken,
} from './auth.js';

/**
 * AI Trade Workbench API 服务
 * - 数据：data/*.json（零数据库；首次启动从 seeds/ 生成）
 * - 鉴权：HMAC 签名 cookie；除 /api/auth/login 外全部需要登录
 * - 业务闭环：跟进事件自动按等级节奏推导 nextFollowUp；带 clientId 的任务完成自动回写客户时间线
 * - 同步：对接 AI-Trade-OfficialSite-Admin 的 GET /api/sync/inquiries（契约 docs/CONTRACT-inquiry-sync.md）
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5189);

/* .env 极简装载（KEY=VALUE，# 注释；不引入 dotenv 依赖） */
(function loadEnvFile() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
})();

ensureData();

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

/* ---------- 鉴权 ---------- */

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || !verifyPassword(String(password))) {
    return res.status(401).json({ error: '密码不正确' });
  }
  res.cookie(COOKIE_NAME, createSessionToken(), COOKIE_OPTIONS);
  res.json({ ok: true, defaultPassword: isDefaultPassword() });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ ok: verifySessionToken(req.cookies?.[COOKIE_NAME]), defaultPassword: isDefaultPassword() });
});

app.use('/api', (req, res, next) => {
  if (!verifySessionToken(req.cookies?.[COOKIE_NAME])) {
    return res.status(401).json({ error: '未登录' });
  }
  next();
});

app.post('/api/auth/password', (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!verifyPassword(String(oldPassword || ''))) return res.status(400).json({ error: '旧密码不正确' });
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: '新密码至少 6 位' });
  setPassword(String(newPassword));
  res.json({ ok: true });
});

/* ---------- 工具 ---------- */

const GRADE_CADENCE_DAYS = { A: 7, B: 14, C: 30, D: 45 };

function cadenceNextFollowUp(grade, fromDate) {
  const days = GRADE_CADENCE_DAYS[grade] ?? 30;
  const d = new Date(fromDate || Date.now());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function syncFollowUpTask(client) {
  const tasks = load('tasks', []);
  const canonicalId = `fu-${client.id}`;
  const due = client.nextFollowUp;
  if (!due) return tasks;
  const existing = tasks.find((t) => t.id === canonicalId);
  const entry = {
    id: canonicalId,
    title: `跟进 ${client.name}（${client.grade} 级 · ${due} 到期）`,
    clientId: client.id,
    due,
    execState: 'pending',
    done: false,
    createdAt: new Date().toISOString(),
  };
  if (existing) {
    // 已完成且到期日相同 → 不复活；否则更新到期日并恢复未完成
    if (existing.done && existing.due === due) return tasks;
    Object.assign(existing, entry, { done: false });
  } else {
    tasks.push(entry);
  }
  save('tasks', tasks);
  return tasks;
}

/* ---------- 个人资料 / 站点对接 ---------- */

app.get('/api/profile', (req, res) => res.json(getSettings().profile));

app.put('/api/profile', (req, res) => {
  const s = getSettings();
  s.profile = { ...s.profile, ...req.body };
  saveSettings(s);
  res.json(s.profile);
});

app.get('/api/site-link', (req, res) => {
  const { url, apiKey, autoSync, lastSyncAt } = getSettings().siteLink;
  res.json({ url, apiKey: apiKey ? `${apiKey.slice(0, 12)}…${apiKey.slice(-4)}` : '', hasKey: Boolean(apiKey), autoSync, lastSyncAt });
});

app.put('/api/site-link', (req, res) => {
  const s = getSettings();
  const { url, apiKey, autoSync } = req.body || {};
  s.siteLink.url = url !== undefined ? String(url).replace(/\/$/, '') : s.siteLink.url;
  if (apiKey) s.siteLink.apiKey = String(apiKey).trim(); // 留空表示不修改
  if (autoSync !== undefined) s.siteLink.autoSync = Boolean(autoSync);
  saveSettings(s);
  res.json({ ok: true });
});

/** 测试连接：向独立站拉 1 条验证 URL+Key（契约 GET /api/sync/inquiries?limit=1）。 */
app.post('/api/site-link/test', async (req, res) => {
  const { url, apiKey } = getSettings().siteLink;
  if (!url || !apiKey) return res.status(400).json({ ok: false, error: '请先填写站点地址与 API Key' });
  try {
    const r = await fetch(`${url}/api/sync/inquiries?limit=1`, { headers: { 'X-Api-Key': apiKey } });
    if (r.status === 401 || r.status === 403) return res.json({ ok: false, error: `Key 无效或已吊销（${r.status}）` });
    if (!r.ok) return res.json({ ok: false, error: `站点返回 ${r.status}` });
    const data = await r.json();
    res.json({ ok: true, count: data.inquiries?.length ?? 0 });
  } catch (e) {
    res.json({ ok: false, error: `无法连接：${e.message}` });
  }
});

/** 同步实现：增量拉取（since=lastSyncAt）→ 按 id 去重 → 入询盘池 + 生成 48h 回复待办。 */
async function doSync() {
  const s = getSettings();
  const { url, apiKey, lastSyncAt } = s.siteLink;
  if (!url || !apiKey) throw new Error('请先在设置中配置并测试独立站对接');

  const inquiries = load('inquiries', []);
  const tasks = load('tasks', []);
  const known = new Set(inquiries.map((i) => i.id));
  let imported = 0;
  let cursor = lastSyncAt || '';

  for (let round = 0; round < 20; round++) {
    const qs = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) });
    const r = await fetch(`${url}/api/sync/inquiries?${qs}`, { headers: { 'X-Api-Key': apiKey } });
    if (!r.ok) throw new Error(`站点返回 ${r.status}${r.status === 403 ? '（Key 无效或已吊销）' : ''}`);
    const data = await r.json();

    for (const item of data.inquiries) {
      if (known.has(item.id)) continue;
      const taskId = newId('t');
      inquiries.push({
        id: item.id,
        receivedAt: item.createdAt,
        name: item.name, email: item.email, company: item.company,
        country: item.country, phone: item.phone,
        product: item.product, message: item.message,
        source: 'website', sourceDetail: item.source, pageUrl: item.pageUrl,
        status: 'new', grade: null, clientId: null, taskId,
      });
      known.add(item.id);
      imported++;
      tasks.push({
        id: taskId,
        title: `48h 内回复询盘 ${item.id}（${item.name}）`,
        clientId: null,
        due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        execState: 'pending',
        done: false,
        createdAt: new Date().toISOString(),
      });
    }

    if (!data.hasMore || !data.nextCursor) break;
    cursor = data.nextCursor;
  }

  save('inquiries', inquiries);
  save('tasks', tasks);
  s.siteLink.lastSyncAt = new Date().toISOString();
  saveSettings(s);
  return imported;
}

app.post('/api/sync/now', async (req, res) => {
  try {
    const imported = await doSync();
    res.json({ ok: true, imported });
  } catch (e) {
    res.status(502).json({ error: `同步失败：${e.message}` });
  }
});

/* ---------- Gmail 询盘管道（W3 · P0；.env 配 GMAIL_USER 即启用）---------- */

/* P2：附件下载（RFQ/规格书）——只允许下载已登记在询盘上的文件，双防路径穿越 */
app.get('/api/inquiries/:id/attachments/:file', (req, res) => {
  const { id, file } = req.params;
  const inq = load('inquiries', []).find((i) => i.id === id);
  const rec = inq?.attachments?.find((a) => a.file === file);
  if (!rec) return res.status(404).json({ error: '附件不存在' });
  const safeDir = path.resolve(ATT_DIR, id);
  const abs = path.resolve(safeDir, file);
  if (!abs.startsWith(safeDir + path.sep) || !fs.existsSync(abs)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  res.download(abs, rec.name);
});

app.post('/api/gmail/pull', async (req, res) => {
  try {
    const r = await pullGmail();
    console.log(`[gmail] 手动拉取 fetched=${r.fetched} kept=${r.kept} skipped=${r.skipped}`);
    res.json(r);
  } catch (e) {
    console.error('[gmail] 拉取失败:', e.message);
    res.status(500).json({ error: `Gmail 拉取失败：${e.message}` });
  }
});

if (gmailConfigured()) {
  const mins = Number(process.env.GMAIL_POLL_MINUTES || 15);
  const timer = setInterval(() => {
    pullGmail()
      .then((r) => r.ok && console.log(`[gmail] 轮询 fetched=${r.fetched} kept=${r.kept} skipped=${r.skipped}`))
      .catch((e) => console.error('[gmail] 轮询失败:', e.message));
  }, mins * 60 * 1000);
  timer.unref?.();
  setTimeout(() => {
    pullGmail()
      .then((r) => r.ok && console.log(`[gmail] 启动首拉 fetched=${r.fetched} kept=${r.kept}`))
      .catch((e) => console.error('[gmail] 首拉失败:', e.message));
  }, 5000);
  console.log(`[gmail] 询盘管道已启用：每 ${mins} 分钟轮询`);
} else {
  console.log('[gmail] 未配置 GMAIL_USER —— 询盘管道未启用（.env 填 GMAIL_USER / GMAIL_APP_PASSWORD 开启）');
}

/* ---------- 客户 ---------- */

app.get('/api/clients', (req, res) => res.json(load('clients', [])));

app.post('/api/clients', (req, res) => {
  const clients = load('clients', []);
  const b = req.body || {};
  const client = {
    id: newId('cl'),
    name: b.name || '', country: b.country || '', contact: b.contact || '',
    email: b.email || '', phone: b.phone || '',
    grade: b.grade || 'C', stage: b.stage || 'potential', source: b.source || 'manual',
    product: b.product || '', tags: b.tags || [], notes: b.notes || '',
    lastFollowUp: null,
    nextFollowUp: b.nextFollowUp || cadenceNextFollowUp(b.grade || 'C', today()),
    timeline: [],
  };
  clients.push(client);
  save('clients', clients);
  syncFollowUpTask(client);
  res.json(client);
});

app.put('/api/clients/:id', (req, res) => {
  const clients = load('clients', []);
  const c = clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: '客户不存在' });
  Object.assign(c, req.body, { id: c.id });
  save('clients', clients);
  syncFollowUpTask(c);
  res.json(c);
});

app.delete('/api/clients/:id', (req, res) => {
  let clients = load('clients', []);
  clients = clients.filter((x) => x.id !== req.params.id);
  save('clients', clients);
  const tasks = load('tasks', []).filter((t) => t.clientId !== req.params.id);
  save('tasks', tasks);
  res.json({ ok: true });
});

/** 记跟进事件：不传 nextFollowUp 时按等级节奏自动推导（A+7/B+14/C+30/D+45）。 */
app.post('/api/clients/:id/events', (req, res) => {
  const clients = load('clients', []);
  const c = clients.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: '客户不存在' });
  const b = req.body || {};
  const date = b.date || today();
  c.timeline.push({
    date,
    content: b.content || '',
    method: b.method || 'email',
    result: b.result || '',
    nextStep: b.nextStep || '',
  });
  c.lastFollowUp = date;
  c.nextFollowUp = b.nextFollowUp || cadenceNextFollowUp(c.grade, date);
  save('clients', clients);
  syncFollowUpTask(c);
  res.json(c);
});

/* ---------- 询盘 ---------- */

app.get('/api/inquiries', (req, res) => res.json(load('inquiries', [])));

app.post('/api/inquiries', (req, res) => {
  const inquiries = load('inquiries', []);
  const b = req.body || {};
  const item = {
    id: b.id || newId('INQ-local'),
    receivedAt: new Date().toISOString(),
    name: b.name || '', email: b.email || '', company: b.company || '',
    country: b.country || '', phone: b.phone || '', product: b.product || '',
    message: b.message || '', source: b.source || 'manual', sourceDetail: '', pageUrl: '',
    status: 'new', grade: null, clientId: null, taskId: null,
  };
  inquiries.push(item);
  save('inquiries', inquiries);
  res.json(item);
});

app.put('/api/inquiries/:id', (req, res) => {
  const inquiries = load('inquiries', []);
  const item = inquiries.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: '询盘不存在' });
  Object.assign(item, req.body, { id: item.id });
  save('inquiries', inquiries);
  res.json(item);
});

app.delete('/api/inquiries/:id', (req, res) => {
  save('inquiries', load('inquiries', []).filter((x) => x.id !== req.params.id));
  res.json({ ok: true });
});

/** 询盘转客户：email 去重（命中则只记时间线），自动生成 48h 回复待办。 */
app.post('/api/inquiries/:id/convert', (req, res) => {
  const inquiries = load('inquiries', []);
  const clients = load('clients', []);
  const tasks = load('tasks', []);
  const item = inquiries.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: '询盘不存在' });

  let client = clients.find((c) => c.email && c.email.toLowerCase() === (item.email || '').toLowerCase());
  if (!client) {
    client = {
      id: newId('cl'),
      name: item.company || item.name || '未命名客户',
      country: item.country || '',
      contact: item.name || '',
      email: item.email || '', phone: item.phone || '',
      grade: item.grade || 'C', stage: 'potential',
      source: item.source === 'website' ? 'website' : item.source,
      product: item.product || '', tags: item.source === 'website' ? ['独立站'] : [],
      notes: `来自询盘 ${item.id}：${(item.message || '').slice(0, 120)}`,
      lastFollowUp: null,
      nextFollowUp: cadenceNextFollowUp(item.grade || 'C', today()),
      timeline: [],
    };
    clients.push(client);
  }
  client.timeline.push({
    date: today(),
    content: `询盘进线（${item.id}）：${(item.message || '').slice(0, 80)}`,
    method: item.source === 'website' ? 'website' : 'email',
    result: '已建档',
    nextStep: '48h 内首次回复',
  });

  if (!item.taskId) {
    const task = {
      id: newId('t'),
      title: `48h 内回复 ${client.name}（询盘 ${item.id}）`,
      clientId: client.id,
      due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      execState: 'pending', done: false,
      createdAt: new Date().toISOString(),
    };
    tasks.push(task);
    item.taskId = task.id;
  }

  item.clientId = client.id;
  if (item.status === 'new') item.status = 'graded';
  save('inquiries', inquiries);
  save('clients', clients);
  save('tasks', tasks);
  syncFollowUpTask(client);
  res.json({ ok: true, clientId: client.id });
});

/* ---------- 报价 ---------- */

app.get('/api/quotes', (req, res) => res.json(load('quotes', [])));

app.post('/api/quotes', (req, res) => {
  const quotes = load('quotes', []);
  const b = req.body || {};
  const d = new Date();
  const item = {
    id: `QT-${d.toISOString().slice(0, 10).replace(/-/g, '')}-${String(quotes.length + 1).padStart(2, '0')}`,
    clientId: b.clientId || null,
    items: b.items || [],
    validUntil: b.validUntil || '',
    status: b.status || 'draft',
    note: b.note || '',
    createdAt: new Date().toISOString(),
  };
  quotes.push(item);
  save('quotes', quotes);
  res.json(item);
});

app.put('/api/quotes/:id', (req, res) => {
  const quotes = load('quotes', []);
  const item = quotes.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: '报价不存在' });
  Object.assign(item, req.body, { id: item.id });
  save('quotes', quotes);
  res.json(item);
});

app.delete('/api/quotes/:id', (req, res) => {
  save('quotes', load('quotes', []).filter((x) => x.id !== req.params.id));
  res.json({ ok: true });
});

/** 报价转订单。 */
app.post('/api/quotes/:id/to-order', (req, res) => {
  const quotes = load('quotes', []);
  const orders = load('orders', []);
  const q = quotes.find((x) => x.id === req.params.id);
  if (!q) return res.status(404).json({ error: '报价不存在' });
  const amount = (q.items || []).reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
  const currency = q.items?.[0]?.currency || 'USD';
  const d = new Date();
  const order = {
    id: `PO-${d.toISOString().slice(0, 10).replace(/-/g, '')}-${String(orders.length + 1).padStart(2, '0')}`,
    clientId: q.clientId, quoteId: q.id,
    amount, currency, depositPct: 30,
    stages: { pi: null, deposit: null, production: null, inspection: null, shipment: null, balance: null, bl: null, received: null },
    status: 'new',
  };
  orders.push(order);
  q.status = 'confirmed';
  save('quotes', quotes);
  save('orders', orders);
  res.json(order);
});

/* ---------- 订单 ---------- */

app.get('/api/orders', (req, res) => res.json(load('orders', [])));

app.put('/api/orders/:id', (req, res) => {
  const orders = load('orders', []);
  const o = orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: '订单不存在' });
  Object.assign(o, req.body, { id: o.id });
  save('orders', orders);
  res.json(o);
});

app.delete('/api/orders/:id', (req, res) => {
  save('orders', load('orders', []).filter((x) => x.id !== req.params.id));
  res.json({ ok: true });
});

/* ---------- 任务 ---------- */

app.get('/api/tasks', (req, res) => res.json(load('tasks', [])));

app.post('/api/tasks', (req, res) => {
  const tasks = load('tasks', []);
  const b = req.body || {};
  const item = {
    id: newId('t'), title: b.title || '', clientId: b.clientId || null,
    due: b.due || today(), execState: b.execState || 'pending',
    done: false, createdAt: new Date().toISOString(),
  };
  tasks.push(item);
  save('tasks', tasks);
  res.json(item);
});

app.put('/api/tasks/:id', (req, res) => {
  const tasks = load('tasks', []);
  const t = tasks.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: '任务不存在' });
  const wasDone = t.done;
  Object.assign(t, req.body, { id: t.id });

  // 完成回写：带 clientId 的任务标记完成 → 客户时间线追加条目 + 推进 lastFollowUp
  if (req.body?.done === true && !wasDone && t.clientId) {
    const clients = load('clients', []);
    const c = clients.find((x) => x.id === t.clientId);
    if (c) {
      c.timeline.push({ date: today(), content: `跟进任务完成：${t.title}`, method: 'task', result: '完成', nextStep: '' });
      c.lastFollowUp = today();
      save('clients', clients);
    }
  }
  save('tasks', tasks);
  res.json(t);
});

app.delete('/api/tasks/:id', (req, res) => {
  save('tasks', load('tasks', []).filter((x) => x.id !== req.params.id));
  res.json({ ok: true });
});

/* ---------- 提示词库（读 seeds + 用户自定义） ---------- */

app.get('/api/prompts', (req, res) => {
  const builtin = load('prompts', []);
  res.json(builtin);
});

/* ---------- 仪表盘聚合 ---------- */

app.get('/api/dashboard', (req, res) => {
  const tasks = load('tasks', []);
  const clients = load('clients', []);
  const inquiries = load('inquiries', []);
  const quotes = load('quotes', []);
  const t = today();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  res.json({
    todayTasks: tasks.filter((x) => !x.done && x.due <= t).length,
    overdueFollowUps: clients.filter((c) => c.nextFollowUp && c.nextFollowUp < t).length,
    dueSoonClients: clients.filter((c) => c.nextFollowUp && c.nextFollowUp >= t && c.nextFollowUp <= addDaysIso(t, 3)).length,
    weekInquiries: inquiries.filter((i) => i.receivedAt >= weekAgo).length,
    weekQuotes: quotes.filter((q) => q.createdAt >= weekAgo).length,
    totalClients: clients.length,
    defaultPassword: isDefaultPassword(),
  });
});

function addDaysIso(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------- 备份 / 恢复 ---------- */

app.get('/api/backup', (req, res) => {
  const names = ['clients', 'inquiries', 'quotes', 'orders', 'tasks', 'prompts'];
  const data = {};
  for (const n of names) data[n] = load(n, []);
  res.setHeader('Content-Disposition', `attachment; filename="workbench-backup-${today()}.json"`);
  res.json({ exportedAt: new Date().toISOString(), data });
});

app.post('/api/restore', (req, res) => {
  const { data } = req.body || {};
  if (!data) return res.status(400).json({ error: '无效的备份文件' });
  for (const n of ['clients', 'inquiries', 'quotes', 'orders', 'tasks']) {
    if (Array.isArray(data[n])) save(n, data[n]);
  }
  res.json({ ok: true });
});

/* ---------- 静态资源（生产模式：vite build 后由本服务直出） ---------- */

const distDir = path.join(__dirname, '..', 'dist');
const hasDist = fs.existsSync(distDir);
if (hasDist) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[workbench] API 服务已启动: http://localhost:${PORT}${hasDist ? '（生产模式，含前端）' : '（开发模式，配合 vite :5173）'}`);
  // 每日自动同步：每小时检查一次，距上次同步 ≥24h 且开关打开时执行
  setInterval(async () => {
    try {
      const { siteLink } = getSettings();
      if (!siteLink.autoSync || !siteLink.url || !siteLink.apiKey) return;
      if (siteLink.lastSyncAt && Date.now() - Date.parse(siteLink.lastSyncAt) < 24 * 60 * 60 * 1000) return;
      const n = await doSync();
      if (n > 0) console.log(`[sync] 自动同步：新进 ${n} 条询盘`);
    } catch (e) {
      console.warn('[sync] 自动同步失败：', e.message);
    }
  }, 60 * 60 * 1000);
});
