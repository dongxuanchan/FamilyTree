import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { isSuperAdminRequest } from "@/lib/auth";
import type { PersonRow } from "@/lib/familyChartTransform";

interface ImportRelationship {
  person1_id: string;
  person2_id: string;
  type: "parent" | "spouse";
}

interface ImportPayload {
  people?: PersonRow[];
  relationships?: ImportRelationship[];
  // true -> xóa sạch dữ liệu cũ trước khi nhập (khôi phục hoàn toàn từ backup)
  // false/không có -> gộp vào dữ liệu hiện có, người trùng "id" sẽ được cập nhật đè
  replaceExisting?: boolean;
}

// POST /api/import -> nạp dữ liệu từ file JSON đã export trước đó (chỉ admin)
export async function POST(req: NextRequest) {
  if (!isSuperAdminRequest(req)) {
    return NextResponse.json({ error: "Cần đăng nhập admin để thực hiện thao tác này" }, { status: 401 });
  }

  const body: ImportPayload = await req.json();
  const people = Array.isArray(body.people) ? body.people : [];
  const relationships = Array.isArray(body.relationships) ? body.relationships : [];
  const replaceExisting = Boolean(body.replaceExisting);

  if (people.length === 0) {
    return NextResponse.json({ error: "File JSON không có dữ liệu 'people' hợp lệ" }, { status: 400 });
  }

  // Kiểm tra sơ bộ cấu trúc TRƯỚC khi ghi vào DB - tránh nhập dở dang nếu file sai định dạng
  for (const p of people) {
    if (!p.id || !p.full_name || !p.gender) {
      return NextResponse.json(
        { error: "Thiếu 'id', 'full_name' hoặc 'gender' ở 1 người trong danh sách" },
        { status: 400 }
      );
    }
  }

  // ON CONFLICT(id) DO UPDATE = "upsert": nếu id đã tồn tại thì cập nhật đè, chưa có thì thêm mới
  const upsertPerson = db.prepare(`
    INSERT INTO people (id, full_name, gender, birth_date, death_date, avatar, notes, phone, facebook, occupation, address, birth_order)
    VALUES (@id, @full_name, @gender, @birth_date, @death_date, @avatar, @notes, @phone, @facebook, @occupation, @address, @birth_order)
    ON CONFLICT(id) DO UPDATE SET
      full_name = excluded.full_name,
      gender = excluded.gender,
      birth_date = excluded.birth_date,
      death_date = excluded.death_date,
      avatar = excluded.avatar,
      notes = excluded.notes,
      phone = excluded.phone,
      facebook = excluded.facebook,
      occupation = excluded.occupation,
      birth_order = excluded.birth_order
  `);

  const upsertRelationship = db.prepare(`
    INSERT OR IGNORE INTO relationships (person1_id, person2_id, type) VALUES (?, ?, ?)
  `);

  // Gộp toàn bộ thao tác vào 1 transaction: nếu bất kỳ dòng nào lỗi (vd JSON có
  // relationship trỏ tới id không tồn tại -> vi phạm khóa ngoại), TOÀN BỘ import
  // sẽ tự động rollback, database không bị nhập dở dang.
  const importAll = db.transaction(() => {
    if (replaceExisting) {
      db.exec("DELETE FROM relationships");
      db.exec("DELETE FROM people");
    }

    for (const p of people) {
      upsertPerson.run({
        id: p.id,
        full_name: p.full_name,
        gender: p.gender,
        birth_date: p.birth_date ?? null,
        death_date: p.death_date ?? null,
        avatar: p.avatar ?? null,
        notes: p.notes ?? null,
        phone: p.phone ?? null,
        facebook: p.facebook ?? null,
        occupation: p.occupation ?? null,
        address: p.address ?? null,
        birth_order: p.birth_order ?? null,
      });
    }

    for (const r of relationships) {
      if (!r.person1_id || !r.person2_id || !["parent", "spouse"].includes(r.type)) continue;
      upsertRelationship.run(r.person1_id, r.person2_id, r.type);
    }
  });

  try {
    importAll();
  } catch (err) {
    return NextResponse.json({ error: `Nhập dữ liệu thất bại: ${String(err)}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported_people: people.length,
    imported_relationships: relationships.length
  });
}