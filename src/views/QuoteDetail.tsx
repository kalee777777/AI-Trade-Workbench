import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get, put, post } from '../api';
import type { Quote, Client, Profile } from '../types';
import { fmtDate } from '../utils';

const STATUS_LABEL: Record<string, string> = { draft: '草稿', sent: '已发', confirmed: '已确认', expired: '失效' };

/** 报价详情：状态流转 + 转订单 + 打印版报价单。 */
export default function QuoteDetail() {
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    get<Quote[]>('/quotes').then((qs) => setQuote(qs.find((q) => q.id === id) ?? null));
    get<Client[]>('/clients').then(setClients);
    get<Profile>('/profile').then(setProfile);
  }, [id]);

  if (!quote) return <p className="text-sm text-muted">报价不存在</p>;

  const client = clients.find((c) => c.id === quote.clientId);
  const total = (quote.items || []).reduce((s, it) => s + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
  const currency = quote.items?.[0]?.currency || 'USD';

  async function setStatus(status: string) {
    setQuote(await put<Quote>(`/quotes/${quote!.id}`, { status }));
  }

  return (
    <div>
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/quotes" className="text-xs text-brand hover:underline">← 返回报价列表</Link>
          <h1 className="page-title mt-1 font-mono">{quote.id}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="field h-9 w-28" value={quote.status} onChange={(e) => setStatus(e.target.value)}>
            {Object.keys(STATUS_LABEL).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          {quote.status !== 'confirmed' && (
            <button className="btn btn-sm" onClick={async () => {
              const order = await post<{ id: string }>(`/quotes/${quote!.id}/to-order`);
              if (confirm(`已生成订单 ${order.id}，打开订单？`)) window.location.href = `/orders`;
            }}>转订单</button>
          )}
          <button className="btn-outline btn-sm" onClick={() => window.print()}>🖨 打印报价单</button>
        </div>
      </div>

      {/* 打印区：对外报价单 */}
      <div className="print-area card mt-5 p-8">
        <div className="border-b-2 border-brand pb-4 text-center">
          <p className="text-lg font-extrabold uppercase tracking-widest text-brand">{profile?.company || 'Your Company'}</p>
          <p className="mt-1 text-xs text-muted">QUOTATION · 报价单</p>
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted">报价编号：</span><span className="font-mono">{quote.id}</span></p>
          <p><span className="text-muted">有效期至：</span>{fmtDate(quote.validUntil)}</p>
          <p><span className="text-muted">客户：</span>{client?.name || '—'}{client?.contact ? `（${client.contact}）` : ''}</p>
          <p><span className="text-muted">日期：</span>{new Date().toISOString().slice(0, 10)}</p>
        </div>
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-brand-tint">
              <th className="border border-line px-3 py-2 text-left">Product</th>
              <th className="border border-line px-3 py-2 text-left">Specification</th>
              <th className="border border-line px-3 py-2 text-right">Qty</th>
              <th className="border border-line px-3 py-2 text-right">Unit Price</th>
              <th className="border border-line px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => (
              <tr key={i}>
                <td className="border border-line px-3 py-2">{it.name}</td>
                <td className="border border-line px-3 py-2">{it.spec}</td>
                <td className="border border-line px-3 py-2 text-right">{it.qty} {it.unit}</td>
                <td className="border border-line px-3 py-2 text-right">{it.unitPrice} {it.currency}</td>
                <td className="border border-line px-3 py-2 text-right">{(Number(it.qty) * Number(it.unitPrice)).toLocaleString()}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="border border-line px-3 py-2 text-right" colSpan={4}>TOTAL</td>
              <td className="border border-line bg-brand-tint px-3 py-2 text-right">{total.toLocaleString()} {currency}</td>
            </tr>
          </tbody>
        </table>
        {quote.note && <p className="mt-4 text-sm text-muted">备注：{quote.note}</p>}
        <div className="mt-8 border-t border-line pt-4 text-center text-xs text-muted">
          {profile?.yourName || 'Sales'} · {profile?.company || 'Your Company'} · This quotation is valid until {fmtDate(quote.validUntil)}.
        </div>
      </div>
    </div>
  );
}
