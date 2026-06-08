// 应用主逻辑
class App {
    constructor() {
        this.currentChatId = null;
        this.chats = storage.getChats();
        this.webSearchEnabled = false;
        this.isProcessing = false;
        
        this.init();
    }
    
    init() {
        initTheme();
        this.renderChatList();
        this.loadLastChat();
        this.setupEventListeners();
        this.updateCharCount();
    }
    
    setupEventListeners() {
        // 自动调整文本框高度
        const textarea = document.getElementById('messageInput');
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            this.updateCharCount();
        });
        
        // 点击模态框外部关闭
        document.getElementById('apiSettingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeApiSettings();
            }
        });
    }
    
    // 创建新对话
    createNewChat() {
        const chat = {
            id: Date.now().toString(),
            title: '新对话',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.chats.unshift(chat);
        storage.saveChats(this.chats);
        this.currentChatId = chat.id;
        this.renderChatList();
        this.renderMessages();
        this.updateChatTitle();
    }
    
    // 加载对话
    loadChat(chatId) {
        this.currentChatId = chatId;
        this.renderMessages();
        this.updateChatTitle();
        this.renderChatList();
    }
    
    // 删除对话
    deleteChat(chatId, event) {
        event.stopPropagation();
        if (confirm('确定要删除这个对话吗？')) {
            storage.deleteChat(chatId);
            this.chats = storage.getChats();
            
            if (this.currentChatId === chatId) {
                this.currentChatId = this.chats.length > 0 ? this.chats[0].id : null;
                this.renderMessages();
                this.updateChatTitle();
            }
            
            this.renderChatList();
        }
    }
    
    // 发送消息
    async sendMessage() {
        if (this.isProcessing) return;
        
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content) return;
        
        if (!this.currentChatId) {
            this.createNewChat();
        }
        
        const chat = this.chats.find(c => c.id === this.currentChatId);
        if (!chat) return;
        
        // 添加用户消息
        const userMessage = {
            role: 'user',
            content: content,
            timestamp: new Date().toISOString()
        };
        
        chat.messages.push(userMessage);
        input.value = '';
        input.style.height = 'auto';
        this.updateCharCount();
        
        // 更新对话标题
        if (chat.messages.length === 1) {
            chat.title = content.substring(0, 20) + (content.length > 20 ? '...' : '');
        }
        
        chat.updatedAt = new Date().toISOString();
        storage.saveChats(this.chats);
        this.renderMessages();
        this.renderChatList();
        
        // 调用API
        this.isProcessing = true;
        this.showTypingIndicator();
        
        try {
            const apiMessages = chat.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            const response = await api.sendMessage(apiMessages, {
                webSearch: this.webSearchEnabled
            });
            
            // 添加助手回复
            const assistantMessage = {
                role: 'assistant',
                content: response.content,
                timestamp: new Date().toISOString()
            };
            
            chat.messages.push(assistantMessage);
            chat.updatedAt = new Date().toISOString();
            storage.saveChats(this.chats);
            this.renderMessages();
        } catch (error) {
            // 添加错误消息
            const errorMessage = {
                role: 'assistant',
                content: `❌ 错误：${error.message}`,
                timestamp: new Date().toISOString(),
                isError: true
            };
            
            chat.messages.push(errorMessage);
            storage.saveChats(this.chats);
            this.renderMessages();
        } finally {
            this.isProcessing = false;
            this.hideTypingIndicator();
        }
    }
    
    // 处理文件上传
    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files.length) return;
        
        if (!this.currentChatId) {
            this.createNewChat();
        }
        
        for (const file of files) {
            try {
                const fileContent = await api.uploadFile(file);
                if (fileContent) {
                    const chat = this.chats.find(c => c.id === this.currentChatId);
                    if (chat) {
                        if (fileContent.type === 'image_url') {
                            // 添加图片消息
                            chat.messages.push({
                                role: 'user',
                                content: `[上传图片] ${file.name}`,
                                imageUrl: fileContent.image_url.url,
                                timestamp: new Date().toISOString()
                            });
                            
                            // 使用vision模型分析图片
                            const visionMessage = {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: '请描述这张图片的内容'
                                    },
                                    fileContent
                                ]
                            };
                            
                            // 这里需要调用vision模型，简化处理
                            chat.messages.push({
                                role: 'assistant',
                                content: `已接收图片：${file.name}。图片分析功能需要使用支持vision的模型。`,
                                timestamp: new Date().toISOString()
                            });
                        } else if (fileContent.type === 'text') {
                            chat.messages.push({
                                role: 'user',
                                content: `[上传文件] ${file.name}\n${fileContent.text}`,
                                timestamp: new Date().toISOString()
                            });
                        }
                        
                        storage.saveChats(this.chats);
                    }
                }
            } catch (error) {
                console.error('文件上传错误:', error);
                alert('文件上传失败: ' + error.message);
            }
        }
        
        this.renderMessages();
        this.renderChatList();
        event.target.value = '';
    }
    
    // 渲染对话列表
    renderChatList() {
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            chatItem.onclick = () => this.loadChat(chat.id);
            
            chatItem.innerHTML = `
                <span class="chat-item-title">${chat.title}</span>
                <button class="chat-item-delete" onclick="app.deleteChat('${chat.id}', event)">×</button>
            `;
            
            chatList.appendChild(chatItem);
        });
    }
    
    // 渲染消息
    renderMessages() {
        const container = document.getElementById('messagesContainer');
        const chat = this.chats.find(c => c.id === this.currentChatId);
        
        if (!chat || chat.messages.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <h1>👋 欢迎使用 DeepSeek Chat</h1>
                    <p>开始一段新的对话吧</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        chat.messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.role}`;
            
            const avatar = message.role === 'user' ? '👤' : '🤖';
            const isError = message.isError;
            
            let content = message.content;
            
            // 简单的Markdown渲染
            content = this.renderMarkdown(content);
            
            messageDiv.innerHTML = `
                <div class="message-avatar">${avatar}</div>
                <div class="message-content ${isError ? 'error' : ''}">
                    ${message.imageUrl ? `<img src="${message.imageUrl}" alt="上传的图片" />` : ''}
                    ${content}
                </div>
            `;
            
            container.appendChild(messageDiv);
        });
        
        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }
    
    // 简单的Markdown渲染
    renderMarkdown(text) {
        if (!text) return '';
        
        let html = text;
        
        // 代码块
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        
        // 行内代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 粗体
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // 斜体
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // 换行
        html = html.replace(/\n/g, '<br>');
        
        return html;
    }
    
    // 显示输入指示器
    showTypingIndicator() {
        const container = document.getElementById('messagesContainer');
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typingIndicator';
        indicator.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="loading"></div>
            </div>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
        
        const sendBtn = document.getElementById('sendButton');
        sendBtn.disabled = true;
    }
    
    // 隐藏输入指示器
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
        
        const sendBtn = document.getElementById('sendButton');
        sendBtn.disabled = false;
    }
    
    // 更新对话标题
    updateChatTitle() {
        const title = document.getElementById('currentChatTitle');
        const chat = this.chats.find(c => c.id === this.currentChatId);
        title.textContent = chat ? chat.title : 'DeepSeek Chat';
    }
    
    // 更新字符计数
    updateCharCount() {
        const input = document.getElementById('messageInput');
        const count = document.getElementById('charCount');
        count.textContent = `${input.value.length}/4000`;
    }
    
    // 加载上次对话
    loadLastChat() {
        if (this.chats.length > 0) {
            this.currentChatId = this.chats[0].id;
            this.renderMessages();
            this.updateChatTitle();
        }
    }
    
    // 切换联网搜索
    toggleWebSearch() {
        this.webSearchEnabled = document.getElementById('webSearchToggle').checked;
    }
}

// 全局实例
let app;

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});

// 全局函数
function createNewChat() {
    app.createNewChat();
}

function sendMessage() {
    app.sendMessage();
}

function handleFileUpload(event) {
    app.handleFileUpload(event);
}

function toggleWebSearch() {
    app.toggleWebSearch();
}

function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('hidden');
}

function toggleApiSettings() {
    const modal = document.getElementById('apiSettingsModal');
    modal.classList.add('show');
    
    const settings = storage.getApiSettings();
    document.getElementById('apiKeyInput').value = settings.apiKey;
    document.getElementById('apiBaseUrl').value = settings.baseUrl;
}

function closeApiSettings() {
    const modal = document.getElementById('apiSettingsModal');
    modal.classList.remove('show');
}

function saveApiSettings() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    const baseUrl = document.getElementById('apiBaseUrl').value.trim();
    
    if (!apiKey) {
        alert('请输入API Key');
        return;
    }
    
    storage.saveApiSettings({
        apiKey: apiKey,
        baseUrl: baseUrl || 'https://api.deepseek.com/v1'
    });
    
    closeApiSettings();
    alert('API设置已保存！');
}