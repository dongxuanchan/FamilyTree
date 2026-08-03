"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function PersonForm({ onClose, onSaved }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [birthDate, setBirthDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("Vui lòng nhập tên");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          gender,
          birth_date: birthDate || null
        })
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Thêm thành viên mới</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Tên
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
          </label>
          <label>
            Họ
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label>
            Giới tính
            <select value={gender} onChange={(e) => setGender(e.target.value as "M" | "F")}>
              <option value="M">Nam</option>
              <option value="F">Nữ</option>
            </select>
          </label>
          <label>
            Ngày sinh
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </label>

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
