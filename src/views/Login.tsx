import { useState } from 'react';
import { post } from '../api';

export default function Login({ onLogin }: { onLogin: (defaultPassword: boolean) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const d = await post<{ ok: boolean; defaultPassword: boolean }>('/auth/login', { password });
      onLogin(d.defaultPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="beams-bg flex min-h-screen items-center justify-center bg-brand-tint px-4">
      <div className="card beam-card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <p className="text-lg font-extrabold text-ink">外贸工作台</p>
          <p className="mt-1 text-xs text-muted">AI Trade Workbench</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="pw">管理密码</label>
            <input
              id="pw" type="password" required autoFocus
              className="field" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <button type="submit" className="btn btn-shimmer w-full" disabled={busy}>
            {busy ? '登录中…' : '登录'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">
          默认密码 <code className="rounded bg-brand-tint px-1">admin123</code>，登录后请立即修改。
        </p>
      </div>
    </div>
  );
}
