import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, del } from '../api';
import type { Client, Stage } from '../types';
import { STAGE_LABEL, GRADE_CADENCE } from '../types';
import { fmtDate, downloadCsv, parseClientsCsv, today } from '../utils';

const STAGES: Stage[] = ['potential', 'intent', 'won', 'dormant'];

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stage, setStage] = useState<Stage | 'all'>('all');
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);

  async function reload() {
    setClients(await get<Client[]>('/clients'));
  }
  useEffect(() => { reload(); }, []);

  const filtered = clients.filter(
    (c) =>
      (stage === 'all' || c.stage === stage) &&
      (!q || [c.name, c.email, c.contact, c.country, c.product].join(' ').toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">客户台账（{clients.length}）</h1>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm" onClick={() => setShowImport(!showImport)}>导入 CSV</button>
          <button
            className="btn-outline btn-sm"
            onClick={() =>
              downloadCsv(`clients-${today()}.csv`,
                ['公司名', '联系人', '邮箱', '电话', '国家', '等级', '阶段', '产品', '上次跟进', '下次跟进'],
                clients.map((c) => [c.name, c.contact, c.email, c.phone, c.country, c.grade, STAGE_LABEL[c.stage], c.product, c.lastFollowUp, c.nextFollowUp]))
            }
          >
            导出 CSV
          </button>
          <button className="btn btn-sm" onClick={() => setShowNew(!showNew)}>＋ 新增客户</button>
        </div>
      </div>

      {/* 四层台账 + 搜索 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(['all', ...STAGES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={'rounded-md border px-3 py-1.5 text-xs font-semibold ' +
              (stage === s ? 'border-brand bg-brand text-white' : 'border-line bg-paper text-muted hover:text-brand')}
          >
            {s === 'all' ? '全部' : STAGE_LABEL[s]}
            <span className="ml-1 opacity-70">{s === 'all' ? clients.length : clients.filter((c) => c.stage === s).length}</span>
          </button>
        ))}
        <input
          className="field ml-auto h-9 max-w-xs" placeholder="搜索公司/联系人/邮箱/国家…"
          value={q} onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {showNew && <NewClientForm onDone={() => { setShowNew(false); reload(); }} />}
      {showImport && <ImportCsvForm onDone={() => { setShowImport(false); reload(); }} />}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line bg-brand-tint">
            <tr>
              <th className="th">公司</th><th className="th">等级</th><th className="th">阶段</th>
              <th className="th">产品</th><th className="th">上次跟进</th><th className="th">下次跟进</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => {
              const overdue = c.nextFollowUp && c.nextFollowUp < today();
              return (
                <tr key={c.id} className="hover:bg-brand-tint/50">
                  <td className="td">
                    <Link to={`/clients/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link>
                    <span className="block text-xs text-muted">{c.contact} · {c.country}</span>
                  </td>
                  <td className="td">
                    <span className="tag bg-brand-tint text-brand">{c.grade}（{GRADE_CADENCE[c.grade]}）</span>
                  </td>
                  <td className="td text-muted">{STAGE_LABEL[c.stage]}</td>
                  <td className="td text-muted">{c.product || '—'}</td>
                  <td className="td text-muted">{fmtDate(c.lastFollowUp)}</td>
                  <td className={'td font-medium ' + (overdue ? 'text-red-600' : '')}>{fmtDate(c.nextFollowUp)}</td>
                  <td className="td text-right">
                    <button className="btn-danger" onClick={async () => { if (confirm(`删除客户「${c.name}」？`)) { await del(`/clients/${c.id}`); reload(); } }}>删除</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-muted">暂无客户</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewClientForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: '', contact: '', email: '', phone: '', country: '', product: '',
    grade: 'C', stage: 'potential', source: 'manual', notes: '',
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await post('/clients', form);
    onDone();
  }
  return (
    <form onSubmit={submit} className="card mt-4 grid gap-3 p-5 sm:grid-cols-3">
      <div><label className="label">公司名 *</label><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label className="label">联系人 · 职位</label><input className="field" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
      <div><label className="label">邮箱</label><input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><label className="label">电话/WhatsApp</label><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div><label className="label">国家</label><input className="field" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
      <div><label className="label">主营产品</label><input className="field" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
      <div>
        <label className="label">等级（决定跟进节奏）</label>
        <select className="field" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
          <option value="A">A（7 天一跟）</option><option value="B">B（14 天一跟）</option>
          <option value="C">C（30 天一跟）</option><option value="D">D（45 天一跟）</option>
        </select>
      </div>
      <div>
        <label className="label">阶段</label>
        <select className="field" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </div>
      <div>
        <label className="label">来源</label>
        <select className="field" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
          <option value="manual">手动录入</option><option value="website">独立站</option>
          <option value="platform">B2B 平台</option><option value="exhibition">展会</option>
          <option value="social">社媒</option><option value="outreach">主动开发</option>
        </select>
      </div>
      <div className="sm:col-span-3"><label className="label">备注</label><input className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="sm:col-span-3"><button className="btn" type="submit">保存</button></div>
    </form>
  );
}

function ImportCsvForm({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rows = parseClientsCsv(text);
    for (const row of rows) {
      await post('/clients', { name: row.company || row.name, email: row.email, country: row.country, phone: row.phone, product: row.product, contact: row.name });
    }
    onDone();
  }
  return (
    <form onSubmit={submit} className="card mt-4 space-y-3 p-5">
      <p className="text-sm font-semibold">粘贴 CSV（首行表头：name,email,company,country,phone,product）</p>
      <textarea className="field" rows={5} value={text} onChange={(e) => setText(e.target.value)}
        placeholder={'name,email,company,country\nJohn,john@x.com,Acme,US'} />
      <button className="btn" type="submit" disabled={!text.trim()}>导入</button>
    </form>
  );
}
