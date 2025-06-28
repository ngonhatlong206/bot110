const { loadCookie, saveCookie, updateCookieStatus } = require('../lib/firebaseManager');
const fs = require('fs-extra');
const axios = require('axios');
const logger = require('./log.js');
const path = require('path');

class CookieMonitor {
  constructor() {
    this.isMonitoring = false;
    this.checkInterval = 5 * 60 * 1000; // 5 phút
    this.retryAttempts = 3;
    this.currentAttempt = 0;
    this.email = process.env.FB_EMAIL || 'ngonhatlongffff@gmail.com';
    this.password = process.env.FB_PASSWORD || 'Nhatlong_10102006';
  }

  // Kiểm tra sức khỏe cookie
  async checkCookieHealth(cookie) {
    try {
      const cookieString = cookie.map(c => `${c.key}=${c.value}`).join('; ');
      
      const response = await axios.get('https://graph.facebook.com/me?fields=name,id', {
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1'
        },
        timeout: 10000
      });

      if (response.data && response.data.name && response.data.id) {
        logger(`✅ Cookie hoạt động tốt - User: ${response.data.name}`, "COOKIE_MONITOR");
        return { healthy: true, user: response.data };
      } else {
        logger(`⚠️ Cookie không hợp lệ - Response: ${JSON.stringify(response.data)}`, "COOKIE_MONITOR");
        return { healthy: false, reason: 'invalid_response' };
      }
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401 || status === 403) {
          logger(`❌ Cookie đã hết hạn hoặc bị chặn (${status})`, "COOKIE_MONITOR");
          return { healthy: false, reason: 'expired_or_blocked' };
        } else if (status === 400) {
          logger(`⚠️ Cookie có vấn đề (${status}) - ${JSON.stringify(data)}`, "COOKIE_MONITOR");
          return { healthy: false, reason: 'bad_request' };
        }
      }
      
      logger(`❌ Lỗi kiểm tra cookie: ${error.message}`, "COOKIE_MONITOR");
      return { healthy: false, reason: 'network_error' };
    }
  }

  // Tạo cookie mới từ API
  async generateNewCookie() {
    try {
      logger(`🔄 Đang tạo cookie mới cho ${this.email}...`, "COOKIE_MONITOR");
      
      const otpkey = process.env.FB_OTPKEY || "";
      const url = `https://api-j7hu.onrender.com/fblogin?user=${this.email}&pass=${this.password}&twofactor=${otpkey}`;
      
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data.status === true && response.data.data?.session_cookies) {
        const sessionCookies = response.data.data.session_cookies;
        const appState = sessionCookies.map(cookie => ({
          key: cookie.key,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: true,
          httpOnly: true
        }));

        // Lưu cookie mới lên Firebase
        await saveCookie(appState, this.email);
        
        // Ghi ra file appstate.json
        const appstatePath = path.join(process.cwd(), 'appstate.json');
        await fs.writeJson(appstatePath, appState, { spaces: 2 });
        
        logger(`✅ Cookie mới đã được tạo và lưu thành công`, "COOKIE_MONITOR");
        return appState;
      } else {
        throw new Error('API không trả về session_cookies hợp lệ');
      }
    } catch (error) {
      logger(`❌ Lỗi tạo cookie mới: ${error.message}`, "COOKIE_MONITOR");
      return null;
    }
  }

  // Thay thế cookie
  async replaceCookie() {
    try {
      this.currentAttempt++;
      logger(`🔄 Lần thử ${this.currentAttempt}/${this.retryAttempts} - Đang thay thế cookie...`, "COOKIE_MONITOR");
      
      // Cập nhật trạng thái cookie hiện tại
      await updateCookieStatus('replacing', this.email);
      
      // Tạo cookie mới
      const newCookie = await this.generateNewCookie();
      
      if (newCookie) {
        // Kiểm tra cookie mới
        const healthCheck = await this.checkCookieHealth(newCookie);
        
        if (healthCheck.healthy) {
          await updateCookieStatus('active', this.email);
          logger(`✅ Cookie đã được thay thế thành công`, "COOKIE_MONITOR");
          this.currentAttempt = 0;
          
          // Emit event để restart bot
          if (typeof process.emit === 'function') {
            process.emit('cookie_replaced', newCookie);
          }
          
          return newCookie;
        } else {
          logger(`❌ Cookie mới không hoạt động: ${healthCheck.reason}`, "COOKIE_MONITOR");
          await updateCookieStatus('failed', this.email);
        }
      }
      
      // Thử lại nếu chưa đạt giới hạn
      if (this.currentAttempt < this.retryAttempts) {
        logger(`⏳ Chờ 30 giây trước khi thử lại...`, "COOKIE_MONITOR");
        await new Promise(resolve => setTimeout(resolve, 30000));
        return await this.replaceCookie();
      } else {
        logger(`❌ Đã thử ${this.retryAttempts} lần nhưng không thành công`, "COOKIE_MONITOR");
        await updateCookieStatus('failed', this.email);
        return null;
      }
    } catch (error) {
      logger(`❌ Lỗi thay thế cookie: ${error.message}`, "COOKIE_MONITOR");
      return null;
    }
  }

  // Kiểm tra và sửa chữa cookie
  async checkAndFixCookie() {
    try {
      // Đọc cookie hiện tại từ file
      const appstatePath = path.join(process.cwd(), 'appstate.json');
      let currentCookie;
      
      try {
        currentCookie = await fs.readJson(appstatePath);
      } catch (error) {
        logger(`⚠️ Không thể đọc file appstate.json: ${error.message}`, "COOKIE_MONITOR");
        currentCookie = null;
      }
      
      if (!currentCookie || currentCookie.length === 0) {
        logger(`⚠️ Không tìm thấy cookie trong file, đang tải từ Firebase...`, "COOKIE_MONITOR");
        currentCookie = await loadCookie(this.email);
      }
      
      if (!currentCookie) {
        logger(`❌ Không tìm thấy cookie nào, đang tạo mới...`, "COOKIE_MONITOR");
        return await this.replaceCookie();
      }
      
      // Kiểm tra sức khỏe cookie
      const healthCheck = await this.checkCookieHealth(currentCookie);
      
      if (healthCheck.healthy) {
        logger(`✅ Cookie hoạt động bình thường`, "COOKIE_MONITOR");
        await updateCookieStatus('active', this.email);
        return currentCookie;
      } else {
        logger(`⚠️ Cookie có vấn đề: ${healthCheck.reason}`, "COOKIE_MONITOR");
        return await this.replaceCookie();
      }
    } catch (error) {
      logger(`❌ Lỗi kiểm tra cookie: ${error.message}`, "COOKIE_MONITOR");
      return null;
    }
  }

  // Bắt đầu giám sát
  startMonitoring() {
    if (this.isMonitoring) {
      logger(`⚠️ Cookie monitor đã đang chạy`, "COOKIE_MONITOR");
      return;
    }
    
    this.isMonitoring = true;
    logger(`🚀 Bắt đầu giám sát cookie (kiểm tra mỗi ${this.checkInterval / 60000} phút)`, "COOKIE_MONITOR");
    
    // Kiểm tra ngay lập tức
    this.checkAndFixCookie();
    
    // Thiết lập interval
    this.monitorInterval = setInterval(async () => {
      if (this.isMonitoring) {
        await this.checkAndFixCookie();
      }
    }, this.checkInterval);
  }

  // Dừng giám sát
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    logger(`⏹️ Đã dừng giám sát cookie`, "COOKIE_MONITOR");
  }

  // Kiểm tra trạng thái giám sát
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      currentAttempt: this.currentAttempt,
      maxAttempts: this.retryAttempts,
      checkInterval: this.checkInterval,
      email: this.email
    };
  }
}

// Tạo instance singleton
const cookieMonitor = new CookieMonitor();

// Export instance và class
module.exports = cookieMonitor;
module.exports.CookieMonitor = CookieMonitor; 