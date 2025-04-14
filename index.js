const fs = require('fs');
const { NlpManager } = require('node-nlp');
const express = require('express');
const bodyParser = require('body-parser');

// 初始化 NLP 管理器
const manager = new NlpManager({ languages: ['zh'], forceNER: true });

// 處理聊天邏輯的函數，供 GET 和 POST 請求共用
async function processChatMessage(message) {
  if (!message) {
    return { error: '缺少訊息內容' };
  }
  
  try {
    // 首先檢查是否是自我介紹格式
    const introMatch = message.match(/我是\s*(.+)$/) || 
                      message.match(/我叫\s*(.+)$/) || 
                      message.match(/我的名字是\s*(.+)$/) || 
                      message.match(/你可以叫我\s*(.+)$/) ||
                      message.match(/我姓\s*(.+)$/);
    
    if (introMatch && introMatch[1]) {
      const userName = introMatch[1].trim();
      
      // 定義多種回應模板
      const responses = [
        `您好，${userName}。我是您的智能助手，有什麼我可以幫您的嗎？`,
        `很高興認識您，${userName}！我能為您提供什麼幫助呢？`,
        `${userName}，您好！我是您的AI助手，請問有什麼需要協助的嗎？`,
        `歡迎，${userName}！今天有什麼我能為您效勞的嗎？`,
        `嗨，${userName}！很高興為您服務，請問有什麼問題嗎？`
      ];
      
      // 隨機選擇一個回應
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        answer: randomResponse,
        intent: 'user.introduction',
        score: 1,
        extractedName: userName
      };
    }
    
    // 如果不是自我介紹，則正常處理用戶輸入
    const response = await manager.process('zh', message);
    
    // 如果沒有找到匹配的意圖或置信度低於閾值
    if (!response.answer || response.score < 0.7) {
      return { 
        answer: '抱歉，我不理解您的意思。請用不同的方式提問。',
        intent: response.intent,
        score: response.score
      };
    }
    
    // 返回回答
    return { 
      answer: response.answer,
      intent: response.intent,
      score: response.score
    };
  } catch (error) {
    console.error('處理聊天請求時出錯:', error);
    return { error: '服務器內部錯誤' };
  }
}

