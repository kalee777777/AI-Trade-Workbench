import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { load, save } from './store.js';

/**
 * 鉴权：密码 bcrypt 哈希存 data/settings.json（首次启动写入默认 admin123）；
 * 会话为 HMAC 签名 cookie（无状态，7 天有效）。
 */
const SECRET = process.env.SESSION_SECRET || 'ai-trade-workbench-dev-secret-change-me';
export const COOKIE_NAME = 'atw_session';
const MAX_AGE_S = 7 * 24 * 60 * 60;

export function getSettings() {
  const s = load('settings', {});
  if (!s.auth) s.auth = { passwordHash: '' };
  if (!s.auth.passwordHash) {
    s.auth.passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    save('settings', s);
  }
  if (!s.profile) s.profile = { yourName: '', company: '', products: '', market: '' };
  if (!s.siteLink) s.siteLink = { url: '', apiKey: '', autoSync: false, lastSyncAt: null };
  return s;
}

export function saveSettings(s) {
  save('settings', s);
}

export function isDefaultPassword() {
  return bcrypt.compareSync('admin123', getSettings().auth.passwordHash);
}

export function verifyPassword(password) {
  return bcrypt.compareSync(password, getSettings().auth.passwordHash);
}

export function setPassword(newPassword) {
  const s = getSettings();
  s.auth.passwordHash = bcrypt.hashSync(newPassword, 10);
  saveSettings(s);
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

export function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_S * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return Date.now() < exp;
  } catch {
    return false;
  }
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE_S,
};
