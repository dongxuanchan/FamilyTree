import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";
import { getPersonById } from "@/lib/familyChartTransform";


interface Params {
  params: { id: string };
}

// GET /api/people/:id -> trả về đầy đủ thông tin 1 người, dùng cho trang chi tiết (công khai)
export async function GET(_req: NextRequest, { params }: Params) {
  const person = getPersonById(params.id);
  if (!person) {
    return NextResponse.json({ error: "Không tìm thấy người này" }, { status: 404 });
  }
  return NextResponse.json(person);
}

// PUT /api/people/:id -> cập nhật thông tin cá nhân
export async function PUT(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Cần đăng nhập admin để thực hiện thao tác này" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json();
  const existing = db.prepare("SELECT id FROM people WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy người này" }, { status: 404 });
  }

  const fields = [
    "full_name",
    "gender",
    "birth_date",
    "death_date",
    "avatar",
    "notes",
    "phone",
    "facebook",
    "occupation",
    "address",
    "birth_order"
  ];
  const updates: string[] = [];
  const values: unknown[] = [];
  for (const f of fields) {
    if (f in body) {
      updates.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: "Không có trường nào để cập nhật" }, { status: 400 });
  }
  values.push(id);
  db.prepare(`UPDATE people SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ success: true });
}

// DELETE /api/people/:id -> xóa người (kèm mọi quan hệ liên quan nhờ ON DELETE CASCADE)
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!isAdminRequest(_req)) {
    return NextResponse.json({ error: "Cần đăng nhập admin để thực hiện thao tác này" }, { status: 401 });
  }

  const { id } = params;
  const result = db.prepare("DELETE FROM people WHERE id = ?").run(id);
  if (result.changes === 0) {
    return NextResponse.json({ error: "Không tìm thấy người này" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
