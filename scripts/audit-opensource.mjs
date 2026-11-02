#!/usr/bin/env node
/**
 * 泄密审计（发布门禁）：扫描全部 git 跟踪文件中的私有信息残留。
 * 0 命中 exit 0；任何命中 exit 1（CI 红灯，禁止发布）。
 * 用法：node scripts/audit-opensource.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const RULES = [
  { name: '品牌词', pattern: /kestrel/i },
  { name: '个人身份', pattern: /kalee|刘琦/i },
  { name: '个人手机号', pattern: /17832383339/ },
  { name: '私有基础设施', pattern: /omni-oneapi|cloudflared/i },
  { name: '第三方私有服务', pattern: /ethunters|小满|okki|unicloud/i },
  { name: '个人画像', pattern: /c8hr/i },
  { name: '课程付费方法论', pattern: /五问|five-q/i },
  { name: '本机绝对路径', pattern: /\/Users\/[a-z]/i },
];

const SKIP = [
  'scripts/audit-opensource.mjs', // 跳过自身（词表含敏感词）
  'package-lock.json',
  'docs/assets/',
];

const files = execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf-8' })
  .split('\n').map((s) => s.trim()).filter(Boolean);

let hits = 0;
for (const file of files) {
  if (SKIP.some((s) => file.startsWith(s) || file === s)) continue;
  let content;
  try {
    content = fs.readFileSync(path.join(REPO_ROOT, file), 'utf-8');
  } catch {
    continue;
  }
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        hits++;
        console.error(`✗ [${rule.name}] ${file}:${i + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
  });
}

if (hits > 0) {
  console.error(`\n泄密审计失败：${hits} 处命中。清除上述内容后再提交/发布。`);
  process.exit(1);
}
console.log('✓ 泄密审计通过：0 命中');
