import { useEffect, useMemo, useState } from 'react';
import { get } from '../api';
import type { PromptTemplate, Profile } from '../types';

const CATEGORY_LABEL: Record<string, string> = {
  outreach: '客户开发', followup: '跟进激活', reply: '询盘回复',
  quote: '报价管理', negotiate: '谈判博弈', payment: '收款催款',
};

/** AI 提示词库：变量槽用个人信息自动填充，一键复制。 */
export default function Prompts() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [category, setCategory] = useState('all');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    get<PromptTemplate[]>('/prompts').then(setPrompts);
    get<Profile>('/profile').then(setProfile);
  }, []);

  const vars = useMemo(
    () => ({
      '{{your_name}}': profile?.yourName || 'Your Name',
      '{{company}}': profile?.company || 'Your Company',
      '{{products}}': profile?.products || 'your products',
      '{{market}}': profile?.market || 'your target markets',
    }),
    [profile],
  );

  function fill(body: string): string {
    let out = body;
    for (const [k, v] of Object.entries(vars)) out = out.replaceAll(k, v);
    return out
      .replaceAll('{{name}}', '【客户名】')
      .replaceAll('{{country}}', '【国家】')
      .replaceAll('{{product}}', '【产品】')
      .replaceAll('{{inquiry_text}}', '【粘贴询盘原文】')
      .replaceAll('{{days_ago}}', '【天数，如 5】')
      .replaceAll('{{order_no}}', '【订单号】')
      .replaceAll('{{overdue_days}}', '【逾期天数】');
  }

  async function copy(p: PromptTemplate) {
    await navigator.clipboard.writeText(fill(p.body));
    setCopied(p.id);
    setTimeout(() => setCopied(''), 1500);
  }

  const cats = ['all', ...new Set(prompts.map((p) => p.category))];
  const filtered = category === 'all' ? prompts : prompts.filter((p) => p.category === category);

  return (
    <div>
      <h1 className="page-title">AI 提示词库</h1>
      <p className="mt-1 text-xs text-muted">
        {'{{your_name}}/{{company}} 等变量已用你的「设置 → 个人信息」自动填充；【】占位符粘贴前替换即可。复制后投喂给 CodeX / WorkBuddy / Trae。'}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={'rounded-md border px-3 py-1.5 text-xs font-semibold ' +
              (category === c ? 'border-brand bg-brand text-white' : 'border-line text-muted hover:text-brand')}>
            {c === 'all' ? '全部' : CATEGORY_LABEL[c] ?? c}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {filtered.map((p) => (
          <div key={p.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted">{p.scene}</p>
              </div>
              <span className="tag bg-brand-tint text-brand">{CATEGORY_LABEL[p.category] ?? p.category}</span>
            </div>
            <pre className="mt-3 max-h-44 flex-1 overflow-y-auto whitespace-pre-wrap rounded-md bg-brand-tint/60 p-3 text-xs leading-relaxed text-muted">
              {fill(p.body)}
            </pre>
            <button className="btn btn-sm mt-3" onClick={() => copy(p)}>
              {copied === p.id ? '✓ 已复制' : '复制提示词'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
