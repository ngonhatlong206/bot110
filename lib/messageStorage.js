const admin = require('firebase-admin');
const firebaseConfig = require('../firebase-config.js');
const firebaseLogger = require('./firebaseLogger');

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
  console.error('❌ Lỗi khởi tạo Firebase Message Storage:', error.message);
  firebaseApp = null;
}

class MessageStorage {
  constructor() {
    this.db = firebaseApp ? admin.database() : null;
    this.botId = process.env.BOT_ID || 'main-bot';
    this.maxMessagesPerThread = 1000; // Giới hạn tin nhắn mỗi thread
  }

  // Lưu tin nhắn vào Firebase
  async saveMessage(messageData) {
    try {
      if (!this.db) {
        console.log('⚠️ Firebase không khả dụng, không thể lưu tin nhắn');
        return false;
      }

      const {
        threadID,
        messageID,
        senderID,
        body,
        type = 'message',
        timestamp = Date.now(),
        attachments = [],
        mentions = [],
        replyTo = null
      } = messageData;

      const messageEntry = {
        messageID: messageID,
        senderID: senderID,
        body: body,
        type: type,
        timestamp: timestamp,
        attachments: attachments,
        mentions: mentions,
        replyTo: replyTo,
        savedAt: Date.now(),
        botId: this.botId
      };

      // Lưu vào messages collection
      const messageRef = this.db.ref(`messages/${threadID}/${messageID}`);
      await messageRef.set(messageEntry);

      // Lưu vào messages_by_sender để dễ query
      await this.db.ref(`messages_by_sender/${senderID}/${messageID}`).set({
        ...messageEntry,
        threadID: threadID
      });

      // Lưu vào messages_by_bot để theo dõi từng bot
      await this.db.ref(`messages_by_bot/${this.botId}/${threadID}/${messageID}`).set(messageEntry);

      // Giới hạn số tin nhắn mỗi thread
      await this.cleanupOldMessages(threadID);

      return true;
    } catch (error) {
      firebaseLogger.error(`Lỗi lưu tin nhắn: ${error.message}`, 'MESSAGE_STORAGE');
      return false;
    }
  }

  // Lưu nhiều tin nhắn cùng lúc
  async saveMessages(messages) {
    try {
      if (!this.db) return false;

      const promises = messages.map(message => this.saveMessage(message));
      const results = await Promise.all(promises);
      
      const successCount = results.filter(result => result).length;
      firebaseLogger.info(`Đã lưu ${successCount}/${messages.length} tin nhắn`, 'MESSAGE_STORAGE');
      
      return successCount === messages.length;
    } catch (error) {
      firebaseLogger.error(`Lỗi lưu nhiều tin nhắn: ${error.message}`, 'MESSAGE_STORAGE');
      return false;
    }
  }

