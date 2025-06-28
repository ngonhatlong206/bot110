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

// Import Firebase Logger (không cần auto cookie)
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

function onBot({ models: botModel }) {
  console.log(chalk.green(figlet.textSync('KRYSTAL BOT', { horizontalLayout: 'full' })));

  // Log bot startup
  firebaseLogger.logBotStatus('STARTING', {
    email: global.config.LOGIN.EMAIL,
    nodeVersion: process.version,
    platform: process.platform
  });

  // Display login info
  console.log(chalk.green(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`));
  logger("Lương Trường Khôi (@LunarKrystal)", "CREDIT");
  logger("🔥 BOT ĐỌC APPSTATE THỦ CÔNG", "LOGIN");
  logger(`Email: ${global.config.LOGIN.EMAIL}`, "LOGIN");
  logger(`Bot ID: ${process.env.BOT_ID || 'main-bot'}`, "LOGIN");
  console.log(chalk.green(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`));

  // Hàm login chỉ dùng appstate từ file
  function loginWithAppState() {
    let appState = null;
    try {
      const appStatePath = join(__dirname, 'appstate.json');
      if (!existsSync(appStatePath)) {
        logger("Không tìm thấy file appstate.json! Hãy upload cookie Facebook vào appstate.json.", "ERROR");
        process.exit(1);
      }
      appState = JSON.parse(readFileSync(appStatePath, 'utf8'));
      if (!Array.isArray(appState) || appState.length === 0) {
        logger("File appstate.json không hợp lệ!", "ERROR");
        process.exit(1);
      }
    } catch (err) {
      logger(`Lỗi đọc appstate.json: ${err.message}`, "ERROR");
      process.exit(1);
    }

    // Thực hiện login
    login({ appState }, async (loginError, loginApiData) => {
      if (loginError) {
        logger(`Đăng nhập thất bại: ${JSON.stringify(loginError)}`, "ERROR");
        process.exit(1);
      }
      // Login thành công
      firebaseLogger.logLogin('SUCCESS', global.config.LOGIN.EMAIL, 'login_successful');
      firebaseLogger.logBotStatus('ONLINE', { loginMethod: 'appstate' });
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
      logger.loader(`🔥 BOT ĐÃ SẴN SÀNG!`);
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
  }
  // Bắt đầu login
  loginWithAppState();
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