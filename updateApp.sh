#!/bin/bash
echo "1. Đang kéo code mới từ Github..."
git pull origin dong_gia

# Kiểm tra tham số $1 xem có bằng -i hoặc --install không
if [ "$1" == "-i" ] || [ "$1" == "--install" ]; then
    echo "2. Phát hiện tham số '-i'. Đang cập nhật thư viện (npm install)..."
    npm install
else
    echo "2. Bỏ qua bước cập nhật thư viện (Mặc định)."
fi

echo "3. Đang Build lại mã nguồn Next.js..."
npm run build

echo "4. Khởi động lại ứng dụng PM2..."
pm2 restart family-tree

echo "Hoàn tất! Web đã được cập nhật bản mới nhất."