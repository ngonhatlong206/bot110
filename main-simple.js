const moment = require("moment-timezone");
const { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } = require("fs-extra");
const { join, resolve } = require("path");
const chalk = require('chalk');
const figlet = require('figlet');
const { execSync } = require('child_process');
const logger = require("./utils/log.js");
const os = require('os');
const login = require("./includes/login");
const axios = require("axios");
const listPackage = JSON.parse(readFileSync('./package.json')).dependencies;
const listbuiltinModules = require("module").builtinModules;
const connect = require("./utils/ConnectApi.js");

// Load environment variables
require('dotenv').config();

global.client = new Object({
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: new Array(),
    handleSchedule: new Array(),
    handleReaction: new Array(),
    handleReply: new Array(),
    mainPath: process.cwd(),
    configPath: new String(),
    getTime: function (option) {
        switch (option) {
            case "seconds":
                return `${moment.tz("Asia/Ho_Chi_minh").format("ss")}`;
            case "minutes":
                return `${moment.tz("Asia/Ho_Chi_minh").format("mm")}`;
            case "hours":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH")}`;
            case "date":
                return `${moment.tz("Asia/Ho_Chi_minh").format("DD")}`;
            case "month":
                return `${moment.tz("Asia/Ho_Chi_minh").format("MM")}`;
            case "year":
                return `${moment.tz("Asia/Ho_Chi_minh").format("YYYY")}`;
            case "fullHour":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss")}`;
            case "fullYear":
                return `${moment.tz("Asia/Ho_Chi_minh").format("DD/MM/YYYY")}`;
            case "fullTime":
                return `${moment.tz("Asia/Ho_Chi_minh").format("HH:mm:ss DD/MM/YYYY")}`;
        }
    }
});

global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    threadAllowNSFW: new Array(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array()
});

global.utils = require("./utils");
global.nodemodule = new Object();
global.config = new Object();
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();

// Load config
var configValue;
try {
    global.client.configPath = join(global.client.mainPath, "config.json");
    configValue = require(global.client.configPath);
}
catch {
    if (existsSync(global.client.configPath.replace(/\.json/g,"") + ".temp")) {
        configValue = readFileSync(global.client.configPath.replace(/\.json/g,"") + ".temp");
        configValue = JSON.parse(configValue);
        logger.loader(`Found: ${global.client.configPath.replace(/\.json/g,"") + ".temp"}`);
    }
}

try {
    for (const key in configValue) global.config[key] = configValue[key];
    connect.send()
}
catch { return logger.loader("Can't load file config!", "error") }

const { Sequelize, sequelize } = require("./includes/database");
writeFileSync(global.client.configPath + ".temp", JSON.stringify(global.config, null, 4), 'utf8');

// Load language
const langFile = (readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: 'utf-8' })).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
    const getSeparator = item.indexOf('=');
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head = itemKey.slice(0, itemKey.indexOf('.'));
    const key = itemKey.replace(head + '.', '');
    const value = itemValue.replace(/\\n/gi, '\n');
    if (typeof global.language[head] == "undefined") global.language[head] = new Object();
    global.language[head][key] = value;
}

global.getText = function (...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0])) throw `${__filename} - Không tìm thấy ngôn ngữ chính: ${args[0]}`;
    var text = langText[args[0]][args[1]];
    for (var i = args.length - 1; i > 0; i--) {
        const regEx = RegExp(`%${i}`, 'g');
        text = text.replace(regEx, args[i + 1]);
    }
    return text;
}

