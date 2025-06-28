const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const { join, resolve } = require("path");
const chalk = require('chalk');
const figlet = require("figlet");
const moment = require("moment-timezone");
const os = require("os");
const { execSync } = require("child_process");
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;
const connect = require("./utils/ConnectApi.js");

// Import Firebase Manager và Logger
const { getOrCreateCookie, updateCookieStatus } = require('./lib/firebaseManager');
const firebaseLogger = require('./lib/firebaseLogger');
const firebaseConfig = require('./firebase-config.js');

// Load environment variables
require('dotenv').config();

global.utils = require("./utils");
global.nodemodule = new Object();
global.config = new Object();
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();

// Load config
var configValue;
try {
  global.config = JSON.parse(readFileSync('./config.json', 'utf8'));
} catch (e) {
  global.config = {};
}

global.client = new Object();
global.client.mainPath = __dirname;
global.client.configPath = join(global.client.mainPath, 'config.json');
global.client.timeStart = Date.now();

const { Sequelize, sequelize } = require("./includes/database");
writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

// Load language
const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
  const getSeparator = item.indexOf('=');
  const itemKey = item.slice(0, getSeparator).trim();
  const itemValue = item.slice(getSeparator + 1, item.length).trim();
  const language = { [itemKey]: itemValue };
  global.language = { ...global.language, ...language };
}

global.getText = (...args) => {
  const langText = global.language[args[0]];
  if (!langText) return args.join(' ');
  if (args.length > 1) {
    args.shift();
    return args.reduce((str, item) => str.replace(/%s/, item), langText);
  } else return langText;
};

// Update login info from config or environment variables
if (!global.config.LOGIN.EMAIL) {
  global.config.LOGIN.EMAIL = process.env.FB_EMAIL || firebaseConfig.defaultEmail;
}
if (!global.config.LOGIN.PASSWORD) {
  global.config.LOGIN.PASSWORD = process.env.FB_PASSWORD || firebaseConfig.defaultPassword;
}
if (!global.config.LOGIN.OTPKEY) {
  global.config.LOGIN.OTPKEY = process.env.FB_OTPKEY || '';
}

// Get IP Addresses
const networkInterfaces = os.networkInterfaces();
const ipAddresses = [];
for (const key in networkInterfaces) {
  const interfaces = networkInterfaces[key];
  for (const iface of interfaces) {
    if (!iface.internal && iface.family === 'IPv4') {
      ipAddresses.push(iface.address);
    }
  }
}

// Auto Cookie Manager với Firebase Logger
class AutoCookieManager {
  constructor() {
    this.currentEmail = global.config.LOGIN.EMAIL;
    this.maxRetries = 3;
    this.retryDelay = 30000; // 30 giây
  }

  // Hàm chính: Lấy cookie tự động với retry
  async getCookieWithRetry(retryCount = 0) {
    try {
      await firebaseLogger.logCookie('RETRY_ATTEMPT', this.currentEmail, 'started', { retryCount: retryCount + 1 });
      
      // Sử dụng hàm tự động từ Firebase Manager
      const cookie = await getOrCreateCookie(this.currentEmail);
      
      if (cookie && cookie.length > 0) {
        await firebaseLogger.logCookie('SUCCESS', this.currentEmail, 'cookie_obtained', { 
          cookieLength: cookie.length,
          retryCount: retryCount + 1 
        });
        return cookie;
      }
      
      // Nếu không lấy được cookie, thử lại
      if (retryCount < this.maxRetries - 1) {
        await firebaseLogger.logCookie('RETRY', this.currentEmail, 'cookie_failed', { 
          retryCount: retryCount + 1,
          nextRetryIn: this.retryDelay/1000 
        });
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.getCookieWithRetry(retryCount + 1);
      }
      
      await firebaseLogger.logCookie('FAILED', this.currentEmail, 'max_retries_exceeded', { 
        maxRetries: this.maxRetries 
      });
      return null;
      
    } catch (error) {
      await firebaseLogger.logCookie('ERROR', this.currentEmail, 'exception', { 
        error: error.message,
        retryCount: retryCount + 1 
      });
      
      if (retryCount < this.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.getCookieWithRetry(retryCount + 1);
      }
      
      return null;
    }
  }

  // Cập nhật trạng thái cookie
  async updateCookieStatus(status) {
    try {
      await updateCookieStatus(status, this.currentEmail);
      await firebaseLogger.logCookie('STATUS_UPDATE', this.currentEmail, status);
    } catch (error) {
      await firebaseLogger.logCookie('ERROR', this.currentEmail, 'status_update_failed', { error: error.message });
    }
  }
}

