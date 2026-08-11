"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PersonForm from "./PersonForm";
import DeletePersonButton from "./DeletePersonButton";
import type { PersonRow } from "@/lib/familyChartTransform";

interface Props {
  person: PersonRow;
}

export default function PersonDetailActions({ person }: Props) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const fullName = `${person.full_name}`.trim();

  return (
    <div className="detail-actions">
      <button className="btn" onClick={() => setShowEdit(true)}>
        Sửa thông tin
      </button>
      <DeletePersonButton personId={person.id} personName={fullName} />

      {showEdit && (
        <PersonForm
          personId={person.id}
          initialData={person}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            // page.tsx là Server Component, tự fetch lại getPersonById() mới nhất
            // từ DB - không cần reload cả trang.
            router.refresh();
          }}
        />
      )}
    </div>
  );
}