"use client";

import { useState } from "react";
import type { PersonRow } from "@/lib/familyChartTransform";
import ImageCropper from "./ImageCropper";

interface Props {
  onClose: () => void;
  onSaved: () => void;
  // Có personId -> form chuyển sang chế độ SỬA (gọi PUT thay vì POST, điền sẵn dữ liệu cũ)
  personId?: string;
  initialData?: PersonRow;
}

// Đọc file ảnh, resize xuống tối đa 200x200px rồi trả về chuỗi base64 (data URL).
// Resize để tránh phình database SQLite khi người dùng chọn ảnh gốc quá lớn (vài MB).
/*function resizeImageToDataUrl(file: File, maxSize = 200): Promise<string> {
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
}*/

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// Chiều ngược lại của buildBirthDate() bên dưới: tách chuỗi đã lưu dd-mm-yyyy ngược trở lại thành 3 phần Năm/Tháng/Ngày để điền sẵn
// vào form sửa. Number()->String() để bỏ số 0 đệm ("03" -> "3"), khớp value của <option>.
function parseBirthDate(birthDate: string | null | undefined) {
  //console.log('birthDate: ',birthDate);
  if (!birthDate) return { year: "", month: "", day: "" };

  let day, month, year;
  switch (birthDate.length) {
    case 4:
      year = birthDate;
      break;       
    case 7:
      [month, year] = birthDate.split("-");
      break; 
    default:
      [day, month, year] = birthDate.split("-");
  }
  
  return {
    year: year ?? "",
    month: month ? String(Number(month)) : "",
    day: day ? String(Number(day)) : ""
  };
}

export default function PersonForm({ onClose, onSaved, personId, initialData }: Props) {
  const isEditMode = Boolean(personId);
  const parsedBirth = parseBirthDate(initialData?.birth_date);

  const [fullName, setFullName] = useState(initialData?.full_name ?? "");
  const [gender, setGender] = useState<"M" | "F">(initialData?.gender ?? "M");
  const [birthYear, setBirthYear] = useState(parsedBirth.year);
  const [birthMonth, setBirthMonth] = useState(parsedBirth.month);
  const [birthDay, setBirthDay] = useState(parsedBirth.day);
  const [isAlive, setIsAlive] = useState(!initialData?.death_date);
  const [deathYear, setDeathYear] = useState(initialData?.death_date ?? "");
  const [avatar, setAvatar] = useState<string | null>(initialData?.avatar ?? null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [facebook, setFacebook] = useState(initialData?.facebook ?? "");
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

 function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setError("Vui lòng chọn file ảnh (jpg, png...)");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    setRawImageSrc(reader.result as string);
    setShowCropper(true);
    setError("");
  };
  reader.onerror = () => setError("Không đọc được file ảnh");
  reader.readAsDataURL(file);
  e.target.value = ""; // reset input - đảm bảo chọn lại đúng file cũ vẫn kích hoạt onChange
}

  // Ghép Năm/Tháng/Ngày thành 1 chuỗi ngày sinh, chỉ thêm phần nào người dùng đã điền.
  // Ngày chỉ được ghép vào nếu đã có tháng (tránh chuỗi vô nghĩa kiểu "1990--15").
  function buildBirthDate(): string {
    if (!birthYear.trim()) return "xxxx";
    let result = "";
    if (birthMonth) {
      result += `${birthMonth.padStart(2, "0")}-`;
      if (birthDay) {
        result = `${birthDay.padStart(2, "0")}-${result}`;
      }
    }
    result += birthYear.trim();
    return result;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Vui lòng nhập tên");
      return;
    }
    /*if (!birthYear.trim()) {
      setError("Vui lòng nhập năm sinh");
     return;
    }
    if (!isAlive && !deathYear.trim()) {
      setError("Vui lòng nhập năm mất, hoặc tick lại \"Còn sống\" nếu chưa rõ");
      return;
    }*/

    setSaving(true);
    setError("");
    try {
      const url = isEditMode ? `/api/people/${personId}` : "/api/people";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          gender,
          birth_date: buildBirthDate(),
          death_date: isAlive ? null : (!deathYear.trim() ? 'xxxx':deathYear.trim()),
          avatar,
          phone: phone.trim() || null,
          facebook: facebook.trim() || null,
          occupation: occupation.trim() || null,
          address: address.trim() || null
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
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEditMode ? "Sửa thông tin thành viên" : "Thêm thành viên mới"}</h3>
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
            Ngày sinh <span style={{ color: "#9a9a9a", fontWeight: 400 }}>(chỉ năm là bắt buộc)</span>
            <div className="date-row">
              <select className="daymonthyearinput" 
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)} 
              >
                <option value="">Ngày</option>
                {DAYS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              -
              <select className="daymonthyearinput" 
                value={birthMonth}
                onChange={(e) => {
                  setBirthMonth(e.target.value); 
                }}
              >
                <option value="">Tháng</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              -
              <input className="daymonthyearinput" 
                type="number"
                placeholder="Năm *"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                min={1900}
                max={2050}
              />
            </div>
          </label>
 
          <label className="checkbox-row">
            Còn sống
            <input className="daymonthyearinput" 
              type="checkbox"
              checked={isAlive}
              onChange={(e) => setIsAlive(e.target.checked)}
            /> 
          </label>
 
          {!isAlive && (
            <label className="inline-field">
              Năm mất 
                <input className="daymonthyearinput" 
                  type="number"
                  placeholder="Năm mất"
                  value={deathYear}
                  onChange={(e) => setDeathYear(e.target.value)}
                  min={1900}
                  max={2050}
                /> 
            </label>
          )}

          <label>
            Nghề nghiệp
            <input value={occupation} onChange={(e) => setOccupation(e.target.value)} />
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxx"
            />
          </label>
          <label>
            Link Facebook
            <input
              type="url"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
            />
          </label>
          <label>
            Nơi ở hiện tại
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>

          {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Đang lưu..." : isEditMode ? "Lưu thay đổi" : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showCropper && rawImageSrc && (
        <ImageCropper
          imageSrc={rawImageSrc}
          onCancel={() => {
            setShowCropper(false);
            setRawImageSrc(null);
          }}
          onConfirm={(croppedDataUrl) => {
            setAvatar(croppedDataUrl);
            setShowCropper(false);
            setRawImageSrc(null);
          }}
        />
      )}
    </>
  );
}