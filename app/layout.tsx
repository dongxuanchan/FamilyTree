import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cây Phả Hệ Gia Đình",
  description: "Ứng dụng quản lý và hiển thị cây phả hệ gia đình"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" 
    //data-theme="forest"
    data-theme="heritage"
    card-layout="vertical"
    //data-layout="compact" // compact, tiny
    >   
      <body>{children}</body>
    </html>
  );
}
