import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api';
import type { DashboardStats, Task, Client } from '../types';
import { fmtDate, today } from '../utils';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    get<DashboardStats>('/dashboard').then(setStats);
    get<Task[]>('/tasks').then(setTasks);
    get<Client[]>('/clients').then(setClients);
  }, []);

  const t = today();
  const todayTasks = tasks.filter((x) => !x.done && x.due <= t).slice(0, 6);
  const dueClients = clients
    .filter((c) => c.nextFollowUp && c.nextFollowUp <= addDays(t, 3))
    .sort((a, b) => (a.nextFollowUp || '').localeCompare(b.nextFollowUp || ''))
    .slice(0, 6);

  const cards = stats
    ? [
        { label: '今日待办', value: stats.todayTasks, to: '/tasks' },
        { label: '逾期跟进', value: stats.overdueFollowUps, to: '/clients', danger: stats.overdueFollowUps > 0 },
        { label: '3 天内到期', value: stats.dueSoonClients, to: '/clients' },
        { label: '本周新询盘', value: stats.weekInquiries, to: '/inquiries' },
        { label: '本周报价', value: stats.weekQuotes, to: '/quotes' },
        { label: '客户总数', value: stats.totalClients, to: '/clients' },
      ]
    : [];

  return (
    <div>
      <h1 className="page-title">仪表盘</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-6">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card p-4 hover:shadow-md">
            <p className="text-xs font-medium text-muted">{c.label}</p>
            <p className={'mt-1 text-2xl font-extrabold ' + (c.danger ? 'text-red-600' : 'text-brand')}>{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">🎯 今日行动</h2>
            <Link to="/tasks" className="text-xs font-semibold text-brand hover:underline">全部 →</Link>
          </div>
          {todayTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">今天没有到期待办 🎉</p>
          ) : (
            <ul className="divide-y divide-line">
              {todayTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                  {task.due < t && <span className="tag bg-red-50 text-red-600">逾期</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">⏰ 待跟进客户（3 天内到期/逾期）</h2>
            <Link to="/clients" className="text-xs font-semibold text-brand hover:underline">全部 →</Link>
          </div>
          {dueClients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">近期无到期跟进</p>
          ) : (
            <ul className="divide-y divide-line">
              {dueClients.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                  <Link to={`/clients/${c.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand">
                    {c.name}
                  </Link>
                  <span className="tag bg-brand-tint text-brand">{c.grade} 级</span>
                  <span className={'text-xs ' + ((c.nextFollowUp || '') < t ? 'font-bold text-red-600' : 'text-muted')}>
                    {fmtDate(c.nextFollowUp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 bg-brand-tint p-5">
        <h2 className="text-sm font-bold">🚀 新手三步走</h2>
        <ol className="mt-2 grid gap-2 text-sm text-muted md:grid-cols-3">
          <li>① <Link to="/settings" className="font-semibold text-brand hover:underline">设置</Link> 里填好个人信息与主营产品（喂给 AI 提示词），并对接独立站</li>
          <li>② <Link to="/inquiries" className="font-semibold text-brand hover:underline">询盘池</Link> 分级后一键转客户，自动生成 48h 回复待办</li>
          <li>③ 每记一次跟进，下次跟进日按 A+7/B+14/C+30/D+45 自动推进，任务自动生成</li>
        </ol>
      </section>
    </div>
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
