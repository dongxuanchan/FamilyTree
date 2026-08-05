"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

// Đọc file ảnh, resize xuống tối đa 200x200px rồi trả về chuỗi base64 (data URL).
// Resize để tránh phình database SQLite khi người dùng chọn ảnh gốc quá lớn (vài MB).
function resizeImageToDataUrl(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được file ảnh"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File không phải ảnh hợp lệ"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Trình duyệt không hỗ trợ canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function PersonForm({ onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh (jpg, png...)");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setAvatar(dataUrl);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xử lý được ảnh");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
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
          full_name: fullName.trim(),
          gender,
          birth_date: birthDate || null,
          avatar
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
            Ảnh đại diện
            <div className="avatar-upload">
              <div className="avatar-upload__preview">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Xem trước avatar" />
                ) : (
                  <span>{fullName.charAt(0).toUpperCase() || "?"}</span>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </div>
          </label>

          <label>
            Họ Và Tên
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
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