const fs = require('fs');
const path = require('path');

module.exports.config = {
    name: "antibd",
    eventType: ["log:user-nickname"],
    version: "0.0.4", //beta - thêm tự động kiểm tra biệt danh
    credits: "ProCoderCyrus",
    description: "Chống đổi biệt danh của Bot và lưu vào file, tích hợp thuê bot, tự động kiểm tra"
};

const botNicknameFile = path.join(__dirname, 'botnickname.txt');
const thuebotDataPath = path.join(__dirname, '..', 'commands', 'cache', 'data', 'thuebot.json');
let storedNickname;

// Hàm đọc nickname từ file
const loadNickname = () => {
    try {
        console.log("antibd.js: loadNickname() - Bắt đầu đọc file..."); // DEBUG
        if (fs.existsSync(botNicknameFile)) {
            storedNickname = fs.readFileSync(botNicknameFile, 'utf8').trim();
            console.log(`antibd.js: loadNickname() - Đọc thành công từ file: ${storedNickname}`); // DEBUG
        } else {
            storedNickname = `「 ${global.config.PREFIX} 」 • ${global.config.BOTNAME}`; // Default nếu file không tồn tại
            console.log(`antibd.js: loadNickname() - File không tồn tại, dùng nickname mặc định: ${storedNickname}`); // DEBUG
            saveNickname(storedNickname);
        }
        if (!storedNickname) { // Trường hợp file tồn tại nhưng rỗng
            storedNickname = `「 ${global.config.PREFIX} 」 • ${global.config.BOTNAME}`;
            console.log(`antibd.js: loadNickname() - File rỗng, dùng nickname mặc định: ${storedNickname}`); // DEBUG
            saveNickname(storedNickname);
        }
    } catch (error) {
        console.error("antibd.js: loadNickname() - Lỗi khi đọc file botnickname.txt:", error);
        storedNickname = `「 ${global.config.PREFIX} 」 • ${global.config.BOTNAME}`; // Default nếu lỗi đọc file
        console.log(`antibd.js: loadNickname() - Lỗi đọc file, dùng nickname mặc định (lỗi): ${storedNickname}`); // DEBUG
    }
};

// Hàm lưu nickname vào file
const saveNickname = (nickname) => {
    try {
        console.log(`antibd.js: saveNickname() - Bắt đầu ghi file với nickname: ${nickname}`); // DEBUG
        fs.writeFileSync(botNicknameFile, nickname, 'utf8');
        console.log(`antibd.js: saveNickname() - Ghi file thành công.`); // DEBUG
    } catch (error) {
        console.error("antibd.js: saveNickname() - Lỗi khi ghi file botnickname.txt:", error);
    }
};

module.exports.onLoad = () => {
    loadNickname(); // Load nickname khi module được load
};

module.exports.run = async function({ api, event, Users, Threads }) {
    var { logMessageData, threadID, author } = event;
    var botID = api.getCurrentUserID();
    var { ADMINBOT, PREFIX, BOTNAME } = global.config;

    let currentNickname; // Biến lưu trữ nickname hiện tại sẽ dùng

    // Đọc dữ liệu thuê bot và tạo nickname động
    let rentalData = fs.existsSync(thuebotDataPath) ? JSON.parse(fs.readFileSync(thuebotDataPath)) : [];
    let rentalNicknameSuffix = ""; // Phần đuôi nickname dựa trên thuê bot

    if (Array.isArray(rentalData)) {
        const rentalInfo = rentalData.find(rental => rental.t_id === threadID);
        let rentalEndDate;
        if (rentalInfo) {
            rentalEndDate = new Date(rentalInfo.time_end).toLocaleString(); // Định dạng lại thời gian hết hạn
            rentalNicknameSuffix = ` | HSD: ${rentalEndDate}`;
        } else {
            rentalNicknameSuffix = " | Chưa thuê bot";
        }
    } else {
        console.error('Dữ liệu thuê bot không hợp lệ (không phải array):', rentalData);
        rentalNicknameSuffix = " | Lỗi thuê bot"; // Thêm thông báo lỗi nếu data không phải array
    }

    currentNickname = `「 ${PREFIX} 」 • ${BOTNAME}${rentalNicknameSuffix}`;

    if (!storedNickname) {
        storedNickname = `「 ${PREFIX} 」 • ${BOTNAME}`; // Đảm bảo có giá trị nếu loadNickname lỗi ở onLoad
    }

    // Lấy nickname hiện tại của bot trong thread
    const threadData = await Threads.getData(threadID);
    const botCurrentNicknameInThread = threadData.nicknames && threadData.nicknames[botID] ? threadData.nicknames[botID] : `「 ${PREFIX} 」 • ${BOTNAME}`; // Lấy nickname hiện tại, nếu không có thì dùng default

    console.log(`antibd.js: run() - Nickname hiện tại trong thread: ${botCurrentNicknameInThread}`); // DEBUG
    console.log(`antibd.js: run() - Nickname động (currentNickname): ${currentNickname}`); // DEBUG

    // Kiểm tra và đặt lại nickname nếu cần thiết (luôn kiểm tra ở mỗi event)
    if (botCurrentNicknameInThread != currentNickname) {
        console.log(`antibd.js: run() - Nickname khác biệt, tiến hành đặt lại và lưu file.`); // DEBUG
        api.changeNickname(currentNickname, threadID, botID);
        saveNickname(currentNickname); // Cập nhật lại file với tên động mới nhất
    } else {
        console.log(`antibd.js: run() - Nickname giống nhau, không cần đặt lại.`); // DEBUG
    }


    if (logMessageData.participant_id == botID && author != botID && !ADMINBOT.includes(author) && logMessageData.nickname != currentNickname) {
        // Nếu không phải admin và đổi tên bot khác với tên động (và bot là đối tượng bị đổi tên)
        console.log(`antibd.js: run() - Phát hiện non-admin đổi tên, đặt lại và thông báo.`); // DEBUG
        api.changeNickname(currentNickname, threadID, botID); // Đặt lại tên bot về tên động
        var info = await Users.getData(author);
        return api.sendMessage({ body: `${info.name} - 𝐁𝐚̣𝐧 𝐊𝐡𝐨̂𝐧𝐠 𝐂𝐨́ 𝐐𝐮𝐲𝐞̂̀𝐧 Đ𝐨̂̉𝐢 𝐓𝐞̂𝐍 𝐁𝐨𝐭!!!`}, threadID);
    } else if (logMessageData.participant_id == botID && ADMINBOT.includes(author) && logMessageData.nickname != currentNickname) {
        // Nếu là admin đổi tên bot
        console.log(`antibd.js: run() - Phát hiện admin đổi tên, cập nhật storedNickname và lưu file.`); // DEBUG
        storedNickname = logMessageData.nickname; // Cập nhật nickname mới từ admin set
        saveNickname(storedNickname); // Lưu vào file
        api.changeNickname(storedNickname, threadID, botID); // Đặt lại tên bot theo tên admin vừa set (nếu muốn)
    }
};