import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, put, del } from '../api';
import type { Task, Client } from '../types';
import { today } from '../utils';

/** 任务看板：客户跟进专区（今日行动/近期排程/等待池）+ 内务待办。 */
export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(today());

  async function reload() {
    setTasks(await get<Task[]>('/tasks'));
    setClients(await get<Client[]>('/clients'));
  }
  useEffect(() => { reload(); }, []);

  const t = today();
  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.name : null);

  // 客户跟进专区三分组
  const clientTasks = tasks.filter((x) => x.clientId);
  const doneList = tasks.filter((x) => x.done).slice(-8).reverse();
  const zones = [
    {
      key: 'today', label: '🎯 今日行动（到期/逾期）',
      items: clientTasks.filter((x) => !x.done && x.due <= t).sort((a, b) => a.due.localeCompare(b.due)),
    },
    {
      key: 'upcoming', label: '📅 近期排程（未来到期）',
      items: clientTasks.filter((x) => !x.done && x.due > t).sort((a, b) => a.due.localeCompare(b.due)),
    },
    {
      key: 'waiting', label: '⏳ 等待池（等客户回复）',
      items: clientTasks.filter((x) => !x.done && x.execState === 'awaiting'),
    },
  ];

  async function toggle(task: Task) {
    await put(`/tasks/${task.id}`, { done: !task.done });
    reload();
  }

  return (
    <div>
      <h1 className="page-title">任务</h1>

      {/* 新建任务 */}
      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          await post('/tasks', { title, due });
          setTitle('');
          reload();
        }}
      >
        <input className="field h-10 max-w-md flex-1" placeholder="新任务，如：给 Acme 发目录" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="date" className="field h-10" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn" type="submit">添加</button>
      </form>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {zones.map((zone) => (
          <section key={zone.key} className="card p-4">
            <h2 className="mb-3 text-sm font-bold">{zone.label}（{zone.items.length}）</h2>
            <ul className="space-y-2">
              {zone.items.map((task) => (
                <li key={task.id} className="rounded-md border border-line p-3">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={task.done} onChange={() => toggle(task)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{task.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {clientName(task.clientId) && (
                          <Link to={`/clients/${task.clientId}`} className="text-brand hover:underline">{clientName(task.clientId)}</Link>
                        )}
                        {' '}截止 {task.due} {task.due < t && <span className="font-bold text-red-600">· 逾期</span>}
                      </span>
                    </span>
                  </label>
                  <div className="mt-2 flex items-center justify-between">
                    <select
                      className="field h-7 w-28 text-xs"
                      value={task.execState}
                      onChange={(e) => put(`/tasks/${task.id}`, { execState: e.target.value }).then(reload)}
                    >
                      <option value="pending">待执行</option>
                      <option value="scheduled">已排定时</option>
                      <option value="sent">已发</option>
                      <option value="awaiting">等回复</option>
                    </select>
                    <button className="btn-danger" onClick={async () => { if (confirm('删除该任务？')) { await del(`/tasks/${task.id}`); reload(); } }}>删除</button>
                  </div>
                </li>
              ))}
              {zone.items.length === 0 && <li className="py-4 text-center text-xs text-muted">空</li>}
            </ul>
          </section>
        ))}
      </div>

      <section className="card mt-6 p-4">
        <h2 className="mb-3 text-sm font-bold">✅ 最近完成（完成自动回写客户时间线）</h2>
        <ul className="divide-y divide-line">
          {doneList.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-muted line-through">{task.title}</span>
              <span className="text-xs text-muted">{clientName(task.clientId) || '内务'}</span>
            </li>
          ))}
          {doneList.length === 0 && <li className="py-4 text-center text-xs text-muted">暂无完成记录</li>}
        </ul>
      </section>
    </div>
  );
}
