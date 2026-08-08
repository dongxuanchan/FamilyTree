"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import PersonForm from "./PersonForm";
import RelationshipForm from "./RelationshipForm";
import LoginForm from "./LoginForm";
import type { FamilyChartNode } from "@/lib/familyChartTransform";

function getInitials(fullName: string): string {
  if (!fullName) return "";

  return fullName
    .trim() // Loại bỏ khoảng trắng ở hai đầu
    .split(/\s+/) // Tách chuỗi thành mảng các từ, xử lý cả trường hợp có nhiều khoảng trắng liên tiếp
    .map(word => word.charAt(0).toUpperCase()) // Lấy ký tự đầu tiên và viết hoa
    .join(''); // Ghép các ký tự lại thành một chuỗi duy nhất
}

// Tạo HTML riêng cho mỗi card trong cây thay vì dùng template mặc định của family-chart
function buildCardHtml(d: any): string {
  // TreeDatum của family-chart có thể lồng thêm 1 cấp (d.data.data) tùy version -
  // dòng dưới thử cả 2 khả năng để chắc chắn lấy đúng object chứa "first name", "gender"...
  const person = d?.data?.data ?? d?.data ?? d ?? {};

  const fullname: string = person["full name"] ?? "";
  const gender: string = person.gender;
  const birthday: string | undefined = person.birthday;
  const death: string | undefined = person["death date"];
  const avatar: string | undefined = person.avatar;

  const initials = getInitials(`${fullname}`);

  const genderClass =
    gender === "F" ? "fc-card--female" : gender === "M" ? "fc-card--male" : "fc-card--unknown";

  const years = birthday ? `${birthday}${death ? " – <span>" + death +"</span>" : ""}` : "";

  const avatarHtml = avatar
    ? `<img class="fc-card__avatar fc-card__avatar--img" src="${avatar}" alt="${fullname}" />`
    : `<div class="fc-card__avatar">${initials}</div>`;

  return `
    <div class="fc-card ${genderClass}">
      ${avatarHtml}
      <div class="fc-card__body">
        <div class="fc-card__name">${fullname}</div>
        ${years ? `<div class="fc-card__years">${years}</div>` : ""}
      </div>
    </div>
  `;
}

export default function FamilyTree() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddRel, setShowAddRel] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [people, setPeople] = useState<FamilyChartNode[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Kiểm tra trạng thái đăng nhập admin ngay khi trang tải
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
  }

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
        {isAdmin ? (
          <>
            <button className="btn" onClick={() => setShowAddPerson(true)}>
              + Thêm thành viên
            </button>
            <button className="btn" onClick={() => setShowAddRel(true)}>
              + Thêm quan hệ
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <button className="btn" onClick={() => setShowLogin(true)}>
            Đăng nhập admin
          </button>
        )}
      </div>

      <div className="panel">
        {people.length === 0 && (
          <p>Chưa có thành viên nào. {isAdmin ? "Bấm \"Thêm thành viên\" để bắt đầu." : "Đăng nhập admin để bắt đầu thêm thành viên."}</p>
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

      {showLogin && (
        <LoginForm
          onClose={() => setShowLogin(false)}
          onLoggedIn={() => {
            setShowLogin(false);
            setIsAdmin(true);
          }}
        />
      )}
    </div>
  );
}