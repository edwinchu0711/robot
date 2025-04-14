const fs = require('fs');
const csv = require('csv-parser');
const { NlpManager } = require('node-nlp');
const express = require('express');
const bodyParser = require('body-parser');

const manager = new NlpManager({ languages: ['zh'], forceNER: true });

// 讀取問候語句開始
const greetingDocuments = [];
fs.createReadStream('greeting_documents.csv')
  .pipe(csv())
  .on('data', (row) => {
    greetingDocuments.push(row.text);
  })
  .on('end', () => {
    // 將問候語句加入到 manager
    greetingDocuments.forEach(doc => {
      manager.addDocument('zh', doc, 'greetings');
    });
    
    // 讀取回答
    const greetingAnswers = [];
    fs.createReadStream('greeting_answers.csv')
      .pipe(csv())
      .on('data', (row) => {
        greetingAnswers.push(row.text);
      })
      .on('end', () => {
        // 將回答加入到 manager
        greetingAnswers.forEach(answer => {
          manager.addAnswer('zh', 'greetings', answer);
        });
        
        // 增加下面的
        addPeopleInfo();
        addUserIntroduction();
        
        // 繼續訓練和啟動服務器
        trainAndStartServer();
      });
  });
// 讀取問候語句結束

// 添加人物信息
function addPeopleInfo() {
  const people = ["陳闈霆", "簡昱安", "黃柏瑋"];

  people.forEach(name => {
    const intent = `people_info_${name}`;

    manager.addDocument('zh', `我想了解${name}`, intent);
    manager.addDocument('zh', `誰是${name}`, intent);
    manager.addDocument('zh', `${name}有什麼特點`, intent);
    manager.addDocument('zh', `介紹${name}這個人是誰`, intent);
    manager.addDocument('zh', `${name}`, intent);

    manager.addAnswer('zh', intent, `關於${name}，我們只知道，他是Gay`);
    manager.addAnswer('zh', intent, `${name}是Gay`);
  });
}

// 添加用戶自我介紹識別功能

// 添加用戶自我介紹識別功能
function addUserIntroduction() {
  // 直接添加用戶自我介紹的意圖，不使用NER
  manager.addDocument('zh', '我是', 'user.introduction');
  manager.addDocument('zh', '我叫', 'user.introduction');
  manager.addDocument('zh', '我的名字是', 'user.introduction');
  manager.addDocument('zh', '你可以叫我', 'user.introduction');
  manager.addDocument('zh', '我姓', 'user.introduction');
  
  // 添加一個通用回應，實際名字將在處理函數中提取
  manager.addAnswer('zh', 'user.introduction', '您好！我是您的智能助手，有什麼我可以幫您的嗎？');
}

// 處理聊天邏輯的函數，供GET和POST請求共用
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










function trainAndStartServer() { //sever程式碼和模型存檔
  manager.train().then(() => {
    manager.save('./model.nlp');
    console.log('模型訓練完成並已保存');
    
    // 啟動Express伺服器
    const app = express();
    const port = process.env.PORT || 3000;
    
    // 使用中間件
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    // 設置靜態文件目錄（如果有前端頁面）
    app.use(express.static('public'));
    
    // 添加GET端點，支持URL查詢參數
    app.get('/api/chat', async (req, res) => {
      const { message } = req.query;
      const result = await processChatMessage(message);
      
      if (result.error) {
        return res.status(400).json(result);
      }
      
      return res.json(result);
    });
    
    // 保留POST端點，支持JSON請求體
    app.post('/api/chat', async (req, res) => {
      const { message } = req.body;
      const result = await processChatMessage(message);
      
      if (result.error) {
        return res.status(400).json(result);
      }
      
      return res.json(result);
    });
    
    // 添加一個簡單的GET端點用於測試
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: '聊天機器人服務正常運行中' });
    });
    
    // 添加一個簡單的HTML頁面用於測試
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>聊天機器人測試</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            #chatbox { height: 300px; border: 1px solid #ccc; margin-bottom: 10px; padding: 10px; overflow-y: auto; }
            #message { width: 70%; padding: 8px; }
            button { padding: 8px 15px; }
          </style>
        </head>
        <body>
          <h1>聊天機器人測試</h1>
          <div id="chatbox"></div>
          <div>
            <input type="text" id="message" placeholder="輸入訊息..." />
            <button onclick="sendMessage()">發送</button>
          </div>
          
          <script>
            function sendMessage() {
              const message = document.getElementById('message').value;
              if (!message) return;
              
              // 顯示用戶訊息
              addMessage('您: ' + message);
              
              // 發送請求
              fetch('/api/chat?message=' + encodeURIComponent(message))
                .then(response => response.json())
                .then(data => {
                  if (data.error) {
                    addMessage('機器人: ' + data.error);
                  } else {
                    addMessage('機器人: ' + data.answer);
                  }
                })
                .catch(error => {
                  addMessage('錯誤: ' + error.message);
                });
              
              // 清空輸入框
              document.getElementById('message').value = '';
            }
            
            function addMessage(text) {
              const chatbox = document.getElementById('chatbox');
              chatbox.innerHTML += '<div>' + text + '</div>';
              chatbox.scrollTop = chatbox.scrollHeight;
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
      console.log(`您可以訪問 http://localhost:${port}/api/chat?message=你好 使用GET請求測試`);
      console.log(`您可以使用POST請求訪問 http://localhost:${port}/api/chat 與機器人對話`);
    });
  });
}
