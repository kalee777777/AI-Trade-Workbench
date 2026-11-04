/**
 * Gmail 询盘管道 · P0（W3 询盘自动化的第一节）
 * ---------------------------------------------------------
 * IMAP 增量拉取 → 规则清洗（零 LLM）→ 结构化抽取 → 写入询盘池
 *
 * 设计要点（教学注释版，这文件以后直接进课件）：
 * 1. 断点续传：data/gmail-state.json 记 (uidvalidity, lastUid)，只处理新邮件，永不重复
 * 2. 双层过滤：先按邮件头干掉机器信/订阅信（免费），再用关键词评分判断"像不像询盘"
 * 3. 零 LLM：纯规则，任何学员不配 API Key 也能跑
 * 4. 凭据安全：应用密码（不是 Gmail 登录密码）放 .env（gitignored，永不提交）
 *
 * 未配置 GMAIL_USER 时整个模块静默不启用，不影响原有功能。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { load, save, newId } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'gmail-state.json');

/* ---------- 配置 ---------- */

export function gmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** P1：LLM 分诊层开关 —— 任何 OpenAI 兼容端点（OpenAI/DeepSeek/GLM/Ollama）均可 */
export function llmConfigured() {
  return Boolean(process.env.LLM_API_BASE && process.env.LLM_API_KEY);
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { uidvalidity: 0, lastUid: 0 }; }
}
function saveState(s) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

/* ---------- 规则清洗层 ---------- */

// 机器信/订阅信/社交通知的发件域——直接出局，不进评分
const JUNK_DOMAINS = [
  'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com', 'youtube.com',
  'tiktok.com', 'pinterest.com', 'google.com', 'googlemail.com-alerts', 'noreply', 'no-reply',
  'notifications', 'mailer', 'newsletter', 'notifications.alibaba', 'message.alibaba.com',
  'mail.aliexpress', 'made-in-china.com', 'notice', 'postmaster', 'mailer-daemon',
];
// 免费邮箱域——真实买家也会用，不淘汰，只是不给"企业域加分"
const FREEMAIL = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com', '163.com', 'qq.com', 'foxmail.com'];
// 询盘信号词——命中计分
const INQUIRY_KEYWORDS = [
  'inquiry', 'enquiry', 'quote', 'quotation', 'price', 'pricing', 'moq', 'rfq',
  'catalog', 'catalogue', 'specification', 'specifications', 'specs', 'sample',
  'shipping', 'freight', 'fob', 'cif', 'delivery time', 'lead time',
  'interested in', 'please send', 'please quote', 'best price', 'purchase', 'order',
];

function classify(mail) {
  const reasons = [];
  const from = (mail.from?.text || '').toLowerCase();
  const domain = from.split('@')[1] || '';
  const subject = (mail.subject || '').toLowerCase();
  const text = `${subject}\n${mail.text || ''}`.toLowerCase();

  // 硬淘汰：自动回复 / 订阅信 / 垃圾域
  if (mail.headers?.get('auto-submitted') && mail.headers.get('auto-submitted') !== 'no') reasons.push('auto-reply');
  if (mail.headers?.get('list-unsubscribe')) reasons.push('newsletter');
  if (domain === process.env.GMAIL_USER?.toLowerCase().split('@')[1] && from.startsWith(process.env.GMAIL_USER?.toLowerCase().split('@')[0]))
    reasons.push('self');
  if (JUNK_DOMAINS.some((d) => domain.endsWith(d) || from.includes(d)) && !INQUIRY_KEYWORDS.some((k) => subject.includes(k)))
    reasons.push('junk-domain');
  // 中文日常信（无询盘词）——我们的买家在海外
  const cjk = ((mail.text || '').match(/[\u4e00-\u9fff]/g) || []).length;
  if (cjk > 20 && !INQUIRY_KEYWORDS.some((k) => text.includes(k))) reasons.push('cjk-non-business');
  if (reasons.length) return { keep: false, reasons };

  // 评分制
  let score = 0;
  const hits = INQUIRY_KEYWORDS.filter((k) => text.includes(k));
  score += hits.length >= 3 ? 3 : hits.length;
  if (subject && INQUIRY_KEYWORDS.some((k) => subject.includes(k))) score += 1; // 标题命中更值钱
  if (domain && !FREEMAIL.includes(domain)) score += 1; // 企业域加分
  if ((mail.text || '').length > 120) score += 1; // 有正文的诚意信
  if (/(hi|hello|dear)\s+(sir|madam|mr|mrs|team|manager|sir\/madam)/i.test(mail.text || '')) score += 1; // 外贸称呼
  return { keep: score >= 3, reasons: [`score:${score}`, ...hits.slice(0, 4)] };
}