// 啟動服務器的主函數
async function startServer() {
  try {
    // 載入已訓練好的模型
    if (fs.existsSync('./model.nlp')) {
      await manager.load('./model.nlp');
      console.log('已成功載入訓練好的模型');
    } else {
      console.error('找不到模型文件 model.nlp，請確保已經訓練並保存了模型');
      process.exit(1);
    }
    
    // 啟動 Express 伺服器
    const app = express();
    const port = process.env.PORT || 3000;
    
    // 使用中間件
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    // 設置靜態文件目錄
    app.use(express.static('public'));
    
    // 添加 GET 端點，支持 URL 查詢參數
    app.get('/api/chat', async (req, res) => {
      const { message } = req.query;
      const result = await processChatMessage(message);
      
      if (result.error) {
        return res.status(400).json(result);
      }
      
      return res.json(result);
    });
    
    // POST 端點，支持 JSON 請求體
    app.post('/api/chat', async (req, res) => {
      const { message } = req.body;
      const result = await processChatMessage(message);
      
      if (result.error) {
        return res.status(400).json(result);
      }
      
      return res.json(result);
    });
    
    // 健康檢查端點
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: '聊天機器人服務正常運行中' });
    });
    
    // 美化後的 HTML 頁面用於測試
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
          <title>智能聊天助手</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
          <style>
            :root {
              --primary-color: #4a6fa5;
              --secondary-color: #6b8cae;
              --accent-color: #166088;
              --background-color: #f5f7fa;
              --user-msg-color: #e3f2fd;
              --bot-msg-color: #ffffff;
              --shadow-color: rgba(0, 0, 0, 0.1);
            }

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: 'Noto Sans TC', sans-serif;
              background-color: var(--background-color);
              color: #333;
              line-height: 1.6;
              padding: 0;
              margin: 0;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }

            .header {
              background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
              color: white;
              padding: 1rem;
              text-align: center;
              box-shadow: 0 2px 10px var(--shadow-color);
            }

            .header h1 {
              font-size: 1.8rem;
              margin: 0;
              font-weight: 500;
            }

            .container {
              max-width: 800px;
              margin: 0 auto;
              padding: 1rem;
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              width: 100%;
            }

            .chat-container {
              background-color: white;
              border-radius: 12px;
              box-shadow: 0 4px 15px var(--shadow-color);
              overflow: hidden;
              display: flex;
              flex-direction: column;
              height: 100%;
            }

            .chat-header {
              background-color: var(--primary-color);
              color: white;
              padding: 1rem;
              display: flex;
              align-items: center;
            }

            .chat-header .avatar {
              width: 40px;
              height: 40px;
              background-color: white;
              border-radius: 50%;
              margin-right: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
            }

            .chat-header .info {
              flex-grow: 1;
            }

            .chat-header h2 {
              margin: 0;
              font-size: 1.2rem;
              font-weight: 500;
            }

            .chat-header p {
              margin: 0;
              font-size: 0.8rem;
              opacity: 0.8;
            }

            .chat-body {
              flex-grow: 1;
              padding: 1rem;
              overflow-y: auto;
              background-color: #f9f9f9;
              display: flex;
              flex-direction: column;
              gap: 1rem;
              height: 400px;
              position: relative; /* 添加相對定位 */
            }

            .message {
              max-width: 80%;
              padding: 0.8rem 1rem;
              border-radius: 18px;
              box-shadow: 0 1px 5px var(--shadow-color);
              position: relative;
              animation: fadeIn 0.3s ease-out;
              word-wrap: break-word;
            }

            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .message.user {
              align-self: flex-end;
              background-color: var(--user-msg-color);
              border-bottom-right-radius: 5px;
              color: #333;
            }

            .message.bot {
              align-self: flex-start;
              background-color: var(--bot-msg-color);
              border-bottom-left-radius: 5px;
              color: #333;
            }

            .message.user::before {
              content: '';
              position: absolute;
              bottom: 0;
              right: -10px;
              width: 20px;
              height: 20px;
              background-color: var(--user-msg-color);
              border-bottom-left-radius: 16px;
              z-index: -1;
            }

            .message.bot::before {
              content: '';
              position: absolute;
              bottom: 0;
              left: -10px;
              width: 20px;
              height: 20px;
              background-color: var(--bot-msg-color);
              border-bottom-right-radius: 16px;
              z-index: -1;
            }

            .message-time {
              font-size: 0.7rem;
              color: #999;
              margin-top: 5px;
              text-align: right;
            }

            .chat-footer {
              display: flex;
              padding: 1rem;
              background-color: white;
              border-top: 1px solid #eee;
            }

            .chat-input {
              flex-grow: 1;
              border: 1px solid #ddd;
              border-radius: 24px;
              padding: 0.8rem 1.2rem;
              font-size: 1rem;
              outline: none;
              transition: border-color 0.3s;
              font-family: 'Noto Sans TC', sans-serif;
            }

            .chat-input:focus {
              border-color: var(--primary-color);
            }

            .send-btn {
              background-color: var(--accent-color);
              color: white;
              border: none;
              border-radius: 24px;
              padding: 0 1.5rem;
              margin-left: 0.5rem;
              cursor: pointer;
              font-weight: 500;
              transition: background-color 0.3s;
              font-family: 'Noto Sans TC', sans-serif;
            }

            .send-btn:hover {
              background-color: var(--primary-color);
            }

            .typing-indicator {
              display: flex;
              align-items: center;
              padding: 0.5rem 1rem;
              background-color: white;
              border-radius: 18px;
              align-self: flex-start;
              margin-bottom: 0.5rem;
              box-shadow: 0 1px 5px var(--shadow-color);
              animation: fadeIn 0.3s ease-out;
              display: none;
              position: absolute; /* 修改為絕對定位 */
              bottom: 0.5rem; /* 距離底部的距離 */
              left: 1rem; /* 距離左側的距離 */
            }

            .typing-indicator span {
              width: 8px;
              height: 8px;
              background-color: var(--secondary-color);
              border-radius: 50%;
              display: inline-block;
              margin: 0 1px;
              opacity: 0.6;
            }

            .typing-indicator span:nth-child(1) {
              animation: bounce 1.2s infinite 0.1s;
            }
            .typing-indicator span:nth-child(2) {
              animation: bounce 1.2s infinite 0.3s;
            }
            .typing-indicator span:nth-child(3) {
              animation: bounce 1.2s infinite 0.5s;
            }

            @keyframes bounce {
              0%, 100% {
                transform: translateY(0);
              }
              50% {
                transform: translateY(-5px);
              }
            }

            @media (max-width: 600px) {
              .container {
                padding: 0.5rem;
              }
              
              .message {
                max-width: 90%;
              }
              
              .header h1 {
                font-size: 1.5rem;
              }
            }

            .welcome-message {
              text-align: center;
              color: #666;
              margin: 1rem 0;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>智能聊天助手</h1>
          </div>
          
          <div class="container">
            <div class="chat-container">
              <div class="chat-header">
                <div class="avatar">🤖</div>
                <div class="info">
                  <h2>AI 助手</h2>
                  <p>在線 • 隨時為您服務</p>
                </div>
              </div>
              
              <div class="chat-body" id="chatbox">
                <div class="welcome-message">
                  歡迎使用智能聊天助手，請輸入您的問題...
                </div>
                <div class="typing-indicator" id="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              
              <div class="chat-footer">
                <input type="text" id="message" class="chat-input" placeholder="輸入訊息..." autocomplete="off">
                <button onclick="sendMessage()" class="send-btn">發送</button>
              </div>
            </div>
          </div>
          
          <script>
            // 初始化聊天界面
            document.addEventListener('DOMContentLoaded', function() {
              // 聊天框自動聚焦
              document.getElementById('message').focus();
            });
            
            // 發送訊息函數
            function sendMessage() {
              const messageInput = document.getElementById('message');
              const message = messageInput.value.trim();
              
              if (!message) return;
              
              // 顯示用戶訊息
              addMessage(message, 'user');
              
              // 清空輸入框
              messageInput.value = '';
              
              // 顯示正在輸入指示器
              showTypingIndicator();
              
              // 發送請求到後端
              fetch('/api/chat?message=' + encodeURIComponent(message))
                .then(response => response.json())
                .then(data => {
                  // 隱藏正在輸入指示器
                  hideTypingIndicator();
                  
                  // 延遲一點顯示回應，模擬真實對話
                  setTimeout(() => {
                    if (data.error) {
                      addMessage(data.error, 'bot');
                    } else {
                      addMessage(data.answer, 'bot');
                    }
                  }, 500);
                })
                .catch(error => {
                  hideTypingIndicator();
                  addMessage('抱歉，發生了錯誤：' + error.message, 'bot');
                });
            }
            
            // 添加訊息到聊天框
            function addMessage(text, sender) {
              const chatbox = document.getElementById('chatbox');
              const messageElement = document.createElement('div');
              messageElement.className = 'message ' + sender;
              
              // 創建訊息內容
              const messageContent = document.createElement('div');
              messageContent.className = 'message-content';
              messageContent.textContent = text;
              
              // 創建時間戳
              const messageTime = document.createElement('div');
              messageTime.className = 'message-time';
              const now = new Date();
              messageTime.textContent = now.getHours().toString().padStart(2, '0') + ':' + 
                                       now.getMinutes().toString().padStart(2, '0');
              
              // 將內容和時間戳添加到訊息元素
              messageElement.appendChild(messageContent);
              messageElement.appendChild(messageTime);
              
              // 添加到聊天框
              chatbox.appendChild(messageElement);
              
              // 滾動到底部
              chatbox.scrollTop = chatbox.scrollHeight;
              
              // 移除歡迎訊息（如果存在）
              const welcomeMessage = document.querySelector('.welcome-message');
              if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
              }
            }
            
            // 顯示正在輸入指示器
            function showTypingIndicator() {
              const typingIndicator = document.getElementById('typing-indicator');
              typingIndicator.style.display = 'flex';
              
              const chatbox = document.getElementById('chatbox');
              chatbox.scrollTop = chatbox.scrollHeight;
            }
            
            // 隱藏正在輸入指示器
            function hideTypingIndicator() {
              const typingIndicator = document.getElementById('typing-indicator');
              typingIndicator.style.display = 'none';
            }
            
            // 按Enter鍵發送訊息
            document.getElementById('message').addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                sendMessage();
              }
            });
          </script>
        </body>
        </html>
      `);
    });
    
    // 啟動服務器
    app.listen(port, () => {
      console.log(`服務器已啟動，監聽端口 ${port}`);
      console.log(`您可以訪問 http://localhost:${port} 使用網頁界面測試`);
    });
  } catch (error) {
    console.error('啟動服務器時出錯:', error);
    process.exit(1);
  }
}

// 啟動服務器
startServer();
