import crypto from "crypto";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "family_tree_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 ; // 1 ngày (tính bằng giây)

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? ""; // định dạng "salt:hash" (hex)
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME ?? "";
const SUPER_ADMIN_PASSWORD_HASH = process.env.SUPER_ADMIN_PASSWORD_HASH ?? ""; // định dạng "salt:hash" (hex)
const SESSION_SECRET = process.env.SESSION_SECRET ?? "";

if (process.env.NODE_ENV !== "production") {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !SESSION_SECRET) {
    // eslint-disable-next-line no-console
    console.warn(
      "[auth] Thiếu ADMIN_USERNAME / ADMIN_PASSWORD_HASH / SESSION_SECRET trong .env.local — " +
        "xem README mục 'Thiết lập tài khoản admin' để tạo."
    );
  }
}

export function checkUserAndPass(username: string, password: string): boolean {
  if (username.length === 0) return false;
  if (username !== ADMIN_USERNAME && username !== SUPER_ADMIN_USERNAME) return false;
  let salt, storedHash;
  if(username === ADMIN_USERNAME){
    [salt, storedHash] = ADMIN_PASSWORD_HASH.split(":");
  }else {
    [salt, storedHash] = SUPER_ADMIN_PASSWORD_HASH.split(":");
  }
  if (!salt || !storedHash) return false;

  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  // So sánh bằng timingSafeEqual để tránh lộ thông tin qua thời gian xử lý (timing attack)
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Token dạng: "admin.<thời điểm hết hạn>.<chữ ký HMAC>"
export function createSessionToken(role: string): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${role}.${expiresAt}`;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

//return
//1: admin
//2: superadmin
//0: not validated
export function verifySessionToken(token: string | undefined | null): number {
  if (!token) return 0;
  const parts = token.split(".");
  if (parts.length !== 3) return 0;

  const [role, expiresAtStr, signature] = parts;
  const payload = `${role}.${expiresAtStr}`;
  const expectedSignature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");

  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expectedSignature, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 0;

  const expiresAt = Number(expiresAtStr);
  if(Number.isFinite(expiresAt) && Date.now() >= expiresAt) return 0;

  if (role === "admin") return 1;
  if (role === "superadmin") return 2;
  return 0;
}

// Dùng trong các API route cần chặn quyền: if (!isAdminRequest(req)) return 401
export function isAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return 1 === verifySessionToken(token);
}

export function isSuperAdminRequest(req: NextRequest): boolean {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return 2 === verifySessionToken(token);
}