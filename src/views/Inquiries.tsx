import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, put, del } from '../api';
import type { Inquiry, Grade } from '../types';
import { INQUIRY_STATUS_LABEL } from '../types';
import { fmtDateTime, downloadCsv } from '../utils';

/** 询盘池：手动登记 + 独立站同步进线，A–D 分级，一键转客户。 */
export default function Inquiries() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [status, setStatus] = useState('all');
  const [showNew, setShowNew] = useState(false);

  async function reload() {
    setItems(await get<Inquiry[]>('/inquiries'));
  }
  useEffect(() => { reload(); }, []);

  const filtered = status === 'all' ? items : items.filter((i) => i.status === status);
  const statuses = ['new', 'graded', 'replied', 'quoted', 'won', 'closed'];

  async function grade(id: string, grade: Grade) {
    await put(`/inquiries/${id}`, { grade, status: 'graded' });
    reload();
  }

  async function convert(id: string) {
    const r = await post<{ clientId: string }>(`/inquiries/${id}/convert`);
    if (confirm(`已转客户并生成 48h 回复待办。打开客户档案？`)) {
      window.location.href = `/clients/${r.clientId}`;
    }
    reload();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">询盘池（{items.length}）</h1>
        <div className="flex gap-2">
          <button className="btn-outline btn-sm" onClick={() =>
            downloadCsv(`inquiries-${new Date().toISOString().slice(0, 10)}.csv`,
              ['ID', '时间', '姓名', '邮箱', '公司', '国家', '产品', '内容', '来源', '状态', '等级'],
              items.map((i) => [i.id, i.receivedAt, i.name, i.email, i.company, i.country, i.product, i.message, i.source, i.status, i.grade ?? '']))
          }>导出 CSV</button>
          <button className="btn btn-sm" onClick={() => setShowNew(!showNew)}>＋ 手动登记</button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setStatus('all')}
          className={'rounded-md border px-3 py-1.5 text-xs font-semibold ' + (status === 'all' ? 'border-brand bg-brand text-white' : 'border-line text-muted')}>
          全部 {items.length}
        </button>
        {statuses.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={'rounded-md border px-3 py-1.5 text-xs font-semibold ' + (status === s ? 'border-brand bg-brand text-white' : 'border-line text-muted')}>
            {INQUIRY_STATUS_LABEL[s]} {items.filter((i) => i.status === s).length}
          </button>
        ))}
      </div>

      {showNew && <NewInquiryForm onDone={() => { setShowNew(false); reload(); }} />}

      <div className="mt-4 space-y-3">
        {filtered.map((i) => (
          <div key={i.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted">{i.id}</span>
                  <span className="tag bg-brand-tint text-brand">{INQUIRY_STATUS_LABEL[i.status]}</span>
                  {i.source === 'website' && <span className="tag bg-green-50 text-green-700">独立站{i.sourceDetail ? ` · ${i.sourceDetail}` : ''}</span>}
                  {i.grade && <span className="tag bg-amber-50 text-amber-700">{i.grade} 级</span>}
                </div>
                <p className="mt-1.5 text-sm font-bold">{i.name} {i.company && <span className="font-normal text-muted">· {i.company}</span>}</p>
                <p className="text-xs text-muted">{i.email} {i.phone && `· ${i.phone}`} · {i.country || '未知地区'} · {fmtDateTime(i.receivedAt)}</p>
                {i.product && <p className="mt-1 text-xs">意向产品：<span className="font-semibold">{i.product}</span></p>}
                <p className="mt-1 max-w-2xl text-sm text-muted">{i.message}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {!i.grade && (
                  <div className="flex gap-1">
                    {(['A', 'B', 'C', 'D'] as Grade[]).map((g) => (
                      <button key={g} onClick={() => grade(i.id, g)}
                        className="h-7 w-7 rounded border border-line text-xs font-bold hover:border-brand hover:text-brand">{g}</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  <select className="field h-8 w-24 text-xs" value={i.status}
                    onChange={(e) => put(`/inquiries/${i.id}`, { status: e.target.value }).then(reload)}>
                    {statuses.map((s) => <option key={s} value={s}>{INQUIRY_STATUS_LABEL[s]}</option>)}
                  </select>
                  {i.clientId ? (
                    <Link to={`/clients/${i.clientId}`} className="btn-outline btn-sm h-8">看客户</Link>
                  ) : (
                    <button className="btn btn-sm h-8" onClick={() => convert(i.id)}>转客户</button>
                  )}
                  <button className="btn-danger" onClick={async () => { if (confirm('删除该询盘？')) { await del(`/inquiries/${i.id}`); reload(); } }}>删</button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="card p-10 text-center text-sm text-muted">暂无询盘——独立站进线会自动出现在这里（设置中配置对接后点「立即同步」）</p>}
      </div>
    </div>
  );
}

function NewInquiryForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', country: '', phone: '', product: '', message: '' });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await post('/inquiries', { ...form, source: 'manual' });
    onDone();
  }
  return (
    <form onSubmit={submit} className="card mt-4 grid gap-3 p-5 sm:grid-cols-3">
      <div><label className="label">姓名 *</label><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label className="label">邮箱 *</label><input type="email" className="field" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      <div><label className="label">公司</label><input className="field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
      <div><label className="label">国家</label><input className="field" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
      <div><label className="label">电话</label><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <div><label className="label">产品</label><input className="field" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
      <div className="sm:col-span-3"><label className="label">内容 *</label><textarea className="field" rows={2} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
      <div className="sm:col-span-3"><button className="btn" type="submit">登记</button></div>
    </form>
  );
}
