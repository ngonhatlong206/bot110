# Hướng dẫn Deploy Bot lên Render

## Các bước đã sửa để khắc phục lỗi

### 1. Sửa lỗi "Cannot find module './compile.js'"
- Đã sửa `package.json`: thay đổi `"main": "mirai.js"` thành `"main": "index.js"`
- Thêm `"engines": { "node": ">=18.0.0" }` để chỉ định phiên bản Node.js

### 2. Sửa lỗi Firebase
- Cập nhật `lib/firebaseManager.js` để xử lý lỗi private key
- Thêm kiểm tra `firebaseApp` trước khi sử dụng Firebase
- Bot vẫn có thể chạy mà không cần Firebase

### 3. Tạo file cấu hình Render
- `render.yaml`: Cấu hình service cho Render
- `.nvmrc`: Chỉ định phiên bản Node.js

## Cách Deploy lên Render

### Bước 1: Chuẩn bị
1. Đảm bảo code đã được push lên GitHub
2. Có tài khoản Render.com

### Bước 2: Tạo Service trên Render
1. Đăng nhập vào Render.com
2. Click "New" → "Web Service"
3. Connect với GitHub repository
4. Cấu hình:
   - **Name**: lunar-krystal-bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Bước 3: Cấu hình Environment Variables
Thêm các biến môi trường sau trong Render:

```
FB_EMAIL=your_facebook_email@gmail.com
FB_PASSWORD=your_facebook_password
FB_OTPKEY=your_2fa_key_if_needed
ENCRYPT_KEY=your_32_character_encryption_key
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_DATABASE_URL=your_firebase_database_url
```

### Bước 4: Deploy
1. Click "Create Web Service"
2. Render sẽ tự động build và deploy
3. Chờ quá trình hoàn tất

## Lưu ý quan trọng

### Về Firebase
- Nếu không cấu hình Firebase, bot vẫn chạy được nhưng sẽ không lưu cookie
- Để sử dụng Firebase, cần tạo project Firebase và lấy service account key

### Về Facebook Login
- Bot sử dụng Facebook login thông qua email/password
- Có thể cần 2FA nếu tài khoản Facebook có bật
- Nên sử dụng tài khoản Facebook riêng cho bot

### Về Security
- Không commit các thông tin nhạy cảm vào code
- Sử dụng environment variables cho tất cả thông tin nhạy cảm
- Thay đổi `ENCRYPT_KEY` thành key riêng của bạn

## Troubleshooting

### Lỗi "Cannot find module"
- Đảm bảo tất cả dependencies đã được cài đặt
- Kiểm tra `package.json` có đúng không

### Lỗi Firebase
- Kiểm tra Firebase credentials
- Đảm bảo Firebase project đã được tạo và cấu hình đúng

### Lỗi Facebook Login
- Kiểm tra email/password Facebook
- Tắt 2FA tạm thời nếu cần
- Sử dụng tài khoản Facebook không bị checkpoint

## Monitoring
- Sử dụng Render logs để theo dõi bot
- Bot sẽ tự động restart nếu gặp lỗi
- Có thể truy cập `/status` endpoint để kiểm tra trạng thái 