"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  personId: string;
  personName: string;
}

export default function DeletePersonButton({ personId, personName }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Xóa "${personName}" khỏi cây phả hệ?\n\nHành động này không thể hoàn tác - mọi quan hệ cha/mẹ, con, vợ/chồng liên quan tới người này cũng sẽ bị xóa theo.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/people/${personId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Xóa thất bại");
      }
      router.push("/"); // quay về trang chủ vì trang chi tiết của người vừa xóa không còn tồn tại
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      setDeleting(false);
    }
  }

  return (
    <div>
      <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
        {deleting ? "Đang xóa..." : "Xóa thành viên"}
      </button>
      {error && <p style={{ color: "crimson", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}