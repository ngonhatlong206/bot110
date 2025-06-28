const { spawn } = require("child_process");
const { readFileSync } = require("fs-extra");
const http = require("http");
const axios = require("axios");
const semver = require("semver");
const logger = require("./utils/log");
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');

// Load environment variables
require('dotenv').config();

///////////////////////////////////////////////////////////
//========= Create website for dashboard/uptime =========//
///////////////////////////////////////////////////////////
const PORT = process.env.PORT || 2025;
const express = require("express");
const app = express();

// Define a route
app.get('/', (request, response) => {
    const result = `Nhớ ib Facebook Lương Trường Khôi để cập nhật file nha (free) Facebook: https://www.facebook.com/LunarKrystal.Dev`;
    response.send(result);
});

// Thêm route để kiểm tra trạng thái Firebase
app.get('/status', async (request, response) => {
    try {
        const { checkCookieStatus } = require('./lib/firebaseManager');
        const status = await checkCookieStatus(process.env.FB_EMAIL || 'ngonhatlongffff@gmail.com');
        response.json({
            status: 'online',
            firebase: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        response.json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(chalk.red(`[ SECURITY ] -> Máy chủ khởi động tại port: ${PORT}`));
});

function startBot(message) {
    (message) ? logger(message, "BOT STARTING") : "";

    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "main.js"], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true,
        env: {
            ...process.env,
            FB_EMAIL: process.env.FB_EMAIL || 'ngonhatlongffff@gmail.com',
            FB_PASSWORD: process.env.FB_PASSWORD || 'Nhatlong_10102006',
            FB_OTPKEY: process.env.FB_OTPKEY || '',
            ENCRYPT_KEY: process.env.ENCRYPT_KEY || 'your_strong_encryption_key_here_32_chars',
            FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || ''
        }
    });

   child.on("close",async (codeExit) => {
      var x = 'codeExit'.replace('codeExit',codeExit);
        if (codeExit == 1) {
            logger("🔄 Bot đang khởi động lại do thay cookie hoặc lỗi...", "BOT STARTING");
            return startBot("Đang Khởi Động Lại, Vui Lòng Chờ ...");
        }
         else if (x.indexOf(2) == 0) {
           await new Promise(resolve => setTimeout(resolve, parseInt(x.replace(2,'')) * 1000));
                 startBot("Bot has been activated please wait a moment!!!");
       }
         else {
             logger("❌ Bot đã dừng với mã lỗi: " + codeExit, "BOT STARTING");
             return; 
         }
    });

    child.on("error", function (error) {
        logger("An error occurred: " + JSON.stringify(error), "[ Starting ]");
    });
}

console.log(chalk.yellow(figlet.textSync('KRYSTAL', { horizontalLayout: 'full' })));
console.log(chalk.green("Lương Trường Khôi chúc bạn sử dụng file vui vẻ!"));
console.log(chalk.blue("🚀 Hệ thống Firebase đã được tích hợp!"));

// Kiểm tra environment variables
const requiredEnvVars = ['FB_EMAIL', 'FB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.log(chalk.yellow(`⚠️ Các biến môi trường sau chưa được thiết lập: ${missingVars.join(', ')}`));
    console.log(chalk.yellow("Sử dụng giá trị mặc định từ config.json"));
}

startBot();