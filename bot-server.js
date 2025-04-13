const express = require('express');
const bodyParser = require('body-parser');
const { NlpManager } = require('node-nlp');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// 提供靜態文件
app.use(express.static(path.join(__dirname, 'public')));

// 初始化 NLP 管理器
const manager = new NlpManager({ languages: ['zh'], forceNER: true });

// 設定 NLP 訓練資料
function setupNlp() {
    const intents = [
        {
            name: 'greetings',
            documents: ['你好', '嗨', '哈囉', '早安', '晚安'],
            getAnswer: () => '你好！有什麼我可以幫助你的嗎？'
        },
        {
            name: 'bot_capabilities',
            documents: ['你能做什麼', '你有什麼功能', '你可以幫我做什麼', '你會什麼'],
            getAnswer: () => '我可以回答問題、提供資訊，或者只是聊天。有什麼我能幫助你的嗎？'
        },
        {
            name: 'bot_identity',
            documents: ['你是誰', '你叫什麼名字', '你是機器人嗎'],
            getAnswer: () => '我是一個聊天機器人，由 NLP.js 驅動，為您提供協助。'
        },
        {
            name: 'thanks',
            documents: ['謝謝', '感謝', '謝謝你'],
            getAnswer: () => '不客氣！很高興能幫到你。'
        },
        {
            name: 'goodbye',
            documents: ['再見', '拜拜', '下次見'],
            getAnswer: () => '再見！有需要隨時回來找我。'
        },
        {
            name: 'weather',
            documents: ['今天天氣如何', '天氣預報', '會下雨嗎'],
            getAnswer: () => '抱歉，我目前無法提供即時天氣資訊。您可以查看當地氣象網站獲取準確資訊。'
        },
        {
            name: 'product_info',
            documents: ['我想了解%product%', '告訴我關於%product%的資訊', '%product%有什麼特點'],
            getAnswer: (entities) => `關於${entities.product || '這個產品'}，我們有多種型號可供選擇。您有特定需求嗎？`
        },
        {
            name: 'people_info',
            documents: ['我想了解%people%', '誰是%people%', '%people%有什麼特點', '介紹%people%這個人是誰'],
            getAnswer: (entities) => `關於${entities.people || '這個人'}，我們只知道，他是Gay`
        }
    ];

    intents.forEach(intent => {
        intent.documents.forEach(doc => manager.addDocument('zh', doc, intent.name));
    });

    return intents;
}

// 訓練 NLP 模型
async function trainNlp() {
    const intents = setupNlp();
    await manager.train();
    manager.save();
    console.log('NLP 模型訓練完成');
    return intents;
}

// 處理聊天請求
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: '請提供訊息' });
    }

    try {
        const response = await manager.process('zh', message);
        let answer = '抱歉，我不太理解您的意思。能否換個方式表達？';

        const intent = intents.find(i => i.name === response.intent);
        if (intent) {
            const entities = {};
            response.entities.forEach(entity => {
                entities[entity.entity] = entity.option || entity.sourceText || entity.utteranceText;
            });
            answer = intent.getAnswer(entities);
        }

        res.json({
            answer,
            intent: response.intent,
            score: response.score,
            entities: response.entities
        });
    } catch (error) {
        console.error('處理請求時發生錯誤:', error);
        res.status(500).json({ error: '處理請求時發生錯誤' });
    }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
let intents = [];
trainNlp().then(trainedIntents => {
    intents = trainedIntents;
    app.listen(PORT, () => {
        console.log(`伺服器運行於 http://localhost:${PORT}`);
    });
});
