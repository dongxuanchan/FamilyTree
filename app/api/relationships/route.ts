import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isAdminRequest } from "@/lib/auth";


// POST /api/relationships
// body: { person1_id, person2_id, type: "parent" | "spouse" }
// - type "parent": person1 là cha/mẹ của person2
// - type "spouse": person1 và person2 là vợ chồng
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Cần đăng nhập admin để thực hiện thao tác này" }, { status: 401 });
  }

  const body = await req.json();
  const { person1_id, person2_id, type } = body;

  if (!person1_id || !person2_id || !["parent", "spouse"].includes(type)) {
    return NextResponse.json(
      { error: "Cần person1_id, person2_id và type ('parent' | 'spouse')" },
      { status: 400 }
    );
  }

  try {
    db.prepare(
      `INSERT OR IGNORE INTO relationships (person1_id, person2_id, type) VALUES (?, ?, ?)`
    ).run(person1_id, person2_id, type);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/relationships
// body: { person1_id, person2_id, type }
export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Cần đăng nhập admin để thực hiện thao tác này" }, { status: 401 });
  }
  
  const body = await req.json();
  const { person1_id, person2_id, type } = body;

  const result = db
    .prepare(`DELETE FROM relationships WHERE person1_id = ? AND person2_id = ? AND type = ?`)
    .run(person1_id, person2_id, type);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Không tìm thấy quan hệ này" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
