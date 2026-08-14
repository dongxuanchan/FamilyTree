import { NextRequest, NextResponse } from "next/server";
import {
  checkUserAndPass,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password || !checkUserAndPass(username, password)) {
    return NextResponse.json({ error: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 });
  }

  const token = createSessionToken(username);
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, // JS phía client không đọc được cookie này -> chống XSS đánh cắp session
    //secure: process.env.NODE_ENV === "production",
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/"
  });
  return res;
}