import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPersonById } from "@/lib/familyChartTransform";
import { getInitials } from "@/lib/utils";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import PersonDetailActions from "@/components/PersonDetailActions";

interface PageProps {
  params: { id: string };
}

export default function PersonDetailPage({ params }: PageProps) {
  const person = getPersonById(params.id);

  if (!person) {
    notFound();
  }

  // page.tsx là Server Component nên đọc cookie trực tiếp qua next/headers,
  // không cần gọi fetch("/api/auth/me") như FamilyTree.tsx (Client Component) đã làm
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const isAdmin = verifySessionToken(token);
  //console.log('isAdmin: ', isAdmin);

  const fullName = `${person.full_name}`.trim();
  const initials = getInitials(`${fullName}`);
  const genderClass =
    person.gender === "F" ? "fc-card--female" : person.gender === "M" ? "fc-card--male" : "fc-card--unknown";
  const genderLabel = person.gender === "F" ? "Nữ" : "Nam";

  const years = person.birth_date
    ? `${person.birth_date}${person.death_date ? " – " + person.death_date : " – nay"}`
    : null;


  // Danh sách field hiển thị dạng bảng - lọc bỏ field nào không có dữ liệu
  const fields: { label: string; value: string | null; isLink?: boolean }[] = [
    { label: "Nghề nghiệp", value: person.occupation },
    { label: "Số điện thoại", value: person.phone },
    { label: "Facebook", value: person.facebook, isLink: true },
    { label: "Nơi ở hiện tại", value: person.address },
    { label: "Ghi chú", value: person.notes }
  ].filter((f) => f.value);


  return (
    <div>
      <div className="toolbar">
        <Link href="/" className="btn btn-secondary">
          ← Quay lại
        </Link>
        <h1>Chi tiết thành viên</h1>
      </div>

      <div className="panel">
        <div className="detail-card">
          {person.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="detail-avatar" src={person.avatar} alt={fullName} />
          ) : (
            <div className={`detail-avatar detail-avatar--placeholder ${genderClass}`}>{initials}</div>
          )}

          <h2 className="detail-name">{fullName}</h2>
          <p className="detail-subtitle">
            {genderLabel}
            {years ? ` · ${years}` : ""}
          </p>

          {fields.length > 0 ? (
            <dl className="detail-fields">
              {fields.map((f) => (
                <div className="detail-field" key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>
                    {f.isLink ? (
                      <a href={f.value!} target="_blank" rel="noopener noreferrer">
                        {f.value}
                      </a>
                    ) : (
                      f.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="detail-empty">Chưa có thêm thông tin nào khác.</p>
          )}

          {isAdmin && <PersonDetailActions person={person} />}
        </div>
      </div>
    </div>
  );
}