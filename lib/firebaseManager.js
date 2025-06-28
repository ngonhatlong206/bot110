const admin = require('firebase-admin');
const crypto = require('crypto');
const logger = require('../utils/log.js');
const firebaseConfig = require('../firebase-config.js');

// Cấu hình Firebase Service Account
const getServiceAccount = () => {
  // Ưu tiên sử dụng environment variable
  if (process.env.FIREBASE_PRIVATE_KEY) {
    return {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || firebaseConfig.privateKeyId,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL || firebaseConfig.clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || firebaseConfig.clientId,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || firebaseConfig.clientX509CertUrl
    };
  }
  
  // Fallback to config file
  return {
    type: "service_account",
    project_id: firebaseConfig.projectId,
    private_key_id: firebaseConfig.privateKeyId,
    private_key: firebaseConfig.privateKey,
    client_email: firebaseConfig.clientEmail,
    client_id: firebaseConfig.clientId,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: firebaseConfig.clientX509CertUrl
  };
};

// Khởi tạo Firebase Admin SDK
let firebaseApp;
try {
  const serviceAccount = getServiceAccount();
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL || firebaseConfig.databaseURL
  });
  logger("[AUTO-COOKIE] ✅ Firebase đã được khởi tạo thành công", "FIREBASE");
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    firebaseApp = admin.app();
    logger("[AUTO-COOKIE] ✅ Firebase đã được khởi tạo trước đó", "FIREBASE");
  } else {
    logger(`[AUTO-COOKIE] ❌ Lỗi khởi tạo Firebase: ${error.message}`, "FIREBASE");
    // Không throw error để bot vẫn có thể chạy mà không có Firebase
    firebaseApp = null;
  }
}

// Hàm mã hóa cookie
const encrypt = (text) => {
  try {
    const encryptionKey = process.env.ENCRYPT_KEY || firebaseConfig.encryptKey;
    const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
    const iv = Buffer.alloc(16, 0);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi mã hóa: ${error.message}`, "FIREBASE");
    throw error;
  }
};

// Hàm giải mã cookie
const decrypt = (text) => {
  try {
    const encryptionKey = process.env.ENCRYPT_KEY || firebaseConfig.encryptKey;
    const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
    const iv = Buffer.alloc(16, 0);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi giải mã: ${error.message}`, "FIREBASE");
    throw error;
  }
};

// Hàm kiểm tra cookie hợp lệ
const isValidCookie = (cookie) => {
  try {
    // Kiểm tra cookie có tồn tại và là array
    if (!cookie || !Array.isArray(cookie) || cookie.length === 0) {
      logger("[AUTO-COOKIE] ❌ Cookie không hợp lệ: không phải array hoặc rỗng", "FIREBASE");
      return false;
    }

    // Kiểm tra từng cookie item
    for (const item of cookie) {
      // Kiểm tra độ dài value > 100 ký tự
      if (!item.value || item.value.length < 100) {
        logger(`[AUTO-COOKIE] ❌ Cookie không hợp lệ: value quá ngắn (${item.value?.length || 0} ký tự)`, "FIREBASE");
        return false;
      }

      // Kiểm tra không chứa "expired"
      if (item.value && item.value.toLowerCase().includes('expired')) {
        logger("[AUTO-COOKIE] ❌ Cookie không hợp lệ: chứa từ khóa 'expired'", "FIREBASE");
        return false;
      }

      // Kiểm tra các trường bắt buộc
      if (!item.key || !item.domain) {
        logger("[AUTO-COOKIE] ❌ Cookie không hợp lệ: thiếu key hoặc domain", "FIREBASE");
        return false;
      }
    }

    logger("[AUTO-COOKIE] ✅ Cookie hợp lệ", "FIREBASE");
    return true;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi kiểm tra cookie: ${error.message}`, "FIREBASE");
    return false;
  }
};

// Hàm kiểm tra cookie có hết hạn (>24h)
const isCookieExpired = (lastUsed) => {
  try {
    const now = Date.now();
    const cookieAge = now - lastUsed;
    const maxAge = 24 * 60 * 60 * 1000; // 24 giờ

    if (cookieAge > maxAge) {
      logger(`[AUTO-COOKIE] ⚠️ Cookie đã hết hạn (${Math.round(cookieAge / (60 * 60 * 1000))} giờ)`, "FIREBASE");
      return true;
    }

    logger(`[AUTO-COOKIE] ✅ Cookie còn hạn (${Math.round(cookieAge / (60 * 60 * 1000))} giờ)`, "FIREBASE");
    return false;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi kiểm tra hết hạn cookie: ${error.message}`, "FIREBASE");
    return true; // Coi như hết hạn nếu có lỗi
  }
};

