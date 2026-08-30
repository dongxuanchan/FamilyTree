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
    <div class="fc-card ${genderClass}" data-person-id="${nodeId}">
      <div class="fc-card__avatar-wrap">
        ${avatarHtml}
      </div>
      <div class="fc-card__body"> 
        <button class="fc-card__name" data-view-detail="${nodeId}" type="button">${fullname}</button>
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

// Cắt bớt "data" (đã có sẵn từ /api/people) xuống chỉ còn người nằm trong phạm vi
// ± N thế hệ quanh 1 "gốc" tự chọn (người không có cha/mẹ nào được ghi nhận - khả năng
// cao là tổ tiên đời cao nhất trong dữ liệu). Chạy hoàn toàn ở client, không gọi thêm API.
function truncateToGenerations(
  data: FamilyChartNode[],
  ancestorGens: number,
  descendantGens: number
): FamilyChartNode[] {
  if (data.length === 0) return data;

  const byId = new Map(data.map((n) => [n.id, n]));
  const seed = data.find((n) => !n.rels.parents || n.rels.parents.length === 0) ?? data[0];

  const included = new Set<string>();

  function addWithSpouses(id: string) {
    if (included.has(id)) return;
    included.add(id);
    //not include Spouses
    //for (const s of byId.get(id)?.rels.spouses ?? []) included.add(s);
  }

  function walkUp(id: string, gensLeft: number) {
    addWithSpouses(id);
    if (gensLeft <= 0) return;
    for (const p of byId.get(id)?.rels.parents ?? []) walkUp(p, gensLeft - 1);
  }

  function walkDown(id: string, gensLeft: number) {
    addWithSpouses(id);
    if (gensLeft <= 0) return;
    for (const c of byId.get(id)?.rels.children ?? []) walkDown(c, gensLeft - 1);
  }

  //add 2 nút gốc (Ông, Bà)
  included.add(seed.id);
  for (const s of byId.get(seed.id)?.rels.spouses ?? []) included.add(s);

  const seedParents = byId.get(seed.id)?.rels.parents ?? [];
  for (const parentId of seedParents) {
    for (const siblingId of byId.get(parentId)?.rels.children ?? []) addWithSpouses(siblingId);
  }
  if (ancestorGens > 0) for (const parentId of seedParents) walkUp(parentId, ancestorGens - 1);
  if (descendantGens > 0) {
    for (const childId of byId.get(seed.id)?.rels.children ?? []) walkDown(childId, descendantGens - 1);
  }

  // Giữ lại đúng người nằm trong "included", đồng thời lọc rels để không còn tham
  // chiếu "ma" tới người đã bị cắt bỏ
  return data
    .filter((n) => included.has(n.id))
    .map((n) => ({
      ...n,
      rels: {
        parents: n.rels.parents?.filter((id) => included.has(id)),
        children: n.rels.children?.filter((id) => included.has(id)),
        spouses: n.rels.spouses?.filter((id) => included.has(id))
      }
    }));
}

// So sánh theo "birth_order" (con thứ mấy) - người chưa nhập số này bị xếp xuống
// cuối cùng, không làm xáo trộn vị trí của những người đã có số. Dùng cùng cách
// truy cập "an toàn" (thử nhiều cấp .data) như buildCardHtml, vì chưa rõ chắc chắn
// TreeDatum truyền vào đây có cùng cấu trúc lồng hay không.
function sortChildrenByBirthOrder(a: any, b: any): number {
  const personA = a?.data?.data ?? a?.data ?? a ?? {};
  const personB = b?.data?.data ?? b?.data ?? b ?? {};
  const orderA = personA.birth_order ?? Number.MAX_SAFE_INTEGER;
  const orderB = personB.birth_order ?? Number.MAX_SAFE_INTEGER;
  return orderA - orderB;
}

