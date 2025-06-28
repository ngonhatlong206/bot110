const { readFileSync, writeFileSync, existsSync } = require("fs-extra");
const { join } = require("path");
const { saveCookie, loadCookie, updateCookieStatus } = require('./firebaseManager');
const firebaseLogger = require('./firebaseLogger');
const firebaseConfig = require('../firebase-config.js');

class CookieManager {
  constructor() {
    this.cookieFile = join(__dirname, '../appstate.json');
    this.currentEmail = firebaseConfig.defaultEmail;
  }

  // Kiểm tra file cookie có tồn tại không
  hasLocalCookie() {
    return existsSync(this.cookieFile);
  }

  // Đọc cookie từ file local
  readLocalCookie() {
    try {
      if (!this.hasLocalCookie()) {
        return null;
      }
      
      const cookieData = readFileSync(this.cookieFile, 'utf8');
      const cookie = JSON.parse(cookieData);
      
      firebaseLogger.logCookie('READ_LOCAL', this.currentEmail, 'local_file_found', { 
        cookieLength: cookie.length 
      });
      
      return cookie;
    } catch (error) {
      firebaseLogger.logCookie('ERROR', this.currentEmail, 'read_local_failed', { error: error.message });
      return null;
    }
  }

  // Lưu cookie vào file local
  saveLocalCookie(cookie) {
    try {
      writeFileSync(this.cookieFile, JSON.stringify(cookie, null, 2));
      firebaseLogger.logCookie('SAVE_LOCAL', this.currentEmail, 'local_file_saved', { 
        cookieLength: cookie.length 
      });
      return true;
    } catch (error) {
      firebaseLogger.logCookie('ERROR', this.currentEmail, 'save_local_failed', { error: error.message });
      return false;
    }
  }

  // Lấy cookie ưu tiên: Local > Firebase > Null
  async getCookie() {
    try {
      // Bước 1: Thử đọc từ file local
      const localCookie = this.readLocalCookie();
      if (localCookie && localCookie.length > 0) {
        firebaseLogger.logCookie('SUCCESS', this.currentEmail, 'using_local_cookie', { 
          source: 'local_file' 
        });
        return localCookie;
      }

      // Bước 2: Thử lấy từ Firebase
      const firebaseCookie = await loadCookie(this.currentEmail);
      if (firebaseCookie && firebaseCookie.length > 0) {
        // Lưu cookie từ Firebase vào local
        this.saveLocalCookie(firebaseCookie);
        firebaseLogger.logCookie('SUCCESS', this.currentEmail, 'using_firebase_cookie', { 
          source: 'firebase' 
        });
        return firebaseCookie;
      }

      // Bước 3: Không có cookie nào
      firebaseLogger.logCookie('WARNING', this.currentEmail, 'no_cookie_found', { 
        sources: ['local', 'firebase'] 
      });
      return null;

    } catch (error) {
      firebaseLogger.logCookie('ERROR', this.currentEmail, 'get_cookie_failed', { error: error.message });
      return null;
    }
  }

  // Cập nhật cookie (từ login thành công)
  async updateCookie(newCookie) {
    try {
      // Lưu vào file local
      const localSaved = this.saveLocalCookie(newCookie);
      
      // Lưu vào Firebase
      const firebaseSaved = await saveCookie(newCookie, this.currentEmail);
      
      // Cập nhật trạng thái
      await updateCookieStatus('active', this.currentEmail);
      
      firebaseLogger.logCookie('UPDATE', this.currentEmail, 'cookie_updated', {
        localSaved: localSaved,
        firebaseSaved: firebaseSaved,
        cookieLength: newCookie.length
      });
      
      return localSaved && firebaseSaved;
    } catch (error) {
      firebaseLogger.logCookie('ERROR', this.currentEmail, 'update_cookie_failed', { error: error.message });
      return false;
    }
  }

  // Xóa cookie (khi có lỗi)
  async deleteCookie() {
    try {
      // Xóa file local
      if (this.hasLocalCookie()) {
        const fs = require('fs-extra');
        fs.removeSync(this.cookieFile);
      }
      
      // Cập nhật trạng thái Firebase
      await updateCookieStatus('expired', this.currentEmail);
      
      firebaseLogger.logCookie('DELETE', this.currentEmail, 'cookie_deleted');
      return true;
    } catch (error) {
      firebaseLogger.logCookie('ERROR', this.currentEmail, 'delete_cookie_failed', { error: error.message });
      return false;
    }
  }

  // Tạo template cookie để người dùng nhập
  createCookieTemplate() {
    const template = [
      {
        "key": "c_user",
        "value": "YOUR_USER_ID_HERE",
        "domain": "facebook.com",
        "path": "/",
        "hostOnly": false,
        "creation": new Date().toISOString(),
        "lastAccessed": new Date().toISOString()
      },
      {
        "key": "xs",
        "value": "YOUR_XS_TOKEN_HERE",
        "domain": "facebook.com",
        "path": "/",
        "hostOnly": false,
        "creation": new Date().toISOString(),
        "lastAccessed": new Date().toISOString()
      },
      {
        "key": "fr",
        "value": "YOUR_FR_TOKEN_HERE",
        "domain": "facebook.com",
        "path": "/",
        "hostOnly": false,
        "creation": new Date().toISOString(),
        "lastAccessed": new Date().toISOString()
      },
      {
        "key": "datr",
        "value": "YOUR_DATR_TOKEN_HERE",
        "domain": "facebook.com",
        "path": "/",
        "hostOnly": false,
        "creation": new Date().toISOString(),
        "lastAccessed": new Date().toISOString()
      }
    ];

    const templateFile = join(__dirname, '../cookie-template.json');
    writeFileSync(templateFile, JSON.stringify(template, null, 2));
    
    firebaseLogger.logCookie('TEMPLATE', this.currentEmail, 'template_created', { 
      templateFile: templateFile 
    });
    
    return templateFile;
  }

  // Hướng dẫn lấy cookie từ browser
  getCookieInstructions() {
    return `
🔧 HƯỚNG DẪN LẤY COOKIE TỪ BROWSER:

1️⃣ Mở Facebook trên Chrome/Firefox
2️⃣ Đăng nhập vào tài khoản
3️⃣ Nhấn F12 → Application → Cookies → https://facebook.com
4️⃣ Copy các cookie quan trọng:
   - c_user (User ID)
   - xs (Session token)
   - fr (Friend request token)
   - datr (Data token)

5️⃣ Tạo file appstate.json với format:
[
  {
    "key": "c_user",
    "value": "100065103982890",
    "domain": "facebook.com",
    "path": "/"
  },
  {
    "key": "xs", 
    "value": "your_xs_token_here",
    "domain": "facebook.com",
    "path": "/"
  }
]

6️⃣ Đặt file appstate.json vào thư mục bot
7️⃣ Chạy lại bot: npm start

✅ Bot sẽ tự động:
- Đọc cookie từ file
- Lưu vào Firebase
- Không mất dữ liệu tin nhắn
- Tự động backup
    `;
  }
}

module.exports = CookieManager; 