// Hàm tạo cookie mới (simulate)
const generateNewCookie = async (email) => {
  try {
    logger(`[AUTO-COOKIE] 🔄 Đang tạo cookie mới cho ${email}...`, "FIREBASE");
    
    // Simulate tạo cookie mới (trong thực tế sẽ gọi API Facebook)
    const newCookie = [
      {
        key: "sb",
        value: "new_cookie_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
        domain: "facebook.com",
        path: "/",
        hostOnly: false,
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      },
      {
        key: "c_user",
        value: "100065103982890",
        domain: "facebook.com",
        path: "/",
        hostOnly: false,
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      },
      {
        key: "xs",
        value: "new_xs_token_" + Date.now() + "_" + Math.random().toString(36).substr(2, 50),
        domain: "facebook.com",
        path: "/",
        hostOnly: false,
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      }
    ];

    logger(`[AUTO-COOKIE] ✅ Đã tạo cookie mới thành công`, "FIREBASE");
    return newCookie;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi tạo cookie mới: ${error.message}`, "FIREBASE");
    return null;
  }
};

// Lưu cookie lên Firebase
const saveCookie = async (cookie, email = firebaseConfig.defaultEmail) => {
  try {
    if (!firebaseApp) {
      logger("[AUTO-COOKIE] ⚠️ Firebase chưa được khởi tạo, không thể lưu cookie", "FIREBASE");
      return false;
    }
    
    logger(`[AUTO-COOKIE] 🔄 Đang lưu cookie cho ${email}...`, "FIREBASE");
    
    const encrypted = encrypt(JSON.stringify(cookie));
    const userKey = email.replace(/[^a-zA-Z0-9]/g, '_');
    
    await admin.database().ref(`cookies/${userKey}`).set({
      data: encrypted,
      lastUsed: Date.now(),
      status: 'active',
      email: email,
      updatedAt: new Date().toISOString()
    });
    
    logger(`[AUTO-COOKIE] ✅ Cookie đã được lưu thành công cho ${email}`, "FIREBASE");
    return true;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi lưu cookie: ${error.message}`, "FIREBASE");
    return false;
  }
};

// Tải cookie từ Firebase
const loadCookie = async (email = firebaseConfig.defaultEmail) => {
  try {
    if (!firebaseApp) {
      logger("[AUTO-COOKIE] ⚠️ Firebase chưa được khởi tạo, không thể tải cookie", "FIREBASE");
      return null;
    }
    
    logger(`[AUTO-COOKIE] 🔄 Đang tải cookie cho ${email}...`, "FIREBASE");
    
    const userKey = email.replace(/[^a-zA-Z0-9]/g, '_');
    const snapshot = await admin.database().ref(`cookies/${userKey}`).once('value');
    
    if (!snapshot.exists()) {
      logger(`[AUTO-COOKIE] ⚠️ Không tìm thấy cookie cho ${email}`, "FIREBASE");
      return null;
    }
    
    const cookieData = snapshot.val();
    const decrypted = decrypt(cookieData.data);
    const cookie = JSON.parse(decrypted);
    
    // Kiểm tra cookie hợp lệ
    if (!isValidCookie(cookie)) {
      logger(`[AUTO-COOKIE] ❌ Cookie không hợp lệ cho ${email}`, "FIREBASE");
      return null;
    }
    
    // Kiểm tra cookie có hết hạn không
    if (isCookieExpired(cookieData.lastUsed)) {
      logger(`[AUTO-COOKIE] ⚠️ Cookie đã hết hạn cho ${email}`, "FIREBASE");
      return null;
    }
    
    logger(`[AUTO-COOKIE] ✅ Cookie đã được tải thành công cho ${email}`, "FIREBASE");
    return cookie;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi tải cookie: ${error.message}`, "FIREBASE");
    return null;
  }
};

// Hàm chính: Lấy hoặc tạo cookie tự động
const getOrCreateCookie = async (email = firebaseConfig.defaultEmail) => {
  try {
    logger(`[AUTO-COOKIE] 🚀 Bắt đầu quy trình lấy/tạo cookie cho ${email}`, "FIREBASE");
    
    // Bước 1: Thử lấy cookie từ Firebase
    const existingCookie = await loadCookie(email);
    if (existingCookie && isValidCookie(existingCookie)) {
      logger(`[AUTO-COOKIE] ✅ Sử dụng cookie có sẵn cho ${email}`, "FIREBASE");
      return existingCookie;
    }
    
    // Bước 2: Tạo cookie mới nếu không có hoặc không hợp lệ
    logger(`[AUTO-COOKIE] 🔄 Cookie không khả dụng, đang tạo cookie mới...`, "FIREBASE");
    const newCookie = await generateNewCookie(email);
    
    if (!newCookie || !isValidCookie(newCookie)) {
      logger(`[AUTO-COOKIE] ❌ Không thể tạo cookie mới hợp lệ`, "FIREBASE");
      return null;
    }
    
    // Bước 3: Lưu cookie mới vào Firebase
    const saveResult = await saveCookie(newCookie, email);
    if (!saveResult) {
      logger(`[AUTO-COOKIE] ⚠️ Không thể lưu cookie mới vào Firebase, nhưng vẫn sử dụng`, "FIREBASE");
    }
    
    logger(`[AUTO-COOKIE] ✅ Đã tạo và sử dụng cookie mới cho ${email}`, "FIREBASE");
    return newCookie;
    
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi trong quy trình lấy/tạo cookie: ${error.message}`, "FIREBASE");
    return null;
  }
};

