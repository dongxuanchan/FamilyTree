import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { getFamilyChartData } from "@/lib/familyChartTransform";

// GET /api/people -> trả về dữ liệu đã transform sẵn cho family-chart
export async function GET() {
  const data = getFamilyChartData();
  return NextResponse.json(data);
}

// POST /api/people -> tạo một người mới (chưa có quan hệ)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { full_name, gender, birth_date, death_date, avatar, notes } = body;

  if (!full_name || !gender) {
    return NextResponse.json(
      { error: "Thiếu 'full_name' hoặc 'gender' (M/F)" },
      { status: 400 }
    );
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO people (id, full_name, gender, birth_date, death_date, avatar, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, full_name, gender, birth_date ?? null, death_date ?? null, avatar ?? null, notes ?? null);

  return NextResponse.json({ id }, { status: 201 });
}
