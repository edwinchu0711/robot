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

// 添加訓練數據
manager.addDocument('zh', '你好', 'greetings');
manager.addDocument('zh', '嗨', 'greetings');
manager.addAnswer('zh', 'greetings', '你好！有什麼我可以幫助你的嗎？');

// 添加更多意圖和回應...

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