function onBot({ models: botModel }) {
  console.log(chalk.green(figlet.textSync('AUTO COOKIE BOT', { horizontalLayout: 'full' })));
  
  // Khởi tạo Auto Cookie Manager
  const autoCookieManager = new AutoCookieManager();
  
  // Log bot startup
  firebaseLogger.logBotStatus('STARTING', {
    email: global.config.LOGIN.EMAIL,
    ipAddresses: ipAddresses,
    nodeVersion: process.version,
    platform: process.platform
  });
  
  // Display login info
  console.log(chalk.green(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`));
  logger("Lương Trường Khôi (@LunarKrystal)", "CREDIT");
  logger("🔥 BOT TỰ ĐỘNG THAY COOKIE + FIREBASE LOGGING", "LOGIN");
  logger(`Email: ${global.config.LOGIN.EMAIL}`, "LOGIN");
  logger(`Password: ${global.config.LOGIN.PASSWORD.replace(/./g, '*')}`, "LOGIN");
  logger(`Địa chỉ IP: ${ipAddresses.join(', ')}`, "LOGIN");
  logger(`Bot ID: ${process.env.BOT_ID || 'main-bot'}`, "LOGIN");
  console.log(chalk.green(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`));

  // Hàm login với cookie tự động
  async function attemptLoginWithAutoCookie(retryCount = 0) {
    try {
      await firebaseLogger.logLogin('ATTEMPT', global.config.LOGIN.EMAIL, 'started', { retryCount: retryCount + 1 });
      
      // Bước 1: Lấy cookie tự động
      const cookie = await autoCookieManager.getCookieWithRetry();
      
      let loginData = {};
      
      if (cookie && cookie.length > 0) {
        // Sử dụng cookie từ Firebase
        loginData['appState'] = cookie;
        await firebaseLogger.logLogin('COOKIE_LOGIN', global.config.LOGIN.EMAIL, 'using_cookie', { cookieLength: cookie.length });
      } else {
        // Fallback: login bằng email/password
        loginData['email'] = global.config.LOGIN.EMAIL;
        loginData['password'] = global.config.LOGIN.PASSWORD;
        if (global.config.LOGIN.OTPKEY) {
          loginData['otpkey'] = global.config.LOGIN.OTPKEY;
        }
        await firebaseLogger.logLogin('PASSWORD_LOGIN', global.config.LOGIN.EMAIL, 'using_password');
      }

      // Bước 2: Thực hiện login
      login(loginData, async (loginError, loginApiData) => {
        if (loginError) {
          await firebaseLogger.logLogin('FAILED', global.config.LOGIN.EMAIL, 'login_error', { 
            error: JSON.stringify(loginError),
            retryCount: retryCount + 1 
          });
          
          // Cập nhật trạng thái cookie thành expired nếu có lỗi
          if (cookie) {
            await autoCookieManager.updateCookieStatus('expired');
          }
          
          if (retryCount < autoCookieManager.maxRetries - 1) {
            await firebaseLogger.logLogin('RETRY', global.config.LOGIN.EMAIL, 'scheduling_retry', { 
              retryCount: retryCount + 1,
              nextRetryIn: autoCookieManager.retryDelay/1000 
            });
            setTimeout(() => attemptLoginWithAutoCookie(retryCount + 1), autoCookieManager.retryDelay);
            return;
          } else {
            await firebaseLogger.logLogin('FATAL', global.config.LOGIN.EMAIL, 'max_retries_exceeded', { maxRetries: autoCookieManager.maxRetries });
            setTimeout(() => process.exit(1), 5000);
            return;
          }
        }

        // Login thành công
        await firebaseLogger.logLogin('SUCCESS', global.config.LOGIN.EMAIL, 'login_successful');
        await firebaseLogger.logBotStatus('ONLINE', { loginMethod: cookie ? 'cookie' : 'password' });
        
        // Cập nhật trạng thái cookie thành active
        await autoCookieManager.updateCookieStatus('active');
        
        // Lưu cookie mới nếu có
        if (loginApiData && loginApiData.getAppState) {
          const newCookie = loginApiData.getAppState();
          if (newCookie && newCookie.length > 0) {
            writeFileSync(join(__dirname, 'appstate.json'), JSON.stringify(newCookie, null, '\x09'));
            await firebaseLogger.logCookie('SAVE_LOCAL', global.config.LOGIN.EMAIL, 'cookie_saved', { cookieLength: newCookie.length });
          }
        }

        // Tiếp tục khởi tạo bot
        loginApiData.setOptions(global.config.FCAOption);
        
        global.client.api = loginApiData;
        global.client.handleListen = loginApiData.listenMqtt((error, event) => {
          if (error) {
            if (JSON.stringify(error).includes('Not logged in.')) {
              firebaseLogger.logBotStatus('OFFLINE', { reason: 'cookie_expired' });
              process.exit(1);
            }
            firebaseLogger.error(`MQTT Error: ${JSON.stringify(error)}`, 'MQTT_LISTENER');
            return logger(global.getText("mirai", "handleListenError", JSON.stringify(error)), "error");
          }
          if (["presence", "typ", "read_receipt"].some((data) => data === event?.type)) return;
          
          // Log command usage nếu có
          if (event && event.type === 'message' && event.body) {
            const command = event.body.split(' ')[0];
            if (command.startsWith(global.config.PREFIX || '!')) {
              firebaseLogger.logCommand(command, event.senderID, event.threadID, {
                messageBody: event.body,
                timestamp: event.timestamp
              });
            }
          }
          
          global.handleEvent.handleListen(loginApiData, event);
        });

        global.client.timeStart = new Date().getTime();

        // Load commands
        (function () {
          const listCommand = readdirSync(global.client.mainPath + '/modules/commands').filter(command => command.endsWith('.js') && !command.includes('example') && !global.config.commandDisabled.includes(command));
          for (const command of listCommand) {
            try {
              var module = require(global.client.mainPath + '/modules/commands/' + command);
              if (!module.config || !module.run || !module.config.commandCategory) continue;
              if (global.client.commands.has(module.config.name || '')) continue;
              global.client.commands.set(module.config.name, module);
            } catch (error) {
              // Ignore errors
            }
          }
        })();
        
        // Load events
        (function() {
          const events = readdirSync(global.client.mainPath + '/modules/events').filter(event => event.endsWith('.js') && !global.config.eventDisabled.includes(event));
          for (const ev of events) {
            try {
              var event = require(global.client.mainPath + '/modules/events/' + ev);
              if (!event.config || !event.run) continue;
              if (global.client.events.has(event.config.name)) continue;
              global.client.events.set(event.config.name, event);
            } catch (error) {
              // Ignore errors
            }
          }
        })();

        logger.loader(global.getText('mirai', 'finishLoadModule', global.client.commands.size, global.client.events.size));
        logger.loader(`🔥 Thời gian khởi động: ${((Date.now() - global.client.timeStart) / 1000).toFixed()}s`);
        logger.loader(`🔥 BOT TỰ ĐỘNG THAY COOKIE + FIREBASE LOGGING ĐÃ SẴN SÀNG!`);
        
        await firebaseLogger.logBotStatus('READY', {
          commandsLoaded: global.client.commands.size,
          eventsLoaded: global.client.events.size,
          startupTime: ((Date.now() - global.client.timeStart) / 1000).toFixed()
        });
        
        writeFileSync(global.client.configPath, JSON.stringify(global.config, null, 4), 'utf8');
        unlinkSync(global.client.configPath + '.temp');
        
        const listenerData = {};
        listenerData.api = loginApiData;
        listenerData.models = botModel;
        global.handleEvent.handleListen(listenerData);
      });

    } catch (error) {
      await firebaseLogger.logLogin('EXCEPTION', global.config.LOGIN.EMAIL, 'login_exception', { error: error.message });
      if (retryCount < autoCookieManager.maxRetries - 1) {
        setTimeout(() => attemptLoginWithAutoCookie(retryCount + 1), autoCookieManager.retryDelay);
      } else {
        setTimeout(() => process.exit(1), 5000);
      }
    }
  }

  // Bắt đầu quá trình login tự động
  attemptLoginWithAutoCookie();
}

// Connect to Database
(async() => {
  try {
    await sequelize.authenticate();
    logger("[ DATABASE ]  : Dữ liệu KRYSTAL BOT đã được kết nối thành công!!", "DATABASE");
    await firebaseLogger.logBotStatus('DATABASE_CONNECTED');
    const models = require("./includes/database/model.js");
    onBot({ models });
  } catch (error) {
    logger(`❌ Lỗi kết nối database: ${error.message}`, "DATABASE");
    await firebaseLogger.logBotStatus('DATABASE_ERROR', { error: error.message });
    process.exit(1);
  }
})(); 