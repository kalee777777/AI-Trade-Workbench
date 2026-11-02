import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api';
import type { Order, Client } from '../types';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    get<Order[]>('/orders').then(setOrders);
    get<Client[]>('/clients').then(setClients);
  }, []);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? '—';
  const doneStages = (o: Order) => Object.values(o.stages).filter(Boolean).length;

  return (
    <div>
      <h1 className="page-title">订单追踪（{orders.length}）</h1>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {orders.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card p-5 hover:shadow-md">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold">{o.id}</span>
              <span className="tag bg-brand-tint text-brand">{o.status}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{clientName(o.clientId)} · {o.amount.toLocaleString()} {o.currency} · 定金 {o.depositPct}%</p>
            {/* 八阶段进度条 */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-tint">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(doneStages(o) / 8) * 100}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted">{doneStages(o)}/8 阶段完成</p>
          </Link>
        ))}
        {orders.length === 0 && <p className="card p-10 text-center text-sm text-muted md:col-span-2">暂无订单——报价确认后可一键转订单</p>}
      </div>
    </div>
  );
}
