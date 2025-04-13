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

// 添加 people 實體
manager.addNamedEntityText('people', '張三', ['zh'], ['張三', '張先生']);
manager.addNamedEntityText('people', '李四', ['zh'], ['李四', '李先生']);
manager.addNamedEntityText('people', '王五', ['zh'], ['王五', '王先生']);
manager.addNamedEntityText('people', '陳闈霆', ['zh'], ['陳闈霆', '闈霆']);

// 定義 'people' 實體 (很重要! 讓 NLP 知道 %people% 或 {{people}} 代表的是人名實體)
manager.addNamedEntity('people', 'trim'); // 使用 'trim' 預設處理器，可以根據需要調整

// 人物詢問意圖 (使用 [實體值](實體名稱) 格式標註訓練語句中的實體)
manager.addDocument('zh', '我想了解[小明](people)', 'people_info');
manager.addDocument('zh', '誰是[王先生](people)', 'people_info');
manager.addDocument('zh', '[李華](people)有什麼特點', 'people_info');
manager.addDocument('zh', '介紹[陳小姐](people)這個人是誰', 'people_info');
manager.addDocument('zh', '我想了解%people%', 'people_info'); // 保留原先的格式，但建議優先使用標註格式
manager.addDocument('zh', '誰是%people%', 'people_info');
manager.addDocument('zh', '%people%有什麼特點', 'people_info');
manager.addDocument('zh', '介紹%people%這個人是誰', 'people_info');

// 使用一致的雙括號格式 {{people}}，並確保與實體名稱 'people' 一致
manager.addAnswer('zh', 'people_info', '關於{{people}}，我們只知道，他是Gay');
manager.addAnswer('zh', 'people_info', '{{people}}是Gay');

// 使用內存存儲來跟踪會話
const sessions = {};

// 訓練模型
(async() => {
    await manager.train();
    manager.save('./model.nlp');
    console.log('模型已訓練並保存');
    
    // 啟動服務器
    startServer();
})();

function startServer() {
    // API 端點處理函數
    app.post('/api/chat', async (req, res) => {
        console.log('收到聊天請求:', req.body);
        try {
            const { message, sessionId = 'default' } = req.body;
            if (!message) {
                return res.status(400).json({ error: '請提供訊息' });
            }
            
            // 獲取或創建會話
            if (!sessions[sessionId]) {
                sessions[sessionId] = { context: {}, history: [] };
            }
            
            // 添加到歷史記錄
            sessions[sessionId].history.push({ role: 'user', content: message });
            
            console.log('處理訊息:', message);
            const response = await manager.process('zh', message);
            console.log('NLP 回應:', JSON.stringify(response, null, 2));
            
            // 提高信心閾值檢查 - 提前檢查
            if (response.score < 0.6) {
                console.log('信心分數太低:', response.score);
                const defaultAnswer = '請繼續輸入您的問題，我在聆聽...';
                
                // 添加到歷史記錄
                sessions[sessionId].history.push({ role: 'bot', content: defaultAnswer });
                
                return res.json({
                    answer: defaultAnswer,
                    intent: response.intent,
                    score: response.score,
                    sessionId: sessionId
                });
            }
            
            let finalAnswer = '';
            
            // 特殊處理 people_info 意圖
            if (response.intent === 'people_info' && response.entities && response.entities.length > 0) {
                const peopleEntity = response.entities.find(e => e.entity === 'people');
                if (peopleEntity) {
                    const personName = peopleEntity.option || peopleEntity.utteranceText;
                    finalAnswer = `${personName}是Gay`;
                    console.log(`找到人物: ${personName}, 構建回應: ${finalAnswer}`);
                } else {
                    finalAnswer = response.answer || '抱歉，我沒有找到相關人物信息';
                }
            } 
            // 處理產品意圖
            else if (response.intent === 'product_info' && response.entities && response.entities.length > 0) {
                const productEntity = response.entities.find(e => e.entity === 'product');
                if (productEntity) {
                    const productName = productEntity.option || productEntity.utteranceText;
                    finalAnswer = `關於${productName}，我們有多種型號可供選擇。您有特定需求嗎？`;
                    console.log(`找到產品: ${productName}, 構建回應: ${finalAnswer}`);
                } else {
                    finalAnswer = response.answer || '抱歉，我沒有找到相關產品信息';
                }
            }
            // 處理其他意圖
            else {
                finalAnswer = response.answer;
                
                // 替換其他意圖中的變數（如產品等）
                if (finalAnswer && response.entities && response.entities.length > 0) {
                    console.log('替換前:', finalAnswer);
                    for (const entity of response.entities) {
                        const placeholder = `{{${entity.entity}}}`;
                        const entityValue = entity.option || entity.utteranceText;
                        console.log(`替換 ${placeholder} 為 ${entityValue}`);
                        finalAnswer = finalAnswer.replace(new RegExp(placeholder, 'g'), entityValue);
                    }
                    console.log('替換後:', finalAnswer);
                }
            }
            
            console.log('最終回應:', finalAnswer);
            
            // 添加到歷史記錄
            if (finalAnswer) {
                sessions[sessionId].history.push({ role: 'bot', content: finalAnswer });
            }
            
            // 直接返回最終回應，不再進行信心閾值判斷
            res.json({
                answer: finalAnswer,
                intent: response.intent,
                score: response.score,
                sessionId: sessionId,
                entities: response.entities // 返回實體以便前端調試
            });
            
        } catch (error) {
            console.error('處理訊息時發生錯誤:', error);
            res.status(500).json({ error: '處理請求時發生錯誤' });
        }
    });

    // 處理 SPA 路由 (如果您使用前端框架)
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`服務器運行於 http://localhost:${PORT}`);
    });
}
