import { getDb, type Database } from '../db';
import { sceneHtml } from './scene-html';

type User = { id: string; email: string; name: string; balance: number; password_hash: string; salt: string };
type Pass = { id: string; expires_at: number };
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE = 'nakorn_session';
const enc = new TextEncoder();
class ApiError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('');
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))), x => x.toString(16).padStart(2, '0')).join('');
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), x => x.toString(16).padStart(2, '0')).join('');
}
function equal(a: string, b: string) { let diff = a.length ^ b.length; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0); return diff === 0; }
function cookie(req: Request, value: string, clear = false) { return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_MS / 1000}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`; }
function publicUser(user: User) { return { id: user.id, name: user.name, email: user.email, balance: user.balance }; }
async function currentUser(db: Database, req: Request) {
  const token = req.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?').bind(await hash(token), Date.now()).first<User>();
}
async function activePass(db: Database, userId: string) { return db.prepare('SELECT id,expires_at FROM passes WHERE user_id=? AND expires_at>? ORDER BY expires_at DESC LIMIT 1').bind(userId, Date.now()).first<Pass>(); }
async function access(db: Database, req: Request) {
  const guest = new URL(req.url).searchParams.get('guest');
  if (guest) {
    if (!/^[a-f0-9]{64}$/.test(guest)) throw new ApiError(403, 'ลิงก์เข้าชมไม่ถูกต้องหรือหมดอายุ', 'ACCESS_EXPIRED');
    const share = await db.prepare('SELECT MIN(shares.expires_at,passes.expires_at) AS expires_at FROM shares JOIN passes ON passes.id=shares.pass_id WHERE shares.token_hash=? AND shares.revoked=0 AND shares.expires_at>? AND passes.expires_at>?').bind(await hash(guest), Date.now(), Date.now()).first<{ expires_at: number }>();
    if (!share) throw new ApiError(403, 'ลิงก์เข้าชมหมดอายุหรือถูกยกเลิกแล้ว', 'ACCESS_EXPIRED');
    return { expiresAt: share.expires_at, guest: true, serverTime: Date.now() };
  }
  const user = await currentUser(db, req);
  const pass = user ? await activePass(db, user.id) : null;
  if (pass) return { expiresAt: pass.expires_at, guest: false, serverTime: Date.now() };
  // The public 3D experience is free to view; login and simulated passes only
  // apply to optional wallet and share features.
  const now = Date.now();
  return { expiresAt: now + 365 * 24 * 60 * 60 * 1000, guest: false, public: true, serverTime: now };
}
async function rateLimit(db: Database, req: Request, email: string) {
  const now = Date.now();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  for (const [scope, max] of [[`ip:${ip}`, 50], [`email:${email}`, 15]] as const) {
    const key = await hash(scope);
    const attempt = await db.prepare('INSERT INTO attempts(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN attempts.expires_at<? THEN 1 ELSE attempts.count+1 END,expires_at=CASE WHEN attempts.expires_at<? THEN excluded.expires_at ELSE attempts.expires_at END RETURNING count').bind(key, now + 15 * 60 * 1000, now, now).first<{ count: number }>();
    if (attempt && attempt.count > max) throw new ApiError(429, 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที');
  }
}

export async function handleApi(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  try {
    const db = getDb();
    if (req.method === 'GET' && (path === 'access' || path === 'scene')) {
      const permission = await access(db, req);
      if (path === 'access') return json(permission);
      return new Response(sceneHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
    }
    if (req.method === 'GET' && path === 'state') {
      // A shared visit never discloses the browser owner's account or wallet.
      const user = url.searchParams.has('guest') ? null : await currentUser(db, req);
      if (!user) return json({ user: null, pass: null, history: [], shares: [], serverTime: Date.now() });
      const [pass, history, shares] = await Promise.all([
        activePass(db, user.id),
        db.prepare('SELECT id,amount,title,created_at FROM ledger WHERE user_id=? ORDER BY created_at DESC LIMIT 50').bind(user.id).all(),
        db.prepare('SELECT id,expires_at,revoked,created_at FROM shares WHERE user_id=? ORDER BY created_at DESC LIMIT 30').bind(user.id).all(),
      ]);
      return json({ user: publicUser(user), pass, history: history.results, shares: shares.results, serverTime: Date.now() });
    }
    if (req.method !== 'POST') throw new ApiError(404, 'ไม่พบรายการนี้');
    const origin = req.headers.get('Origin');
    if (origin !== url.origin || req.headers.get('Sec-Fetch-Site') === 'cross-site') throw new ApiError(403, 'คำขอไม่ถูกต้อง');
    if (!req.headers.get('Content-Type')?.includes('application/json')) throw new ApiError(415, 'กรุณาส่งข้อมูล JSON');
    const raw = await req.text();
    if (raw.length > 8192) throw new ApiError(413, 'ข้อมูลมีขนาดใหญ่เกินไป');
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(); } catch { throw new ApiError(400, 'ข้อมูลไม่ถูกต้อง'); }
    if (path === 'register' || path === 'login') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) throw new ApiError(400, 'กรอกอีเมลให้ถูกต้อง และรหัสผ่าน 8–128 ตัวอักษร');
      await rateLimit(db, req, email);
      let user = await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first<User>();
      if (path === 'register') {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (!name || name.length > 60) throw new ApiError(400, 'กรุณากรอกชื่อ 1–60 ตัวอักษร');
        if (user) throw new ApiError(409, 'อีเมลนี้มีบัญชีอยู่แล้ว');
        const salt = randomToken(); const id = crypto.randomUUID();
        try { await db.prepare('INSERT INTO users(id,email,name,password_hash,salt,balance,created_at) VALUES(?,?,?,?,?,0,?)').bind(id, email, name, await passwordHash(password, salt), salt, Date.now()).run(); }
        catch (e) { if (String(e).includes('UNIQUE')) throw new ApiError(409, 'อีเมลนี้มีบัญชีอยู่แล้ว'); throw e; }
        user = await db.prepare('SELECT * FROM users WHERE id=?').bind(id).first<User>();
      } else {
        const computed = await passwordHash(password, user?.salt || 'missing-user-fixed-salt');
        if (!user || !equal(user.password_hash, computed)) throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
      if (!user) throw new ApiError(500, 'สร้างบัญชีไม่สำเร็จ');
      const token = randomToken();
      await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await hash(token), user.id, Date.now() + SESSION_MS).run();
      return json({ user: publicUser(user) }, 200, { 'Set-Cookie': cookie(req, token) });
    }
    if (path === 'logout') {
      const token = req.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
      if (token) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(req, '', true) });
    }
    const user = await currentUser(db, req);
    if (!user) throw new ApiError(401, 'กรุณาเข้าสู่ระบบ', 'LOGIN_REQUIRED');
    if (path === 'topup') {
      const amount = body.amount;
      if (typeof amount !== 'number' || ![50, 100, 300, 500].includes(amount)) throw new ApiError(400, 'เลือกจำนวนเครดิตที่กำหนด');
      const id = crypto.randomUUID();
      await db.prepare('INSERT INTO orders(id,user_id,credits,status,created_at) VALUES(?,?,?,\'pending\',?)').bind(id, user.id, amount, Date.now()).run();
      return json({ order: { id, credits: amount, status: 'pending' }, simulated: true });
    }
    if (path === 'topup/confirm') {
      if (typeof body.orderId !== 'string') throw new ApiError(400, 'ไม่พบคำสั่งเติมเครดิต');
      const order = await db.prepare('SELECT id,credits,status FROM orders WHERE id=? AND user_id=?').bind(body.orderId, user.id).first<{ id: string; credits: number; status: string }>();
      if (!order) throw new ApiError(404, 'ไม่พบคำสั่งเติมเครดิต');
      const ledgerId = `topup:${order.id}`;
      // batch() runs in one SQLite transaction: only the pending order can credit the wallet.
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO ledger(id,user_id,amount,title,created_at) SELECT ?,user_id,credits,?,? FROM orders WHERE id=? AND user_id=? AND status=\'pending\'').bind(ledgerId, 'เติมเครดิตจำลอง', Date.now(), order.id, user.id),
        db.prepare('UPDATE users SET balance=balance+? WHERE id=? AND EXISTS(SELECT 1 FROM orders WHERE id=? AND user_id=? AND status=\'pending\') AND EXISTS(SELECT 1 FROM ledger WHERE id=?)').bind(order.credits, user.id, order.id, user.id, ledgerId),
        db.prepare('UPDATE orders SET status=\'completed\' WHERE id=? AND user_id=? AND EXISTS(SELECT 1 FROM ledger WHERE id=?)').bind(order.id, user.id, ledgerId),
      ]);
      return json({ ok: true, simulated: true, order: { id: order.id, credits: order.credits, status: 'completed' } });
    }
    if (path === 'passes') {
      const id = body.requestId;
      if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new ApiError(400, 'รหัสคำขอไม่ถูกต้อง');
      const prior = await db.prepare('SELECT id,expires_at FROM passes WHERE id=? AND user_id=?').bind(id, user.id).first<Pass>();
      if (prior) return json({ pass: prior });
      const now = Date.now(); const ledgerId = `pass:${id}`;
      await db.batch([
        db.prepare('INSERT OR IGNORE INTO ledger(id,user_id,amount,title,created_at) SELECT ?,id,-20,?,? FROM users WHERE id=? AND balance>=20 AND NOT EXISTS(SELECT 1 FROM passes WHERE user_id=? AND expires_at>?)').bind(ledgerId, 'บัตรเข้าชม 3D 30 นาที', now, user.id, user.id, now),
        db.prepare('UPDATE users SET balance=balance-20 WHERE id=? AND balance>=20 AND EXISTS(SELECT 1 FROM ledger WHERE id=? AND user_id=?) AND NOT EXISTS(SELECT 1 FROM passes WHERE id=?)').bind(user.id, ledgerId, user.id, id),
        db.prepare('INSERT OR IGNORE INTO passes(id,user_id,expires_at,created_at) SELECT ?,user_id,?,? FROM ledger WHERE id=? AND user_id=?').bind(id, now + 30 * 60 * 1000, now, ledgerId, user.id),
      ]);
      const pass = await activePass(db, user.id);
      if (!pass) throw new ApiError(402, 'เครดิตไม่เพียงพอ กรุณาเติมเครดิตจำลอง', 'INSUFFICIENT_CREDITS');
      return json({ pass });
    }
    if (path === 'shares') {
      const minutes = body.minutes;
      if (typeof minutes !== 'number' || ![5, 10, 15].includes(minutes)) throw new ApiError(400, 'เลือกเวลา 5, 10 หรือ 15 นาที');
      const pass = await activePass(db, user.id);
      if (!pass) throw new ApiError(403, 'กรุณาเปิดสิทธิ์เข้าชมก่อน', 'PASS_REQUIRED');
      const id = crypto.randomUUID(); const token = randomToken(); const expiresAt = Math.min(pass.expires_at, Date.now() + minutes * 60 * 1000);
      await db.prepare('INSERT INTO shares(id,token_hash,user_id,pass_id,expires_at,revoked,created_at) VALUES(?,?,?,?,?,0,?)').bind(id, await hash(token), user.id, pass.id, expiresAt, Date.now()).run();
      return json({ id, url: `${url.origin}/?guest=${token}`, expiresAt });
    }
    if (path === 'shares/revoke') {
      if (typeof body.id !== 'string') throw new ApiError(400, 'ลิงก์ไม่ถูกต้อง');
      const result = await db.prepare('UPDATE shares SET revoked=1 WHERE id=? AND user_id=?').bind(body.id, user.id).run();
      if (!result.meta.changes) throw new ApiError(404, 'ไม่พบลิงก์นี้');
      return json({ ok: true });
    }
    throw new ApiError(404, 'ไม่พบรายการนี้');
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError ? error.message : 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่';
    if (!(error instanceof ApiError)) console.error('API failure', path, error);
    if (path === 'scene') return new Response(`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="background:#f5f2e9;color:#173d39;font-family:sans-serif;text-align:center;padding:80px 24px"><h2>${message}</h2><p>กลับไปหน้าหลักเพื่อเปิดสิทธิ์เข้าชมอีกครั้ง</p></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    return json({ error: message, ...(error instanceof ApiError && error.code ? { code: error.code } : {}) }, status);
  }
}
