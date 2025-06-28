const fs = require('fs');
const ytdl = require('@distube/ytdl-core');
const { resolve } = require('path');
async function downloadMusicFromYoutube(link, path) {
  var timestart = Date.now();
  if(!link) return 'Thiếu link'
  var resolveFunc = function () { };
  var rejectFunc = function () { };
  var returnPromise = new Promise(function (resolve, reject) {
    resolveFunc = resolve;
    rejectFunc = reject;
  });
    ytdl(link, {
            filter: format =>
                format.quality == 'tiny' && format.audioBitrate == 128 && format.hasAudio == true
        }).pipe(fs.createWriteStream(path))
        .on("close", async () => {
            var data = await ytdl.getInfo(link)
            var result = {
                title: data.videoDetails.title,
                dur: Number(data.videoDetails.lengthSeconds),
                sub: data.videoDetails.author.subscriber_count,
                viewCount: data.videoDetails.viewCount,
                
                author: data.videoDetails.author.name,
                timestart: timestart
            }
            resolveFunc(result)
        })
  return returnPromise
}
module.exports.config = {
    name: "sing",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "D-Jukie",
    description: "Phát nhạc thông qua link YouTube hoặc từ khoá tìm kiếm",
    commandCategory: "Nhạc",
    usages: "[searchMusic]",
    cooldowns: 0
}
module.exports.run = async function ({ api, event, args, Users}) {
  let axios = require('axios');

  const moment = require("moment-timezone");
    var gio = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || D/MM/YYYY");
    var thu = moment.tz('Asia/Ho_Chi_Minh').format('dddd');
    if (thu == 'Sunday') thu = 'Chủ Nhật'
    if (thu == 'Monday') thu = 'Thứ Hai'
    if (thu == 'Tuesday') thu = 'Thứ Ba'
    if (thu == 'Wednesday') thu = 'Thứ Tư'
    if (thu == "Thursday") thu = 'Thứ Năm'
    if (thu == 'Friday') thu = 'Thứ Sáu'
    if (thu == 'Saturday') thu = 'Thứ Bảy'
    let name = await Users.getNameUser(event.senderID);
    api.setMessageReaction("❎", event.messageID, () => { }, true);
    if (args.length == 0 || !args) return api.sendMessage('➣ 𝗣𝗵𝗮̂̀𝗻 𝘁𝗶̀𝗺 𝗸𝗶𝗲̂́𝗺 𝗸𝗵𝗼̂𝗻𝗴 đ𝘂̛𝗼̛̣𝗰 đ𝗲̂̉ 𝘁𝗿𝗼̂́𝗻𝗴!', event.threadID, event.messageID);
    const keywordSearch = args.join(" ");
    var path = `${__dirname}/cache/sing-${event.senderID}.mp3`
    if (fs.existsSync(path)) { 
        fs.unlinkSync(path)
    }
    if (args.join(" ").indexOf("https://") == 0) { 
        try {
            return api.sendMessage({ 
                body: `có cc`}, event.threadID, ()=> fs.unlinkSync(path), 
            event.messageID)       
        }
        catch (e) { return console.log(e) }
    } else {
          try {
            var link = [],
                msg = "",
                num = 0
            const Youtube = require('youtube-search-api');
            api.setMessageReaction("⌛", event.messageID, () => { }, true);
            var data = (await Youtube.GetListByKeyword(keywordSearch, false,6)).items;
            for (let value of data) {
              link.push(value.id);
              num = num+=1
              api.setMessageReaction("✅", event.messageID, () => { }, true);
              msg += (`➣ Kết quả: ${num} - ${value.title}\n➣ 𝐓𝐞̂𝐧 𝐤𝐞̂𝐧𝐡: ${value.channelTitle}\n➣ 𝐓𝐡𝐨̛̀𝐢 𝐥𝐮̛𝐨̛̣𝐧𝐠:${value.length.simpleText}\n====================\n`);
            }
            var body = `==『 𝙼𝚘̛̀𝚒 𝚋𝚊̣𝚗 𝚘𝚛𝚍𝚎𝚛 𝚖𝚎𝚗𝚞  』==\n====================\n${msg}➝ 𝙼𝚘̛̀𝚒 ${name} 𝚝𝚛𝚊̉ 𝚕𝚘̛̀𝚒 𝚝𝚒𝚗 𝚗𝚑𝚊̆́𝚗 𝚗𝚊̀𝚢 𝚔𝚎̀𝚖 𝚜𝚘̂́ 𝚝𝚑𝚞̛́ 𝚝𝚞̛̣ 𝚖𝚊̀ 𝚋𝚊̣𝚗 𝚖𝚞𝚘̂́𝚗 𝚗𝚐𝚑𝚎 𝚋𝚘𝚝 𝚜𝚎̃ 𝚘𝚛𝚍𝚎𝚛 𝚌𝚑𝚘 𝚋𝚊̣𝚗`
            
            return api.sendMessage({
              body: body
            }, event.threadID, (error, info) => global.client.handleReply.push({
              
              type: 'reply',
              name: this.config.name,
              messageID: info.messageID,
              author: event.senderID,
              link
            }), event.messageID);
            
          } catch(e) {
            console.log(e)
            api.setMessageReaction("❎", event.messageID, () => { }, true);
        
            
          } 
          // đêm qua em tuyệt lắm
    } // thần la thiên đinhhh
      } // cục xì lầu ông bê lăc

