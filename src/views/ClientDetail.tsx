import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get, put, post } from '../api';
import type { Client, Task, Quote, Stage } from '../types';
import { STAGE_LABEL, GRADE_CADENCE } from '../types';
import { fmtDate, today } from '../utils';

/** 客户详情：档案编辑 + 跟进时间线 + 记跟进（自动推 nextFollowUp）。 */
export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [event, setEvent] = useState({ content: '', method: 'email', result: '', nextStep: '', nextFollowUp: '' });

  async function reload() {
    const all = await get<Client[]>('/clients');
    setClient(all.find((c) => c.id === id) ?? null);
    setTasks((await get<Task[]>('/tasks')).filter((t) => t.clientId === id));
    setQuotes(await get<Quote[]>('/quotes').then((qs) => qs.filter((q) => q.clientId === id)));
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  if (!client) return <p className="text-sm text-muted">客户不存在</p>;

  async function update(patch: Partial<Client>) {
    const updated = await put<Client>(`/clients/${client!.id}`, patch);
    setClient(updated);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    const updated = await post<Client>(`/clients/${client!.id}/events`, event);
    setClient(updated);
    setEvent({ content: '', method: 'email', result: '', nextStep: '', nextFollowUp: '' });
    reload();
  }

  const overdue = client.nextFollowUp && client.nextFollowUp < today();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/clients" className="text-xs text-brand hover:underline">← 返回客户列表</Link>
          <h1 className="page-title mt-1">{client.name}</h1>
          <p className="mt-1 text-sm text-muted">{client.contact} · {client.country} · 来源 {client.source}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="field h-9 w-28" value={client.grade} onChange={(e) => update({ grade: e.target.value as Client['grade'] })}>
            <option value="A">A 级（7 天）</option><option value="B">B 级（14 天）</option>
            <option value="C">C 级（30 天）</option><option value="D">D 级（45 天）</option>
          </select>
          <select className="field h-9 w-24" value={client.stage} onChange={(e) => update({ stage: e.target.value as Stage })}>
            {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        {/* 档案 */}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold">档案</h2>
          <dl className="space-y-2 text-sm">
            <Row label="邮箱"><a className="text-brand hover:underline" href={`mailto:${client.email}`}>{client.email || '—'}</a></Row>
            <Row label="电话">{client.phone || '—'}</Row>
            <Row label="产品">{client.product || '—'}</Row>
            <Row label="标签">{client.tags.length ? client.tags.join(' / ') : '—'}</Row>
            <Row label="上次跟进">{fmtDate(client.lastFollowUp)}</Row>
            <Row label="下次跟进">
              <span className={overdue ? 'font-bold text-red-600' : 'font-medium'}>
                {fmtDate(client.nextFollowUp)}
              </span>
              <span className="ml-1 text-xs text-muted">（{GRADE_CADENCE[client.grade]} 节奏）</span>
            </Row>
          </dl>
          <div className="mt-4">
            <label className="label">备注</label>
            <textarea className="field" rows={3} defaultValue={client.notes}
              onBlur={(e) => { if (e.target.value !== client.notes) update({ notes: e.target.value }); }} />
          </div>
        </div>

        {/* 记跟进 */}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold">📝 记一次跟进</h2>
          <form onSubmit={addEvent} className="space-y-3">
            <div>
              <label className="label">做了什么 *</label>
              <textarea className="field" rows={2} required value={event.content}
                onChange={(e) => setEvent({ ...event, content: e.target.value })}
                placeholder="e.g. 发送 Product A 报价单" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">方式</label>
                <select className="field" value={event.method} onChange={(e) => setEvent({ ...event, method: e.target.value })}>
                  <option value="email">邮件</option><option value="whatsapp">WhatsApp</option>
                  <option value="phone">电话</option><option value="meeting">会议</option><option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="label">结果</label>
                <input className="field" value={event.result} onChange={(e) => setEvent({ ...event, result: e.target.value })} placeholder="已回复/待回复" />
              </div>
            </div>
            <div>
              <label className="label">下一步</label>
              <input className="field" value={event.nextStep} onChange={(e) => setEvent({ ...event, nextStep: e.target.value })} />
            </div>
            <div>
              <label className="label">下次跟进日（留空 = 按 {client.grade} 级节奏自动推 {GRADE_CADENCE[client.grade]}）</label>
              <input type="date" className="field" value={event.nextFollowUp} onChange={(e) => setEvent({ ...event, nextFollowUp: e.target.value })} />
            </div>
            <button className="btn w-full" type="submit">保存并推进跟进节奏</button>
          </form>
        </div>

        {/* 在轨任务 + 报价 */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold">📌 在轨任务（{tasks.filter((t) => !t.done).length}）</h2>
            {tasks.length === 0 && <p className="text-sm text-muted">暂无</p>}
            <ul className="space-y-2">
              {tasks.filter((t) => !t.done).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to="/tasks" className="min-w-0 flex-1 truncate hover:text-brand">{t.title}</Link>
                  <span className={'text-xs ' + (t.due < today() ? 'font-bold text-red-600' : 'text-muted')}>{t.due}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold">💰 历史报价（{quotes.length}）</h2>
            {quotes.length === 0 && <p className="text-sm text-muted">暂无</p>}
            <ul className="space-y-2">
              {quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/quotes/${q.id}`} className="font-mono text-xs hover:text-brand">{q.id}</Link>
                  <span className="tag bg-brand-tint text-brand">{q.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 时间线 */}
      <section className="card mt-6 p-5">
        <h2 className="mb-4 text-sm font-bold">🗓 跟进时间线</h2>
        {[...client.timeline].reverse().length === 0 && <p className="text-sm text-muted">暂无记录</p>}
        <ol className="relative space-y-4 border-l border-line pl-5">
          {[...client.timeline].reverse().map((ev, i) => (
            <li key={i}>
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
              <p className="text-xs text-muted">{ev.date} · {ev.method}</p>
              <p className="mt-0.5 text-sm font-medium">{ev.content}</p>
              {ev.result && <p className="text-xs text-muted">结果：{ev.result}</p>}
              {ev.nextStep && <p className="text-xs text-muted">下一步：{ev.nextStep}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}
