/**
 * UI 冒烟截图：登录 → 仪表盘 → 客户 → 询盘池 → 设置。
 * 用法：node scripts/e2e-ui.mjs（工作台服务跑在 :5189，默认密码 admin123）
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';

const localRequire = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = localRequire('playwright'));
} catch {
  if (process.env.PLAYWRIGHT_FROM) {
    ({ chromium } = createRequire(process.env.PLAYWRIGHT_FROM)('playwright'));
  } else {
    console.error('缺少 playwright：设 PLAYWRIGHT_FROM=<已有项目>/package.json');
    process.exit(1);
  }
}

const BASE = process.env.E2E_BASE || 'http://localhost:5189';
const OUT = 'docs/assets';
const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? '✓' : '✗'} ${name}`); };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  check('登录页渲染', (await page.textContent('body'))?.includes('外贸工作台'));
  await page.fill('#pw', 'admin123');
  await page.click('button[type=submit]');
  await page.waitForURL('**/', { timeout: 15000 });
  check('进入仪表盘', (await page.textContent('body'))?.includes('仪表盘'));
  await page.screenshot({ path: `${OUT}/workbench-dashboard.png` });

  await page.goto(`${BASE}/clients`, { waitUntil: 'networkidle' });
  check('客户台账', (await page.textContent('body'))?.includes('Acme Trading'));
  await page.screenshot({ path: `${OUT}/workbench-clients.png` });

  await page.goto(`${BASE}/inquiries`, { waitUntil: 'networkidle' });
  check('询盘池含独立站进线', (await page.textContent('body'))?.includes('独立站'));
  await page.screenshot({ path: `${OUT}/workbench-inquiries.png` });

  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} 项通过`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
