import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isSuperAdminRequest } from "@/lib/auth";

// GET /api/export -> xuất toàn bộ people + relationships dưới dạng JSON thô (chỉ admin,
// vì dữ liệu bao gồm SĐT/địa chỉ - không nên để công khai xuất hàng loạt)
export async function GET(req: NextRequest) {
  if (!isSuperAdminRequest(req)) {
    return NextResponse.json({ error: "Cần đăng nhập admin để thực hiện thao tác này" }, { status: 401 });
  }

  const people = db.prepare("SELECT * FROM people").all();
  // Không xuất cột "id" tự tăng của bảng relationships - nó chỉ có ý nghĩa nội bộ
  // trong database hiện tại, xuất ra rồi nhập lại vào DB khác dễ gây đụng độ.
  // Bộ 3 (person1_id, person2_id, type) là đủ để tái tạo lại đúng quan hệ.
  const relationships = db.prepare("SELECT person1_id, person2_id, type FROM relationships").all();

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    people,
    relationships
  });
}