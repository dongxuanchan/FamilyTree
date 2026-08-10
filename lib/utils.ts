//lấy tên viết tắt 
export function getInitials(fullName: string): string {
  if (!fullName) return "";

  return fullName
    .trim() // Loại bỏ khoảng trắng ở hai đầu
    .split(/\s+/) // Tách chuỗi thành mảng các từ, xử lý cả trường hợp có nhiều khoảng trắng liên tiếp
    .map(word => word.charAt(0).toUpperCase()) // Lấy ký tự đầu tiên và viết hoa
    .join(''); // Ghép các ký tự lại thành một chuỗi duy nhất
}