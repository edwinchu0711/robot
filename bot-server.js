// bot-server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { NlpManager } = require('node-nlp');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 靜態文件服務 (如果需要)
app.use(express.static(path.join(__dirname, 'public')));

// 創建 NLP 管理器
const manager = new NlpManager({ languages: ['zh'], forceNER: true });

// 問候意圖 - 已經可以正常工作
manager.addDocument('zh', '你好', 'greetings');
manager.addDocument('zh', '嗨', 'greetings');
manager.addDocument('zh', '哈囉', 'greetings');
manager.addDocument('zh', '早安', 'greetings');
manager.addDocument('zh', '晚安', 'greetings');
manager.addAnswer('zh', 'greetings', '你好！有什麼我可以幫助你的嗎？');
manager.addAnswer('zh', 'greetings', '嗨！很高興見到你！');

// 添加更多意圖
// 詢問功能
manager.addDocument('zh', '你能做什麼', 'bot_capabilities');
manager.addDocument('zh', '你有什麼功能', 'bot_capabilities');
manager.addDocument('zh', '你可以幫我做什麼', 'bot_capabilities');
manager.addDocument('zh', '你會什麼', 'bot_capabilities');
manager.addAnswer('zh', 'bot_capabilities', '我可以回答問題、提供資訊，或者只是聊天。有什麼我能幫助你的嗎？');

// 詢問身份
manager.addDocument('zh', '你是誰', 'bot_identity');
manager.addDocument('zh', '你叫什麼名字', 'bot_identity');
manager.addDocument('zh', '你是機器人嗎', 'bot_identity');
manager.addAnswer('zh', 'bot_identity', '我是一個聊天機器人，由 NLP.js 驅動，為您提供協助。');

// 感謝
manager.addDocument('zh', '謝謝', 'thanks');
manager.addDocument('zh', '感謝', 'thanks');
manager.addDocument('zh', '謝謝你', 'thanks');
manager.addAnswer('zh', 'thanks', '不客氣！很高興能幫到你。');

// 告別
manager.addDocument('zh', '再見', 'goodbye');
manager.addDocument('zh', '拜拜', 'goodbye');
manager.addDocument('zh', '下次見', 'goodbye');
manager.addAnswer('zh', 'goodbye', '再見！有需要隨時回來找我。');

// 天氣相關 (示例)
manager.addDocument('zh', '今天天氣如何', 'weather');
manager.addDocument('zh', '天氣預報', 'weather');
manager.addDocument('zh', '會下雨嗎', 'weather');
manager.addAnswer('zh', 'weather', '抱歉，我目前無法提供即時天氣資訊。您可以查看當地氣象網站獲取準確資訊。');

// 添加產品實體
manager.addNamedEntityText('product', '手機', ['zh'], ['手機', '智能手機', '電話', 'iPhone', '安卓手機']);
manager.addNamedEntityText('product', '電腦', ['zh'], ['電腦', '筆電', '筆記型電腦', '桌機', '桌上型電腦']);

// 產品詢問意圖
manager.addDocument('zh', '我想了解%product%', 'product_info');
manager.addDocument('zh', '告訴我關於%product%的資訊', 'product_info');
manager.addDocument('zh', '%product%有什麼特點', 'product_info');

// 根據不同產品回答
manager.addAnswer('zh', 'product_info', '關於{{product}}，我們有多種型號可供選擇。您有特定需求嗎？');

// 添加更多意圖和回應...


// 在 process 方法後添加回退回應
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: '請提供訊息' });
        }
        
        const response = await manager.process('zh', message);
        
        // 如果信心分數低於閾值，使用回退回應
        if (!response.answer || response.score < 0.5) {
            res.json({
                answer: '抱歉，我不太理解您的意思。您能換個方式表達嗎？或者告訴我您需要什麼幫助？',
                intent: response.intent,
                score: response.score
            });
        } else {
            res.json({
                answer: response.answer,
                intent: response.intent,
                score: response.score
            });
        }
    } catch (error) {
        console.error('處理訊息時發生錯誤:', error);
        res.status(500).json({ error: '處理請求時發生錯誤' });
    }
});

// 使用簡單的內存存儲來跟踪會話
const sessions = {};

app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId = 'default' } = req.body;
        
        // 獲取或創建會話
        if (!sessions[sessionId]) {
            sessions[sessionId] = { context: {}, history: [] };
        }
        
        // 添加到歷史記錄
        sessions[sessionId].history.push({ role: 'user', content: message });
        
        // 處理消息，並傳遞上下文
        const response = await manager.process('zh', message, sessions[sessionId].context);
        
        // 更新上下文
        if (response.entities && response.entities.length > 0) {
            response.entities.forEach(entity => {
                sessions[sessionId].context[entity.entity] = entity.option;
            });
        }
        
        // 添加到歷史記錄
        if (response.answer) {
            sessions[sessionId].history.push({ role: 'bot', content: response.answer });
        }
        
        res.json({
            answer: response.answer || '抱歉，我不理解您的意思',
            intent: response.intent,
            score: response.score,
            sessionId: sessionId
        });
    } catch (error) {
        console.error('處理訊息時發生錯誤:', error);
        res.status(500).json({ error: '處理請求時發生錯誤' });
    }
});


// 添加日誌以便調試
app.post('/api/chat', async (req, res) => {
    console.log('收到聊天請求:', req.body);
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: '請提供訊息' });
        }
        
        console.log('處理訊息:', message);
        const response = await manager.process('zh', message);
        console.log('NLP 回應:', JSON.stringify(response, null, 2));
        
        // 其餘處理邏輯...
    } catch (error) {
        // 錯誤處理...
    }
});









// 訓練模型
(async() => {
    await manager.train();
    manager.save('./model.nlp');
    console.log('模型已訓練並保存');
})();

// API 端點
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: '請提供訊息' });
    }
    
    const response = await manager.process('zh', message);
    res.json({
        answer: response.answer || '抱歉，我不明白你的意思',
        intent: response.intent,
        score: response.score
    });
});

// 處理 SPA 路由 (如果您使用前端框架)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服務器運行於 http://localhost:${PORT}`);
});