export default function FamilyTree() {
  const chartRef = useRef<HTMLDivElement>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const router = useRouter();
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [showAddRel, setShowAddRel] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showImportData, setShowImportData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [people, setPeople] = useState<FamilyChartNode[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFullTree, setShowFullTree] = useState(false);

  // Lắng nghe click vào nút "xem chi tiết" trên card bằng event delegation, gắn 1 LẦN
  // DUY NHẤT lúc mount (không đặt trong effect vẽ cây bên dưới) - vì effect vẽ cây chạy
  // lại mỗi khi refreshKey đổi và chỉ innerHTML="" nội dung BÊN TRONG chartRef.current,
  // bản thân div chartRef.current không bị hủy -> nếu gắn listener trong đó, mỗi lần vẽ
  // lại sẽ cộng dồn thêm 1 listener mới, khiến click bị xử lý nhiều lần.
  useEffect(() => {
    const container = chartRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const el = e.target as HTMLElement;

      const detailBtn = el.closest<HTMLElement>("[data-view-detail]");
      if (detailBtn) {
        e.stopPropagation();
        e.preventDefault();
        const id = detailBtn.getAttribute("data-view-detail");
        if (id) router.push(`/people/${id}`);
        return;
      }

      // Click vào bất kỳ đâu khác trên 1 card (không phải nút "ⓘ") -> coi như user đã
      // bắt đầu tự duyệt cây -> bỏ giới hạn thế hệ ban đầu. KHÔNG gọi stopPropagation/
      // preventDefault ở đây - để hành vi "click để canh giữa" mặc định của family-chart
      // vẫn chạy song song bình thường, không bị chặn.
      const card = el.closest<HTMLElement>(".fc-card");
      if (card && !showFullTree) {
        // Ghi nhớ đúng người vừa bấm - sau khi cây vẽ lại đầy đủ, sẽ "bấm hộ" lại
        // đúng người này 1 lần nữa để family-chart tự canh giữa theo đúng cơ chế
        // sẵn có của nó (xem đoạn xử lý trong render() bên dưới)
        pendingFocusIdRef.current = card.getAttribute("data-person-id");
        setShowFullTree(true);
      }
    }



    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [router, showFullTree]);

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

      //cắt bớt data nếu User chọn view Home 
      const treeData = showFullTree ? data : truncateToGenerations(data, 0, 1);

      // family-chart thao tác trực tiếp với DOM -> chỉ import ở client và dọn dẹp node cũ trước khi vẽ lại
      chartRef.current.innerHTML = "";

      if (treeData.length === 0) return;
      //console.log('data.length: ',data.length);

      const f3 = (await import("family-chart")).default;
      //await import("family-chart/styles/family-chart.css");

      // Đọc khoảng cách từ CSS của layout đang bật (data-layout trên <html>) thay vì
      // số viết cứng - đảm bảo tự đồng bộ mỗi khi đổi layout, không cần sửa file này
      const xSpacing = readCssNumberVar("--card-x-spacing", 210);
      const ySpacing = readCssNumberVar("--card-y-spacing", 230);

      const f3Chart = f3
        .createChart(chartRef.current, treeData as any)
        .setTransitionTime(600)
        .setCardXSpacing(xSpacing)
        .setCardYSpacing(ySpacing)
        .setOrientationVertical()
        // Tắt card rỗng tự động thêm cho người chỉ có 1 cha/mẹ (con riêng)
        .setSingleParentEmptyCard(false)
        .setSortChildrenFunction(sortChildrenByBirthOrder);

      f3Chart
        .setCardHtml()
        .setCardInnerHtmlCreator(buildCardHtml)
        .setOnHoverPathToMain();

      f3Chart.updateTree({ initial: true });

      // Nếu vừa chuyển từ chế độ giới hạn sang đầy đủ do click vào 1 người - giả lập
      // click lại đúng người đó để family-chart tự canh giữa theo đúng cơ chế click mặc
      // định của chính nó, thay vì phải tự tìm cách "set vị trí ban đầu" qua API chưa
      // xác thực. requestAnimationFrame đảm bảo đợi trình duyệt vẽ xong DOM của lần
      // updateTree() này trước khi tìm phần tử để bấm.
      if (pendingFocusIdRef.current) {
        const targetId = pendingFocusIdRef.current;
        pendingFocusIdRef.current = null;
        requestAnimationFrame(() => {
          const targetCard = chartRef.current?.querySelector<HTMLElement>(
            `[data-person-id="${targetId}"]`
          );
          targetCard?.click();
        });
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [fetchData, refreshKey, showFullTree]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div>
      <div className="toolbar">
        <h1>Cây phả hệ Đỗ Gia</h1>
        {showFullTree && (
          <button className="btn btn-secondary" onClick={() => setShowFullTree(false)}>
            🏠 Cây rút gọn
          </button>
        )}
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
        
        <div id="FamilyChart" ref={chartRef} /> 

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