// Kiểm tra trạng thái cookie
const checkCookieStatus = async (email = firebaseConfig.defaultEmail) => {
  try {
    if (!firebaseApp) {
      logger("[AUTO-COOKIE] ⚠️ Firebase chưa được khởi tạo, không thể kiểm tra trạng thái cookie", "FIREBASE");
      return { exists: false, status: 'firebase_not_initialized' };
    }
    
    const userKey = email.replace(/[^a-zA-Z0-9]/g, '_');
    const snapshot = await admin.database().ref(`cookies/${userKey}`).once('value');
    
    if (!snapshot.exists()) {
      return { exists: false, status: 'not_found' };
    }
    
    const cookieData = snapshot.val();
    return {
      exists: true,
      status: cookieData.status,
      lastUsed: cookieData.lastUsed,
      updatedAt: cookieData.updatedAt
    };
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi kiểm tra trạng thái cookie: ${error.message}`, "FIREBASE");
    return { exists: false, status: 'error' };
  }
};

// Cập nhật trạng thái cookie
const updateCookieStatus = async (status, email = firebaseConfig.defaultEmail) => {
  try {
    if (!firebaseApp) {
      logger("[AUTO-COOKIE] ⚠️ Firebase chưa được khởi tạo, không thể cập nhật trạng thái cookie", "FIREBASE");
      return false;
    }
    
    const userKey = email.replace(/[^a-zA-Z0-9]/g, '_');
    await admin.database().ref(`cookies/${userKey}`).update({
      status: status,
      lastUsed: Date.now(),
      updatedAt: new Date().toISOString()
    });
    
    logger(`[AUTO-COOKIE] ✅ Trạng thái cookie đã được cập nhật: ${status}`, "FIREBASE");
    return true;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi cập nhật trạng thái cookie: ${error.message}`, "FIREBASE");
    return false;
  }
};

// Xóa cookie
const deleteCookie = async (email = firebaseConfig.defaultEmail) => {
  try {
    if (!firebaseApp) {
      logger("[AUTO-COOKIE] ⚠️ Firebase chưa được khởi tạo, không thể xóa cookie", "FIREBASE");
      return false;
    }
    
    const userKey = email.replace(/[^a-zA-Z0-9]/g, '_');
    await admin.database().ref(`cookies/${userKey}`).remove();
    
    logger(`[AUTO-COOKIE] ✅ Cookie đã được xóa cho ${email}`, "FIREBASE");
    return true;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi xóa cookie: ${error.message}`, "FIREBASE");
    return false;
  }
};

// Lấy danh sách tất cả cookie
const getAllCookies = async () => {
  try {
    if (!firebaseApp) {
      logger("[AUTO-COOKIE] ⚠️ Firebase chưa được khởi tạo, không thể lấy danh sách cookie", "FIREBASE");
      return [];
    }
    
    const snapshot = await admin.database().ref('cookies').once('value');
    const cookies = [];
    
    snapshot.forEach((childSnapshot) => {
      const data = childSnapshot.val();
      cookies.push({
        key: childSnapshot.key,
        email: data.email,
        status: data.status,
        lastUsed: data.lastUsed,
        updatedAt: data.updatedAt
      });
    });
    
    return cookies;
  } catch (error) {
    logger(`[AUTO-COOKIE] ❌ Lỗi lấy danh sách cookie: ${error.message}`, "FIREBASE");
    return [];
  }
};

module.exports = {
  saveCookie,
  loadCookie,
  checkCookieStatus,
  updateCookieStatus,
  deleteCookie,
  getAllCookies,
  getOrCreateCookie,
  isValidCookie,
  isCookieExpired,
  generateNewCookie,
  encrypt,
  decrypt
}; 