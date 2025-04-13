// improved-bot-server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { NlpManager } = require('node-nlp');

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 創建 NLP 管理器類
class ChatbotNLP {
  constructor() {
    this.manager = new NlpManager({ languages: ['zh'], forceNER: true });
    this.intentHandlers = new Map();
    this.fallbackResponses = [
      '抱歉，我不太理解您的意思。能否換個方式表達？',
      '這個問題有點難，能否提供更多信息？',
      '我還在學習中，這個問題我還不太懂。',
      '請繼續輸入您的問題，我在聆聽...'
    ];
    this.confidenceThreshold = 0.6;
  }

  // 註冊意圖處理器
  registerIntentHandler(intent, handler) {
    this.intentHandlers.set(intent, handler);
  }

  // 添加訓練數據
  addTrainingData() {
    // 問候意圖
    this.addIntentDocuments('greetings', [
      '你好', '嗨', '哈囉', '早安', '晚安'
    ]);
    this.addIntentAnswers('greetings', [
      '你好！有什麼我可以幫助你的嗎？',
      '嗨！很高興見到你！'
    ]);

    // 詢問功能
    this.addIntentDocuments('bot_capabilities', [
      '你能做什麼', '你有什麼功能', '你可以幫我做什麼', '你會什麼'
    ]);
    this.addIntentAnswers('bot_capabilities', [
      '我可以回答問題、提供資訊，或者只是聊天。有什麼我能幫助你的嗎？'
    ]);

    // 詢問身份
    this.addIntentDocuments('bot_identity', [
      '你是誰', '你叫什麼名字', '你是機器人嗎'
    ]);
    this.addIntentAnswers('bot_identity', [
      '我是一個聊天機器人，由 NLP.js 驅動，為您提供協助。'
    ]);

    // 感謝
    this.addIntentDocuments('thanks', [
      '謝謝', '感謝', '謝謝你'
    ]);
    this.addIntentAnswers('thanks', [
      '不客氣！很高興能幫到你。'
    ]);

    // 告別
    this.addIntentDocuments('goodbye', [
      '再見', '拜拜', '下次見'
    ]);
    this.addIntentAnswers('goodbye', [
      '再見！有需要隨時回來找我。'
    ]);

    // 天氣相關
    this.addIntentDocuments('weather', [
      '今天天氣如何', '天氣預報', '會下雨嗎'
    ]);
    this.addIntentAnswers('weather', [
      '抱歉，我目前無法提供即時天氣資訊。您可以查看當地氣象網站獲取準確資訊。'
    ]);

    // 添加實體
    this.addEntities();

    // 產品詢問意圖
    this.addIntentDocuments('product_info', [
      '我想了解%product%',
      '告訴我關於%product%的資訊',
      '%product%有什麼特點'
    ]);
    this.addIntentAnswers('product_info', [
      '關於{{product}}，我們有多種型號可供選擇。您有特定需求嗎？'
    ]);

    // 人物詢問意圖
    this.addIntentDocuments('people_info', [
      '我想了解[小明](people)',
      '誰是[王先生](people)',
      '[李華](people)有什麼特點',
      '介紹[陳小姐](people)這個人是誰',
      '我想了解%people%',
      '誰是%people%',
      '%people%有什麼特點',
      '介紹%people%這個人是誰'
    ]);
    this.addIntentAnswers('people_info', [
      '關於{{people}}，我們只知道，他是Gay',
      '{{people}}是Gay'
    ]);

    // 註冊自定義處理器
    this.registerCustomHandlers();
  }

  // 添加意圖文檔
  addIntentDocuments(intent, phrases) {
    phrases.forEach(phrase => {
      this.manager.addDocument('zh', phrase, intent);
    });
  }

  // 添加意圖回答
  addIntentAnswers(intent, answers) {
    answers.forEach(answer => {
      this.manager.addAnswer('zh', intent, answer);
    });
  }

  // 添加實體
  addEntities() {
    // 產品實體
    this.manager.addNamedEntityText('product', '手機', ['zh'], ['手機', '智能手機', '電話', 'iPhone', '安卓手機']);
    this.manager.addNamedEntityText('product', '電腦', ['zh'], ['電腦', '筆電', '筆記型電腦', '桌機', '桌上型電腦']);

    // 人物實體
    this.manager.addNamedEntityText('people', '張三', ['zh'], ['張三', '張先生']);
    this.manager.addNamedEntityText('people', '李四', ['zh'], ['李四', '李先生']);
    this.manager.addNamedEntityText('people', '王五', ['zh'], ['王五', '王先生']);
    this.manager.addNamedEntityText('people', '陳闈霆', ['zh'], ['陳闈霆', '闈霆']);
    this.manager.addNamedEntity('people', 'trim');
  }

