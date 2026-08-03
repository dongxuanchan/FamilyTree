# Cây Phả Hệ Gia Đình

Ứng dụng Next.js (App Router) + SQLite (better-sqlite3) + thư viện `family-chart`
để quản lý và hiển thị cây phả hệ gia đình.

## Kiến trúc

```
family-tree-app/
├── app/
│   ├── api/
│   │   ├── people/route.ts          GET (dữ liệu cây), POST (thêm người)
│   │   ├── people/[id]/route.ts     PUT (sửa), DELETE (xóa)
│   │   └── relationships/route.ts   POST/DELETE quan hệ cha-mẹ-con, vợ-chồng
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── FamilyTree.tsx    Component chính, vẽ cây bằng family-chart
│   ├── PersonForm.tsx    Form thêm thành viên
│   └── RelationshipForm.tsx  Form gán quan hệ giữa 2 thành viên có sẵn
├── lib/
│   ├── db.ts                    Khởi tạo SQLite + schema
│   └── familyChartTransform.ts  Chuyển dữ liệu SQLite -> định dạng family-chart
└── data/family.db (tự tạo khi chạy lần đầu)
```

## Mô hình dữ liệu (SQLite)

- `people`: id (uuid), first_name, last_name, gender (M/F), birth_date, death_date, avatar, notes
- `relationships`: person1_id, person2_id, type ('parent' | 'spouse')
  - `parent`: person1 là cha/mẹ của person2
  - `spouse`: person1 và person2 là vợ/chồng (lưu 1 dòng, đối xứng)

API `GET /api/people` sẽ tự động gộp 2 bảng này lại thành định dạng mà
`family-chart` yêu cầu (mỗi node có `data` + `rels.father/mother/spouses/children`).

## Cài đặt

Yêu cầu Node.js >= 18.

```bash
cd family-tree-app
npm install
npm run dev
```

Mở http://localhost:3000

Lần đầu chạy, file `data/family.db` sẽ tự động được tạo cùng schema.

## Cách dùng

1. Bấm **"+ Thêm thành viên"** để tạo từng người (tên, họ, giới tính, ngày sinh).
2. Bấm **"+ Thêm quan hệ"** để nối 2 người đã tạo lại với nhau:
   - *Cha/Mẹ → Con*: chọn người 1 là cha hoặc mẹ, người 2 là con.
   - *Vợ chồng*: chọn 2 người là vợ chồng của nhau.
3. Cây sẽ tự vẽ lại (dùng `family-chart`) mỗi khi có thay đổi.

## Con riêng (chỉ có 1 cha hoặc 1 mẹ)

Từ bản `family-chart` v0.9.0 trở đi, quan hệ cha/mẹ dùng mảng thống nhất
`rels.parents: [id1, id2?]`, hỗ trợ **1 hoặc 2 phần tử** — nghĩa là bạn có thể
tạo quan hệ `parent` (`POST /api/relationships`) chỉ với 1 người, không bắt
buộc phải có đủ cả cha lẫn mẹ. Cây sẽ tự hiển thị đúng, không cần node "ẩn danh"
thay thế cho người còn thiếu.

Ví dụ: nếu A là con riêng chỉ có mẹ là B (không rõ cha), bạn chỉ cần tạo
1 quan hệ `parent` giữa B → A, không cần tạo thêm quan hệ nào khác cho "cha".

## Ghi chú quan trọng về thư viện `family-chart`

Thư viện `family-chart` (https://github.com/donatso/family-chart) thao tác trực
tiếp với DOM và cập nhật API theo từng phiên bản khá thường xuyên. Code trong
`components/FamilyTree.tsx` dùng cú pháp chuỗi (chaining) phổ biến nhất của thư
viện:

```js
const f3Chart = f3.createChart(container, data)
  .setTransitionTime(600)
  .setCardXSpacing(250)
  .setCardYSpacing(150)
  .setOrientationVertical();

f3Chart.setCard(f3.CardHtml)
  .setCardDisplay([["first name", "last name"], ["birthday"]])
  .setStyle("imageRect")
  .setOnHoverPathToMain();

f3Chart.updateTree({ initial: true });
```

Nếu sau khi `npm install` mà API không khớp (do bạn cài phiên bản mới hơn),
hãy mở `node_modules/family-chart/README.md` hoặc trang GitHub của thư viện để
đối chiếu tên hàm chính xác — cấu trúc dữ liệu đầu vào (`data`) trong dự án này
đã tuân đúng chuẩn `{ id, data, rels }` mà thư viện yêu cầu nên phần lớn code
sẽ không cần đổi.

## Mở rộng thêm (gợi ý)

- Cho phép sửa/xóa trực tiếp bằng cách click vào card trên cây (`setOnCardClick`)
  rồi gọi `PUT /api/people/:id` hoặc `DELETE /api/people/:id`.
- Thêm avatar bằng cách upload ảnh và lưu URL vào cột `avatar`.
- Dùng module `f3.EditTree` có sẵn của thư viện để cho phép kéo-thả thêm
  người thân trực tiếp trên cây (cần đồng bộ callback `onUpdate` với API).
- Thêm xác thực người dùng (NextAuth) nếu nhiều người cùng chỉnh sửa 1 cây.
- Export cây ra PDF/hình ảnh.