/* ---------- 结构化抽取 ---------- */

function guessCompany(mail) {
  const domain = (mail.from?.value?.[0]?.address || '').split('@')[1] || '';
  if (!domain || FREEMAIL.includes(domain)) {
    // 免费邮箱：正文里找 "Company: XXX" 类自报家门
    const m = (mail.text || '').match(/(?:company|from)\s*[:：]\s*([A-Za-z0-9&.,'\- ]{2,40})/i);
    return m ? m[1].trim() : '';
  }
  return domain.replace(/\.(com|net|org|co|ltd|inc|corp|group|trading|import|export)$/g, '')
    .split('.')[0].replace(/^./, (c) => c.toUpperCase());
}

const COUNTRY_MAP = [
  ['united states', 'usa'], ['u.s.a', 'usa'], ['america', 'usa'], ['usa', 'usa'], ['canada', 'canada'],
  ['germany', 'germany'], ['deutschland', 'germany'], ['france', 'france'], ['spain', 'spain'],
  ['united kingdom', 'uk'], ['uk', 'uk'], ['england', 'uk'], ['italy', 'italy'], ['netherlands', 'netherlands'],
  ['poland', 'poland'], ['australia', 'australia'], ['new zealand', 'new zealand'], ['japan', 'japan'],
  ['south korea', 'korea'], ['korea', 'korea'], ['india', 'india'], ['vietnam', 'vietnam'],
  ['thailand', 'thailand'], ['malaysia', 'malaysia'], ['indonesia', 'indonesia'], ['philippines', 'philippines'],
  ['saudi', 'saudi arabia'], ['uae', 'uae'], ['dubai', 'uae'], ['egypt', 'egypt'], ['turkey', 'turkey'],
  ['turkiye', 'turkey'], ['brazil', 'brazil'], ['mexico', 'mexico'], ['chile', 'chile'], ['colombia', 'colombia'],
  ['south africa', 'south africa'], ['nigeria', 'nigeria'], ['kenya', 'kenya'], ['pakistan', 'pakistan'],
  ['bangladesh', 'bangladesh'], ['russia', 'russia'], ['israel', 'israel'],
];
const TLD_COUNTRY = { de: 'Germany', fr: 'France', es: 'Spain', it: 'Italy', nl: 'Netherlands', pl: 'Poland',
  uk: 'UK', ca: 'Canada', au: 'Australia', jp: 'Japan', kr: 'Korea', in: 'India', br: 'Brazil', mx: 'Mexico',
  tr: 'Turkey', za: 'South Africa', ae: 'UAE', ru: 'Russia' };

function guessCountry(mail) {
  const text = (mail.text || '').toLowerCase();
  for (const [needle, name] of COUNTRY_MAP) if (text.includes(needle)) return name;
  const tld = ((mail.from?.value?.[0]?.address || '').split('@')[1] || '').split('.').pop();
  return TLD_COUNTRY[tld] || '';
}

function cleanSubject(sub) {
  return (sub || '').replace(/^(\s*(re|fw|fwd|aw)\s*:\s*)+/i, '').trim();
}

function cleanBody(text) {
  if (!text) return '';
  const lines = text.replace(/\r/g, '').split('\n');
  const out = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) continue;                                  // 引用行
    if (/^\s*on .+ (wrote|said):/i.test(line)) break;                  // 引用块起点，其后全是历史
    if (/^\s*-{2,}\s*$/.test(line)) break;                             // 签名分隔符
    if (/^\s*(from|sent|to|subject)\s*:.*(gmail|yahoo|hotmail)/i.test(line)) break; // 转发头
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 3000);
}

/* ---------- P1 · LLM 分诊层（可选；失败自动回落规则层，永不阻塞入池） ---------- */

const LLM_SYSTEM_PROMPT = `你是外贸询盘分诊员。对邮件做两件事：
1. 判断是否真实 B2B 采购询盘（营销信/订阅/自动通知/无关内容都算否）
2. 按以下标准分级：
   A = 强信号：具体产品+数量/规格/交期/目标价任占其二
   B = 明确产品兴趣但细节不足
   C = 泛泛咨询（只要目录/价目表，无具体需求）
   D = 疑似垃圾/采集信/无关
只输出一个 JSON 对象，不要任何其他文字：
{"is_inquiry": true/false, "grade": "A"|"B"|"C"|"D", "name": "姓名", "company": "公司", "country": "国家", "product": "意向产品(短语)", "signal": "一句话采购信号(中文,≤30字)"}`;

export async function llmRefine(mail) {
  const from0 = mail.from?.value?.[0] || {};
  const r = await fetch(`${process.env.LLM_API_BASE.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LLM_API_KEY}` },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        { role: 'user', content: `发件人: ${from0.name || ''} <${from0.address || ''}>\n主题: ${mail.subject || ''}\n日期: ${mail.date?.toISOString?.() || ''}\n\n正文:\n${cleanBody(mail.text).slice(0, 1600)}` },
      ],
      temperature: 0,
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!r.ok) throw new Error(`LLM HTTP ${r.status}`);
  const data = await r.json();
  const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g, '').trim();
  const j = JSON.parse(raw);
  return {
    isInquiry: j.is_inquiry !== false,
    grade: ['A', 'B', 'C', 'D'].includes(j.grade) ? j.grade : null,
    name: String(j.name || '').slice(0, 60),
    company: String(j.company || '').slice(0, 80),
    country: String(j.country || '').slice(0, 40),
    product: String(j.product || '').slice(0, 120),
    signal: String(j.signal || '').slice(0, 60),
  };
}

