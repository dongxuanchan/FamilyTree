"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportDataForm({ onClose, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn file JSON");
      return;
    }

    setSaving(true);
    setError("");
    setResult("");
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("File không phải JSON hợp lệ");
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(parsed as object), replaceExisting })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Nhập dữ liệu thất bại");
      }

      setResult(`Đã nhập ${data.imported_people} người và ${data.imported_relationships} quan hệ.`);
      onImported(); // vẽ lại cây ngay với dữ liệu mới, không cần đóng modal
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nhập dữ liệu từ JSON</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Chọn file JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(e) => setReplaceExisting(e.target.checked)}
            />
            Xóa toàn bộ dữ liệu hiện tại trước khi nhập
          </label>

          {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}
          {result && <p style={{ color: "#2f6f4f", fontSize: 13 }}>{result}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button type="submit" className="btn" disabled={saving || !file}>
              {saving ? "Đang nhập..." : "Nhập dữ liệu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}