  // Lấy tin nhắn theo thread
  async getMessagesByThread(threadID, limit = 100) {
    try {
      if (!this.db) return [];

      const snapshot = await this.db.ref(`messages/${threadID}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push(childSnapshot.val());
      });

      return messages.reverse();
    } catch (error) {
      firebaseLogger.error(`Lỗi lấy tin nhắn theo thread: ${error.message}`, 'MESSAGE_STORAGE');
      return [];
    }
  }

  // Lấy tin nhắn theo sender
  async getMessagesBySender(senderID, limit = 100) {
    try {
      if (!this.db) return [];

      const snapshot = await this.db.ref(`messages_by_sender/${senderID}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push(childSnapshot.val());
      });

      return messages.reverse();
    } catch (error) {
      firebaseLogger.error(`Lỗi lấy tin nhắn theo sender: ${error.message}`, 'MESSAGE_STORAGE');
      return [];
    }
  }

  // Lấy tin nhắn theo bot
  async getMessagesByBot(botId = null, limit = 100) {
    try {
      if (!this.db) return [];

      const targetBotId = botId || this.botId;
      const snapshot = await this.db.ref(`messages_by_bot/${targetBotId}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push(childSnapshot.val());
      });

      return messages.reverse();
    } catch (error) {
      firebaseLogger.error(`Lỗi lấy tin nhắn theo bot: ${error.message}`, 'MESSAGE_STORAGE');
      return [];
    }
  }

  // Tìm kiếm tin nhắn
  async searchMessages(query, threadID = null, limit = 50) {
    try {
      if (!this.db) return [];

      let messages = [];
      
      if (threadID) {
        // Tìm trong thread cụ thể
        const threadMessages = await this.getMessagesByThread(threadID, 1000);
        messages = threadMessages.filter(msg => 
          msg.body && msg.body.toLowerCase().includes(query.toLowerCase())
        );
      } else {
        // Tìm trong tất cả tin nhắn của bot
        const botMessages = await this.getMessagesByBot(this.botId, 1000);
        messages = botMessages.filter(msg => 
          msg.body && msg.body.toLowerCase().includes(query.toLowerCase())
        );
      }

      return messages.slice(0, limit);
    } catch (error) {
      firebaseLogger.error(`Lỗi tìm kiếm tin nhắn: ${error.message}`, 'MESSAGE_STORAGE');
      return [];
    }
  }

  // Backup tin nhắn từ thread cụ thể
  async backupThread(threadID) {
    try {
      if (!this.db) return false;

      const messages = await this.getMessagesByThread(threadID, 1000);
      
      const backupData = {
        threadID: threadID,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1],
        backupAt: Date.now(),
        botId: this.botId
      };

      await this.db.ref(`backups/threads/${threadID}`).set(backupData);
      
      firebaseLogger.info(`Đã backup thread ${threadID} với ${messages.length} tin nhắn`, 'MESSAGE_STORAGE');
      return true;
    } catch (error) {
      firebaseLogger.error(`Lỗi backup thread: ${error.message}`, 'MESSAGE_STORAGE');
      return false;
    }
  }

  // Restore tin nhắn từ backup
  async restoreThread(threadID) {
    try {
      if (!this.db) return false;

      const snapshot = await this.db.ref(`backups/threads/${threadID}`).once('value');
      if (!snapshot.exists()) {
        firebaseLogger.warn(`Không tìm thấy backup cho thread ${threadID}`, 'MESSAGE_STORAGE');
        return false;
      }

      const backupData = snapshot.val();
      firebaseLogger.info(`Đã restore thread ${threadID} từ backup`, 'MESSAGE_STORAGE');
      
      return backupData;
    } catch (error) {
      firebaseLogger.error(`Lỗi restore thread: ${error.message}`, 'MESSAGE_STORAGE');
      return false;
    }
  }

  // Dọn dẹp tin nhắn cũ
  async cleanupOldMessages(threadID) {
    try {
      if (!this.db) return;

      const snapshot = await this.db.ref(`messages/${threadID}`)
        .orderByChild('timestamp')
        .once('value');

      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          key: childSnapshot.key,
          timestamp: childSnapshot.val().timestamp
        });
      });

      // Xóa tin nhắn cũ nếu vượt quá giới hạn
      if (messages.length > this.maxMessagesPerThread) {
        const toDelete = messages
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, messages.length - this.maxMessagesPerThread);

        for (const msg of toDelete) {
          await this.db.ref(`messages/${threadID}/${msg.key}`).remove();
        }

        firebaseLogger.info(`Đã dọn dẹp ${toDelete.length} tin nhắn cũ từ thread ${threadID}`, 'MESSAGE_STORAGE');
      }
    } catch (error) {
      firebaseLogger.error(`Lỗi dọn dẹp tin nhắn: ${error.message}`, 'MESSAGE_STORAGE');
    }
  }

  // Lấy thống kê tin nhắn
  async getMessageStats() {
    try {
      if (!this.db) return {};

      const snapshot = await this.db.ref(`messages_by_bot/${this.botId}`).once('value');
      const threads = [];
      let totalMessages = 0;

      snapshot.forEach((threadSnapshot) => {
        const threadID = threadSnapshot.key;
        const messageCount = threadSnapshot.numChildren();
        threads.push({
          threadID: threadID,
          messageCount: messageCount
        });
        totalMessages += messageCount;
      });

      return {
        totalThreads: threads.length,
        totalMessages: totalMessages,
        threads: threads.sort((a, b) => b.messageCount - a.messageCount)
      };
    } catch (error) {
      firebaseLogger.error(`Lỗi lấy thống kê tin nhắn: ${error.message}`, 'MESSAGE_STORAGE');
      return {};
    }
  }

  // Xóa tin nhắn theo điều kiện
  async deleteMessages(threadID = null, senderID = null, beforeTimestamp = null) {
    try {
      if (!this.db) return false;

      let messages = [];

      if (threadID) {
        messages = await this.getMessagesByThread(threadID, 1000);
      } else if (senderID) {
        messages = await this.getMessagesBySender(senderID, 1000);
      } else {
        messages = await this.getMessagesByBot(this.botId, 1000);
      }

      // Lọc theo điều kiện
      if (beforeTimestamp) {
        messages = messages.filter(msg => msg.timestamp < beforeTimestamp);
      }

      // Xóa tin nhắn
      for (const message of messages) {
        await this.db.ref(`messages/${message.threadID}/${message.messageID}`).remove();
        await this.db.ref(`messages_by_sender/${message.senderID}/${message.messageID}`).remove();
        await this.db.ref(`messages_by_bot/${this.botId}/${message.threadID}/${message.messageID}`).remove();
      }

      firebaseLogger.info(`Đã xóa ${messages.length} tin nhắn`, 'MESSAGE_STORAGE');
      return true;
    } catch (error) {
      firebaseLogger.error(`Lỗi xóa tin nhắn: ${error.message}`, 'MESSAGE_STORAGE');
      return false;
    }
  }
}

// Tạo instance global
const messageStorage = new MessageStorage();

module.exports = messageStorage; 