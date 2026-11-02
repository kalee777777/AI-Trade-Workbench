import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get, put } from '../api';
import type { Order, Client } from '../types';

const STAGE_DEFS: { key: keyof Order['stages']; label: string; hint: string }[] = [
  { key: 'pi', label: '① PI 签订', hint: '形式发票确认' },
  { key: 'deposit', label: '② 定金到账', hint: '通常 30%' },
  { key: 'production', label: '③ 生产完成', hint: '' },
  { key: 'inspection', label: '④ 验货通过', hint: '自检/三方' },
  { key: 'shipment', label: '⑤ 出运', hint: '订舱发运' },
  { key: 'balance', label: '⑥ 尾款到账', hint: '' },
  { key: 'bl', label: '⑦ 提单 (B/L)', hint: '电放/正本' },
  { key: 'received', label: '⑧ 客户收货', hint: '订单闭环' },
];

/** 订单详情：外贸八阶段逐节点打勾推进。 */
export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    get<Order[]>('/orders').then((os) => setOrder(os.find((o) => o.id === id) ?? null));
    get<Client[]>('/clients').then(setClients);
  }, [id]);

  if (!order) return <p className="text-sm text-muted">订单不存在</p>;

  const client = clients.find((c) => c.id === order.clientId);
  const done = STAGE_DEFS.filter((s) => order.stages[s.key]).length;

  async function toggleStage(key: keyof Order['stages']) {
    const stages = { ...order!.stages, [key]: order!.stages[key] ? null : new Date().toISOString().slice(0, 10) };
    const status = key === 'received' && stages.received ? 'completed'
      : stages.production ? 'in_production'
      : stages.shipment ? 'shipped' : order!.status;
    setOrder(await put<Order>(`/orders/${order!.id}`, { stages, status }));
  }

  return (
    <div>
      <Link to="/orders" className="text-xs text-brand hover:underline">← 返回订单列表</Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title font-mono">{order.id}</h1>
        <span className="tag bg-brand-tint text-brand">{order.status}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {client?.name || '—'} · 金额 {order.amount.toLocaleString()} {order.currency} · 定金 {order.depositPct}%
        {order.quoteId && <> · 由报价 <Link to={`/quotes/${order.quoteId}`} className="font-mono text-brand hover:underline">{order.quoteId}</Link> 转入</>}
      </p>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-brand-tint">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / 8) * 100}%` }} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGE_DEFS.map((s) => {
          const date = order.stages[s.key];
          return (
            <button
              key={s.key}
              onClick={() => toggleStage(s.key)}
              className={'card p-4 text-left transition-all hover:shadow-md ' + (date ? 'border-brand bg-brand-tint' : '')}
            >
              <p className="text-sm font-bold">
                <span className={date ? 'text-brand' : 'text-muted'}>{date ? '✅' : '⬜'}</span> {s.label}
              </p>
              <p className="mt-1 text-xs text-muted">{date ? `完成于 ${date}` : (s.hint || '点击标记完成')}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">提示：点击卡片切换节点状态；⑧ 客户收货打勾后订单自动标记 completed。</p>
    </div>
  );
}
