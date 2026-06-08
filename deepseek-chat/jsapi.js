// API 通信管理
class ApiManager {
    constructor() {
        this.settings = storage.getApiSettings();
    }
    
    // 更新设置
    updateSettings() {
        this.settings = storage.getApiSettings();
    }
    
    // 发送消息到DeepSeek API
    async sendMessage(messages, options = {}) {
        this.updateSettings();
        
        if (!this.settings.apiKey) {
            throw new Error('请先设置API Key');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.apiKey}`
        };
        
        const body = {
            model: 'deepseek-chat',
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
        };
        
        // 如果启用联网搜索
        if (options.webSearch) {
            body.tools = [
                {
                    type: 'web_search',
                    web_search: {
                        enable: true
                    }
                }
            ];
        }
        
        try {
            const response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || '请求失败');
            }
            
            const data = await response.json();
            return data.choices[0].message;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // 上传文件并进行识别
    async uploadFile(file) {
        // 将文件转换为base64
        const base64 = await this.fileToBase64(file);
        
        // 如果是图片，使用vision模型
        if (file.type.startsWith('image/')) {
            return {
                type: 'image_url',
                image_url: {
                    url: `data:${file.type};base64,${base64}`
                }
            };
        }
        
        // 如果是文本文件，读取内容
        if (file.type.startsWith('text/') || 
            file.name.endsWith('.txt') || 
            file.name.endsWith('.md')) {
            const text = await this.readFileAsText(file);
            return {
                type: 'text',
                text: `文件内容:\n${text}`
            };
        }
        
        return null;
    }
    
    // 文件转base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    // 读取文本文件
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}

const api = new ApiManager();