  // 註冊自定義處理器
  registerCustomHandlers() {
    // 人物信息處理器
    this.registerIntentHandler('people_info', (response) => {
      let personName = '未知';
      if (response.entities && response.entities.length > 0) {
        const peopleEntity = response.entities.find(e => e.entity === 'people');
        if (peopleEntity) {
          personName = peopleEntity.option || peopleEntity.sourceText || peopleEntity.utteranceText; // 使用 sourceText 或 utteranceText
        }
      }
      console.log(personName);
      return `關於${personName}，我們只知道，他是Gay`;
    });

    // 產品信息處理器
    this.registerIntentHandler('product_info', (response) => {
      let productName = '未知';
      if (response.entities && response.entities.length > 0) {
        const productEntity = response.entities.find(e => e.entity === 'product');
        if (productEntity) {
          productName = productEntity.option || productEntity.sourceText || productEntity.utteranceText; // 使用 sourceText 或 utteranceText
        }
      }
      return `關於${productName}，我們有多種型號可供選擇。您有特定需求嗎？`;
    });
  }

  // 處理消息
  async processMessage(message, sessionContext = {}) {
    try {
      const response = await this.manager.process('zh', message, sessionContext);
      
      // 信心閾值檢查
      if (response.score < this.confidenceThreshold) {
        return {
          answer: this.getRandomFallback(),
          intent: response.intent,
          score: response.score,
          entities: response.entities
        };
      }

      let finalAnswer = '';

      // 檢查是否有自定義處理器
      if (this.intentHandlers.has(response.intent)) {
        finalAnswer = this.intentHandlers.get(response.intent)(response);
      } else {
        finalAnswer = response.answer;
        
        // 替換變數
        if (finalAnswer && response.entities && response.entities.length > 0) {
          for (const entity of response.entities) {
            const placeholder = `{{${entity.entity}}}`;
            const entityValue = entity.option || entity.sourceText || entity.utteranceText; // 使用 sourceText 或 utteranceText
            finalAnswer = finalAnswer.replace(new RegExp(placeholder, 'g'), entityValue);
          }
        }
      }

      return {
        answer: finalAnswer || this.getRandomFallback(),
        intent: response.intent,
        score: response.score,
        entities: response.entities
      };
    } catch (error) {
      console.error('處理訊息時發生錯誤:', error);
      return { answer: '處理您的請求時發生錯誤，請稍後再試。', error: true };
    }
  }

  // 獲取隨機回退回應
  getRandomFallback() {
    const index = Math.floor(Math.random() * this.fallbackResponses.length);
    return this.fallbackResponses[index];
  }

  // 訓練模型
  async train() {
    this.addTrainingData();
    await this.manager.train();
    this.manager.save('./model.nlp');
    console.log('模型已訓練並保存');
  }
}

// 會話管理類
class SessionManager {
  constructor() {
    this.sessions = {};
    this.sessionTimeout = 30 * 60 * 1000; // 30分鐘超時
  }

  // 獲取或創建會話
  getOrCreateSession(sessionId = 'default') {
    if (!this.sessions[sessionId]) {
      this.sessions[sessionId] = { 
        context: {}, 
        history: [],
        lastActive: Date.now()
      };
    } else {
      // 更新最後活動時間
      this.sessions[sessionId].lastActive = Date.now();
    }
    return this.sessions[sessionId];
  }

  // 添加消息到歷史記錄
  addToHistory(sessionId, role, content) {
    const session = this.getOrCreateSession(sessionId);
    session.history.push({ role, content, timestamp: Date.now() });
    
    // 限制歷史記錄長度
    if (session.history.length > 20) {
      session.history.shift();
    }
  }

  // 清理過期會話
  cleanupSessions() {
    const now = Date.now();
    Object.keys(this.sessions).forEach(sessionId => {
      if (now - this.sessions[sessionId].lastActive > this.sessionTimeout) {
        delete this.sessions[sessionId];
      }
    });
  }
}

// 初始化
const chatbotNLP = new ChatbotNLP();
const sessionManager = new SessionManager();

// 定期清理過期會話
setInterval(() => {
  sessionManager.cleanupSessions();
}, 10 * 60 * 1000); // 每10分鐘

// 啟動服務器
async function startServer() {
  // 訓練模型
  await chatbotNLP.train();

  // API 端點處理函數
  app.post('/api/chat', async (req, res) => {
    console.log('收到聊天請求:', req.body);
    try {
      const { message, sessionId = 'default' } = req.body;
      if (!message) {
        return res.status(400).json({ error: '請提供訊息' });
      }
      
      // 獲取會話並添加到歷史記錄
      const session = sessionManager.getOrCreateSession(sessionId);
      sessionManager.addToHistory(sessionId, 'user', message);
      
      console.log('處理訊息:', message);
      const result = await chatbotNLP.processMessage(message, session.context);
      console.log('處理結果:', result);
      
      // 添加回應到歷史記錄
      sessionManager.addToHistory(sessionId, 'bot', result.answer);
      
      res.json({
        answer: result.answer,
        intent: result.intent,
        score: result.score,
        sessionId: sessionId,
        entities: result.entities
      });
    } catch (error) {
      console.error('處理請求時發生錯誤:', error);
      res.status(500).json({ error: '處理請求時發生錯誤' });
    }
  });

  // 獲取會話歷史記錄的端點
  app.get('/api/chat/history/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessionManager.getOrCreateSession(sessionId);
    res.json({ history: session.history });
  });

  // 處理 SPA 路由
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`服務器運行於 http://localhost:${PORT}`);
  });
}

startServer();
