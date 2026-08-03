"use client";

import { useState } from "react";
import type { FamilyChartNode } from "@/lib/familyChartTransform";

interface Props {
  people: FamilyChartNode[];
  onClose: () => void;
  onSaved: () => void;
}

export default function RelationshipForm({ people, onClose, onSaved }: Props) {
  const [person1, setPerson1] = useState(people[0]?.id ?? "");
  const [person2, setPerson2] = useState(people[1]?.id ?? "");
  const [type, setType] = useState<"parent" | "spouse">("parent");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const label = (p: FamilyChartNode) => `${p.data["first name"]} ${p.data["last name"]}`.trim();

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

          <label>{type === "parent" ? "Người 1 (Cha/Mẹ)" : "Người 1"}</label>
          <select value={person1} onChange={(e) => setPerson1(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {label(p)}
              </option>
            ))}
          </select>

          <label>{type === "parent" ? "Người 2 (Con)" : "Người 2"}</label>
          <select value={person2} onChange={(e) => setPerson2(e.target.value)}>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {label(p)}
              </option>
            ))}
          </select>

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
