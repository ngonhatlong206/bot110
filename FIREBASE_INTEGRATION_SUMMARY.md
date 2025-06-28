# 🔥 Firebase Integration - Auto Cookie Management

## 📋 Tổng quan

Bot đã được tích hợp Firebase để **tự động quản lý cookie** với các tính năng:

- ✅ **Lấy cookie từ Firebase** thay vì tự tạo mới
- ✅ **Tự động thay cookie** khi login thất bại
- ✅ **Lưu cookie mới** sau khi login thành công
- ✅ **Quản lý nhiều cookie** cho nhiều tài khoản
- ✅ **Mã hóa cookie** để bảo mật

## 🚀 Cách hoạt động

### 1. Quy trình Login thông minh:
```
1. Bot khởi động → Tìm cookie trong Firebase
2. Nếu có cookie → Sử dụng cookie để login
3. Nếu không có → Login bằng email/password
4. Login thành công → Lưu cookie mới lên Firebase
5. Login thất bại → Thử cookie khác hoặc retry
```

### 2. Auto thay cookie:
```
- Cookie hết hạn → Tự động tìm cookie khác
- Thử tối đa 3 lần với cookie khác nhau
- Nếu không có cookie nào → Login bằng email/password
- Tự động restart nếu thất bại hoàn toàn
```

## 📁 Files đã được cập nhật

### 1. `main.js` - File chính
- ✅ Tích hợp CookieManager class
- ✅ Logic login thông minh với retry
- ✅ Ưu tiên lấy cookie từ Firebase
- ✅ Auto thay cookie khi thất bại

### 2. `lib/firebaseManager.js` - Quản lý Firebase
- ✅ Kết nối Firebase Admin SDK
- ✅ Mã hóa/giải mã cookie
- ✅ Lưu/tải cookie từ Firebase
- ✅ Quản lý trạng thái cookie

### 3. `firebase-config.js` - Cấu hình Firebase
- ✅ Thông tin project Firebase
- ✅ Service account credentials
- ✅ Cấu hình mặc định

### 4. `package.json`
- ✅ Cập nhật entry point thành `main.js`
- ✅ Thêm script test Firebase

## 🛠️ Cách sử dụng

### 1. Chạy bot bình thường:
```bash
npm start
```

### 2. Test Firebase:
```bash
npm run test:firebase
```

### 3. Chạy với file cũ (nếu cần):
```bash
node index.js
```

## 🔧 Cấu hình

### 1. Firebase Project:
- Project ID: `facebook-bot-backup`
- Database URL: `https://facebook-bot-backup.firebaseio.com`
- Service Account đã được cấu hình sẵn

### 2. Cookie Storage:
- Path: `/cookies/{email_key}`
- Mã hóa: AES-256-CBC
- Trạng thái: `active`, `expired`, `test_status`

### 3. Retry Logic:
- Số lần thử: 3 lần
- Thời gian chờ: 30 giây giữa các lần
- Auto restart nếu thất bại hoàn toàn

## 📊 Log Messages

### Cookie Manager:
- `🔄 Đang tải cookie từ Firebase...`
- `✅ Đã tải cookie thành công từ Firebase`
- `⚠️ Không tìm thấy cookie hợp lệ trong Firebase`
- `🔄 Đang thay thế cookie...`

### Login Process:
- `✅ Sử dụng cookie từ Firebase`
- `🔄 Login bằng email/password`
- `🔄 Thử lần X với cookie mới`
- `✅ Login thành công!`

## 🔒 Bảo mật

- ✅ Cookie được mã hóa trước khi lưu
- ✅ Sử dụng Firebase Admin SDK
- ✅ Private key được bảo vệ
- ✅ Chỉ lưu cookie cần thiết

## 🚨 Troubleshooting

### Lỗi Firebase:
1. Kiểm tra kết nối internet
2. Chạy `npm run test:firebase`
3. Kiểm tra cấu hình trong `firebase-config.js`

### Lỗi Login:
1. Bot sẽ tự động thử lại
2. Kiểm tra email/password trong `config.json`
3. Xem log để debug

### Lỗi Cookie:
1. Cookie sẽ được tự động thay thế
2. Bot sẽ login bằng email/password nếu cần
3. Cookie mới sẽ được lưu sau khi login thành công

## 🎯 Kết quả mong đợi

Với tích hợp Firebase, bot sẽ:
- ✅ **Khởi động nhanh hơn** (dùng cookie có sẵn)
- ✅ **Ít bị check point** (cookie được quản lý tốt)
- ✅ **Tự động phục hồi** khi cookie hết hạn
- ✅ **Hoạt động ổn định** hơn

---

**Lưu ý:** Bot vẫn hoạt động bình thường nếu Firebase không khả dụng, sẽ fallback về login bằng email/password như trước. 