/* ---------- 主流程 ---------- */

export async function pullGmail({ maxFetch = 50 } = {}) {
  if (!gmailConfigured()) return { ok: false, error: 'GMAIL_USER / GMAIL_APP_PASSWORD 未配置（.env）' };

  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    logger: false,
  });
  const result = { ok: true, fetched: 0, kept: 0, skipped: 0, reasons: [] };
  try {
    await client.connect();
    const box = await client.mailboxOpen('INBOX');

    const state = loadState();
    let since = 1;
    if (state.uidvalidity === box.uidValidity && state.lastUid) since = state.lastUid + 1;

    // 拉新邮件（uid > since），一次最多 maxFetch 封防爆
    const uids = [];
    for await (const msg of client.fetch({ uid: `${since}:*` }, { uid: true, envelope: true, source: true })) {
      if (msg.uid >= since) uids.push(msg);
      if (uids.length >= maxFetch) break;
    }
    result.fetched = uids.length;

    const inquiries = load('inquiries', []);
    const known = new Set(inquiries.map((i) => i.id));
    let maxUid = state.lastUid || 0;
    const useLlm = llmConfigured();
    const llmStat = { called: 0, ok: 0, rejected: 0, failed: 0 };

    for (const msg of uids) {
      maxUid = Math.max(maxUid, msg.uid);
      let mail;
      try { mail = await simpleParser(msg.source); } catch { result.skipped++; continue; }
      const cls = classify(mail);
      if (cls.keep) {
        const id = `inq-gmail-${msg.uid}`;
        if (known.has(id)) continue;
        const from0 = mail.from?.value?.[0] || {};

        // P1：LLM 精判（规则通过者才送审，省 token；失败回落规则层结论）
        let grade = null;
        let name = from0.name || (from0.address || '').split('@')[0];
        let company = guessCompany(mail);
        let country = guessCountry(mail);
        let product = cleanSubject(mail.subject);
        let signal = '';
        if (useLlm) {
          llmStat.called++;
          try {
            const refined = await llmRefine(mail);
            llmStat.ok++;
            if (!refined.isInquiry) {
              llmStat.rejected++;
              result.skipped++;
              result.reasons.push(`#${msg.uid}: llm-rejected(${refined.grade || '?'})`);
              continue;
            }
            grade = refined.grade;
            if (refined.name) name = refined.name;
            if (refined.company) company = refined.company;
            if (refined.country) country = refined.country;
            if (refined.product) product = refined.product;
            signal = refined.signal;
          } catch (e) {
            llmStat.failed++;
            console.error(`[gmail] LLM 分诊失败(回落规则层) #${msg.uid}:`, e.message);
          }
        }

        inquiries.push({
          id,
          receivedAt: (mail.date || new Date()).toISOString(),
          name, email: from0.address || '', company, country,
          phone: '',
          product, message: cleanBody(mail.text),
          source: 'gmail',
          sourceDetail: cleanSubject(mail.subject),
          signal,
          status: 'new',
          grade,
        });
        known.add(id);
        result.kept++;
      } else {
        result.skipped++;
        result.reasons.push(`#${msg.uid}: ${cls.reasons.join(',')}`);
      }
    }

    if (useLlm) result.llm = llmStat;

    save('inquiries', inquiries);
    saveState({ uidvalidity: box.uidValidity, lastUid: maxUid });
  } finally {
    try { client.logout(); } catch { /* 连接已断 */ }
  }
  return result;
}