// Update login info from config or environment variables
if (!global.config.LOGIN.EMAIL) {
    global.config.LOGIN.EMAIL = process.env.FB_EMAIL || 'ngonhatlongffff@gmail.com';
}
if (!global.config.LOGIN.PASSWORD) {
    global.config.LOGIN.PASSWORD = process.env.FB_PASSWORD || 'Nhatlong_10102006';
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
    console.log(chalk.green(figlet.textSync('LOGIN', { horizontalLayout: 'full' })));
    
    // Try to load appstate from file first
    let appState = null;
    try {
        const appStateFile = resolve(join(global.client.mainPath, global.config.APPSTATEPATH || "appstate.json"));
        appState = require(appStateFile);
        logger("✅ Đã tải appstate từ file local", "LOGIN");
    } catch (fileError) {
        logger("⚠️ Không thể tải appstate từ file local", "LOGIN");
        appState = null;
    }

    // Display login info
    console.log(chalk.green(`┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓`));
    logger("Lương Trường Khôi (@LunarKrystal)", "CREDIT");
    logger("Tiến hành đăng nhập tại:", "LOGIN");
    logger(`Email: ${global.config.LOGIN.EMAIL}`, "LOGIN");
    logger(`Password: ${global.config.LOGIN.PASSWORD.replace(/./g, '*')}`, "LOGIN");
    logger(`Địa chỉ IP: ${ipAddresses.join(', ')}`, "LOGIN");
    console.log(chalk.green(`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`));

    const loginData = {};
    
    // If we have appState, use it
    if (appState && appState.length > 0) {
        loginData['appState'] = appState;
        logger("✅ Sử dụng appState có sẵn", "LOGIN");
    } else {
        // If no appState, login directly with email/password
        loginData['email'] = global.config.LOGIN.EMAIL;
        loginData['password'] = global.config.LOGIN.PASSWORD;
        if (global.config.LOGIN.OTPKEY) {
            loginData['otpkey'] = global.config.LOGIN.OTPKEY;
        }
        logger("🔄 Login trực tiếp với email/password", "LOGIN");
    }
    
    login(loginData, (loginError, loginApiData) => {
        const clearFacebookWarning = (api, callback) => {
            const form = {
                av: api.getCurrentUserID(),
                fb_api_caller_class: "RelayModern",
                fb_api_req_friendly_name: "FBScrapingWarningMutation",
                variables: "{}",
                server_timestamps: "true",
                doc_id: "6339492849481770",
            };

            api.httpPost("https://www.facebook.com/api/graphql/", form, (error, res) => {
                if (error || res.errors) {
                    logger("Tiến hành vượt cảnh báo", "error");
                    return callback && callback(true);
                }
                if (res.data.fb_scraping_warning_clear.success) {
                    logger("Đã vượt cảnh cáo Facebook thành công.", "[ success ] >");
                    return callback && callback(true);
                }
            });
        };
        
        if (loginError) {
            logger(JSON.stringify(loginError), `ERROR`);
            logger("🔄 Login thất bại, đang thử thay cookie...", "LOGIN");
            logger("🔄 Bot sẽ restart sau 30 giây...", "LOGIN");
            setTimeout(() => process.exit(1), 30000);
            return;
        }
        
        if (LunarKrystal) {
            return clearFacebookWarning(api, () => process.exit(1));
        }
        
        loginApiData.setOptions(global.config.FCAOption);
        writeFileSync(join(__dirname, 'appstate.json'), JSON.stringify(loginApiData.getAppState(), null, '\x09'));
        global.client.api = loginApiData;
        global.config.version = '2.7.12';
        global.client.timeStart = new Date().getTime();

        // Load commands
        (function () {
            const listCommand = readdirSync(global.client.mainPath + '/modules/commands').filter(command => command.endsWith('.js') && !command.includes('example') && !global.config.commandDisabled.includes(command));
            for (const command of listCommand) {
                try {
                    var module = require(global.client.mainPath + '/modules/commands/' + command);
                    if (!module.config || !module.run || !module.config.commandCategory) throw new Error(global.getText('mirai', 'errorFormat'));
                    if (global.client.commands.has(module.config.name || '')) throw new Error(global.getText('mirai', 'nameExist'));

                    if (module.config.dependencies && typeof module.config.dependencies == 'object') {
                        for (const reqDependencies in module.config.dependencies) {
                            const reqDependenciesPath = join(__dirname, 'nodemodules', 'node_modules', reqDependencies);
                            try {
                                if (!global.nodemodule.hasOwnProperty(reqDependencies)) {
                                    if (listPackage.hasOwnProperty(reqDependencies) || listbuiltinModules.includes(reqDependencies)) global.nodemodule[reqDependencies] = require(reqDependencies);
                                    else global.nodemodule[reqDependencies] = require(reqDependenciesPath);
                                } else '';
                            } catch {
                                var check = false;
                                var isError;
                                logger.loader(global.getText('mirai', 'notFoundPackage', reqDependencies, module.config.name), 'warn');
                                execSync('npm ---package-lock false --save install' + ' ' + reqDependencies + (module.config.dependencies[reqDependencies] == '*' || module.config.dependencies[reqDependencies] == '' ? '' : '@' + module.config.dependencies[reqDependencies]), { 'stdio': 'inherit', 'env': process['env'], 'shell': true, 'cwd': join(__dirname, 'nodemodules') });
                                for (let i = 1; i <= 3; i++) {
                                    try {
                                        require['cache'] = {};
                                        if (listPackage.hasOwnProperty(reqDependencies) || listbuiltinModules.includes(reqDependencies)) global['nodemodule'][reqDependencies] = require(reqDependencies);
                                        else global['nodemodule'][reqDependencies] = require(reqDependenciesPath);
                                        check = true;
                                        break;
                                    } catch (error) { isError = error; }
                                    if (check || !isError) break;
                                }
                                if (!check || isError) throw global.getText('mirai', 'cantInstallPackage', reqDependencies, module.config.name, isError);
                            }
                        }
                    }
                    if (module.config.envConfig) try {
                        for (const envConfig in module.config.envConfig) {
                            if (typeof global.configModule[module.config.name] == 'undefined') global.configModule[module.config.name] = {};
                            if (typeof global.config[module.config.name] == 'undefined') global.config[module.config.name] = {};
                            if (typeof global.config[module.config.name][envConfig] !== 'undefined') global['configModule'][module.config.name][envConfig] = global.config[module.config.name][envConfig];
                            else global.configModule[module.config.name][envConfig] = module.config.envConfig[envConfig] || '';
                            if (typeof global.config[module.config.name][envConfig] == 'undefined') global.config[module.config.name][envConfig] = module.config.envConfig[envConfig] || '';
                        }
                    } catch (error) {
                    }
                    if (module.onLoad) {
                        try {
                            const moduleData = {};
                            moduleData.api = loginApiData;
                            moduleData.models = botModel;
                            module.onLoad(moduleData);
                        } catch (_0x20fd5f) {
                            throw new Error(global.getText('mirai', 'cantOnload', module.config.name, JSON.stringify(_0x20fd5f)), 'error');
                        };
                    }
                    if (module.handleEvent) global.client.eventRegistered.push(module.config.name);
                    global.client.commands.set(module.config.name, module);
                } catch (error) {
                };
            }
        })();
        
        // Load events
        (function() {
            const events = readdirSync(global.client.mainPath + '/modules/events').filter(event => event.endsWith('.js') && !global.config.eventDisabled.includes(event));
            for (const ev of events) {
                try {
                    var event = require(global.client.mainPath + '/modules/events/' + ev);
                    if (!event.config || !event.run) throw new Error(global.getText('mirai', 'errorFormat'));
                    if (global.client.events.has(event.config.name) || '') throw new Error(global.getText('mirai', 'nameExist'));
                    if (event.config.dependencies && typeof event.config.dependencies == 'object') {
                        for (const dependency in event.config.dependencies) {
                            const _0x21abed = join(__dirname, 'nodemodules', 'node_modules', dependency);
                            try {
                                if (!global.nodemodule.hasOwnProperty(dependency)) {
                                    if (listPackage.hasOwnProperty(dependency) || listbuiltinModules.includes(dependency)) global.nodemodule[dependency] = require(dependency);
                                    else global.nodemodule[dependency] = require(_0x21abed);
                                } else '';
                            } catch {
                                let check = false;
                                let isError;
                                logger.loader(global.getText('mirai', 'notFoundPackage', dependency, event.config.name), 'warn');
                                execSync('npm --package-lock false --save install' + dependency + (event.config.dependencies[dependency] == '*' || event.config.dependencies[dependency] == '' ? '' : '@' + event.config.dependencies[dependency]), { 'stdio': 'inherit', 'env': process['env'], 'shell': true, 'cwd': join(__dirname, 'nodemodules') });
                                for (let i = 1; i <= 3; i++) {
                                    try {
                                        require['cache'] = {};
                                        if (global.nodemodule.includes(dependency)) break;
                                        if (listPackage.hasOwnProperty(dependency) || listbuiltinModules.includes(dependency)) global.nodemodule[dependency] = require(dependency);
                                        else global.nodemodule[dependency] = require(_0x21abed);
                                        check = true;
                                        break;
                                    } catch (error) { isError = error; }
                                    if (check || !isError) break;
                                }
                                if (!check || isError) throw global.getText('mirai', 'cantInstallPackage', dependency, event.config.name);
                            }
                        }
                    }
                    if (event.config.envConfig) try {
                        for (const _0x5beea0 in event.config.envConfig) {
                            if (typeof global.configModule[event.config.name] == 'undefined') global.configModule[event.config.name] = {};
                            if (typeof global.config[event.config.name] == 'undefined') global.config[event.config.name] = {};
                            if (typeof global.config[event.config.name][_0x5beea0] !== 'undefined') global.configModule[event.config.name][_0x5beea0] = global.config[event.config.name][_0x5beea0];
                            else global.configModule[event.config.name][_0x5beea0] = event.config.envConfig[_0x5beea0] || '';
                            if (typeof global.config[event.config.name][_0x5beea0] == 'undefined') global.config[event.config.name][_0x5beea0] = event.config.envConfig[_0x5beea0] || '';
                        }
                    } catch (error) {
                    }
                    if (event.onLoad) try {
                        const eventData = {};
                        eventData.api = loginApiData, eventData.models = botModel;
                        event.onLoad(eventData);
                    } catch (error) {
                        throw new Error(global.getText('mirai', 'cantOnload', event.config.name, JSON.stringify(error)), 'error');
                    }
                    global.client.events.set(event.config.name, event);
                } catch (error) {
                }
            }
        })();
        
        logger.loader(global.getText('mirai', 'finishLoadModule', global.client.commands.size, global.client.events.size));
        logger.loader(`Thời gian khởi động: ${((Date.now() - global.client.timeStart) / 1000).toFixed()}s`);
        writeFileSync(global.client['configPath'], JSON['stringify'](global.config, null, 4), 'utf8');
        unlinkSync(global['client']['configPath'] + '.temp');
        const listenerData = {};
        listenerData.api = loginApiData;
        listenerData.models = botModel;
        const listener = require('./includes/listen')(listenerData);

        const mqttClient = loginApiData.mqttClient;

        function listenerCallback(error, event) {
            if (error) {
                if (JSON.stringify(error).includes("601051028565049")) {
                    const form = {
                        av: loginApiData.getCurrentUserID(),
                        fb_api_caller_class: "RelayModern",
                        fb_api_req_friendly_name: "FBScrapingWarningMutation",
                        variables: "{}",
                        server_timestamps: "true",
                        doc_id: "6339492849481770",
                    };
                    loginApiData.httpPost("https://www.facebook.com/api/graphql/", form, (e, i) => {
                        const res = JSON.parse(i);
                        if (e || res.errors) return logger("Lỗi không thể xóa cảnh cáo của facebook.", "error");
                        if (res.data.fb_scraping_warning_clear.success) {
                            logger("Đã vượt cảnh cáo facebook thành công.", "[ SUCCESS ] >");
                            global.handleListen = loginApiData.listenMqtt(listenerCallback);
                            setTimeout(() => (mqttClient.end(), connect_mqtt()), 1000 * 60 * 60 * 1);
                            logger(global.getText('mirai', 'successConnectMQTT'), '[ MQTT ]');
                        }
                    });
                }
                else if (JSON.stringify(error).includes('Not logged in.')) {
                    logger("🔄 Cookie hết hạn, đang restart...", "LOGIN");
                    process.exit(1); 
                }
                else {
                    return logger(global.getText("mirai", "handleListenError", JSON.stringify(error)), "error");
                }
            }
            if (["presence", "typ", "read_receipt"].some((data) => data === event?.type)) return;
            if (global.config.DeveloperMode) console.log(event);
            return listener(event);
        }
        
        function connect_mqtt() {
            global.handleListen = loginApiData.listenMqtt(listenerCallback);
            global.client.api = loginApiData;
            setTimeout(() => (mqttClient.end(), connect_mqtt()), 1000 * 60 * 60 * 1);
            logger(global.getText('mirai', 'successConnectMQTT'), '[ MQTT ]');
        }
        
        connect_mqtt();
    });
}

// Connect to Database
(async() => {
    try {
        await sequelize.authenticate();
        const authentication = {};
        authentication.Sequelize = Sequelize;
        authentication.sequelize = sequelize;
        const models = require('./includes/database/model')(authentication);
        logger(global.getText('mirai', 'successConnectDatabase'), '[ DATABASE ] ');

        const botData = {};
        botData.models = models;
        onBot(botData);
    } catch (error) { 
        logger(global.getText('mirai', 'successConnectDatabase', JSON.stringify(error)), '[ DATABASE ] '); 
    }
})();

process.on('unhandledRejection', (err, p) => {})
    .on('uncaughtException', err => { console.log(err); }); 