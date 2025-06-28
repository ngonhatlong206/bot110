const admin = require('firebase-admin');
const firebaseConfig = require('../firebase-config.js');

// Khởi tạo Firebase Admin SDK (nếu chưa có)
let firebaseApp;
try {
  if (!admin.apps.length) {
    const serviceAccount = {
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
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: firebaseConfig.databaseURL
    });
  } else {
    firebaseApp = admin.app();
  }
} catch (error) {
  console.error('❌ Lỗi khởi tạo Firebase Logger:', error.message);
  firebaseApp = null;
}

class FirebaseLogger {
  constructor() {
    this.db = firebaseApp ? admin.database() : null;
    this.botId = process.env.BOT_ID || 'main-bot';
    this.maxLogs = 1000; // Giới hạn số log lưu trữ
  }

  // Lưu log vào Firebase
  async log(level, message, category = 'GENERAL', data = {}) {
    try {
      if (!this.db) {
        console.log(`[${level}] ${message}`);
        return false;
      }

      const logEntry = {
        level: level,
        message: message,
        category: category,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        botId: this.botId,
        data: data
      };

      // Lưu vào logs collection
      const logRef = this.db.ref('logs').push();
      await logRef.set(logEntry);

      // Lưu vào logs_by_category để dễ query
      await this.db.ref(`logs_by_category/${category}/${logRef.key}`).set(logEntry);

      // Lưu vào logs_by_bot để theo dõi từng bot
      await this.db.ref(`logs_by_bot/${this.botId}/${logRef.key}`).set(logEntry);

      // Giới hạn số log để tránh quá tải
      await this.cleanupOldLogs();

      return true;
    } catch (error) {
      console.error('❌ Lỗi lưu log vào Firebase:', error.message);
      return false;
    }
  }

  // Lưu log thông thường
  async info(message, category = 'GENERAL', data = {}) {
    return this.log('INFO', message, category, data);
  }

  // Lưu log cảnh báo
  async warn(message, category = 'GENERAL', data = {}) {
    return this.log('WARN', message, category, data);
  }

  // Lưu log lỗi
  async error(message, category = 'GENERAL', data = {}) {
    return this.log('ERROR', message, category, data);
  }

  // Lưu log thành công
  async success(message, category = 'GENERAL', data = {}) {
    return this.log('SUCCESS', message, category, data);
  }

  // Lưu log cookie
  async logCookie(action, email, status, data = {}) {
    return this.log('COOKIE', `${action} - ${email}`, 'COOKIE_MANAGEMENT', {
      action: action,
      email: email,
      status: status,
      ...data
    });
  }

  // Lưu log login
  async logLogin(action, email, status, data = {}) {
    return this.log('LOGIN', `${action} - ${email}`, 'LOGIN_PROCESS', {
      action: action,
      email: email,
      status: status,
      ...data
    });
  }

  // Lưu log bot status
  async logBotStatus(status, data = {}) {
    return this.log('BOT_STATUS', `Bot ${status}`, 'BOT_MONITORING', {
      status: status,
      ...data
    });
  }

  // Lưu log command
  async logCommand(command, user, thread, data = {}) {
    return this.log('COMMAND', `${command} by ${user} in ${thread}`, 'COMMAND_USAGE', {
      command: command,
      user: user,
      thread: thread,
      ...data
    });
  }

  // Dọn dẹp log cũ
  async cleanupOldLogs() {
    try {
      if (!this.db) return;

      // Xóa log cũ hơn 7 ngày
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const snapshot = await this.db.ref('logs')
        .orderByChild('timestamp')
        .endAt(sevenDaysAgo)
        .once('value');

      const oldLogs = [];
      snapshot.forEach((childSnapshot) => {
        oldLogs.push(childSnapshot.key);
      });

      // Xóa từng log cũ
      for (const logKey of oldLogs) {
        await this.db.ref(`logs/${logKey}`).remove();
        await this.db.ref(`logs_by_category/GENERAL/${logKey}`).remove();
        await this.db.ref(`logs_by_bot/${this.botId}/${logKey}`).remove();
      }

      if (oldLogs.length > 0) {
        console.log(`🧹 Đã dọn dẹp ${oldLogs.length} log cũ`);
      }
    } catch (error) {
      console.error('❌ Lỗi dọn dẹp log:', error.message);
    }
  }

  // Lấy log theo category
  async getLogsByCategory(category, limit = 100) {
    try {
      if (!this.db) return [];

      const snapshot = await this.db.ref(`logs_by_category/${category}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');

      const logs = [];
      snapshot.forEach((childSnapshot) => {
        logs.push(childSnapshot.val());
      });

      return logs.reverse();
    } catch (error) {
      console.error('❌ Lỗi lấy log:', error.message);
      return [];
    }
  }

  // Lấy log theo bot
  async getLogsByBot(botId = null, limit = 100) {
    try {
      if (!this.db) return [];

      const targetBotId = botId || this.botId;
      const snapshot = await this.db.ref(`logs_by_bot/${targetBotId}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');

      const logs = [];
      snapshot.forEach((childSnapshot) => {
        logs.push(childSnapshot.val());
      });

      return logs.reverse();
    } catch (error) {
      console.error('❌ Lỗi lấy log:', error.message);
      return [];
    }
  }

  // Lấy thống kê log
  async getLogStats() {
    try {
      if (!this.db) return {};

      const snapshot = await this.db.ref('logs').once('value');
      const logs = [];
      snapshot.forEach((childSnapshot) => {
        logs.push(childSnapshot.val());
      });

      const stats = {
        total: logs.length,
        byLevel: {},
        byCategory: {},
        byBot: {},
        recent: logs.slice(-10) // 10 log gần nhất
      };

      logs.forEach(log => {
        // Thống kê theo level
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        
        // Thống kê theo category
        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
        
        // Thống kê theo bot
        stats.byBot[log.botId] = (stats.byBot[log.botId] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Lỗi lấy thống kê log:', error.message);
      return {};
    }
  }
}

// Tạo instance global
const firebaseLogger = new FirebaseLogger();

module.exports = firebaseLogger; 