module.exports.handleReply = async function ({ api, event, handleReply, Users }) {
    const axios = require('axios')
    api.setMessageReaction("⌛", event.messageID, () => { }, true);

   const moment = require("moment-timezone");
    var gio = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss || D/MM/YYYY");
    var thu = moment.tz('Asia/Ho_Chi_Minh').format('dddd');
    if (thu == 'Sunday') thu = 'Chủ Nhật'
    if (thu == 'Monday') thu = 'Thứ Hai'
    if (thu == 'Tuesday') thu = 'Thứ Ba'
    if (thu == 'Wednesday') thu = 'Thứ Tư'
    if (thu == "Thursday") thu = 'Thứ Năm'
    if (thu == 'Friday') thu = 'Thứ Sáu'
    if (thu == 'Saturday') thu = 'Thứ Bảy'
    let name = await Users.getNameUser(event.senderID);
    
  
    const { createReadStream, unlinkSync, statSync } = require("fs-extra")
    try {
        var path = `${__dirname}/cache/sing-${event.senderID}.mp3`
        var data = await downloadMusicFromYoutube('https://www.youtube.com/watch?v=' + handleReply.link[event.body -1], path);
        if (fs.statSync(path).size > 266214400) return api.sendMessage('𝐁𝐚̀𝐢 𝐠𝐢̀ 𝐦𝐚̀ 𝐝𝐚̀𝐢 𝐝𝐮̛̃ 𝐯𝐚̣̂𝐲, đ𝐨̂̉𝐢 𝐛𝐚̀𝐢 đ𝐢 😠', event.threadID, () => fs.unlinkSync(path), event.messageID);
        api.unsendMessage(handleReply.messageID)
        api.setMessageReaction("✅", event.messageID, () => { }, true);
        return api.sendMessage({ 
body: ` ㅤㅤㅤ===『 𝚃𝚒𝚎̣̂𝚖 𝙽𝚑𝚊̣𝚌 』===
▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱
🎧 B𝚊̀𝚒 𝚑𝚊́𝚝: ${data.title}
⏰ 𝚃𝚑𝚘̛̀𝚒 𝙻𝚞̛𝚘̛̣𝚗𝚐: ${this.convertHMS(data.dur)}
🌐 𝚃𝚎̂𝚗 𝚔𝚎̂𝚗𝚑: ${data.author}
👥 Lượt theo dõi: ${data.sub}
👁️ Lượt xem: ${data.viewCount}
👤 𝙾𝚛𝚍𝚎𝚛 𝚖𝚞𝚜𝚒𝚌: ${name}
⌛ 𝚃𝚒𝚖𝚎 𝚡𝚞̛̉ 𝚕𝚒́: ${Math.floor((Date.now()- data.timestart)/1000)} 𝚐𝚒𝚊̂y
 ⇆ㅤㅤㅤ◁ㅤㅤ❚❚ㅤㅤ▷ㅤㅤㅤ↻
▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱`,
            attachment: fs.createReadStream(path)}, event.threadID, ()=> fs.unlinkSync(path), 
         event.messageID)
            
    }
    catch (e) { return console.log(e) }
}
module.exports.convertHMS = function(value) {
    const sec = parseInt(value, 10); 
    let hours   = Math.floor(sec / 3600);
    let minutes = Math.floor((sec - (hours * 3600)) / 60); 
    let seconds = sec - (hours * 3600) - (minutes * 60); 
    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return (hours != '00' ? hours +':': '') + minutes+':'+seconds;
}