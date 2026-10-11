"use client";

import { useId, useState } from "react";
import type { FamilyChartNode } from "@/lib/familyChartTransform";

interface Props {
  people: FamilyChartNode[];
  onClose: () => void;
  onSaved: () => void;
}

// Bỏ dấu tiếng Việt + về chữ thường để tìm không phân biệt dấu: gõ "binh" vẫn ra "Bình".
// "đ" không tách được bằng normalize("NFD") (không phải chữ cái + dấu rời) nên phải thay riêng.
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

// Lấy năm từ chuỗi ngày sinh, hỗ trợ cả dd-mm-yyyy, mm-yyyy, yyyy (và cả yyyy-mm-dd của dữ liệu cũ).
// Tìm đúng đoạn 4 chữ số liền nhau thay vì đoán vị trí: ngày/tháng chỉ có 2 chữ số
// nên đoạn 4 chữ số duy nhất luôn là năm, bất kể năm nằm đầu hay cuối chuỗi.
function extractBirthYear(birthday: string | undefined): string | null {
  return birthday?.match(/\b\d{4}\b/)?.[0] ?? null;
}

// Kèm năm sinh để phân biệt những người trùng tên
function personLabel(p: FamilyChartNode): string {
  const name = `${p.data["full name"]}`.trim();
  const birthYear = extractBirthYear(p.data.birthday);
  return birthYear ? `${name} (${birthYear})` : name;
}

function filterPeople(people: FamilyChartNode[], text: string): FamilyChartNode[] {
  const keyword = normalizeText(text.trim());
  if (!keyword) return people;
  return people.filter((p) => normalizeText(personLabel(p)).includes(keyword));
}

interface PickerProps {
  title: string;
  people: FamilyChartNode[];
  value: string;
  onChange: (id: string) => void;
}

// Ô tìm kiếm + select, dùng cho cả "Người 1" và "Người 2"
function PersonPicker({ title, people, value, onChange }: PickerProps) {
  const [search, setSearch] = useState("");
  const selectId = useId();
  const filtered = filterPeople(people, search);

  function handleSearchChange(text: string) {
    setSearch(text);
    // select là controlled: nếu người đang chọn không còn nằm trong danh sách đã lọc,
    // trình duyệt sẽ hiển thị option đầu tiên trong khi state vẫn giữ id cũ -> lệch nhau.
    // Nên chủ động chọn lại người đầu tiên trong kết quả lọc.
    const next = filterPeople(people, text);
    if (!next.some((p) => p.id === value)) {
      onChange(next[0]?.id ?? "");
    }
  }

  return (
    <div className="person-picker">
      <label htmlFor={selectId}>{title}</label>
      <input
        type="search"
        placeholder="Gõ tên để tìm..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        // Enter trong ô tìm kiếm sẽ submit cả form - chặn lại để không lưu nhầm quan hệ
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
      />
      <select id={selectId} value={value} onChange={(e) => onChange(e.target.value)}>
        {filtered.length === 0 && <option value="">Không tìm thấy</option>}
        {filtered.map((p) => (
          <option key={p.id} value={p.id}>
            {personLabel(p)}
          </option>
        ))}
      </select>
      <p className="person-picker__count">
        {filtered.length}/{people.length} người
      </p>
    </div>
  );
}

export default function RelationshipForm({ people, onClose, onSaved }: Props) {
// Sắp xếp theo tên (theo quy tắc tiếng Việt) để dễ dò khi danh sách dài
  const sortedPeople = [...people].sort((a, b) =>
    personLabel(a).localeCompare(personLabel(b), "vi")
  );

  const [person1, setPerson1] = useState(people[0]?.id ?? "");
  const [person2, setPerson2] = useState(people[1]?.id ?? "");
  const [type, setType] = useState<"parent" | "spouse">("parent");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  //const label = (p: FamilyChartNode) => `${p.data["full name"]}`.trim();
  //console.log('length: ', people.length);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!person1 || !person2 || person1 === person2) {
      setError("Vui lòng chọn hai người khác nhau");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person1_id: person1, person2_id: person2, type })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Lỗi không xác định");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  if (people.length < 2) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>Thêm quan hệ</h3>
          <p>Cần ít nhất 2 thành viên để tạo quan hệ. Hãy thêm thành viên trước.</p>
          <div className="modal-actions">
            <button className="btn" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Thêm quan hệ</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Loại quan hệ
            <select value={type} onChange={(e) => setType(e.target.value as "parent" | "spouse")}>
              <option value="parent">Cha/Mẹ → Con</option>
              <option value="spouse">Vợ chồng</option>
            </select>
          </label>

          <PersonPicker
            title={type === "parent" ? "Người 1 (Cha/Mẹ)" : "Người 1"}
            people={sortedPeople}
            value={person1}
            onChange={setPerson1}
          />
          <PersonPicker
            title={type === "parent" ? "Người 2 (Con)" : "Người 2"}
            people={sortedPeople}
            value={person2}
            onChange={setPerson2}
          />

          {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
