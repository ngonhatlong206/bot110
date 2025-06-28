# 🚀 Lunar Krystal Bot - Hệ thống Tự động hóa với Firebase

## 📋 Tổng quan

Hệ thống bot Facebook tự động với Firebase đã được tích hợp để:
- **Tự động lưu và đồng bộ cookie** giữa các thiết bị
- **Tự động thay cookie** khi phát hiện die/checkpoint
- **Mã hóa bảo mật** cookie trước khi lưu trữ
- **Giám sát liên tục** sức khỏe cookie

## 🔧 Cài đặt

### 1. Cài đặt Dependencies
```bash
npm install
```

### 2. Cấu hình Environment Variables
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

Cập nhật thông tin trong file `.env`:
```env
# Facebook Login Credentials
FB_EMAIL=ngonhatlongffff@gmail.com
FB_PASSWORD=Nhatlong_10102006
FB_OTPKEY=

# Firebase Configuration
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\nT1Qw8YtNvDzCeGYshxd29CJmx+uE+t9yu1j4ECojNv6W5aH5vlmWf6I5SXHDptWr\n6U8fB0Gd0e7QtdjWuaGqBk2CRrD0MYfAAjLls3z4d2aHP/Uly82C4CdfMjO1elrR\nG3Aco3/pS9Jt8DbzWqenv0r5Sm3L4XzYqT4Z3wZRe6MYN3XrtM=\n-----END PRIVATE KEY-----\n"

# Encryption Key (32 characters recommended)
ENCRYPT_KEY=your_strong_encryption_key_here_32_chars

# Server Configuration
PORT=2025
```

### 3. Cấu hình Firebase
Đảm bảo bạn đã có:
- Firebase project: `facebook-bot-backup`
- Service account key đã được cấu hình
- Database URL: `https://facebook-bot-backup.firebaseio.com`

## 🚀 Khởi chạy

### Khởi động Bot
```bash
npm start
```

### Khởi động với Login mới
```bash
npm run login
```

## 🔄 Tính năng Tự động

### 1. Tự động Lưu Cookie
- Cookie được lưu tự động sau mỗi lần đăng nhập thành công
- Mã hóa AES-256 trước khi lưu lên Firebase
- Đồng bộ giữa file local và Firebase

### 2. Tự động Thay Cookie
- Kiểm tra sức khỏe cookie mỗi 5 phút
- Tự động tạo cookie mới khi phát hiện die/checkpoint
- Thử lại tối đa 3 lần nếu thất bại

### 3. Giám sát Liên tục
- Monitor cookie health real-time
- Log chi tiết các hoạt động
- Restart bot tự động khi cần thiết

## 📁 Cấu trúc File

```
├── lib/
│   └── firebaseManager.js    # Quản lý Firebase
├── utils/
│   └── cookieMonitor.js      # Giám sát cookie
├── main.js                   # File chính (đã tích hợp)
├── index.js                  # Entry point (đã cập nhật)
├── config.json              # Cấu hình bot
└── .env                     # Environment variables
```

## 🔧 API Endpoints

### Status Check
```
GET /status
```
Trả về trạng thái Firebase và cookie:
```json
{
  "status": "online",
  "firebase": {
    "exists": true,
    "status": "active",
    "lastUsed": 1234567890,
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🛠️ Troubleshooting

### Lỗi Firebase Connection
```bash
# Kiểm tra environment variables
echo $FIREBASE_PRIVATE_KEY
echo $ENCRYPT_KEY

# Kiểm tra network
ping firebaseio.com
```

### Lỗi Cookie
```bash
# Xóa cookie cũ
rm appstate.json

# Restart bot
npm start
```

### Lỗi Login
```bash
# Kiểm tra thông tin đăng nhập
cat .env | grep FB_

# Thử login lại
npm run login
```

## 📊 Monitoring

### Log Files
- Cookie monitor logs: `[COOKIE_MONITOR]`
- Firebase logs: `[FIREBASE]`
- Login logs: `[LOGIN]`

### Health Check
```bash
# Kiểm tra trạng thái
curl http://localhost:2025/status
```

## 🔒 Bảo mật

### Mã hóa Cookie
- Sử dụng AES-256-CBC encryption
- Key được lưu trong environment variables
- Cookie được mã hóa trước khi lưu lên Firebase

### Environment Variables
- Không commit file `.env` vào git
- Sử dụng `.env.example` làm template
- Bảo vệ thông tin nhạy cảm

## 📞 Hỗ trợ

- **Facebook**: https://www.facebook.com/LunarKrystal.Dev
- **Email**: ngonhatlongffff@gmail.com

## 🔄 Changelog

### v4.6.0 - Firebase Integration
- ✅ Tích hợp Firebase Admin SDK
- ✅ Tự động lưu/đồng bộ cookie
- ✅ Giám sát cookie tự động
- ✅ Mã hóa bảo mật
- ✅ API status endpoint
- ✅ Error handling cải thiện

---

**Developed by LunarKrystal** 🚀 