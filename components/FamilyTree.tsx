"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PersonForm from "./PersonForm";
import RelationshipForm from "./RelationshipForm";
import type { FamilyChartNode } from "@/lib/familyChartTransform";

// Tạo HTML riêng cho mỗi card trong cây thay vì dùng template mặc định của family-chart
function buildCardHtml(d: any): string {
  // TreeDatum của family-chart có thể lồng thêm 1 cấp (d.data.data) tùy version -
  // dòng dưới thử cả 2 khả năng để chắc chắn lấy đúng object chứa "first name", "gender"...
  const person = d?.data?.data ?? d?.data ?? d ?? {};

  const first: string = person["first name"] ?? "";
  const last: string = person["last name"] ?? "";
  const gender: string = person.gender;
  const birthday: string | undefined = person.birthday;
  const death: string | undefined = person["death date"];
  const avatar: string | undefined = person.avatar;

  const initials =
    `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";

  const genderClass =
    gender === "F" ? "fc-card--female" : gender === "M" ? "fc-card--male" : "fc-card--unknown";

  const years = birthday ? `${birthday}${death ? " – " + death : " – nay"}` : "";

  const avatarHtml = avatar
    ? `<img class="fc-card__avatar fc-card__avatar--img" src="${avatar}" alt="${first}" />`
    : `<div class="fc-card__avatar">${initials}</div>`;

  return `
    <div class="fc-card ${genderClass}">
      ${avatarHtml}
      <div class="fc-card__body">
        <div class="fc-card__name">${first} ${last}</div>
        ${years ? `<div class="fc-card__years">${years}</div>` : ""}
      </div>
    </div>
  `;
}

export default function FamilyTree() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddRel, setShowAddRel] = useState(false);
  const [people, setPeople] = useState<FamilyChartNode[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/people");
    const data: FamilyChartNode[] = await res.json();
    setPeople(data);
    return data;
  }, []);

  // Vẽ / vẽ lại cây mỗi khi dữ liệu thay đổi
  useEffect(() => {
    let cancelled = false;

    async function render() {
      const data = await fetchData();
      if (cancelled || !chartRef.current) return;

      // family-chart thao tác trực tiếp với DOM -> chỉ import ở client và dọn dẹp node cũ trước khi vẽ lại
      chartRef.current.innerHTML = "";

      if (data.length === 0) return;

      // @ts-expect-error - thư viện family-chart không có type định nghĩa sẵn
      const f3 = (await import("family-chart")).default;
      await import("family-chart/styles/family-chart.css");

      const f3Chart = f3
        .createChart(chartRef.current, data)
        .setTransitionTime(600)
        .setCardXSpacing(250)
        .setCardYSpacing(150)
        .setOrientationVertical()
        // Tắt card rỗng tự động thêm cho người chỉ có 1 cha/mẹ (con riêng)
        .setSingleParentEmptyCard(false);

      f3Chart
        .setCardHtml()
        .setCardInnerHtmlCreator(buildCardHtml)
        .setOnHoverPathToMain();

      f3Chart.updateTree({ initial: true });
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [fetchData, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div>
      <div className="toolbar">
        <h1>Cây phả hệ gia đình</h1>
        <button className="btn" onClick={() => setShowAddPerson(true)}>
          + Thêm thành viên
        </button>
        <button className="btn" onClick={() => setShowAddRel(true)}>
          + Thêm quan hệ
        </button>
      </div>

      <div className="panel">
        {people.length === 0 && (
          <p>Chưa có thành viên nào. Bấm &quot;Thêm thành viên&quot; để bắt đầu.</p>
        )}
        <div id="FamilyChart" ref={chartRef} />
      </div>

      {showAddPerson && (
        <PersonForm
          onClose={() => setShowAddPerson(false)}
          onSaved={() => {
            setShowAddPerson(false);
            refresh();
          }}
        />
      )}

      {showAddRel && (
        <RelationshipForm
          people={people}
          onClose={() => setShowAddRel(false)}
          onSaved={() => {
            setShowAddRel(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}