import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { get } from './api';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Clients from './views/Clients';
import ClientDetail from './views/ClientDetail';
import Inquiries from './views/Inquiries';
import Quotes from './views/Quotes';
import QuoteDetail from './views/QuoteDetail';
import Orders from './views/Orders';
import OrderDetail from './views/OrderDetail';
import Tasks from './views/Tasks';
import Prompts from './views/Prompts';
import Settings from './views/Settings';

const NAV = [
  { to: '/', label: '📊 仪表盘', end: true },
  { to: '/clients', label: '👥 客户' },
  { to: '/inquiries', label: '📥 询盘池' },
  { to: '/quotes', label: '💰 报价' },
  { to: '/orders', label: '📦 订单' },
  { to: '/tasks', label: '✅ 任务' },
  { to: '/prompts', label: '🤖 AI 提示词' },
  { to: '/settings', label: '⚙️ 设置' },
];

function Shell({ defaultPassword }: { defaultPassword: boolean }) {
  const navigate = useNavigate();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }
  return (
    <div className="flex min-h-screen bg-brand-tint">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-line bg-paper p-3 md:flex">
        <div className="mb-5 px-2 pt-1">
          <p className="text-base font-extrabold text-ink">外贸工作台</p>
          <p className="text-[10px] text-muted">AI Trade Workbench</p>
        </div>
        <nav className="space-y-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                'block rounded-md px-3 py-2 text-sm font-medium ' +
                (isActive ? 'bg-brand text-white' : 'text-ink hover:bg-brand-tint hover:text-brand')
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="btn-outline mt-auto">退出登录</button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 移动端顶部导航 */}
        <div className="border-b border-line bg-paper p-3 md:hidden">
          <details>
            <summary className="cursor-pointer text-sm font-bold">☰ 外贸工作台</summary>
            <nav className="mt-2 grid grid-cols-2 gap-1">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className="rounded px-2 py-1.5 text-sm hover:bg-brand-tint">
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </details>
        </div>

        {defaultPassword && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            ⚠️ 正在使用默认密码 admin123，请到「设置 → 账号安全」修改。
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState<'checking' | 'guest' | 'authed'>('checking');
  const [defaultPassword, setDefaultPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    get<{ ok: boolean; defaultPassword: boolean }>('/auth/me')
      .then((d) => {
        if (d.ok) {
          setDefaultPassword(d.defaultPassword);
          setState('authed');
        } else setState('guest');
      })
      .catch(() => setState('guest'));
  }, []);

  if (state === 'checking') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">加载中…</div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Login
            onLogin={(dp) => {
              setDefaultPassword(dp);
              setState('authed');
              navigate('/', { replace: true });
            }}
          />
        }
      />
      <Route
        path="/"
        element={state === 'authed' ? <Shell defaultPassword={defaultPassword} /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="inquiries" element={<Inquiries />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/:id" element={<QuoteDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="prompts" element={<Prompts />} />
        <Route path="settings" element={<Settings onPasswordChanged={() => setDefaultPassword(false)} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
