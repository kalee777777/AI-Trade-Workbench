import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, del } from '../api';
import type { Quote, QuoteItem, Client } from '../types';
import { fmtDate } from '../utils';

const STATUS_LABEL: Record<string, string> = { draft: '草稿', sent: '已发', confirmed: '已确认', expired: '失效' };

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showNew, setShowNew] = useState(false);

  async function reload() {
    setQuotes(await get<Quote[]>('/quotes'));
    setClients(await get<Client[]>('/clients'));
  }
  useEffect(() => { reload(); }, []);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? '—';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">报价管理（{quotes.length}）</h1>
        <button className="btn btn-sm" onClick={() => setShowNew(!showNew)}>＋ 新建报价</button>
      </div>

      {showNew && (
        <NewQuoteForm
          clients={clients}
          onDone={async () => { setShowNew(false); reload(); }}
        />
      )}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-line bg-brand-tint">
            <tr>
              <th className="th">编号</th><th className="th">客户</th><th className="th">金额</th>
              <th className="th">有效期至</th><th className="th">状态</th><th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {quotes.map((q) => {
              const total = (q.items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
              return (
                <tr key={q.id} className="hover:bg-brand-tint/50">
                  <td className="td"><Link to={`/quotes/${q.id}`} className="font-mono text-xs hover:text-brand">{q.id}</Link></td>
                  <td className="td">{clientName(q.clientId)}</td>
                  <td className="td font-semibold">{total.toLocaleString()} {q.items?.[0]?.currency || 'USD'}</td>
                  <td className="td text-muted">{fmtDate(q.validUntil)}</td>
                  <td className="td"><span className="tag bg-brand-tint text-brand">{STATUS_LABEL[q.status] ?? q.status}</span></td>
                  <td className="td text-right">
                    <button className="btn-danger" onClick={async () => { if (confirm('删除该报价？')) { await del(`/quotes/${q.id}`); reload(); } }}>删除</button>
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-muted">暂无报价</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewQuoteForm({ clients, onDone }: { clients: Client[]; onDone: () => void }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [items, setItems] = useState<QuoteItem[]>([{ name: '', spec: '', qty: 100, unit: 'pcs', unitPrice: 0, currency: 'USD' }]);
  const [validUntil, setValidUntil] = useState(new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await post('/quotes', { clientId, items: items.filter((i) => i.name), validUntil, note });
    onDone();
  }

  function setItem(i: number, patch: Partial<QuoteItem>) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  return (
    <form onSubmit={submit} className="card mt-4 space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">客户</label>
          <select className="field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">（未关联）</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">有效期至</label>
          <input type="date" className="field" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div>
          <label className="label">备注</label>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">报价明细</label>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-12">
              <input className="field sm:col-span-3" placeholder="产品名" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
              <input className="field sm:col-span-3" placeholder="规格" value={it.spec} onChange={(e) => setItem(i, { spec: e.target.value })} />
              <input className="field sm:col-span-1" type="number" placeholder="数量" value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
              <input className="field sm:col-span-1" placeholder="单位" value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} />
              <input className="field sm:col-span-2" type="number" step="0.01" placeholder="单价" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) })} />
              <div className="flex items-center gap-1 sm:col-span-2">
                <select className="field" value={it.currency} onChange={(e) => setItem(i, { currency: e.target.value })}>
                  <option>USD</option><option>EUR</option><option>CNY</option>
                </select>
                <button type="button" className="btn-danger" onClick={() => setItems(items.filter((_, idx) => idx !== i))}>删</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-outline btn-sm mt-2"
          onClick={() => setItems([...items, { name: '', spec: '', qty: 100, unit: 'pcs', unitPrice: 0, currency: 'USD' }])}>
          ＋ 添加行
        </button>
      </div>
      <button className="btn" type="submit">保存报价</button>
    </form>
  );
}
