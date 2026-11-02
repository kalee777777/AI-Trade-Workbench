import { useEffect, useState } from 'react';
import { get, put, post } from '../api';
import type { Profile, SiteLink } from '../types';
import { fmtDateTime } from '../utils';

/** 设置：个人信息 / 独立站对接（测试+同步）/ 数据备份恢复 / 账号安全。 */
export default function Settings({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [link, setLink] = useState<SiteLink | null>(null);
  const [linkForm, setLinkForm] = useState({ url: '', apiKey: '' });
  const [testMsg, setTestMsg] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  async function reload() {
    setProfile(await get<Profile>('/profile'));
    const l = await get<SiteLink>('/site-link');
    setLink(l);
    setLinkForm((f) => ({ ...f, url: l.url }));
  }
  useEffect(() => { reload(); }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfile(await put<Profile>('/profile', profile));
  }

  async function saveLink(e: React.FormEvent) {
    e.preventDefault();
    await put('/site-link', { ...linkForm, ...(link ? { autoSync: link.autoSync } : {}) });
    setLinkForm({ url: '', apiKey: '' });
    await reload();
    setTestMsg('已保存');
  }

  async function testConnection() {
    setTestMsg('测试中…');
    const r = await post<{ ok: boolean; error?: string; count?: number }>('/site-link/test');
    setTestMsg(r.ok ? `✓ 连接成功（拉到 ${r.count} 条）` : `✗ ${r.error}`);
  }

  async function syncNow() {
    setSyncMsg('同步中…');
    try {
      const r = await post<{ imported: number }>('/sync/now');
      setSyncMsg(`✓ 同步完成：新进 ${r.imported} 条询盘（询盘池可见，含 48h 回复待办）`);
    } catch (err) {
      setSyncMsg(`✗ ${err instanceof Error ? err.message : '同步失败'}`);
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) { setPwMsg('两次输入不一致'); return; }
    try {
      await post('/auth/password', pw);
      setPwMsg('✓ 密码已修改');
      setPw({ oldPassword: '', newPassword: '', confirm: '' });
      onPasswordChanged();
    } catch (err) {
      setPwMsg(`✗ ${err instanceof Error ? err.message : '失败'}`);
    }
  }

  function restoreBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('恢复将覆盖当前全部业务数据，确定？')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(String(reader.result));
        await post('/restore', json);
        alert('恢复完成');
        reload();
      } catch {
        alert('无效的备份文件');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="page-title">设置</h1>
      </div>

      {/* 个人信息 */}
      {profile && (
        <form onSubmit={saveProfile} className="card grid gap-3 p-5 sm:grid-cols-2">
          <p className="text-sm font-bold sm:col-span-2">个人信息（自动填充 AI 提示词变量）</p>
          <div><label className="label">你的名字（签名用）</label><input className="field" value={profile.yourName} onChange={(e) => setProfile({ ...profile, yourName: e.target.value })} /></div>
          <div><label className="label">公司名</label><input className="field" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">主营产品</label><input className="field" value={profile.products} onChange={(e) => setProfile({ ...profile, products: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">目标市场</label><input className="field" value={profile.market} onChange={(e) => setProfile({ ...profile, market: e.target.value })} /></div>
          <div className="sm:col-span-2"><button className="btn" type="submit">保存</button></div>
        </form>
      )}

      {/* 独立站对接 */}
      {link && (
        <div className="card space-y-3 p-5">
          <p className="text-sm font-bold">独立站对接（询盘自动同步）</p>
          <p className="text-xs text-muted">
            在独立站 Admin「询盘管理 → API Keys」签发 Key 填到这里；站点地址填完整域名（如 https://www.yourcompany.com）。
          </p>
          <form onSubmit={saveLink} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">站点地址</label>
              <input className="field" placeholder="https://www.yourcompany.com" value={linkForm.url || link.url}
                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} />
            </div>
            <div>
              <label className="label">API Key {link.hasKey ? `（已保存 ${link.apiKey}，输入新值可替换）` : ''}</label>
              <input className="field" placeholder="sk-site-…" value={linkForm.apiKey}
                onChange={(e) => setLinkForm({ ...linkForm, apiKey: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              <button className="btn-outline btn-sm" type="button" onClick={testConnection}>测试连接</button>
              <button className="btn btn-sm" type="button" onClick={syncNow}>立即同步</button>
              <button className="btn btn-sm" type="submit">保存配置</button>
              {link.autoSync !== undefined && (
                <label className="ml-2 flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={link.autoSync}
                    onChange={(e) => put('/site-link', { autoSync: e.target.checked }).then(reload)} />
                  每日自动同步
                </label>
              )}
            </div>
          </form>
          {testMsg && <p className="text-xs">{testMsg}</p>}
          {syncMsg && <p className="text-xs">{syncMsg}</p>}
          {link.lastSyncAt && <p className="text-xs text-muted">上次同步：{fmtDateTime(link.lastSyncAt)}</p>}
        </div>
      )}

      {/* 备份恢复 */}
      <div className="card space-y-3 p-5">
        <p className="text-sm font-bold">数据备份与恢复（全部数据都在本地 data/ 目录）</p>
        <div className="flex flex-wrap items-center gap-3">
          <a className="btn-outline btn-sm" href="/api/backup" download>⬇ 导出备份 JSON</a>
          <label className="btn-outline btn-sm cursor-pointer">
            ⬆ 恢复备份
            <input type="file" accept="application/json" className="hidden" onChange={restoreBackup} />
          </label>
        </div>
      </div>

      {/* 账号安全 */}
      <form onSubmit={changePw} className="card grid gap-3 p-5 sm:grid-cols-3">
        <p className="text-sm font-bold sm:col-span-3">账号安全</p>
        <div><label className="label">旧密码</label><input type="password" className="field" required value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} /></div>
        <div><label className="label">新密码（≥6 位）</label><input type="password" className="field" required minLength={6} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
        <div><label className="label">确认新密码</label><input type="password" className="field" required minLength={6} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
        <div className="sm:col-span-3">
          <button className="btn" type="submit">修改密码</button>
          {pwMsg && <span className="ml-3 text-xs">{pwMsg}</span>}
        </div>
      </form>
    </div>
  );
}
