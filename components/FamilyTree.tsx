"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PersonForm from "./PersonForm";
import RelationshipForm from "./RelationshipForm";
import LoginForm from "./LoginForm";
import type { FamilyChartNode } from "@/lib/familyChartTransform";
import { getInitials } from "@/lib/utils";
import ImportDataForm from "./ImportDataForm";


// Tạo HTML riêng cho mỗi card trong cây thay vì dùng template mặc định của family-chart
function buildCardHtml(d: any): string {
  // TreeDatum của family-chart có thể lồng thêm 1 cấp (d.data.data) tùy version -
  // dòng dưới thử cả 2 khả năng để chắc chắn lấy đúng object chứa "first name", "gender"...
  //console.log('d: ', d);
  const person = d?.data?.data ?? d?.data ?? d ?? {};
  const nodeId: string = d?.data?.id ?? d?.id ?? "";

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
      <button class="fc-card__detail-btn" data-view-detail="${nodeId}" title="Xem chi tiết" type="button">ⓘ</button>
      ${avatarHtml}
      <div class="fc-card__body">
        <div class="fc-card__name">${fullname}</div>
        ${years ? `<div class="fc-card__years">${years}</div>` : ""}
      </div>
    </div>
  `;
}

// Đọc 1 biến CSS số (không đơn vị, vd "--card-x-spacing: 210;") từ layout đang bật
// (data-layout trên <html>) - để JS luôn khớp với layout hiện tại thay vì số viết cứng
// không đồng bộ mỗi khi đổi layout qua CSS.
function readCssNumberVar(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function FamilyTree() {
  const chartRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddRel, setShowAddRel] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showImportData, setShowImportData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [people, setPeople] = useState<FamilyChartNode[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Lắng nghe click vào nút "xem chi tiết" trên card bằng event delegation, gắn 1 LẦN
  // DUY NHẤT lúc mount (không đặt trong effect vẽ cây bên dưới) - vì effect vẽ cây chạy
  // lại mỗi khi refreshKey đổi và chỉ innerHTML="" nội dung BÊN TRONG chartRef.current,
  // bản thân div chartRef.current không bị hủy -> nếu gắn listener trong đó, mỗi lần vẽ
  // lại sẽ cộng dồn thêm 1 listener mới, khiến click bị xử lý nhiều lần.
  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-view-detail]");
      if (!target) return;
      // Chặn không cho sự kiện lan lên card cha - tránh kích hoạt hành vi
      // "click để canh giữa cây" mặc định của family-chart trên cùng 1 click
      e.stopPropagation();
      e.preventDefault();
      const id = target.getAttribute("data-view-detail");
      if (id) router.push(`/people/${id}`);
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [router]);

  // Kiểm tra trạng thái đăng nhập admin ngay khi trang tải
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(Boolean(data.isAdmin));
        setIsSuperAdmin(Boolean(data.isSuperAdmin));
      })
      .catch(() => {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    setIsSuperAdmin(false);
    //refresh();
  }

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/people");
    const data: FamilyChartNode[] = await res.json();
    setPeople(data);
    return data;
  }, []);

// Gọi API export -> tạo Blob ngay trên trình duyệt -> tự bấm hộ 1 thẻ <a download>
  // để trigger tải file, không cần server ghi file ra ổ đĩa (an toàn hơn, hoạt động
  // được cả khi deploy lên môi trường không có quyền ghi filesystem)
  async function handleExport() {
    const res = await fetch("/api/export");
    if (!res.ok) {
      alert("Xuất dữ liệu thất bại - kiểm tra lại bạn đã đăng nhập admin chưa.");
      return;
    }
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `family-tree-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Vẽ / vẽ lại cây mỗi khi dữ liệu thay đổi
  useEffect(() => {
    let cancelled = false;

    async function render() {
      const data = await fetchData();
      if (cancelled || !chartRef.current) return;

      // family-chart thao tác trực tiếp với DOM -> chỉ import ở client và dọn dẹp node cũ trước khi vẽ lại
      chartRef.current.innerHTML = "";

      if (data.length === 0) return;
      //console.log('data.length: ',data.length);

      const f3 = (await import("family-chart")).default;
      //await import("family-chart/styles/family-chart.css");

      // Đọc khoảng cách từ CSS của layout đang bật (data-layout trên <html>) thay vì
      // số viết cứng - đảm bảo tự đồng bộ mỗi khi đổi layout, không cần sửa file này
      const xSpacing = readCssNumberVar("--card-x-spacing", 210);
      const ySpacing = readCssNumberVar("--card-y-spacing", 230);

      const f3Chart = f3
        .createChart(chartRef.current, data as any)
        .setTransitionTime(600)
        .setCardXSpacing(xSpacing)
        .setCardYSpacing(ySpacing)
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
        <h1>Cây phả hệ Đỗ Gia</h1>
        {(isAdmin || isSuperAdmin) ? (
          isAdmin ? (
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
          <>
            <button className="btn btn-secondary" onClick={handleExport}>
              Xuất dữ liệu
            </button>
            <button className="btn" onClick={() => setShowImportData(true)}>
              Nạp dữ liệu
            </button>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Đăng xuất
            </button>
          </>
          ) 
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
          onLoggedIn={(username: string) => {
            setShowLogin(false);
            if(username==='admin') setIsAdmin(true);
            if(username==='superadmin') setIsSuperAdmin(true);
            //refresh();
          }}
        />
      )}

      {showImportData && (
        <ImportDataForm onClose={() => setShowImportData(false)} onImported={refresh} />
      )}
    </div>
  );
}