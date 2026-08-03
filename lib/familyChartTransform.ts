import db from "./db";

export interface PersonRow {
  id: string;
  first_name: string;
  last_name: string;
  gender: "M" | "F";
  birth_date: string | null;
  death_date: string | null;
  avatar: string | null;
  notes: string | null;
}

interface RelRow {
  person1_id: string;
  person2_id: string;
  type: "parent" | "spouse";
}

// Định dạng mà thư viện family-chart (f3) yêu cầu cho mỗi node
export interface FamilyChartNode {
  id: string;
  data: {
    "first name": string;
    "last name": string;
    gender: "M" | "F";
    birthday?: string;
    "death date"?: string;
    avatar?: string;
    notes?: string;
  };
  rels: {
    // Mảng ID cha/mẹ - hỗ trợ 1 phần tử (con riêng, chỉ biết 1 bên) hoặc 2 phần tử
    parents?: string[];
    spouses?: string[];
    children?: string[];
  };
}

export function getFamilyChartData(): FamilyChartNode[] {
  const people = db.prepare("SELECT * FROM people").all() as PersonRow[];
  const rels = db.prepare("SELECT * FROM relationships").all() as RelRow[];

  const nodes = new Map<string, FamilyChartNode>();
  for (const p of people) {
    nodes.set(p.id, {
      id: p.id,
      data: {
        "first name": p.first_name,
        "last name": p.last_name,
        gender: p.gender,
        ...(p.birth_date ? { birthday: p.birth_date } : {}),
        ...(p.death_date ? { "death date": p.death_date } : {}),
        ...(p.avatar ? { avatar: p.avatar } : {}),
        ...(p.notes ? { notes: p.notes } : {})
      },
      rels: {}
    });
  }

  for (const r of rels) {
    const n1 = nodes.get(r.person1_id);
    const n2 = nodes.get(r.person2_id);
    if (!n1 || !n2) continue;

    if (r.type === "spouse") {
      n1.rels.spouses = Array.from(new Set([...(n1.rels.spouses ?? []), r.person2_id]));
      n2.rels.spouses = Array.from(new Set([...(n2.rels.spouses ?? []), r.person1_id]));
    } else if (r.type === "parent") {
      // person1 là cha/mẹ của person2. Mảng parents chỉ cần 1 phần tử nếu con riêng
      // chỉ biết 1 bên cha/mẹ - family-chart (v0.9.0+) hỗ trợ trường hợp này.
      n2.rels.parents = Array.from(new Set([...(n2.rels.parents ?? []), r.person1_id]));
      n1.rels.children = Array.from(new Set([...(n1.rels.children ?? []), r.person2_id]));
    }
  }

  return Array.from(nodes.values());
}
