# 🚀 Krystal Bot - Hướng dẫn sử dụng với Firebase

## 📋 Tổng quan

Bot Facebook này sử dụng appstate (cookie) do bạn tự cung cấp qua file `appstate.json` để đăng nhập. Dữ liệu tin nhắn, tiền, user... được lưu trên Firebase nên sẽ không bị mất khi bạn thay cookie hoặc deploy lại bot.

## 🔧 Cài đặt

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Firebase
- Tạo project Firebase và lấy Service Account Key.
- Lưu thông tin cấu hình Firebase vào file `firebase-config.js` hoặc biến môi trường nếu cần.
- Đảm bảo đã cấu hình đúng Database URL.

### 3. Thêm appstate (cookie Facebook)
- Tạo file `appstate.json` ở thư mục gốc của project.
- Dán nội dung cookie Facebook (appstate) vào file này (dạng array).
- Mỗi lần cookie hết hạn, chỉ cần thay file `appstate.json` mới, KHÔNG ảnh hưởng dữ liệu.

## 🚀 Khởi chạy bot
```bash
npm start
```

- Nếu appstate hợp lệ, bot sẽ đăng nhập và hoạt động bình thường.
- Nếu appstate hết hạn hoặc sai, chỉ cần thay file `appstate.json` mới rồi khởi động lại bot.

## 🔄 Thay đổi cookie mà không mất dữ liệu
- Dữ liệu bot (tin nhắn, tiền, user,...) được lưu trên Firebase.
- Khi cookie hết hạn, chỉ cần thay file `appstate.json` mới, KHÔNG cần xóa dữ liệu hay cấu hình lại.
- Deploy lại bot hoặc thay cookie đều KHÔNG làm mất dữ liệu.

## 📁 Cấu trúc file cần quan tâm
```
├── main.js            # File chạy chính của bot
├── appstate.json      # Cookie Facebook (bạn tự thay khi cần)
├── config.json        # Cấu hình bot
├── firebase-config.js # Cấu hình Firebase
```

## 🛠️ Troubleshooting

### Lỗi appstate/cookie
- Kiểm tra lại file `appstate.json` có đúng định dạng array không.
- Nếu đăng nhập báo lỗi, hãy thay cookie mới.

### Lỗi Firebase
- Kiểm tra lại cấu hình Firebase (service account, database URL).

## 🔒 Bảo mật
- KHÔNG chia sẻ file `appstate.json` hoặc thông tin Firebase cho người khác.
- KHÔNG commit file `appstate.json` lên git.

## 📞 Hỗ trợ
- **Facebook**: https://www.facebook.com/LunarKrystal.Dev
- **Email**: ngonhatlongffff@gmail.com

---
**Developed by LunarKrystal** 🚀 