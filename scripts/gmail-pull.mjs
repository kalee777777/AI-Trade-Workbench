#!/usr/bin/env node
/**
 * Gmail 询盘管道一键首拉（供学员 Agent 验证用）
 * 用法：npm run gmail:pull   或   node scripts/gmail-pull.mjs
 * 读取 .env → 拉取 → 打印结果摘要（无需启动工作台/无需登录）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} else {
  console.error('✗ 未找到 .env —— 请先复制 .env.example 为 .env 并填入 Gmail/LLM 配置');
  process.exit(1);
}

const { ensureData } = await import('../server/store.js');
const { pullGmail } = await import('../server/gmail.mjs');
ensureData();

try {
  const r = await pullGmail({ maxFetch: 100 });
  if (!r.ok) {
    console.error('✗', r.error);
    process.exit(1);
  }
  console.log('✓ 拉取完成:', JSON.stringify(
    { fetched: r.fetched, kept: r.kept, skipped: r.skipped, llm: r.llm ?? '未启用(纯规则)' }, null, 2,
  ));
  if (r.reasons?.length) console.log('跳过明细(前10条):', r.reasons.slice(0, 10).join('\n  '));
  if (r.kept > 0) console.log('→ 打开 http://localhost:5189 询盘池查看蓝标 📧 Gmail 询盘');
} catch (e) {
  console.error('✗ 拉取失败:', e.message);
  console.error('  常见原因：应用密码错误（去 myaccount.google.com/apppasswords 重新生成）/ 网络 / IMAP 未开启');
  process.exit(1);
}
